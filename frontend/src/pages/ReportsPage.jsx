import { useEffect, useState } from 'react'
import { getDocuments, runStyleShiftAnalysis } from '../services/documentService'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import { getCachedPageState, setCachedPageState } from '../services/pageStateCache'

const PAGE_CACHE_KEY = 'style-shift-analysis'

function StyleShiftAnalysisPage() {
  const cachedState = getCachedPageState(PAGE_CACHE_KEY) || {}
  const [documents, setDocuments] = useState([])
  const [selectedDocumentId, setSelectedDocumentId] = useState(cachedState.selectedDocumentId || '')
  const [chunkSize, setChunkSize] = useState(cachedState.chunkSize ?? 5)
  const [anomalyThreshold, setAnomalyThreshold] = useState(cachedState.anomalyThreshold ?? 1.2)
  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [runningAnalysis, setRunningAnalysis] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(cachedState.result || null)

  useEffect(() => {
    setCachedPageState(PAGE_CACHE_KEY, {
      selectedDocumentId,
      chunkSize,
      anomalyThreshold,
      result,
    })
  }, [anomalyThreshold, chunkSize, result, selectedDocumentId])

  useEffect(() => {
    async function loadDocuments() {
      try {
        setLoadingDocuments(true)
        const data = await getDocuments()
        setDocuments(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoadingDocuments(false)
      }
    }

    loadDocuments()
  }, [])

  const handleRunAnalysis = async (event) => {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!selectedDocumentId) {
      setError('Please select a document.')
      return
    }

    if (Number(chunkSize) < 2 || Number(chunkSize) > 20) {
      setError('Chunk size must be between 2 and 20.')
      return
    }

    if (Number(anomalyThreshold) < 0) {
      setError('Anomaly threshold must be 0 or higher.')
      return
    }

    try {
      setRunningAnalysis(true)
      const data = await runStyleShiftAnalysis(
        selectedDocumentId,
        chunkSize,
        anomalyThreshold
      )
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setRunningAnalysis(false)
    }
  }

  const maxScore =
    result && result.chunks.length > 0
      ? Math.max(...result.chunks.map((chunk) => chunk.anomaly_score), 1)
      : 1

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-2xl font-bold mb-3">Style Shift Analysis</h2>
        <p className="text-slate-700 mb-6">
          Run intrinsic style-shift analysis to detect suspicious internal writing changes inside a document.
        </p>

        {loadingDocuments ? (
          <p className="text-slate-600">Loading documents...</p>
        ) : (
          <form onSubmit={handleRunAnalysis} className="space-y-5">
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Document
                </label>
                <select
                  value={selectedDocumentId}
                  onChange={(e) => setSelectedDocumentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 bg-white"
                >
                  <option value="">Select a document</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      #{doc.id} - {doc.title} ({doc.extension})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Chunk Size (sentences)
                </label>
                <input
                  type="number"
                  min="2"
                  max="20"
                  value={chunkSize}
                  onChange={(e) => setChunkSize(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Anomaly Threshold
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={anomalyThreshold}
                  onChange={(e) => setAnomalyThreshold(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2"
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={runningAnalysis}
              className="rounded-lg bg-slate-900 text-white px-5 py-2.5 hover:bg-slate-800 disabled:opacity-60"
            >
              {runningAnalysis ? 'Analyzing...' : 'Run Style-Shift Analysis'}
            </button>
          </form>
        )}
      </div>

      {result && (
        <>
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-xl font-semibold mb-4">Analysis Summary</h3>

            <div className="grid md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Document</p>
                <p className="font-semibold">{result.document_title}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Total Chunks</p>
                <p className="text-2xl font-bold">{result.total_chunks}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Suspicious Chunks</p>
                <p className="text-2xl font-bold">{result.suspicious_chunk_count}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Average Anomaly</p>
                <p className="text-2xl font-bold">{result.average_anomaly_score}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-xl font-semibold mb-4">Chunk Anomaly Scores</h3>

            <div className="space-y-3">
              {result.chunks.map((chunk) => {
                const width = `${(chunk.anomaly_score / maxScore) * 100}%`

                return (
                  <div key={chunk.chunk_index}>
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium">
                        Chunk #{chunk.chunk_index}
                      </p>
                      <p className="text-sm text-slate-600">
                        Score: {chunk.anomaly_score}
                      </p>
                    </div>

                    <div className="w-full h-4 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full ${
                          chunk.is_suspicious ? 'bg-red-500' : 'bg-slate-700'
                        }`}
                        style={{ width }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-xl font-semibold mb-4">Chunk Details</h3>

            <div className="space-y-4">
              {result.chunks.map((chunk) => (
                <div
                  key={chunk.chunk_index}
                  className={`rounded-2xl border p-5 ${
                    chunk.is_suspicious
                      ? 'border-red-300 bg-red-50'
                      : 'border-slate-200 bg-slate-50'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div>
                      <h4 className="text-lg font-semibold">
                        Chunk #{chunk.chunk_index}
                      </h4>
                      <p className="text-sm text-slate-600">
                        Sentences: {chunk.sentence_count}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-bold">
                        {chunk.anomaly_score}
                      </p>
                      <StatusBadge
                        label={chunk.is_suspicious ? 'Suspicious' : 'Normal'}
                        type={chunk.is_suspicious ? 'danger' : 'success'}
                      />
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-white p-4 mb-4">
                    <p className="text-sm whitespace-pre-wrap">{chunk.excerpt}</p>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-slate-500 mb-1">Avg Sentence Length</p>
                      <p className="font-semibold">{chunk.features.avg_sentence_length}</p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-slate-500 mb-1">Avg Word Length</p>
                      <p className="font-semibold">{chunk.features.avg_word_length}</p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-slate-500 mb-1">Lexical Diversity</p>
                      <p className="font-semibold">{chunk.features.lexical_diversity}</p>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3">
                      <p className="text-slate-500 mb-1">Punctuation Density</p>
                      <p className="font-semibold">{chunk.features.punctuation_density}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default StyleShiftAnalysisPage
