from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Explainable Plagiarism Analysis Platform API",
    version="0.1.0"
)

# Allow frontend to call backend during development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
