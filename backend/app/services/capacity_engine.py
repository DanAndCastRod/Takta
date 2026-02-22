from sqlmodel import Session, select
from typing import Dict, List, Any, Optional
from ..models import Asset, ProcessStandard
import uuid

class CapacityEngine:
    def __init__(self, session: Session):
        self.session = session

    def calculate_asset_capacity(self, asset_id: uuid.UUID) -> Dict[str, Any]:
        """
        Calculates the capacity (Units per Hour) for a given asset.
        - If Asset is a MACHINE (has ProcessStandards): Capacity = 60 / Standard Time
        - If Asset is a LINE (has Children): Capacity = Min(Children Capacities) -> The Bottleneck
        """
        asset = self.session.get(Asset, asset_id)
        if not asset:
            return {"error": "Asset not found"}

        # Check if it's a leaf node (Machine) or Parent (Line)
        # We assume if it has children, it's a Line/Area.
        # But we also check for ProcessStandards directly attached.
        
        # 1. Fetch direct process standards (Machine Logic)
        statement = select(ProcessStandard).where(ProcessStandard.asset_id == asset_id, ProcessStandard.is_active == True)
        standards = self.session.exec(statement).all()
        
        node_capacity = float('inf')
        details = {}
        is_bottleneck_source = False

        if standards:
            # It's a machine processing something.
            # LOGIC: Find the SLOWEST process standard (Worst Case) 
            # or use a specific Product Ref if provided (Scope expansion for later)
            # For MVP: We take the 'Standard' with the highest 'standard_time_minutes'
            
            worst_case_std = max(standards, key=lambda x: x.standard_time_minutes or 0)
            
            if worst_case_std.standard_time_minutes and worst_case_std.standard_time_minutes > 0:
                node_capacity = 60 / worst_case_std.standard_time_minutes
            else:
                node_capacity = 0 # Undefined or infinite? Let's say 0 if infinite time, or handle clean.
            
            details = {
                "type": "machine",
                "bottleneck_product": worst_case_std.product_reference_id,
                "standard_time": worst_case_std.standard_time_minutes
            }
        
        # 2. Check Children (Line Logic)
        children_capacities = []
        if asset.children:
            for child in asset.children:
                child_result = self.calculate_asset_capacity(child.id)
                if "capacity_uph" in child_result:
                    children_capacities.append({
                        "id": str(child.id),
                        "name": child.name,
                        "capacity_uph": child_result["capacity_uph"]
                    })
            
            if children_capacities:
                # The Line Capacity is the MINIMUM of children capacities
                min_child = min(children_capacities, key=lambda x: x["capacity_uph"])
                node_capacity = min_child["capacity_uph"]
                details = {
                    "type": "line",
                    "bottleneck_asset_id": min_child["id"],
                    "bottleneck_asset_name": min_child["name"],
                    "children_analysis": children_capacities
                }

        return {
            "asset_id": str(asset.id),
            "asset_name": asset.name,
            "capacity_uph": round(node_capacity, 2) if node_capacity != float('inf') else 0,
            "details": details
        }
