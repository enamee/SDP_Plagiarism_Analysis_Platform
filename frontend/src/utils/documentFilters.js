const SEARCHABLE_KEYS = [
  'id',
  'title',
  'comparison_group',
  'document_type',
  'topic_tag',
  'scope_key',
  'source_type',
  'original_filename',
  'extension',
  'extracted_char_count',
  'created_at',
]

function buildDocumentSearchBlob(document) {
  return SEARCHABLE_KEYS.map((key) => String(document?.[key] || '')).join(' ').toLowerCase()
}

export function documentMatchesQuery(document, query) {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  return buildDocumentSearchBlob(document).includes(normalizedQuery)
}

export function filterDocumentsByQuery(documents, query) {
  return documents.filter((document) => documentMatchesQuery(document, query))
}

export function getUniqueDocumentValues(documents, key) {
  return Array.from(
    new Set(
      documents
        .map((document) => String(document?.[key] || '').trim())
        .filter(Boolean)
    )
  ).sort((left, right) => left.localeCompare(right))
}
