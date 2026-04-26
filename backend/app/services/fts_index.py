from sqlalchemy import text
from sqlalchemy.engine import Engine

from app.models.document import DocumentRecord


def ensure_documents_fts(engine: Engine):
    """
    Create the FTS5 virtual table if it does not already exist.
    """
    create_sql = """
    CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts
    USING fts5(
        title,
        comparison_group,
        document_type,
        topic_tag,
        search_text,
        scope_key UNINDEXED
    );
    """

    with engine.begin() as connection:
        connection.execute(text(create_sql))


def upsert_document_in_fts(engine: Engine, document: DocumentRecord):
    """
    Keep the FTS row in sync with the main documents table.
    Uses rowid = document.id for easy mapping.
    """
    delete_sql = "DELETE FROM documents_fts WHERE rowid = :rowid"
    insert_sql = """
    INSERT INTO documents_fts (
        rowid,
        title,
        comparison_group,
        document_type,
        topic_tag,
        search_text,
        scope_key
    )
    VALUES (
        :rowid,
        :title,
        :comparison_group,
        :document_type,
        :topic_tag,
        :search_text,
        :scope_key
    )
    """

    with engine.begin() as connection:
        connection.execute(text(delete_sql), {"rowid": document.id})
        connection.execute(
            text(insert_sql),
            {
                "rowid": document.id,
                "title": document.title,
                "comparison_group": document.comparison_group,
                "document_type": document.document_type,
                "topic_tag": document.topic_tag or "",
                "search_text": document.search_text,
                "scope_key": document.scope_key,
            },
        )


def delete_document_from_fts(engine: Engine, document_id: int):
    delete_sql = "DELETE FROM documents_fts WHERE rowid = :rowid"

    with engine.begin() as connection:
        connection.execute(text(delete_sql), {"rowid": document_id})


def clear_documents_fts(engine: Engine):
    with engine.begin() as connection:
        connection.execute(text("DELETE FROM documents_fts"))
