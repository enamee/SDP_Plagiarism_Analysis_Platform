from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

router = APIRouter(prefix="/api/documents", tags=["documents"])

BASE_DIR = Path(__file__).resolve().parents[3]   # backend/
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx"}


@router.post("/upload")
async def upload_document(
    title: str = Form(...),
    input_mode: str = Form(...),
    manual_text: str | None = Form(None),
    file: UploadFile | None = File(None),
):
    title = title.strip()
    input_mode = input_mode.strip().lower()

    if not title:
        raise HTTPException(status_code=400, detail="Title is required.")

    if input_mode not in {"file", "manual"}:
        raise HTTPException(
            status_code=400,
            detail="input_mode must be 'file' or 'manual'."
        )

    if input_mode == "file":
        if file is None:
            raise HTTPException(status_code=400, detail="Please choose a file.")

        original_filename = file.filename or ""
        extension = Path(original_filename).suffix.lower()

        if extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail="Only .txt, .pdf, and .docx files are allowed."
            )

        contents = await file.read()

        if not contents:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        stored_filename = f"{uuid4().hex}{extension}"
        stored_path = UPLOAD_DIR / stored_filename
        stored_path.write_bytes(contents)

        preview_text = None
        if extension == ".txt":
            try:
                preview_text = contents.decode("utf-8")[:300]
            except UnicodeDecodeError:
                preview_text = "Preview unavailable because the text file is not UTF-8 encoded."

        await file.close()

        return {
            "success": True,
            "message": "File uploaded successfully.",
            "document": {
                "title": title,
                "source_type": "file",
                "original_filename": original_filename,
                "stored_filename": stored_filename,
                "extension": extension,
                "content_type": file.content_type,
                "size_bytes": len(contents),
                "preview_text": preview_text,
            }
        }

    cleaned_text = (manual_text or "").strip()

    if not cleaned_text:
        raise HTTPException(
            status_code=400,
            detail="Please enter manual text."
        )

    stored_filename = f"manual_{uuid4().hex}.txt"
    stored_path = UPLOAD_DIR / stored_filename
    stored_path.write_text(cleaned_text, encoding="utf-8")

    return {
        "success": True,
        "message": "Manual text saved successfully.",
        "document": {
            "title": title,
            "source_type": "manual",
            "original_filename": None,
            "stored_filename": stored_filename,
            "extension": ".txt",
            "content_type": "text/plain",
            "size_bytes": len(cleaned_text.encode("utf-8")),
            "char_count": len(cleaned_text),
            "preview_text": cleaned_text[:300],
        }
    }
