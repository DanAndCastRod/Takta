from io import BytesIO

from openpyxl import Workbook


def _create_quality_catalog(client, auth_headers):
    asset_resp = client.post(
        "/api/assets/",
        json={"name": "Linea QA", "type": "Linea"},
        headers=auth_headers,
    )
    assert asset_resp.status_code in (200, 201)
    asset_id = asset_resp.json()["id"]

    activity_resp = client.post(
        "/api/engineering/activities/",
        json={"name": "Pesaje", "type": "Inspection", "is_value_added": True},
        headers=auth_headers,
    )
    assert activity_resp.status_code == 200
    activity_id = activity_resp.json()["id"]

    reference_resp = client.post(
        "/api/engineering/references/",
        json={
            "code": "QA-SKU-001",
            "description": "Producto QA",
            "family": "QA",
            "uom": "g",
            "packaging_uom": "caja",
        },
        headers=auth_headers,
    )
    assert reference_resp.status_code == 200
    reference_id = reference_resp.json()["id"]

    standard_resp = client.post(
        "/api/engineering/standards/",
        json={
            "asset_id": asset_id,
            "activity_id": activity_id,
            "product_reference_id": reference_id,
            "standard_time_minutes": 1.2,
            "frequency": "Per unit",
        },
        headers=auth_headers,
    )
    assert standard_resp.status_code == 200
    standard_id = standard_resp.json()["id"]
    return asset_id, reference_id, standard_id


def test_create_weight_spec_and_list(client, auth_headers):
    asset_id, reference_id, standard_id = _create_quality_catalog(client, auth_headers)

    create_resp = client.post(
        "/api/quality/weight-specs",
        json={
            "name": "Control Peso Bolsa 500g",
            "asset_id": asset_id,
            "product_reference_id": reference_id,
            "process_standard_id": standard_id,
            "unit": "g",
            "lower_limit": 495,
            "target_weight": 500,
            "upper_limit": 505,
            "warning_band_pct": 0.1,
            "sample_size": 5,
            "notes": "Linea principal",
            "is_active": True,
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    payload = create_resp.json()
    assert payload["name"] == "Control Peso Bolsa 500g"
    assert payload["asset_id"] == asset_id
    assert payload["reference_code"] == "QA-SKU-001"
    assert payload["samples_count"] == 0

    list_resp = client.get(
        f"/api/quality/weight-specs?asset_id={asset_id}",
        headers=auth_headers,
    )
    assert list_resp.status_code == 200
    rows = list_resp.json()
    assert len(rows) == 1
    assert rows[0]["id"] == payload["id"]


def test_weight_sample_status_and_summary(client, auth_headers):
    asset_id, reference_id, standard_id = _create_quality_catalog(client, auth_headers)
    spec_resp = client.post(
        "/api/quality/weight-specs",
        json={
            "name": "Control Peso QA",
            "asset_id": asset_id,
            "product_reference_id": reference_id,
            "process_standard_id": standard_id,
            "unit": "g",
            "lower_limit": 95,
            "target_weight": 100,
            "upper_limit": 105,
            "warning_band_pct": 0.1,
            "sample_size": 5,
        },
        headers=auth_headers,
    )
    spec_id = spec_resp.json()["id"]

    green_sample = client.post(
        f"/api/quality/weight-specs/{spec_id}/samples",
        json={"measured_value": 100.0, "measured_by": "qa1"},
        headers=auth_headers,
    )
    assert green_sample.status_code == 200
    assert green_sample.json()["status_color"] == "green"

    yellow_sample = client.post(
        f"/api/quality/weight-specs/{spec_id}/samples",
        json={"measured_value": 95.5, "measured_by": "qa1"},
        headers=auth_headers,
    )
    assert yellow_sample.status_code == 200
    assert yellow_sample.json()["status_color"] == "yellow"

    red_sample = client.post(
        f"/api/quality/weight-specs/{spec_id}/samples",
        json={"measured_value": 110.0, "measured_by": "qa1"},
        headers=auth_headers,
    )
    assert red_sample.status_code == 200
    assert red_sample.json()["status_color"] == "red"

    summary_resp = client.get(f"/api/quality/weight-specs/{spec_id}/summary", headers=auth_headers)
    assert summary_resp.status_code == 200
    summary = summary_resp.json()
    assert summary["samples_count"] == 3
    assert summary["in_spec_count"] == 2
    assert summary["status_breakdown"]["green"] == 1
    assert summary["status_breakdown"]["yellow"] == 1
    assert summary["status_breakdown"]["red"] == 1


def test_update_and_delete_weight_entities(client, auth_headers):
    asset_id, reference_id, standard_id = _create_quality_catalog(client, auth_headers)
    spec_resp = client.post(
        "/api/quality/weight-specs",
        json={
            "name": "Control Editable",
            "asset_id": asset_id,
            "product_reference_id": reference_id,
            "process_standard_id": standard_id,
            "unit": "g",
            "lower_limit": 200,
            "target_weight": 210,
            "upper_limit": 220,
            "warning_band_pct": 0.1,
            "sample_size": 3,
        },
        headers=auth_headers,
    )
    spec_id = spec_resp.json()["id"]

    patch_resp = client.patch(
        f"/api/quality/weight-specs/{spec_id}",
        json={"upper_limit": 225, "notes": "Ajustado"},
        headers=auth_headers,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["upper_limit"] == 225
    assert patch_resp.json()["notes"] == "Ajustado"

    sample_resp = client.post(
        f"/api/quality/weight-specs/{spec_id}/samples",
        json={"measured_value": 212, "measured_by": "qa2"},
        headers=auth_headers,
    )
    assert sample_resp.status_code == 200
    sample_id = sample_resp.json()["id"]

    sample_patch = client.patch(
        f"/api/quality/weight-samples/{sample_id}",
        json={"measured_value": 230},
        headers=auth_headers,
    )
    assert sample_patch.status_code == 200
    assert sample_patch.json()["status_color"] == "red"

    sample_delete = client.delete(f"/api/quality/weight-samples/{sample_id}", headers=auth_headers)
    assert sample_delete.status_code == 204

    spec_delete = client.delete(f"/api/quality/weight-specs/{spec_id}", headers=auth_headers)
    assert spec_delete.status_code == 204

    spec_get = client.get(f"/api/quality/weight-specs/{spec_id}", headers=auth_headers)
    assert spec_get.status_code == 404


def test_import_quality_xlsx(client, auth_headers):
    asset_id, reference_id, standard_id = _create_quality_catalog(client, auth_headers)

    wb_specs = Workbook()
    ws_specs = wb_specs.active
    ws_specs.title = "specs"
    ws_specs.append(
        [
            "id",
            "name",
            "asset_id",
            "product_reference_id",
            "process_standard_id",
            "unit",
            "lower_limit",
            "target_weight",
            "upper_limit",
            "warning_band_pct",
            "sample_size",
            "notes",
            "is_active",
        ]
    )
    ws_specs.append(
        [
            "",
            "Control XLSX",
            asset_id,
            reference_id,
            standard_id,
            "g",
            50,
            55,
            60,
            0.1,
            5,
            "cargado por xlsx",
            True,
        ]
    )
    specs_buffer = BytesIO()
    wb_specs.save(specs_buffer)
    specs_buffer.seek(0)

    import_specs_resp = client.post(
        "/api/quality/weights/xlsx/import?entity=specs",
        files={
            "file": (
                "weight_specs.xlsx",
                specs_buffer.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
        headers=auth_headers,
    )
    assert import_specs_resp.status_code == 200
    assert import_specs_resp.json()["created"] >= 1

    specs_list = client.get("/api/quality/weight-specs", headers=auth_headers).json()
    target_spec = next((row for row in specs_list if row["name"] == "Control XLSX"), None)
    assert target_spec is not None

    wb_samples = Workbook()
    ws_samples = wb_samples.active
    ws_samples.title = "samples"
    ws_samples.append(
        [
            "id",
            "specification_id",
            "measured_value",
            "measured_at",
            "measured_by",
            "batch_code",
            "shift",
            "notes",
        ]
    )
    ws_samples.append(
        [
            "",
            target_spec["id"],
            56.2,
            "2026-03-01T10:00:00",
            "qa.xlsx",
            "L-001",
            "Manana",
            "registro importado",
        ]
    )
    samples_buffer = BytesIO()
    wb_samples.save(samples_buffer)
    samples_buffer.seek(0)

    import_samples_resp = client.post(
        "/api/quality/weights/xlsx/import?entity=samples",
        files={
            "file": (
                "weight_samples.xlsx",
                samples_buffer.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
        headers=auth_headers,
    )
    assert import_samples_resp.status_code == 200
    assert import_samples_resp.json()["created"] >= 1

    samples_list = client.get(
        f"/api/quality/weight-specs/{target_spec['id']}/samples",
        headers=auth_headers,
    )
    assert samples_list.status_code == 200
    assert len(samples_list.json()) >= 1


def test_create_weight_spec_unauthorized(client):
    response = client.post(
        "/api/quality/weight-specs",
        json={
            "name": "Unauthorized",
            "unit": "g",
            "lower_limit": 10,
            "target_weight": 11,
            "upper_limit": 12,
        },
    )
    assert response.status_code == 401


def test_weight_spc_chart_rules_and_export(client, auth_headers):
    asset_id, reference_id, standard_id = _create_quality_catalog(client, auth_headers)
    spec_resp = client.post(
        "/api/quality/weight-specs",
        json={
            "name": "SPC Chart QA",
            "asset_id": asset_id,
            "product_reference_id": reference_id,
            "process_standard_id": standard_id,
            "unit": "g",
            "lower_limit": 98.5,
            "target_weight": 100.0,
            "upper_limit": 101.5,
            "warning_band_pct": 0.1,
            "sample_size": 5,
        },
        headers=auth_headers,
    )
    assert spec_resp.status_code == 200
    spec_id = spec_resp.json()["id"]

    baseline = [100.0, 100.1, 99.9, 100.0, 100.05, 100.02, 99.98, 100.04, 99.96, 100.03, 100.01]
    for value in baseline:
        create_resp = client.post(
            f"/api/quality/weight-specs/{spec_id}/samples",
            json={"measured_value": value, "measured_by": "spc.qa"},
            headers=auth_headers,
        )
        assert create_resp.status_code == 200

    extreme_resp = client.post(
        f"/api/quality/weight-specs/{spec_id}/samples",
        json={"measured_value": 104.0, "measured_by": "spc.qa"},
        headers=auth_headers,
    )
    assert extreme_resp.status_code == 200

    chart_resp = client.get(
        f"/api/quality/weight-specs/{spec_id}/spc/chart?limit=200&include_rules=true",
        headers=auth_headers,
    )
    assert chart_resp.status_code == 200
    chart = chart_resp.json()
    assert chart["chart_type"] == "I-MR"
    assert chart["samples_count"] == 12
    assert chart["center_line"] is not None
    assert chart["ucl"] is not None
    assert chart["lcl"] is not None
    assert chart["rules"]["violations_count"] >= 1
    assert chart["alert_level"] in {"critical", "warning", "healthy"}
    assert any(row["rule_code"] == "WE1" for row in chart["rules"]["violations"])

    export_resp = client.get(
        f"/api/quality/weight-specs/{spec_id}/spc/export/csv?limit=200",
        headers=auth_headers,
    )
    assert export_resp.status_code == 200
    assert "text/csv" in export_resp.headers["content-type"]
    assert "sample_id" in export_resp.text


def test_weight_spc_capability(client, auth_headers):
    asset_id, reference_id, standard_id = _create_quality_catalog(client, auth_headers)
    spec_resp = client.post(
        "/api/quality/weight-specs",
        json={
            "name": "SPC Capability QA",
            "asset_id": asset_id,
            "product_reference_id": reference_id,
            "process_standard_id": standard_id,
            "unit": "g",
            "lower_limit": 99.0,
            "target_weight": 100.0,
            "upper_limit": 101.0,
            "warning_band_pct": 0.1,
            "sample_size": 5,
        },
        headers=auth_headers,
    )
    assert spec_resp.status_code == 200
    spec_id = spec_resp.json()["id"]

    values = [100.0, 100.1, 99.95, 100.05, 99.9, 100.08, 99.92, 100.02, 100.0, 99.98, 100.03, 99.97]
    for value in values:
        create_resp = client.post(
            f"/api/quality/weight-specs/{spec_id}/samples",
            json={"measured_value": value, "measured_by": "cap.qa"},
            headers=auth_headers,
        )
        assert create_resp.status_code == 200

    capability_resp = client.get(
        f"/api/quality/weight-specs/{spec_id}/spc/capability?limit=200",
        headers=auth_headers,
    )
    assert capability_resp.status_code == 200
    capability = capability_resp.json()
    assert capability["samples_count"] == len(values)
    assert capability["cp"] is not None
    assert capability["cpk"] is not None
    assert capability["pp"] is not None
    assert capability["ppk"] is not None
    assert capability["status"] in {"capable", "marginal", "not_capable", "insufficient_data"}


def test_weight_spc_capability_math_consistency(client, auth_headers):
    asset_id, reference_id, standard_id = _create_quality_catalog(client, auth_headers)
    spec_resp = client.post(
        "/api/quality/weight-specs",
        json={
            "name": "SPC Math QA",
            "asset_id": asset_id,
            "product_reference_id": reference_id,
            "process_standard_id": standard_id,
            "unit": "g",
            "lower_limit": 95.0,
            "target_weight": 100.0,
            "upper_limit": 105.0,
            "warning_band_pct": 0.1,
            "sample_size": 5,
        },
        headers=auth_headers,
    )
    assert spec_resp.status_code == 200
    spec_id = spec_resp.json()["id"]

    for value in [99.8, 100.1, 100.0, 99.9, 100.2, 99.95, 100.05, 100.0]:
        create_resp = client.post(
            f"/api/quality/weight-specs/{spec_id}/samples",
            json={"measured_value": value, "measured_by": "math.qa", "auto_create_non_conformity": False},
            headers=auth_headers,
        )
        assert create_resp.status_code == 200

    capability = client.get(
        f"/api/quality/weight-specs/{spec_id}/spc/capability?limit=200",
        headers=auth_headers,
    ).json()

    sigma_within = capability["sigma_within"]
    process_mean = capability["process_mean"]
    lower = capability["lower_limit"]
    upper = capability["upper_limit"]
    assert sigma_within is not None
    assert sigma_within > 0
    assert process_mean is not None

    expected_cp = round((upper - lower) / (6 * sigma_within), 6)
    expected_cpk = round(min((upper - process_mean) / (3 * sigma_within), (process_mean - lower) / (3 * sigma_within)), 6)
    assert capability["cp"] == expected_cp
    assert capability["cpk"] == expected_cpk


def test_create_non_conformity_from_spc(client, auth_headers):
    asset_id, reference_id, standard_id = _create_quality_catalog(client, auth_headers)
    spec_resp = client.post(
        "/api/quality/weight-specs",
        json={
            "name": "SPC NC QA",
            "asset_id": asset_id,
            "product_reference_id": reference_id,
            "process_standard_id": standard_id,
            "unit": "g",
            "lower_limit": 98.5,
            "target_weight": 100.0,
            "upper_limit": 101.5,
            "warning_band_pct": 0.1,
            "sample_size": 5,
        },
        headers=auth_headers,
    )
    assert spec_resp.status_code == 200
    spec_id = spec_resp.json()["id"]

    for value in [100.0, 100.1, 100.0, 99.9, 100.05, 100.02, 99.98, 100.04, 99.96, 100.01]:
        assert client.post(
            f"/api/quality/weight-specs/{spec_id}/samples",
            json={"measured_value": value, "measured_by": "nc.spc"},
            headers=auth_headers,
        ).status_code == 200
    assert client.post(
        f"/api/quality/weight-specs/{spec_id}/samples",
        json={"measured_value": 104.0, "measured_by": "nc.spc"},
        headers=auth_headers,
    ).status_code == 200

    create_nc_resp = client.post(
        f"/api/quality/non-conformities/from-spc/{spec_id}",
        json={"limit": 300, "title_prefix": "Desvio SPC"},
        headers=auth_headers,
    )
    assert create_nc_resp.status_code == 200
    nc = create_nc_resp.json()
    assert nc["source"] == "spc"
    assert nc["status"] == "Open"
    assert nc["severity"] in {"high", "critical"}

    list_nc_resp = client.get(
        f"/api/quality/non-conformities?weight_specification_id={spec_id}",
        headers=auth_headers,
    )
    assert list_nc_resp.status_code == 200
    rows = list_nc_resp.json()
    assert any(row["id"] == nc["id"] for row in rows)


def test_non_conformity_and_capa_flow(client, auth_headers):
    asset_id, reference_id, standard_id = _create_quality_catalog(client, auth_headers)
    spec_resp = client.post(
        "/api/quality/weight-specs",
        json={
            "name": "NC CAPA QA",
            "asset_id": asset_id,
            "product_reference_id": reference_id,
            "process_standard_id": standard_id,
            "unit": "g",
            "lower_limit": 95.0,
            "target_weight": 100.0,
            "upper_limit": 105.0,
        },
        headers=auth_headers,
    )
    assert spec_resp.status_code == 200
    spec_id = spec_resp.json()["id"]

    sample_resp = client.post(
        f"/api/quality/weight-specs/{spec_id}/samples",
        json={"measured_value": 107.0, "measured_by": "nc.qa"},
        headers=auth_headers,
    )
    assert sample_resp.status_code == 200
    sample_id = sample_resp.json()["id"]

    nc_resp = client.post(
        "/api/quality/non-conformities",
        json={
            "asset_id": asset_id,
            "product_reference_id": reference_id,
            "process_standard_id": standard_id,
            "weight_specification_id": spec_id,
            "weight_sample_id": sample_id,
            "source": "manual",
            "severity": "high",
            "title": "Sobrepeso lote QA",
            "description": "Valor fuera de especificacion",
        },
        headers=auth_headers,
    )
    assert nc_resp.status_code == 200
    nc = nc_resp.json()
    nc_id = nc["id"]

    capa_resp = client.post(
        f"/api/quality/non-conformities/{nc_id}/capa-actions",
        json={
            "action_type": "Corrective",
            "title": "Ajustar calibracion balanza",
            "description": "Recalibrar y verificar patron",
            "responsible": "Supervisor QA",
            "status": "Open",
            "auto_link_improvement_action": True,
        },
        headers=auth_headers,
    )
    assert capa_resp.status_code == 200
    capa = capa_resp.json()
    assert capa["improvement_action_id"] is not None

    capa_list_resp = client.get(
        f"/api/quality/non-conformities/{nc_id}/capa-actions",
        headers=auth_headers,
    )
    assert capa_list_resp.status_code == 200
    capa_rows = capa_list_resp.json()
    assert len(capa_rows) == 1
    assert capa_rows[0]["id"] == capa["id"]

    update_capa_resp = client.patch(
        f"/api/quality/capa-actions/{capa['id']}",
        json={"status": "Closed", "verification_notes": "Accion completada"},
        headers=auth_headers,
    )
    assert update_capa_resp.status_code == 200
    assert update_capa_resp.json()["status"] == "Closed"

    linked_actions = client.get("/api/ci/actions", headers=auth_headers).json()
    linked = [row for row in linked_actions if row["source_document"].startswith(f"CAPA:{nc_id}:")]
    assert len(linked) == 1
    assert linked[0]["status"] == "Closed"

    nc_update_resp = client.patch(
        f"/api/quality/non-conformities/{nc_id}",
        json={"status": "Closed", "root_cause": "Balanza descalibrada"},
        headers=auth_headers,
    )
    assert nc_update_resp.status_code == 200
    assert nc_update_resp.json()["status"] == "Closed"

    dashboard_resp = client.get("/api/quality/capa/dashboard", headers=auth_headers)
    assert dashboard_resp.status_code == 200
    dashboard = dashboard_resp.json()
    assert "non_conformities_total" in dashboard
    assert "capa_actions_total" in dashboard


def test_auto_non_conformity_trigger_on_sample_event(client, auth_headers):
    asset_id, reference_id, standard_id = _create_quality_catalog(client, auth_headers)
    spec_resp = client.post(
        "/api/quality/weight-specs",
        json={
            "name": "Auto NC SPC",
            "asset_id": asset_id,
            "product_reference_id": reference_id,
            "process_standard_id": standard_id,
            "unit": "g",
            "lower_limit": 98.5,
            "target_weight": 100.0,
            "upper_limit": 101.5,
            "warning_band_pct": 0.1,
            "sample_size": 5,
        },
        headers=auth_headers,
    )
    assert spec_resp.status_code == 200
    spec_id = spec_resp.json()["id"]

    for value in [100.0, 99.98, 100.03, 100.01, 99.99, 100.02, 100.01, 99.97, 100.0, 99.96]:
        response = client.post(
            f"/api/quality/weight-specs/{spec_id}/samples",
            json={"measured_value": value, "measured_by": "auto.nc"},
            headers=auth_headers,
        )
        assert response.status_code == 200

    trigger_resp = client.post(
        f"/api/quality/weight-specs/{spec_id}/samples",
        json={
            "measured_value": 104.2,
            "measured_by": "auto.nc",
            "auto_create_non_conformity": True,
            "minimum_alert_level": "warning",
        },
        headers=auth_headers,
    )
    assert trigger_resp.status_code == 200
    payload = trigger_resp.json()
    assert payload.get("auto_non_conformity_id") is not None

    ncs_resp = client.get(
        f"/api/quality/non-conformities?weight_specification_id={spec_id}",
        headers=auth_headers,
    )
    assert ncs_resp.status_code == 200
    rows = ncs_resp.json()
    assert len(rows) >= 1
    assert any(row["source"] == "spc" for row in rows)


def test_capability_runs_batch_trend_and_ci_integration(client, auth_headers):
    asset_id, reference_id, standard_id = _create_quality_catalog(client, auth_headers)
    spec_resp = client.post(
        "/api/quality/weight-specs",
        json={
            "name": "Capability Run QA",
            "asset_id": asset_id,
            "product_reference_id": reference_id,
            "process_standard_id": standard_id,
            "unit": "g",
            "lower_limit": 99.0,
            "target_weight": 100.0,
            "upper_limit": 101.0,
            "warning_band_pct": 0.1,
            "sample_size": 5,
        },
        headers=auth_headers,
    )
    assert spec_resp.status_code == 200
    spec_id = spec_resp.json()["id"]

    # High variability to force non-capable status and action linkage.
    for value in [99.0, 101.0, 98.9, 101.1, 99.1, 100.9, 99.2, 100.8, 99.3, 100.7, 99.4, 100.6]:
        response = client.post(
            f"/api/quality/weight-specs/{spec_id}/samples",
            json={"measured_value": value, "measured_by": "cap.run", "auto_create_non_conformity": False},
            headers=auth_headers,
        )
        assert response.status_code == 200

    run_resp = client.post(
        f"/api/quality/weight-specs/{spec_id}/spc/capability/runs",
        json={"limit": 200, "run_type": "on_demand", "auto_link_improvement_action": True},
        headers=auth_headers,
    )
    assert run_resp.status_code == 200
    run = run_resp.json()
    assert run["capability_status"] in {"marginal", "not_capable", "capable", "insufficient_data"}
    if run["capability_status"] in {"marginal", "not_capable"}:
        assert run["improvement_action_id"] is not None

    batch_resp = client.post(
        "/api/quality/spc/capability/runs/batch",
        json={"limit": 200, "asset_id": asset_id, "run_type": "batch", "only_active": True},
        headers=auth_headers,
    )
    assert batch_resp.status_code == 200
    assert batch_resp.json()["created_runs"] >= 1

    list_resp = client.get(
        f"/api/quality/weight-specs/{spec_id}/spc/capability/runs?limit=20",
        headers=auth_headers,
    )
    assert list_resp.status_code == 200
    rows = list_resp.json()
    assert len(rows) >= 2

    trend_resp = client.get(
        f"/api/quality/weight-specs/{spec_id}/spc/capability/trend?bucket=month&points=12",
        headers=auth_headers,
    )
    assert trend_resp.status_code == 200
    trend = trend_resp.json()
    assert trend["bucket"] == "month"
    assert len(trend["series"]) >= 1


def test_capa_workflow_multirole_restrictions(client, auth_headers, engineer_token):
    asset_id, reference_id, standard_id = _create_quality_catalog(client, auth_headers)
    spec_resp = client.post(
        "/api/quality/weight-specs",
        json={
            "name": "Workflow CAPA QA",
            "asset_id": asset_id,
            "product_reference_id": reference_id,
            "process_standard_id": standard_id,
            "unit": "g",
            "lower_limit": 95.0,
            "target_weight": 100.0,
            "upper_limit": 105.0,
        },
        headers=auth_headers,
    )
    assert spec_resp.status_code == 200
    spec_id = spec_resp.json()["id"]

    sample = client.post(
        f"/api/quality/weight-specs/{spec_id}/samples",
        json={"measured_value": 107.0, "measured_by": "wf.qa"},
        headers=auth_headers,
    ).json()

    nc = client.post(
        "/api/quality/non-conformities",
        json={
            "asset_id": asset_id,
            "product_reference_id": reference_id,
            "process_standard_id": standard_id,
            "weight_specification_id": spec_id,
            "weight_sample_id": sample["id"],
            "source": "manual",
            "severity": "high",
            "title": "NC workflow",
            "description": "Flujo por rol",
        },
        headers=auth_headers,
    ).json()

    capa_resp = client.post(
        f"/api/quality/non-conformities/{nc['id']}/capa-actions",
        json={
            "action_type": "Corrective",
            "title": "Accion CAPA workflow",
            "responsible": "Lider QA",
            "status": "Open",
            "auto_link_improvement_action": True,
        },
        headers=auth_headers,
    )
    assert capa_resp.status_code == 200
    capa = capa_resp.json()

    engineer_headers = {"Authorization": f"Bearer {engineer_token}"}
    to_close_requested = client.patch(
        f"/api/quality/capa-actions/{capa['id']}",
        json={"status": "Close Requested"},
        headers=engineer_headers,
    )
    assert to_close_requested.status_code == 200
    assert to_close_requested.json()["status"] == "Close Requested"

    engineer_forbidden_approve = client.patch(
        f"/api/quality/capa-actions/{capa['id']}",
        json={"status": "Approved"},
        headers=engineer_headers,
    )
    assert engineer_forbidden_approve.status_code == 403

    admin_approve = client.patch(
        f"/api/quality/capa-actions/{capa['id']}",
        json={"status": "Approved"},
        headers=auth_headers,
    )
    assert admin_approve.status_code == 200
    assert admin_approve.json()["status"] == "Approved"
    assert admin_approve.json()["approved_by"] is not None

    admin_verify = client.patch(
        f"/api/quality/capa-actions/{capa['id']}",
        json={"status": "Verified", "verification_notes": "Verificado"},
        headers=auth_headers,
    )
    assert admin_verify.status_code == 200
    assert admin_verify.json()["status"] == "Verified"
    assert admin_verify.json()["verified_by"] is not None
