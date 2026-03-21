"""
Tests for the Engineering router (Sprint 5): Activities, References, Standards.
"""
from io import BytesIO
import pytest
from openpyxl import Workbook
from sqlmodel import Session
from backend.app.models import (
    StandardActivity, ProductReference, ProcessStandard, Asset
)


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Activities
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def test_create_activity(client, auth_headers):
    """Create a new activity with auth."""
    response = client.post(
        "/api/engineering/activities/",
        json={"name": "Ensamble", "type": "Operation", "is_value_added": True},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Ensamble"
    assert data["type"] == "Operation"
    assert data["is_value_added"] is True
    assert "id" in data


def test_list_activities(client, auth_headers):
    """Create multiple activities and list them."""
    client.post(
        "/api/engineering/activities/",
        json={"name": "Transporte A", "type": "Transport", "is_value_added": False},
        headers=auth_headers
    )
    client.post(
        "/api/engineering/activities/",
        json={"name": "InspecciÃ³n Visual", "type": "Inspection", "is_value_added": False},
        headers=auth_headers
    )
    response = client.get("/api/engineering/activities/", headers=auth_headers)
    assert response.status_code == 200
    activities = response.json()
    assert len(activities) >= 2


def test_filter_activities_by_type(client, auth_headers):
    """Filter activities by type."""
    client.post(
        "/api/engineering/activities/",
        json={"name": "Op1", "type": "Operation", "is_value_added": True},
        headers=auth_headers
    )
    client.post(
        "/api/engineering/activities/",
        json={"name": "Delay1", "type": "Delay", "is_value_added": False},
        headers=auth_headers
    )
    response = client.get("/api/engineering/activities/?type=Delay", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert all(a["type"] == "Delay" for a in data)


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# References (SKU)
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def test_create_reference(client, auth_headers):
    """Create a product reference."""
    response = client.post(
        "/api/engineering/references/",
        json={
            "code": "SKU-001",
            "description": "Pollo Entero 1kg",
            "family": "Pollo",
            "uom": "kg",
            "packaging_uom": "caja",
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "SKU-001"
    assert data["family"] == "Pollo"
    assert data["uom"] == "kg"
    assert data["packaging_uom"] == "caja"


def test_create_reference_duplicate_code_fails(client, auth_headers):
    """Duplicate reference code should return 409."""
    client.post(
        "/api/engineering/references/",
        json={"code": "SKU-DUP", "description": "Desc A", "family": "FamA"},
        headers=auth_headers
    )
    response = client.post(
        "/api/engineering/references/",
        json={"code": "SKU-DUP", "description": "Desc B", "family": "FamB"},
        headers=auth_headers
    )
    assert response.status_code == 409


def test_list_references(client, auth_headers):
    """List references."""
    client.post(
        "/api/engineering/references/",
        json={"code": "REF-A", "description": "Producto A", "family": "Fam1"},
        headers=auth_headers
    )
    response = client.get("/api/engineering/references/", headers=auth_headers)
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_search_references(client, auth_headers):
    """Search references by code or description."""
    client.post(
        "/api/engineering/references/",
        json={"code": "SEARCH-XYZ", "description": "Hamburguesa Premium", "family": "Carne"},
        headers=auth_headers
    )
    # Search by code
    resp1 = client.get("/api/engineering/references/?search=SEARCH-X", headers=auth_headers)
    assert resp1.status_code == 200
    assert any(r["code"] == "SEARCH-XYZ" for r in resp1.json())

    # Search by description
    resp2 = client.get("/api/engineering/references/?search=hamburguesa", headers=auth_headers)
    assert resp2.status_code == 200
    assert any(r["code"] == "SEARCH-XYZ" for r in resp2.json())


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Standards (Triad)
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _create_test_data(client, auth_headers):
    """Helper: create an asset, activity, and reference for standard tests."""
    # Create asset
    asset_resp = client.post(
        "/api/assets/",
        json={"name": "Maquina Test", "type": "Maquina"},
        headers=auth_headers
    )
    asset_id = asset_resp.json()["id"]

    # Create activity
    act_resp = client.post(
        "/api/engineering/activities/",
        json={"name": "Corte", "type": "Operation", "is_value_added": True},
        headers=auth_headers
    )
    activity_id = act_resp.json()["id"]

    # Create reference
    ref_resp = client.post(
        "/api/engineering/references/",
        json={"code": "STD-REF-001", "description": "Ref Test", "family": "TestFam"},
        headers=auth_headers
    )
    reference_id = ref_resp.json()["id"]

    return asset_id, activity_id, reference_id


def test_create_standard(client, auth_headers):
    """Create a process standard (triad)."""
    asset_id, activity_id, reference_id = _create_test_data(client, auth_headers)

    response = client.post(
        "/api/engineering/standards/",
        json={
            "asset_id": asset_id,
            "activity_id": activity_id,
            "product_reference_id": reference_id,
            "standard_time_minutes": 2.5,
            "frequency": "Per Unit"
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["asset_name"] == "Maquina Test"
    assert data["activity_name"] == "Corte"
    assert data["reference_code"] == "STD-REF-001"
    assert data["standard_time_minutes"] == 2.5
    assert data["is_active"] is True


def test_create_standard_duplicate_triad_fails(client, auth_headers):
    """Duplicate triad should return 409."""
    asset_id, activity_id, reference_id = _create_test_data(client, auth_headers)

    payload = {
        "asset_id": asset_id,
        "activity_id": activity_id,
        "product_reference_id": reference_id,
    }
    client.post("/api/engineering/standards/", json=payload, headers=auth_headers)
    response = client.post("/api/engineering/standards/", json=payload, headers=auth_headers)
    assert response.status_code == 409


def test_list_standards_by_asset(client, auth_headers):
    """List standards filtered by asset."""
    asset_id, activity_id, reference_id = _create_test_data(client, auth_headers)

    client.post(
        "/api/engineering/standards/",
        json={"asset_id": asset_id, "activity_id": activity_id},
        headers=auth_headers
    )

    # Filter by asset
    resp = client.get(f"/api/engineering/standards/?asset_id={asset_id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data) >= 1
    assert all(s["asset_id"] == asset_id for s in data)


def test_toggle_standard_active(client, auth_headers):
    """Toggle is_active on a standard via PATCH."""
    asset_id, activity_id, reference_id = _create_test_data(client, auth_headers)

    create_resp = client.post(
        "/api/engineering/standards/",
        json={"asset_id": asset_id, "activity_id": activity_id},
        headers=auth_headers
    )
    standard_id = create_resp.json()["id"]

    # Deactivate
    patch_resp = client.patch(
        f"/api/engineering/standards/{standard_id}",
        json={"is_active": False},
        headers=auth_headers
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["is_active"] is False

    # Reactivate
    patch_resp2 = client.patch(
        f"/api/engineering/standards/{standard_id}",
        json={"is_active": True},
        headers=auth_headers
    )
    assert patch_resp2.json()["is_active"] is True


def test_create_standard_unauthorized(client):
    """Creating a standard without auth should fail with 401."""
    response = client.post(
        "/api/engineering/standards/",
        json={"asset_id": "fake", "activity_id": "fake"}
    )
    assert response.status_code == 401


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Time Studies (Sprint 6 â€” Chronometer)
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def _create_study_with_elements(client, auth_headers):
    """Helper: create a time study with 3 elements."""
    resp = client.post(
        "/api/engineering/studies/",
        json={
            "name": "Estudio LÃ­nea Sellado",
            "analyst_name": "Ing. PÃ©rez",
            "study_type": "continuous",
            "rating_factor": 1.1,
            "supplements_pct": 0.15,
            "elements": [
                {"name": "Carga MP", "type": "operation", "is_cyclic": True, "order": 1},
                {"name": "Sellado", "type": "operation", "is_cyclic": True, "order": 2},
                {"name": "InspecciÃ³n", "type": "inspection", "is_cyclic": True, "order": 3},
            ]
        },
        headers=auth_headers
    )
    return resp


def test_create_study_with_asset_and_reference(client, auth_headers):
    """Study can be explicitly linked to asset + SKU."""
    asset_resp = client.post(
        "/api/assets/",
        json={"name": "Linea Empaque", "type": "Linea"},
        headers=auth_headers,
    )
    asset_id = asset_resp.json()["id"]

    ref_resp = client.post(
        "/api/engineering/references/",
        json={
            "code": "SKU-LINK-01",
            "description": "Referencia vinculada",
            "family": "Test",
            "uom": "und",
            "packaging_uom": "caja",
        },
        headers=auth_headers,
    )
    ref_id = ref_resp.json()["id"]

    create_resp = client.post(
        "/api/engineering/studies/",
        json={
            "name": "Estudio Asociado",
            "analyst_name": "Ing. QA",
            "asset_id": asset_id,
            "product_reference_id": ref_id,
            "elements": [
                {"name": "E1", "type": "operation", "is_cyclic": True, "order": 1}
            ],
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    study_id = create_resp.json()["id"]

    detail = client.get(f"/api/engineering/studies/{study_id}", headers=auth_headers)
    assert detail.status_code == 200
    payload = detail.json()
    assert payload["asset_id"] == asset_id
    assert payload["product_reference_id"] == ref_id
    assert payload["reference_code"] == "SKU-LINK-01"


def test_create_study_with_elements(client, auth_headers):
    """Create a time study with pre-mapped elements."""
    resp = _create_study_with_elements(client, auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Estudio LÃ­nea Sellado"
    assert data["elements_count"] == 3
    assert data["status"] == "draft"


def test_list_studies(client, auth_headers):
    """List time studies returns recent first."""
    _create_study_with_elements(client, auth_headers)
    resp = client.get("/api/engineering/studies/", headers=auth_headers)
    assert resp.status_code == 200
    studies = resp.json()
    assert len(studies) >= 1
    assert studies[0]["analyst_name"] == "Ing. PÃ©rez"


def test_get_study_detail(client, auth_headers):
    """Get study with its elements."""
    create_resp = _create_study_with_elements(client, auth_headers)
    study_id = create_resp.json()["id"]

    resp = client.get(f"/api/engineering/studies/{study_id}", headers=auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["elements"]) == 3
    assert data["elements"][0]["name"] == "Carga MP"
    assert data["elements"][0]["order"] == 1


def test_start_session(client, auth_headers):
    """Start a recording session for a study."""
    create_resp = _create_study_with_elements(client, auth_headers)
    study_id = create_resp.json()["id"]

    resp = client.post(
        f"/api/engineering/studies/{study_id}/sessions",
        headers=auth_headers
    )
    assert resp.status_code == 200
    assert "session_id" in resp.json()
    assert "started_at" in resp.json()


def test_record_laps(client, auth_headers):
    """Record laps into an active session."""
    create_resp = _create_study_with_elements(client, auth_headers)
    study_id = create_resp.json()["id"]

    # Get element IDs
    detail = client.get(f"/api/engineering/studies/{study_id}", headers=auth_headers).json()
    elem_ids = [e["id"] for e in detail["elements"]]

    # Start session
    client.post(f"/api/engineering/studies/{study_id}/sessions", headers=auth_headers)

    # Record 3 laps (one per element, cycle 1)
    for i, eid in enumerate(elem_ids):
        resp = client.post(
            f"/api/engineering/studies/{study_id}/laps",
            json={
                "element_id": eid,
                "cycle_number": 1,
                "split_time_ms": 5000 + i * 1000,
                "units_count": 1,
            },
            headers=auth_headers
        )
        assert resp.status_code == 200
        assert resp.json()["cycle_number"] == 1


def test_record_lap_without_session_fails(client, auth_headers):
    """Recording a lap without an active session should fail."""
    create_resp = _create_study_with_elements(client, auth_headers)
    study_id = create_resp.json()["id"]
    detail = client.get(f"/api/engineering/studies/{study_id}", headers=auth_headers).json()

    resp = client.post(
        f"/api/engineering/studies/{study_id}/laps",
        json={
            "element_id": detail["elements"][0]["id"],
            "cycle_number": 1,
            "split_time_ms": 5000,
        },
        headers=auth_headers
    )
    assert resp.status_code == 400


def test_calculate_results(client, auth_headers):
    """Full flow: create study â†’ session â†’ laps â†’ calculate TN/TE."""
    create_resp = _create_study_with_elements(client, auth_headers)
    study_id = create_resp.json()["id"]

    detail = client.get(f"/api/engineering/studies/{study_id}", headers=auth_headers).json()
    elem_ids = [e["id"] for e in detail["elements"]]

    # Start session
    client.post(f"/api/engineering/studies/{study_id}/sessions", headers=auth_headers)

    # Record 5 cycles of laps
    for cycle in range(1, 6):
        for i, eid in enumerate(elem_ids):
            client.post(
                f"/api/engineering/studies/{study_id}/laps",
                json={
                    "element_id": eid,
                    "cycle_number": cycle,
                    "split_time_ms": 5000 + i * 1000,  # 5s, 6s, 7s
                    "units_count": 1,
                },
                headers=auth_headers
            )

    # Get results
    resp = client.get(f"/api/engineering/studies/{study_id}/results", headers=auth_headers)
    assert resp.status_code == 200
    results = resp.json()

    assert len(results["elements"]) == 3
    assert results["total_standard_time_ms"] > 0
    assert results["uph"] > 0

    # Verify TN = avg * rating(1.1), TE = TN * (1 + 0.15)
    first_elem = results["elements"][0]
    assert first_elem["element_name"] == "Carga MP"
    assert first_elem["observations"] == 5
    # avg = 5000ms, TN = 5000 * 1.1 = 5500, TE = 5500 * 1.15 = 6325
    assert first_elem["normal_time_ms"] == 5500.0
    assert first_elem["standard_time_ms"] == 6325.0


def test_apply_results_to_standard(client, auth_headers):
    """Results endpoint can feed standard_time_minutes in ProcessStandard."""
    asset_id, activity_id, reference_id = _create_test_data(client, auth_headers)

    standard_resp = client.post(
        "/api/engineering/standards/",
        json={
            "asset_id": asset_id,
            "activity_id": activity_id,
            "product_reference_id": reference_id
        },
        headers=auth_headers,
    )
    assert standard_resp.status_code == 200
    standard_id = standard_resp.json()["id"]

    create_resp = client.post(
        "/api/engineering/studies/",
        json={
            "name": "Estudio para alimentar estandar",
            "analyst_name": "Ing. QA",
            "process_standard_id": standard_id,
            "elements": [
                {"name": "Carga", "type": "operation", "is_cyclic": True, "order": 1},
                {"name": "Descarga", "type": "operation", "is_cyclic": True, "order": 2},
            ],
        },
        headers=auth_headers,
    )
    assert create_resp.status_code == 200
    study_id = create_resp.json()["id"]

    client.post(f"/api/engineering/studies/{study_id}/sessions", headers=auth_headers)
    detail = client.get(f"/api/engineering/studies/{study_id}", headers=auth_headers).json()
    element_ids = [e["id"] for e in detail["elements"]]

    for cycle in range(1, 4):
        for idx, element_id in enumerate(element_ids):
            resp = client.post(
                f"/api/engineering/studies/{study_id}/laps",
                json={
                    "element_id": element_id,
                    "cycle_number": cycle,
                    "split_time_ms": 4000 + (idx * 1000),
                    "units_count": 1,
                },
                headers=auth_headers,
            )
            assert resp.status_code == 200

    apply_resp = client.post(
        f"/api/engineering/studies/{study_id}/apply-to-standard",
        json={},
        headers=auth_headers,
    )
    assert apply_resp.status_code == 200
    apply_data = apply_resp.json()
    assert apply_data["process_standard_id"] == standard_id
    assert apply_data["standard_time_minutes"] > 0
    assert apply_data["study_status"] == "completed"

    std_detail = client.get(f"/api/engineering/standards/{standard_id}", headers=auth_headers)
    assert std_detail.status_code == 200
    assert std_detail.json()["standard_time_minutes"] > 0


def test_import_references_xlsx(client, auth_headers):
    """Bulk import for references from xlsx template structure."""
    wb = Workbook()
    ws = wb.active
    ws.title = "references"
    ws.append(["code", "description", "family", "uom", "packaging_uom"])
    ws.append(["BULK-001", "Bulk Ref 1", "FamBulk", "kg", "caja"])
    ws.append(["BULK-002", "Bulk Ref 2", "FamBulk", "und", "bolsa"])

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    response = client.post(
        "/api/engineering/xlsx/import?entity=references",
        files={
            "file": (
                "references.xlsx",
                buffer.getvalue(),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            )
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["entity"] == "references"
    assert payload["created"] >= 2
    assert payload["errors_count"] == 0

    list_resp = client.get("/api/engineering/references?search=BULK-", headers=auth_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) >= 2


def test_delete_time_study(client, auth_headers):
    create_resp = _create_study_with_elements(client, auth_headers)
    study_id = create_resp.json()["id"]

    delete_resp = client.delete(f"/api/engineering/studies/{study_id}", headers=auth_headers)
    assert delete_resp.status_code == 204

    detail_resp = client.get(f"/api/engineering/studies/{study_id}", headers=auth_headers)
    assert detail_resp.status_code == 404


def test_create_study_unauthorized(client):
    """Creating a study without auth should fail with 401."""
    response = client.post(
        "/api/engineering/studies/",
        json={
            "name": "Test",
            "analyst_name": "Anon",
            "elements": [{"name": "E1", "type": "operation", "order": 1}]
        }
    )
    assert response.status_code == 401


