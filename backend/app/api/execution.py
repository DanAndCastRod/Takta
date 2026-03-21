"""
Execution Router - Sprint 7/8 MVP
Production logs, downtime events, operators, and skills matrix.
"""
from datetime import datetime, date
from typing import List, Optional
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field as PydanticField
from sqlmodel import Session, select

from ..db import get_session
from ..models import (
    Asset,
    ExecutionContextRule,
    OperatorStationAssignment,
    ProductionLog,
    DowntimeEvent,
    Operator,
    OperatorSkill,
    StandardActivity,
)
from ..core.auth import get_current_user, require_role, CurrentUser


router = APIRouter(
    prefix="/api/execution",
    tags=["Execution"],
    dependencies=[Depends(get_current_user)],
)


# ---------- Schemas: Production Logs ----------
class ProductionLogCreate(BaseModel):
    asset_id: uuid.UUID
    shift: str
    event_type: str
    event_time: Optional[datetime] = None
    quantity_produced: Optional[int] = None
    notes: Optional[str] = None
    operator_id: Optional[uuid.UUID] = None


class ProductionLogRead(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    asset_name: Optional[str] = None
    shift: str
    event_type: str
    event_time: datetime
    quantity_produced: Optional[int] = None
    notes: Optional[str] = None
    operator_id: Optional[uuid.UUID] = None
    operator_name: Optional[str] = None
    created_by: str


# ---------- Schemas: Downtime ----------
class DowntimeCreate(BaseModel):
    asset_id: uuid.UUID
    downtime_type: str
    start_time: Optional[datetime] = None
    root_cause: Optional[str] = None
    diagnosis: Optional[str] = None


class DowntimeClose(BaseModel):
    end_time: Optional[datetime] = None
    root_cause: Optional[str] = None
    diagnosis: Optional[str] = None


class DowntimeRead(BaseModel):
    id: uuid.UUID
    asset_id: uuid.UUID
    asset_name: Optional[str] = None
    downtime_type: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[float] = None
    root_cause: Optional[str] = None
    diagnosis: Optional[str] = None
    reported_by: str


# ---------- Schemas: Operators / Skills ----------
class OperatorCreate(BaseModel):
    employee_code: str
    full_name: str
    default_area_id: Optional[uuid.UUID] = None
    shift: str = "Rotativo"
    is_active: bool = True
    hire_date: Optional[date] = None
    restrictions: Optional[str] = None


class OperatorUpdate(BaseModel):
    full_name: Optional[str] = None
    default_area_id: Optional[uuid.UUID] = None
    shift: Optional[str] = None
    is_active: Optional[bool] = None
    hire_date: Optional[date] = None
    restrictions: Optional[str] = None


class OperatorRead(BaseModel):
    id: uuid.UUID
    employee_code: str
    full_name: str
    default_area_id: Optional[uuid.UUID] = None
    default_area_name: Optional[str] = None
    shift: str
    is_active: bool
    hire_date: Optional[date] = None
    restrictions: Optional[str] = None


class SkillCreate(BaseModel):
    operator_id: uuid.UUID
    activity_id: uuid.UUID
    skill_level: int = PydanticField(ge=1, le=4)
    certified_date: Optional[date] = None


class SkillUpdate(BaseModel):
    skill_level: Optional[int] = PydanticField(default=None, ge=1, le=4)
    certified_date: Optional[date] = None


class SkillRead(BaseModel):
    id: uuid.UUID
    operator_id: uuid.UUID
    operator_name: Optional[str] = None
    activity_id: uuid.UUID
    activity_name: Optional[str] = None
    skill_level: int
    certified_date: Optional[date] = None


def _map_log(session: Session, log: ProductionLog) -> ProductionLogRead:
    asset = session.get(Asset, log.asset_id)
    operator = session.get(Operator, log.operator_id) if log.operator_id else None
    return ProductionLogRead(
        id=log.id,
        asset_id=log.asset_id,
        asset_name=asset.name if asset else None,
        shift=log.shift,
        event_type=log.event_type,
        event_time=log.event_time,
        quantity_produced=log.quantity_produced,
        notes=log.notes,
        operator_id=log.operator_id,
        operator_name=operator.full_name if operator else None,
        created_by=log.created_by,
    )


def _map_downtime(session: Session, event: DowntimeEvent) -> DowntimeRead:
    asset = session.get(Asset, event.asset_id)
    return DowntimeRead(
        id=event.id,
        asset_id=event.asset_id,
        asset_name=asset.name if asset else None,
        downtime_type=event.downtime_type,
        start_time=event.start_time,
        end_time=event.end_time,
        duration_minutes=event.duration_minutes,
        root_cause=event.root_cause,
        diagnosis=event.diagnosis,
        reported_by=event.reported_by,
    )


def _map_operator(session: Session, op: Operator) -> OperatorRead:
    area = session.get(Asset, op.default_area_id) if op.default_area_id else None
    return OperatorRead(
        id=op.id,
        employee_code=op.employee_code,
        full_name=op.full_name,
        default_area_id=op.default_area_id,
        default_area_name=area.name if area else None,
        shift=op.shift,
        is_active=op.is_active,
        hire_date=op.hire_date,
        restrictions=op.restrictions,
    )


def _map_skill(session: Session, skill: OperatorSkill) -> SkillRead:
    operator = session.get(Operator, skill.operator_id)
    activity = session.get(StandardActivity, skill.activity_id)
    return SkillRead(
        id=skill.id,
        operator_id=skill.operator_id,
        operator_name=operator.full_name if operator else None,
        activity_id=skill.activity_id,
        activity_name=activity.name if activity else None,
        skill_level=skill.skill_level,
        certified_date=skill.certified_date,
    )


# ---------- Production Logs ----------
@router.post(
    "/logs",
    response_model=ProductionLogRead,
)
def create_production_log(
    payload: ProductionLogCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    asset = session.get(Asset, payload.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    if payload.operator_id and not session.get(Operator, payload.operator_id):
        raise HTTPException(status_code=404, detail="Operator not found")

    log = ProductionLog(
        asset_id=payload.asset_id,
        shift=payload.shift,
        event_type=payload.event_type,
        event_time=payload.event_time or datetime.utcnow(),
        quantity_produced=payload.quantity_produced,
        notes=payload.notes,
        operator_id=payload.operator_id,
        created_by=user.username,
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return _map_log(session, log)


@router.get("/logs", response_model=List[ProductionLogRead])
def list_production_logs(
    asset_id: Optional[uuid.UUID] = None,
    shift: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    limit: int = Query(default=200, le=1000),
    session: Session = Depends(get_session),
):
    stmt = select(ProductionLog)
    if asset_id:
        stmt = stmt.where(ProductionLog.asset_id == asset_id)
    if shift:
        stmt = stmt.where(ProductionLog.shift == shift)
    if date_from:
        stmt = stmt.where(ProductionLog.event_time >= date_from)
    if date_to:
        stmt = stmt.where(ProductionLog.event_time <= date_to)

    logs = session.exec(stmt.order_by(ProductionLog.event_time.desc()).limit(limit)).all()
    return [_map_log(session, log) for log in logs]


@router.delete("/logs/{log_id}", status_code=204)
def delete_production_log(
    log_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    log = session.get(ProductionLog, log_id)
    if not log:
        raise HTTPException(status_code=404, detail="Production log not found")

    session.delete(log)
    session.commit()


# ---------- Downtime ----------
@router.post("/downtimes", response_model=DowntimeRead)
def create_downtime_event(
    payload: DowntimeCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    asset = session.get(Asset, payload.asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")

    event = DowntimeEvent(
        asset_id=payload.asset_id,
        downtime_type=payload.downtime_type,
        start_time=payload.start_time or datetime.utcnow(),
        root_cause=payload.root_cause,
        diagnosis=payload.diagnosis,
        reported_by=user.username,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return _map_downtime(session, event)


@router.get("/downtimes", response_model=List[DowntimeRead])
def list_downtime_events(
    asset_id: Optional[uuid.UUID] = None,
    open_only: bool = False,
    limit: int = Query(default=200, le=1000),
    session: Session = Depends(get_session),
):
    stmt = select(DowntimeEvent)
    if asset_id:
        stmt = stmt.where(DowntimeEvent.asset_id == asset_id)
    if open_only:
        stmt = stmt.where(DowntimeEvent.end_time == None)  # noqa: E711

    events = session.exec(stmt.order_by(DowntimeEvent.start_time.desc()).limit(limit)).all()
    return [_map_downtime(session, event) for event in events]


@router.patch("/downtimes/{event_id}/close", response_model=DowntimeRead)
def close_downtime_event(
    event_id: uuid.UUID,
    payload: DowntimeClose,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    event = session.get(DowntimeEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Downtime event not found")

    event.end_time = payload.end_time or datetime.utcnow()
    if event.end_time < event.start_time:
        raise HTTPException(status_code=400, detail="end_time cannot be before start_time")

    duration = event.end_time - event.start_time
    event.duration_minutes = round(duration.total_seconds() / 60.0, 2)
    if payload.root_cause is not None:
        event.root_cause = payload.root_cause
    if payload.diagnosis is not None:
        event.diagnosis = payload.diagnosis

    session.add(event)
    session.commit()
    session.refresh(event)
    return _map_downtime(session, event)


@router.delete("/downtimes/{event_id}", status_code=204)
def delete_downtime_event(
    event_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    event = session.get(DowntimeEvent, event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Downtime event not found")

    session.delete(event)
    session.commit()


# ---------- Staff ----------
@router.post("/staff/operators", response_model=OperatorRead)
def create_operator(
    payload: OperatorCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    existing = session.exec(
        select(Operator).where(Operator.employee_code == payload.employee_code)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Employee code already exists")

    if payload.default_area_id and not session.get(Asset, payload.default_area_id):
        raise HTTPException(status_code=404, detail="Default area asset not found")

    op = Operator(
        employee_code=payload.employee_code,
        full_name=payload.full_name,
        default_area_id=payload.default_area_id,
        shift=payload.shift,
        is_active=payload.is_active,
        hire_date=payload.hire_date,
        restrictions=payload.restrictions,
    )
    session.add(op)
    session.commit()
    session.refresh(op)
    return _map_operator(session, op)


@router.get("/staff/operators", response_model=List[OperatorRead])
def list_operators(
    active_only: bool = False,
    session: Session = Depends(get_session),
):
    stmt = select(Operator)
    if active_only:
        stmt = stmt.where(Operator.is_active == True)  # noqa: E712
    ops = session.exec(stmt.order_by(Operator.full_name)).all()
    return [_map_operator(session, op) for op in ops]


@router.patch("/staff/operators/{operator_id}", response_model=OperatorRead)
def update_operator(
    operator_id: uuid.UUID,
    payload: OperatorUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    op = session.get(Operator, operator_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")

    if payload.default_area_id and not session.get(Asset, payload.default_area_id):
        raise HTTPException(status_code=404, detail="Default area asset not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(op, key, value)

    session.add(op)
    session.commit()
    session.refresh(op)
    return _map_operator(session, op)


@router.delete("/staff/operators/{operator_id}", status_code=204)
def delete_operator(
    operator_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    op = session.get(Operator, operator_id)
    if not op:
        raise HTTPException(status_code=404, detail="Operator not found")

    # Keep production history but detach operator reference.
    logs = session.exec(
        select(ProductionLog).where(ProductionLog.operator_id == operator_id)
    ).all()
    for log in logs:
        log.operator_id = None
        session.add(log)

    skills = session.exec(
        select(OperatorSkill).where(OperatorSkill.operator_id == operator_id)
    ).all()
    for skill in skills:
        session.delete(skill)

    session.delete(op)
    session.commit()


@router.post("/staff/skills", response_model=SkillRead)
def create_operator_skill(
    payload: SkillCreate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    operator = session.get(Operator, payload.operator_id)
    if not operator:
        raise HTTPException(status_code=404, detail="Operator not found")

    activity = session.get(StandardActivity, payload.activity_id)
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")

    existing = session.exec(
        select(OperatorSkill)
        .where(OperatorSkill.operator_id == payload.operator_id)
        .where(OperatorSkill.activity_id == payload.activity_id)
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Skill already exists for this operator/activity")

    skill = OperatorSkill(
        operator_id=payload.operator_id,
        activity_id=payload.activity_id,
        skill_level=payload.skill_level,
        certified_date=payload.certified_date,
    )
    session.add(skill)
    session.commit()
    session.refresh(skill)
    return _map_skill(session, skill)


@router.get("/staff/{operator_id}/skills", response_model=List[SkillRead])
def list_operator_skills(
    operator_id: uuid.UUID,
    session: Session = Depends(get_session),
):
    skills = session.exec(
        select(OperatorSkill)
        .where(OperatorSkill.operator_id == operator_id)
        .order_by(OperatorSkill.skill_level.desc())
    ).all()
    return [_map_skill(session, skill) for skill in skills]


@router.patch("/staff/skills/{skill_id}", response_model=SkillRead)
def update_operator_skill(
    skill_id: uuid.UUID,
    payload: SkillUpdate,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    skill = session.get(OperatorSkill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        setattr(skill, key, value)

    session.add(skill)
    session.commit()
    session.refresh(skill)
    return _map_skill(session, skill)


@router.delete("/staff/skills/{skill_id}", status_code=204)
def delete_operator_skill(
    skill_id: uuid.UUID,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(require_role(["admin", "engineer", "supervisor"])),
):
    skill = session.get(OperatorSkill, skill_id)
    if not skill:
        raise HTTPException(status_code=404, detail="Skill not found")

    session.delete(skill)
    session.commit()


# ---------- Context ----------
@router.get("/context/me")
def get_my_execution_context(
    shift: Optional[str] = None,
    session: Session = Depends(get_session),
    user: CurrentUser = Depends(get_current_user),
):
    """
    Returns suggested default area/work context for the logged user.
    """
    area_asset = None
    if user.area_id:
        try:
            area_asset = session.get(Asset, uuid.UUID(user.area_id))
        except ValueError:
            area_asset = None

    selected_rule = None
    context_payload = {}
    rules = session.exec(
        select(ExecutionContextRule)
        .where(ExecutionContextRule.is_active == True)  # noqa: E712
        .order_by(ExecutionContextRule.priority.asc(), ExecutionContextRule.created_at.desc())
    ).all()
    for rule in rules:
        if rule.role and rule.role != user.role:
            continue
        if rule.shift and shift and rule.shift != shift:
            continue
        if rule.shift and not shift:
            continue
        selected_rule = rule
        if selected_rule.asset_id:
            area_asset = session.get(Asset, selected_rule.asset_id)
        context_payload = json.loads(selected_rule.context_json or "{}")
        break

    if not area_asset:
        assignments = session.exec(
            select(OperatorStationAssignment)
            .where(OperatorStationAssignment.status == "Active")
            .order_by(OperatorStationAssignment.starts_at.desc())
            .limit(1)
        ).all()
        if assignments:
            area_asset = session.get(Asset, assignments[0].asset_id)

    if not area_asset:
        assets = session.exec(select(Asset).limit(500)).all()
        area_asset = next(
            (a for a in assets if a.type.lower() in {"area", "linea", "línea", "puesto"}),
            None,
        )

    return {
        "username": user.username,
        "role": user.role,
        "shift": shift,
        "area_id": str(area_asset.id) if area_asset else None,
        "area_name": area_asset.name if area_asset else None,
        "rule_id": str(selected_rule.id) if selected_rule else None,
        "context": context_payload,
    }
