from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.upload import router as upload_router

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

app.include_router(upload_router)


@app.get("/")
def root():
    return {
        "message": "Backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "backend"
    }
