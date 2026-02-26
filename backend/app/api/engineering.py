"""
Engineering Router — CRUD for Standards (Triad), Activities, References,
and Time Studies (Chronometer). Sprint 5 + Sprint 6.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select, and_
from pydantic import BaseModel
import uuid as uuid_lib

from ..db import get_session
from ..models import (
    ProcessStandard, StandardActivity, ProductReference,
    TimeStudy, TimingElement, TimingSession, TimingLap, Asset
)
from ..core.auth import get_current_user, require_role, CurrentUser


router = APIRouter(prefix="/api/engineering", tags=["Engineering"])


# ─────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────

# --- Activities ---
class ActivityCreate(BaseModel):
    name: str
    type: str  # Operation, Transport, Inspection, Delay, Storage
    is_value_added: bool = False

class ActivityRead(BaseModel):
    id: str
    name: str
    type: str
    is_value_added: bool

# --- References (SKU) ---
class ReferenceCreate(BaseModel):
    code: str
    description: str
    family: str

class ReferenceRead(BaseModel):
    id: str
    code: str
    description: str
    family: str

# --- Standards (Triad: Asset + Activity + Reference) ---
class StandardCreate(BaseModel):
    asset_id: str
    activity_id: str
    product_reference_id: Optional[str] = None
    standard_time_minutes: Optional[float] = None
    frequency: Optional[str] = None

class StandardUpdate(BaseModel):
    is_active: Optional[bool] = None
    standard_time_minutes: Optional[float] = None
    frequency: Optional[str] = None

class StandardRead(BaseModel):
    id: str
    asset_id: str
    activity_id: str
    product_reference_id: Optional[str] = None
    standard_time_minutes: Optional[float] = None
    frequency: Optional[str] = None
    is_active: bool
    # Denormalized names for display
    asset_name: Optional[str] = None
    activity_name: Optional[str] = None
    reference_code: Optional[str] = None


# ─────────────────────────────────────────────
# Activities CRUD
# ─────────────────────────────────────────────

@router.post("/activities/", response_model=ActivityRead)
def create_activity(
    data: ActivityCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"]))
):
    """Create a new standard activity (Operation, Transport, etc.)."""
    activity = StandardActivity(
        name=data.name,
        type=data.type,
        is_value_added=data.is_value_added
    )
    session.add(activity)
    session.commit()
    session.refresh(activity)
    return ActivityRead(
        id=str(activity.id),
        name=activity.name,
        type=activity.type,
        is_value_added=activity.is_value_added
    )


@router.get("/activities/", response_model=List[ActivityRead])
def list_activities(
    type: Optional[str] = Query(None, description="Filter by activity type"),
    session: Session = Depends(get_session)
):
    """List all standard activities, optionally filtered by type."""
    stmt = select(StandardActivity)
    if type:
        stmt = stmt.where(StandardActivity.type == type)
    activities = session.exec(stmt).all()
    return [
        ActivityRead(
            id=str(a.id), name=a.name, type=a.type,
            is_value_added=a.is_value_added
        )
        for a in activities
    ]


# ─────────────────────────────────────────────
# References (SKU) CRUD
# ─────────────────────────────────────────────

@router.post("/references/", response_model=ReferenceRead)
def create_reference(
    data: ReferenceCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"]))
):
    """Create a new product reference (SKU). Code must be unique."""
    # Check uniqueness
    existing = session.exec(
        select(ProductReference).where(ProductReference.code == data.code)
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Reference with code '{data.code}' already exists."
        )

    ref = ProductReference(
        code=data.code,
        description=data.description,
        family=data.family
    )
    session.add(ref)
    session.commit()
    session.refresh(ref)
    return ReferenceRead(
        id=str(ref.id), code=ref.code,
        description=ref.description, family=ref.family
    )


@router.get("/references/", response_model=List[ReferenceRead])
def list_references(
    search: Optional[str] = Query(None, description="Search by code or description"),
    family: Optional[str] = Query(None, description="Filter by family"),
    session: Session = Depends(get_session)
):
    """List product references with optional search and family filter."""
    stmt = select(ProductReference)
    if family:
        stmt = stmt.where(ProductReference.family == family)
    refs = session.exec(stmt).all()

    results = []
    for r in refs:
        if search:
            q = search.lower()
            if q not in r.code.lower() and q not in r.description.lower():
                continue
        results.append(
            ReferenceRead(
                id=str(r.id), code=r.code,
                description=r.description, family=r.family
            )
        )
    return results


# ─────────────────────────────────────────────
# Standards (Triad) CRUD
# ─────────────────────────────────────────────

@router.post("/standards/", response_model=StandardRead)
def create_standard(
    data: StandardCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"]))
):
    """
    Create a new process standard (Triad: Asset + Activity + Reference).
    Verifies uniqueness of the combination.
    """
    asset_uuid = uuid_lib.UUID(data.asset_id)
    activity_uuid = uuid_lib.UUID(data.activity_id)
    ref_uuid = uuid_lib.UUID(data.product_reference_id) if data.product_reference_id else None

    # Verify asset exists
    asset = session.get(Asset, asset_uuid)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    # Verify activity exists
    activity = session.get(StandardActivity, activity_uuid)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found.")

    # Verify reference exists (if provided)
    reference = None
    if ref_uuid:
        reference = session.get(ProductReference, ref_uuid)
        if not reference:
            raise HTTPException(status_code=404, detail="Product reference not found.")

    # Check uniqueness of the triad
    uniqueness_conditions = [
        ProcessStandard.asset_id == asset_uuid,
        ProcessStandard.activity_id == activity_uuid,
    ]
    if ref_uuid:
        uniqueness_conditions.append(ProcessStandard.product_reference_id == ref_uuid)
    else:
        uniqueness_conditions.append(ProcessStandard.product_reference_id == None)  # noqa: E711

    existing = session.exec(
        select(ProcessStandard).where(and_(*uniqueness_conditions))
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail="A standard with this Asset + Activity + Reference combination already exists."
        )

    standard = ProcessStandard(
        asset_id=asset_uuid,
        activity_id=activity_uuid,
        product_reference_id=ref_uuid,
        standard_time_minutes=data.standard_time_minutes,
        frequency=data.frequency,
        is_active=True
    )
    session.add(standard)
    session.commit()
    session.refresh(standard)

    return StandardRead(
        id=str(standard.id),
        asset_id=str(standard.asset_id),
        activity_id=str(standard.activity_id),
        product_reference_id=str(standard.product_reference_id) if standard.product_reference_id else None,
        standard_time_minutes=standard.standard_time_minutes,
        frequency=standard.frequency,
        is_active=standard.is_active,
        asset_name=asset.name,
        activity_name=activity.name,
        reference_code=reference.code if reference else None
    )


@router.get("/standards/", response_model=List[StandardRead])
def list_standards(
    asset_id: Optional[str] = Query(None, description="Filter standards by asset UUID"),
    session: Session = Depends(get_session)
):
    """List process standards, optionally filtered by asset."""
    stmt = select(ProcessStandard)
    if asset_id:
        stmt = stmt.where(ProcessStandard.asset_id == uuid_lib.UUID(asset_id))
    standards = session.exec(stmt).all()

    results = []
    for s in standards:
        # Resolve names for display
        asset = session.get(Asset, s.asset_id)
        activity = session.get(StandardActivity, s.activity_id)
        reference = session.get(ProductReference, s.product_reference_id) if s.product_reference_id else None

        results.append(StandardRead(
            id=str(s.id),
            asset_id=str(s.asset_id),
            activity_id=str(s.activity_id),
            product_reference_id=str(s.product_reference_id) if s.product_reference_id else None,
            standard_time_minutes=s.standard_time_minutes,
            frequency=s.frequency,
            is_active=s.is_active,
            asset_name=asset.name if asset else None,
            activity_name=activity.name if activity else None,
            reference_code=reference.code if reference else None
        ))
    return results


@router.get("/standards/{standard_id}", response_model=StandardRead)
def get_standard(
    standard_id: str,
    session: Session = Depends(get_session)
):
    """Get a single process standard by ID."""
    standard = session.get(ProcessStandard, uuid_lib.UUID(standard_id))
    if not standard:
        raise HTTPException(status_code=404, detail="Standard not found.")

    asset = session.get(Asset, standard.asset_id)
    activity = session.get(StandardActivity, standard.activity_id)
    reference = session.get(ProductReference, standard.product_reference_id) if standard.product_reference_id else None

    return StandardRead(
        id=str(standard.id),
        asset_id=str(standard.asset_id),
        activity_id=str(standard.activity_id),
        product_reference_id=str(standard.product_reference_id) if standard.product_reference_id else None,
        standard_time_minutes=standard.standard_time_minutes,
        frequency=standard.frequency,
        is_active=standard.is_active,
        asset_name=asset.name if asset else None,
        activity_name=activity.name if activity else None,
        reference_code=reference.code if reference else None
    )


@router.patch("/standards/{standard_id}", response_model=StandardRead)
def update_standard(
    standard_id: str,
    data: StandardUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"]))
):
    """Update a process standard (activate/deactivate, update time or frequency)."""
    standard = session.get(ProcessStandard, uuid_lib.UUID(standard_id))
    if not standard:
        raise HTTPException(status_code=404, detail="Standard not found.")

    if data.is_active is not None:
        standard.is_active = data.is_active
    if data.standard_time_minutes is not None:
        standard.standard_time_minutes = data.standard_time_minutes
    if data.frequency is not None:
        standard.frequency = data.frequency

    session.add(standard)
    session.commit()
    session.refresh(standard)

    asset = session.get(Asset, standard.asset_id)
    activity = session.get(StandardActivity, standard.activity_id)
    reference = session.get(ProductReference, standard.product_reference_id) if standard.product_reference_id else None

    return StandardRead(
        id=str(standard.id),
        asset_id=str(standard.asset_id),
        activity_id=str(standard.activity_id),
        product_reference_id=str(standard.product_reference_id) if standard.product_reference_id else None,
        standard_time_minutes=standard.standard_time_minutes,
        frequency=standard.frequency,
        is_active=standard.is_active,
        asset_name=asset.name if asset else None,
        activity_name=activity.name if activity else None,
        reference_code=reference.code if reference else None
    )


# ─────────────────────────────────────────────
# Time Studies — Sprint 6: Chronometer API
# ─────────────────────────────────────────────

class ElementCreate(BaseModel):
    name: str
    type: str = "operation"     # operation | transport | inspection | delay | storage
    is_cyclic: bool = True
    order: int


class StudyCreate(BaseModel):
    name: str
    analyst_name: str
    process_standard_id: Optional[str] = None
    study_type: str = "continuous"   # continuous | snap_back | work_sampling
    rating_factor: float = 1.0
    supplements_pct: float = 0.0
    elements: List[ElementCreate]


class LapRecord(BaseModel):
    element_id: str
    cycle_number: int
    split_time_ms: float
    lap_time_ms: Optional[float] = None
    units_count: int = 1
    is_abnormal: bool = False
    notes: Optional[str] = None


@router.post("/studies/", response_model=dict)
def create_time_study(
    data: StudyCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"]))
):
    """Create a time study with pre-mapped elements for the chronometer."""
    study = TimeStudy(
        name=data.name,
        analyst_name=data.analyst_name,
        study_type=data.study_type,
        rating_factor=data.rating_factor,
        supplements_pct=data.supplements_pct,
        status="draft",
    )
    if data.process_standard_id:
        study.process_standard_id = uuid_lib.UUID(data.process_standard_id)

    session.add(study)
    session.commit()
    session.refresh(study)

    # Create elements
    for elem_data in data.elements:
        elem = TimingElement(
            time_study_id=study.id,
            name=elem_data.name,
            type=elem_data.type,
            is_cyclic=elem_data.is_cyclic,
            order=elem_data.order,
        )
        session.add(elem)

    session.commit()
    session.refresh(study)

    return {
        "id": str(study.id),
        "name": study.name,
        "status": study.status,
        "elements_count": len(data.elements),
    }


@router.get("/studies/", response_model=List[dict])
def list_time_studies(session: Session = Depends(get_session)):
    """List all time studies."""
    studies = session.exec(select(TimeStudy).order_by(TimeStudy.study_date.desc())).all()  # type: ignore
    return [
        {
            "id": str(s.id),
            "name": s.name,
            "analyst_name": s.analyst_name,
            "study_type": s.study_type,
            "status": s.status,
            "study_date": s.study_date.isoformat(),
        }
        for s in studies
    ]


@router.get("/studies/{study_id}", response_model=dict)
def get_time_study(study_id: str, session: Session = Depends(get_session)):
    """Get a time study with its elements and sessions."""
    study = session.get(TimeStudy, uuid_lib.UUID(study_id))
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    elements = session.exec(
        select(TimingElement)
        .where(TimingElement.time_study_id == study.id)
        .order_by(TimingElement.order)
    ).all()

    sessions_db = session.exec(
        select(TimingSession).where(TimingSession.time_study_id == study.id)
    ).all()

    sessions_data = []
    for sess in sessions_db:
        laps = session.exec(
            select(TimingLap).where(TimingLap.session_id == sess.id)
        ).all()
        sessions_data.append({
            "id": str(sess.id),
            "started_at": sess.started_at.isoformat(),
            "ended_at": sess.ended_at.isoformat() if sess.ended_at else None,
            "laps_count": len(laps),
            "laps": [
                {
                    "id": str(l.id),
                    "element_id": str(l.element_id),
                    "cycle_number": l.cycle_number,
                    "split_time_ms": l.split_time_ms,
                    "lap_time_ms": l.lap_time_ms,
                    "units_count": l.units_count,
                    "is_abnormal": l.is_abnormal,
                    "notes": l.notes,
                }
                for l in laps
            ],
        })

    return {
        "id": str(study.id),
        "name": study.name,
        "analyst_name": study.analyst_name,
        "study_type": study.study_type,
        "status": study.status,
        "rating_factor": study.rating_factor,
        "supplements_pct": study.supplements_pct,
        "elements": [
            {
                "id": str(e.id),
                "name": e.name,
                "type": e.type,
                "is_cyclic": e.is_cyclic,
                "order": e.order,
            }
            for e in elements
        ],
        "sessions": sessions_data,
    }


@router.post("/studies/{study_id}/sessions", response_model=dict)
def start_session(
    study_id: str,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"]))
):
    """Start a new field recording session for a study."""
    study = session.get(TimeStudy, uuid_lib.UUID(study_id))
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    study.status = "in_progress"

    timing_session = TimingSession(time_study_id=study.id)
    session.add(timing_session)
    session.commit()
    session.refresh(timing_session)

    return {"session_id": str(timing_session.id), "started_at": timing_session.started_at.isoformat()}


@router.post("/studies/{study_id}/laps", response_model=dict)
def record_lap(
    study_id: str,
    data: LapRecord,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer"]))
):
    """Record an individual lap (timing observation)."""
    study = session.get(TimeStudy, uuid_lib.UUID(study_id))
    if not study:
        raise HTTPException(status_code=404, detail="Study not found")

    # Get the active (latest) session
    sessions_q = session.exec(
        select(TimingSession)
        .where(TimingSession.time_study_id == study.id)
        .where(TimingSession.ended_at == None)  # noqa: E711
        .order_by(TimingSession.started_at.desc())  # type: ignore
    ).all()

    if not sessions_q:
        raise HTTPException(status_code=400, detail="No active session. Start a session first.")

    active_session = sessions_q[0]

    lap = TimingLap(
        session_id=active_session.id,
        element_id=uuid_lib.UUID(data.element_id),
        cycle_number=data.cycle_number,
        split_time_ms=data.split_time_ms,
        lap_time_ms=data.lap_time_ms,
        units_count=data.units_count,
        is_abnormal=data.is_abnormal,
        notes=data.notes,
    )
    session.add(lap)
    session.commit()
    session.refresh(lap)

    return {"lap_id": str(lap.id), "cycle_number": lap.cycle_number, "split_time_ms": lap.split_time_ms}


@router.get("/studies/{study_id}/results", response_model=dict)
def get_study_results(study_id: str, session: Session = Depends(get_session)):
    """
    Calculate TN (Normal Time) and TE (Standard Time) per element.
    Uses Nievel methodology with automatic outlier detection.
    """
    from ..services.timing_engine import TimingEngine
    engine = TimingEngine(session)
    result = engine.calculate_results(uuid_lib.UUID(study_id))

    if "error" in result:
        raise HTTPException(status_code=404, detail=result["error"])

    return result

