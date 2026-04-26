from fastapi import APIRouter, Depends, HTTPException

from app.core.admin_auth import require_admin_auth
from app.core.logger import clear_log_file, log_event, read_log_lines

router = APIRouter(prefix="/api/debug", tags=["debug"])


@router.get("/logs")
def get_debug_logs(limit: int = 200, _token: str = Depends(require_admin_auth)):
    if limit < 1 or limit > 2000:
        raise HTTPException(
            status_code=400,
            detail="limit must be between 1 and 2000."
        )

    lines = read_log_lines(limit)

    return {
        "limit": limit,
        "line_count": len(lines),
        "logs": lines,
    }


@router.delete("/logs")
def clear_debug_logs(_token: str = Depends(require_admin_auth)):
    clear_log_file()
    log_event(
        "debug.clear_logs",
        "Application debug logs cleared by user"
    )

    return {
        "success": True,
        "message": "Debug logs cleared successfully."
    }
