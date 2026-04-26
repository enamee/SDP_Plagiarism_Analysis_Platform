import { useEffect, useMemo, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import { getCachedPageState, setCachedPageState } from '../services/pageStateCache'
import { generateGraph, getDocuments } from '../services/documentService'
import { filterDocumentsByQuery, getUniqueDocumentValues } from '../utils/documentFilters'

const SVG_WIDTH = 900
const SVG_HEIGHT = 600
const CENTER_X = SVG_WIDTH / 2
const CENTER_Y = SVG_HEIGHT / 2
const RADIUS = 220
const PAGE_CACHE_KEY = 'graph'

function computeNodePositions(nodes) {
  if (nodes.length === 0) return []

  return nodes.map((node, index) => {
    const angle = (2 * Math.PI * index) / nodes.length
    const x = CENTER_X + RADIUS * Math.cos(angle)
    const y = CENTER_Y + RADIUS * Math.sin(angle)

    return {
      ...node,
      x,
      y,
    }
  })
}

function GraphPage() {
  const navigate = useNavigate()
  const cachedState = getCachedPageState(PAGE_CACHE_KEY) || {}

  const [documents, setDocuments] = useState([])
  const [selectedIds, setSelectedIds] = useState(cachedState.selectedIds || [])
  const [documentSearchQuery, setDocumentSearchQuery] = useState(cachedState.documentSearchQuery || '')
  const [selectedComparisonGroups, setSelectedComparisonGroups] = useState(cachedState.selectedComparisonGroups || [])
  const [selectedDocumentTypes, setSelectedDocumentTypes] = useState(cachedState.selectedDocumentTypes || [])
  const [selectedTopicTags, setSelectedTopicTags] = useState(cachedState.selectedTopicTags || [])
  const [minSimilarity, setMinSimilarity] = useState(cachedState.minSimilarity ?? 0.2)
  const [useSemanticScoring, setUseSemanticScoring] = useState(cachedState.useSemanticScoring ?? true)
  const [sentenceMatchThreshold, setSentenceMatchThreshold] = useState(cachedState.sentenceMatchThreshold ?? 0.4)
  const [loadingDocuments, setLoadingDocuments] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [graphData, setGraphData] = useState(cachedState.graphData || null)

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
      selectedIds,
      documentSearchQuery,
      selectedComparisonGroups,
      selectedDocumentTypes,
      selectedTopicTags,
      minSimilarity,
      useSemanticScoring,
      sentenceMatchThreshold,
      graphData,
    })
  }, [
    documentSearchQuery,
    graphData,
    minSimilarity,
    selectedComparisonGroups,
    selectedDocumentTypes,
    selectedIds,
    selectedTopicTags,
    sentenceMatchThreshold,
    useSemanticScoring,
  ])

  const availableComparisonGroups = useMemo(() => getUniqueDocumentValues(documents, 'comparison_group'), [documents])
  const availableDocumentTypes = useMemo(() => getUniqueDocumentValues(documents, 'document_type'), [documents])
  const availableTopicTags = useMemo(() => getUniqueDocumentValues(documents, 'topic_tag'), [documents])

  const filteredDocuments = useMemo(() => {
    return filterDocumentsByQuery(documents, documentSearchQuery).filter((document) => {
      if (selectedComparisonGroups.length > 0 && !selectedComparisonGroups.includes(document.comparison_group)) {
        return false
      }

      if (selectedDocumentTypes.length > 0 && !selectedDocumentTypes.includes(document.document_type)) {
        return false
      }

      if (selectedTopicTags.length > 0 && !selectedTopicTags.includes(String(document.topic_tag || '').trim())) {
        return false
      }

      return true
    })
  }, [documents, documentSearchQuery, selectedComparisonGroups, selectedDocumentTypes, selectedTopicTags])

  const toggleFacetValue = (setter, value) => {
    setter((previous) =>
      previous.includes(value)
        ? previous.filter((item) => item !== value)
        : [...previous, value]
    )
  }

  const handleToggleDocument = (documentId) => {
    setSelectedIds((prev) =>
      prev.includes(documentId)
        ? prev.filter((id) => id !== documentId)
        : [...prev, documentId]
    )
  }

  const handleSelectAll = () => {
    setSelectedIds(documents.map((doc) => doc.id))
  }

  const handleUnselectAll = () => {
    setSelectedIds([])
  }

  const handleSelectFiltered = () => {
    setSelectedIds((previous) => Array.from(new Set([...previous, ...filteredDocuments.map((document) => document.id)])))
  }

  const handleUnselectFiltered = () => {
    setSelectedIds((previous) => previous.filter((id) => !filteredDocuments.some((document) => document.id === id)))
  }

  const handleGenerateGraph = async (event) => {
    event.preventDefault()
    setError('')
    setGraphData(null)

    if (Number(minSimilarity) < 0 || Number(minSimilarity) > 1) {
      setError('Minimum similarity must be between 0 and 1.')
      return
    }

    try {
      setGenerating(true)
      const data = await generateGraph(
        selectedIds,
        minSimilarity,
        useSemanticScoring,
        sentenceMatchThreshold
      )
      setGraphData(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  const positionedNodes = useMemo(() => {
    if (!graphData?.nodes) return []
    return computeNodePositions(graphData.nodes)
  }, [graphData])

  const nodeMap = useMemo(() => {
    const map = {}
    positionedNodes.forEach((node) => {
      map[node.id] = node
    })
    return map
  }, [positionedNodes])

  const buildComparisonDetailsState = (edge) => ({
    comparisonDetails: {
      documentAId: edge.source,
      documentBId: edge.target,
      documentATitle: edge.source_title,
      documentBTitle: edge.target_title,
      overallSimilarity: edge.similarity,
      overallPercentage: edge.percentage,
      similarityLabel: edge.similarity_label,
      topMatches: edge.top_matches || [],
      useSemanticScoring,
      sentenceMatchThreshold,
    },
  })

  const handleEdgeClick = (edge) => {
    navigate('/comparison-details', {
      state: buildComparisonDetailsState(edge),
    })
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <h2 className="text-2xl font-bold mb-3">Similarity Graph</h2>
        <p className="text-slate-700 mb-6">
          Generate a document similarity graph for selected documents or for the whole uploaded corpus.
        </p>

        {loadingDocuments ? (
          <p className="text-slate-600">Loading documents...</p>
        ) : (
          <form onSubmit={handleGenerateGraph} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-3">
                Select Documents (optional)
              </label>
              <p className="text-sm text-slate-600 mb-3">
                If you select none, the graph will use all uploaded documents.
              </p>

              <div className="mb-3 grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Search Documents
                  </label>
                  <input
                    type="search"
                    value={documentSearchQuery}
                    onChange={(e) => setDocumentSearchQuery(e.target.value)}
                    placeholder="Search by title, group, type, tag, extension, or scope"
                    className="w-full rounded-lg border border-slate-300 px-4 py-2 bg-white"
                  />
                </div>

                <div className="flex flex-wrap gap-2 lg:justify-end lg:items-end">
                  <button
                    type="button"
                    onClick={handleSelectAll}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white hover:bg-slate-50"
                  >
                    Select All
                  </button>
                  <button
                    type="button"
                    onClick={handleSelectFiltered}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white hover:bg-slate-50"
                  >
                    Select Filtered
                  </button>
                  <button
                    type="button"
                    onClick={handleUnselectAll}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white hover:bg-slate-50"
                  >
                    Unselect All
                  </button>
                  <button
                    type="button"
                    onClick={handleUnselectFiltered}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white hover:bg-slate-50"
                  >
                    Unselect Filtered
                  </button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-3 mb-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Comparison Group</p>
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                    {availableComparisonGroups.map((value) => {
                      const isActive = selectedComparisonGroups.includes(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleFacetValue(setSelectedComparisonGroups, value)}
                          className={`rounded-full border px-3 py-1 text-sm transition ${
                            isActive
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {value}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Document Type</p>
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                    {availableDocumentTypes.map((value) => {
                      const isActive = selectedDocumentTypes.includes(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleFacetValue(setSelectedDocumentTypes, value)}
                          className={`rounded-full border px-3 py-1 text-sm transition ${
                            isActive
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {value}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-700 mb-2">Topic Tag</p>
                  <div className="flex flex-wrap gap-2 max-h-28 overflow-y-auto">
                    {availableTopicTags.map((value) => {
                      const isActive = selectedTopicTags.includes(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => toggleFacetValue(setSelectedTopicTags, value)}
                          className={`rounded-full border px-3 py-1 text-sm transition ${
                            isActive
                              ? 'border-slate-900 bg-slate-900 text-white'
                              : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {value}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 mb-3">
                Showing <strong>{filteredDocuments.length}</strong> of <strong>{documents.length}</strong> documents
              </div>

              {documents.length === 0 ? (
                <p className="text-slate-600">No uploaded documents available.</p>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-3">
                  {filteredDocuments.length === 0 ? (
                    <EmptyState
                      title="No documents match the selected filters"
                      description="Adjust the search, comparison group, type, or tag filters and try again."
                    />
                  ) : (
                    filteredDocuments.map((doc) => (
                      <label
                        key={doc.id}
                        className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(doc.id)}
                          onChange={() => handleToggleDocument(doc.id)}
                          className="mt-1"
                        />

                        <div>
                          <p className="font-medium">
                            #{doc.id} - {doc.title}
                          </p>
                          <p className="text-sm text-slate-600">
                            Group: {doc.comparison_group} | Type: {doc.document_type} | Tag: {doc.topic_tag || 'Untagged'}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Minimum Similarity Threshold (0 to 1)
              </label>
              <input
                type="number"
                min="0"
                max="1"
                step="0.05"
                value={minSimilarity}
                onChange={(e) => setMinSimilarity(e.target.value)}
                className="w-full md:w-64 rounded-lg border border-slate-300 px-4 py-2"
              />
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              Selected documents: <strong>{selectedIds.length}</strong>
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={useSemanticScoring}
                onChange={(e) => {
                  const checked = e.target.checked
                  setUseSemanticScoring(checked)
                  setSentenceMatchThreshold(checked ? 0.4 : 0.3)
                }}
                className="h-4 w-4 rounded border-slate-300"
              />
              Use semantic scoring for graph edges
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
                className="w-full md:w-64"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={generating}
              className="rounded-lg bg-slate-900 text-white px-5 py-2.5 hover:bg-slate-800 disabled:opacity-60"
            >
              {generating ? 'Generating Graph...' : 'Generate Graph'}
            </button>
          </form>
        )}
      </div>

      {graphData && (
        <>
          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-xl font-semibold mb-4">Graph Summary</h3>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Node Count</p>
                <p className="text-2xl font-bold">{graphData.node_count}</p>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
                <p className="text-sm text-slate-500 mb-1">Edge Count</p>
                <p className="text-2xl font-bold">{graphData.edge_count}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200 overflow-x-auto">
            <h3 className="text-xl font-semibold mb-4">Similarity Graph Visualization</h3>

            {positionedNodes.length === 0 ? (
              <p className="text-slate-600">No nodes available to display.</p>
            ) : (
              <svg
                width={SVG_WIDTH}
                height={SVG_HEIGHT}
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                className="border border-slate-200 rounded-xl bg-slate-50"
              >
                {/* edges */}
                {graphData.edges.map((edge, index) => {
                  const sourceNode = nodeMap[edge.source]
                  const targetNode = nodeMap[edge.target]

                  if (!sourceNode || !targetNode) return null

                  const midX = (sourceNode.x + targetNode.x) / 2
                  const midY = (sourceNode.y + targetNode.y) / 2

                  return (
                    <g key={index}>
                      <line
                        x1={sourceNode.x}
                        y1={sourceNode.y}
                        x2={targetNode.x}
                        y2={targetNode.y}
                        stroke="transparent"
                        strokeWidth={14}
                        onClick={() => handleEdgeClick(edge)}
                        style={{ cursor: 'pointer' }}
                      />
                      <line
                        x1={sourceNode.x}
                        y1={sourceNode.y}
                        x2={targetNode.x}
                        y2={targetNode.y}
                        stroke="#64748b"
                        strokeWidth={1 + edge.similarity * 4}
                        opacity={0.35 + edge.similarity * 0.5}
                        onClick={() => handleEdgeClick(edge)}
                        style={{ cursor: 'pointer' }}
                      />
                      <text
                        x={midX}
                        y={midY}
                        fontSize="11"
                        textAnchor="middle"
                        fill="#334155"
                        onClick={() => handleEdgeClick(edge)}
                        style={{ cursor: 'pointer' }}
                      >
                        {edge.percentage}%
                      </text>
                    </g>
                  )
                })}

                {/* nodes */}
                {positionedNodes.map((node) => (
                  <g key={node.id}>
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r="26"
                      fill="#0f172a"
                    />
                    <text
                      x={node.x}
                      y={node.y + 4}
                      fontSize="12"
                      textAnchor="middle"
                      fill="white"
                    >
                      {node.id}
                    </text>
                    <text
                      x={node.x}
                      y={node.y + 46}
                      fontSize="12"
                      textAnchor="middle"
                      fill="#0f172a"
                    >
                      {node.label.length > 18
                        ? `${node.label.slice(0, 18)}...`
                        : node.label}
                    </text>
                  </g>
                ))}
              </svg>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
            <h3 className="text-xl font-semibold mb-4">Edges</h3>

            {graphData.edges.length === 0 ? (
              <p className="text-slate-600">
                No similarity edges met the selected threshold.
              </p>
            ) : (
              <div className="space-y-3">
                {graphData.edges.map((edge, index) => (
                  <div
                    key={index}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="font-medium">
                      {edge.source_title} ↔ {edge.target_title}
                    </p>
                    <p className="text-sm text-slate-600">
                      Similarity: {edge.percentage}% ({edge.similarity})
                    </p>
                    <Link
                      to="/comparison-details"
                      state={buildComparisonDetailsState(edge)}
                      className="inline-block mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 bg-white hover:bg-slate-100"
                    >
                      View Details
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default GraphPage
