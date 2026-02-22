from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from datetime import datetime
import uuid
from pydantic import BaseModel
from ..db import get_session
from ..models import PlantLayout

router = APIRouter(prefix="/plant-layouts", tags=["Plant Layouts"])

# --- Schemas ---

class LayoutBase(BaseModel):
    name: str
    description: Optional[str] = None
    json_content: str
    thumbnail_data: Optional[str] = None
    is_active: bool = True

class LayoutCreate(LayoutBase):
    pass

class LayoutUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    json_content: Optional[str] = None
    thumbnail_data: Optional[str] = None
    is_active: Optional[bool] = None

class LayoutResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    thumbnail_data: Optional[str] = None 

class LayoutDetailResponse(LayoutResponse):
    json_content: str 

# --- Endpoints ---

@router.get("/", response_model=List[LayoutResponse])
def get_layouts(session: Session = Depends(get_session)):
    """List all active layouts (lightweight)"""
    layouts = session.exec(select(PlantLayout).where(PlantLayout.is_active == True)).all()
    return layouts

@router.get("/{layout_id}", response_model=LayoutDetailResponse)
def get_layout(layout_id: uuid.UUID, session: Session = Depends(get_session)):
    """Get full layout details including JSON content"""
    layout = session.get(PlantLayout, layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    return layout

@router.post("/", response_model=LayoutResponse)
def create_layout(layout_in: LayoutCreate, session: Session = Depends(get_session)):
    """Create a new layout"""
    layout = PlantLayout.from_orm(layout_in)
    session.add(layout)
    session.commit()
    session.refresh(layout)
    return layout

@router.put("/{layout_id}", response_model=LayoutResponse)
def update_layout(layout_id: uuid.UUID, layout_in: LayoutUpdate, session: Session = Depends(get_session)):
    """Update an existing layout"""
    layout = session.get(PlantLayout, layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    layout_data = layout_in.dict(exclude_unset=True)
    for key, value in layout_data.items():
        setattr(layout, key, value)
    
    layout.updated_at = datetime.utcnow()
    
    session.add(layout)
    session.commit()
    session.refresh(layout)
    return layout

@router.delete("/{layout_id}")
def delete_layout(layout_id: uuid.UUID, session: Session = Depends(get_session)):
    """Soft delete a layout"""
    layout = session.get(PlantLayout, layout_id)
    if not layout:
        raise HTTPException(status_code=404, detail="Layout not found")
    
    # Soft delete
    layout.is_active = False
    session.add(layout)
    session.commit()
    return {"ok": True}
