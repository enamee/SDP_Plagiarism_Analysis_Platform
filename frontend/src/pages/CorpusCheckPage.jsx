import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import { getCachedPageState, setCachedPageState } from '../services/pageStateCache'
import { getDocuments, getShortlist, runCorpusCheck } from '../services/documentService'

const PAGE_CACHE_KEY = 'corpus-check'

function CorpusCheckPage() {
  const cachedState = getCachedPageState(PAGE_CACHE_KEY) || {}

  const [documents, setDocuments] = useState([])
  const [selectedDocumentId, setSelectedDocumentId] = useState(cachedState.selectedDocumentId || '')

  const [resultTopK, setResultTopK] = useState(cachedState.resultTopK ?? 5)
  const [shortlistTopK, setShortlistTopK] = useState(cachedState.shortlistTopK ?? 20)
  const [sameScopeFirst, setSameScopeFirst] = useState(cachedState.sameScopeFirst ?? true)
  const [scopeOnly, setScopeOnly] = useState(cachedState.scopeOnly ?? false)
  const [useSemanticScoring, setUseSemanticScoring] = useState(cachedState.useSemanticScoring ?? true)
  const [sentenceMatchThreshold, setSentenceMatchThreshold] = useState(cachedState.sentenceMatchThreshold ?? 0.4)

  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [runningShortlist, setRunningShortlist] = useState(false)
  const [runningCheck, setRunningCheck] = useState(false)

  const [error, setError] = useState('')
  const [shortlistResult, setShortlistResult] = useState(cachedState.shortlistResult || null)
  const [result, setResult] = useState(cachedState.result || null)

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

  useEffect(() => {
    setCachedPageState(PAGE_CACHE_KEY, {
      selectedDocumentId,
      resultTopK,
      shortlistTopK,
      sameScopeFirst,
      scopeOnly,
      useSemanticScoring,
      sentenceMatchThreshold,
      shortlistResult,
      result,
    })
  }, [
    result,
    resultTopK,
    sameScopeFirst,
    scopeOnly,
    useSemanticScoring,
    sentenceMatchThreshold,
    selectedDocumentId,
    shortlistResult,
    shortlistTopK,
  ])

  const handleRunShortlist = async (event) => {
    event.preventDefault()
    setError('')
    setShortlistResult(null)

    if (!selectedDocumentId) {
      setError('Please select a source document.')
      return
    }

    if (Number(shortlistTopK) < 1) {
      setError('Shortlist size must be at least 1.')
      return
    }

    try {
      setRunningShortlist(true)
      const data = await getShortlist(
        selectedDocumentId,
        shortlistTopK,
        sameScopeFirst,
        scopeOnly
      )
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

    if (Number(resultTopK) < 1) {
      setError('Final result count must be at least 1.')
      return
    }

    if (Number(shortlistTopK) < 1) {
      setError('Shortlist size must be at least 1.')
      return
    }

    try {
      setRunningCheck(true)
      const data = await runCorpusCheck(
        selectedDocumentId,
        resultTopK,
        shortlistTopK,
        sameScopeFirst,
        scopeOnly,
        useSemanticScoring,
        sentenceMatchThreshold
      )
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
          This page now uses a two-stage pipeline: shortlist retrieval first, then detailed reranking only on shortlisted candidates.
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
                  Final Results to Return
                </label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={resultTopK}
                  onChange={(e) => setResultTopK(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Shortlist Size
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={shortlistTopK}
                  onChange={(e) => setShortlistTopK(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-4 py-2"
                />
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={sameScopeFirst}
                  onChange={(e) => setSameScopeFirst(e.target.checked)}
                  disabled={scopeOnly}
                />
                Prefer same-scope documents first
              </label>

              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={scopeOnly}
                  onChange={(e) => setScopeOnly(e.target.checked)}
                />
                Restrict shortlist to same-scope documents only
              </label>

              <label className="flex items-center gap-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={useSemanticScoring}
                  onChange={(e) => {
                    const checked = e.target.checked
                    setUseSemanticScoring(checked)
                    setSentenceMatchThreshold(checked ? 0.4 : 0.3)
                  }}
                />
                Use semantic scoring in detailed comparison
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Sentence Match Threshold: {(Number(sentenceMatchThreshold) * 100).toFixed(0)}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={Math.round(Number(sentenceMatchThreshold) * 100)}
                  onChange={(e) => setSentenceMatchThreshold(Number(e.target.value) / 100)}
                  className="w-full"
                />
              </div>
            </div>

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
                {runningCheck ? 'Running Detailed Check...' : 'Run Detailed Corpus Check'}
              </button>
            </div>
          </form>
        )}
      </div>

      {shortlistResult && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-xl font-semibold mb-4">Shortlist Summary</h3>

            <div className="grid md:grid-cols-5 gap-4">
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

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Scope Only</p>
                <p className="font-semibold">{shortlistResult.scope_only ? 'Yes' : 'No'}</p>
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
                          ID: {item.document_id} | Group: {item.comparison_group} | Type: {item.document_type}
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
                          Retrieval rank score: {item.rank_score}
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

            <div className="grid md:grid-cols-6 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Source Document</p>
                <p className="font-semibold">{result.source_document_title}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Scope Key</p>
                <p className="text-xs font-semibold break-all">{result.scope_key}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Shortlist Retrieved</p>
                <p className="text-2xl font-bold">{result.shortlist_candidates_retrieved}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Detailed Checked</p>
                <p className="text-2xl font-bold">{result.detailed_candidates_checked}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Returned Results</p>
                <p className="text-2xl font-bold">{result.returned_candidates}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Scope Mode</p>
                <p className="font-semibold">
                  {result.scope_only ? 'Same Scope Only' : result.same_scope_first ? 'Prefer Same Scope' : 'Global'}
                </p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500 mb-1">FTS Query Used</p>
              <p className="font-mono text-sm break-all">{result.fts_query || 'N/A'}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-xl font-semibold mb-4">Final Ranked Similar Documents</h3>

            {result.results.length === 0 ? (
              <EmptyState
                title="No ranked results"
                description="No shortlisted candidates were available or no detailed comparison results were produced."
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
                        <Link
                          to="/comparison-details"
                          state={{
                            comparisonDetails: {
                              documentAId: result.source_document_id,
                              documentBId: item.candidate_document_id,
                              documentATitle: result.source_document_title,
                              documentBTitle: item.candidate_title,
                              overallSimilarity: item.overall_similarity,
                              overallPercentage: item.overall_percentage,
                              similarityLabel: item.similarity_label,
                              topMatches: item.top_matches,
                              useSemanticScoring,
                              sentenceMatchThreshold,
                            },
                          }}
                          className="text-sm text-blue-700 hover:underline"
                        >
                          Final Rank #{index + 1}
                        </Link>
                        <h4 className="text-lg font-semibold">
                          {item.candidate_title}
                        </h4>
                        <p className="text-sm text-slate-600">
                          Document ID: {item.candidate_document_id} | Extension: {item.candidate_extension}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 break-all">
                          Candidate Scope: {item.candidate_scope_key}
                        </p>
                      </div>

                      <div className="text-right flex flex-col gap-2 items-start md:items-end">
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
                        <StatusBadge
                          label={item.same_scope ? 'Same Scope' : 'Different Scope'}
                          type={item.same_scope ? 'success' : 'info'}
                        />
                        <p className="text-sm text-slate-600">
                          Retrieval rank: {item.retrieval_rank_score}
                        </p>
                        <Link
                          to="/comparison-details"
                          state={{
                            comparisonDetails: {
                              documentAId: result.source_document_id,
                              documentBId: item.candidate_document_id,
                              documentATitle: result.source_document_title,
                              documentBTitle: item.candidate_title,
                              overallSimilarity: item.overall_similarity,
                              overallPercentage: item.overall_percentage,
                              similarityLabel: item.similarity_label,
                              topMatches: item.top_matches,
                            },
                          }}
                          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 bg-white hover:bg-slate-100"
                        >
                          View Details
                        </Link>
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
                          {item.top_matches.slice(0, 3).map((match, matchIndex) => (
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
