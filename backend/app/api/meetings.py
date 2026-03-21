from __future__ import annotations

import json
import re
import unicodedata
import uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from ..core.auth import CurrentUser, get_current_user, require_role
from ..db import get_session
from ..models import (
    Asset,
    CapaAction,
    ContinuousImprovementKpiDefinition,
    ContinuousImprovementKpiMeasurement,
    EngineeringMeeting,
    ImprovementAction,
    NonConformity,
)


router = APIRouter(
    prefix="/api/meetings",
    tags=["meetings"],
    dependencies=[Depends(get_current_user)],
)

MC_KPI_TARGET_PCT = 95.0
OFFICIAL_MC_KPI_WEIGHTS = {
    "MC-GV-01": 10.0,
    "MC-GV-02": 5.0,
    "MC-GV-03": 5.0,
    "MC-GV-04": 5.0,
    "MC-SST-01": 10.0,
    "MC-PI-01": 20.0,
    "MC-PI-02": 10.0,
    "MC-EO-01": 5.0,
    "MC-EO-02": 10.0,
    "MC-EO-03": 10.0,
    "MC-EF-01": 5.0,
    "MC-MC-01": 5.0,
}


class MeetingParticipant(BaseModel):
    name: str
    role: Optional[str] = None
    attendance: Optional[str] = "Asistente"


class MeetingAgendaItem(BaseModel):
    order: int
    title: str
    objective: Optional[str] = None
    decisions: List[str] = Field(default_factory=list)


class MeetingKpiItem(BaseModel):
    objective: str
    weight_pct: Optional[float] = None
    target_value: Optional[float] = None
    current_value: Optional[float] = None
    unit: Optional[str] = None
    owner: Optional[str] = None


class MeetingFocusItem(BaseModel):
    focus: str
    responsible: Optional[str] = None
    due_date: Optional[date] = None


class MeetingCommitmentItem(BaseModel):
    description: str
    responsible: str
    due_date: Optional[date] = None
    status: str = "Open"
    asset_id: Optional[uuid.UUID] = None
    area: Optional[str] = None
    priority: Optional[str] = None
    action_id: Optional[uuid.UUID] = None


class MeetingCreate(BaseModel):
    asset_id: Optional[uuid.UUID] = None
    title: str
    meeting_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    objective: Optional[str] = None
    scope: Optional[str] = None
    out_of_scope: Optional[str] = None
    risks: Optional[str] = None
    key_decisions: Optional[str] = None
    notes: Optional[str] = None
    next_meeting_date: Optional[date] = None
    status: str = "Draft"
    source_module: str = "meetings"
    participants: List[MeetingParticipant] = Field(default_factory=list)
    agenda: List[MeetingAgendaItem] = Field(default_factory=list)
    kpis: List[MeetingKpiItem] = Field(default_factory=list)
    focuses: List[MeetingFocusItem] = Field(default_factory=list)
    commitments: List[MeetingCommitmentItem] = Field(default_factory=list)


class MeetingUpdate(BaseModel):
    asset_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    meeting_date: Optional[date] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    objective: Optional[str] = None
    scope: Optional[str] = None
    out_of_scope: Optional[str] = None
    risks: Optional[str] = None
    key_decisions: Optional[str] = None
    notes: Optional[str] = None
    next_meeting_date: Optional[date] = None
    status: Optional[str] = None
    source_module: Optional[str] = None
    participants: Optional[List[MeetingParticipant]] = None
    agenda: Optional[List[MeetingAgendaItem]] = None
    kpis: Optional[List[MeetingKpiItem]] = None
    focuses: Optional[List[MeetingFocusItem]] = None
    commitments: Optional[List[MeetingCommitmentItem]] = None


class MeetingRead(BaseModel):
    id: uuid.UUID
    asset_id: Optional[uuid.UUID] = None
    asset_name: Optional[str] = None
    title: str
    meeting_date: date
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None
    objective: Optional[str] = None
    scope: Optional[str] = None
    out_of_scope: Optional[str] = None
    risks: Optional[str] = None
    key_decisions: Optional[str] = None
    notes: Optional[str] = None
    next_meeting_date: Optional[date] = None
    status: str
    source_module: str
    created_by: str
    created_at: datetime
    updated_at: datetime
    actions_last_sync_at: Optional[datetime] = None
    participants: List[MeetingParticipant] = Field(default_factory=list)
    agenda: List[MeetingAgendaItem] = Field(default_factory=list)
    kpis: List[MeetingKpiItem] = Field(default_factory=list)
    focuses: List[MeetingFocusItem] = Field(default_factory=list)
    commitments: List[MeetingCommitmentItem] = Field(default_factory=list)
    open_commitments: int = 0
    closed_commitments: int = 0
    overdue_commitments: int = 0
    linked_actions: int = 0


class MaterializeActionsRequest(BaseModel):
    force: bool = False
    default_due_days: Optional[int] = 7


class MaterializeActionsResponse(BaseModel):
    meeting_id: uuid.UUID
    created_actions: int
    linked_actions: int
    errors_count: int
    errors: List[str]
    commitments: List[MeetingCommitmentItem]
    synced_at: datetime


class CommitmentDelta(BaseModel):
    description: str
    responsible: Optional[str] = None
    due_date: Optional[date] = None
    previous_status: Optional[str] = None
    current_status: Optional[str] = None
    action_id: Optional[uuid.UUID] = None


class MeetingComparisonResponse(BaseModel):
    meeting_id: uuid.UUID
    previous_meeting_id: Optional[uuid.UUID] = None
    carried_over: List[CommitmentDelta] = Field(default_factory=list)
    closed_since_last: List[CommitmentDelta] = Field(default_factory=list)
    new_commitments: List[CommitmentDelta] = Field(default_factory=list)
    overdue_now: List[CommitmentDelta] = Field(default_factory=list)
    dropped_without_close: List[CommitmentDelta] = Field(default_factory=list)


class MeetingDashboardResponse(BaseModel):
    meetings_last_30d: int
    meetings_open: int
    commitments_open: int
    commitments_overdue: int
    commitments_closed: int
    linked_actions: int
    next_meeting_date: Optional[date] = None
    next_meeting_title: Optional[str] = None
    kpi_mc_period: Optional[str] = None
    kpi_mc_completion_rate_pct: Optional[float] = None
    kpi_mc_weighted_kpi_result_pct: Optional[float] = None
    kpi_mc_red_items: Optional[int] = None
    kpi_mc_previous_period: Optional[str] = None
    kpi_mc_previous_weighted_kpi_result_pct: Optional[float] = None
    kpi_mc_weighted_kpi_result_delta_pct: Optional[float] = None
    kpi_mc_completion_rate_delta_pct: Optional[float] = None
    kpi_mc_red_items_delta: Optional[int] = None
    kpi_mc_target_pct: Optional[float] = None
    kpi_mc_gap_to_target_pct: Optional[float] = None
    kpi_mc_trend_alert_level: Optional[str] = None
    kpi_mc_trend_alert_message: Optional[str] = None
    kpi_mc_trend_recommended_action: Optional[str] = None
    quality_non_conformities_open: int = 0
    quality_non_conformities_critical: int = 0
    quality_capa_open: int = 0
    quality_capa_overdue: int = 0


class MeetingQualityIssue(BaseModel):
    id: uuid.UUID
    issue_type: str  # non_conformity | capa_action
    non_conformity_id: Optional[uuid.UUID] = None
    title: str
    status: str
    severity: Optional[str] = None
    due_date: Optional[date] = None
    responsible: Optional[str] = None
    source: Optional[str] = None
    created_at: datetime
    action_id: Optional[uuid.UUID] = None
    asset_id: Optional[uuid.UUID] = None


class SyncQualityCommitmentsResponse(BaseModel):
    meeting_id: uuid.UUID
    created_commitments: int
    linked_existing: int
    total_commitments: int


class HeuristicImportRequest(BaseModel):
    raw_text: str
    default_title: Optional[str] = "Acta de Ingenieria de Procesos"
    asset_id: Optional[uuid.UUID] = None


class HeuristicImportResponse(BaseModel):
    draft: MeetingCreate
    warnings: List[str] = Field(default_factory=list)


def _json_to_list(raw: Optional[str]) -> List[Dict[str, Any]]:
    if not raw:
        return []
    try:
        parsed = json.loads(raw)
    except Exception:
        return []
    return parsed if isinstance(parsed, list) else []


def _dump_models(items: Optional[List[Any]]) -> str:
    if not items:
        return "[]"
    serialized = []
    for item in items:
        if isinstance(item, BaseModel):
            serialized.append(item.model_dump(mode="json"))
        elif isinstance(item, dict):
            serialized.append(item)
    return json.dumps(serialized, ensure_ascii=False)


def _normalize_status(status: Optional[str]) -> str:
    raw = (status or "Open").strip().lower()
    if raw in {"open", "abierta", "abierto"}:
        return "Open"
    if raw in {"in progress", "in_progress", "en progreso", "progreso"}:
        return "In Progress"
    if raw in {"close requested", "close_requested", "closerequested"}:
        return "Close Requested"
    if raw in {"approved", "aprobado", "aprobada"}:
        return "Approved"
    if raw in {"rejected", "rechazado", "rechazada"}:
        return "Rejected"
    if raw in {"closed", "cerrada", "cerrado"}:
        return "Closed"
    if raw in {"verified", "verificada", "verificado"}:
        return "Verified"
    return "Open"


def _is_closed(status: Optional[str]) -> bool:
    return _normalize_status(status) in {"Approved", "Closed", "Verified"}


def _is_quality_open(status: Optional[str]) -> bool:
    return _normalize_status(status) not in {"Closed", "Verified"}


def _as_date(value: Any) -> Optional[date]:
    if value is None:
        return None
    if isinstance(value, date):
        return value
    text = str(value).strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text[:10])
    except ValueError:
        return None


def _to_commitment_models(raw_commitments: List[Dict[str, Any]]) -> List[MeetingCommitmentItem]:
    items: List[MeetingCommitmentItem] = []
    for row in raw_commitments:
        try:
            row = dict(row)
            row["status"] = _normalize_status(row.get("status"))
            if row.get("due_date"):
                row["due_date"] = _as_date(row.get("due_date"))
            items.append(MeetingCommitmentItem(**row))
        except Exception:
            continue
    return items


def _validate_commitment_references(
    session: Session,
    commitments: Optional[List[MeetingCommitmentItem]],
    fallback_asset_id: Optional[uuid.UUID],
) -> List[MeetingCommitmentItem]:
    if not commitments:
        return []

    validated: List[MeetingCommitmentItem] = []
    for idx, item in enumerate(commitments, start=1):
        normalized = item.model_copy(deep=True)
        normalized.status = _normalize_status(normalized.status)

        effective_asset_id = normalized.asset_id or fallback_asset_id
        if effective_asset_id and not session.get(Asset, effective_asset_id):
            raise HTTPException(status_code=404, detail=f"Commitment {idx}: asset not found.")

        if normalized.action_id:
            action = session.get(ImprovementAction, normalized.action_id)
            if not action:
                raise HTTPException(status_code=404, detail=f"Commitment {idx}: linked action not found.")
            if effective_asset_id and action.asset_id and action.asset_id != effective_asset_id:
                raise HTTPException(
                    status_code=400,
                    detail=f"Commitment {idx}: action_id does not match asset context.",
                )
            if not effective_asset_id and action.asset_id:
                effective_asset_id = action.asset_id

        normalized.asset_id = effective_asset_id
        validated.append(normalized)

    return validated


def _to_meeting_read(session: Session, meeting: EngineeringMeeting) -> MeetingRead:
    participants = [MeetingParticipant(**row) for row in _json_to_list(meeting.participants_json)]
    agenda = [MeetingAgendaItem(**row) for row in _json_to_list(meeting.agenda_json)]
    kpis = [MeetingKpiItem(**row) for row in _json_to_list(meeting.kpis_json)]
    focuses = [MeetingFocusItem(**row) for row in _json_to_list(meeting.focuses_json)]
    commitments = _to_commitment_models(_json_to_list(meeting.commitments_json))

    today = date.today()
    open_count = 0
    closed_count = 0
    overdue_count = 0
    linked_actions = 0
    for commitment in commitments:
        if commitment.action_id:
            linked_actions += 1
        if _is_closed(commitment.status):
            closed_count += 1
            continue
        open_count += 1
        if commitment.due_date and commitment.due_date < today:
            overdue_count += 1

    asset = session.get(Asset, meeting.asset_id) if meeting.asset_id else None
    return MeetingRead(
        id=meeting.id,
        asset_id=meeting.asset_id,
        asset_name=asset.name if asset else None,
        title=meeting.title,
        meeting_date=meeting.meeting_date,
        start_time=meeting.start_time,
        end_time=meeting.end_time,
        location=meeting.location,
        objective=meeting.objective,
        scope=meeting.scope,
        out_of_scope=meeting.out_of_scope,
        risks=meeting.risks,
        key_decisions=meeting.key_decisions,
        notes=meeting.notes,
        next_meeting_date=meeting.next_meeting_date,
        status=meeting.status,
        source_module=meeting.source_module,
        created_by=meeting.created_by,
        created_at=meeting.created_at,
        updated_at=meeting.updated_at,
        actions_last_sync_at=meeting.actions_last_sync_at,
        participants=participants,
        agenda=agenda,
        kpis=kpis,
        focuses=focuses,
        commitments=commitments,
        open_commitments=open_count,
        closed_commitments=closed_count,
        overdue_commitments=overdue_count,
        linked_actions=linked_actions,
    )


def _commitment_key(item: Dict[str, Any]) -> str:
    return f"{str(item.get('description', '')).strip().lower()}|{str(item.get('responsible', '')).strip().lower()}"


def _strip_accents(text: str) -> str:
    return "".join(ch for ch in unicodedata.normalize("NFD", text) if unicodedata.category(ch) != "Mn")


def _parse_spanish_date(raw: str) -> Optional[date]:
    months = {
        "enero": 1,
        "febrero": 2,
        "marzo": 3,
        "abril": 4,
        "mayo": 5,
        "junio": 6,
        "julio": 7,
        "agosto": 8,
        "septiembre": 9,
        "setiembre": 9,
        "octubre": 10,
        "noviembre": 11,
        "diciembre": 12,
    }
    match = re.search(r"(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóúñÑ]+)\s+de\s+(\d{4})", raw)
    if not match:
        return None
    day = int(match.group(1))
    month_name = _strip_accents(match.group(2).lower())
    year = int(match.group(3))
    month = months.get(month_name)
    if not month:
        return None
    try:
        return date(year, month, day)
    except ValueError:
        return None


def _effective_mc_kpi_weight(definition: ContinuousImprovementKpiDefinition) -> float:
    configured = float(definition.kpi_weight_pct or 0)
    if configured > 0:
        return configured
    return float(OFFICIAL_MC_KPI_WEIGHTS.get(definition.code, 0))


def _build_mc_kpi_dashboard_alert(current_metrics: Dict[str, Any], previous_metrics: Optional[Dict[str, Any]]) -> Dict[str, str]:
    if not previous_metrics:
        return {
            "level": "none",
            "message": "Sin histórico suficiente para evaluar tendencia KPI MC.",
            "recommended_action": "Completar dos periodos consecutivos de captura.",
        }

    delta_weighted = float(current_metrics["weighted_kpi_result_pct"]) - float(previous_metrics["weighted_kpi_result_pct"])
    delta_completion = float(current_metrics["completion_rate_pct"]) - float(previous_metrics["completion_rate_pct"])
    red_delta = int(current_metrics["red_items"]) - int(previous_metrics["red_items"])

    if float(current_metrics["weighted_kpi_result_pct"]) < 80 or int(current_metrics["red_items"]) >= 3:
        return {
            "level": "critical",
            "message": "Desempeño KPI MC crítico por brecha de resultado o exceso de rojos.",
            "recommended_action": "Activar comité de contención y plan CAPA inmediato.",
        }
    if delta_weighted <= -3 or delta_completion <= -10 or red_delta > 0:
        return {
            "level": "risk",
            "message": "Tendencia KPI MC en deterioro frente al período anterior.",
            "recommended_action": "Priorizar acciones abiertas y seguimiento semanal reforzado.",
        }
    if float(current_metrics["weighted_kpi_result_pct"]) < MC_KPI_TARGET_PCT or delta_weighted < 0:
        return {
            "level": "watch",
            "message": "Tendencia estable, pero debajo del objetivo KPI MC.",
            "recommended_action": "Mantener control y cerrar brechas antes del próximo comité.",
        }
    return {
        "level": "healthy",
        "message": "Tendencia KPI MC saludable y en objetivo.",
        "recommended_action": "Sostener prácticas efectivas y estandarizar aprendizajes.",
    }


def _kpi_mc_dashboard_summary(session: Session) -> Dict[str, Any]:
    definitions = session.exec(
        select(ContinuousImprovementKpiDefinition).where(
            ContinuousImprovementKpiDefinition.is_active.is_(True)
        )
    ).all()
    if not definitions:
        return {
            "period": datetime.utcnow().strftime("%Y-%m"),
            "completion_rate_pct": 0.0,
            "weighted_kpi_result_pct": 0.0,
            "red_items": 0,
            "previous_period": None,
            "previous_weighted_kpi_result_pct": None,
            "weighted_kpi_result_delta_pct": None,
            "completion_rate_delta_pct": None,
            "red_items_delta": None,
            "kpi_mc_target_pct": MC_KPI_TARGET_PCT,
            "kpi_mc_gap_to_target_pct": MC_KPI_TARGET_PCT,
            "kpi_mc_trend_alert_level": "none",
            "kpi_mc_trend_alert_message": "Sin catalogo KPI MC activo para evaluar tendencia.",
            "kpi_mc_trend_recommended_action": "Inicializar catalogo KPI MC y capturar mediciones.",
        }

    definition_ids = [row.id for row in definitions]
    measurements = session.exec(
        select(ContinuousImprovementKpiMeasurement).where(
            ContinuousImprovementKpiMeasurement.kpi_definition_id.in_(definition_ids)
        )
    ).all()

    periods = sorted({row.period_key for row in measurements if re.fullmatch(r"\d{4}-\d{2}", row.period_key)})
    current_period = periods[-1] if periods else datetime.utcnow().strftime("%Y-%m")
    previous_period = periods[-2] if len(periods) > 1 else None

    by_period: Dict[str, Dict[uuid.UUID, ContinuousImprovementKpiMeasurement]] = {}
    for row in measurements:
        if not re.fullmatch(r"\d{4}-\d{2}", row.period_key):
            continue
        period_map = by_period.setdefault(row.period_key, {})
        period_map[row.kpi_definition_id] = row

    def _period_metrics(period_key: str) -> Dict[str, Any]:
        period_measurements = by_period.get(period_key, {})
        measured = 0
        weighted_kpi_result = 0.0
        red_items = 0
        for definition in definitions:
            measurement = period_measurements.get(definition.id)
            if not measurement:
                continue
            measured += 1
            status_color = measurement.status_color or ""
            if status_color not in {"green", "yellow", "red"}:
                status_color = "red" if float(measurement.compliance_pct or 0) < 80 else "yellow"
                if float(measurement.compliance_pct or 0) >= 95:
                    status_color = "green"
            if status_color == "red":
                red_items += 1
            weighted_kpi_result += (float(measurement.compliance_pct or 0) / 100.0) * float(
                _effective_mc_kpi_weight(definition)
            )

        completion_rate = (measured / len(definitions) * 100.0) if definitions else 0.0
        return {
            "period": period_key,
            "completion_rate_pct": round(completion_rate, 1),
            "weighted_kpi_result_pct": round(weighted_kpi_result, 2),
            "red_items": red_items,
        }

    current_metrics = _period_metrics(current_period)
    previous_metrics = _period_metrics(previous_period) if previous_period else None
    alert = _build_mc_kpi_dashboard_alert(current_metrics=current_metrics, previous_metrics=previous_metrics)
    gap_to_target = round(float(MC_KPI_TARGET_PCT) - float(current_metrics["weighted_kpi_result_pct"]), 2)

    return {
        **current_metrics,
        "previous_period": previous_period,
        "previous_weighted_kpi_result_pct": (
            previous_metrics["weighted_kpi_result_pct"] if previous_metrics else None
        ),
        "weighted_kpi_result_delta_pct": (
            round(
                current_metrics["weighted_kpi_result_pct"] - previous_metrics["weighted_kpi_result_pct"],
                2,
            )
            if previous_metrics
            else None
        ),
        "completion_rate_delta_pct": (
            round(
                current_metrics["completion_rate_pct"] - previous_metrics["completion_rate_pct"],
                2,
            )
            if previous_metrics
            else None
        ),
        "red_items_delta": (
            int(current_metrics["red_items"]) - int(previous_metrics["red_items"])
            if previous_metrics
            else None
        ),
        "kpi_mc_target_pct": MC_KPI_TARGET_PCT,
        "kpi_mc_gap_to_target_pct": gap_to_target,
        "kpi_mc_trend_alert_level": alert["level"],
        "kpi_mc_trend_alert_message": alert["message"],
        "kpi_mc_trend_recommended_action": alert["recommended_action"],
    }


@router.post("/records", response_model=MeetingRead)
def create_meeting(
    payload: MeetingCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    if payload.asset_id and not session.get(Asset, payload.asset_id):
        raise HTTPException(status_code=404, detail="Asset not found")
    validated_commitments = _validate_commitment_references(
        session=session,
        commitments=payload.commitments,
        fallback_asset_id=payload.asset_id,
    )

    meeting = EngineeringMeeting(
        asset_id=payload.asset_id,
        title=payload.title,
        meeting_date=payload.meeting_date,
        start_time=payload.start_time,
        end_time=payload.end_time,
        location=payload.location,
        objective=payload.objective,
        scope=payload.scope,
        out_of_scope=payload.out_of_scope,
        risks=payload.risks,
        key_decisions=payload.key_decisions,
        notes=payload.notes,
        next_meeting_date=payload.next_meeting_date,
        status=payload.status,
        source_module=payload.source_module or "meetings",
        participants_json=_dump_models(payload.participants),
        agenda_json=_dump_models(payload.agenda),
        kpis_json=_dump_models(payload.kpis),
        focuses_json=_dump_models(payload.focuses),
        commitments_json=_dump_models(validated_commitments),
        created_by=user.username,
        updated_at=datetime.utcnow(),
    )
    session.add(meeting)
    session.commit()
    session.refresh(meeting)
    return _to_meeting_read(session, meeting)


@router.get("/records", response_model=List[MeetingRead])
def list_meetings(
    status: Optional[str] = Query(default=None),
    asset_id: Optional[uuid.UUID] = Query(default=None),
    from_date: Optional[date] = Query(default=None),
    to_date: Optional[date] = Query(default=None),
    session: Session = Depends(get_session),
):
    query = select(EngineeringMeeting)
    if status:
        query = query.where(EngineeringMeeting.status == status)
    if asset_id:
        query = query.where(EngineeringMeeting.asset_id == asset_id)
    if from_date:
        query = query.where(EngineeringMeeting.meeting_date >= from_date)
    if to_date:
        query = query.where(EngineeringMeeting.meeting_date <= to_date)
    query = query.order_by(EngineeringMeeting.meeting_date.desc(), EngineeringMeeting.created_at.desc())
    meetings = session.exec(query).all()
    return [_to_meeting_read(session, m) for m in meetings]


@router.get("/records/{meeting_id}", response_model=MeetingRead)
def get_meeting(meeting_id: uuid.UUID, session: Session = Depends(get_session)):
    meeting = session.get(EngineeringMeeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return _to_meeting_read(session, meeting)


@router.patch("/records/{meeting_id}", response_model=MeetingRead)
def update_meeting(
    meeting_id: uuid.UUID,
    payload: MeetingUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    meeting = session.get(EngineeringMeeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    updates = payload.model_dump(exclude_unset=True)
    if "asset_id" in updates and updates["asset_id"] is not None and not session.get(Asset, updates["asset_id"]):
        raise HTTPException(status_code=404, detail="Asset not found")

    scalar_fields = {
        "asset_id",
        "title",
        "meeting_date",
        "start_time",
        "end_time",
        "location",
        "objective",
        "scope",
        "out_of_scope",
        "risks",
        "key_decisions",
        "notes",
        "next_meeting_date",
        "status",
        "source_module",
    }
    for field_name in scalar_fields:
        if field_name in updates:
            setattr(meeting, field_name, updates[field_name])

    if "participants" in updates:
        meeting.participants_json = _dump_models(payload.participants or [])
    if "agenda" in updates:
        meeting.agenda_json = _dump_models(payload.agenda or [])
    if "kpis" in updates:
        meeting.kpis_json = _dump_models(payload.kpis or [])
    if "focuses" in updates:
        meeting.focuses_json = _dump_models(payload.focuses or [])
    if "commitments" in updates:
        fallback_asset_id = updates["asset_id"] if "asset_id" in updates else meeting.asset_id
        validated_commitments = _validate_commitment_references(
            session=session,
            commitments=payload.commitments or [],
            fallback_asset_id=fallback_asset_id,
        )
        meeting.commitments_json = _dump_models(validated_commitments)

    meeting.updated_at = datetime.utcnow()
    session.add(meeting)
    session.commit()
    session.refresh(meeting)
    return _to_meeting_read(session, meeting)


@router.delete("/records/{meeting_id}", status_code=204)
def delete_meeting(
    meeting_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    meeting = session.get(EngineeringMeeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    session.delete(meeting)
    session.commit()


@router.post("/records/{meeting_id}/materialize-actions", response_model=MaterializeActionsResponse)
def materialize_commitments_to_actions(
    meeting_id: uuid.UUID,
    payload: MaterializeActionsRequest,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    meeting = session.get(EngineeringMeeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    commitments = _json_to_list(meeting.commitments_json)
    created_actions = 0
    linked_actions = 0
    errors: List[str] = []
    today = date.today()
    default_due_days = payload.default_due_days if payload.default_due_days is not None else 7

    for idx, commitment in enumerate(commitments, start=1):
        description = str(commitment.get("description", "")).strip()
        responsible = str(commitment.get("responsible", "")).strip()
        if not description or not responsible:
            errors.append(f"Commitment {idx}: description and responsible are required.")
            continue

        action_id_raw = commitment.get("action_id")
        existing_action: Optional[ImprovementAction] = None
        if action_id_raw:
            try:
                action_id_uuid = uuid.UUID(str(action_id_raw))
            except ValueError:
                errors.append(f"Commitment {idx}: invalid action_id '{action_id_raw}'.")
                continue
            existing_action = session.get(ImprovementAction, action_id_uuid)
            if not existing_action:
                errors.append(f"Commitment {idx}: linked action '{action_id_raw}' not found.")
                continue

        if existing_action and not payload.force:
            commitment["status"] = _normalize_status(existing_action.status)
            linked_actions += 1
            continue

        due_date = _as_date(commitment.get("due_date"))
        if not due_date:
            due_date = today.fromordinal(today.toordinal() + max(0, default_due_days))
            commitment["due_date"] = due_date.isoformat()

        action_asset_raw = commitment.get("asset_id") or (str(meeting.asset_id) if meeting.asset_id else None)
        if action_asset_raw:
            try:
                action_asset_uuid = uuid.UUID(str(action_asset_raw))
            except ValueError:
                errors.append(f"Commitment {idx}: invalid asset_id '{action_asset_raw}'.")
                continue
            if not session.get(Asset, action_asset_uuid):
                errors.append(f"Commitment {idx}: asset '{action_asset_raw}' not found.")
                continue
        else:
            action_asset_uuid = None

        if not action_asset_uuid and existing_action and existing_action.asset_id:
            action_asset_uuid = existing_action.asset_id
        if existing_action and action_asset_uuid and existing_action.asset_id and existing_action.asset_id != action_asset_uuid:
            errors.append(
                f"Commitment {idx}: linked action asset '{existing_action.asset_id}' "
                f"does not match provided asset '{action_asset_uuid}'."
            )
            continue

        action_status = _normalize_status(commitment.get("status"))
        action = existing_action or ImprovementAction(
            asset_id=action_asset_uuid,
            source_document=f"MEETING:{meeting.id}",
            description=description,
            responsible=responsible,
        )
        action.asset_id = action_asset_uuid
        action.description = description
        action.responsible = responsible
        action.due_date = due_date
        action.status = action_status
        action.completion_date = today if _is_closed(action_status) else None

        session.add(action)
        session.flush()

        if not existing_action:
            created_actions += 1
        else:
            linked_actions += 1
        commitment["asset_id"] = str(action_asset_uuid) if action_asset_uuid else None
        commitment["action_id"] = str(action.id)
        commitment["status"] = action.status

    meeting.commitments_json = json.dumps(commitments, ensure_ascii=False)
    meeting.actions_last_sync_at = datetime.utcnow()
    meeting.updated_at = datetime.utcnow()
    session.add(meeting)
    session.commit()
    session.refresh(meeting)

    return MaterializeActionsResponse(
        meeting_id=meeting.id,
        created_actions=created_actions,
        linked_actions=linked_actions,
        errors_count=len(errors),
        errors=errors,
        commitments=_to_commitment_models(commitments),
        synced_at=meeting.actions_last_sync_at or datetime.utcnow(),
    )


@router.get("/records/{meeting_id}/comparison", response_model=MeetingComparisonResponse)
def compare_meeting_follow_up(
    meeting_id: uuid.UUID,
    previous_meeting_id: Optional[uuid.UUID] = Query(default=None),
    session: Session = Depends(get_session),
):
    meeting = session.get(EngineeringMeeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    previous: Optional[EngineeringMeeting]
    if previous_meeting_id:
        previous = session.get(EngineeringMeeting, previous_meeting_id)
    else:
        previous = session.exec(
            select(EngineeringMeeting)
            .where(EngineeringMeeting.meeting_date < meeting.meeting_date)
            .order_by(EngineeringMeeting.meeting_date.desc(), EngineeringMeeting.created_at.desc())
        ).first()

    if not previous:
        return MeetingComparisonResponse(meeting_id=meeting.id, previous_meeting_id=None)

    previous_commitments = _json_to_list(previous.commitments_json)
    current_commitments = _json_to_list(meeting.commitments_json)
    previous_map = {_commitment_key(item): item for item in previous_commitments}
    current_map = {_commitment_key(item): item for item in current_commitments}

    today = date.today()
    carried_over: List[CommitmentDelta] = []
    closed_since_last: List[CommitmentDelta] = []
    dropped_without_close: List[CommitmentDelta] = []
    new_commitments: List[CommitmentDelta] = []
    overdue_now: List[CommitmentDelta] = []

    for key, prev in previous_map.items():
        prev_status = _normalize_status(prev.get("status"))
        current = current_map.get(key)
        if current:
            current_status = _normalize_status(current.get("status"))
            delta = CommitmentDelta(
                description=str(current.get("description", prev.get("description", ""))),
                responsible=current.get("responsible") or prev.get("responsible"),
                due_date=_as_date(current.get("due_date") or prev.get("due_date")),
                previous_status=prev_status,
                current_status=current_status,
                action_id=current.get("action_id"),
            )
            if not _is_closed(prev_status) and not _is_closed(current_status):
                carried_over.append(delta)
            if not _is_closed(prev_status) and _is_closed(current_status):
                closed_since_last.append(delta)
        elif not _is_closed(prev_status):
            dropped_without_close.append(
                CommitmentDelta(
                    description=str(prev.get("description", "")),
                    responsible=prev.get("responsible"),
                    due_date=_as_date(prev.get("due_date")),
                    previous_status=prev_status,
                    current_status=None,
                    action_id=prev.get("action_id"),
                )
            )

    for key, current in current_map.items():
        current_status = _normalize_status(current.get("status"))
        if key not in previous_map:
            new_commitments.append(
                CommitmentDelta(
                    description=str(current.get("description", "")),
                    responsible=current.get("responsible"),
                    due_date=_as_date(current.get("due_date")),
                    previous_status=None,
                    current_status=current_status,
                    action_id=current.get("action_id"),
                )
            )
        due = _as_date(current.get("due_date"))
        if due and due < today and not _is_closed(current_status):
            overdue_now.append(
                CommitmentDelta(
                    description=str(current.get("description", "")),
                    responsible=current.get("responsible"),
                    due_date=due,
                    previous_status=previous_map.get(key, {}).get("status"),
                    current_status=current_status,
                    action_id=current.get("action_id"),
                )
            )

    return MeetingComparisonResponse(
        meeting_id=meeting.id,
        previous_meeting_id=previous.id,
        carried_over=carried_over,
        closed_since_last=closed_since_last,
        new_commitments=new_commitments,
        overdue_now=overdue_now,
        dropped_without_close=dropped_without_close,
    )


def _meeting_quality_summary(
    session: Session,
    asset_id: Optional[uuid.UUID] = None,
) -> Dict[str, int]:
    nc_stmt = select(NonConformity)
    capa_stmt = select(CapaAction)
    if asset_id:
        nc_stmt = nc_stmt.where(NonConformity.asset_id == asset_id)
        capa_stmt = capa_stmt.where(
            CapaAction.non_conformity_id.in_(
                select(NonConformity.id).where(NonConformity.asset_id == asset_id)
            )
        )

    non_conformities = session.exec(nc_stmt).all()
    capa_actions = session.exec(capa_stmt).all()
    today = date.today()
    nc_open = [row for row in non_conformities if _is_quality_open(row.status)]
    nc_critical = [row for row in nc_open if row.severity == "critical"]
    capa_open = [row for row in capa_actions if _is_quality_open(row.status)]
    capa_overdue = [row for row in capa_open if row.due_date and row.due_date < today]
    return {
        "quality_non_conformities_open": len(nc_open),
        "quality_non_conformities_critical": len(nc_critical),
        "quality_capa_open": len(capa_open),
        "quality_capa_overdue": len(capa_overdue),
    }


def _list_meeting_quality_issues(session: Session, asset_id: Optional[uuid.UUID]) -> List[MeetingQualityIssue]:
    nc_stmt = select(NonConformity)
    if asset_id:
        nc_stmt = nc_stmt.where(NonConformity.asset_id == asset_id)
    nc_rows = session.exec(nc_stmt).all()
    nc_map: Dict[uuid.UUID, NonConformity] = {row.id: row for row in nc_rows if row.id}

    capa_stmt = select(CapaAction)
    if asset_id and nc_map:
        capa_stmt = capa_stmt.where(CapaAction.non_conformity_id.in_(list(nc_map.keys())))
    if asset_id and not nc_map:
        capa_rows: List[CapaAction] = []
    else:
        capa_rows = session.exec(capa_stmt).all()

    issues: List[MeetingQualityIssue] = []
    for row in nc_rows:
        if not _is_quality_open(row.status):
            continue
        issues.append(
            MeetingQualityIssue(
                id=row.id,
                issue_type="non_conformity",
                non_conformity_id=row.id,
                title=row.title,
                status=row.status,
                severity=row.severity,
                due_date=None,
                responsible=None,
                source=row.source,
                created_at=row.created_at,
                action_id=None,
                asset_id=row.asset_id,
            )
        )

    for row in capa_rows:
        if not _is_quality_open(row.status):
            continue
        parent = nc_map.get(row.non_conformity_id)
        issues.append(
            MeetingQualityIssue(
                id=row.id,
                issue_type="capa_action",
                non_conformity_id=row.non_conformity_id,
                title=row.title,
                status=row.status,
                severity=parent.severity if parent else None,
                due_date=row.due_date,
                responsible=row.responsible,
                source="capa",
                created_at=row.created_at,
                action_id=row.improvement_action_id,
                asset_id=parent.asset_id if parent else None,
            )
        )

    issues.sort(key=lambda item: item.created_at, reverse=True)
    return issues


@router.get("/quality/issues", response_model=List[MeetingQualityIssue])
def meeting_quality_issues(
    asset_id: Optional[uuid.UUID] = Query(default=None),
    session: Session = Depends(get_session),
):
    return _list_meeting_quality_issues(session=session, asset_id=asset_id)


@router.post("/records/{meeting_id}/sync-quality-commitments", response_model=SyncQualityCommitmentsResponse)
def sync_quality_commitments(
    meeting_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    meeting = session.get(EngineeringMeeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    issues = _list_meeting_quality_issues(session=session, asset_id=meeting.asset_id)
    commitments = _json_to_list(meeting.commitments_json)
    existing_keys = {_commitment_key(item): item for item in commitments}
    created = 0
    linked = 0
    fallback_due = date.today()

    for issue in issues:
        source_key = f"QUALITY:{issue.issue_type}:{issue.id}"
        description = f"[{issue.issue_type}] {issue.title}".strip()
        due_date = issue.due_date or fallback_due
        commitment = {
            "description": description,
            "responsible": issue.responsible or "Pendiente",
            "due_date": due_date.isoformat(),
            "status": _normalize_status(issue.status),
            "asset_id": str(meeting.asset_id) if meeting.asset_id else None,
            "area": "Quality",
            "priority": "High" if issue.severity in {"high", "critical"} else "Medium",
            "action_id": str(issue.action_id) if issue.action_id else None,
            "source_key": source_key,
            "synced_by": user.username,
            "synced_at": datetime.utcnow().isoformat(),
        }

        key = _commitment_key(commitment)
        if key in existing_keys:
            target = existing_keys[key]
            if commitment.get("action_id"):
                target["action_id"] = commitment["action_id"]
            target["status"] = commitment["status"]
            if commitment.get("due_date"):
                target["due_date"] = commitment["due_date"]
            target["source_key"] = source_key
            target["synced_at"] = commitment["synced_at"]
            linked += 1
            continue

        commitments.append(commitment)
        existing_keys[key] = commitment
        created += 1

    meeting.commitments_json = json.dumps(commitments, ensure_ascii=False)
    meeting.updated_at = datetime.utcnow()
    session.add(meeting)
    session.commit()

    return SyncQualityCommitmentsResponse(
        meeting_id=meeting.id,
        created_commitments=created,
        linked_existing=linked,
        total_commitments=len(commitments),
    )


@router.get("/dashboard", response_model=MeetingDashboardResponse)
def meeting_dashboard(session: Session = Depends(get_session)):
    meetings = session.exec(select(EngineeringMeeting)).all()
    today = date.today()
    horizon = today.fromordinal(today.toordinal() - 30)
    meetings_last_30d = sum(1 for m in meetings if m.meeting_date >= horizon)
    meetings_open = sum(1 for m in meetings if not _is_closed(m.status))

    commitments_open = 0
    commitments_closed = 0
    commitments_overdue = 0
    linked_actions = 0
    for meeting in meetings:
        for commitment in _to_commitment_models(_json_to_list(meeting.commitments_json)):
            if commitment.action_id:
                linked_actions += 1
            if _is_closed(commitment.status):
                commitments_closed += 1
            else:
                commitments_open += 1
                if commitment.due_date and commitment.due_date < today:
                    commitments_overdue += 1

    next_meeting = session.exec(
        select(EngineeringMeeting)
        .where(EngineeringMeeting.next_meeting_date != None)  # noqa: E711
        .where(EngineeringMeeting.next_meeting_date >= today)
        .order_by(EngineeringMeeting.next_meeting_date.asc())
    ).first()
    kpi_summary = _kpi_mc_dashboard_summary(session)
    quality_summary = _meeting_quality_summary(session=session)

    return MeetingDashboardResponse(
        meetings_last_30d=meetings_last_30d,
        meetings_open=meetings_open,
        commitments_open=commitments_open,
        commitments_overdue=commitments_overdue,
        commitments_closed=commitments_closed,
        linked_actions=linked_actions,
        next_meeting_date=next_meeting.next_meeting_date if next_meeting else None,
        next_meeting_title=next_meeting.title if next_meeting else None,
        kpi_mc_period=kpi_summary["period"],
        kpi_mc_completion_rate_pct=kpi_summary["completion_rate_pct"],
        kpi_mc_weighted_kpi_result_pct=kpi_summary["weighted_kpi_result_pct"],
        kpi_mc_red_items=kpi_summary["red_items"],
        kpi_mc_previous_period=kpi_summary["previous_period"],
        kpi_mc_previous_weighted_kpi_result_pct=kpi_summary["previous_weighted_kpi_result_pct"],
        kpi_mc_weighted_kpi_result_delta_pct=kpi_summary["weighted_kpi_result_delta_pct"],
        kpi_mc_completion_rate_delta_pct=kpi_summary["completion_rate_delta_pct"],
        kpi_mc_red_items_delta=kpi_summary["red_items_delta"],
        kpi_mc_target_pct=kpi_summary["kpi_mc_target_pct"],
        kpi_mc_gap_to_target_pct=kpi_summary["kpi_mc_gap_to_target_pct"],
        kpi_mc_trend_alert_level=kpi_summary["kpi_mc_trend_alert_level"],
        kpi_mc_trend_alert_message=kpi_summary["kpi_mc_trend_alert_message"],
        kpi_mc_trend_recommended_action=kpi_summary["kpi_mc_trend_recommended_action"],
        quality_non_conformities_open=quality_summary["quality_non_conformities_open"],
        quality_non_conformities_critical=quality_summary["quality_non_conformities_critical"],
        quality_capa_open=quality_summary["quality_capa_open"],
        quality_capa_overdue=quality_summary["quality_capa_overdue"],
    )


@router.post("/import/heuristic", response_model=HeuristicImportResponse)
def heuristic_import(payload: HeuristicImportRequest):
    text = payload.raw_text.replace("\x0c", "\n")
    lines = [line.strip() for line in text.splitlines() if line.strip()]
    upper_lines = [line.upper() for line in lines]
    warnings: List[str] = []

    first_date = next((line for line in lines if " de " in line and re.search(r"\d{1,2}\s+de\s+", line)), "")
    meeting_date = _parse_spanish_date(first_date) or date.today()

    next_meeting_line = ""
    for idx, up in enumerate(upper_lines):
        if "PROXIMA REUNION" in _strip_accents(up):
            for nxt in lines[idx + 1 : idx + 5]:
                if "Fecha" in nxt or "fecha" in nxt:
                    next_meeting_line = nxt
                    break
            break
    next_meeting_date = _parse_spanish_date(next_meeting_line)

    title = payload.default_title or "Acta de Ingenieria de Procesos"
    for idx, up in enumerate(upper_lines):
        if "TITULO DE LA" in _strip_accents(up):
            if idx + 1 < len(lines):
                title = lines[idx + 1]
            break

    objective = None
    for idx, up in enumerate(upper_lines):
        if _strip_accents(up).startswith("OBJETIVO"):
            objective_parts: List[str] = []
            for nxt in lines[idx : idx + 5]:
                if _strip_accents(nxt.upper()).startswith("ASISTENTES"):
                    break
                if "OBJETIVO" in _strip_accents(nxt.upper()):
                    maybe = nxt.split("Objetivo")[-1].strip(": ").strip()
                    if maybe:
                        objective_parts.append(maybe)
                else:
                    objective_parts.append(nxt)
            objective = " ".join(objective_parts).strip()
            break

    location = None
    for line in lines:
        if _strip_accents(line.upper()).startswith("LUGAR"):
            location = line.split("Lugar")[-1].strip(": ").strip()
            break

    start_time = None
    end_time = None
    for idx, up in enumerate(upper_lines):
        normalized = _strip_accents(up)
        if normalized.startswith("HORA DE") and idx + 1 < len(lines):
            candidate = lines[idx + 1]
            if "INICIO" in normalized:
                start_time = candidate
            if "FINALIZACION" in normalized:
                end_time = candidate

    agenda: List[MeetingAgendaItem] = []
    if "ORDEN DEL DIA" in " ".join(_strip_accents(u) for u in upper_lines):
        collect = False
        for line in lines:
            normalized = _strip_accents(line.upper())
            if "ORDEN DEL DIA" in normalized:
                collect = True
                continue
            if (
                "DESARROLLO" in normalized
                or "FOCOS PRINCIPALES DE LA SEMANA" in normalized
                or "COMPROMISOS PARA LA PROXIMA SEMANA" in normalized
                or "PROXIMA REUNION" in normalized
            ):
                break
            if collect:
                match = re.match(r"^\s*(\d+)[\.\)]\s+(.*)$", line)
                if match:
                    agenda.append(MeetingAgendaItem(order=int(match.group(1)), title=match.group(2).strip()))

    commitments: List[MeetingCommitmentItem] = []
    if "COMPROMISOS PARA LA PROXIMA SEMANA" in " ".join(_strip_accents(u) for u in upper_lines):
        collect = False
        for line in lines:
            normalized = _strip_accents(line.upper())
            if "COMPROMISOS PARA LA PROXIMA SEMANA" in normalized:
                collect = True
                continue
            if "PROXIMA REUNION" in normalized:
                break
            if collect:
                match = re.match(r"^\s*(\d+)[\.\)]\s+(.*)$", line)
                if not match:
                    continue
                body = match.group(2).strip()
                if ":" in body:
                    responsible, description = body.split(":", 1)
                    commitments.append(
                        MeetingCommitmentItem(
                            description=description.strip(),
                            responsible=responsible.strip(),
                            status="Open",
                        )
                    )
                else:
                    commitments.append(MeetingCommitmentItem(description=body, responsible="Pendiente", status="Open"))

    focuses: List[MeetingFocusItem] = []
    if "FOCOS PRINCIPALES DE LA SEMANA" in " ".join(_strip_accents(u) for u in upper_lines):
        collect = False
        for line in lines:
            normalized = _strip_accents(line.upper())
            if "FOCOS PRINCIPALES DE LA SEMANA" in normalized:
                collect = True
                continue
            if "COMPROMISOS PARA LA PROXIMA SEMANA" in normalized:
                break
            if collect:
                match = re.match(r"^\s*(\d+)\s+(.*)$", line)
                if not match:
                    continue
                body = match.group(2).strip()
                split = re.split(r"\s{2,}", body)
                focus = split[0].strip() if split else body
                responsible = split[-1].strip() if len(split) > 1 else None
                focuses.append(MeetingFocusItem(focus=focus, responsible=responsible))

    participants: List[MeetingParticipant] = []
    for idx, up in enumerate(upper_lines):
        if _strip_accents(up).startswith("ASISTENTES"):
            attendee_lines = []
            for nxt in lines[idx : idx + 8]:
                norm_next = _strip_accents(nxt.upper())
                if norm_next.startswith("INVITADOS") or norm_next.startswith("AUSENTES"):
                    break
                attendee_lines.append(nxt)
            attendee_text = " ".join(attendee_lines)
            attendee_text = attendee_text.replace("Asistentes", "").strip(": ")
            for token in [chunk.strip() for chunk in attendee_text.split(",") if chunk.strip()]:
                role = None
                name = token
                if "(" in token and token.endswith(")"):
                    name, role_part = token.rsplit("(", 1)
                    role = role_part[:-1].strip()
                    name = name.strip()
                participants.append(MeetingParticipant(name=name, role=role, attendance="Asistente"))
            break

    if not agenda:
        warnings.append("No agenda items were detected in raw text.")
    if not commitments:
        warnings.append("No commitments were detected in raw text.")
    if not objective:
        warnings.append("No objective was detected in raw text.")

    draft = MeetingCreate(
        asset_id=payload.asset_id,
        title=title,
        meeting_date=meeting_date,
        start_time=start_time,
        end_time=end_time,
        location=location,
        objective=objective,
        scope=None,
        out_of_scope=None,
        risks=None,
        key_decisions=None,
        notes=None,
        next_meeting_date=next_meeting_date,
        status="Draft",
        source_module="meetings",
        participants=participants,
        agenda=agenda,
        kpis=[],
        focuses=focuses,
        commitments=commitments,
    )

    return HeuristicImportResponse(draft=draft, warnings=warnings)
