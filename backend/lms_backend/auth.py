from dataclasses import dataclass

from flask import current_app, request

from .models import Profile, RoleEnum


@dataclass
class AuthError(Exception):
    message: str
    status_code: int = 401


def get_current_user(optional: bool = False) -> dict | None:
    expected_token = current_app.config.get("BACKEND_INTERNAL_TOKEN")
    request_token = request.headers.get("X-Internal-Token")

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


def get_user_profile(user_id: str) -> Profile | None:
    return Profile.query.filter_by(userId=user_id).first()


def require_roles(user_id: str, allowed_roles: list[RoleEnum]) -> Profile:
    profile = get_user_profile(user_id)
    if not profile or profile.role not in allowed_roles:
        raise AuthError("Unauthorized", 401)
    return profile
