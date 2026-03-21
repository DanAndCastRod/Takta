from datetime import date

from backend.app.models import (
    Asset,
    AuditInstance,
    EngineeringMeeting,
    FormatInstance,
    FormatTemplate,
    ImprovementAction,
    PlantLayout,
    ProcessStandard,
    ProductReference,
    ProductionLog,
    StandardActivity,
    TimeStudy,
    VSMCanvas,
    WeightSample,
    WeightSamplingSpec,
    DowntimeEvent,
)


def _seed_context_entities(session):
    asset = Asset(name="Linea Integrada", type="Linea")
    session.add(asset)

    activity = StandardActivity(name="Empaque", type="Operation", is_value_added=True)
    session.add(activity)

    reference = ProductReference(code="INT-SKU-01", description="SKU Integrado", family="Integracion")
    session.add(reference)
    session.commit()
    session.refresh(asset)
    session.refresh(activity)
    session.refresh(reference)

    standard = ProcessStandard(
        asset_id=asset.id,
        activity_id=activity.id,
        product_reference_id=reference.id,
        standard_time_minutes=1.2,
        is_active=True,
    )
    session.add(standard)
    session.commit()
    session.refresh(standard)

    study = TimeStudy(
        name="Estudio Integrado",
        analyst_name="Ing. Integracion",
        process_standard_id=standard.id,
        asset_id=asset.id,
        product_reference_id=reference.id,
    )
    session.add(study)

    spec = WeightSamplingSpec(
        name="Spec Integrada",
        asset_id=asset.id,
        product_reference_id=reference.id,
        process_standard_id=standard.id,
        unit="g",
        lower_limit=95,
        target_weight=100,
        upper_limit=105,
        created_by="tester",
    )
    session.add(spec)
    session.commit()
    session.refresh(spec)

    sample = WeightSample(
        specification_id=spec.id,
        measured_value=100.5,
        measured_by="tester",
        status_color="green",
    )
    session.add(sample)

    log = ProductionLog(
        asset_id=asset.id,
        shift="Manana",
        event_type="start",
        created_by="tester",
    )
    session.add(log)

    downtime = DowntimeEvent(
        asset_id=asset.id,
        downtime_type="Calidad",
        reported_by="tester",
    )
    session.add(downtime)

    action = ImprovementAction(
        asset_id=asset.id,
        source_document="TEST",
        description="Accion integrada",
        responsible="tester",
    )
    session.add(action)

    audit = AuditInstance(
        asset_id=asset.id,
        type="5S",
        auditor="tester",
        total_score=90,
        max_possible_score=100,
    )
    session.add(audit)

    template = FormatTemplate(
        code="INT_DOC",
        name="Plantilla Integracion",
        category="test",
        markdown_structure="# Test",
    )
    session.add(template)
    session.commit()
    session.refresh(template)

    document = FormatInstance(
        template_id=template.id,
        asset_id=asset.id,
        user_id="tester",
        content_json='{"blocks":[]}',
    )
    session.add(document)

    meeting = EngineeringMeeting(
        asset_id=asset.id,
        title="Meeting Integracion",
        meeting_date=date.today(),
        created_by="tester",
    )
    session.add(meeting)

    layout = PlantLayout(
        name="Layout Integrado",
        json_content='{"objects":[]}',
        plant_id=asset.id,
    )
    session.add(layout)

    vsm = VSMCanvas(
        name="VSM Integrado",
        asset_id=asset.id,
        created_by="tester",
    )
    session.add(vsm)
    session.commit()

    return {
        "asset_id": str(asset.id),
        "reference_id": str(reference.id),
        "standard_id": str(standard.id),
    }


def test_integration_context_options(client, auth_headers, session):
    _seed_context_entities(session)
    response = client.get("/api/integration/context/options", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data["assets"]) >= 1
    assert len(data["references"]) >= 1
    assert len(data["standards"]) >= 1


def test_integration_context_summary(client, auth_headers, session):
    ids = _seed_context_entities(session)
    response = client.get(
        f"/api/integration/context/summary?asset_id={ids['asset_id']}&product_reference_id={ids['reference_id']}&process_standard_id={ids['standard_id']}",
        headers=auth_headers,
    )
    assert response.status_code == 200
    payload = response.json()
    counts = payload["counts"]
    assert counts["standards"] >= 1
    assert counts["studies"] >= 1
    assert counts["weight_specs"] >= 1
    assert counts["weight_samples"] >= 1
    assert counts["production_logs"] >= 1
    assert counts["downtimes"] >= 1
    assert counts["actions"] >= 1
    assert counts["audits"] >= 1
    assert counts["documents"] >= 1
    assert counts["meetings"] >= 1
    assert counts["layouts"] >= 1
    assert counts["vsm_canvases"] >= 1
    assert payload["implementation"]["phase"] == "V2-S01"
    assert len(payload["quick_links"]) >= 5


def test_integration_context_summary_unauthorized(client):
    response = client.get("/api/integration/context/summary")
    assert response.status_code == 401


def test_integration_context_summary_not_found_asset(client, auth_headers):
    response = client.get(
        "/api/integration/context/summary?asset_id=11111111-1111-1111-1111-111111111111",
        headers=auth_headers,
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Asset not found."


def test_integration_context_summary_rejects_mismatched_standard_context(client, auth_headers, session):
    ids = _seed_context_entities(session)
    other_asset = Asset(name="Linea Alterna", type="Linea")
    session.add(other_asset)
    session.commit()
    session.refresh(other_asset)

    response = client.get(
        (
            "/api/integration/context/summary?"
            f"asset_id={other_asset.id}&process_standard_id={ids['standard_id']}"
        ),
        headers=auth_headers,
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "asset_id does not match process_standard_id."
