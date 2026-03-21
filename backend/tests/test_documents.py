import pytest
import uuid
import json
from sqlmodel import select
from backend.app.models import FormatTemplate, Asset

@pytest.fixture
def setup_data(session, auth_headers, client):
    # 1. Ingest templates
    client.post("/api/templates/ingest", headers=auth_headers)
    template = session.exec(select(FormatTemplate)).first()
    
    # 2. Create an asset
    asset = Asset(name="Test Asset", type="Maquina")
    session.add(asset)
    session.commit()
    session.refresh(asset)
    
    return {"template_id": str(template.id), "asset_id": str(asset.id)}

def test_create_document(client, auth_headers, setup_data):
    payload = {
        "template_id": setup_data["template_id"],
        "asset_id": setup_data["asset_id"],
        "content_json": json.dumps({"blocks": [{"type": "header", "data": {"text": "Test"}}]})
    }
    
    response = client.post("/api/documents/", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["template_id"] == setup_data["template_id"]
    assert data["asset_id"] == setup_data["asset_id"]
    assert data["user_id"] == "test_admin" # Coming from the admin token
    assert "id" in data
    
def test_create_document_unauthorized(client, setup_data):
    payload = {
        "template_id": setup_data["template_id"],
        "content_json": "{}"
    }
    response = client.post("/api/documents/", json=payload)
    assert response.status_code == 401

def test_get_document(client, auth_headers, setup_data):
    # Create the document first
    payload = {
        "template_id": setup_data["template_id"],
        "asset_id": setup_data["asset_id"],
        "content_json": '{"test": "data"}'
    }
    create_resp = client.post("/api/documents/", json=payload, headers=auth_headers)
    doc_id = create_resp.json()["id"]
    
    # Retrieve it
    response = client.get(f"/api/documents/{doc_id}", headers=auth_headers)
    assert response.status_code == 200
    assert response.json()["id"] == doc_id
    assert response.json()["content_json"] == '{"test": "data"}'

def test_get_documents_by_asset(client, auth_headers, setup_data):
    # Create two documents
    payload = {
        "template_id": setup_data["template_id"],
        "asset_id": setup_data["asset_id"],
        "content_json": '{}'
    }
    client.post("/api/documents/", json=payload, headers=auth_headers)
    client.post("/api/documents/", json=payload, headers=auth_headers)
    
    # Get by asset
    response = client.get(f"/api/documents/asset/{setup_data['asset_id']}", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert "template_name" in data[0]


def test_list_documents_global(client, auth_headers, setup_data):
    # Document linked to asset
    payload_asset = {
        "template_id": setup_data["template_id"],
        "asset_id": setup_data["asset_id"],
        "content_json": '{"asset":"linked"}'
    }
    # Document without asset
    payload_general = {
        "template_id": setup_data["template_id"],
        "content_json": '{"asset":"general"}'
    }

    client.post("/api/documents", json=payload_asset, headers=auth_headers)
    client.post("/api/documents", json=payload_general, headers=auth_headers)

    response = client.get("/api/documents", headers=auth_headers)
    assert response.status_code == 200
    rows = response.json()
    assert len(rows) >= 2

    first = rows[0]
    assert "template_id" in first
    assert "template_code" in first
    assert "template_name" in first
    assert "asset_id" in first
    assert "asset_name" in first
    assert "user_id" in first


def test_delete_document(client, auth_headers, setup_data):
    payload = {
        "template_id": setup_data["template_id"],
        "asset_id": setup_data["asset_id"],
        "content_json": '{"remove":"me"}'
    }
    created = client.post("/api/documents", json=payload, headers=auth_headers)
    assert created.status_code == 200
    doc_id = created.json()["id"]

    delete_resp = client.delete(f"/api/documents/{doc_id}", headers=auth_headers)
    assert delete_resp.status_code == 204

    get_resp = client.get(f"/api/documents/{doc_id}", headers=auth_headers)
    assert get_resp.status_code == 404
