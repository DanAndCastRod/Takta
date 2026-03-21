import pytest
from sqlmodel import select
from backend.app.models import FormatTemplate

def test_ingest_templates_unauthorized(client):
    response = client.post("/api/templates/ingest")
    assert response.status_code == 401

def test_ingest_templates(client, auth_headers, session):
    # This will use the actual templates on disk, inserting them into the test DB
    response = client.post("/api/templates/ingest", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    
    assert data["created"] > 0
    assert data["errors"] == []
    
    # Verify they were inserted
    templates_in_db = session.exec(select(FormatTemplate)).all()
    assert len(templates_in_db) == data["created"]

def test_get_templates(client, auth_headers):
    # Call ingest first to populate
    client.post("/api/templates/ingest", headers=auth_headers)
    
    # Get templates
    response = client.get("/api/templates/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    
    assert isinstance(data, list)
    assert len(data) > 0
    assert "code" in data[0]
    assert "name" in data[0]
    assert "markdown_structure" in data[0]
