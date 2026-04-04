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
