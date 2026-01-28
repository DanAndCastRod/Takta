from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from ..db import get_session
from ..models import Asset

router = APIRouter(prefix="/assets", tags=["Assets"])

@router.post("/", response_model=Asset)
def create_asset(asset: Asset, session: Session = Depends(get_session)):
    session.add(asset)
    session.commit()
    session.refresh(asset)
    return asset

@router.get("/", response_model=List[Asset])
def read_assets(skip: int = 0, limit: int = 100, session: Session = Depends(get_session)):
    assets = session.exec(select(Asset).offset(skip).limit(limit)).all()
    return assets

@router.get("/{asset_id}", response_model=Asset)
def read_asset(asset_id: str, session: Session = Depends(get_session)):
    asset = session.get(Asset, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    return asset

@router.get("/tree/", response_model=List[Asset])
def read_asset_tree(session: Session = Depends(get_session)):
    # Basic implementation: Return roots (assets with no parent)
    # The frontend can then fetch children recursively or we can implement eager loading here
    statement = select(Asset).where(Asset.parent_id == None)
    roots = session.exec(statement).all()
    return roots
