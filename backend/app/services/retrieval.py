from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import Session

from app.models.document import DocumentRecord
from app.services.preprocessing import normalize_text, tokenize_words


STOPWORDS = {
    "the", "and", "for", "that", "with", "this", "from", "have", "will",
    "your", "into", "their", "there", "about", "using", "been", "were",
    "which", "when", "where", "while", "then", "than", "they", "them",
    "also", "some", "much", "many", "more", "most", "very", "what",
    "does", "done", "able", "only", "such", "same", "used", "been",
    "into", "over", "under", "than", "each", "both", "within", "between"
}


def build_fts_query_from_document(document: DocumentRecord, max_terms: int = 12) -> str:
    """
    Build a compact OR-based FTS query from metadata + normalized text.
    We intentionally do not send the full document text as the MATCH query.
    """
    candidate_text = " ".join(
        [
            document.title or "",
            document.course_code or "",
            document.assignment_name or "",
            document.document_type or "",
            document.topic_tag or "",
            document.normalized_text[:2000],  # keep it bounded
        ]
    )

    tokens = tokenize_words(normalize_text(candidate_text))

    selected_terms = []
    seen = set()

    for token in tokens:
        if len(token) < 4:
            continue
        if token in STOPWORDS:
            continue
        if token in seen:
            continue

        seen.add(token)
        selected_terms.append(token)

        if len(selected_terms) >= max_terms:
            break

    if not selected_terms:
        # Fallback: use a very small set from title if everything else fails
        title_tokens = tokenize_words(normalize_text(document.title))
        selected_terms = [token for token in title_tokens if len(token) >= 2][:4]

    return " OR ".join(selected_terms)


def run_fts_shortlist(
    db: Session,
    engine: Engine,
    source_document: DocumentRecord,
    top_k: int = 10,
    same_scope_first: bool = True,
):
    fts_query = build_fts_query_from_document(source_document)

    if not fts_query:
        return {
            "fts_query": "",
            "results": [],
        }

    # Pull more than top_k so we can reorder same-scope documents first in Python
    fetch_limit = max(top_k * 4, 20)

    shortlist_sql = """
    SELECT
        rowid AS document_id,
        title,
        scope_key,
        rank
    FROM documents_fts
    WHERE documents_fts MATCH :fts_query
      AND rowid != :source_document_id
    ORDER BY rank
    LIMIT :fetch_limit
    """

    with engine.begin() as connection:
        rows = connection.execute(
            text(shortlist_sql),
            {
                "fts_query": fts_query,
                "source_document_id": source_document.id,
                "fetch_limit": fetch_limit,
            },
        ).mappings().all()

    results = []

    for row in rows:
        candidate = db.get(DocumentRecord, row["document_id"])
        if not candidate:
            continue

        same_scope = candidate.scope_key == source_document.scope_key

        results.append({
            "document_id": candidate.id,
            "title": candidate.title,
            "course_code": candidate.course_code,
            "assignment_name": candidate.assignment_name,
            "document_type": candidate.document_type,
            "scope_key": candidate.scope_key,
            "extension": candidate.extension,
            "same_scope": same_scope,
            "rank_score": float(row["rank"]) if row["rank"] is not None else 0.0,
        })

    if same_scope_first:
        results.sort(key=lambda item: (not item["same_scope"], item["rank_score"]))
    else:
        results.sort(key=lambda item: item["rank_score"])

    return {
        "fts_query": fts_query,
        "results": results[:top_k],
    }
