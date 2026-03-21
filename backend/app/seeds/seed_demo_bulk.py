"""
Seed masivo de datos demo para Takta.

Uso:
    py -m backend.app.seeds.seed_demo_bulk --scale medium
"""

from __future__ import annotations

import argparse
import json
import random
import uuid
from datetime import date, datetime, timedelta

from sqlmodel import Session

from backend.app.db import get_engine, init_db
from backend.app.models import (
    ActionWorkflow,
    Asset,
    CapaAction,
    ContinuousImprovementKpiDefinition,
    ContinuousImprovementKpiMeasurement,
    DowntimeEvent,
    EngineeringMeeting,
    FormatInstance,
    FormatTemplate,
    ImprovementAction,
    NonConformity,
    Operator,
    PlantLayout,
    ProcessStandard,
    ProductionLog,
    ProductReference,
    StandardActivity,
    TimeStudy,
    TimingElement,
    TimingLap,
    TimingSession,
    VSMCanvas,
    WeightSample,
    WeightSamplingSpec,
)

SCALES = {
    "small": dict(sites=1, plants=2, areas=2, lines=2, machines=2, refs=60, operators=25, standards=120, studies=20, logs=200, downs=80, actions=40, specs=20, samples=15, nc=30, meetings=20, docs=30, layouts=10, vsm=8),
    "medium": dict(sites=3, plants=3, areas=3, lines=3, machines=3, refs=240, operators=120, standards=800, studies=120, logs=1500, downs=500, actions=280, specs=120, samples=35, nc=160, meetings=100, docs=200, layouts=45, vsm=30),
    "large": dict(sites=5, plants=4, areas=4, lines=3, machines=4, refs=600, operators=300, standards=2500, studies=350, logs=5000, downs=1500, actions=800, specs=300, samples=60, nc=450, meetings=300, docs=700, layouts=120, vsm=90),
}


def pick(rows):
    return random.choice(rows)


def rand_dt(days_back=120):
    return datetime.utcnow() - timedelta(
        days=random.randint(0, days_back),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )


def seed(scale_name="medium", seed_value=None):
    if seed_value is not None:
        random.seed(seed_value)
    cfg = SCALES[scale_name]
    tag = f"{scale_name.upper()}-{datetime.utcnow().strftime('%m%d%H%M')}"

    init_db()
    engine = get_engine()
    print(f"[SEED] Engine: {engine.url}")
    print(f"[SEED] Escala: {scale_name} | Tag: {tag}")

    with Session(engine) as session:
        # Assets hierarchy
        assets = []
        machines = []
        for s in range(1, cfg["sites"] + 1):
            site = Asset(name=f"[DEMO-{tag}] Sede {s:02d}", type="sede", description="Sede demo")
            assets.append(site)
            session.add(site)
            for p in range(1, cfg["plants"] + 1):
                plant = Asset(name=f"[DEMO-{tag}] Planta {s:02d}-{p:02d}", type="planta", parent_id=site.id, description="Planta demo")
                assets.append(plant)
                session.add(plant)
                for a in range(1, cfg["areas"] + 1):
                    area = Asset(name=f"[DEMO-{tag}] Área {s:02d}-{p:02d}-{a:02d}", type="area", parent_id=plant.id, description="Área demo")
                    assets.append(area)
                    session.add(area)
                    for l in range(1, cfg["lines"] + 1):
                        line = Asset(name=f"[DEMO-{tag}] Línea {s:02d}-{p:02d}-{a:02d}-{l:02d}", type="linea", parent_id=area.id, description="Línea demo")
                        assets.append(line)
                        session.add(line)
                        for m in range(1, cfg["machines"] + 1):
                            machine = Asset(name=f"[DEMO-{tag}] Máquina {s:02d}-{p:02d}-{a:02d}-{l:02d}-{m:02d}", type="maquina", parent_id=line.id, description="Máquina demo")
                            assets.append(machine)
                            machines.append(machine)
                            session.add(machine)
        session.commit()

        # References
        refs = [
            ProductReference(
                code=f"{tag}-SKU-{i:05d}",
                description=f"Referencia demo {i:05d}",
                family=pick(["Filetes", "Marinados", "Empanizados", "Congelados"]),
                uom=pick(["kg", "g", "und"]),
                packaging_uom=pick(["caja", "bolsa", "bandeja", "pallet"]),
            )
            for i in range(1, cfg["refs"] + 1)
        ]
        session.add_all(refs)
        session.commit()

        # Activities + operators
        activities = [
            StandardActivity(name="Recepción", type="operation", is_value_added=False),
            StandardActivity(name="Preparación", type="operation", is_value_added=True),
            StandardActivity(name="Corte", type="operation", is_value_added=True),
            StandardActivity(name="Pesaje", type="inspection", is_value_added=False),
            StandardActivity(name="Empaque", type="operation", is_value_added=True),
            StandardActivity(name="Inspección", type="inspection", is_value_added=False),
        ]
        session.add_all(activities)

        operators = [
            Operator(
                employee_code=f"{tag}-OP-{i:05d}",
                full_name=f"Operario Demo {i:05d}",
                default_area_id=pick(machines).id,
                shift=pick(["Mañana", "Tarde", "Noche", "Rotativo"]),
                is_active=True,
                hire_date=date.today() - timedelta(days=random.randint(90, 2200)),
            )
            for i in range(1, cfg["operators"] + 1)
        ]
        session.add_all(operators)
        session.commit()

        # Standards
        standards = [
            ProcessStandard(
                asset_id=pick(machines).id,
                activity_id=pick(activities).id,
                product_reference_id=pick(refs).id,
                standard_time_minutes=round(random.uniform(0.8, 12.5), 2),
                frequency=pick(["Cada turno", "Diario", "Semanal"]),
                capacity_unit=pick(["kg/h", "und/h", "cajas/h"]),
            )
            for _ in range(cfg["standards"])
        ]
        session.add_all(standards)
        session.commit()

        # Time studies
        studies = []
        sessions = []
        elements = []
        laps = []
        for i in range(1, cfg["studies"] + 1):
            std = pick(standards)
            st = TimeStudy(
                process_standard_id=std.id,
                asset_id=std.asset_id,
                product_reference_id=std.product_reference_id,
                name=f"Estudio demo {i:04d}",
                analyst_name=pick(["Ana", "Carlos", "Lina", "David"]),
                study_type=pick(["continuous", "snap_back", "work_sampling"]),
                status=pick(["draft", "in_progress", "completed"]),
                calculated_standard_time=round(random.uniform(6.0, 30.0), 2),
            )
            studies.append(st)
            e1 = TimingElement(time_study_id=st.id, name="Carga MP", type="operation", order=1)
            e2 = TimingElement(time_study_id=st.id, name="Empaque", type="operation", order=2)
            elements.extend([e1, e2])
            ses = TimingSession(time_study_id=st.id, started_at=rand_dt(90), ended_at=rand_dt(20), notes="Sesión demo")
            sessions.append(ses)
            for c in range(1, random.randint(5, 10)):
                laps.append(TimingLap(session_id=ses.id, element_id=e1.id, cycle_number=c, split_time_ms=round(random.uniform(5000, 30000), 2), units_count=random.randint(1, 3)))
                laps.append(TimingLap(session_id=ses.id, element_id=e2.id, cycle_number=c, split_time_ms=round(random.uniform(5000, 30000), 2), units_count=random.randint(1, 3)))
        session.add_all(studies + elements + sessions + laps)
        session.commit()

        # Execution
        logs = [
            ProductionLog(
                asset_id=pick(machines).id,
                shift=pick(["Mañana", "Tarde", "Noche"]),
                event_type=pick(["start", "end", "pause", "changeover"]),
                event_time=rand_dt(45),
                quantity_produced=random.randint(40, 1200),
                operator_id=pick(operators).id,
                created_by=pick(["supervisor", "operador"]),
            )
            for _ in range(cfg["logs"])
        ]
        downs = [
            DowntimeEvent(
                asset_id=pick(machines).id,
                downtime_type=pick(["Mecanico", "Electrico", "Calidad", "Cambio de Ref", "Programado"]),
                start_time=rand_dt(60),
                end_time=rand_dt(20),
                duration_minutes=float(random.randint(5, 95)),
                root_cause=pick(["Ajuste", "Desgaste", "Material", "Inspección"]),
                diagnosis="Evento demo",
                reported_by=pick(["supervisor", "operador"]),
            )
            for _ in range(cfg["downs"])
        ]
        session.add_all(logs + downs)
        session.commit()

        # CI actions + workflows
        actions = []
        workflows = []
        for i in range(1, cfg["actions"] + 1):
            action = ImprovementAction(
                asset_id=pick(machines).id,
                tenant_code="default",
                source_document=f"KAI-{date.today().year}-{i:04d}",
                description=f"Acción demo {i:04d}",
                responsible=pick(["Ing. Proceso", "Supervisor", "Calidad"]),
                due_date=date.today() + timedelta(days=random.randint(5, 120)),
                status=pick(["Open", "In Progress", "Closed"]),
            )
            actions.append(action)
            workflows.append(ActionWorkflow(action_id=action.id, workflow_status=pick(["Open", "CloseRequested", "Approved", "Verified"]), close_requested_at=rand_dt(40), close_requested_by="seed.demo"))
        session.add_all(actions + workflows)
        session.commit()

        # Quality
        specs = []
        for i in range(1, cfg["specs"] + 1):
            std = pick(standards)
            target = round(random.uniform(180, 1200), 2)
            tol = round(target * random.uniform(0.03, 0.08), 2)
            specs.append(
                WeightSamplingSpec(
                    tenant_code="default",
                    name=f"Spec Demo {i:04d}",
                    asset_id=std.asset_id,
                    product_reference_id=std.product_reference_id,
                    process_standard_id=std.id,
                    unit=pick(["g", "kg"]),
                    lower_limit=round(target - tol, 2),
                    target_weight=target,
                    upper_limit=round(target + tol, 2),
                    created_by="seed.demo",
                )
            )
        session.add_all(specs)
        session.commit()

        samples = []
        for spec in specs:
            for _ in range(cfg["samples"]):
                center = spec.target_weight or ((spec.lower_limit + spec.upper_limit) / 2)
                samples.append(
                    WeightSample(
                        specification_id=spec.id,
                        measured_value=round(random.gauss(center, (spec.upper_limit - spec.lower_limit) * 0.1), 2),
                        measured_at=rand_dt(60),
                        measured_by=pick(["Operador A", "Operador B", "Calidad C"]),
                        batch_code=f"LOT-{random.randint(1000, 9999)}",
                        shift=pick(["Mañana", "Tarde", "Noche"]),
                    )
                )
        session.add_all(samples)
        session.commit()

        ncs = []
        caps = []
        for i, sample in enumerate(random.sample(samples, min(cfg["nc"], len(samples))), start=1):
            spec = next((x for x in specs if x.id == sample.specification_id), None)
            nc = NonConformity(
                tenant_code="default",
                asset_id=spec.asset_id if spec else None,
                product_reference_id=spec.product_reference_id if spec else None,
                process_standard_id=spec.process_standard_id if spec else None,
                weight_specification_id=spec.id if spec else None,
                weight_sample_id=sample.id,
                source="spc",
                severity=pick(["low", "medium", "high", "critical"]),
                status=pick(["Open", "In Progress", "Close Requested", "Approved", "Verified"]),
                title=f"NC Demo {i:04d}",
                description="No conformidad demo",
                detected_by="seed.demo",
            )
            ncs.append(nc)
            if random.random() < 0.7:
                caps.append(
                    CapaAction(
                        tenant_code="default",
                        non_conformity_id=nc.id,
                        improvement_action_id=pick(actions).id if actions else None,
                        action_type=pick(["Corrective", "Preventive"]),
                        title=f"CAPA {i:04d}",
                        responsible=pick(["Calidad", "Ingeniería", "Producción"]),
                        status=pick(["Open", "In Progress", "Close Requested", "Approved", "Verified"]),
                        created_by="seed.demo",
                    )
                )
        session.add_all(ncs + caps)
        session.commit()

        # KPI definitions + measurements
        defs = []
        for i in range(1, 13):
            defs.append(
                ContinuousImprovementKpiDefinition(
                    tenant_code="default",
                    code=f"KPI-{tag}-{i:02d}",
                    focus_area=pick(["Generación de Valor", "Planeación Integral", "Excelencia Operacional"]),
                    action_line=pick(["5S", "Standard Work", "Merma", "Sobrepeso", "ROI"]),
                    indicator_name=f"Indicador Demo {i:02d}",
                    individual_weight_pct=round(random.uniform(4, 20), 2),
                    kpi_weight_pct=round(random.uniform(4, 20), 2),
                    created_by="seed.demo",
                )
            )
        session.add_all(defs)
        session.commit()

        mk = [date.today().replace(day=1) - timedelta(days=30 * m) for m in range(5, -1, -1)]
        ms = []
        for d in defs:
            for period in mk:
                val = round(random.uniform(65, 103), 2)
                ms.append(
                    ContinuousImprovementKpiMeasurement(
                        tenant_code="default",
                        kpi_definition_id=d.id,
                        period_key=period.strftime("%Y-%m"),
                        target_value=100.0,
                        actual_value=val,
                        compliance_pct=val,
                        status_color="green" if val >= 95 else ("yellow" if val >= 80 else "red"),
                        source="seed",
                        created_by="seed.demo",
                    )
                )
        session.add_all(ms)
        session.commit()

        # Templates + docs
        templates = [
            FormatTemplate(code=f"ACTA-{tag}-{uuid.uuid4().hex[:4]}", name="Acta Ingeniería", category="meetings", markdown_structure="# Acta\n## Objetivo"),
            FormatTemplate(code=f"STD-{tag}-{uuid.uuid4().hex[:4]}", name="Estandar Operativo", category="engineering", markdown_structure="# Estándar\n## Parámetros"),
            FormatTemplate(code=f"A3-{tag}-{uuid.uuid4().hex[:4]}", name="Formato A3", category="ci", markdown_structure="# A3\n## Problema"),
        ]
        session.add_all(templates)
        session.commit()

        docs = [
            FormatInstance(
                template_id=pick(templates).id,
                asset_id=pick(machines).id,
                user_id=pick(["admin", "ingeniero", "supervisor"]),
                source_context_json=json.dumps({"origin": "seed_demo_bulk"}),
                content_json=json.dumps({"blocks": [{"type": "paragraph", "data": {"text": f"Documento demo {i:04d}"}}], "version": "2.29.1"}),
            )
            for i in range(1, cfg["docs"] + 1)
        ]
        session.add_all(docs)

        meetings = [
            EngineeringMeeting(
                asset_id=pick(machines).id,
                tenant_code="default",
                title=f"Acta Ingeniería Demo {i:04d}",
                meeting_date=date.today() - timedelta(days=random.randint(0, 180)),
                start_time=pick(["07:00", "08:00", "09:00"]),
                end_time=pick(["08:30", "09:30", "10:30"]),
                location=pick(["Sala MC", "Planta", "Virtual"]),
                objective="Revisión de KPI y acciones",
                scope="Producción, calidad e ingeniería",
                participants_json=json.dumps([{"name": "Ing. Proceso"}, {"name": "Calidad"}]),
                agenda_json=json.dumps(["KPI MC", "SPC", "CAPA"]),
                kpis_json=json.dumps([{"name": "Cumplimiento MC", "value": round(random.uniform(74, 101), 2)}]),
                focuses_json=json.dumps(["Merma", "Sobrepeso"]),
                commitments_json=json.dumps([{"owner": "Ingeniería", "task": "Actualizar estándar"}]),
                created_by=pick(["admin", "ingeniero"]),
            )
            for i in range(1, cfg["meetings"] + 1)
        ]
        session.add_all(meetings)

        layouts = [
            PlantLayout(
                tenant_code="default",
                name=f"Layout Demo {i:04d}",
                description="Plano demo",
                json_content=json.dumps({"version": "6.0", "objects": [{"type": "rect", "left": 40, "top": 40, "width": 120, "height": 60}]}),
                plant_id=pick(machines).id,
            )
            for i in range(1, cfg["layouts"] + 1)
        ]
        session.add_all(layouts)

        vsm = [
            VSMCanvas(
                tenant_code="default",
                name=f"VSM Demo {i:04d}",
                asset_id=pick(machines).id,
                nodes_json=json.dumps([{"id": "n1", "label": "Recepción"}, {"id": "n2", "label": "Proceso"}]),
                edges_json=json.dumps([{"id": "e1", "source": "n1", "target": "n2", "flow": random.randint(60, 140)}]),
                constraints_json=json.dumps({"takt_time_sec": random.randint(25, 75)}),
                created_by="seed.demo",
            )
            for i in range(1, cfg["vsm"] + 1)
        ]
        session.add_all(vsm)
        session.commit()

    print("[SEED] Seed masivo completado.")
    print(
        "[SEED] Conteo objetivo: "
        f"refs={cfg['refs']} standards={cfg['standards']} samples~{cfg['specs'] * cfg['samples']} meetings={cfg['meetings']}"
    )


def main():
    parser = argparse.ArgumentParser(description="Seed masivo de datos demo para Takta.")
    parser.add_argument("--scale", choices=sorted(SCALES.keys()), default="medium")
    parser.add_argument("--seed", type=int, default=None)
    args = parser.parse_args()
    seed(args.scale, args.seed)


if __name__ == "__main__":
    main()
