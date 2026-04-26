from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import engine, get_db
from app.core.logger import log_event
from app.models.document import DocumentRecord
from app.schemas.document import DocumentDetail, DocumentMetadataUpdateRequest
from app.services.fts_index import upsert_document_in_fts
from app.services.preprocessing import (
    build_scope_key,
    build_search_text,
    normalize_text,
    parse_topic_tags,
    serialize_topic_tags,
    split_into_sentences,
    tokenize_words,
)
from app.services.text_extractor import extract_text_from_file

router = APIRouter(prefix="/api/documents", tags=["documents"])

BASE_DIR = Path(__file__).resolve().parents[3]
UPLOAD_DIR = BASE_DIR / "uploads"
EXTRACTED_DIR = UPLOAD_DIR / "extracted"


@router.get("/{document_id}", response_model=DocumentDetail)
def get_document_detail(document_id: int, db: Session = Depends(get_db)):
   document = db.get(DocumentRecord, document_id)

   if not document:
       raise HTTPException(status_code=404, detail="Document not found.")

   return document


@router.put("/{document_id}/metadata")
def update_document_metadata(
    document_id: int,
    payload: DocumentMetadataUpdateRequest,
    db: Session = Depends(get_db),
):
   document = db.get(DocumentRecord, document_id)

   if not document:
       raise HTTPException(status_code=404, detail="Document not found.")

   title = payload.title.strip()
   comparison_group = payload.comparison_group.strip()
   document_type = payload.document_type.strip()

   if not title:
       raise HTTPException(status_code=400, detail="Title is required.")

   if not comparison_group:
       raise HTTPException(status_code=400, detail="Comparison group is required.")

   if not document_type:
       raise HTTPException(status_code=400, detail="Document type is required.")

   topic_tags = parse_topic_tags(payload.topic_tag)
   topic_tag = serialize_topic_tags(topic_tags)

   document.title = title
   document.comparison_group = comparison_group
   document.document_type = document_type
   document.topic_tag = topic_tag
   document.scope_key = build_scope_key(comparison_group)
   document.search_text = build_search_text(
       title=title,
       comparison_group=comparison_group,
       document_type=document_type,
       topic_tag=topic_tag,
       extracted_text=document.extracted_text,
   )

   db.commit()
   db.refresh(document)

   upsert_document_in_fts(engine, document)

   log_event(
       "document.update_metadata",
       "Document metadata updated",
       document_id=document.id,
       title=document.title,
       comparison_group=document.comparison_group,
       document_type=document.document_type,
       scope_key=document.scope_key,
   )

   return {
       "success": True,
       "message": "Document metadata updated successfully.",
       "document": {
           "id": document.id,
           "title": document.title,
           "comparison_group": document.comparison_group,
           "document_type": document.document_type,
           "topic_tag": document.topic_tag,
           "scope_key": document.scope_key,
       },
   }


@router.put("/{document_id}/reprocess")
def reprocess_document(document_id: int, db: Session = Depends(get_db)):
   """Re-extract and process text from existing document without re-upload."""
   
   document = db.get(DocumentRecord, document_id)

   if not document:
       raise HTTPException(status_code=404, detail="Document not found.")

   if document.source_type == "manual":
       raise HTTPException(
           status_code=400,
           detail="Cannot reprocess manually entered text. Only file-based documents can be reprocessed."
       )

   stored_path = UPLOAD_DIR / document.stored_filename

   if not stored_path.exists():
       raise HTTPException(
           status_code=404,
           detail="Stored file not found. Cannot reprocess."
       )

   log_event(
       "document.reprocess_start",
       "Document reprocessing started",
       document_id=document.id,
       title=document.title,
       original_filename=document.original_filename,
   )

   extracted_text, extraction_warning = extract_text_from_file(stored_path, document.extension)

   extracted_filename = f"{stored_path.stem}_extracted.txt"
   extracted_path = EXTRACTED_DIR / extracted_filename
   extracted_path.write_text(extracted_text, encoding="utf-8")

   normalized_text = normalize_text(extracted_text)
   sentence_count = len(split_into_sentences(extracted_text))
   token_count = len(tokenize_words(extracted_text))
   search_text = build_search_text(
       title=document.title,
       comparison_group=document.comparison_group,
       document_type=document.document_type,
       topic_tag=document.topic_tag,
       extracted_text=extracted_text,
   )

   document.extracted_text = extracted_text
   document.normalized_text = normalized_text
   document.search_text = search_text
   document.extracted_filename = extracted_filename
   document.extracted_char_count = len(extracted_text)
   document.sentence_count = sentence_count
   document.token_count = token_count
   document.extraction_warning = extraction_warning

   db.commit()
   db.refresh(document)

   upsert_document_in_fts(engine, document)

   if extraction_warning:
       log_event(
           "document.reprocess_warning",
           "Document reprocessing warning generated",
           document_id=document.id,
           title=document.title,
           warning=extraction_warning,
       )

   log_event(
       "document.reprocess_complete",
       "Document reprocessing completed successfully",
       document_id=document.id,
       title=document.title,
       extracted_char_count=document.extracted_char_count,
       sentence_count=document.sentence_count,
       token_count=document.token_count,
   )

   return {
       "success": True,
       "message": "Document reprocessed successfully with the latest extraction logic.",
       "document": {
           "id": document.id,
           "title": document.title,
           "comparison_group": document.comparison_group,
           "document_type": document.document_type,
           "topic_tag": document.topic_tag,
           "scope_key": document.scope_key,
           "extracted_char_count": document.extracted_char_count,
           "sentence_count": document.sentence_count,
           "token_count": document.token_count,
           "preview_text": document.extracted_text[:500],
           "extraction_warning": document.extraction_warning,
       },
   }
