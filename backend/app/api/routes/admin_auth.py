from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.admin_auth import (
    DEFAULT_ADMIN_USERNAME,
    change_admin_password,
    issue_admin_token,
    require_admin_auth,
    revoke_admin_token,
    verify_admin_credentials,
)
from app.core.logger import log_event

router = APIRouter(prefix="/api/admin/auth", tags=["admin-auth"])


class AdminLoginRequest(BaseModel):
    username: str
    password: str


class AdminPasswordChangeRequest(BaseModel):
    old_password: str
    new_password: str
    confirm_new_password: str


@router.post("/login")
def admin_login(payload: AdminLoginRequest):
    username = payload.username.strip()

    if not username or not payload.password:
        raise HTTPException(status_code=400, detail="Username and password are required.")

    if not verify_admin_credentials(username, payload.password):
        raise HTTPException(status_code=401, detail="Invalid admin credentials.")

    token = issue_admin_token()
    log_event("admin_auth.login", "Admin logged in", username=username)

    return {
        "success": True,
        "token": token,
        "username": DEFAULT_ADMIN_USERNAME,
    }


@router.get("/session")
def get_admin_session(_token: str = Depends(require_admin_auth)):
    return {
        "authenticated": True,
        "username": DEFAULT_ADMIN_USERNAME,
    }


@router.post("/logout")
def admin_logout(token: str = Depends(require_admin_auth)):
    revoke_admin_token(token)
    log_event("admin_auth.logout", "Admin logged out")
    return {"success": True}


@router.post("/change-password")
def admin_change_password(
    payload: AdminPasswordChangeRequest,
    _token: str = Depends(require_admin_auth),
):
    new_password = payload.new_password.strip()

    if not payload.old_password:
        raise HTTPException(status_code=400, detail="Old password is required.")

    if not new_password:
        raise HTTPException(status_code=400, detail="New password is required.")

    if len(new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters.")

    if new_password != payload.confirm_new_password:
        raise HTTPException(status_code=400, detail="New password confirmation does not match.")

    change_admin_password(payload.old_password, new_password)
    log_event("admin_auth.password_changed", "Admin password changed")

    return {
        "success": True,
        "message": "Admin password changed successfully.",
    }