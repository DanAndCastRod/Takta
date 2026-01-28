from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from ..db import get_session
from ..models import KanbanLoop

router = APIRouter(prefix="/logistics", tags=["Logistics"])

@router.post("/kanban/calculate", response_model=KanbanLoop)
def calculate_kanban(loop: KanbanLoop, session: Session = Depends(get_session)):
    # Formula: N = (D * L * (1 + SS)) / C
    demand = loop.daily_demand
    lead = loop.lead_time_days
    ss = loop.safety_stock_pct
    cap = loop.container_capacity
    
    if cap > 0:
        cards = (demand * lead * (1 + ss)) / cap
        loop.calculated_cards = int(cards) + 1 # Round up safety
    
    session.add(loop)
    session.commit()
    session.refresh(loop)
    return loop
