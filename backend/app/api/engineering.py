from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from ..db import get_session
from ..models import ProcessStandard, TimeStudy, ProductReference, StandardActivity

router = APIRouter(prefix="/engineering", tags=["Engineering"])

# --- Standards (The Triad) ---

@router.post("/standards/", response_model=ProcessStandard)
def create_standard(standard: ProcessStandard, session: Session = Depends(get_session)):
    session.add(standard)
    session.commit()
    session.refresh(standard)
    return standard

@router.get("/standards/", response_model=List[ProcessStandard])
def read_standards(session: Session = Depends(get_session)):
    return session.exec(select(ProcessStandard)).all()

# --- Time Studies ---

@router.post("/studies/", response_model=TimeStudy)
def create_time_study(study: TimeStudy, session: Session = Depends(get_session)):
    # Here we should implement the calculation logic (Normal Time = Observed * Rating)
    # For now, we assume frontend sends calculated values or we calculate simple logic
    if study.calculated_standard_time == 0:
        base_tn = study.observed_time_avg * study.rating_factor
        study.calculated_standard_time = base_tn * (1 + study.allowance_factor)
    
    session.add(study)
    session.commit()
    session.refresh(study)
    return study

@router.get("/studies/", response_model=List[TimeStudy])
def read_time_studies(session: Session = Depends(get_session)):
    return session.exec(select(TimeStudy)).all()
