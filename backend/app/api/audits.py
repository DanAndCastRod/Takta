from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List
from ..db import get_session
from ..models import AuditInstance, AuditScore

router = APIRouter(prefix="/audits", tags=["Audits"])

@router.post("/", response_model=AuditInstance)
def create_audit(audit: AuditInstance, session: Session = Depends(get_session)):
    session.add(audit)
    session.commit()
    session.refresh(audit)
    return audit

@router.get("/asset/{asset_id}", response_model=List[AuditInstance])
def read_asset_audits(asset_id: str, session: Session = Depends(get_session)):
    return session.exec(select(AuditInstance).where(AuditInstance.asset_id == asset_id)).all()
