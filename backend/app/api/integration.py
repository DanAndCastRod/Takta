from __future__ import annotations

from typing import Optional
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from ..core.auth import get_current_user
from ..db import get_session
from ..models import (
    Asset,
    AuditInstance,
    DowntimeEvent,
    EngineeringMeeting,
    FormatInstance,
    ImprovementAction,
    PlantLayout,
    ProcessStandard,
    ProductReference,
    ProductionLog,
    TimeStudy,
    VSMCanvas,
    WeightSample,
    WeightSamplingSpec,
)
from ..services.reference_guard import validate_canonical_context


router = APIRouter(
    prefix="/api/integration",
    tags=["Integration"],
    dependencies=[Depends(get_current_user)],
)


def _to_uuid(raw: Optional[str], field_name: str) -> Optional[uuid.UUID]:
    if raw in (None, ""):
        return None
    try:
        return uuid.UUID(str(raw))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Invalid UUID for '{field_name}'.") from exc


def _route_with_context(
    base: str,
    asset_id: Optional[uuid.UUID],
    product_reference_id: Optional[uuid.UUID],
    process_standard_id: Optional[uuid.UUID],
) -> str:
    params = []
    if asset_id:
        params.append(f"asset_id={asset_id}")
    if product_reference_id:
        params.append(f"product_reference_id={product_reference_id}")
    if process_standard_id:
        params.append(f"process_standard_id={process_standard_id}")
    if not params:
        return base
    separator = "&" if "?" in base else "?"
    return f"{base}{separator}{'&'.join(params)}"


@router.get("/context/options")
def get_context_options(
    limit: int = Query(200, ge=10, le=1000),
    session: Session = Depends(get_session),
):
    assets = session.exec(select(Asset).order_by(Asset.name)).all()[:limit]
    references = session.exec(select(ProductReference).order_by(ProductReference.code)).all()[:limit]
    standards = session.exec(select(ProcessStandard)).all()[:limit]

    return {
        "assets": [
            {
                "id": str(row.id),
                "name": row.name,
                "type": row.type,
            }
            for row in assets
        ],
        "references": [
            {
                "id": str(row.id),
                "code": row.code,
                "description": row.description,
            }
            for row in references
        ],
        "standards": [
            {
                "id": str(row.id),
                "asset_id": str(row.asset_id),
                "product_reference_id": str(row.product_reference_id) if row.product_reference_id else None,
                "standard_time_minutes": row.standard_time_minutes,
                "is_active": row.is_active,
            }
            for row in standards
        ],
    }


@router.get("/context/summary")
def get_context_summary(
    asset_id: Optional[str] = None,
    product_reference_id: Optional[str] = None,
    process_standard_id: Optional[str] = None,
    session: Session = Depends(get_session),
):
    asset_uuid = _to_uuid(asset_id, "asset_id")
    reference_uuid = _to_uuid(product_reference_id, "product_reference_id")
    standard_uuid = _to_uuid(process_standard_id, "process_standard_id")

    context = validate_canonical_context(
        session=session,
        asset_id=asset_uuid,
        product_reference_id=reference_uuid,
        process_standard_id=standard_uuid,
    )
    asset_uuid = context.asset_id
    reference_uuid = context.product_reference_id
    standard_uuid = context.process_standard_id
    asset = context.asset
    reference = context.reference
    standard = context.standard

    standards = session.exec(select(ProcessStandard)).all()
    studies = session.exec(select(TimeStudy)).all()
    weight_specs = session.exec(select(WeightSamplingSpec)).all()
    production_logs = session.exec(select(ProductionLog)).all()
    downtimes = session.exec(select(DowntimeEvent)).all()
    actions = session.exec(select(ImprovementAction)).all()
    audits = session.exec(select(AuditInstance)).all()
    documents = session.exec(select(FormatInstance)).all()
    meetings = session.exec(select(EngineeringMeeting)).all()
    layouts = session.exec(select(PlantLayout)).all()
    vsm_canvases = session.exec(select(VSMCanvas)).all()

    def match_standard(row: ProcessStandard) -> bool:
        if standard_uuid and row.id != standard_uuid:
            return False
        if asset_uuid and row.asset_id != asset_uuid:
            return False
        if reference_uuid and row.product_reference_id != reference_uuid:
            return False
        return True

    standard_ids = {row.id for row in standards if match_standard(row)}
    matched_weight_specs = [
        row
        for row in weight_specs
        if (not standard_ids or row.process_standard_id in standard_ids or not standard_uuid)
        and (not asset_uuid or row.asset_id == asset_uuid)
        and (not reference_uuid or row.product_reference_id == reference_uuid)
        and (not standard_uuid or row.process_standard_id == standard_uuid)
    ]
    weight_spec_ids = {row.id for row in matched_weight_specs}
    weight_samples_count = len(
        [
            row
            for row in session.exec(select(WeightSample)).all()
            if row.specification_id in weight_spec_ids
        ]
    )

    studies_count = len(
        [
            row
            for row in studies
            if (
                (not standard_uuid or row.process_standard_id == standard_uuid)
                and (not asset_uuid or row.asset_id == asset_uuid)
                and (not reference_uuid or row.product_reference_id == reference_uuid)
            )
            or (
                row.process_standard_id in standard_ids
                and (not standard_uuid)
                and (not row.asset_id or not asset_uuid)
                and (not row.product_reference_id or not reference_uuid)
            )
        ]
    )

    counts = {
        "standards": len(standard_ids),
        "studies": studies_count,
        "weight_specs": len(matched_weight_specs),
        "weight_samples": weight_samples_count,
        "production_logs": len([row for row in production_logs if not asset_uuid or row.asset_id == asset_uuid]),
        "downtimes": len([row for row in downtimes if not asset_uuid or row.asset_id == asset_uuid]),
        "actions": len([row for row in actions if not asset_uuid or row.asset_id == asset_uuid]),
        "audits": len([row for row in audits if not asset_uuid or row.asset_id == asset_uuid]),
        "documents": len([row for row in documents if not asset_uuid or row.asset_id == asset_uuid]),
        "meetings": len([row for row in meetings if not asset_uuid or row.asset_id == asset_uuid]),
        "layouts": len([row for row in layouts if not asset_uuid or row.plant_id == asset_uuid]),
        "vsm_canvases": len([row for row in vsm_canvases if not asset_uuid or row.asset_id == asset_uuid]),
    }

    return {
        "context": {
            "asset_id": str(asset_uuid) if asset_uuid else None,
            "asset_name": asset.name if asset else None,
            "product_reference_id": str(reference_uuid) if reference_uuid else None,
            "reference_code": reference.code if reference else None,
            "process_standard_id": str(standard_uuid) if standard_uuid else None,
            "standard_time_minutes": standard.standard_time_minutes if standard else None,
        },
        "counts": counts,
        "quick_links": [
            {"module": "Activos", "route": _route_with_context("#/assets", asset_uuid, None, None)},
            {"module": "Ingeniería", "route": _route_with_context("#/engineering?tab=standards", asset_uuid, reference_uuid, standard_uuid)},
            {"module": "Cronómetro", "route": _route_with_context("#/timing", asset_uuid, reference_uuid, standard_uuid)},
            {"module": "Ejecución", "route": _route_with_context("#/execution", asset_uuid, None, None)},
            {"module": "Muestreo de peso", "route": _route_with_context("#/weight-sampling", asset_uuid, reference_uuid, standard_uuid)},
            {"module": "Excelencia", "route": _route_with_context("#/excellence", asset_uuid, None, None)},
            {"module": "Documentos", "route": _route_with_context("#/documents", asset_uuid, None, None)},
            {"module": "Diagram Studio", "route": _route_with_context("#/plant-editor", asset_uuid, None, None)},
            {"module": "Actas IP", "route": _route_with_context("#/meetings", asset_uuid, None, None)},
        ],
        "implementation": {
            "phase": "V2-S01",
            "status": "started",
            "description": "Context integration base between modules.",
        },
    }
