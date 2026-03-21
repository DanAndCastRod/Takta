from datetime import date, datetime
from typing import Dict, List, Optional
import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field as PydanticField
from sqlmodel import Session, select

from ..core.auth import CurrentUser, get_current_user, require_role
from ..db import get_session
from ..models import (
    ActionWorkflow,
    Asset,
    ContinuousImprovementKpiDefinition,
    ContinuousImprovementKpiMeasurement,
    ImprovementAction,
)


router = APIRouter(
    prefix="/api/ci",
    tags=["Continuous Improvement"],
    dependencies=[Depends(get_current_user)],
)


DEFAULT_MC_KPI_CATALOG = [
    {
        "code": "MC-GV-01",
        "focus_area": "Generación de Valor al Cliente e Impacto Positivo",
        "action_line": "Cumplimiento de actividades MC por planta - Estandarización de procesos",
        "indicator_name": "Operarios especialistas",
        "initiative_name": "Operarios especialistas",
        "individual_weight_pct": 10,
        "kpi_weight_pct": 10,
        "kpi_weight_defined": True,
        "unit": "%",
    },
    {
        "code": "MC-GV-02",
        "focus_area": "Generación de Valor al Cliente e Impacto Positivo",
        "action_line": "Cumplimiento de actividades MC por planta - Estandarización de procesos",
        "indicator_name": "Inventarios túneles",
        "initiative_name": "Inventarios túneles",
        "individual_weight_pct": 5,
        "kpi_weight_pct": 5,
        "kpi_weight_defined": True,
        "unit": "%",
        "notes": "Participación KPI pendiente de asignación explícita en fuente.",
    },
    {
        "code": "MC-GV-03",
        "focus_area": "Generación de Valor al Cliente e Impacto Positivo",
        "action_line": "Cumplimiento plan de desarrollo Lean por planta",
        "indicator_name": "Capacitación 5S y Standard Work",
        "initiative_name": "Capacitación 5S y Standard Work",
        "individual_weight_pct": 5,
        "kpi_weight_pct": 5,
        "kpi_weight_defined": True,
        "unit": "%",
    },
    {
        "code": "MC-GV-04",
        "focus_area": "Generación de Valor al Cliente e Impacto Positivo",
        "action_line": "Cumplimiento plan de desarrollo del equipo MC",
        "indicator_name": "Plan de formación consolidada equipo MC",
        "initiative_name": "Plan de formación consolidada equipo MC",
        "individual_weight_pct": 5,
        "kpi_weight_pct": 5,
        "kpi_weight_defined": True,
        "unit": "%",
    },
    {
        "code": "MC-SST-01",
        "focus_area": "Meta Corporativa SST",
        "action_line": "Cumplimiento meta corporativa SST",
        "indicator_name": "Meta corporativa SST",
        "initiative_name": "Meta corporativa SST",
        "individual_weight_pct": 10,
        "kpi_weight_pct": 10,
        "kpi_weight_defined": True,
        "unit": "%",
    },
    {
        "code": "MC-PI-01",
        "focus_area": "Planeación Integral",
        "action_line": "Estandarización Lean - Valor Agregado",
        "indicator_name": "Implementación 5S en VA",
        "initiative_name": "Implementación 5S en VA",
        "individual_weight_pct": 20,
        "kpi_weight_pct": 20,
        "kpi_weight_defined": True,
        "unit": "%",
    },
    {
        "code": "MC-PI-02",
        "focus_area": "Planeación Integral",
        "action_line": "Estandarización Lean - Valor Agregado",
        "indicator_name": "Estructuración metodología Standard Work",
        "initiative_name": "Estructuración metodología Standard Work",
        "individual_weight_pct": 10,
        "kpi_weight_pct": 10,
        "kpi_weight_defined": True,
        "unit": "%",
        "notes": "Participación KPI pendiente de asignación explícita en fuente.",
    },
    {
        "code": "MC-EO-01",
        "focus_area": "Excelencia Operacional",
        "action_line": "Cumplimiento de la merma consolidada",
        "indicator_name": "Cumplimiento de la merma consolidada",
        "initiative_name": "Cumplimiento de la merma consolidada",
        "individual_weight_pct": 5,
        "kpi_weight_pct": 5,
        "kpi_weight_defined": True,
        "unit": "%",
    },
    {
        "code": "MC-EO-02",
        "focus_area": "Excelencia Operacional",
        "action_line": "Proyectos de reducción sobrepeso (Filetes/D1/VA)",
        "indicator_name": "Plan de control de peso en referencias críticas",
        "initiative_name": "Plan de control de peso en referencias críticas",
        "individual_weight_pct": 10,
        "kpi_weight_pct": 10,
        "kpi_weight_defined": True,
        "unit": "%",
        "notes": "Participación KPI pendiente de asignación explícita en fuente.",
    },
    {
        "code": "MC-EO-03",
        "focus_area": "Excelencia Operacional",
        "action_line": "Mapeo productivo y merma - rendimiento filetes",
        "indicator_name": "Medición variables de proceso",
        "initiative_name": "Medición variables de proceso",
        "individual_weight_pct": 10,
        "kpi_weight_pct": 10,
        "kpi_weight_defined": True,
        "unit": "%",
        "notes": "Participación KPI pendiente de asignación explícita en fuente.",
    },
    {
        "code": "MC-EF-01",
        "focus_area": "Eficiencia Financiera",
        "action_line": "Cumplimiento presupuesto financiero",
        "indicator_name": "Cumplimiento presupuesto financiero",
        "initiative_name": "Cumplimiento presupuesto financiero",
        "individual_weight_pct": 5,
        "kpi_weight_pct": 5,
        "kpi_weight_defined": True,
        "unit": "%",
    },
    {
        "code": "MC-MC-01",
        "focus_area": "Mejora Continua",
        "action_line": "Estructuración de proyectos ROI",
        "indicator_name": "Diseño, implementación y seguimiento",
        "initiative_name": "Diseño, implementación y seguimiento",
        "individual_weight_pct": 5,
        "kpi_weight_pct": 5,
        "kpi_weight_defined": True,
        "unit": "%",
    },
]


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


class ActionCreate(BaseModel):
    asset_id: Optional[uuid.UUID] = None
    source_document: str
    description: str
    responsible: str
    due_date: Optional[date] = None
    status: str = "Open"


class ActionUpdate(BaseModel):
    description: Optional[str] = None
    responsible: Optional[str] = None
    due_date: Optional[date] = None
    status: Optional[str] = None
    completion_date: Optional[date] = None


class ActionRead(BaseModel):
    id: uuid.UUID
    asset_id: Optional[uuid.UUID] = None
    asset_name: Optional[str] = None
    source_document: str
    description: str
    responsible: str
    due_date: Optional[date] = None
    status: str
    completion_date: Optional[date] = None


class McKpiDefinitionRead(BaseModel):
    id: uuid.UUID
    code: str
    focus_area: str
    action_line: str
    indicator_name: str
    initiative_name: Optional[str] = None
    individual_weight_pct: float
    kpi_weight_pct: float
    kpi_weight_defined: bool
    unit: str
    notes: Optional[str] = None
    is_active: bool
    updated_at: datetime


class McKpiDefinitionUpdate(BaseModel):
    focus_area: Optional[str] = None
    action_line: Optional[str] = None
    indicator_name: Optional[str] = None
    initiative_name: Optional[str] = None
    individual_weight_pct: Optional[float] = PydanticField(default=None, ge=0, le=100)
    kpi_weight_pct: Optional[float] = PydanticField(default=None, ge=0, le=100)
    kpi_weight_defined: Optional[bool] = None
    unit: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None


class McKpiMeasurementUpsert(BaseModel):
    kpi_definition_id: uuid.UUID
    period: Optional[str] = None
    target_value: Optional[float] = None
    actual_value: Optional[float] = None
    compliance_pct: Optional[float] = PydanticField(default=None, ge=0, le=200)
    notes: Optional[str] = None
    source: Optional[str] = None


class McKpiMeasurementRead(BaseModel):
    id: uuid.UUID
    kpi_definition_id: uuid.UUID
    code: str
    indicator_name: str
    period: str
    target_value: Optional[float] = None
    actual_value: Optional[float] = None
    compliance_pct: float
    status_color: str
    notes: Optional[str] = None
    source: str
    updated_at: datetime


class McKpiSeedResponse(BaseModel):
    created: int
    updated: int
    total: int


class McKpiClosePendingWeightsResponse(BaseModel):
    updated: int
    total_items: int
    total_weight_pct: float


def _map_action(session: Session, action: ImprovementAction) -> ActionRead:
    asset = session.get(Asset, action.asset_id) if action.asset_id else None
    return ActionRead(
        id=action.id,
        asset_id=action.asset_id,
        asset_name=asset.name if asset else None,
        source_document=action.source_document,
        description=action.description,
        responsible=action.responsible,
        due_date=action.due_date,
        status=action.status,
        completion_date=action.completion_date,
    )


def _normalize_period_key(raw: Optional[str]) -> str:
    if not raw:
        return datetime.utcnow().strftime("%Y-%m")
    value = raw.strip()
    if re.fullmatch(r"\d{4}-\d{2}", value):
        return value
    raise HTTPException(status_code=400, detail="Invalid period format. Use YYYY-MM.")


def _period_to_year_month(period_key: str) -> tuple[int, int]:
    if not re.fullmatch(r"\d{4}-\d{2}", period_key):
        raise HTTPException(status_code=400, detail="Invalid period format. Use YYYY-MM.")
    year = int(period_key[:4])
    month = int(period_key[5:7])
    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Invalid period month. Use YYYY-MM.")
    return year, month


def _shift_period_key(period_key: str, months_delta: int) -> str:
    year, month = _period_to_year_month(period_key)
    month_index = (year * 12 + (month - 1)) + months_delta
    shifted_year, shifted_month_base = divmod(month_index, 12)
    return f"{shifted_year:04d}-{shifted_month_base + 1:02d}"


def _status_color_from_compliance(compliance_pct: float) -> str:
    if compliance_pct >= 95:
        return "green"
    if compliance_pct >= 80:
        return "yellow"
    return "red"


def _ensure_default_mc_catalog(session: Session) -> Dict[str, int]:
    created = 0
    updated = 0
    now = datetime.utcnow()
    for template in DEFAULT_MC_KPI_CATALOG:
        existing = session.exec(
            select(ContinuousImprovementKpiDefinition).where(
                ContinuousImprovementKpiDefinition.code == template["code"]
            )
        ).first()
        if existing:
            for key, value in template.items():
                setattr(existing, key, value)
            existing.updated_at = now
            session.add(existing)
            updated += 1
            continue
        row = ContinuousImprovementKpiDefinition(
            **template,
            created_by="system",
            created_at=now,
            updated_at=now,
        )
        session.add(row)
        created += 1
    if created or updated:
        session.commit()
    return {"created": created, "updated": updated, "total": len(DEFAULT_MC_KPI_CATALOG)}


def _close_pending_mc_kpi_weights(session: Session) -> McKpiClosePendingWeightsResponse:
    rows = session.exec(select(ContinuousImprovementKpiDefinition)).all()
    updated = 0
    now = datetime.utcnow()
    for row in rows:
        official_weight = OFFICIAL_MC_KPI_WEIGHTS.get(row.code)
        if official_weight is None:
            continue
        should_update = (
            (not row.kpi_weight_defined)
            or float(row.kpi_weight_pct or 0) != float(official_weight)
            or bool(row.notes and "pendiente" in row.notes.lower())
        )
        if not should_update:
            continue
        row.kpi_weight_pct = float(official_weight)
        row.kpi_weight_defined = True
        row.updated_at = now
        if row.notes and "pendiente" in row.notes.lower():
            row.notes = "Peso KPI normalizado con matriz oficial MC 2026."
        session.add(row)
        updated += 1
    if updated:
        session.commit()

    total_weight = sum(float(row.kpi_weight_pct or 0) for row in rows if row.is_active)
    return McKpiClosePendingWeightsResponse(
        updated=updated,
        total_items=len(rows),
        total_weight_pct=round(total_weight, 2),
    )


def _ensure_action_workflow(session: Session, action_id: uuid.UUID) -> ActionWorkflow:
    workflow = session.exec(
        select(ActionWorkflow).where(ActionWorkflow.action_id == action_id)
    ).first()
    if workflow:
        return workflow
    workflow = ActionWorkflow(action_id=action_id, workflow_status="Open")
    session.add(workflow)
    session.flush()
    return workflow


def _open_workflow_after_reopen(
    workflow: ActionWorkflow,
    reason: str,
) -> None:
    workflow.workflow_status = "Open"
    workflow.close_requested_at = None
    workflow.close_requested_by = None
    workflow.approved_at = None
    workflow.approved_by = None
    workflow.verified_at = None
    workflow.verified_by = None
    workflow.verification_notes = reason
    workflow.evidence_photo_data = None


def _auto_verify_workflow_for_kpi_recovery(
    workflow: ActionWorkflow,
    period_key: str,
    code: str,
    compliance_pct: float,
) -> None:
    actor = "system-kpi"
    now = datetime.utcnow()
    note = (
        f"[KPI MC] Cierre automático por recuperación "
        f"{code} ({period_key}) a {compliance_pct:.1f}%."
    )
    workflow.workflow_status = "Verified"
    workflow.close_requested_at = workflow.close_requested_at or now
    workflow.close_requested_by = workflow.close_requested_by or actor
    workflow.approved_at = workflow.approved_at or now
    workflow.approved_by = workflow.approved_by or actor
    workflow.verified_at = now
    workflow.verified_by = actor
    workflow.verification_notes = note


def _sync_kpi_deviation_action(
    session: Session,
    definition: ContinuousImprovementKpiDefinition,
    period_key: str,
    compliance_pct: float,
    username: str,
) -> Optional[ImprovementAction]:
    source_document = f"KPI_MC:{period_key}:{definition.code}"
    existing = session.exec(
        select(ImprovementAction).where(ImprovementAction.source_document == source_document)
    ).first()

    # Critical deviation: create/open an action.
    if compliance_pct < 80:
        if existing:
            workflow = _ensure_action_workflow(session, existing.id)
            if existing.status in {"Closed", "Verified"} or workflow.workflow_status in {
                "CloseRequested",
                "Approved",
                "Verified",
            }:
                existing.status = "Open"
                existing.completion_date = None
                existing.due_date = date.today().fromordinal(date.today().toordinal() + 7)
                session.add(existing)
                _open_workflow_after_reopen(
                    workflow=workflow,
                    reason=(
                        f"[KPI MC] Reapertura automática por desviación crítica "
                        f"{definition.code} ({period_key}) a {compliance_pct:.1f}%."
                    ),
                )
                session.add(workflow)
            return existing

        action = ImprovementAction(
            asset_id=None,
            source_document=source_document,
            description=(
                f"[KPI MC] Desviación crítica {definition.code} - "
                f"{definition.indicator_name} ({compliance_pct:.1f}%)."
            ),
            responsible=username,
            due_date=date.today().fromordinal(date.today().toordinal() + 7),
            status="Open",
            completion_date=None,
        )
        session.add(action)
        session.flush()
        workflow = _ensure_action_workflow(session, action.id)
        _open_workflow_after_reopen(
            workflow=workflow,
            reason=(
                f"[KPI MC] Acción automática por desviación crítica "
                f"{definition.code} ({period_key}) a {compliance_pct:.1f}%."
            ),
        )
        session.add(workflow)
        return action

    # Recovery threshold: auto-advance workflow to verified.
    if compliance_pct >= 95 and existing and existing.status in {"Open", "In Progress", "Closed"}:
        workflow = _ensure_action_workflow(session, existing.id)
        _auto_verify_workflow_for_kpi_recovery(
            workflow=workflow,
            period_key=period_key,
            code=definition.code,
            compliance_pct=compliance_pct,
        )
        existing.status = "Verified"
        existing.completion_date = date.today()
        session.add(existing)
        session.add(workflow)
        return existing

    return existing


def _definition_to_read(row: ContinuousImprovementKpiDefinition) -> McKpiDefinitionRead:
    return McKpiDefinitionRead(
        id=row.id,
        code=row.code,
        focus_area=row.focus_area,
        action_line=row.action_line,
        indicator_name=row.indicator_name,
        initiative_name=row.initiative_name,
        individual_weight_pct=float(row.individual_weight_pct or 0),
        kpi_weight_pct=float(row.kpi_weight_pct or 0),
        kpi_weight_defined=bool(row.kpi_weight_defined),
        unit=row.unit or "%",
        notes=row.notes,
        is_active=row.is_active,
        updated_at=row.updated_at,
    )


def _build_mc_kpi_scorecard_payload(
    definitions: List[ContinuousImprovementKpiDefinition],
    measurement_by_kpi: Dict[uuid.UUID, ContinuousImprovementKpiMeasurement],
    period_key: str,
) -> Dict[str, object]:
    items = []
    measured_count = 0
    individual_weight_total = 0.0
    kpi_weight_total = 0.0
    weighted_individual_result = 0.0
    weighted_kpi_result = 0.0

    grouped: Dict[str, Dict[str, float]] = {}
    status_counts = {"green": 0, "yellow": 0, "red": 0}
    for definition in sorted(
        definitions,
        key=lambda row: (row.focus_area.lower(), row.action_line.lower(), row.code.lower()),
    ):
        measurement = measurement_by_kpi.get(definition.id)
        compliance = float(measurement.compliance_pct) if measurement else 0.0
        if measurement:
            measured_count += 1

        item_individual_weight = float(definition.individual_weight_pct or 0)
        item_kpi_weight = float(definition.kpi_weight_pct or 0)
        item_individual_result = (compliance / 100.0) * item_individual_weight
        item_kpi_result = (compliance / 100.0) * item_kpi_weight

        individual_weight_total += item_individual_weight
        kpi_weight_total += item_kpi_weight
        weighted_individual_result += item_individual_result
        weighted_kpi_result += item_kpi_result

        group = grouped.setdefault(
            definition.focus_area,
            {
                "focus_area": definition.focus_area,
                "individual_weight_total": 0.0,
                "kpi_weight_total": 0.0,
                "weighted_individual_result": 0.0,
                "weighted_kpi_result": 0.0,
                "items_count": 0,
            },
        )
        group["individual_weight_total"] += item_individual_weight
        group["kpi_weight_total"] += item_kpi_weight
        group["weighted_individual_result"] += item_individual_result
        group["weighted_kpi_result"] += item_kpi_result
        group["items_count"] += 1

        status_color = measurement.status_color if measurement else "red"
        if measurement:
            if status_color not in status_counts:
                status_color = _status_color_from_compliance(compliance)
            status_counts[status_color] += 1

        items.append(
            {
                "id": str(definition.id),
                "code": definition.code,
                "focus_area": definition.focus_area,
                "action_line": definition.action_line,
                "indicator_name": definition.indicator_name,
                "initiative_name": definition.initiative_name,
                "individual_weight_pct": item_individual_weight,
                "kpi_weight_pct": item_kpi_weight,
                "kpi_weight_defined": bool(definition.kpi_weight_defined),
                "unit": definition.unit,
                "period": period_key,
                "target_value": measurement.target_value if measurement else None,
                "actual_value": measurement.actual_value if measurement else None,
                "compliance_pct": round(compliance, 2),
                "status_color": status_color,
                "individual_contribution_pct": round(item_individual_result, 2),
                "kpi_contribution_pct": round(item_kpi_result, 2),
                "has_measurement": bool(measurement),
                "notes": measurement.notes if measurement else definition.notes,
            }
        )

    total_items = len(definitions)
    completion_rate = (measured_count / total_items * 100) if total_items else 0
    missing_kpi_weight = sum(
        float(row.kpi_weight_pct or 0)
        for row in definitions
        if not row.kpi_weight_defined
    )

    categories = [
        {
            **row,
            "individual_weight_total": round(row["individual_weight_total"], 2),
            "kpi_weight_total": round(row["kpi_weight_total"], 2),
            "weighted_individual_result": round(row["weighted_individual_result"], 2),
            "weighted_kpi_result": round(row["weighted_kpi_result"], 2),
        }
        for _, row in sorted(grouped.items(), key=lambda item: item[0].lower())
    ]

    return {
        "period": period_key,
        "totals": {
            "items_total": total_items,
            "items_with_measurement": measured_count,
            "completion_rate_pct": round(completion_rate, 1),
            "individual_weight_total": round(individual_weight_total, 2),
            "kpi_weight_total": round(kpi_weight_total, 2),
            "weighted_individual_result_pct": round(weighted_individual_result, 2),
            "weighted_kpi_result_pct": round(weighted_kpi_result, 2),
            "missing_kpi_weight_total": round(missing_kpi_weight, 2),
            "has_pending_kpi_weights": bool(missing_kpi_weight > 0),
        },
        "status_counts": status_counts,
        "categories": categories,
        "items": items,
    }


def _build_mc_kpi_trend_alert(latest: Dict[str, object], previous: Optional[Dict[str, object]]) -> Dict[str, object]:
    if not previous:
        return {
            "level": "none",
            "message": "Sin histórico suficiente para evaluar tendencia.",
            "recommended_action": "Completar al menos dos periodos para activar alertas.",
        }

    latest_weighted = float(latest.get("weighted_kpi_result_pct") or 0)
    latest_completion = float(latest.get("completion_rate_pct") or 0)
    latest_red = int(latest.get("red_items") or 0)

    previous_weighted = float(previous.get("weighted_kpi_result_pct") or 0)
    previous_completion = float(previous.get("completion_rate_pct") or 0)
    previous_red = int(previous.get("red_items") or 0)

    delta_weighted = latest_weighted - previous_weighted
    delta_completion = latest_completion - previous_completion
    red_delta = latest_red - previous_red

    if latest_weighted < 80 or latest_red >= 3:
        return {
            "level": "critical",
            "message": "Desempeño KPI MC crítico por brecha de resultado o exceso de ítems rojos.",
            "recommended_action": "Ejecutar comité de contención y plan CAPA inmediato.",
            "weighted_delta_pct": round(delta_weighted, 2),
            "completion_delta_pct": round(delta_completion, 2),
            "red_items_delta": red_delta,
        }
    if delta_weighted <= -3 or delta_completion <= -10 or red_delta > 0:
        return {
            "level": "risk",
            "message": "Tendencia KPI MC en deterioro frente al período anterior.",
            "recommended_action": "Reforzar acciones de recuperación y seguimiento semanal.",
            "weighted_delta_pct": round(delta_weighted, 2),
            "completion_delta_pct": round(delta_completion, 2),
            "red_items_delta": red_delta,
        }
    if latest_weighted < 95 or delta_weighted < 0:
        return {
            "level": "watch",
            "message": "Tendencia estable pero por debajo de meta objetivo.",
            "recommended_action": "Mantener monitoreo y cerrar acciones abiertas del período.",
            "weighted_delta_pct": round(delta_weighted, 2),
            "completion_delta_pct": round(delta_completion, 2),
            "red_items_delta": red_delta,
        }
    return {
        "level": "healthy",
        "message": "Tendencia KPI MC saludable.",
        "recommended_action": "Sostener prácticas efectivas y documentar lecciones aprendidas.",
        "weighted_delta_pct": round(delta_weighted, 2),
        "completion_delta_pct": round(delta_completion, 2),
        "red_items_delta": red_delta,
    }


@router.post("/actions", response_model=ActionRead)
def create_action(
    payload: ActionCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    if payload.asset_id and not session.get(Asset, payload.asset_id):
        raise HTTPException(status_code=404, detail="Asset not found")

    action = ImprovementAction(
        asset_id=payload.asset_id,
        source_document=payload.source_document,
        description=payload.description,
        responsible=payload.responsible,
        due_date=payload.due_date,
        status=payload.status,
    )
    session.add(action)
    session.commit()
    session.refresh(action)
    return _map_action(session, action)


@router.get("/actions", response_model=List[ActionRead])
def read_actions(
    status: Optional[str] = None,
    asset_id: Optional[uuid.UUID] = None,
    source_document: Optional[str] = None,
    source_prefix: Optional[str] = None,
    session: Session = Depends(get_session),
):
    query = select(ImprovementAction)
    if status:
        query = query.where(ImprovementAction.status == status)
    if asset_id:
        query = query.where(ImprovementAction.asset_id == asset_id)
    if source_document:
        query = query.where(ImprovementAction.source_document == source_document)
    if source_prefix:
        query = query.where(ImprovementAction.source_document.like(f"{source_prefix}%"))
    actions = session.exec(query).all()
    return [_map_action(session, action) for action in actions]


@router.patch("/actions/{action_id}", response_model=ActionRead)
def update_action(
    action_id: uuid.UUID,
    payload: ActionUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    action = session.get(ImprovementAction, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(action, key, value)

    if action.status.lower() == "closed" and not action.completion_date:
        action.completion_date = date.today()

    session.add(action)
    session.commit()
    session.refresh(action)
    return _map_action(session, action)


@router.delete("/actions/{action_id}", status_code=204)
def delete_action(
    action_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    action = session.get(ImprovementAction, action_id)
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    session.delete(action)
    session.commit()


@router.post("/kpis/mc/catalog/seed", response_model=McKpiSeedResponse)
def seed_mc_kpi_catalog(
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    return McKpiSeedResponse(**_ensure_default_mc_catalog(session))


@router.post("/kpis/mc/catalog/close-pending-weights", response_model=McKpiClosePendingWeightsResponse)
def close_pending_mc_kpi_weights(
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    if not session.exec(select(ContinuousImprovementKpiDefinition)).all():
        _ensure_default_mc_catalog(session)
    return _close_pending_mc_kpi_weights(session)


@router.get("/kpis/mc/catalog", response_model=List[McKpiDefinitionRead])
def list_mc_kpi_catalog(
    include_inactive: bool = False,
    seed_if_empty: bool = True,
    normalize_weights: bool = True,
    session: Session = Depends(get_session),
):
    count = session.exec(select(ContinuousImprovementKpiDefinition)).all()
    if seed_if_empty and not count:
        _ensure_default_mc_catalog(session)
    if normalize_weights:
        _close_pending_mc_kpi_weights(session)
    stmt = select(ContinuousImprovementKpiDefinition)
    if not include_inactive:
        stmt = stmt.where(ContinuousImprovementKpiDefinition.is_active.is_(True))
    rows = session.exec(
        stmt.order_by(
            ContinuousImprovementKpiDefinition.focus_area.asc(),
            ContinuousImprovementKpiDefinition.action_line.asc(),
            ContinuousImprovementKpiDefinition.code.asc(),
        )
    ).all()
    return [_definition_to_read(row) for row in rows]


@router.patch("/kpis/mc/catalog/{kpi_id}", response_model=McKpiDefinitionRead)
def update_mc_kpi_catalog_item(
    kpi_id: uuid.UUID,
    payload: McKpiDefinitionUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    row = session.get(ContinuousImprovementKpiDefinition, kpi_id)
    if not row:
        raise HTTPException(status_code=404, detail="KPI definition not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(row, key, value)
    row.updated_at = datetime.utcnow()
    session.add(row)
    session.commit()
    session.refresh(row)
    return _definition_to_read(row)


@router.put("/kpis/mc/measurements", response_model=McKpiMeasurementRead)
def upsert_mc_kpi_measurement(
    payload: McKpiMeasurementUpsert,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    definition = session.get(ContinuousImprovementKpiDefinition, payload.kpi_definition_id)
    if not definition:
        raise HTTPException(status_code=404, detail="KPI definition not found")

    period_key = _normalize_period_key(payload.period)
    compliance_pct = payload.compliance_pct
    if compliance_pct is None and payload.target_value not in (None, 0) and payload.actual_value is not None:
        compliance_pct = (payload.actual_value / payload.target_value) * 100
    compliance_pct = float(compliance_pct if compliance_pct is not None else 0)
    compliance_pct = max(0.0, min(compliance_pct, 200.0))
    status_color = _status_color_from_compliance(compliance_pct)

    row = session.exec(
        select(ContinuousImprovementKpiMeasurement).where(
            ContinuousImprovementKpiMeasurement.kpi_definition_id == payload.kpi_definition_id,
            ContinuousImprovementKpiMeasurement.period_key == period_key,
        )
    ).first()

    now = datetime.utcnow()
    if not row:
        row = ContinuousImprovementKpiMeasurement(
            kpi_definition_id=payload.kpi_definition_id,
            period_key=period_key,
            target_value=payload.target_value,
            actual_value=payload.actual_value,
            compliance_pct=compliance_pct,
            status_color=status_color,
            notes=payload.notes,
            source=payload.source or "manual",
            created_by=user.username,
            created_at=now,
            updated_at=now,
        )
    else:
        row.target_value = payload.target_value
        row.actual_value = payload.actual_value
        row.compliance_pct = compliance_pct
        row.status_color = status_color
        row.notes = payload.notes
        row.source = payload.source or row.source
        row.updated_at = now

    _sync_kpi_deviation_action(
        session=session,
        definition=definition,
        period_key=period_key,
        compliance_pct=compliance_pct,
        username=user.username,
    )

    session.add(row)
    session.commit()
    session.refresh(row)
    return McKpiMeasurementRead(
        id=row.id,
        kpi_definition_id=row.kpi_definition_id,
        code=definition.code,
        indicator_name=definition.indicator_name,
        period=row.period_key,
        target_value=row.target_value,
        actual_value=row.actual_value,
        compliance_pct=float(row.compliance_pct or 0),
        status_color=row.status_color,
        notes=row.notes,
        source=row.source,
        updated_at=row.updated_at,
    )


@router.get("/kpis/mc/measurements", response_model=List[McKpiMeasurementRead])
def list_mc_kpi_measurements(
    period: Optional[str] = None,
    session: Session = Depends(get_session),
):
    period_key = _normalize_period_key(period) if period else None
    definitions = session.exec(select(ContinuousImprovementKpiDefinition)).all()
    definition_by_id = {row.id: row for row in definitions}

    stmt = select(ContinuousImprovementKpiMeasurement)
    if period_key:
        stmt = stmt.where(ContinuousImprovementKpiMeasurement.period_key == period_key)
    rows = session.exec(
        stmt.order_by(
            ContinuousImprovementKpiMeasurement.period_key.desc(),
            ContinuousImprovementKpiMeasurement.updated_at.desc(),
        )
    ).all()

    result = []
    for row in rows:
        definition = definition_by_id.get(row.kpi_definition_id)
        if not definition:
            continue
        result.append(
            McKpiMeasurementRead(
                id=row.id,
                kpi_definition_id=row.kpi_definition_id,
                code=definition.code,
                indicator_name=definition.indicator_name,
                period=row.period_key,
                target_value=row.target_value,
                actual_value=row.actual_value,
                compliance_pct=float(row.compliance_pct or 0),
                status_color=row.status_color,
                notes=row.notes,
                source=row.source,
                updated_at=row.updated_at,
            )
        )
    return result


@router.delete("/kpis/mc/measurements/{measurement_id}", status_code=204)
def delete_mc_kpi_measurement(
    measurement_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    row = session.get(ContinuousImprovementKpiMeasurement, measurement_id)
    if not row:
        raise HTTPException(status_code=404, detail="KPI measurement not found")
    session.delete(row)
    session.commit()


@router.get("/kpis/mc/scorecard")
def get_mc_kpi_scorecard(
    period: Optional[str] = None,
    normalize_weights: bool = True,
    session: Session = Depends(get_session),
):
    period_key = _normalize_period_key(period)
    if not session.exec(select(ContinuousImprovementKpiDefinition)).all():
        _ensure_default_mc_catalog(session)
    if normalize_weights:
        _close_pending_mc_kpi_weights(session)

    definitions = session.exec(
        select(ContinuousImprovementKpiDefinition).where(
            ContinuousImprovementKpiDefinition.is_active.is_(True)
        )
    ).all()
    measurements = session.exec(
        select(ContinuousImprovementKpiMeasurement).where(
            ContinuousImprovementKpiMeasurement.period_key == period_key
        )
    ).all()
    measurement_by_kpi = {row.kpi_definition_id: row for row in measurements}
    return _build_mc_kpi_scorecard_payload(definitions, measurement_by_kpi, period_key)


@router.get("/kpis/mc/trend")
def get_mc_kpi_trend(
    months: int = 6,
    end_period: Optional[str] = None,
    normalize_weights: bool = True,
    session: Session = Depends(get_session),
):
    if months < 2 or months > 24:
        raise HTTPException(status_code=400, detail="months must be between 2 and 24")

    if not session.exec(select(ContinuousImprovementKpiDefinition)).all():
        _ensure_default_mc_catalog(session)
    if normalize_weights:
        _close_pending_mc_kpi_weights(session)

    end_period_key = _normalize_period_key(end_period)
    period_keys = [
        _shift_period_key(end_period_key, -offset)
        for offset in range(months - 1, -1, -1)
    ]

    definitions = session.exec(
        select(ContinuousImprovementKpiDefinition).where(
            ContinuousImprovementKpiDefinition.is_active.is_(True)
        )
    ).all()
    if not definitions:
        return {
            "months": months,
            "end_period": end_period_key,
            "start_period": period_keys[0],
            "points": [],
            "delta_vs_previous": None,
        }

    definition_ids = [row.id for row in definitions]
    measurements = session.exec(
        select(ContinuousImprovementKpiMeasurement).where(
            ContinuousImprovementKpiMeasurement.kpi_definition_id.in_(definition_ids),
            ContinuousImprovementKpiMeasurement.period_key.in_(period_keys),
        )
    ).all()

    measurements_by_period: Dict[str, Dict[uuid.UUID, ContinuousImprovementKpiMeasurement]] = {
        key: {} for key in period_keys
    }
    for row in measurements:
        period_map = measurements_by_period.setdefault(row.period_key, {})
        period_map[row.kpi_definition_id] = row

    points = []
    for period_key in period_keys:
        scorecard = _build_mc_kpi_scorecard_payload(
            definitions=definitions,
            measurement_by_kpi=measurements_by_period.get(period_key, {}),
            period_key=period_key,
        )
        totals = scorecard["totals"]
        status_counts = scorecard["status_counts"]
        points.append(
            {
                "period": period_key,
                "completion_rate_pct": totals["completion_rate_pct"],
                "weighted_individual_result_pct": totals["weighted_individual_result_pct"],
                "weighted_kpi_result_pct": totals["weighted_kpi_result_pct"],
                "items_with_measurement": totals["items_with_measurement"],
                "items_total": totals["items_total"],
                "green_items": status_counts["green"],
                "yellow_items": status_counts["yellow"],
                "red_items": status_counts["red"],
            }
        )

    delta_vs_previous = None
    trend_alert = None
    if len(points) >= 2:
        previous = points[-2]
        latest = points[-1]
        delta_vs_previous = {
            "period": latest["period"],
            "previous_period": previous["period"],
            "weighted_kpi_result_delta_pct": round(
                float(latest["weighted_kpi_result_pct"]) - float(previous["weighted_kpi_result_pct"]),
                2,
            ),
            "completion_rate_delta_pct": round(
                float(latest["completion_rate_pct"]) - float(previous["completion_rate_pct"]),
                2,
            ),
            "red_items_delta": int(latest["red_items"]) - int(previous["red_items"]),
        }
        trend_alert = _build_mc_kpi_trend_alert(latest=latest, previous=previous)
    elif points:
        trend_alert = _build_mc_kpi_trend_alert(latest=points[-1], previous=None)

    return {
        "months": months,
        "end_period": end_period_key,
        "start_period": period_keys[0],
        "points": points,
        "delta_vs_previous": delta_vs_previous,
        "trend_alert": trend_alert,
    }
