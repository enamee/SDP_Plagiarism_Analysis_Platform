from itertools import combinations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import DocumentRecord
from app.schemas.graph import GraphRequest, GraphResponse
from app.services.similarity import compute_document_similarity

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.post("", response_model=GraphResponse)
def generate_similarity_graph(payload: GraphRequest, db: Session = Depends(get_db)):
    if payload.min_similarity < 0 or payload.min_similarity > 1:
        raise HTTPException(
            status_code=400,
            detail="min_similarity must be between 0 and 1."
        )

    # If no IDs are provided, use all documents
    if payload.document_ids:
        unique_ids = list(dict.fromkeys(payload.document_ids))
        documents = []

        for document_id in unique_ids:
            document = db.get(DocumentRecord, document_id)

            if not document:
                raise HTTPException(
                    status_code=404,
                    detail=f"Document with ID {document_id} not found."
                )

            if not document.extracted_text.strip():
                continue

            documents.append(document)
    else:
        statement = select(DocumentRecord)
        documents = [
            doc for doc in db.scalars(statement).all()
            if doc.extracted_text.strip()
        ]

    if len(documents) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least two documents with extracted text are required."
        )

    nodes = [
        {
            "id": doc.id,
            "label": doc.title,
            "extension": doc.extension,
        }
        for doc in documents
    ]

    edges = []

    for document_a, document_b in combinations(documents, 2):
        similarity = compute_document_similarity(
            document_a.extracted_text,
            document_b.extracted_text
        )

        if similarity >= payload.min_similarity:
            edges.append({
                "source": document_a.id,
                "target": document_b.id,
                "similarity": round(similarity, 4),
                "percentage": round(similarity * 100, 2),
            })

    return {
        "node_count": len(nodes),
        "edge_count": len(edges),
        "nodes": nodes,
        "edges": edges,
    }
