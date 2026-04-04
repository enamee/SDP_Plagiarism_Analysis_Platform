import { useState } from 'react'
import { uploadDocument } from '../services/documentService'

function UploadPage() {
  const [title, setTitle] = useState('')
  const [inputMode, setInputMode] = useState('file')
  const [selectedFile, setSelectedFile] = useState(null)
  const [manualText, setManualText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setResult(null)

    if (!title.trim()) {
      setError('Please enter a title.')
      return
    }

    if (inputMode === 'file' && !selectedFile) {
      setError('Please choose a file.')
      return
    }

    if (inputMode === 'manual' && !manualText.trim()) {
      setError('Please enter manual text.')
      return
    }

    const formData = new FormData()
    formData.append('title', title)
    formData.append('input_mode', inputMode)

    if (inputMode === 'file') {
      formData.append('file', selectedFile)
    } else {
      formData.append('manual_text', manualText)
    }

    try {
      setLoading(true)
      const data = await uploadDocument(formData)
      setResult(data)

      if (inputMode === 'manual') {
        setManualText('')
      } else {
        setSelectedFile(null)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
      <h2 className="text-2xl font-bold mb-3">Upload Documents</h2>
      <p className="text-slate-700 mb-6">
        Upload TXT, PDF, DOCX files or paste text manually.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Document Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter a document title"
            className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Input Mode
          </label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setInputMode('file')}
              className={`rounded-lg px-4 py-2 border ${
                inputMode === 'file'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              File Upload
            </button>

            <button
              type="button"
              onClick={() => setInputMode('manual')}
              className={`rounded-lg px-4 py-2 border ${
                inputMode === 'manual'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              Manual Text
            </button>
          </div>
        </div>

        {inputMode === 'file' ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Choose File
            </label>
            <input
              type="file"
              accept=".txt,.pdf,.docx"
              onChange={(e) => setSelectedFile(e.target.files[0] || null)}
              className="block w-full rounded-lg border border-slate-300 px-4 py-2 bg-white"
            />
            <p className="text-xs text-slate-500 mt-2">
              Allowed formats: .txt, .pdf, .docx
            </p>
            {selectedFile && (
              <p className="text-sm text-slate-700 mt-2">
                Selected: {selectedFile.name}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Manual Text
            </label>
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows="10"
              placeholder="Paste or type text here..."
              className="w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-slate-500"
            />
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 text-white px-5 py-2.5 hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? 'Uploading...' : 'Submit'}
        </button>
      </form>

            {result && (
        <div className="mt-8 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="text-lg font-semibold text-emerald-800 mb-3">
            Upload Successful
          </h3>

          <div className="space-y-2 text-sm text-slate-800">
            <p><strong>Title:</strong> {result.document.title}</p>
            <p><strong>Source Type:</strong> {result.document.source_type}</p>
            <p><strong>Stored Filename:</strong> {result.document.stored_filename}</p>
            <p><strong>Extracted Filename:</strong> {result.document.extracted_filename}</p>
            <p><strong>Extension:</strong> {result.document.extension}</p>
            <p><strong>Size (bytes):</strong> {result.document.size_bytes}</p>
            <p><strong>Extracted Character Count:</strong> {result.document.extracted_char_count}</p>

            {result.document.original_filename && (
              <p><strong>Original Filename:</strong> {result.document.original_filename}</p>
            )}

            {result.document.char_count !== undefined && (
              <p><strong>Character Count:</strong> {result.document.char_count}</p>
            )}

            {result.document.extraction_warning && (
              <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800">
                <strong>Warning:</strong> {result.document.extraction_warning}
              </div>
            )}

            <div className="mt-4">
              <p className="font-semibold mb-2">Extracted Text Preview</p>
              <div className="rounded-lg border border-slate-200 bg-white p-3 whitespace-pre-wrap min-h-[120px]">
                {result.document.preview_text || 'No extractable text preview available.'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UploadPage
