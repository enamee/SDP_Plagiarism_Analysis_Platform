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
