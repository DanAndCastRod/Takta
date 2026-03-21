from __future__ import annotations

import csv
import io
import uuid
from collections import defaultdict, deque
from datetime import datetime
from math import sqrt
from typing import Dict, List, Optional, Tuple

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field as PydanticField
from sqlmodel import Session, and_, select

from ..core.auth import CurrentUser, get_current_user, require_role
from ..db import get_session
from ..models import (
    Asset,
    AssetActivityContext,
    CapacityStaffingHistory,
    ProcessStandard,
    ProcessStandardDependency,
    ProductReference,
    StandardActivity,
    TimeStudy,
    TimingElement,
    TimingLap,
    WorkSamplingObservation,
)
from ..services.capacity_engine import CapacityEngine
from ..services.simple_pdf import build_text_pdf
from ..services.timing_engine import TimingEngine


router = APIRouter(
    prefix="/api/engineering",
    tags=["Engineering Advanced"],
    dependencies=[Depends(get_current_user)],
)


def _to_uuid(raw: Optional[str], field_name: str) -> Optional[uuid.UUID]:
    if raw in (None, ""):
        return None
    try:
        return uuid.UUID(str(raw))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid UUID for '{field_name}'") from exc


class ReferenceSyncItem(BaseModel):
    code: str
    description: str
    family: str
    uom: Optional[str] = None
    packaging_uom: Optional[str] = None


class ReferenceSyncRequest(BaseModel):
    source: str = "manual"
    items: List[ReferenceSyncItem] = []


class ReferenceSyncResponse(BaseModel):
    source: str
    created: int
    updated: int
    ignored: int


@router.post("/sync-references", response_model=ReferenceSyncResponse)
def sync_references(
    payload: ReferenceSyncRequest,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    """
    Upsert references from an external source feed (e.g. SIESA bridge).
    """
    created = 0
    updated = 0
    ignored = 0

    for row in payload.items:
        code = row.code.strip()
        if not code:
            ignored += 1
            continue
        existing = session.exec(select(ProductReference).where(ProductReference.code == code)).first()
        if existing:
            existing.description = row.description.strip()
            existing.family = row.family.strip()
            existing.uom = row.uom.strip() if row.uom else None
            existing.packaging_uom = row.packaging_uom.strip() if row.packaging_uom else None
            session.add(existing)
            updated += 1
        else:
            session.add(
                ProductReference(
                    code=code,
                    description=row.description.strip(),
                    family=row.family.strip(),
                    uom=row.uom.strip() if row.uom else None,
                    packaging_uom=row.packaging_uom.strip() if row.packaging_uom else None,
                )
            )
            created += 1

    session.commit()
    return ReferenceSyncResponse(source=payload.source, created=created, updated=updated, ignored=ignored)


class ActivityContextAssign(BaseModel):
    activity_id: uuid.UUID
    source: str = "manual"
    is_active: bool = True


class ActivityContextRead(BaseModel):
    activity_id: uuid.UUID
    activity_name: str
    activity_type: str
    source: str
    is_active: bool


@router.get("/context/{asset_id}/activities", response_model=List[ActivityContextRead])
def list_context_activities(
    asset_id: uuid.UUID,
    include_unrestricted: bool = Query(default=True),
    session: Session = Depends(get_session),
):
    if not session.get(Asset, asset_id):
        raise HTTPException(status_code=404, detail="Asset not found")

    pinned = session.exec(
        select(AssetActivityContext).where(
            and_(AssetActivityContext.asset_id == asset_id, AssetActivityContext.is_active == True)  # noqa: E712
        )
    ).all()
    if pinned:
        activity_ids = {row.activity_id for row in pinned}
        activities = session.exec(select(StandardActivity).where(StandardActivity.id.in_(activity_ids))).all()
        by_id = {row.activity_id: row for row in pinned}
        return [
            ActivityContextRead(
                activity_id=act.id,
                activity_name=act.name,
                activity_type=act.type,
                source=by_id[act.id].source,
                is_active=by_id[act.id].is_active,
            )
            for act in activities
        ]

    used_standards = session.exec(
        select(ProcessStandard).where(ProcessStandard.asset_id == asset_id)
    ).all()
    if used_standards:
        activity_ids = {row.activity_id for row in used_standards}
        activities = session.exec(select(StandardActivity).where(StandardActivity.id.in_(activity_ids))).all()
        return [
            ActivityContextRead(
                activity_id=act.id,
                activity_name=act.name,
                activity_type=act.type,
                source="inferred",
                is_active=True,
            )
            for act in activities
        ]

    if not include_unrestricted:
        return []

    activities = session.exec(select(StandardActivity)).all()
    return [
        ActivityContextRead(
            activity_id=act.id,
            activity_name=act.name,
            activity_type=act.type,
            source="unrestricted",
            is_active=True,
        )
        for act in activities
    ]


@router.post("/context/{asset_id}/activities", response_model=ActivityContextRead)
def assign_context_activity(
    asset_id: uuid.UUID,
    payload: ActivityContextAssign,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    activity = session.get(StandardActivity, payload.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    row = session.exec(
        select(AssetActivityContext).where(
            and_(
                AssetActivityContext.asset_id == asset_id,
                AssetActivityContext.activity_id == payload.activity_id,
            )
        )
    ).first()
    if row:
        row.source = payload.source
        row.is_active = payload.is_active
    else:
        row = AssetActivityContext(
            asset_id=asset_id,
            activity_id=payload.activity_id,
            source=payload.source,
            is_active=payload.is_active,
        )
    session.add(row)
    session.commit()
    session.refresh(row)
    return ActivityContextRead(
        activity_id=activity.id,
        activity_name=activity.name,
        activity_type=activity.type,
        source=row.source,
        is_active=row.is_active,
    )


@router.delete("/context/{asset_id}/activities/{activity_id}", status_code=204)
def remove_context_activity(
    asset_id: uuid.UUID,
    activity_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    row = session.exec(
        select(AssetActivityContext).where(
            and_(
                AssetActivityContext.asset_id == asset_id,
                AssetActivityContext.activity_id == activity_id,
            )
        )
    ).first()
    if not row:
        raise HTTPException(status_code=404, detail="Context rule not found")
    session.delete(row)
    session.commit()


class StrictStandardCreate(BaseModel):
    asset_id: uuid.UUID
    activity_id: uuid.UUID
    product_reference_id: Optional[uuid.UUID] = None
    standard_time_minutes: Optional[float] = None
    frequency: Optional[str] = None
    capacity_unit: Optional[str] = None


@router.post("/standards/strict")
def create_strict_standard(
    payload: StrictStandardCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    asset = session.get(Asset, payload.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    activity = session.get(StandardActivity, payload.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    available = list_context_activities(payload.asset_id, include_unrestricted=False, session=session)
    if available and payload.activity_id not in {row.activity_id for row in available}:
        raise HTTPException(
            status_code=400,
            detail="Activity is not allowed for this asset context. Use context assignment first.",
        )

    if payload.product_reference_id and not session.get(ProductReference, payload.product_reference_id):
        raise HTTPException(status_code=404, detail="Product reference not found")

    exists = session.exec(
        select(ProcessStandard).where(
            and_(
                ProcessStandard.asset_id == payload.asset_id,
                ProcessStandard.activity_id == payload.activity_id,
                ProcessStandard.product_reference_id == payload.product_reference_id,
            )
        )
    ).first()
    if exists:
        raise HTTPException(status_code=409, detail="Standard already exists for this triad.")

    standard = ProcessStandard(
        asset_id=payload.asset_id,
        activity_id=payload.activity_id,
        product_reference_id=payload.product_reference_id,
        standard_time_minutes=payload.standard_time_minutes,
        frequency=payload.frequency,
        capacity_unit=payload.capacity_unit,
        is_active=True,
    )
    session.add(standard)
    session.commit()
    session.refresh(standard)
    return {"id": str(standard.id)}


class DependencyCreate(BaseModel):
    asset_id: uuid.UUID
    predecessor_standard_id: uuid.UUID
    successor_standard_id: uuid.UUID
    min_wait_minutes: float = 0.0
    is_mandatory: bool = True


class DependencyRead(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    predecessor_standard_id: uuid.UUID
    successor_standard_id: uuid.UUID
    min_wait_minutes: float
    is_mandatory: bool


@router.post("/precedence/dependencies", response_model=DependencyRead)
def create_dependency(
    payload: DependencyCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    if payload.predecessor_standard_id == payload.successor_standard_id:
        raise HTTPException(status_code=400, detail="Predecessor and successor cannot be equal.")
    predecessor = session.get(ProcessStandard, payload.predecessor_standard_id)
    successor = session.get(ProcessStandard, payload.successor_standard_id)
    if not predecessor or not successor:
        raise HTTPException(status_code=404, detail="Standard not found")
    if predecessor.asset_id != payload.asset_id or successor.asset_id != payload.asset_id:
        raise HTTPException(status_code=400, detail="Both standards must belong to the selected asset.")

    row = ProcessStandardDependency(
        asset_id=payload.asset_id,
        predecessor_standard_id=payload.predecessor_standard_id,
        successor_standard_id=payload.successor_standard_id,
        min_wait_minutes=max(0.0, payload.min_wait_minutes),
        is_mandatory=payload.is_mandatory,
        created_by=user.username,
    )
    session.add(row)
    session.commit()
    session.refresh(row)
    return row


@router.get("/precedence/dependencies", response_model=List[DependencyRead])
def list_dependencies(
    asset_id: Optional[uuid.UUID] = None,
    session: Session = Depends(get_session),
):
    stmt = select(ProcessStandardDependency)
    if asset_id:
        stmt = stmt.where(ProcessStandardDependency.asset_id == asset_id)
    return session.exec(stmt).all()


@router.delete("/precedence/dependencies/{dependency_id}", status_code=204)
def delete_dependency(
    dependency_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    row = session.get(ProcessStandardDependency, dependency_id)
    if not row:
        raise HTTPException(status_code=404, detail="Dependency not found")
    session.delete(row)
    session.commit()


def _topological_sort(nodes: List[uuid.UUID], edges: List[Tuple[uuid.UUID, uuid.UUID]]) -> Tuple[List[uuid.UUID], bool]:
    graph: Dict[uuid.UUID, List[uuid.UUID]] = {node: [] for node in nodes}
    indegree: Dict[uuid.UUID, int] = {node: 0 for node in nodes}
    for src, dst in edges:
        if src not in graph or dst not in graph:
            continue
        graph[src].append(dst)
        indegree[dst] += 1

    queue = deque([node for node in nodes if indegree[node] == 0])
    ordered: List[uuid.UUID] = []
    while queue:
        node = queue.popleft()
        ordered.append(node)
        for nxt in graph[node]:
            indegree[nxt] -= 1
            if indegree[nxt] == 0:
                queue.append(nxt)

    has_cycle = len(ordered) != len(nodes)
    return ordered, has_cycle


@router.get("/capacity/{asset_id}/precedence")
def capacity_precedence_graph(asset_id: uuid.UUID, session: Session = Depends(get_session)):
    standards = session.exec(select(ProcessStandard).where(ProcessStandard.asset_id == asset_id)).all()
    if not standards:
        return {"asset_id": str(asset_id), "standards": [], "dependencies": [], "has_cycle": False, "topological_order": []}

    nodes = [row.id for row in standards if row.id]
    deps = session.exec(select(ProcessStandardDependency).where(ProcessStandardDependency.asset_id == asset_id)).all()
    edges = [(row.predecessor_standard_id, row.successor_standard_id) for row in deps]
    ordered, has_cycle = _topological_sort(nodes, edges)

    by_id = {row.id: row for row in standards}
    order_payload = []
    for sid in ordered:
        standard = by_id.get(sid)
        if not standard:
            continue
        order_payload.append(
            {
                "standard_id": str(sid),
                "activity_id": str(standard.activity_id),
                "standard_time_minutes": standard.standard_time_minutes,
            }
        )

    return {
        "asset_id": str(asset_id),
        "standards": [str(sid) for sid in nodes],
        "dependencies": [{"from": str(src), "to": str(dst)} for src, dst in edges],
        "has_cycle": has_cycle,
        "topological_order": order_payload,
    }


class AdvancedStaffingRequest(BaseModel):
    demand: float = PydanticField(gt=0)
    hours_per_shift: float = PydanticField(default=8.0, gt=0)
    shifts_per_day: int = PydanticField(default=1, ge=1, le=4)
    mechanical_factor: float = PydanticField(default=1.0, gt=0)
    manual_factor: float = PydanticField(default=1.0, gt=0)
    scenario_label: Optional[str] = None


@router.post("/capacity/{asset_id}/staffing/advanced")
def calculate_advanced_staffing(
    asset_id: uuid.UUID,
    payload: AdvancedStaffingRequest,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    engine = CapacityEngine(session)
    cap = engine.calculate_asset_capacity(asset_id)
    if "error" in cap:
        raise HTTPException(status_code=404, detail=cap["error"])
    capacity_uph = float(cap.get("capacity_uph") or 0)
    if capacity_uph <= 0:
        raise HTTPException(status_code=400, detail="Asset has no active capacity definition.")

    effective_capacity = capacity_uph * payload.mechanical_factor * payload.manual_factor
    available_capacity = effective_capacity * payload.hours_per_shift * payload.shifts_per_day
    personnel_required = max(1, int((payload.demand / available_capacity) + 0.9999))
    utilization_pct = round((payload.demand / (available_capacity * personnel_required)) * 100, 2)

    status_color = "green"
    if utilization_pct > 95:
        status_color = "red"
    elif utilization_pct > 82:
        status_color = "yellow"

    snapshot = CapacityStaffingHistory(
        asset_id=asset_id,
        demand=payload.demand,
        hours_per_shift=payload.hours_per_shift,
        shifts_per_day=payload.shifts_per_day,
        mechanical_factor=payload.mechanical_factor,
        manual_factor=payload.manual_factor,
        personnel_required=personnel_required,
        available_capacity_per_day=round(available_capacity, 3),
        utilization_pct=utilization_pct,
        status_color=status_color,
        scenario_label=payload.scenario_label,
        created_by=user.username,
    )
    session.add(snapshot)
    session.commit()
    session.refresh(snapshot)

    return {
        "asset_id": str(asset_id),
        "asset_name": cap.get("asset_name"),
        "base_capacity_uph": capacity_uph,
        "effective_capacity_uph": round(effective_capacity, 3),
        "available_capacity_per_day": round(available_capacity, 3),
        "personnel_required": personnel_required,
        "utilization_pct": utilization_pct,
        "status_color": status_color,
        "snapshot_id": str(snapshot.id),
    }


@router.get("/capacity/{asset_id}/staffing/history")
def staffing_history(
    asset_id: uuid.UUID,
    limit: int = Query(default=30, ge=1, le=200),
    session: Session = Depends(get_session),
):
    rows = session.exec(
        select(CapacityStaffingHistory)
        .where(CapacityStaffingHistory.asset_id == asset_id)
        .order_by(CapacityStaffingHistory.created_at.desc())
        .limit(limit)
    ).all()
    return [
        {
            "id": str(row.id),
            "demand": row.demand,
            "hours_per_shift": row.hours_per_shift,
            "shifts_per_day": row.shifts_per_day,
            "mechanical_factor": row.mechanical_factor,
            "manual_factor": row.manual_factor,
            "personnel_required": row.personnel_required,
            "utilization_pct": row.utilization_pct,
            "status_color": row.status_color,
            "scenario_label": row.scenario_label,
            "created_by": row.created_by,
            "created_at": row.created_at.isoformat(),
        }
        for row in rows
    ]


class WorkSampleCreate(BaseModel):
    category: str
    duration_seconds: Optional[float] = None
    is_abnormal: bool = False
    notes: Optional[str] = None


@router.post("/studies/{study_id}/work-samples")
def add_work_sample(
    study_id: uuid.UUID,
    payload: WorkSampleCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    study = session.get(TimeStudy, study_id)
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    if study.study_type != "work_sampling":
        raise HTTPException(status_code=400, detail="Study type is not work_sampling")

    obs = WorkSamplingObservation(
        time_study_id=study_id,
        category=payload.category.strip(),
        duration_seconds=payload.duration_seconds,
        is_abnormal=payload.is_abnormal,
        notes=payload.notes,
    )
    session.add(obs)
    session.commit()
    session.refresh(obs)
    return {"id": str(obs.id), "category": obs.category, "observed_at": obs.observed_at.isoformat()}


@router.get("/studies/{study_id}/work-samples")
def list_work_samples(study_id: uuid.UUID, session: Session = Depends(get_session)):
    rows = session.exec(
        select(WorkSamplingObservation)
        .where(WorkSamplingObservation.time_study_id == study_id)
        .order_by(WorkSamplingObservation.observed_at.desc())
    ).all()
    return [
        {
            "id": str(row.id),
            "category": row.category,
            "duration_seconds": row.duration_seconds,
            "is_abnormal": row.is_abnormal,
            "notes": row.notes,
            "observed_at": row.observed_at.isoformat(),
        }
        for row in rows
    ]


def _z_value(confidence: float) -> float:
    if confidence >= 0.99:
        return 2.576
    if confidence >= 0.95:
        return 1.96
    if confidence >= 0.90:
        return 1.645
    return 1.28


@router.get("/studies/{study_id}/work-sampling/results")
def work_sampling_results(study_id: uuid.UUID, session: Session = Depends(get_session)):
    study = session.get(TimeStudy, study_id)
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    rows = session.exec(select(WorkSamplingObservation).where(WorkSamplingObservation.time_study_id == study_id)).all()
    normal_rows = [row for row in rows if not row.is_abnormal]
    n = len(normal_rows)
    if n == 0:
        return {"study_id": str(study_id), "observations": 0, "categories": []}

    grouped: Dict[str, int] = defaultdict(int)
    for row in normal_rows:
        grouped[row.category] += 1

    z = _z_value(float(study.confidence_level or 0.95))
    categories = []
    for category, count in sorted(grouped.items(), key=lambda it: it[0]):
        p = count / n
        margin = z * sqrt((p * (1 - p)) / n) if n > 0 else 0
        categories.append(
            {
                "category": category,
                "count": count,
                "proportion": round(p, 4),
                "ci_low": round(max(0.0, p - margin), 4),
                "ci_high": round(min(1.0, p + margin), 4),
            }
        )

    return {
        "study_id": str(study_id),
        "study_name": study.name,
        "confidence_level": study.confidence_level,
        "observations": n,
        "abnormal_observations": len(rows) - n,
        "categories": categories,
    }


class LapPatch(BaseModel):
    is_abnormal: Optional[bool] = None
    notes: Optional[str] = None
    units_count: Optional[int] = None


@router.get("/studies/{study_id}/laps")
def list_study_laps(
    study_id: uuid.UUID,
    abnormal_only: bool = False,
    session: Session = Depends(get_session),
):
    study = session.get(TimeStudy, study_id)
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    session_ids = [row.id for row in study.sessions]
    if not session_ids:
        return []
    stmt = select(TimingLap).where(TimingLap.session_id.in_(session_ids))  # type: ignore
    if abnormal_only:
        stmt = stmt.where(TimingLap.is_abnormal == True)  # noqa: E712
    laps = session.exec(stmt.order_by(TimingLap.cycle_number.desc())).all()
    elements = session.exec(select(TimingElement).where(TimingElement.time_study_id == study_id)).all()
    elem_name = {row.id: row.name for row in elements}
    return [
        {
            "id": str(row.id),
            "session_id": str(row.session_id),
            "element_id": str(row.element_id),
            "element_name": elem_name.get(row.element_id),
            "cycle_number": row.cycle_number,
            "split_time_ms": row.split_time_ms,
            "lap_time_ms": row.lap_time_ms,
            "units_count": row.units_count,
            "is_abnormal": row.is_abnormal,
            "notes": row.notes,
        }
        for row in laps
    ]


@router.patch("/studies/{study_id}/laps/{lap_id}")
def patch_lap(
    study_id: uuid.UUID,
    lap_id: uuid.UUID,
    payload: LapPatch,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"])),
):
    study = session.get(TimeStudy, study_id)
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")
    lap = session.get(TimingLap, lap_id)
    if not lap:
        raise HTTPException(status_code=404, detail="Lap not found")

    valid_session_ids = {row.id for row in study.sessions}
    if lap.session_id not in valid_session_ids:
        raise HTTPException(status_code=400, detail="Lap does not belong to this study")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(lap, key, value)
    session.add(lap)
    session.commit()
    session.refresh(lap)
    return {
        "id": str(lap.id),
        "is_abnormal": lap.is_abnormal,
        "notes": lap.notes,
        "units_count": lap.units_count,
        "updated_by": user.username,
    }


def _study_report_lines(study: TimeStudy, results: Dict) -> List[str]:
    lines = [
        f"Study: {study.name}",
        f"Analyst: {study.analyst_name}",
        f"Type: {study.study_type}",
        f"Rating: {study.rating_factor}",
        f"Supplements: {study.supplements_pct}",
        f"Total normal time (ms): {results.get('total_normal_time_ms')}",
        f"Total standard time (ms): {results.get('total_standard_time_ms')}",
        f"UPH: {results.get('uph')}",
        "",
        "Elements:",
    ]
    for row in results.get("elements", []):
        lines.append(
            f"- #{row.get('order')} {row.get('element_name')} | obs={row.get('observations')} "
            f"| avg={row.get('avg_time_ms')} | TN={row.get('normal_time_ms')} | TE={row.get('standard_time_ms')}"
        )
    return lines


@router.get("/studies/{study_id}/report")
def export_study_report(
    study_id: uuid.UUID,
    output_format: str = Query(default="markdown", pattern="^(markdown|csv|pdf)$"),
    session: Session = Depends(get_session),
):
    study = session.get(TimeStudy, study_id)
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    engine = TimingEngine(session)
    results = engine.calculate_results(study_id)
    if "error" in results:
        raise HTTPException(status_code=400, detail=results["error"])

    if output_format == "markdown":
        content = "\n".join(_study_report_lines(study, results))
        return {"study_id": str(study_id), "format": "markdown", "content": content}

    if output_format == "csv":
        buffer = io.StringIO()
        writer = csv.writer(buffer)
        writer.writerow(["order", "element_name", "observations", "avg_time_ms", "normal_time_ms", "standard_time_ms", "auto_outliers"])
        for row in results.get("elements", []):
            writer.writerow(
                [
                    row.get("order"),
                    row.get("element_name"),
                    row.get("observations"),
                    row.get("avg_time_ms"),
                    row.get("normal_time_ms"),
                    row.get("standard_time_ms"),
                    row.get("auto_outliers"),
                ]
            )
        payload = io.BytesIO(buffer.getvalue().encode("utf-8"))
        headers = {"Content-Disposition": f'attachment; filename="takta_study_{study_id}.csv"'}
        return StreamingResponse(payload, media_type="text/csv; charset=utf-8", headers=headers)

    lines = _study_report_lines(study, results)
    pdf = build_text_pdf(f"Takta Timing Report {study.name}", lines)
    headers = {"Content-Disposition": f'attachment; filename="takta_study_{study_id}.pdf"'}
    return StreamingResponse(io.BytesIO(pdf), media_type="application/pdf", headers=headers)

