import os
import sys

# Force SQLite for local seeding to avoid connection hangs
os.environ["FORCE_SQLITE"] = "True"

# Ensure backend path is in pythonpath
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from sqlmodel import Session, select, create_engine
from backend.app.db import get_engine
from backend.app.models import Asset, ProcessStandard, StandardActivity

def seed_capacity_data():
    engine = get_engine()
    with Session(engine) as session:
        print("🌱 Seeding Capacity Data...")

        # 1. Create Standard Activities if they don't exist
        print("   - Checking Activities...")
        activities = ["Extrusion", "Empaque", "Paletizado", "Mezclado"]
        activity_map = {}
        
        for name in activities:
            statement = select(StandardActivity).where(StandardActivity.name == name)
            act = session.exec(statement).first()
            if not act:
                act = StandardActivity(name=name, description=f"Activity for {name}")
                session.add(act)
                session.commit()
                session.refresh(act)
                print(f"     + Created Activity: {name}")
            activity_map[name] = act.id

        # 2. Create Asset Hierarchy
        # Linea de Empaque (Line) -> Extrusora (Machine) -> Empacadora (Machine)
        print("   - Creating Assets...")
        
        # Line
        line_name = "Linea de Empaque 1 - Prueba Capacidad"
        statement = select(Asset).where(Asset.name == line_name)
        line = session.exec(statement).first()
        
        if not line:
            line = Asset(name=line_name, type="line", description="Linea de prueba para analisis de capacidad")
            session.add(line)
            session.commit()
            session.refresh(line)
            print(f"     + Created Line: {line.name}")
        
        # Machines
        machines_data = [
            {"name": "Extrusora EX-01", "type": "machine", "parent_id": line.id, "activity": "Extrusion", "std_time": 2.0},  # 30 UPH (Bottleneck)
            {"name": "Empacadora PACK-01", "type": "machine", "parent_id": line.id, "activity": "Empaque", "std_time": 0.5},   # 120 UPH
        ]

        for data in machines_data:
            m_statement = select(Asset).where(Asset.name == data["name"])
            machine = session.exec(m_statement).first()
            
            if not machine:
                machine = Asset(name=data["name"], type=data["type"], parent_id=data["parent_id"], description="Maquina de prueba")
                session.add(machine)
                session.commit()
                session.refresh(machine)
                print(f"     + Created Machine: {machine.name}")

            # 3. Assign Process Standard (Capacity Definition)
            # Check if standard exists
            ps_statement = select(ProcessStandard).where(ProcessStandard.asset_id == machine.id)
            ps = session.exec(ps_statement).first()
            
            if not ps:
                ps = ProcessStandard(
                    asset_id=machine.id,
                    activity_id=activity_map[data["activity"]],
                    standard_time_minutes=data["std_time"],
                    frequency="per_unit",
                    is_active=True
                )
                session.add(ps)
                session.commit()
                print(f"       + Assigned Standard: {data['std_time']} min/unit ({60/data['std_time']} UPH)")
            else:
                 # Update time just in case
                 if ps.standard_time_minutes != data["std_time"]:
                     ps.standard_time_minutes = data["std_time"]
                     session.add(ps)
                     session.commit()
                     print(f"       ~ Updated Standard: {data['std_time']} min/unit")

        print("✅ Seeding Complete!")

if __name__ == "__main__":
    seed_capacity_data()
