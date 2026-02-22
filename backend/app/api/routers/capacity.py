from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session
from ...db import get_session
from ...services.capacity_engine import CapacityEngine
import uuid

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
