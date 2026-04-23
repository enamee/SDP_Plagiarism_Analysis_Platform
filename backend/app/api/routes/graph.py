from itertools import combinations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.document import DocumentRecord
from app.schemas.graph import GraphRequest, GraphResponse
from app.services.similarity import compare_two_documents
from app.core.logger import log_event

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.post("", response_model=GraphResponse)
def generate_similarity_graph(payload: GraphRequest, db: Session = Depends(get_db)):
    if payload.min_similarity < 0 or payload.min_similarity > 1:
        raise HTTPException(
            status_code=400,
            detail="min_similarity must be between 0 and 1."
        )

    log_event(
        "graph.start",
        "Similarity graph generation started",
        selected_document_count=len(payload.document_ids),
        min_similarity=payload.min_similarity,
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
        comparison = compare_two_documents(
            document_a.extracted_text,
            document_b.extracted_text,
            sentence_top_k=None,
            max_sentences_per_document=None,
        )
        similarity = comparison["overall_similarity"]

        if similarity >= payload.min_similarity:
            edges.append({
                "source": document_a.id,
                "target": document_b.id,
                "source_title": document_a.title,
                "target_title": document_b.title,
                "similarity": comparison["overall_similarity"],
                "percentage": comparison["overall_percentage"],
                "similarity_label": comparison["similarity_label"],
                "top_matches": comparison["top_matches"],
            })

    log_event(
        "graph.complete",
        "Similarity graph generation completed",
        node_count=len(nodes),
        edge_count=len(edges),
    )

    return {
        "node_count": len(nodes),
        "edge_count": len(edges),
        "nodes": nodes,
        "edges": edges,
    }
