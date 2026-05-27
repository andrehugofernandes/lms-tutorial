import firebase_admin
from firebase_admin import firestore
import os
import google.auth.credentials

print("DEBUG: extensions.py is loading...")

# Firebase Admin Initialization
is_gcp = os.getenv("K_SERVICE") is not None or os.getenv("FUNCTION_TARGET") is not None
is_reloader_parent = not is_gcp and (os.getenv("FLASK_DEBUG", "1") == "1" and os.environ.get("WERKZEUG_RUN_MAIN") != "true")

if is_reloader_parent:
    print("DEBUG: Skipping Firestore client initialization in reloader parent process")
    fdb = None
else:
    if not firebase_admin._apps:
        project_id = (
            os.environ.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
            or os.environ.get("GCLOUD_PROJECT")
            or os.environ.get("GCP_PROJECT")
        )
        if not project_id:
            project_id = "demo-project"
            
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

    from google.cloud import firestore as gc_firestore

    print("DEBUG: Getting firestore client...")
    db_id = os.environ.get("FIRESTORE_DATABASE_ID")
    if not db_id:
        if is_gcp:
            db_id = "db-lms-project"
        else:
            db_id = "(default)"
            
    project_id = (
        os.environ.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID")
        or os.environ.get("GCLOUD_PROJECT")
        or os.environ.get("GCP_PROJECT")
    )
    if not project_id and not is_gcp:
        project_id = "demo-project"

    if db_id and db_id != "(default)":
        print(f"DEBUG: Using named database: {db_id} for project: {project_id}")
        fdb = gc_firestore.Client(project=project_id, database=db_id)
    else:
        fdb = firestore.client()
    print("DEBUG: firestore client obtained")
