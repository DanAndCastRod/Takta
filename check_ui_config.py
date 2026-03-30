import sqlite3
import json

db_path = r"c:\Users\daniel.castaneda\OneDrive - Grupo BIOS S.A.S\Transformación Digital\2026\Ecosistema TD\Takta\takta.db"
conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT * FROM tenantuiconfig WHERE tenant_code = 'default';")
ui_config = cursor.fetchone()
if ui_config:
    print("UI CONFIG MENU JSON:")
    print(json.dumps(json.loads(ui_config['menu_json']), indent=2))
else:
    print("No UI config found for default tenant.")

cursor.execute("SELECT * FROM tenanttheme WHERE tenant_code = 'default';")
theme = cursor.fetchone()
if theme:
    print("\nTHEME:")
    print(dict(theme))
else:
    print("No theme found for default tenant.")
