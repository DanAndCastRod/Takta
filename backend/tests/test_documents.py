import pytest
import uuid
import json
from backend.app.models import FormatTemplate, Asset

@pytest.fixture
def setup_data(session, auth_headers, client):
    # 1. Ingest templates
    client.post("/api/templates/ingest", headers=auth_headers)
    template = session.query(FormatTemplate).first()
    
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
