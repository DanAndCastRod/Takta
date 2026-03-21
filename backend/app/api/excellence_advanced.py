from __future__ import annotations

import base64
import io
import json
import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field as PydanticField
from sqlmodel import Session, select

from ..core.auth import CurrentUser, get_current_user, require_role
from ..db import get_session
from ..models import (
    ActionWorkflow,
    Asset,
    AuditChecklistTemplate,
    AuditEvidence,
    AuditInstance,
    AuditScore,
    ImprovementAction,
)
from ..services.simple_pdf import build_text_pdf


router = APIRouter(
    prefix="/api",
    tags=["Excellence Advanced"],
    dependencies=[Depends(get_current_user)],
)


def _safe_json_load(raw: str, default: Any) -> Any:
    try:
        return json.loads(raw or "")
    except Exception:
        return default


def _ensure_workflow(session: Session, action_id: uuid.UUID) -> ActionWorkflow:
    row = session.exec(select(ActionWorkflow).where(ActionWorkflow.action_id == action_id)).first()
    if row:
        return row
    row = ActionWorkflow(action_id=action_id, workflow_status="Open")
    session.add(row)
    session.flush()
    return row


def _workflow_payload(action: ImprovementAction, workflow: ActionWorkflow) -> Dict[str, Any]:
    return {
        "action_id": str(action.id),
        "action_status": action.status,
        "completion_date": action.completion_date.isoformat() if action.completion_date else None,
        "workflow_status": workflow.workflow_status,
        "close_requested_at": workflow.close_requested_at.isoformat() if workflow.close_requested_at else None,
        "close_requested_by": workflow.close_requested_by,
        "approved_at": workflow.approved_at.isoformat() if workflow.approved_at else None,
        "approved_by": workflow.approved_by,
        "verified_at": workflow.verified_at.isoformat() if workflow.verified_at else None,
        "verified_by": workflow.verified_by,
        "verification_notes": workflow.verification_notes,
        "has_evidence_photo": bool(workflow.evidence_photo_data),
    }


class WorkflowRequest(BaseModel):
    notes: Optional[str] = None
    evidence_photo_data: Optional[str] = None


@router.get("/ci/actions/{action_id}/workflow")
def get_action_workflow(
    action_id: uuid.UUID,
    session: Session = Depends(get_session),
):
    action = session.get(ImprovementAction, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    workflow = _ensure_workflow(session, action_id)
    session.commit()
    session.refresh(workflow)
    return _workflow_payload(action, workflow)


@router.post("/ci/actions/{action_id}/request-close")
def request_action_close(
    action_id: uuid.UUID,
    payload: WorkflowRequest,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    action = session.get(ImprovementAction, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    workflow = _ensure_workflow(session, action_id)
    workflow.workflow_status = "CloseRequested"
    workflow.close_requested_at = datetime.utcnow()
    workflow.close_requested_by = user.username
    if payload.notes:
        workflow.verification_notes = payload.notes
    if payload.evidence_photo_data:
        workflow.evidence_photo_data = payload.evidence_photo_data
    action.status = "Closed"
    action.completion_date = action.completion_date or date.today()
    session.add(workflow)
    session.add(action)
    session.commit()
    session.refresh(workflow)
    session.refresh(action)
    return _workflow_payload(action, workflow)


@router.post("/ci/actions/{action_id}/approve-close")
def approve_action_close(
    action_id: uuid.UUID,
    payload: WorkflowRequest,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    action = session.get(ImprovementAction, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    workflow = _ensure_workflow(session, action_id)
    if workflow.workflow_status not in {"CloseRequested", "Approved"}:
        raise HTTPException(status_code=400, detail="Action must be close-requested before approval.")
    workflow.workflow_status = "Approved"
    workflow.approved_at = datetime.utcnow()
    workflow.approved_by = user.username
    if payload.notes:
        workflow.verification_notes = payload.notes
    session.add(workflow)
    session.commit()
    session.refresh(workflow)
    return _workflow_payload(action, workflow)


@router.post("/ci/actions/{action_id}/verify-close")
def verify_action_close(
    action_id: uuid.UUID,
    payload: WorkflowRequest,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    action = session.get(ImprovementAction, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    workflow = _ensure_workflow(session, action_id)
    if workflow.workflow_status not in {"Approved", "Verified"}:
        raise HTTPException(status_code=400, detail="Action must be approved before verification.")
    if payload.evidence_photo_data:
        workflow.evidence_photo_data = payload.evidence_photo_data
    workflow.workflow_status = "Verified"
    workflow.verified_at = datetime.utcnow()
    workflow.verified_by = user.username
    if payload.notes:
        workflow.verification_notes = payload.notes
    action.status = "Verified"
    action.completion_date = action.completion_date or date.today()
    session.add(workflow)
    session.add(action)
    session.commit()
    session.refresh(workflow)
    session.refresh(action)
    return _workflow_payload(action, workflow)


class ChecklistTemplateItem(BaseModel):
    code: str
    category: str
    question: str
    weight: float = 1.0


class ChecklistTemplateCreate(BaseModel):
    asset_id: Optional[uuid.UUID] = None
    name: str
    type: str = "5S"
    require_photo: bool = False
    items: List[ChecklistTemplateItem]
    is_active: bool = True


class ChecklistTemplateUpdate(BaseModel):
    asset_id: Optional[uuid.UUID] = None
    name: Optional[str] = None
    type: Optional[str] = None
    require_photo: Optional[bool] = None
    items: Optional[List[ChecklistTemplateItem]] = None
    is_active: Optional[bool] = None


@router.post("/audits/checklists")
def create_checklist_template(
    payload: ChecklistTemplateCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    if payload.asset_id and not session.get(Asset, payload.asset_id):
        raise HTTPException(status_code=404, detail="Asset not found")
    row = AuditChecklistTemplate(
        asset_id=payload.asset_id,
        name=payload.name.strip(),
        type=payload.type.strip(),
        require_photo=payload.require_photo,
        items_json=json.dumps([item.model_dump() for item in payload.items], ensure_ascii=False),
        is_active=payload.is_active,
        created_by=user.username,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": str(row.id)}


@router.get("/audits/checklists")
def list_checklist_templates(
    asset_id: Optional[uuid.UUID] = None,
    type: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(AuditChecklistTemplate)
    if asset_id:
        stmt = stmt.where(AuditChecklistTemplate.asset_id == asset_id)
    if type:
        stmt = stmt.where(AuditChecklistTemplate.type == type)
    rows = session.exec(stmt.order_by(AuditChecklistTemplate.updated_at.desc())).all()
    return [
        {
            "id": str(row.id),
            "asset_id": str(row.asset_id) if row.asset_id else None,
            "name": row.name,
            "type": row.type,
            "require_photo": row.require_photo,
            "items": _safe_json_load(row.items_json, []),
            "is_active": row.is_active,
            "created_by": row.created_by,
            "created_at": row.created_at.isoformat(),
            "updated_at": row.updated_at.isoformat(),
        }
        for row in rows
    ]


@router.patch("/audits/checklists/{template_id}")
def update_checklist_template(
    template_id: uuid.UUID,
    payload: ChecklistTemplateUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    row = session.get(AuditChecklistTemplate, template_id)
    if not row:
        raise HTTPException(status_code=404, detail="Checklist template not found")
    data = payload.model_dump(exclude_unset=True)
    if "asset_id" in data and data["asset_id"] and not session.get(Asset, data["asset_id"]):
        raise HTTPException(status_code=404, detail="Asset not found")
    if "items" in data:
        row.items_json = json.dumps([item.model_dump() for item in data.pop("items")], ensure_ascii=False)
    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": str(row.id)}


@router.delete("/audits/checklists/{template_id}", status_code=204)
def delete_checklist_template(
    template_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    row = session.get(AuditChecklistTemplate, template_id)
    if not row:
        raise HTTPException(status_code=404, detail="Checklist template not found")
    session.delete(row)
    session.commit()


class AuditAdvancedScore(BaseModel):
    category: str
    question_text: str
    score_value: int = PydanticField(ge=1, le=5)
    checklist_item_code: Optional[str] = None
    photo_data: Optional[str] = None
    notes: Optional[str] = None


class AuditAdvancedCreate(BaseModel):
    asset_id: uuid.UUID
    type: str = "5S"
    auditor: str
    checklist_template_id: Optional[uuid.UUID] = None
    finding_threshold: int = PydanticField(default=3, ge=1, le=5)
    scores: List[AuditAdvancedScore]
    auto_create_actions: bool = False
    action_threshold: int = PydanticField(default=2, ge=1, le=5)
    action_responsible: Optional[str] = None
    action_due_days: int = PydanticField(default=14, ge=1, le=180)


@router.post("/audits/advanced")
def create_advanced_audit(
    payload: AuditAdvancedCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    asset = session.get(Asset, payload.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    template = session.get(AuditChecklistTemplate, payload.checklist_template_id) if payload.checklist_template_id else None
    if payload.checklist_template_id and not template:
        raise HTTPException(status_code=404, detail="Checklist template not found")

    if template and template.require_photo:
        for row in payload.scores:
            if row.score_value <= payload.finding_threshold and not row.photo_data:
                raise HTTPException(
                    status_code=400,
                    detail=f"Photo evidence required for finding '{row.question_text}'.",
                )

    total_score = float(sum(row.score_value for row in payload.scores))
    max_possible_score = float(len(payload.scores) * 5)

    audit = AuditInstance(
        asset_id=payload.asset_id,
        type=payload.type,
        auditor=payload.auditor,
        audit_date=datetime.utcnow(),
        total_score=total_score,
        max_possible_score=max_possible_score,
    )
    session.add(audit)
    session.commit()
    session.refresh(audit)

    created_actions = 0
    for row in payload.scores:
        score = AuditScore(
            audit_id=audit.id,
            category=row.category,
            question_text=row.question_text,
            score_value=row.score_value,
        )
        session.add(score)
        session.flush()

        if row.photo_data:
            evidence = AuditEvidence(
                audit_id=audit.id,
                score_id=score.id,
                asset_id=payload.asset_id,
                checklist_item_code=row.checklist_item_code,
                photo_data=row.photo_data,
                notes=row.notes,
                created_by=user.username,
            )
            session.add(evidence)

        if payload.auto_create_actions and row.score_value <= payload.action_threshold:
            action = ImprovementAction(
                asset_id=payload.asset_id,
                source_document=f"AUDIT:{audit.id}",
                description=f"[{row.category}] {row.question_text} (score={row.score_value}/5)",
                responsible=payload.action_responsible or payload.auditor,
                due_date=date.today().fromordinal(date.today().toordinal() + payload.action_due_days),
                status="Open",
            )
            session.add(action)
            created_actions += 1

    session.commit()

    evidence_count = session.exec(select(AuditEvidence).where(AuditEvidence.audit_id == audit.id)).all()
    return {
        "audit_id": str(audit.id),
        "total_score": total_score,
        "max_possible_score": max_possible_score,
        "compliance_pct": round((total_score / max_possible_score) * 100 if max_possible_score else 0.0, 1),
        "template_id": str(template.id) if template else None,
        "evidence_count": len(evidence_count),
        "actions_created": created_actions,
    }


@router.post("/audits/evidence/upload")
async def upload_audit_evidence(
    file: UploadFile = File(...),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Empty image file")
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image too large (max 8MB)")

    mime = file.content_type or "application/octet-stream"
    encoded = base64.b64encode(raw).decode("ascii")
    data_url = f"data:{mime};base64,{encoded}"
    return {
        "success": 1,
        "uploaded_by": user.username,
        "file": {
            "name": file.filename or "evidence",
            "size": len(raw),
            "type": mime,
            "url": data_url,
        },
    }


@router.get("/ci/actions/export/pdf")
def export_action_board_pdf(
    status: Optional[str] = None,
    asset_id: Optional[uuid.UUID] = None,
    session: Session = Depends(get_session),
):
    stmt = select(ImprovementAction)
    if status:
        stmt = stmt.where(ImprovementAction.status == status)
    if asset_id:
        stmt = stmt.where(ImprovementAction.asset_id == asset_id)
    actions = session.exec(stmt).all()

    lines = [
        f"Total actions: {len(actions)}",
        "",
    ]
    grouped: Dict[str, List[ImprovementAction]] = {}
    for action in actions:
        grouped.setdefault(action.status, []).append(action)
    for st, rows in sorted(grouped.items(), key=lambda item: item[0]):
        lines.append(f"[{st}] {len(rows)}")
        for row in rows[:80]:
            lines.append(
                f"- {row.description} | owner={row.responsible} | due={row.due_date.isoformat() if row.due_date else '-'}"
            )
        lines.append("")

    payload = build_text_pdf("Takta Action Board", lines)
    headers = {"Content-Disposition": 'attachment; filename="takta_action_board.pdf"'}
    return StreamingResponse(io.BytesIO(payload), media_type="application/pdf", headers=headers)
