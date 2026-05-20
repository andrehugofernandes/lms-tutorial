import os
from pathlib import Path


ROOT_DIR = Path(__file__).resolve().parents[2]


class Config:
    SECRET_KEY = os.getenv("FLASK_SECRET_KEY") or os.getenv("NEXTAUTH_SECRET") or "dev-secret"
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL")
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 180,
        "pool_timeout": 30,
    }
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JSON_SORT_KEYS = False
    BACKEND_INTERNAL_TOKEN = os.getenv("BACKEND_INTERNAL_TOKEN") or os.getenv("NEXTAUTH_SECRET")
    FRONTEND_URL = os.getenv("NEXT_PUBLIC_APP_URL") or "http://localhost:3000"
    MUX_TOKEN_ID = os.getenv("MUX_TOKEN_ID")
    MUX_TOKEN_SECRET = os.getenv("MUX_TOKEN_SECRET")
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
    LLM_PROVIDER = os.getenv("LLM_PROVIDER", "local")
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-oss:20b")
    LLM_HOST = os.getenv("LLM_HOST", "127.0.0.1")
    LLM_ALLOC_PORT = os.getenv("LLM_ALLOC_PORT", "6639")
    LLM_ALLOC_BASE_URL = os.getenv("LLM_ALLOC_BASE_URL")
