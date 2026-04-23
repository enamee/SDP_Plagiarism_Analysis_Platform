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
    parse_topic_tags,
    serialize_topic_tags,
)

router = APIRouter(prefix="/api/documents", tags=["documents"])


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
