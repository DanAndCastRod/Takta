"""
Assets Router — CRUD + Tree + Breadcrumbs for the Asset hierarchy.
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select
from pydantic import BaseModel
import uuid as uuid_lib

from ...db import get_session
from ...models import Asset
from ...core.auth import get_current_user, get_optional_user, CurrentUser

router = APIRouter(
    prefix="/api/assets",
    tags=["assets"]
)


# --- Schemas ---

class AssetCreate(BaseModel):
    """Schema for creating a new asset."""
    name: str
    type: str  # Sede, Planta, Area, Linea, Maquina, Puesto, Componente
    description: Optional[str] = None
    parent_id: Optional[str] = None  # UUID as string


class AssetRead(BaseModel):
    """Schema for reading an asset (flat)."""
    id: str
    name: str
    type: str
    description: Optional[str] = None
    parent_id: Optional[str] = None


class AssetTreeNode(BaseModel):
    """Schema for recursive tree node."""
    id: str
    name: str
    type: str
    description: Optional[str] = None
    children: List["AssetTreeNode"] = []


# --- Helpers ---

def _build_tree_node(asset: Asset) -> dict:
    """Recursively build a tree node dict from an Asset with eager-loaded children."""
    return {
        "id": str(asset.id),
        "name": asset.name,
        "type": asset.type,
        "description": asset.description,
        "children": [_build_tree_node(child) for child in (asset.children or [])]
    }


def _detect_cycle(session: Session, asset_id: uuid_lib.UUID, proposed_parent_id: uuid_lib.UUID) -> bool:
    """
    Check if setting proposed_parent_id as parent of asset_id would create a cycle.
    Walks up from proposed_parent_id to root, checking if we encounter asset_id.
    """
    current_id = proposed_parent_id
    visited = set()
    
    while current_id is not None:
        if current_id == asset_id:
            return True  # Cycle detected!
        if current_id in visited:
            return True  # Already in a cycle
        visited.add(current_id)
        
        parent = session.get(Asset, current_id)
        if parent is None:
            break
        current_id = parent.parent_id
    
    return False


def _get_breadcrumbs(session: Session, asset_id: uuid_lib.UUID) -> List[dict]:
    """
    Walk up the asset tree from asset_id to root, returning the full path.
    Returns list from root to current asset.
    """
    path = []
    current_id = asset_id
    
    while current_id is not None:
        asset = session.get(Asset, current_id)
        if asset is None:
            break
        path.append({
            "id": str(asset.id),
            "name": asset.name,
            "type": asset.type,
        })
        current_id = asset.parent_id
    
    path.reverse()  # Root first
    return path


# --- Endpoints ---

@router.get("/", response_model=List[AssetRead])
def list_assets(
    offset: int = 0,
    limit: int = Query(default=100, le=1000),
    type: Optional[str] = Query(default=None, description="Filter by asset type"),
    session: Session = Depends(get_session),
):
    """List all assets (flat, paginated). Optionally filter by type."""
    statement = select(Asset)
    if type:
        statement = statement.where(Asset.type == type)
    statement = statement.offset(offset).limit(limit)
    
    assets = session.exec(statement).all()
    return [
        AssetRead(
            id=str(a.id), name=a.name, type=a.type,
            description=a.description,
            parent_id=str(a.parent_id) if a.parent_id else None
        )
        for a in assets
    ]


@router.post("/", response_model=AssetRead, status_code=201)
def create_asset(
    payload: AssetCreate,
    session: Session = Depends(get_session),
):
    """
    Create a new asset node.
    Validates that the parent exists and no cycle would be created.
    """
    parent_uuid = None
    if payload.parent_id:
        parent_uuid = uuid_lib.UUID(payload.parent_id)
        parent = session.get(Asset, parent_uuid)
        if not parent:
            raise HTTPException(status_code=404, detail=f"Parent asset '{payload.parent_id}' not found")
    
    asset = Asset(
        name=payload.name,
        type=payload.type,
        description=payload.description,
        parent_id=parent_uuid,
    )
    session.add(asset)
    session.commit()
    session.refresh(asset)
    
    return AssetRead(
        id=str(asset.id), name=asset.name, type=asset.type,
        description=asset.description,
        parent_id=str(asset.parent_id) if asset.parent_id else None
    )


@router.get("/tree")
def get_asset_tree(session: Session = Depends(get_session)):
    """
    Return the complete asset hierarchy as nested JSON.
    Starts from root nodes (no parent) and recursively includes children.
    """
    # Fetch root nodes
    roots = session.exec(select(Asset).where(Asset.parent_id == None)).all()
    
    # Build recursive tree
    tree = [_build_tree_node(root) for root in roots]
    return tree


@router.get("/{asset_id}")
def get_asset(asset_id: str, session: Session = Depends(get_session)):
    """Get a specific asset by ID with its direct children."""
    asset = session.get(Asset, uuid_lib.UUID(asset_id))
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    return {
        "id": str(asset.id),
        "name": asset.name,
        "type": asset.type,
        "description": asset.description,
        "parent_id": str(asset.parent_id) if asset.parent_id else None,
        "children": [
            {"id": str(c.id), "name": c.name, "type": c.type}
            for c in (asset.children or [])
        ]
    }


@router.get("/{asset_id}/context")
def get_asset_context(asset_id: str, session: Session = Depends(get_session)):
    """
    Return the full breadcrumb path from root to this asset.
    Example: ["Sede Pereira", "Planta Beneficio", "Área Evisceración", "Línea 1"]
    """
    asset = session.get(Asset, uuid_lib.UUID(asset_id))
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    breadcrumbs = _get_breadcrumbs(session, uuid_lib.UUID(asset_id))
    
    return {
        "asset_id": asset_id,
        "asset_name": asset.name,
        "breadcrumbs": breadcrumbs,
        "depth": len(breadcrumbs),
    }


@router.patch("/{asset_id}")
def update_asset(
    asset_id: str,
    payload: AssetCreate,
    session: Session = Depends(get_session),
):
    """Update an asset's name, type, description, or parent. Validates against cycles."""
    asset = session.get(Asset, uuid_lib.UUID(asset_id))
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    # Check for cycle if parent is changing
    if payload.parent_id:
        new_parent_uuid = uuid_lib.UUID(payload.parent_id)
        if _detect_cycle(session, asset.id, new_parent_uuid):
            raise HTTPException(
                status_code=400,
                detail="Cannot set this parent: would create a circular reference"
            )
        asset.parent_id = new_parent_uuid
    
    asset.name = payload.name
    asset.type = payload.type
    asset.description = payload.description
    
    session.add(asset)
    session.commit()
    session.refresh(asset)
    
    return AssetRead(
        id=str(asset.id), name=asset.name, type=asset.type,
        description=asset.description,
        parent_id=str(asset.parent_id) if asset.parent_id else None
    )


@router.delete("/{asset_id}", status_code=204)
def delete_asset(
    asset_id: str,
    session: Session = Depends(get_session),
):
    """Delete an asset. Fails if it has children (prevent orphans)."""
    asset = session.get(Asset, uuid_lib.UUID(asset_id))
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    
    if asset.children:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete: asset has {len(asset.children)} children. Delete or reassign them first."
        )
    
    session.delete(asset)
    session.commit()

