from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import DocumentRecord
from app.services.text_extractor import extract_text_from_file

router = APIRouter(prefix="/api/documents", tags=["documents"])

BASE_DIR = Path(__file__).resolve().parents[3]
UPLOAD_DIR = BASE_DIR / "uploads"
EXTRACTED_DIR = UPLOAD_DIR / "extracted"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
EXTRACTED_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx"}


@router.post("/upload")
async def upload_document(
   title: str = Form(...),
   input_mode: str = Form(...),
   manual_text: str | None = Form(None),
   file: UploadFile | None = File(None),
   db: Session = Depends(get_db),
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

   # FILE MODE
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

       extracted_text, extraction_warning = extract_text_from_file(stored_path, extension)

       extracted_filename = f"{stored_path.stem}_extracted.txt"
       extracted_path = EXTRACTED_DIR / extracted_filename
       extracted_path.write_text(extracted_text, encoding="utf-8")

       await file.close()

       document_record = DocumentRecord(
           title=title,
           source_type="file",
           original_filename=original_filename,
           stored_filename=stored_filename,
           extracted_filename=extracted_filename,
           extension=extension,
           content_type=file.content_type or "application/octet-stream",
           size_bytes=len(contents),
           extracted_char_count=len(extracted_text),
           extracted_text=extracted_text,
           extraction_warning=extraction_warning,
       )

       db.add(document_record)
       db.commit()
       db.refresh(document_record)

       return {
           "success": True,
           "message": "File uploaded and saved to database successfully.",
           "document": {
               "id": document_record.id,
               "title": document_record.title,
               "source_type": document_record.source_type,
               "original_filename": document_record.original_filename,
               "stored_filename": document_record.stored_filename,
               "extracted_filename": document_record.extracted_filename,
               "extension": document_record.extension,
               "content_type": document_record.content_type,
               "size_bytes": document_record.size_bytes,
               "extracted_char_count": document_record.extracted_char_count,
               "preview_text": document_record.extracted_text[:500],
               "extraction_warning": document_record.extraction_warning,
               "created_at": document_record.created_at.isoformat(),
           }
       }

   # MANUAL MODE
   cleaned_text = (manual_text or "").strip()

   if not cleaned_text:
       raise HTTPException(
           status_code=400,
           detail="Please enter manual text."
       )

   stored_filename = f"manual_{uuid4().hex}.txt"
   stored_path = UPLOAD_DIR / stored_filename
   stored_path.write_text(cleaned_text, encoding="utf-8")

   extracted_filename = f"{Path(stored_filename).stem}_extracted.txt"
   extracted_path = EXTRACTED_DIR / extracted_filename
   extracted_path.write_text(cleaned_text, encoding="utf-8")

   document_record = DocumentRecord(
       title=title,
       source_type="manual",
       original_filename=None,
       stored_filename=stored_filename,
       extracted_filename=extracted_filename,
       extension=".txt",
       content_type="text/plain",
       size_bytes=len(cleaned_text.encode("utf-8")),
       extracted_char_count=len(cleaned_text),
       extracted_text=cleaned_text,
       extraction_warning=None,
   )

   db.add(document_record)
   db.commit()
   db.refresh(document_record)

   return {
       "success": True,
       "message": "Manual text saved to database successfully.",
       "document": {
           "id": document_record.id,
           "title": document_record.title,
           "source_type": document_record.source_type,
           "original_filename": document_record.original_filename,
           "stored_filename": document_record.stored_filename,
           "extracted_filename": document_record.extracted_filename,
           "extension": document_record.extension,
           "content_type": document_record.content_type,
           "size_bytes": document_record.size_bytes,
           "char_count": len(cleaned_text),
           "extracted_char_count": document_record.extracted_char_count,
           "preview_text": document_record.extracted_text[:500],
           "extraction_warning": document_record.extraction_warning,
           "created_at": document_record.created_at.isoformat(),
       }
   }
