from __future__ import annotations

import uuid
from dataclasses import dataclass
from typing import Optional

from fastapi import HTTPException
from sqlmodel import Session

from ..models import Asset, ProcessStandard, ProductReference


@dataclass(frozen=True)
class CanonicalContext:
    asset: Optional[Asset]
    reference: Optional[ProductReference]
    standard: Optional[ProcessStandard]
    asset_id: Optional[uuid.UUID]
    product_reference_id: Optional[uuid.UUID]
    process_standard_id: Optional[uuid.UUID]


def validate_canonical_context(
    session: Session,
    asset_id: Optional[uuid.UUID] = None,
    product_reference_id: Optional[uuid.UUID] = None,
    process_standard_id: Optional[uuid.UUID] = None,
) -> CanonicalContext:
    asset = session.get(Asset, asset_id) if asset_id else None
    if asset_id and not asset:
        raise HTTPException(status_code=404, detail="Asset not found.")

    reference = session.get(ProductReference, product_reference_id) if product_reference_id else None
    if product_reference_id and not reference:
        raise HTTPException(status_code=404, detail="Product reference not found.")

    standard = session.get(ProcessStandard, process_standard_id) if process_standard_id else None
    if process_standard_id and not standard:
        raise HTTPException(status_code=404, detail="Process standard not found.")

    resolved_asset_id = asset_id
    resolved_reference_id = product_reference_id

    if standard:
        if resolved_asset_id and standard.asset_id != resolved_asset_id:
            raise HTTPException(status_code=400, detail="asset_id does not match process_standard_id.")
        if resolved_reference_id and standard.product_reference_id != resolved_reference_id:
            raise HTTPException(
                status_code=400,
                detail="product_reference_id does not match process_standard_id.",
            )
        resolved_asset_id = resolved_asset_id or standard.asset_id
        resolved_reference_id = resolved_reference_id or standard.product_reference_id
        asset = session.get(Asset, resolved_asset_id) if resolved_asset_id else None
        reference = session.get(ProductReference, resolved_reference_id) if resolved_reference_id else None

    return CanonicalContext(
        asset=asset,
        reference=reference,
        standard=standard,
        asset_id=resolved_asset_id,
        product_reference_id=resolved_reference_id,
        process_standard_id=process_standard_id,
    )
