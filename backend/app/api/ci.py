from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from ..db import get_session
from ..models import ImprovementAction

router = APIRouter(prefix="/ci", tags=["Continuous Improvement"])

@router.post("/actions/", response_model=ImprovementAction)
def create_action(action: ImprovementAction, session: Session = Depends(get_session)):
    session.add(action)
    session.commit()
    session.refresh(action)
    return action

@router.get("/actions/", response_model=List[ImprovementAction])
def read_actions(status: str = None, session: Session = Depends(get_session)):
    query = select(ImprovementAction)
    if status:
        query = query.where(ImprovementAction.status == status)
    return session.exec(query).all()

@router.put("/actions/{action_id}", response_model=ImprovementAction)
def close_action(action_id: str, session: Session = Depends(get_session)):
    action = session.get(ImprovementAction, action_id)
    if action:
        action.status = "Closed"
        session.add(action)
        session.commit()
        session.refresh(action)
    return action
