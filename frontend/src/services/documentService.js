const API_BASE_URL = 'http://127.0.0.1:8000'

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

export async function getShortlist(documentId, topK = 10, sameScopeFirst = true) {
  const response = await fetch(
    `${API_BASE_URL}/api/retrieval/shortlist/${documentId}?top_k=${Number(topK)}&same_scope_first=${sameScopeFirst}`
  )

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.detail || 'Shortlist retrieval failed.')
  }

  return data
}

export async function getDashboardSummary() {
 const response = await fetch(`${API_BASE_URL}/api/dashboard/summary`)
 const data = await response.json()

 if (!response.ok) {
   throw new Error('Failed to fetch dashboard summary.')
 }

 return data
}

export async function deleteDocumentById(documentId) {
 const response = await fetch(`${API_BASE_URL}/api/admin/documents/${documentId}`, {
   method: 'DELETE',
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

export async function compareDocuments(documentAId, documentBId) {
 const response = await fetch(`${API_BASE_URL}/api/compare/documents`, {
   method: 'POST',
   headers: {
     'Content-Type': 'application/json',
   },
   body: JSON.stringify({
     document_a_id: Number(documentAId),
     document_b_id: Number(documentBId),
   }),
 })

 const data = await response.json()

 if (!response.ok) {
   throw new Error(data.detail || 'Comparison failed.')
 }

 return data
}

export async function runCorpusCheck(documentId, topK = 5) {
 const response = await fetch(
   `${API_BASE_URL}/api/corpus-check/${documentId}?top_k=${Number(topK)}`
 )

 const data = await response.json()

 if (!response.ok) {
   throw new Error(data.detail || 'Corpus check failed.')
 }

 return data
}

export async function runBatchCheck(documentIds, minSimilarity = 0.2, maxPairs = 20) {
 const response = await fetch(`${API_BASE_URL}/api/batch-check`, {
   method: 'POST',
   headers: {
     'Content-Type': 'application/json',
   },
   body: JSON.stringify({
     document_ids: documentIds.map((id) => Number(id)),
     min_similarity: Number(minSimilarity),
     max_pairs: Number(maxPairs),
   }),
 })

 const data = await response.json()

 if (!response.ok) {
   throw new Error(data.detail || 'Batch check failed.')
 }

 return data
}

export async function generateGraph(documentIds = [], minSimilarity = 0.2) {
 const response = await fetch(`${API_BASE_URL}/api/graph`, {
   method: 'POST',
   headers: {
     'Content-Type': 'application/json',
   },
   body: JSON.stringify({
     document_ids: documentIds.map((id) => Number(id)),
     min_similarity: Number(minSimilarity),
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

export async function downloadComparisonReport(documentAId, documentBId) {
 const response = await fetch(
   `${API_BASE_URL}/api/reports/comparison?document_a_id=${Number(documentAId)}&document_b_id=${Number(documentBId)}`
 )

 if (!response.ok) {
   let errorMessage = 'Report download failed.'
   try {
     const data = await response.json()
     errorMessage = data.detail || errorMessage
   } catch {
     // ignore JSON parsing error
   }
   throw new Error(errorMessage)
 }

 const blob = await response.blob()
 const downloadUrl = window.URL.createObjectURL(blob)

 const link = document.createElement('a')
 link.href = downloadUrl
 link.download = `comparison_report_${documentAId}_${documentBId}.pdf`
 document.body.appendChild(link)
 link.click()
 link.remove()

 window.URL.revokeObjectURL(downloadUrl)
}
