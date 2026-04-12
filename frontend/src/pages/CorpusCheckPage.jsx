import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import { getDocuments, getShortlist, runCorpusCheck } from '../services/documentService'

function CorpusCheckPage() {
  const [documents, setDocuments] = useState([])
  const [selectedDocumentId, setSelectedDocumentId] = useState('')
  const [topK, setTopK] = useState(5)
  const [sameScopeFirst, setSameScopeFirst] = useState(true)

  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [runningShortlist, setRunningShortlist] = useState(false)
  const [runningCheck, setRunningCheck] = useState(false)

  const [error, setError] = useState('')
  const [shortlistResult, setShortlistResult] = useState(null)
  const [result, setResult] = useState(null)

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

  const handleRunShortlist = async (event) => {
    event.preventDefault()
    setError('')
    setShortlistResult(null)

    if (!selectedDocumentId) {
      setError('Please select a source document.')
      return
    }

    if (Number(topK) < 1) {
      setError('Top result count must be at least 1.')
      return
    }

    try {
      setRunningShortlist(true)
      const data = await getShortlist(selectedDocumentId, topK, sameScopeFirst)
      setShortlistResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setRunningShortlist(false)
    }
  }

  const handleRunCheck = async (event) => {
    event.preventDefault()
    setError('')
    setResult(null)

    if (!selectedDocumentId) {
      setError('Please select a source document.')
      return
    }

    if (Number(topK) < 1) {
      setError('Top result count must be at least 1.')
      return
    }

    try {
      setRunningCheck(true)
      const data = await runCorpusCheck(selectedDocumentId, topK)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setRunningCheck(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-2xl font-bold mb-3">Corpus Check</h2>
        <p className="text-slate-700 mb-6">
          This redesigned page now has two stages: first retrieve a shortlist of likely candidates, then run the full detailed corpus comparison.
        </p>

        {loadingDocuments ? (
          <p className="text-slate-600">Loading documents...</p>
        ) : (
          <form className="space-y-5">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Source Document
                </label>
                <select
                  value={selectedDocumentId}
                  onChange={(e) => setSelectedDocumentId(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 bg-white"
                >
                  <option value="">Select a document</option>
                  {documents.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      #{doc.id} - {doc.title} ({doc.extension}) [{doc.scope_key}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Top Results
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={topK}
                  onChange={(e) => setTopK(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2"
                />
              </div>
            </div>

            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={sameScopeFirst}
                onChange={(e) => setSameScopeFirst(e.target.checked)}
              />
              Prefer same-scope documents first
            </label>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRunShortlist}
                disabled={runningShortlist}
                className="rounded-lg bg-blue-700 text-white px-5 py-2.5 hover:bg-blue-600 disabled:opacity-60"
              >
                {runningShortlist ? 'Building Shortlist...' : 'Preview Shortlist'}
              </button>

              <button
                type="button"
                onClick={handleRunCheck}
                disabled={runningCheck}
                className="rounded-lg bg-slate-900 text-white px-5 py-2.5 hover:bg-slate-800 disabled:opacity-60"
              >
                {runningCheck ? 'Checking Corpus...' : 'Run Detailed Corpus Check'}
              </button>
            </div>
          </form>
        )}
      </div>

      {shortlistResult && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-xl font-semibold mb-4">Shortlist Summary</h3>

            <div className="grid md:grid-cols-4 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Source Document</p>
                <p className="font-semibold">{shortlistResult.source_document_title}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Scope Key</p>
                <p className="text-sm font-semibold break-all">{shortlistResult.scope_key}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Candidates Returned</p>
                <p className="text-2xl font-bold">{shortlistResult.returned_candidates}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Same Scope First</p>
                <p className="font-semibold">{shortlistResult.same_scope_first ? 'Yes' : 'No'}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500 mb-1">Generated FTS Query</p>
              <p className="font-mono text-sm break-all">{shortlistResult.fts_query || 'N/A'}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-xl font-semibold mb-4">Retrieved Candidates</h3>

            {shortlistResult.results.length === 0 ? (
              <EmptyState
                title="No shortlist candidates found"
                description="The retrieval layer did not find any likely matches for this document."
              />
            ) : (
              <div className="space-y-4">
                {shortlistResult.results.map((item, index) => (
                  <div
                    key={item.document_id}
                    className="rounded-2xl border border-slate-200 p-5 bg-slate-50"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="text-sm text-slate-500">Rank #{index + 1}</p>
                        <h4 className="text-lg font-semibold">{item.title}</h4>
                        <p className="text-sm text-slate-600">
                          ID: {item.document_id} | {item.course_code} | {item.assignment_name} | {item.document_type}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 break-all">
                          Scope: {item.scope_key}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 items-start md:items-end">
                        <StatusBadge
                          label={item.same_scope ? 'Same Scope' : 'Different Scope'}
                          type={item.same_scope ? 'success' : 'info'}
                        />
                        <p className="text-sm text-slate-600">
                          Rank score: {item.rank_score}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-xl font-semibold mb-4">Detailed Corpus Check Summary</h3>

            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Source Document</p>
                <p className="font-semibold">{result.source_document_title}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Candidates Checked</p>
                <p className="text-2xl font-bold">{result.total_candidates_checked}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Returned Results</p>
                <p className="text-2xl font-bold">{result.returned_candidates}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-xl font-semibold mb-4">Ranked Similar Documents</h3>

            {result.results.length === 0 ? (
              <EmptyState
                title="No ranked results"
                description="No candidate documents were available or no candidates met the current corpus-check conditions."
              />
            ) : (
              <div className="space-y-5">
                {result.results.map((item, index) => (
                  <div
                    key={item.candidate_document_id}
                    className="rounded-2xl border border-slate-200 p-5 bg-slate-50"
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                      <div>
                        <p className="text-sm text-slate-500">
                          Rank #{index + 1}
                        </p>
                        <h4 className="text-lg font-semibold">
                          {item.candidate_title}
                        </h4>
                        <p className="text-sm text-slate-600">
                          Document ID: {item.candidate_document_id} | Extension: {item.candidate_extension}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold">{item.overall_percentage}%</p>
                        <StatusBadge
                          label={item.similarity_label}
                          type={
                            item.similarity_label === 'High Similarity'
                              ? 'danger'
                              : item.similarity_label === 'Moderate Similarity'
                              ? 'warning'
                              : 'success'
                          }
                        />
                      </div>
                    </div>

                    <div>
                      <h5 className="font-medium mb-3">Top Matching Sentences</h5>

                      {item.top_matches.length === 0 ? (
                        <p className="text-sm text-slate-600">
                          No strong sentence-level matches found.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {item.top_matches.map((match, matchIndex) => (
                            <div
                              key={matchIndex}
                              className="rounded-xl border border-slate-200 bg-white p-4"
                            >
                              <div className="flex justify-between items-center mb-2">
                                <p className="text-sm font-semibold">
                                  Match #{matchIndex + 1}
                                </p>
                                <p className="text-sm text-slate-600">
                                  {(match.similarity * 100).toFixed(2)}%
                                </p>
                              </div>

                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-xs font-medium text-slate-500 mb-1">
                                    Source Document Sentence
                                  </p>
                                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap">
                                    {match.sentence_a}
                                  </div>
                                </div>

                                <div>
                                  <p className="text-xs font-medium text-slate-500 mb-1">
                                    Candidate Document Sentence
                                  </p>
                                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap">
                                    {match.sentence_b}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default CorpusCheckPage
