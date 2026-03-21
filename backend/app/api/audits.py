from collections import defaultdict
from datetime import date, datetime, timedelta
from typing import Dict, List, Optional, Tuple
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field as PydanticField
from sqlmodel import Session, select

from ..core.auth import CurrentUser, get_current_user, require_role
from ..db import get_session
from ..models import Asset, AuditInstance, AuditScore, ImprovementAction


router = APIRouter(
    prefix="/api/audits",
    tags=["Audits"],
    dependencies=[Depends(get_current_user)],
)


class AuditScoreInput(BaseModel):
    category: str
    question_text: str
    score_value: int = PydanticField(ge=1, le=5)


class AuditCreate(BaseModel):
    asset_id: uuid.UUID
    type: str = "5S"
    auditor: str
    audit_date: Optional[datetime] = None
    scores: List[AuditScoreInput]
    auto_create_actions: bool = False
    action_threshold: int = PydanticField(default=2, ge=1, le=5)
    action_responsible: Optional[str] = None
    action_due_days: int = PydanticField(default=14, ge=1, le=180)


class AuditScoreRead(BaseModel):
    id: uuid.UUID
    category: str
    question_text: str
    score_value: int


class AuditRead(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    asset_name: Optional[str] = None
    type: str
    auditor: str
    audit_date: datetime
    total_score: float
    max_possible_score: float
    compliance_pct: float
    scores: List[AuditScoreRead]
    actions_created: int = 0


class RadarCategoryPoint(BaseModel):
    category: str
    current_avg: float
    previous_avg: float


class RadarComparisonResponse(BaseModel):
    current_month: str
    previous_month: str
    categories: List[RadarCategoryPoint]


def _audit_action_source(audit_id: uuid.UUID) -> str:
    return f"AUDIT:{audit_id}"


def _count_generated_actions(session: Session, audit_id: uuid.UUID) -> int:
    source = _audit_action_source(audit_id)
    actions = session.exec(
        select(ImprovementAction).where(ImprovementAction.source_document == source)
    ).all()
    return len(actions)


def _map_audit(session: Session, audit: AuditInstance, include_scores: bool = True) -> AuditRead:
    asset = session.get(Asset, audit.asset_id)
    scores_db = session.exec(select(AuditScore).where(AuditScore.audit_id == audit.id)).all()
    scores = [
        AuditScoreRead(
            id=s.id,
            category=s.category,
            question_text=s.question_text,
            score_value=s.score_value,
        )
        for s in scores_db
    ] if include_scores else []

    compliance = (audit.total_score / audit.max_possible_score * 100) if audit.max_possible_score else 0.0
    return AuditRead(
        id=audit.id,
        asset_id=audit.asset_id,
        asset_name=asset.name if asset else None,
        type=audit.type,
        auditor=audit.auditor,
        audit_date=audit.audit_date,
        total_score=audit.total_score,
        max_possible_score=audit.max_possible_score,
        compliance_pct=round(compliance, 1),
        scores=scores,
        actions_created=_count_generated_actions(session, audit.id),
    )


def _parse_month(month: Optional[str]) -> Tuple[datetime, datetime, datetime, datetime]:
    """
    Returns: current_start, current_end, previous_start, previous_end
    """
    if month:
        try:
            year_str, month_str = month.split("-")
            year = int(year_str)
            month_num = int(month_str)
            if month_num < 1 or month_num > 12:
                raise ValueError
            current_start = datetime(year, month_num, 1)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM") from exc
    else:
        now = datetime.utcnow()
        current_start = datetime(now.year, now.month, 1)

    if current_start.month == 12:
        current_end = datetime(current_start.year + 1, 1, 1)
    else:
        current_end = datetime(current_start.year, current_start.month + 1, 1)

    previous_end = current_start
    if current_start.month == 1:
        previous_start = datetime(current_start.year - 1, 12, 1)
    else:
        previous_start = datetime(current_start.year, current_start.month - 1, 1)

    return current_start, current_end, previous_start, previous_end


def _avg_scores_by_category(
    session: Session,
    start: datetime,
    end: datetime,
    audit_type: str,
    asset_id: Optional[uuid.UUID],
) -> Dict[str, float]:
    stmt = (
        select(AuditInstance)
        .where(AuditInstance.audit_date >= start)
        .where(AuditInstance.audit_date < end)
        .where(AuditInstance.type == audit_type)
    )
    if asset_id:
        stmt = stmt.where(AuditInstance.asset_id == asset_id)

    audits = session.exec(stmt).all()
    if not audits:
        return {}

    audit_ids = [a.id for a in audits]
    scores = session.exec(select(AuditScore).where(AuditScore.audit_id.in_(audit_ids))).all()

    grouped = defaultdict(list)
    for score in scores:
        grouped[score.category].append(score.score_value)

    return {
        category: round(sum(values) / len(values), 2)
        for category, values in grouped.items()
        if values
    }


@router.post("", response_model=AuditRead)
def create_audit(
    payload: AuditCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    asset = session.get(Asset, payload.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    if not payload.scores:
        raise HTTPException(status_code=400, detail="At least one score item is required")

    total_score = float(sum(item.score_value for item in payload.scores))
    max_possible = float(len(payload.scores) * 5)

    audit = AuditInstance(
        asset_id=payload.asset_id,
        type=payload.type,
        auditor=payload.auditor,
        audit_date=payload.audit_date or datetime.utcnow(),
        total_score=total_score,
        max_possible_score=max_possible,
    )
    session.add(audit)
    session.commit()
    session.refresh(audit)

    for item in payload.scores:
        score = AuditScore(
            audit_id=audit.id,
            category=item.category,
            question_text=item.question_text,
            score_value=item.score_value,
        )
        session.add(score)
    session.commit()

    if payload.auto_create_actions:
        action_owner = payload.action_responsible or payload.auditor
        due_date = date.today() + timedelta(days=payload.action_due_days)
        for item in payload.scores:
            if item.score_value > payload.action_threshold:
                continue
            action = ImprovementAction(
                asset_id=payload.asset_id,
                source_document=_audit_action_source(audit.id),
                description=(
                    f"[{item.category}] {item.question_text} "
                    f"(puntaje {item.score_value}/5)"
                ),
                responsible=action_owner,
                due_date=due_date,
                status="Open",
            )
            session.add(action)
        session.commit()

    session.refresh(audit)
    return _map_audit(session, audit, include_scores=True)


@router.get("", response_model=List[AuditRead])
def read_audits(
    asset_id: Optional[uuid.UUID] = None,
    audit_type: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(AuditInstance)
    if asset_id:
        stmt = stmt.where(AuditInstance.asset_id == asset_id)
    if audit_type:
        stmt = stmt.where(AuditInstance.type == audit_type)
    audits = session.exec(stmt.order_by(AuditInstance.audit_date.desc())).all()
    return [_map_audit(session, audit, include_scores=True) for audit in audits]


@router.get("/radar/comparison", response_model=RadarComparisonResponse)
def get_radar_comparison(
    asset_id: Optional[uuid.UUID] = Query(default=None),
    audit_type: str = Query(default="5S"),
    month: Optional[str] = Query(default=None, description="YYYY-MM"),
    session: Session = Depends(get_session),
):
    current_start, current_end, previous_start, previous_end = _parse_month(month)

    current_avg = _avg_scores_by_category(
        session=session,
        start=current_start,
        end=current_end,
        audit_type=audit_type,
        asset_id=asset_id,
    )
    previous_avg = _avg_scores_by_category(
        session=session,
        start=previous_start,
        end=previous_end,
        audit_type=audit_type,
        asset_id=asset_id,
    )

    categories = sorted(set(current_avg.keys()) | set(previous_avg.keys()))
    points = [
        RadarCategoryPoint(
            category=category,
            current_avg=current_avg.get(category, 0.0),
            previous_avg=previous_avg.get(category, 0.0),
        )
        for category in categories
    ]

    return RadarComparisonResponse(
        current_month=current_start.strftime("%Y-%m"),
        previous_month=previous_start.strftime("%Y-%m"),
        categories=points,
    )


@router.get("/asset/{asset_id}", response_model=List[AuditRead])
def read_asset_audits(asset_id: uuid.UUID, session: Session = Depends(get_session)):
    audits = session.exec(
        select(AuditInstance)
        .where(AuditInstance.asset_id == asset_id)
        .order_by(AuditInstance.audit_date.desc())
    ).all()
    return [_map_audit(session, audit, include_scores=True) for audit in audits]


@router.get("/{audit_id}", response_model=AuditRead)
def read_audit_detail(audit_id: uuid.UUID, session: Session = Depends(get_session)):
    audit = session.get(AuditInstance, audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")
    return _map_audit(session, audit, include_scores=True)


@router.delete("/{audit_id}", status_code=204)
def delete_audit(
    audit_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    audit = session.get(AuditInstance, audit_id)
    if not audit:
        raise HTTPException(status_code=404, detail="Audit not found")

    scores = session.exec(select(AuditScore).where(AuditScore.audit_id == audit_id)).all()
    for score in scores:
        session.delete(score)

    source = _audit_action_source(audit_id)
    actions = session.exec(
        select(ImprovementAction).where(ImprovementAction.source_document == source)
    ).all()
    for action in actions:
        session.delete(action)

    session.delete(audit)
    session.commit()
