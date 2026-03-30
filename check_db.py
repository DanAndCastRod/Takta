import sqlite3
import pprint

db_path = r"c:\Users\daniel.castaneda\OneDrive - Grupo BIOS S.A.S\Transformación Digital\2026\Ecosistema TD\Takta\takta.db"

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("TENANTS:")
cursor.execute("SELECT * FROM tenant;")
for row in cursor.fetchall():
    print(dict(row))

print("\nFEATURE FLAGS (module.white_label_admin):")
cursor.execute("SELECT * FROM tenantfeatureflag WHERE feature_key = 'module.white_label_admin';")
for row in cursor.fetchall():
    print(dict(row))

print("\nDISABLED FEATURE FLAGS:")
cursor.execute("SELECT feature_key, tenant_code, is_enabled FROM tenantfeatureflag WHERE is_enabled = 0;")
for row in cursor.fetchall():
    print(dict(row))
