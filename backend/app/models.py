from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime, date
from sqlalchemy import Column, Text
import uuid

# --- Enums (implied as strings) ---
# Action Status: "Open", "In Progress", "Closed", "Verified"
# Audit Types: "5S", "Quality", "Safety"

# --- Base Models ---

class AssetBase(SQLModel):
    name: str = Field(index=True)
    type: str  # Sede, Planta, Linea, Maquina, Componente
    description: Optional[str] = None
    parent_id: Optional[uuid.UUID] = Field(default=None, foreign_key="asset.id")

class Asset(AssetBase, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    
    # Hierarchy
    parent: Optional["Asset"] = Relationship(back_populates="children", sa_relationship_kwargs={"remote_side": "Asset.id"})
    children: List["Asset"] = Relationship(back_populates="parent")

    # Relationships
    process_standards: List["ProcessStandard"] = Relationship(back_populates="asset")
    audits: List["AuditInstance"] = Relationship(back_populates="asset")
    improvement_actions: List["ImprovementAction"] = Relationship(back_populates="asset")
    production_logs: List["ProductionLog"] = Relationship(back_populates="asset")
    downtime_events: List["DowntimeEvent"] = Relationship(back_populates="asset")


class ProductReferenceBase(SQLModel):
    code: str = Field(unique=True, index=True) # SKU
    description: str
    family: str
    uom: Optional[str] = None  # Unidad de medida base (kg, und, L)
    packaging_uom: Optional[str] = None  # Unidad de empaque (caja, bolsa, pallet)

class ProductReference(ProductReferenceBase, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    process_standards: List["ProcessStandard"] = Relationship(back_populates="product_reference")


class StandardActivityBase(SQLModel):
    name: str
    type: str # Operation, Transport, Inspection...
    is_value_added: bool = False

class StandardActivity(StandardActivityBase, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    process_standards: List["ProcessStandard"] = Relationship(back_populates="activity")
    operator_skills: List["OperatorSkill"] = Relationship(back_populates="activity")


# --- The "Triad" (Standard Definition) ---

class ProcessStandard(SQLModel, table=True):
    """
    Intersection of Asset + Activity + SKU.
    Defines HOW a product is processed at a specific machine.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    
    asset_id: uuid.UUID = Field(foreign_key="asset.id")
    activity_id: uuid.UUID = Field(foreign_key="standardactivity.id")
    product_reference_id: Optional[uuid.UUID] = Field(default=None, foreign_key="productreference.id") 

    standard_time_minutes: Optional[float] = None
    frequency: Optional[str] = None
    is_active: bool = True

    # Relationships
    asset: Asset = Relationship(back_populates="process_standards")
    activity: StandardActivity = Relationship(back_populates="process_standards")
    product_reference: Optional[ProductReference] = Relationship(back_populates="process_standards")
    
    time_studies: List["TimeStudy"] = Relationship(back_populates="process_standard")

    # Sprint 5.5: Capacity unit parameterization
    capacity_unit: Optional[str] = None  # "kg/h", "und/h", "cajas/h"


# --- Engineering: Time Studies (Sprint 6 — Element-Based Design) ---

class AssetActivityContext(SQLModel, table=True):
    """
    Restricts which activities are valid for a specific asset context.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    asset_id: uuid.UUID = Field(foreign_key="asset.id", index=True)
    activity_id: uuid.UUID = Field(foreign_key="standardactivity.id", index=True)
    source: str = "manual"  # manual | inherited | imported
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ProcessStandardDependency(SQLModel, table=True):
    """
    Sequencing dependency between standards to represent precedence constraints.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    asset_id: uuid.UUID = Field(foreign_key="asset.id", index=True)
    predecessor_standard_id: uuid.UUID = Field(foreign_key="processstandard.id", index=True)
    successor_standard_id: uuid.UUID = Field(foreign_key="processstandard.id", index=True)
    min_wait_minutes: float = 0.0
    is_mandatory: bool = True
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CapacityStaffingHistory(SQLModel, table=True):
    """
    Stores advanced staffing calculations and semaforizacion snapshots.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    asset_id: uuid.UUID = Field(foreign_key="asset.id", index=True)
    demand: float
    hours_per_shift: float = 8.0
    shifts_per_day: int = 1
    mechanical_factor: float = 1.0
    manual_factor: float = 1.0
    personnel_required: int
    available_capacity_per_day: float
    utilization_pct: float
    status_color: str = "green"  # green | yellow | red
    scenario_label: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TimeStudy(SQLModel, table=True):
    """
    A pre-configured time study linked to a standard (Triad).
    Contains pre-mapped elements that define the cycle sequence.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    process_standard_id: Optional[uuid.UUID] = Field(default=None, foreign_key="processstandard.id")
    asset_id: Optional[uuid.UUID] = Field(default=None, foreign_key="asset.id")
    product_reference_id: Optional[uuid.UUID] = Field(default=None, foreign_key="productreference.id")

    name: str  # "Estudio Línea Sellado - Pechuga"
    analyst_name: str
    study_type: str = "continuous"  # 'continuous' | 'snap_back' | 'work_sampling'
    study_date: datetime = Field(default_factory=datetime.utcnow)
    status: str = "draft"  # 'draft' | 'in_progress' | 'completed'

    # Calculation config
    rating_factor: float = 1.0       # Performance rating (0.8 - 1.2)
    supplements_pct: float = 0.0     # % allowances (fatigue, personal needs)
    confidence_level: float = 0.95   # 95% or 99%
    sampling_interval_seconds: Optional[int] = None
    sampling_population_size: Optional[int] = None

    # Calculated results (filled after completion)
    calculated_normal_time: Optional[float] = None
    calculated_standard_time: Optional[float] = None

    # Relationships
    process_standard: Optional[ProcessStandard] = Relationship(back_populates="time_studies")
    elements: List["TimingElement"] = Relationship(back_populates="time_study")
    sessions: List["TimingSession"] = Relationship(back_populates="time_study")


class TimingElement(SQLModel, table=True):
    """
    A pre-mapped element of the work cycle (e.g., 'Carga MP', 'Inspección').
    Defines the sequence the stopwatch will follow.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    time_study_id: uuid.UUID = Field(foreign_key="timestudy.id")

    name: str                        # "Carga de materia prima"
    type: str = "operation"          # 'operation' | 'transport' | 'inspection' | 'delay' | 'storage'
    is_cyclic: bool = True           # Repeats every cycle?
    order: int                       # Sequence within cycle (1, 2, 3...)

    time_study: TimeStudy = Relationship(back_populates="elements")
    laps: List["TimingLap"] = Relationship(back_populates="element")


class TimingSession(SQLModel, table=True):
    """
    A field recording session (one visit to the plant floor).
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    time_study_id: uuid.UUID = Field(foreign_key="timestudy.id")

    started_at: datetime = Field(default_factory=datetime.utcnow)
    ended_at: Optional[datetime] = None
    notes: Optional[str] = None

    time_study: TimeStudy = Relationship(back_populates="sessions")
    laps: List["TimingLap"] = Relationship(back_populates="session")


class TimingLap(SQLModel, table=True):
    """
    Individual timing record: one observation of one element in one cycle.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    session_id: uuid.UUID = Field(foreign_key="timingsession.id")
    element_id: uuid.UUID = Field(foreign_key="timingelement.id")

    cycle_number: int                # Which cycle (1, 2, 3...)
    split_time_ms: float             # Time for this element only (ms)
    lap_time_ms: Optional[float] = None  # Cumulative time since cycle start
    units_count: int = 1             # Items produced in this observation
    is_abnormal: bool = False        # Marked as outlier
    notes: Optional[str] = None

    session: TimingSession = Relationship(back_populates="laps")
    element: TimingElement = Relationship(back_populates="laps")


class WorkSamplingObservation(SQLModel, table=True):
    """
    Dedicated observations for work-sampling studies.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    time_study_id: uuid.UUID = Field(foreign_key="timestudy.id", index=True)
    category: str  # productive | non_productive | waiting | setup | quality
    observed_at: datetime = Field(default_factory=datetime.utcnow)
    duration_seconds: Optional[float] = None
    is_abnormal: bool = False
    notes: Optional[str] = None


# --- Execution: Production Logs & Staff Management (Sprint 7-8) ---

class Operator(SQLModel, table=True):
    """
    Operational employee record.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    employee_code: str = Field(unique=True, index=True)
    full_name: str
    default_area_id: Optional[uuid.UUID] = Field(default=None, foreign_key="asset.id")
    shift: str = "Rotativo"  # Manana, Tarde, Noche, Rotativo
    is_active: bool = True
    hire_date: Optional[date] = None
    restrictions: Optional[str] = None

    production_logs: List["ProductionLog"] = Relationship(back_populates="operator")
    skills: List["OperatorSkill"] = Relationship(back_populates="operator")


class OperatorSkill(SQLModel, table=True):
    """
    Multi-skill matrix per operator/activity.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    operator_id: uuid.UUID = Field(foreign_key="operator.id")
    activity_id: uuid.UUID = Field(foreign_key="standardactivity.id")
    skill_level: int = 1  # 1=Aprendiz, 2=Competente, 3=Experto, 4=Puede ensenar
    certified_date: Optional[date] = None

    operator: Operator = Relationship(back_populates="skills")
    activity: StandardActivity = Relationship(back_populates="operator_skills")


class ProductionLog(SQLModel, table=True):
    """
    Production event log by shift.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    asset_id: uuid.UUID = Field(foreign_key="asset.id", index=True)
    shift: str  # Manana, Tarde, Noche
    event_type: str  # start, end, pause, changeover
    event_time: datetime = Field(default_factory=datetime.utcnow)
    quantity_produced: Optional[int] = None
    notes: Optional[str] = None
    operator_id: Optional[uuid.UUID] = Field(default=None, foreign_key="operator.id")
    created_by: str

    asset: Asset = Relationship(back_populates="production_logs")
    operator: Optional[Operator] = Relationship(back_populates="production_logs")


class DowntimeEvent(SQLModel, table=True):
    """
    Downtime and novelty tracking.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    asset_id: uuid.UUID = Field(foreign_key="asset.id", index=True)
    downtime_type: str  # Mecanico, Electrico, Calidad, Cambio de Ref, Programado
    start_time: datetime = Field(default_factory=datetime.utcnow)
    end_time: Optional[datetime] = None
    duration_minutes: Optional[float] = None
    root_cause: Optional[str] = None
    diagnosis: Optional[str] = None
    reported_by: str

    asset: Asset = Relationship(back_populates="downtime_events")


class ExecutionContextRule(SQLModel, table=True):
    """
    Advanced context resolution rules by role/shift/plant (asset).
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    role: Optional[str] = Field(default=None, index=True)
    shift: Optional[str] = Field(default=None, index=True)
    asset_id: Optional[uuid.UUID] = Field(default=None, foreign_key="asset.id", index=True)
    priority: int = 100
    context_json: str = Field(default="{}", sa_column=Column(Text))
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class FailureCatalog(SQLModel, table=True):
    """
    Semantic catalog for voice-to-text normalization.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    code: str = Field(unique=True, index=True)
    name: str
    keywords_json: str = Field(default="[]", sa_column=Column(Text))
    downtime_type: Optional[str] = None
    suggested_root_cause: Optional[str] = None
    severity: Optional[str] = None  # low | medium | high | critical
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class OperatorStationAssignment(SQLModel, table=True):
    """
    Explicit operator to station assignments with history.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    operator_id: uuid.UUID = Field(foreign_key="operator.id", index=True)
    asset_id: uuid.UUID = Field(foreign_key="asset.id", index=True)
    shift: str = Field(index=True)
    starts_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    ends_at: Optional[datetime] = None
    status: str = Field(default="Active", index=True)  # Active | Closed
    notes: Optional[str] = None
    assigned_by: str


class ShiftPlan(SQLModel, table=True):
    """
    Planned assignment by shift/day with optional target quantity.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    plan_date: date = Field(index=True)
    shift: str = Field(index=True)
    asset_id: uuid.UUID = Field(foreign_key="asset.id", index=True)
    operator_id: Optional[uuid.UUID] = Field(default=None, foreign_key="operator.id", index=True)
    target_quantity: Optional[int] = None
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


# --- Continuous Improvement (Action Tracking) ---

class ImprovementAction(SQLModel, table=True):
    """
    Centralized Action Item from Kaizen, A3, 5S, or Audit.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    asset_id: Optional[uuid.UUID] = Field(default=None, foreign_key="asset.id")
    tenant_code: str = Field(default="default", index=True)
    
    source_document: str # e.g., "Kaizen-001" or "5S-Audit-Jan"
    description: str
    responsible: str
    due_date: Optional[date] = None
    status: str = "Open" # Open, In Progress, Closed
    completion_date: Optional[date] = None
    
    asset: Optional[Asset] = Relationship(back_populates="improvement_actions")


class ContinuousImprovementKpiDefinition(SQLModel, table=True):
    """
    Canonical KPI catalog for Continuous Improvement (MC).
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(default="default", index=True)
    code: str = Field(unique=True, index=True)
    focus_area: str = Field(index=True)
    action_line: str = Field(index=True)
    indicator_name: str
    initiative_name: Optional[str] = None
    individual_weight_pct: float = 0.0
    kpi_weight_pct: float = 0.0
    kpi_weight_defined: bool = True
    unit: str = "%"
    notes: Optional[str] = None
    is_active: bool = True
    created_by: str = "system"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ContinuousImprovementKpiMeasurement(SQLModel, table=True):
    """
    Periodic KPI measurement (monthly by default) for MC scorecards.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(default="default", index=True)
    kpi_definition_id: uuid.UUID = Field(
        foreign_key="continuousimprovementkpidefinition.id",
        index=True,
    )
    period_key: str = Field(index=True)  # YYYY-MM
    target_value: Optional[float] = None
    actual_value: Optional[float] = None
    compliance_pct: float = 0.0
    status_color: str = "green"  # green | yellow | red
    notes: Optional[str] = None
    source: str = "manual"
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ActionWorkflow(SQLModel, table=True):
    """
    Approval/verification workflow metadata for an improvement action.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    action_id: uuid.UUID = Field(foreign_key="improvementaction.id", index=True, unique=True)
    workflow_status: str = "Open"  # Open | CloseRequested | Approved | Verified
    close_requested_at: Optional[datetime] = None
    close_requested_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    verification_notes: Optional[str] = None
    evidence_photo_data: Optional[str] = Field(default=None, sa_column=Column(Text))


# --- Audits & Quality (5S / Inspection) ---

class AuditInstance(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    asset_id: uuid.UUID = Field(foreign_key="asset.id")
    
    type: str # "5S", "Safety", "LPA"
    auditor: str
    audit_date: datetime = Field(default_factory=datetime.utcnow)
    total_score: float
    max_possible_score: float
    
    asset: Asset = Relationship(back_populates="audits")
    scores: List["AuditScore"] = Relationship(back_populates="audit")

class AuditScore(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    audit_id: uuid.UUID = Field(foreign_key="auditinstance.id")
    
    category: str # e.g. "Seiri", "Seiton"
    question_text: str
    score_value: int # 1-5
    
    audit: AuditInstance = Relationship(back_populates="scores")


class AuditChecklistTemplate(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    asset_id: Optional[uuid.UUID] = Field(default=None, foreign_key="asset.id", index=True)
    name: str
    type: str = "5S"
    require_photo: bool = False
    items_json: str = Field(default="[]", sa_column=Column(Text))
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AuditEvidence(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    audit_id: uuid.UUID = Field(foreign_key="auditinstance.id", index=True)
    score_id: Optional[uuid.UUID] = Field(default=None, foreign_key="auditscore.id", index=True)
    asset_id: Optional[uuid.UUID] = Field(default=None, foreign_key="asset.id", index=True)
    checklist_item_code: Optional[str] = None
    photo_data: str = Field(sa_column=Column(Text))
    notes: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


# --- Quality: Weight Sampling ---

class WeightSamplingSpec(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(default="default", index=True)
    name: str = Field(index=True)
    asset_id: Optional[uuid.UUID] = Field(default=None, foreign_key="asset.id", index=True)
    product_reference_id: Optional[uuid.UUID] = Field(default=None, foreign_key="productreference.id", index=True)
    process_standard_id: Optional[uuid.UUID] = Field(default=None, foreign_key="processstandard.id", index=True)
    unit: str = "g"  # g | kg
    lower_limit: float
    target_weight: Optional[float] = None
    upper_limit: float
    warning_band_pct: float = 0.1
    sample_size: int = 5
    notes: Optional[str] = None
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class WeightSample(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    specification_id: uuid.UUID = Field(foreign_key="weightsamplingspec.id", index=True)
    measured_value: float
    measured_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    measured_by: str
    batch_code: Optional[str] = None
    shift: Optional[str] = None
    notes: Optional[str] = None
    deviation: Optional[float] = None
    status_color: str = "green"  # green | yellow | red


class NonConformity(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(default="default", index=True)
    asset_id: Optional[uuid.UUID] = Field(default=None, foreign_key="asset.id", index=True)
    product_reference_id: Optional[uuid.UUID] = Field(default=None, foreign_key="productreference.id", index=True)
    process_standard_id: Optional[uuid.UUID] = Field(default=None, foreign_key="processstandard.id", index=True)
    weight_specification_id: Optional[uuid.UUID] = Field(default=None, foreign_key="weightsamplingspec.id", index=True)
    weight_sample_id: Optional[uuid.UUID] = Field(default=None, foreign_key="weightsample.id", index=True)
    source: str = Field(default="manual", index=True)  # manual | spc
    severity: str = Field(default="medium", index=True)  # low | medium | high | critical
    status: str = Field(default="Open", index=True)  # Open | In Progress | Close Requested | Approved | Rejected | Closed | Verified
    title: str
    description: Optional[str] = None
    root_cause: Optional[str] = None
    containment: Optional[str] = None
    detected_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    detected_by: str
    close_requested_at: Optional[datetime] = None
    close_requested_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    rejected_at: Optional[datetime] = None
    rejected_by: Optional[str] = None
    rejected_reason: Optional[str] = None
    closed_at: Optional[datetime] = None
    closed_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CapaAction(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(default="default", index=True)
    non_conformity_id: uuid.UUID = Field(foreign_key="nonconformity.id", index=True)
    improvement_action_id: Optional[uuid.UUID] = Field(default=None, foreign_key="improvementaction.id", index=True)
    action_type: str = Field(default="Corrective", index=True)  # Corrective | Preventive
    title: str
    description: Optional[str] = None
    responsible: str
    due_date: Optional[date] = Field(default=None, index=True)
    status: str = Field(default="Open", index=True)  # Open | In Progress | Close Requested | Approved | Rejected | Closed | Verified
    verification_notes: Optional[str] = None
    close_requested_at: Optional[datetime] = None
    close_requested_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    approved_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    verified_by: Optional[str] = None
    rejected_at: Optional[datetime] = None
    rejected_by: Optional[str] = None
    rejected_reason: Optional[str] = None
    completed_at: Optional[datetime] = None
    completed_by: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class WeightCapabilityRun(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    specification_id: uuid.UUID = Field(foreign_key="weightsamplingspec.id", index=True)
    run_type: str = Field(default="on_demand", index=True)  # on_demand | batch
    triggered_by: str
    triggered_at: datetime = Field(default_factory=datetime.utcnow, index=True)
    limit_window: int = 300
    sample_count: int = 0
    center_line: Optional[float] = None
    sigma_within: Optional[float] = None
    sigma_overall: Optional[float] = None
    cp: Optional[float] = None
    cpk: Optional[float] = None
    pp: Optional[float] = None
    ppk: Optional[float] = None
    capability_status: str = Field(default="insufficient_data", index=True)
    alert_level: Optional[str] = None  # healthy | warning | critical
    improvement_action_id: Optional[uuid.UUID] = Field(default=None, foreign_key="improvementaction.id", index=True)
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


# --- Logistics (Kanban) ---

class KanbanLoop(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    sku_code: str
    asset_origin_id: uuid.UUID # Supply
    asset_dest_id: uuid.UUID   # Demand
    
    container_capacity: int
    daily_demand: float
    lead_time_days: float
    safety_stock_pct: float
    
    calculated_cards: int


class VSMCanvas(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(default="default", index=True)
    name: str = Field(index=True)
    asset_id: Optional[uuid.UUID] = Field(default=None, foreign_key="asset.id", index=True)
    nodes_json: str = Field(default="[]", sa_column=Column(Text))
    edges_json: str = Field(default="[]", sa_column=Column(Text))
    constraints_json: str = Field(default="{}", sa_column=Column(Text))
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# --- Document Engine ---

class FormatTemplate(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    code: str = Field(unique=True) 
    name: str 
    category: str 
    json_schema_structure: Optional[str] = None # Structure validation
    markdown_structure: str 

class FormatInstance(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    template_id: uuid.UUID = Field(foreign_key="formattemplate.id")
    
    asset_id: Optional[uuid.UUID] = Field(default=None, foreign_key="asset.id")
    user_id: str 
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    source_context_json: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    content_json: str # Editor.js stored data


# --- Plant Layout Engine (Takta Visual Editor) ---

class PlantLayout(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(default="default", index=True)
    name: str = Field(index=True)
    description: Optional[str] = None
    
    # Storage
    json_content: str = Field(sa_column=Column(Text)) # Fabric.js JSON
    thumbnail_data: Optional[str] = Field(sa_column=Column(Text)) # Base64 PNG Preview
    
    # Metadata
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Foreign Keys (Future Proofing)
    plant_id: Optional[uuid.UUID] = Field(default=None, foreign_key="asset.id")


# --- Engineering Meetings (Governance Layer) ---

class EngineeringMeeting(SQLModel, table=True):
    """
    Structured weekly acta for Engineering governance.
    Stores dynamic sections as JSON text to keep the model flexible.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    asset_id: Optional[uuid.UUID] = Field(default=None, foreign_key="asset.id")
    tenant_code: str = Field(default="default", index=True)

    title: str = Field(index=True)
    meeting_date: date = Field(index=True)
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    location: Optional[str] = None

    objective: Optional[str] = None
    scope: Optional[str] = None
    out_of_scope: Optional[str] = None
    risks: Optional[str] = None
    key_decisions: Optional[str] = None
    notes: Optional[str] = None
    next_meeting_date: Optional[date] = Field(default=None, index=True)
    status: str = Field(default="Draft", index=True)

    participants_json: str = Field(default="[]", sa_column=Column(Text))
    agenda_json: str = Field(default="[]", sa_column=Column(Text))
    kpis_json: str = Field(default="[]", sa_column=Column(Text))
    focuses_json: str = Field(default="[]", sa_column=Column(Text))
    commitments_json: str = Field(default="[]", sa_column=Column(Text))

    source_module: str = Field(default="meetings")
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    actions_last_sync_at: Optional[datetime] = None


# --- Platform V2: White Label, Feature Flags, Observability ---

class Tenant(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    code: str = Field(unique=True, index=True)
    name: str
    profile: str = Field(default="full", index=True)  # minimal | full | custom
    is_active: bool = True
    created_by: str = "system"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TenantTheme(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(index=True)
    brand_name: str = "TAKTA"
    badge_label: str = "OAC-SEO"
    logo_url: Optional[str] = None
    colors_json: str = Field(default="{}", sa_column=Column(Text))
    typography_json: str = Field(default="{}", sa_column=Column(Text))
    custom_css: Optional[str] = Field(default=None, sa_column=Column(Text))
    updated_by: str = "system"
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TenantUiConfig(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(index=True)
    menu_json: str = Field(default="[]", sa_column=Column(Text))
    modules_json: str = Field(default="{}", sa_column=Column(Text))
    locale: str = "es-CO"
    timezone: str = "America/Bogota"
    updated_by: str = "system"
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TenantFeatureFlag(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(index=True)
    feature_key: str = Field(index=True)
    is_enabled: bool = True
    rollout: str = "ga"  # ga | beta | disabled
    notes: Optional[str] = None
    updated_by: str = "system"
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TenantConfigAudit(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(index=True)
    config_type: str = Field(index=True)  # theme | ui | feature | tenant
    config_key: str = Field(index=True)
    old_value_json: Optional[str] = Field(default=None, sa_column=Column(Text))
    new_value_json: Optional[str] = Field(default=None, sa_column=Column(Text))
    changed_by: str
    changed_at: datetime = Field(default_factory=datetime.utcnow)


class IntegrationEvent(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(default="default", index=True)
    module: str = Field(index=True)
    event_code: str = Field(index=True)
    severity: str = Field(default="info", index=True)  # info | warn | error
    status: str = Field(default="ok", index=True)  # ok | warning | failed
    entity_type: Optional[str] = Field(default=None, index=True)
    entity_id: Optional[str] = Field(default=None, index=True)
    payload_json: str = Field(default="{}", sa_column=Column(Text))
    source: Optional[str] = None
    created_by: str = "system"
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class IntegrationHealthSnapshot(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(default="default", index=True)
    status: str = Field(default="ok", index=True)  # ok | warning | critical
    orphan_count: int = 0
    mismatch_count: int = 0
    warning_count: int = 0
    summary_json: str = Field(default="{}", sa_column=Column(Text))
    created_by: str = "system"
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


# --- Diagram Studio V2 ---

class DiagramLibraryItem(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(default="default", index=True)
    domain: str = Field(index=True)  # vector | plant | process | vsm
    code: str = Field(index=True)
    name: str
    version: str = Field(default="1.0.0", index=True)
    element_type: str = Field(index=True)
    tags_json: str = Field(default="[]", sa_column=Column(Text))
    shape_json: str = Field(default="{}", sa_column=Column(Text))
    guide_markdown: Optional[str] = Field(default=None, sa_column=Column(Text))
    is_template: bool = False
    is_active: bool = True
    created_by: str = "system"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DiagramLibraryFavorite(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(default="default", index=True)
    username: str = Field(index=True)
    library_item_id: uuid.UUID = Field(foreign_key="diagramlibraryitem.id", index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DiagramPropertySchema(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(default="default", index=True)
    element_type: str = Field(index=True)
    version: str = Field(default="1.0.0")
    # Avoid shadowing SQLModel.schema_json() while preserving DB column name.
    schema_payload_json: str = Field(default="{}", sa_column=Column("schema_json", Text))
    is_active: bool = True
    created_by: str = "system"
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DiagramChangeLog(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(default="default", index=True)
    diagram_id: Optional[uuid.UUID] = Field(default=None, foreign_key="plantlayout.id", index=True)
    object_id: Optional[str] = Field(default=None, index=True)
    change_type: str = Field(index=True)  # create | update | delete | reorder
    before_json: Optional[str] = Field(default=None, sa_column=Column(Text))
    after_json: Optional[str] = Field(default=None, sa_column=Column(Text))
    changed_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class LayerTreeState(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(default="default", index=True)
    diagram_id: Optional[uuid.UUID] = Field(default=None, foreign_key="plantlayout.id", index=True)
    tree_json: str = Field(default="{}", sa_column=Column(Text))
    ui_state_json: str = Field(default="{}", sa_column=Column(Text))
    updated_by: str
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# --- Simulation V2 ---

class SimulationScenario(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    tenant_code: str = Field(default="default", index=True)
    name: str = Field(index=True)
    asset_id: Optional[uuid.UUID] = Field(default=None, foreign_key="asset.id", index=True)
    diagram_id: Optional[uuid.UUID] = Field(default=None, foreign_key="plantlayout.id", index=True)
    mode: str = Field(default="flow", index=True)
    config_json: str = Field(default="{}", sa_column=Column(Text))
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class SimulationScenarioResult(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    scenario_id: uuid.UUID = Field(foreign_key="simulationscenario.id", index=True)
    run_label: Optional[str] = None
    is_baseline: bool = False
    input_json: str = Field(default="{}", sa_column=Column(Text))
    result_json: str = Field(default="{}", sa_column=Column(Text))
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class SimulationDecision(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    scenario_id: uuid.UUID = Field(foreign_key="simulationscenario.id", index=True)
    result_id: Optional[uuid.UUID] = Field(default=None, foreign_key="simulationscenarioresult.id", index=True)
    title: str
    notes: Optional[str] = Field(default=None, sa_column=Column(Text))
    expected_impact_json: str = Field(default="{}", sa_column=Column(Text))
    actual_impact_json: str = Field(default="{}", sa_column=Column(Text))
    status: str = Field(default="proposed", index=True)  # proposed | approved | executed | validated
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
