"""
Seed Script -- Populates the database with a realistic Grupo Bios asset hierarchy.

Usage:
    cd Takta
    py -m backend.app.seeds.seed_assets

This script reads DB_MODE from .env (default: sqlite).
No need to set FORCE_SQLITE manually.

Structure:
    Sede Pereira
    +-- Planta Beneficio
    |   +-- Area Recepcion
    |   |   +-- Linea Descargue
    |   |   |   +-- Banda Transportadora 1
    |   |   |   +-- Bascula Camionera
    |   |   +-- Linea Colgado
    |   |       +-- Colgador Automatico
    |   +-- Area Evisceracion
    |   |   +-- Linea Evisceracion 1
    |   |   |   +-- Cortadora Abdominal
    |   |   |   +-- Extractora de Visceras
    |   |   |   +-- Lavadora Interior
    |   |   +-- Linea Evisceracion 2
    |   |       +-- Extractora Automatica
    |   +-- Area Empaque
    |       +-- Linea Sellado
    |       |   +-- Selladora al Vacio A
    |       |   +-- Selladora al Vacio B
    |       +-- Linea Etiquetado
    |           +-- Etiquetadora Automatica
    +-- Planta Procesados
    |   +-- Area Marinado
    |   |   +-- Linea Inyeccion
    |   |       +-- Inyectora Salmuera
    |   |       +-- Tumbler
    |   +-- Area Coccion
    |       +-- Linea Hornos
    |           +-- Horno Continuo 1
    |           +-- Ahumador
    +-- Planta Logistica
        +-- Area Almacen Frio
        |   +-- Linea Picking
        |       +-- Banda Picking
        +-- Area Despacho
            +-- Linea Cargue
                +-- Montacargas Electrico

    Sede Manizales
    +-- Planta Incubacion
        +-- Area Nacedoras
            +-- Linea Nacedora 1
                +-- Nacedora Automatica
"""

import sys
import os
import uuid

# Ensure project root is on PYTHONPATH
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', '..'))

from sqlmodel import Session, select
from backend.app.db import get_engine, init_db
from backend.app.models import Asset


# ────────────────────────────────────────
# Hierarchy definition: (name, type, children)
# ────────────────────────────────────────
SEED_HIERARCHY = [
    ("Sede Pereira", "sede", [
        ("Planta Beneficio", "planta", [
            ("Area Recepcion", "area", [
                ("Linea Descargue", "linea", [
                    ("Banda Transportadora 1", "maquina", []),
                    ("Bascula Camionera", "maquina", []),
                ]),
                ("Linea Colgado", "linea", [
                    ("Colgador Automatico", "maquina", []),
                ]),
            ]),
            ("Area Evisceracion", "area", [
                ("Linea Evisceracion 1", "linea", [
                    ("Cortadora Abdominal", "maquina", []),
                    ("Extractora de Visceras", "maquina", []),
                    ("Lavadora Interior", "maquina", []),
                ]),
                ("Linea Evisceracion 2", "linea", [
                    ("Extractora Automatica", "maquina", []),
                ]),
            ]),
            ("Area Empaque", "area", [
                ("Linea Sellado", "linea", [
                    ("Selladora al Vacio A", "maquina", []),
                    ("Selladora al Vacio B", "maquina", []),
                ]),
                ("Linea Etiquetado", "linea", [
                    ("Etiquetadora Automatica", "maquina", []),
                ]),
            ]),
        ]),
        ("Planta Procesados", "planta", [
            ("Area Marinado", "area", [
                ("Linea Inyeccion", "linea", [
                    ("Inyectora Salmuera", "maquina", []),
                    ("Tumbler", "maquina", []),
                ]),
            ]),
            ("Area Coccion", "area", [
                ("Linea Hornos", "linea", [
                    ("Horno Continuo 1", "maquina", []),
                    ("Ahumador", "maquina", []),
                ]),
            ]),
        ]),
        ("Planta Logistica", "planta", [
            ("Area Almacen Frio", "area", [
                ("Linea Picking", "linea", [
                    ("Banda Picking", "maquina", []),
                ]),
            ]),
            ("Area Despacho", "area", [
                ("Linea Cargue", "linea", [
                    ("Montacargas Electrico", "maquina", []),
                ]),
            ]),
        ]),
    ]),
    ("Sede Manizales", "sede", [
        ("Planta Incubacion", "planta", [
            ("Area Nacedoras", "area", [
                ("Linea Nacedora 1", "linea", [
                    ("Nacedora Automatica", "maquina", []),
                ]),
            ]),
        ]),
    ]),
]

# Type icons (ASCII-safe for Windows cp1252 terminal)
TYPE_ICONS = {
    "sede": "[S]",
    "planta": "[P]",
    "area": "[A]",
    "linea": "[L]",
    "maquina": "[M]",
}


def _insert_recursive(session: Session, nodes: list, parent_id=None, depth=0):
    """Recursively insert assets into the database."""
    count = 0
    for name, asset_type, children in nodes:
        asset = Asset(
            id=uuid.uuid4(),
            name=name,
            type=asset_type,
            description=f"{asset_type.capitalize()}: {name}",
            parent_id=parent_id,
        )
        session.add(asset)
        session.flush()  # Assign the ID

        indent = "  " * depth
        icon = TYPE_ICONS.get(asset_type, "-")
        print(f"{indent}{icon} {name} ({asset_type})")

        count += 1
        count += _insert_recursive(session, children, parent_id=asset.id, depth=depth + 1)

    return count


def seed():
    """Execute the seed: create tables and insert hierarchy."""
    engine = get_engine()
    init_db()

    with Session(engine) as session:
        # Check if data already exists
        existing = session.exec(select(Asset)).first()
        if existing:
            print("[!] La base de datos ya tiene activos. Omitiendo seed.")
            print("    Para forzar: elimina takta.db y vuelve a ejecutar.")
            return

        print("[SEED] Sembrando jerarquia de activos...\n")
        total = _insert_recursive(session, SEED_HIERARCHY)
        session.commit()
        print(f"\n[OK] Seed completado: {total} activos insertados.")


if __name__ == "__main__":
    seed()
