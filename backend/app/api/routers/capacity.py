"""
Capacity Router — Sprint 5.5: Capacity analysis + Staffing calculation.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from ...db import get_session
from ...services.capacity_engine import CapacityEngine
import uuid
import math

router = APIRouter(
    prefix="/api/engineering/capacity",
    tags=["Engineering - Capacity"],
    responses={404: {"description": "Not found"}},
)


@router.get("/{asset_id}")
def get_asset_capacity(asset_id: uuid.UUID, session: Session = Depends(get_session)):
    """
    Calculates the detailed capacity analysis for an Asset (Machine or Line).
    Returns capacity in Units Per Hour (UPH) and identifying bottlenecks.
    """
    engine = CapacityEngine(session)
    result = engine.calculate_asset_capacity(asset_id)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result


@router.get("/{asset_id}/staffing")
def get_staffing(
    asset_id: uuid.UUID,
    demand: float = Query(..., description="Daily demand in units"),
    hours_per_shift: float = Query(8.0, description="Hours per shift"),
    shifts_per_day: int = Query(1, description="Number of shifts per day"),
    session: Session = Depends(get_session),
):
    """
    Calculates personnel required to meet a given demand.
    
    Formula: personnel = ceil(demand / (capacity_uph * hours_per_shift * shifts_per_day))
    """
    engine = CapacityEngine(session)
    result = engine.calculate_asset_capacity(asset_id)

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    capacity_uph = result.get("capacity_uph", 0)
    if capacity_uph <= 0:
        raise HTTPException(
            status_code=400,
            detail="Asset has no defined capacity (no active standards with time)."
        )

    available_capacity = capacity_uph * hours_per_shift * shifts_per_day
    personnel_required = math.ceil(demand / available_capacity)

    return {
        "asset_id": str(asset_id),
        "asset_name": result.get("asset_name", ""),
        "capacity_uph": capacity_uph,
        "demand": demand,
        "hours_per_shift": hours_per_shift,
        "shifts_per_day": shifts_per_day,
        "available_capacity_per_day": round(available_capacity, 2),
        "personnel_required": personnel_required,
        "utilization_pct": round((demand / (available_capacity * personnel_required)) * 100, 1) if personnel_required > 0 else 0,
    }
