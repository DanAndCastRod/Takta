import sqlite3

db_path = r"c:\Users\daniel.castaneda\OneDrive - Grupo BIOS S.A.S\Transformación Digital\2026\Ecosistema TD\Takta\takta_copy.db"

try:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM tenantfeatureflag;")
    for row in cursor.fetchall():
        d = dict(row)
        print(f"[{d['tenant_code']}] {d['feature_key']} = {d['is_enabled']}")
    print("--- Theme ---")
    cursor.execute("SELECT * FROM tenanttheme;")
    for row in cursor.fetchall():
        d = dict(row)
        print(d['colors_json'])
except Exception as e:
    print(e)
