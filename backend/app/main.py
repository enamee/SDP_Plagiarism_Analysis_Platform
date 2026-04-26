from pathlib import Path
import time

from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from app.api.routes.admin_auth import router as admin_auth_router
from app.api.routes.admin_tools import router as admin_tools_router
from app.api.routes.batch_check import router as batch_check_router
from app.api.routes.compare import router as compare_router
from app.api.routes.corpus_check import router as corpus_check_router
from app.api.routes.dashboard import router as dashboard_router
from app.api.routes.debug import router as debug_router
from app.api.routes.document_detail import router as document_detail_router
from app.api.routes.document_list import router as document_list_router
from app.api.routes.graph import router as graph_router
from app.api.routes.report_export import router as report_export_router
from app.api.routes.retrieval import router as retrieval_router
from app.api.routes.style_shift import router as style_shift_router
from app.api.routes.upload import router as upload_router
from app.core.database import Base, engine
from app.core.logger import get_app_logger, log_event
from app.models import DocumentRecord  # noqa: F401
from app.services.fts_index import ensure_documents_fts

Base.metadata.create_all(bind=engine)
ensure_documents_fts(engine)

logger = get_app_logger()

app = FastAPI(
    title="Explainable Plagiarism Analysis Platform API",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    start_time = time.perf_counter()

    # Prevent the Debug Logs page from spamming itself every refresh
    skip_request_log = (
        request.method == "GET" and request.url.path == "/api/debug/logs"
    )

    client_host = request.client.host if request.client else "unknown"

    if not skip_request_log:
        log_event(
            "request.start",
            "Request started",
            method=request.method,
            path=request.url.path,
            query=request.url.query,
            client=client_host,
        )

    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

        logger.exception(
            "Unhandled exception during request | method=%s | path=%s | duration_ms=%s",
            request.method,
            request.url.path,
            duration_ms,
        )
        raise

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    response.headers["X-Process-Time"] = f"{duration_ms / 1000:.4f}"

    if not skip_request_log:
        log_event(
            "request.end",
            "Request completed",
            method=request.method,
            path=request.url.path,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )

    return response


app.include_router(upload_router)
app.include_router(document_list_router)
app.include_router(document_detail_router)
app.include_router(compare_router)
app.include_router(corpus_check_router)
app.include_router(batch_check_router)
app.include_router(graph_router)
app.include_router(style_shift_router)
app.include_router(report_export_router)
app.include_router(dashboard_router)
app.include_router(admin_auth_router)
app.include_router(admin_tools_router)
app.include_router(retrieval_router)
app.include_router(debug_router)


@app.get("/")
def root():
    return {"message": "Backend is running"}


@app.get("/health")
def health():
    return {"status": "ok", "service": "backend"}
