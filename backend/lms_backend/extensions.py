import firebase_admin
from firebase_admin import credentials, firestore
import os
import google.auth.credentials

print("DEBUG: extensions.py is loading...")

# Firebase Admin Initialization
if not firebase_admin._apps:
    project_id = os.environ.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "demo-project")
    emulator_host = os.environ.get("FIRESTORE_EMULATOR_HOST")
    
    if emulator_host:
        print(f"DEBUG: Initializing for emulator at {emulator_host}")
        cred = google.auth.credentials.AnonymousCredentials()
        firebase_admin.initialize_app(cred, options={'projectId': project_id})
        print("DEBUG: firebase_admin.initialize_app called")
    else:
        print("DEBUG: Initializing for production")
        firebase_admin.initialize_app()
        print("DEBUG: firebase_admin.initialize_app called (production)")

print("DEBUG: Getting firestore client...")
db_id = os.environ.get("FIRESTORE_DATABASE_ID", "(default)")
if db_id and db_id != "(default)":
    print(f"DEBUG: Using named database: {db_id}")
    fdb = firestore.client(database=db_id)
else:
    fdb = firestore.client()
print("DEBUG: firestore client obtained")
