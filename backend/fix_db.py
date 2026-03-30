import sqlite3
import os

db_paths = [
    r"c:\Users\daniel.castaneda\OneDrive - Grupo BIOS S.A.S\Transformación Digital\2026\Ecosistema TD\Takta\takta.db",
    r"c:\Users\daniel.castaneda\OneDrive - Grupo BIOS S.A.S\Transformación Digital\2026\Ecosistema TD\Takta\backend\takta.db"
]

for db_path in db_paths:
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Enable all features back to normal
            cursor.execute("UPDATE tenantfeatureflag SET is_enabled = 1;")
            conn.commit()
            print("Successfully restored 'Full Profile' feature flags in", db_path)
        except Exception as e:
            print("Error updating DB", db_path, e)
