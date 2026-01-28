from typing import Optional, List
from sqlmodel import Field, SQLModel, Relationship
from datetime import datetime, date
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


class ProductReferenceBase(SQLModel):
    code: str = Field(unique=True, index=True) # SKU
    description: str
    family: str 

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


# --- Engineering: Time Studies ---

class TimeStudy(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    process_standard_id: uuid.UUID = Field(foreign_key="processstandard.id")
    
    analyst_name: str
    study_date: datetime = Field(default_factory=datetime.utcnow)
    
    observed_time_avg: float
    rating_factor: float = 1.0 
    allowance_factor: float = 0.0 
    calculated_standard_time: float

    process_standard: ProcessStandard = Relationship(back_populates="time_studies")
    cycles: List["TimeStudyCycle"] = Relationship(back_populates="time_study")

class TimeStudyCycle(SQLModel, table=True):
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    time_study_id: uuid.UUID = Field(foreign_key="timestudy.id")
    cycle_number: int
    time_observed: float
    is_abnormal: bool = False # Outlier identification

    time_study: TimeStudy = Relationship(back_populates="cycles")


# --- Continuous Improvement (Action Tracking) ---

class ImprovementAction(SQLModel, table=True):
    """
    Centralized Action Item from Kaizen, A3, 5S, or Audit.
    """
    id: Optional[uuid.UUID] = Field(default_factory=uuid.uuid4, primary_key=True)
    asset_id: Optional[uuid.UUID] = Field(default=None, foreign_key="asset.id")
    
    source_document: str # e.g., "Kaizen-001" or "5S-Audit-Jan"
    description: str
    responsible: str
    due_date: Optional[date] = None
    status: str = "Open" # Open, In Progress, Closed
    completion_date: Optional[date] = None
    
    asset: Optional[Asset] = Relationship(back_populates="improvement_actions")


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
    
    content_json: str # Editor.js stored data
