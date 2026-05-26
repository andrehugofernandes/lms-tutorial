from firebase_functions import https_fn
from firebase_admin import initialize_app
from app import app as flask_app

# Inicializa o app do Firebase Admin
initialize_app()

# Expõe a Cloud Function 'api' que delega as requisições para o Flask
@https_fn.on_request()
def api(req: https_fn.Request) -> https_fn.Response:
    with flask_app.request_context(req.environ):
        return flask_app.full_dispatch_request()
