import requests
import json
import sys

BASE_URL = "http://localhost:9003/api/plant-layouts"

def print_result(name, passed, details=""):
    icon = "✅" if passed else "❌"
    print(f"{icon} {name}")
    if not passed:
        print(f"   Details: {details}")

def run_tests():
    print("🚀 Starting Backend API Tests (Plant Layouts)...\n")
    
    # 1. Create Layout
    payload = {
        "name": "Test Layout Integration",
        "description": "Created via automated test script",
        "json_content": '{"version":"5.3.0","objects":[]}',
        "thumbnail_data": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        "is_active": True
    }
    
    try:
        response = requests.post(BASE_URL + "/", json=payload)
        is_success = response.status_code == 200 or response.status_code == 201
        print_result("Create Layout", is_success, response.text)
        if not is_success:
            return
        
        data = response.json()
        layout_id = data["id"]
        print(f"   ID: {layout_id}")

    except Exception as e:
        print_result("Create Layout", False, str(e))
        return

    # 2. Get All Layouts
    try:
        response = requests.get(BASE_URL + "/")
        data = response.json()
        # Verify our ID is in the list
        found = any(x["id"] == layout_id for x in data)
        print_result("Get All Layouts", found, "Created layout not found in list")
    except Exception as e:
        print_result("Get All Layouts", False, str(e))

    # 3. Get One Layout
    try:
        response = requests.get(f"{BASE_URL}/{layout_id}")
        data = response.json()
        match = data["name"] == payload["name"]
        print_result("Get Single Layout", match, f"Name mismatch: {data.get('name')}")
    except Exception as e:
        print_result("Get Single Layout", False, str(e))

    # 4. Update Layout
    update_payload = {"name": "Test Layout UPDATED"}
    try:
        response = requests.put(f"{BASE_URL}/{layout_id}", json=update_payload)
        is_success = response.status_code == 200
        data = response.json()
        match = data["name"] == "Test Layout UPDATED"
        print_result("Update Layout", is_success and match, response.text)
    except Exception as e:
        print_result("Update Layout", False, str(e))

    # 5. Delete Layout
    try:
        response = requests.delete(f"{BASE_URL}/{layout_id}")
        is_success = response.status_code == 200
        print_result("Delete Layout", is_success, response.text)
        
        # Verify it's gone
        response = requests.get(f"{BASE_URL}/{layout_id}")
        is_gone = response.status_code == 404
        print_result("Verify Deletion", is_gone, f"Status code: {response.status_code}")
        
    except Exception as e:
        print_result("Delete Layout", False, str(e))

if __name__ == "__main__":
    run_tests()
