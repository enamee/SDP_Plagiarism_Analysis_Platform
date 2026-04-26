const API_BASE_URL = 'http://127.0.0.1:8000'
const ADMIN_TOKEN_STORAGE_KEY = 'admin_auth_token'

function getAdminAuthHeaders() {
 const token = localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY)
 if (!token) {
   return {}
 }

 return {
   Authorization: `Bearer ${token}`,
 }
}

export function isAdminAuthenticated() {
 return Boolean(localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY))
}

export async function adminLogin(username, password) {
 const response = await fetch(`${API_BASE_URL}/api/admin/auth/login`, {
   method: 'POST',
   headers: {
     'Content-Type': 'application/json',
   },
   body: JSON.stringify({ username, password }),
 })

 const data = await response.json()

 if (!response.ok) {
   throw new Error(data.detail || 'Admin login failed.')
 }

 localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, data.token)
 return data
}

export async function adminLogout() {
 const response = await fetch(`${API_BASE_URL}/api/admin/auth/logout`, {
   method: 'POST',
   headers: {
     ...getAdminAuthHeaders(),
   },
 })

 localStorage.removeItem(ADMIN_TOKEN_STORAGE_KEY)

 if (!response.ok) {
   return { success: false }
 }

 return { success: true }
}

export async function adminChangePassword(oldPassword, newPassword, confirmNewPassword) {
 const response = await fetch(`${API_BASE_URL}/api/admin/auth/change-password`, {
   method: 'POST',
   headers: {
     'Content-Type': 'application/json',
     ...getAdminAuthHeaders(),
   },
   body: JSON.stringify({
     old_password: oldPassword,
     new_password: newPassword,
     confirm_new_password: confirmNewPassword,
   }),
 })

 const data = await response.json()

 if (!response.ok) {
   throw new Error(data.detail || 'Failed to change admin password.')
 }

 return data
}

export async function uploadDocument(formData) {
 const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
   method: 'POST',
   body: formData,
 })

 const data = await response.json()

 if (!response.ok) {
   throw new Error(data.detail || 'Upload failed.')
 }

 return data
}

export async function getDocuments() {
 const response = await fetch(`${API_BASE_URL}/api/documents`)
 const data = await response.json()

 if (!response.ok) {
   throw new Error('Failed to fetch documents.')
 }

 return data
}

export async function getShortlist(
  documentId,
  topK = 10,
  sameScopeFirst = true,
  scopeOnly = false
) {
  const response = await fetch(
    `${API_BASE_URL}/api/retrieval/shortlist/${documentId}?top_k=${Number(topK)}&same_scope_first=${sameScopeFirst}&scope_only=${scopeOnly}`
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Shortlist retrieval failed.')
  }

  return data
}

export async function getDashboardSummary() {
 const protectedResponse = await fetch(`${API_BASE_URL}/api/dashboard/summary`, {
   headers: {
     ...getAdminAuthHeaders(),
   },
 })
 const data = await protectedResponse.json()

 if (!protectedResponse.ok) {
   throw new Error('Failed to fetch dashboard summary.')
 }

 return data
}

export async function deleteDocumentById(documentId) {
 const response = await fetch(`${API_BASE_URL}/api/admin/documents/${documentId}`, {
   method: 'DELETE',
   headers: {
     ...getAdminAuthHeaders(),
   },
 })

 const data = await response.json()

 if (!response.ok) {
   throw new Error(data.detail || 'Document deletion failed.')
 }

 return data
}

export async function resetAllDemoData() {
 const response = await fetch(`${API_BASE_URL}/api/admin/reset-data`, {
   method: 'DELETE',
   headers: {
     ...getAdminAuthHeaders(),
   },
 })

 const data = await response.json()

 if (!response.ok) {
   throw new Error(data.detail || 'Reset failed.')
 }

 return data
}

export async function getDocumentById(documentId) {
 const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}`)
 const data = await response.json()

 if (!response.ok) {
   throw new Error(data.detail || 'Failed to fetch document details.')
 }

 return data
}

export async function updateDocumentMetadata(documentId, payload) {
 const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/metadata`, {
   method: 'PUT',
   headers: {
     'Content-Type': 'application/json',
   },
   body: JSON.stringify(payload),
 })

 const data = await response.json()

 if (!response.ok) {
   throw new Error(data.detail || 'Failed to update document metadata.')
 }

 return data
}

export async function reprocessDocument(documentId) {
 const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/reprocess`, {
   method: 'PUT',
   headers: {
     'Content-Type': 'application/json',
   },
 })

 const data = await response.json()

 if (!response.ok) {
   throw new Error(data.detail || 'Failed to reprocess document.')
 }

 return data
}

export async function compareDocuments(
 documentAId,
 documentBId,
 useSemanticScoring = true,
 sentenceMatchThreshold = null
) {
 const response = await fetch(`${API_BASE_URL}/api/compare/documents`, {
   method: 'POST',
   headers: {
     'Content-Type': 'application/json',
   },
   body: JSON.stringify({
     document_a_id: Number(documentAId),
     document_b_id: Number(documentBId),
     use_semantic_scoring: Boolean(useSemanticScoring),
     sentence_match_threshold:
       sentenceMatchThreshold === null ? null : Number(sentenceMatchThreshold),
   }),
 })

 const data = await response.json()

 if (!response.ok) {
   throw new Error(data.detail || 'Comparison failed.')
 }

 return data
}

export async function runCorpusCheck(
  documentId,
  resultTopK = 5,
  shortlistTopK = 20,
  sameScopeFirst = true,
  scopeOnly = false,
  useSemanticScoring = true,
  sentenceMatchThreshold = null
) {
  const thresholdQuery =
    sentenceMatchThreshold === null
      ? ''
      : `&sentence_match_threshold=${Number(sentenceMatchThreshold)}`

  const response = await fetch(
    `${API_BASE_URL}/api/corpus-check/${documentId}?result_top_k=${Number(resultTopK)}&shortlist_top_k=${Number(shortlistTopK)}&same_scope_first=${sameScopeFirst}&scope_only=${scopeOnly}&use_semantic_scoring=${Boolean(useSemanticScoring)}${thresholdQuery}`
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Corpus check failed.')
  }

  return data
}

export async function runBatchCheck(
 documentIds,
 minSimilarity = 0.2,
 maxPairs = 20,
 useSemanticScoring = true,
 sentenceMatchThreshold = null
) {
 const response = await fetch(`${API_BASE_URL}/api/batch-check`, {
   method: 'POST',
   headers: {
     'Content-Type': 'application/json',
   },
   body: JSON.stringify({
     document_ids: documentIds.map((id) => Number(id)),
     min_similarity: Number(minSimilarity),
     max_pairs: Number(maxPairs),
     use_semantic_scoring: Boolean(useSemanticScoring),
     sentence_match_threshold:
       sentenceMatchThreshold === null ? null : Number(sentenceMatchThreshold),
   }),
 })

 const data = await response.json()

 if (!response.ok) {
   throw new Error(data.detail || 'Batch check failed.')
 }

 return data
}

export async function generateGraph(
 documentIds = [],
 minSimilarity = 0.2,
 useSemanticScoring = true,
 sentenceMatchThreshold = null
) {
 const response = await fetch(`${API_BASE_URL}/api/graph`, {
   method: 'POST',
   headers: {
     'Content-Type': 'application/json',
   },
   body: JSON.stringify({
     document_ids: documentIds.map((id) => Number(id)),
     min_similarity: Number(minSimilarity),
     use_semantic_scoring: Boolean(useSemanticScoring),
     sentence_match_threshold:
       sentenceMatchThreshold === null ? null : Number(sentenceMatchThreshold),
   }),
 })

 const data = await response.json()

 if (!response.ok) {
   throw new Error(data.detail || 'Graph generation failed.')
 }

 return data
}

export async function runStyleShiftAnalysis(documentId, chunkSize = 5, anomalyThreshold = 1.2) {
 const response = await fetch(`${API_BASE_URL}/api/style-shift`, {
   method: 'POST',
   headers: {
     'Content-Type': 'application/json',
   },
   body: JSON.stringify({
     document_id: Number(documentId),
     chunk_size: Number(chunkSize),
     anomaly_threshold: Number(anomalyThreshold),
   }),
 })

 const data = await response.json()

 if (!response.ok) {
   throw new Error(data.detail || 'Style-shift analysis failed.')
 }

 return data
}

export async function downloadComparisonReport(
 documentAId,
 documentBId,
 useSemanticScoring = true,
 sentenceMatchThreshold = null
) {
 const thresholdQuery =
   sentenceMatchThreshold === null
     ? ''
     : `&sentence_match_threshold=${Number(sentenceMatchThreshold)}`

 const downloadUrl = `${API_BASE_URL}/api/reports/comparison?document_a_id=${Number(documentAId)}&document_b_id=${Number(documentBId)}&use_semantic_scoring=${Boolean(useSemanticScoring)}${thresholdQuery}`

 const link = document.createElement('a')
 link.href = downloadUrl
 link.download = `comparison_report_${documentAId}_${documentBId}.txt`
 link.target = '_blank'
 link.rel = 'noopener noreferrer'
 document.body.appendChild(link)
 link.click()
 link.remove()
}

export async function getDebugLogs(limit = 200) {
  const response = await fetch(`${API_BASE_URL}/api/debug/logs?limit=${Number(limit)}`, {
    headers: {
      ...getAdminAuthHeaders(),
    },
  })
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to fetch debug logs.')
  }

  return data
}

export async function clearDebugLogs() {
  const response = await fetch(`${API_BASE_URL}/api/debug/logs`, {
    method: 'DELETE',
    headers: {
      ...getAdminAuthHeaders(),
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Failed to clear debug logs.')
  }

  return data
}
