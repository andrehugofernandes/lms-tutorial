import firebase_admin
from firebase_admin import initialize_app
from firebase_functions import https_fn
from app import app as flask_app

# Inicializa o app do Firebase Admin caso ainda nao tenha sido inicializado
if not firebase_admin._apps:
    initialize_app()

# Expõe a Cloud Function 'api' que delega as requisições para o Flask
@https_fn.on_request()
def api(req: https_fn.Request) -> https_fn.Response:
    environ = req.environ.copy()
    path_info = environ.get("PATH_INFO", "")
    if path_info not in ("/", "/health") and not path_info.startswith("/api"):
        environ["PATH_INFO"] = "/api" + path_info
        
    with flask_app.request_context(environ):
        return flask_app.full_dispatch_request()
