from __future__ import annotations

import io
import json
import unicodedata
import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from openpyxl import Workbook
from pydantic import BaseModel, Field as PydanticField
from sqlmodel import Session, and_, select

from ..core.auth import CurrentUser, get_current_user, require_role
from ..db import get_session
from ..models import (
    Asset,
    ExecutionContextRule,
    FailureCatalog,
    Operator,
    OperatorStationAssignment,
    ShiftPlan,
)


router = APIRouter(
    prefix="/api/execution",
    tags=["Execution Advanced"],
    dependencies=[Depends(get_current_user)],
)


def _safe_json_load(raw: str, default: Any) -> Any:
    try:
        return json.loads(raw or "")
    except Exception:
        return default


def _normalize_text(value: str) -> str:
    value = value or ""
    normalized = unicodedata.normalize("NFD", value)
    without_accents = "".join(ch for ch in normalized if unicodedata.category(ch) != "Mn")
    return without_accents.lower().strip()


class ContextRuleCreate(BaseModel):
    role: Optional[str] = None
    shift: Optional[str] = None
    asset_id: Optional[uuid.UUID] = None
    priority: int = 100
    context: Dict[str, Any] = {}
    is_active: bool = True


class ContextRuleUpdate(BaseModel):
    role: Optional[str] = None
    shift: Optional[str] = None
    asset_id: Optional[uuid.UUID] = None
    priority: Optional[int] = None
    context: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None


@router.post("/context/rules")
def create_context_rule(
    payload: ContextRuleCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    if payload.asset_id and not session.get(Asset, payload.asset_id):
        raise HTTPException(status_code=404, detail="Asset not found")
    row = ExecutionContextRule(
        role=payload.role,
        shift=payload.shift,
        asset_id=payload.asset_id,
        priority=payload.priority,
        context_json=json.dumps(payload.context, ensure_ascii=False),
        is_active=payload.is_active,
        created_by=user.username,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": str(row.id)}


@router.get("/context/rules")
def list_context_rules(
    role: Optional[str] = None,
    shift: Optional[str] = None,
    asset_id: Optional[uuid.UUID] = None,
    session: Session = Depends(get_session),
):
    stmt = select(ExecutionContextRule)
    if role:
        stmt = stmt.where(ExecutionContextRule.role == role)
    if shift:
        stmt = stmt.where(ExecutionContextRule.shift == shift)
    if asset_id:
        stmt = stmt.where(ExecutionContextRule.asset_id == asset_id)
    rules = session.exec(stmt.order_by(ExecutionContextRule.priority.asc())).all()
    return [
        {
            "id": str(rule.id),
            "role": rule.role,
            "shift": rule.shift,
            "asset_id": str(rule.asset_id) if rule.asset_id else None,
            "priority": rule.priority,
            "context": _safe_json_load(rule.context_json, {}),
            "is_active": rule.is_active,
            "created_by": rule.created_by,
            "created_at": rule.created_at.isoformat(),
        }
        for rule in rules
    ]


@router.patch("/context/rules/{rule_id}")
def update_context_rule(
    rule_id: uuid.UUID,
    payload: ContextRuleUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    rule = session.get(ExecutionContextRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Context rule not found")
    data = payload.model_dump(exclude_unset=True)
    if "asset_id" in data and data["asset_id"] and not session.get(Asset, data["asset_id"]):
        raise HTTPException(status_code=404, detail="Asset not found")
    if "context" in data:
        rule.context_json = json.dumps(data.pop("context"), ensure_ascii=False)
    for key, value in data.items():
        setattr(rule, key, value)
    session.add(rule)
    session.commit()
    session.refresh(rule)
    return {"id": str(rule.id)}


@router.delete("/context/rules/{rule_id}", status_code=204)
def delete_context_rule(
    rule_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    rule = session.get(ExecutionContextRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Context rule not found")
    session.delete(rule)
    session.commit()


@router.get("/context/resolve")
def resolve_execution_context(
    shift: Optional[str] = None,
    asset_id: Optional[uuid.UUID] = None,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    rules = session.exec(
        select(ExecutionContextRule)
        .where(ExecutionContextRule.is_active == True)  # noqa: E712
        .order_by(ExecutionContextRule.priority.asc(), ExecutionContextRule.created_at.desc())
    ).all()
    scored: List[tuple[int, ExecutionContextRule]] = []
    for rule in rules:
        score = 0
        if rule.role:
            if rule.role != user.role:
                continue
            score += 3
        if rule.shift:
            if shift and rule.shift != shift:
                continue
            if not shift:
                continue
            score += 2
        if rule.asset_id:
            if asset_id and rule.asset_id != asset_id:
                continue
            if not asset_id:
                continue
            score += 2
        scored.append((score, rule))

    if not scored:
        return {
            "username": user.username,
            "role": user.role,
            "shift": shift,
            "asset_id": str(asset_id) if asset_id else None,
            "rule_id": None,
            "context": {},
        }

    scored.sort(key=lambda row: (-row[0], row[1].priority))
    selected = scored[0][1]
    return {
        "username": user.username,
        "role": user.role,
        "shift": shift,
        "asset_id": str(asset_id) if asset_id else (str(selected.asset_id) if selected.asset_id else None),
        "rule_id": str(selected.id),
        "context": _safe_json_load(selected.context_json, {}),
    }


class FailureCatalogCreate(BaseModel):
    code: str
    name: str
    keywords: List[str] = []
    downtime_type: Optional[str] = None
    suggested_root_cause: Optional[str] = None
    severity: Optional[str] = None
    is_active: bool = True


class FailureCatalogUpdate(BaseModel):
    name: Optional[str] = None
    keywords: Optional[List[str]] = None
    downtime_type: Optional[str] = None
    suggested_root_cause: Optional[str] = None
    severity: Optional[str] = None
    is_active: Optional[bool] = None


@router.post("/failure-catalog")
def create_failure_catalog_item(
    payload: FailureCatalogCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    exists = session.exec(select(FailureCatalog).where(FailureCatalog.code == payload.code.strip())).first()
    if exists:
        raise HTTPException(status_code=409, detail="Catalog code already exists")
    row = FailureCatalog(
        code=payload.code.strip(),
        name=payload.name.strip(),
        keywords_json=json.dumps(payload.keywords, ensure_ascii=False),
        downtime_type=payload.downtime_type,
        suggested_root_cause=payload.suggested_root_cause,
        severity=payload.severity,
        is_active=payload.is_active,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": str(row.id)}


@router.get("/failure-catalog")
def list_failure_catalog(session: Session = Depends(get_session)):
    rows = session.exec(select(FailureCatalog).order_by(FailureCatalog.code.asc())).all()
    return [
        {
            "id": str(row.id),
            "code": row.code,
            "name": row.name,
            "keywords": _safe_json_load(row.keywords_json, []),
            "downtime_type": row.downtime_type,
            "suggested_root_cause": row.suggested_root_cause,
            "severity": row.severity,
            "is_active": row.is_active,
        }
        for row in rows
    ]


@router.patch("/failure-catalog/{item_id}")
def update_failure_catalog_item(
    item_id: uuid.UUID,
    payload: FailureCatalogUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    row = session.get(FailureCatalog, item_id)
    if not row:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    data = payload.model_dump(exclude_unset=True)
    if "keywords" in data:
        row.keywords_json = json.dumps(data.pop("keywords"), ensure_ascii=False)
    for key, value in data.items():
        setattr(row, key, value)
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": str(row.id)}


@router.delete("/failure-catalog/{item_id}", status_code=204)
def delete_failure_catalog_item(
    item_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    row = session.get(FailureCatalog, item_id)
    if not row:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    session.delete(row)
    session.commit()


class VoiceNormalizeRequest(BaseModel):
    transcript: str


@router.post("/voice/normalize")
def normalize_voice_transcript(
    payload: VoiceNormalizeRequest,
    session: Session = Depends(get_session),
):
    text = _normalize_text(payload.transcript)
    rows = session.exec(select(FailureCatalog).where(FailureCatalog.is_active == True)).all()  # noqa: E712
    best_match = None
    best_score = 0
    for row in rows:
        keywords = _safe_json_load(row.keywords_json, [])
        score = 0
        for keyword in keywords:
            normalized_keyword = _normalize_text(str(keyword))
            if normalized_keyword and normalized_keyword in text:
                score += len(normalized_keyword)
        if score > best_score:
            best_score = score
            best_match = row

    if not best_match:
        return {"matched": False, "normalized_text": text}

    return {
        "matched": True,
        "catalog_id": str(best_match.id),
        "code": best_match.code,
        "name": best_match.name,
        "downtime_type": best_match.downtime_type,
        "suggested_root_cause": best_match.suggested_root_cause,
        "severity": best_match.severity,
        "normalized_text": text,
    }


class AssignmentCreate(BaseModel):
    operator_id: uuid.UUID
    asset_id: uuid.UUID
    shift: str
    starts_at: Optional[datetime] = None
    notes: Optional[str] = None


class AssignmentClose(BaseModel):
    ends_at: Optional[datetime] = None
    notes: Optional[str] = None


@router.post("/staff/assignments")
def create_operator_assignment(
    payload: AssignmentCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    if not session.get(Operator, payload.operator_id):
        raise HTTPException(status_code=404, detail="Operator not found")
    if not session.get(Asset, payload.asset_id):
        raise HTTPException(status_code=404, detail="Asset not found")

    active = session.exec(
        select(OperatorStationAssignment).where(
            and_(
                OperatorStationAssignment.operator_id == payload.operator_id,
                OperatorStationAssignment.status == "Active",
            )
        )
    ).all()
    for row in active:
        row.status = "Closed"
        row.ends_at = payload.starts_at or datetime.utcnow()
        session.add(row)

    assignment = OperatorStationAssignment(
        operator_id=payload.operator_id,
        asset_id=payload.asset_id,
        shift=payload.shift,
        starts_at=payload.starts_at or datetime.utcnow(),
        notes=payload.notes,
        assigned_by=user.username,
        status="Active",
    )
    session.add(assignment)
    session.commit()
    session.refresh(assignment)
    return {"id": str(assignment.id)}


@router.get("/staff/assignments")
def list_operator_assignments(
    operator_id: Optional[uuid.UUID] = None,
    asset_id: Optional[uuid.UUID] = None,
    shift: Optional[str] = None,
    active_only: bool = False,
    limit: int = Query(default=200, ge=1, le=1000),
    session: Session = Depends(get_session),
):
    stmt = select(OperatorStationAssignment)
    if operator_id:
        stmt = stmt.where(OperatorStationAssignment.operator_id == operator_id)
    if asset_id:
        stmt = stmt.where(OperatorStationAssignment.asset_id == asset_id)
    if shift:
        stmt = stmt.where(OperatorStationAssignment.shift == shift)
    if active_only:
        stmt = stmt.where(OperatorStationAssignment.status == "Active")
    rows = session.exec(stmt.order_by(OperatorStationAssignment.starts_at.desc()).limit(limit)).all()
    operators = {row.id: row for row in session.exec(select(Operator)).all()}
    assets = {row.id: row for row in session.exec(select(Asset)).all()}
    return [
        {
            "id": str(row.id),
            "operator_id": str(row.operator_id),
            "operator_name": operators.get(row.operator_id).full_name if operators.get(row.operator_id) else None,
            "asset_id": str(row.asset_id),
            "asset_name": assets.get(row.asset_id).name if assets.get(row.asset_id) else None,
            "shift": row.shift,
            "starts_at": row.starts_at.isoformat(),
            "ends_at": row.ends_at.isoformat() if row.ends_at else None,
            "status": row.status,
            "notes": row.notes,
            "assigned_by": row.assigned_by,
        }
        for row in rows
    ]


@router.patch("/staff/assignments/{assignment_id}/close")
def close_operator_assignment(
    assignment_id: uuid.UUID,
    payload: AssignmentClose,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    row = session.get(OperatorStationAssignment, assignment_id)
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")
    row.status = "Closed"
    row.ends_at = payload.ends_at or datetime.utcnow()
    if payload.notes is not None:
        row.notes = payload.notes
    session.add(row)
    session.commit()
    session.refresh(row)
    return {"id": str(row.id), "status": row.status}


@router.delete("/staff/assignments/{assignment_id}", status_code=204)
def delete_operator_assignment(
    assignment_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    row = session.get(OperatorStationAssignment, assignment_id)
    if not row:
        raise HTTPException(status_code=404, detail="Assignment not found")
    session.delete(row)
    session.commit()


class ShiftPlanCreate(BaseModel):
    plan_date: date
    shift: str
    asset_id: uuid.UUID
    operator_id: Optional[uuid.UUID] = None
    target_quantity: Optional[int] = None
    notes: Optional[str] = None


class ShiftPlanBulkRequest(BaseModel):
    plans: List[ShiftPlanCreate]


def _validate_shift_plan_references(session: Session, plan: ShiftPlanCreate) -> None:
    if not session.get(Asset, plan.asset_id):
        raise HTTPException(status_code=404, detail=f"Asset not found: {plan.asset_id}")
    if plan.operator_id and not session.get(Operator, plan.operator_id):
        raise HTTPException(status_code=404, detail=f"Operator not found: {plan.operator_id}")


@router.post("/shifts/plans")
def create_shift_plan(
    payload: ShiftPlanCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    _validate_shift_plan_references(session, payload)
    plan = ShiftPlan(
        plan_date=payload.plan_date,
        shift=payload.shift,
        asset_id=payload.asset_id,
        operator_id=payload.operator_id,
        target_quantity=payload.target_quantity,
        notes=payload.notes,
        created_by=user.username,
    )
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return {"id": str(plan.id)}


@router.post("/shifts/plans/bulk")
def create_shift_plan_bulk(
    payload: ShiftPlanBulkRequest,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    created = 0
    for item in payload.plans:
        _validate_shift_plan_references(session, item)
        plan = ShiftPlan(
            plan_date=item.plan_date,
            shift=item.shift,
            asset_id=item.asset_id,
            operator_id=item.operator_id,
            target_quantity=item.target_quantity,
            notes=item.notes,
            created_by=user.username,
        )
        session.add(plan)
        created += 1
    session.commit()
    return {"created": created}


@router.get("/shifts/plans")
def list_shift_plans(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    asset_id: Optional[uuid.UUID] = None,
    shift: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(ShiftPlan)
    if date_from:
        stmt = stmt.where(ShiftPlan.plan_date >= date_from)
    if date_to:
        stmt = stmt.where(ShiftPlan.plan_date <= date_to)
    if asset_id:
        stmt = stmt.where(ShiftPlan.asset_id == asset_id)
    if shift:
        stmt = stmt.where(ShiftPlan.shift == shift)
    rows = session.exec(stmt.order_by(ShiftPlan.plan_date.asc())).all()
    operators = {row.id: row for row in session.exec(select(Operator)).all()}
    assets = {row.id: row for row in session.exec(select(Asset)).all()}
    return [
        {
            "id": str(row.id),
            "plan_date": row.plan_date.isoformat(),
            "shift": row.shift,
            "asset_id": str(row.asset_id),
            "asset_name": assets.get(row.asset_id).name if assets.get(row.asset_id) else None,
            "operator_id": str(row.operator_id) if row.operator_id else None,
            "operator_name": operators.get(row.operator_id).full_name if row.operator_id and operators.get(row.operator_id) else None,
            "target_quantity": row.target_quantity,
            "notes": row.notes,
            "created_by": row.created_by,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]


@router.delete("/shifts/plans/{plan_id}", status_code=204)
def delete_shift_plan(
    plan_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    row = session.get(ShiftPlan, plan_id)
    if not row:
        raise HTTPException(status_code=404, detail="Shift plan not found")
    session.delete(row)
    session.commit()


@router.get("/shifts/plans/template")
def download_shift_plan_template():
    wb = Workbook()
    ws = wb.active
    ws.title = "shift_plans"
    ws.append(["plan_date", "shift", "asset_id", "operator_id", "target_quantity", "notes"])
    ws.append(["2026-03-03", "Manana", "uuid_asset", "uuid_operator", 1200, "Linea principal"])
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    headers = {"Content-Disposition": 'attachment; filename="takta_shift_plan_template.xlsx"'}
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )


@router.get("/shifts/plans/export")
def export_shift_plans(
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    session: Session = Depends(get_session),
):
    plans = list_shift_plans(date_from=date_from, date_to=date_to, session=session)
    wb = Workbook()
    ws = wb.active
    ws.title = "shift_plans"
    ws.append(
        [
            "id",
            "plan_date",
            "shift",
            "asset_id",
            "asset_name",
            "operator_id",
            "operator_name",
            "target_quantity",
            "notes",
        ]
    )
    for row in plans:
        ws.append(
            [
                row["id"],
                row["plan_date"],
                row["shift"],
                row["asset_id"],
                row["asset_name"],
                row["operator_id"],
                row["operator_name"],
                row["target_quantity"],
                row["notes"],
            ]
        )
    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    headers = {"Content-Disposition": 'attachment; filename="takta_shift_plans_export.xlsx"'}
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers=headers,
    )
