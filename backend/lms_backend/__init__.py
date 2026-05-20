from pathlib import Path
from flask import Flask, jsonify
from flask_cors import CORS
from .auth import AuthError
from .routes import api_bp

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None


def create_app() -> Flask:
    root_env = Path(__file__).resolve().parents[2] / ".env"
    if root_env.exists() and load_dotenv:
        load_dotenv(root_env)

    from .config import Config

    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(
        app,
        resources={r"/api/*": {"origins": [app.config["FRONTEND_URL"], "http://localhost:3000"]}},
        supports_credentials=True,
    )

    @app.errorhandler(AuthError)
    def handle_auth_error(error: AuthError):
        return jsonify({"error": error.message}), error.status_code

    @app.get("/")
    def index():
        return jsonify(
            {
                "status": "ok",
                "service": "lms-backend",
                "health": "/health",
                "apiBase": "/api",
                "frontend": app.config["FRONTEND_URL"],
            }
        )

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    @app.teardown_appcontext
    def shutdown_session(exception=None):
        db.session.remove()

    app.register_blueprint(api_bp)
    return app
