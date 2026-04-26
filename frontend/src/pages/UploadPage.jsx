import { useState } from 'react'
import { uploadDocument } from '../services/documentService'

function getTitleFromFilename(filename) {
  const lastDotIndex = filename.lastIndexOf('.')
  const stem = lastDotIndex > 0 ? filename.slice(0, lastDotIndex) : filename

  return stem.trim() || 'Untitled Document'
}

function UploadPage() {
  const [uploadMode, setUploadMode] = useState('single')
  const [title, setTitle] = useState('')
  const [comparisonGroup, setComparisonGroup] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [topicTag, setTopicTag] = useState('')

  const [inputMode, setInputMode] = useState('file')
  const [selectedFiles, setSelectedFiles] = useState([])
  const [manualText, setManualText] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  const isBatchUpload = uploadMode === 'batch'

  const handleUploadModeChange = (mode) => {
    setUploadMode(mode)
    setInputMode('file')
    setError('')
    setResult(null)
    setSelectedFiles([])
    setManualText('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setResult(null)

    if (!isBatchUpload && !title.trim()) {
      setError('Please enter a title.')
      return
    }

    if (!comparisonGroup.trim()) {
      setError('Please enter a comparison group.')
      return
    }

    if (!documentType.trim()) {
      setError('Please enter a document type.')
      return
    }

    if (inputMode === 'file' && selectedFiles.length === 0) {
      setError('Please choose at least one file.')
      return
    }

    if (inputMode === 'manual' && !manualText.trim()) {
      setError('Please enter manual text.')
      return
    }

    try {
      setLoading(true)
      if (isBatchUpload) {
        if (selectedFiles.length === 0) {
          setError('Please choose at least one file.')
          return
        }

        const uploadedDocuments = []

        for (const selectedFile of selectedFiles) {
          const derivedTitle = getTitleFromFilename(selectedFile.name)
          const formData = new FormData()
          formData.append('title', derivedTitle)
          formData.append('comparison_group', comparisonGroup)
          formData.append('document_type', documentType)
          formData.append('topic_tag', topicTag)
          formData.append('input_mode', 'file')
          formData.append('file', selectedFile)

          const data = await uploadDocument(formData)
          uploadedDocuments.push(data.document)
        }

        const firstDocument = uploadedDocuments[0]
        setResult({
          success: true,
          message: `${uploadedDocuments.length} file(s) uploaded, processed, and retrieval-prepared successfully.`,
          document: firstDocument,
          uploaded_documents: uploadedDocuments,
        })
        setSelectedFiles([])
      } else if (inputMode === 'file') {
        if (selectedFiles.length === 0) {
          setError('Please choose a file.')
          return
        }

        const formData = new FormData()
        formData.append('title', title)
        formData.append('comparison_group', comparisonGroup)
        formData.append('document_type', documentType)
        formData.append('topic_tag', topicTag)
        formData.append('input_mode', inputMode)
        formData.append('file', selectedFiles[0])

        const data = await uploadDocument(formData)
        setResult(data)
        setSelectedFiles([])
      } else {
        const formData = new FormData()
        formData.append('title', title)
        formData.append('comparison_group', comparisonGroup)
        formData.append('document_type', documentType)
        formData.append('topic_tag', topicTag)
        formData.append('input_mode', inputMode)
        formData.append('manual_text', manualText)

        const data = await uploadDocument(formData)
        setResult(data)
        setManualText('')
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
        Upload TXT, PDF, DOCX files or paste text manually. Each document now belongs to a generic comparison group for smarter retrieval.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Upload Type
          </label>
          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => handleUploadModeChange('single')}
              className={`rounded-lg px-4 py-2 border ${
                uploadMode === 'single'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              Single Upload
            </button>

            <button
              type="button"
              onClick={() => handleUploadModeChange('batch')}
              className={`rounded-lg px-4 py-2 border ${
                uploadMode === 'batch'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-700 border-slate-300'
              }`}
            >
              Batch Upload
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {!isBatchUpload && (
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
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Comparison Group
            </label>
            <input
              type="text"
              value={comparisonGroup}
              onChange={(e) => setComparisonGroup(e.target.value)}
              placeholder="e.g. School Science Reports 2026"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Document Type
            </label>
            <input
              type="text"
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              placeholder="e.g. report, essay, article"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Topic Tags (optional)
            </label>
            <input
              type="text"
              value={topicTag}
              onChange={(e) => setTopicTag(e.target.value)}
              placeholder="e.g. similarity, academic writing, nlp"
              className="w-full rounded-lg border border-slate-300 px-4 py-2 outline-none focus:border-slate-500"
            />
          </div>
        </div>

        {!isBatchUpload && (
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
        )}

        {(isBatchUpload || inputMode === 'file') ? (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              {isBatchUpload ? 'Choose Files' : 'Choose File'}
            </label>
            <input
              type="file"
              multiple={isBatchUpload}
              accept=".txt,.pdf,.docx"
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
              className="block w-full rounded-lg border border-slate-300 px-4 py-2 bg-white"
            />
            <p className="text-xs text-slate-500 mt-2">
              Allowed formats: .txt, .pdf, .docx
            </p>
            {selectedFiles.length > 0 && (
              <div className="mt-2">
                <p className="text-sm text-slate-700">Selected files: {selectedFiles.length}</p>
                {isBatchUpload && (
                  <p className="text-xs text-slate-500 mt-1">
                    Batch upload will use each filename as that document&apos;s title.
                  </p>
                )}
                <ul className="mt-1 max-h-24 overflow-y-auto text-xs text-slate-600 space-y-1">
                  {selectedFiles.map((file) => (
                    <li key={`${file.name}-${file.size}`}>
                      {file.name}
                      {isBatchUpload && (
                        <span className="text-slate-500">
                          {' '}
                          - Title: {getTitleFromFilename(file.name)}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
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
          {result.uploaded_documents && (
            <p className="text-sm text-emerald-800 mb-3">
              {result.message}
            </p>
          )}

          <div className="space-y-2 text-sm text-slate-800">
            <p><strong>ID:</strong> {result.document.id}</p>
            <p><strong>Title:</strong> {result.document.title}</p>
            <p><strong>Comparison Group:</strong> {result.document.comparison_group}</p>
            <p><strong>Document Type:</strong> {result.document.document_type}</p>
            <p><strong>Topic Tags:</strong> {result.document.topic_tag || 'N/A'}</p>
            <p><strong>Scope Key:</strong> {result.document.scope_key}</p>
            <p><strong>Source Type:</strong> {result.document.source_type}</p>
            <p><strong>Stored Filename:</strong> {result.document.stored_filename}</p>
            <p><strong>Extracted Filename:</strong> {result.document.extracted_filename}</p>
            <p><strong>Extension:</strong> {result.document.extension}</p>
            <p><strong>Size (bytes):</strong> {result.document.size_bytes}</p>
            <p><strong>Extracted Character Count:</strong> {result.document.extracted_char_count}</p>
            <p><strong>Sentence Count:</strong> {result.document.sentence_count}</p>
            <p><strong>Token Count:</strong> {result.document.token_count}</p>

            {result.document.original_filename && (
              <p><strong>Original Filename:</strong> {result.document.original_filename}</p>
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
