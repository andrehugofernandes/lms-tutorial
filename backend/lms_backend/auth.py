from dataclasses import dataclass

from flask import current_app, request

from .extensions import fdb
from .models import RoleEnum


@dataclass
class AuthError(Exception):
    message: str
    status_code: int = 401


def get_current_user(optional: bool = False) -> dict | None:
    expected_token = current_app.config.get("BACKEND_INTERNAL_TOKEN")
    if expected_token:
        expected_token = expected_token.strip()
    request_token = request.headers.get("X-Internal-Token")
    if request_token:
        request_token = request_token.strip()

    print(
        "DEBUG AUTH: "
        f"has_expected_token={bool(expected_token)}, "
        f"has_request_token={bool(request_token)}, "
        f"token_matches={bool(expected_token and request_token == expected_token)}"
    )

    if not expected_token or request_token != expected_token:
        raise AuthError("Invalid proxy token", 403)

    user_id = request.headers.get("X-User-Id")
    if not user_id:
        if optional:
            return None
        raise AuthError("Unauthorized", 401)

    return {
        "userId": user_id,
        "email": request.headers.get("X-User-Email"),
        "name": request.headers.get("X-User-Name"),
    }


def get_user_profile(user_id: str, email: str | None = None) -> dict | None:
    # First try by userId
    profile_query = fdb.collection('profiles').where('userId', '==', user_id).limit(1).get()
    if profile_query:
        return profile_query[0].to_dict()
    
    # If not found and email is provided, try by email
    if email:
        profile_query = fdb.collection('profiles').where('email', '==', email).limit(1).get()
        if profile_query:
            return profile_query[0].to_dict()
            
    return None


def require_roles(user_id: str, allowed_roles: list[RoleEnum]) -> dict:
    profile = get_user_profile(user_id)
    # RoleEnum in Firestore is stored as string value
    role_values = [role.value if hasattr(role, 'value') else role for role in allowed_roles]
    if not profile or profile.get("role") not in role_values:
        raise AuthError("Unauthorized", 401)
    return profile
