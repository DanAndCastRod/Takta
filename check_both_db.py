import sqlite3

db_path1 = r"c:\Users\daniel.castaneda\OneDrive - Grupo BIOS S.A.S\Transformación Digital\2026\Ecosistema TD\Takta\takta.db"
db_path2 = r"c:\Users\daniel.castaneda\OneDrive - Grupo BIOS S.A.S\Transformación Digital\2026\Ecosistema TD\Takta\backend\takta.db"

for p in [db_path1, db_path2]:
    print(f"\nDB: {p}")
    try:
        conn = sqlite3.connect(p)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tenantfeatureflag WHERE feature_key = 'module.white_label_admin';")
        for row in cursor.fetchall():
            d = dict(row)
            print(f"[{d['tenant_code']}] {d['feature_key']} = {d['is_enabled']}")
    except sqlite3.OperationalError:
        print("Does not exist or table missing")
