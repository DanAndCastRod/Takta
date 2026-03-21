import math
import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field as PydanticField
from sqlmodel import Session, select

from ..core.auth import CurrentUser, get_current_user, require_role
from ..db import get_session
from ..models import Asset, KanbanLoop


router = APIRouter(
    prefix="/api/logistics",
    tags=["Logistics"],
    dependencies=[Depends(get_current_user)],
)


class KanbanCalculateRequest(BaseModel):
    sku_code: str
    asset_origin_id: uuid.UUID
    asset_dest_id: uuid.UUID
    container_capacity: int = PydanticField(gt=0)
    daily_demand: float = PydanticField(gt=0)
    lead_time_days: float = PydanticField(gt=0)
    safety_stock_pct: float = PydanticField(ge=0)


class KanbanRead(BaseModel):
    id: uuid.UUID
    sku_code: str
    asset_origin_id: uuid.UUID
    asset_origin_name: Optional[str] = None
    asset_dest_id: uuid.UUID
    asset_dest_name: Optional[str] = None
    container_capacity: int
    daily_demand: float
    lead_time_days: float
    safety_stock_pct: float
    calculated_cards: int
    exact_result: float


def _map_loop(session: Session, loop: KanbanLoop) -> KanbanRead:
    origin = session.get(Asset, loop.asset_origin_id)
    dest = session.get(Asset, loop.asset_dest_id)
    exact = (loop.daily_demand * loop.lead_time_days * (1 + loop.safety_stock_pct)) / loop.container_capacity
    return KanbanRead(
        id=loop.id,
        sku_code=loop.sku_code,
        asset_origin_id=loop.asset_origin_id,
        asset_origin_name=origin.name if origin else None,
        asset_dest_id=loop.asset_dest_id,
        asset_dest_name=dest.name if dest else None,
        container_capacity=loop.container_capacity,
        daily_demand=loop.daily_demand,
        lead_time_days=loop.lead_time_days,
        safety_stock_pct=loop.safety_stock_pct,
        calculated_cards=loop.calculated_cards,
        exact_result=round(exact, 3),
    )


@router.post("/kanban/calculate", response_model=KanbanRead)
def calculate_kanban(
    payload: KanbanCalculateRequest,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    if not session.get(Asset, payload.asset_origin_id):
        raise HTTPException(status_code=404, detail="Origin asset not found")
    if not session.get(Asset, payload.asset_dest_id):
        raise HTTPException(status_code=404, detail="Destination asset not found")
    if payload.asset_origin_id == payload.asset_dest_id:
        raise HTTPException(status_code=400, detail="Origin and destination assets must be different")

    exact_cards = (
        payload.daily_demand
        * payload.lead_time_days
        * (1 + payload.safety_stock_pct)
    ) / payload.container_capacity

    loop = KanbanLoop(
        sku_code=payload.sku_code,
        asset_origin_id=payload.asset_origin_id,
        asset_dest_id=payload.asset_dest_id,
        container_capacity=payload.container_capacity,
        daily_demand=payload.daily_demand,
        lead_time_days=payload.lead_time_days,
        safety_stock_pct=payload.safety_stock_pct,
        calculated_cards=math.ceil(exact_cards),
    )
    session.add(loop)
    session.commit()
    session.refresh(loop)
    return _map_loop(session, loop)


@router.get("/kanban/loops", response_model=List[KanbanRead])
def list_kanban_loops(
    sku_code: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(KanbanLoop)
    loops = session.exec(stmt).all()
    if sku_code:
        loops = [loop for loop in loops if sku_code.lower() in loop.sku_code.lower()]
    return [_map_loop(session, loop) for loop in loops]


@router.delete("/kanban/loops/{loop_id}", status_code=204)
def delete_kanban_loop(
    loop_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    loop = session.get(KanbanLoop, loop_id)
    if not loop:
        raise HTTPException(status_code=404, detail="Kanban loop not found")

    session.delete(loop)
    session.commit()
