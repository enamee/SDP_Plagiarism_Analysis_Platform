import hashlib
import json
import secrets
from pathlib import Path

from fastapi import Header, HTTPException, status

BASE_DIR = Path(__file__).resolve().parents[2]
AUTH_FILE = BASE_DIR / "admin_auth.json"

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "admin"

_active_tokens: set[str] = set()


def _hash_password(password: str, salt: str) -> str:
    return hashlib.sha256(f"{salt}:{password}".encode("utf-8")).hexdigest()


def _write_auth_data(data: dict):
    AUTH_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _load_auth_data() -> dict:
    if AUTH_FILE.exists():
        try:
            data = json.loads(AUTH_FILE.read_text(encoding="utf-8"))
            if all(key in data for key in ["username", "salt", "password_hash"]):
                return data
        except Exception:
            pass

    salt = secrets.token_hex(16)
    data = {
        "username": DEFAULT_ADMIN_USERNAME,
        "salt": salt,
        "password_hash": _hash_password(DEFAULT_ADMIN_PASSWORD, salt),
    }
    _write_auth_data(data)
    return data


def verify_admin_credentials(username: str, password: str) -> bool:
    data = _load_auth_data()
    if username != data["username"]:
        return False

    return _hash_password(password, data["salt"]) == data["password_hash"]


def issue_admin_token() -> str:
    token = secrets.token_urlsafe(32)
    _active_tokens.add(token)
    return token


def revoke_admin_token(token: str):
    _active_tokens.discard(token)


def is_admin_token_valid(token: str) -> bool:
    return token in _active_tokens


def change_admin_password(old_password: str, new_password: str):
    data = _load_auth_data()
    current_hash = _hash_password(old_password, data["salt"])

    if current_hash != data["password_hash"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Old password is incorrect.",
        )

    new_salt = secrets.token_hex(16)
    data["salt"] = new_salt
    data["password_hash"] = _hash_password(new_password, new_salt)
    _write_auth_data(data)


def require_admin_auth(authorization: str | None = Header(default=None)):
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin authorization required.",
        )

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format.",
        )

    if not is_admin_token_valid(token):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Admin session is invalid or expired.",
        )

    return token