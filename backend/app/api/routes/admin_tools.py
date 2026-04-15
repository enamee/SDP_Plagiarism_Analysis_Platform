from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import engine, get_db
from app.services.fts_index import clear_documents_fts, delete_document_from_fts
from app.models.document import DocumentRecord
from app.core.logger import log_event

router = APIRouter(prefix="/api/admin", tags=["admin"])

BASE_DIR = Path(__file__).resolve().parents[3]
UPLOAD_DIR = BASE_DIR / "uploads"
EXTRACTED_DIR = UPLOAD_DIR / "extracted"
REPORT_DIR = BASE_DIR / "reports"


def safe_remove_file(path: Path):
   if path.exists() and path.is_file():
       path.unlink()


@router.delete("/documents/{document_id}")
def delete_document(document_id: int, db: Session = Depends(get_db)):
   document = db.get(DocumentRecord, document_id)

   if not document:
       raise HTTPException(status_code=404, detail="Document not found.")

   stored_path = UPLOAD_DIR / document.stored_filename
   extracted_path = EXTRACTED_DIR / document.extracted_filename

   safe_remove_file(stored_path)
   safe_remove_file(extracted_path)

   delete_document_from_fts(engine, document.id)

   db.delete(document)
   db.commit()

   log_event(
        "admin.delete_document",
        "Document deleted",
        document_id=document.id,
        title=document.title,
   )

   return {
       "success": True,
       "message": f"Document '{document.title}' deleted successfully."
   }


@router.delete("/reset-data")
def reset_all_data(db: Session = Depends(get_db)):
   documents = db.scalars(select(DocumentRecord)).all()

   deleted_documents = 0

   for document in documents:
       stored_path = UPLOAD_DIR / document.stored_filename
       extracted_path = EXTRACTED_DIR / document.extracted_filename

       safe_remove_file(stored_path)
       safe_remove_file(extracted_path)

       db.delete(document)
       deleted_documents += 1

   db.commit()

   clear_documents_fts(engine)

   deleted_reports = 0
   if REPORT_DIR.exists():
       for file_path in REPORT_DIR.iterdir():
           if file_path.is_file() and file_path.suffix.lower() == ".pdf":
               safe_remove_file(file_path)
               deleted_reports += 1

   log_event(
       "admin.reset_data",
       "All local demo data reset",
       deleted_documents=deleted_documents,
       deleted_reports=deleted_reports,
   )

   return {
       "success": True,
       "message": "All local demo data has been reset.",
       "deleted_documents": deleted_documents,
       "deleted_reports": deleted_reports,
   }
