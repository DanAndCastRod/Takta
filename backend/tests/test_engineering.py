"""
Tests for the Engineering router (Sprint 5): Activities, References, Standards.
"""
import pytest
from sqlmodel import Session
from backend.app.models import (
    StandardActivity, ProductReference, ProcessStandard, Asset
)


# ─────────────────────────────────────────────
# Activities
# ─────────────────────────────────────────────

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
        json={"name": "Inspección Visual", "type": "Inspection", "is_value_added": False},
        headers=auth_headers
    )
    response = client.get("/api/engineering/activities/")
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
    response = client.get("/api/engineering/activities/?type=Delay")
    assert response.status_code == 200
    data = response.json()
    assert all(a["type"] == "Delay" for a in data)


# ─────────────────────────────────────────────
# References (SKU)
# ─────────────────────────────────────────────

def test_create_reference(client, auth_headers):
    """Create a product reference."""
    response = client.post(
        "/api/engineering/references/",
        json={"code": "SKU-001", "description": "Pollo Entero 1kg", "family": "Pollo"},
        headers=auth_headers
    )
    assert response.status_code == 200
    data = response.json()
    assert data["code"] == "SKU-001"
    assert data["family"] == "Pollo"


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
    response = client.get("/api/engineering/references/")
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
    resp1 = client.get("/api/engineering/references/?search=SEARCH-X")
    assert resp1.status_code == 200
    assert any(r["code"] == "SEARCH-XYZ" for r in resp1.json())

    # Search by description
    resp2 = client.get("/api/engineering/references/?search=hamburguesa")
    assert resp2.status_code == 200
    assert any(r["code"] == "SEARCH-XYZ" for r in resp2.json())


# ─────────────────────────────────────────────
# Standards (Triad)
# ─────────────────────────────────────────────

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
    resp = client.get(f"/api/engineering/standards/?asset_id={asset_id}")
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


# ─────────────────────────────────────────────
# Time Studies (Sprint 6 — Chronometer)
# ─────────────────────────────────────────────

def _create_study_with_elements(client, auth_headers):
    """Helper: create a time study with 3 elements."""
    resp = client.post(
        "/api/engineering/studies/",
        json={
            "name": "Estudio Línea Sellado",
            "analyst_name": "Ing. Pérez",
            "study_type": "continuous",
            "rating_factor": 1.1,
            "supplements_pct": 0.15,
            "elements": [
                {"name": "Carga MP", "type": "operation", "is_cyclic": True, "order": 1},
                {"name": "Sellado", "type": "operation", "is_cyclic": True, "order": 2},
                {"name": "Inspección", "type": "inspection", "is_cyclic": True, "order": 3},
            ]
        },
        headers=auth_headers
    )
    return resp


def test_create_study_with_elements(client, auth_headers):
    """Create a time study with pre-mapped elements."""
    resp = _create_study_with_elements(client, auth_headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["name"] == "Estudio Línea Sellado"
    assert data["elements_count"] == 3
    assert data["status"] == "draft"


def test_list_studies(client, auth_headers):
    """List time studies returns recent first."""
    _create_study_with_elements(client, auth_headers)
    resp = client.get("/api/engineering/studies/")
    assert resp.status_code == 200
    studies = resp.json()
    assert len(studies) >= 1
    assert studies[0]["analyst_name"] == "Ing. Pérez"


def test_get_study_detail(client, auth_headers):
    """Get study with its elements."""
    create_resp = _create_study_with_elements(client, auth_headers)
    study_id = create_resp.json()["id"]

    resp = client.get(f"/api/engineering/studies/{study_id}")
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
    detail = client.get(f"/api/engineering/studies/{study_id}").json()
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
    detail = client.get(f"/api/engineering/studies/{study_id}").json()

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
    """Full flow: create study → session → laps → calculate TN/TE."""
    create_resp = _create_study_with_elements(client, auth_headers)
    study_id = create_resp.json()["id"]

    detail = client.get(f"/api/engineering/studies/{study_id}").json()
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
    resp = client.get(f"/api/engineering/studies/{study_id}/results")
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

