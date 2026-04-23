import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  downloadComparisonReport,
  getDocumentById,
} from '../services/documentService'

function splitTextIntoDisplaySentences(text) {
  if (!text) return []

  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
}

function normalizeSentence(sentence) {
  return sentence
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function HighlightedTextPanel({ title, text, matchedSentences }) {
  const sentenceList = useMemo(() => splitTextIntoDisplaySentences(text), [text])

  const matchedSet = useMemo(() => {
    return new Set(matchedSentences.map((sentence) => normalizeSentence(sentence)))
  }, [matchedSentences])

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-lg font-semibold mb-4">{title}</h4>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {sentenceList.length === 0 ? (
          <p className="text-slate-500">No extracted text available.</p>
        ) : (
          sentenceList.map((sentence, index) => {
            const isMatched = matchedSet.has(normalizeSentence(sentence))

            return (
              <span
                key={index}
                className={`inline ${
                  isMatched
                    ? 'bg-yellow-200 rounded px-1'
                    : ''
                }`}
              >
                {sentence}{' '}
              </span>
            )
          })
        )}
      </div>
    </div>
  )
}

function ComparisonDetailsPage() {
  const location = useLocation()
  const navigate = useNavigate()

  const details = location.state?.comparisonDetails || null

  const [loadingDocuments, setLoadingDocuments] = useState(Boolean(details))
  const [error, setError] = useState('')
  const [documentADetail, setDocumentADetail] = useState(null)
  const [documentBDetail, setDocumentBDetail] = useState(null)
  const [downloadingReport, setDownloadingReport] = useState(false)

  useEffect(() => {
    async function loadDocuments() {
      if (!details) {
        return
      }

      try {
        setLoadingDocuments(true)
        setError('')

        const [docA, docB] = await Promise.all([
          getDocumentById(details.documentAId),
          getDocumentById(details.documentBId),
        ])

        setDocumentADetail(docA)
        setDocumentBDetail(docB)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoadingDocuments(false)
      }
    }

    loadDocuments()
  }, [details])

  const matchedSentencesA = details
    ? details.topMatches.map((match) => match.sentence_a)
    : []

  const matchedSentencesB = details
    ? details.topMatches.map((match) => match.sentence_b)
    : []

  const handleDownloadReport = async () => {
    if (!details) {
      setError('Comparison details are not available for export.')
      return
    }

    try {
      setDownloadingReport(true)
      await downloadComparisonReport(details.documentAId, details.documentBId)
    } catch (err) {
      setError(err.message)
    } finally {
      setDownloadingReport(false)
    }
  }

  if (!details) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
          <h2 className="text-2xl font-bold mb-3">Comparison Details</h2>
          <EmptyState
            title="No detail payload found"
            description="Open this page from Batch Check, Corpus Check, or Graph edge details so it can reuse precomputed results."
          />

          <div className="mt-5">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="rounded-lg border border-slate-300 px-4 py-2 bg-white hover:bg-slate-50"
            >
              Go Back
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold">Comparison Details</h2>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-300 px-4 py-2 bg-white hover:bg-slate-50"
          >
            Back
          </button>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 mb-4">
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <p className="text-sm text-slate-500 mb-1">Document A</p>
            <p className="font-semibold">{details.documentATitle}</p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <p className="text-sm text-slate-500 mb-1">Document B</p>
            <p className="font-semibold">{details.documentBTitle}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <p className="text-sm text-slate-500 mb-1">Overall Similarity</p>
            <p className="text-3xl font-bold">{details.overallPercentage}%</p>
          </div>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
            <p className="text-sm text-slate-500 mb-1">Assessment</p>
            <StatusBadge
              label={details.similarityLabel}
              type={
                details.similarityLabel === 'High Similarity'
                  ? 'danger'
                  : details.similarityLabel === 'Moderate Similarity'
                  ? 'warning'
                  : 'success'
              }
            />
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={downloadingReport}
            className="rounded-lg bg-emerald-700 text-white px-5 py-2.5 hover:bg-emerald-600 disabled:opacity-60"
          >
            {downloadingReport ? 'Generating PDF...' : 'Export PDF Report'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <h3 className="text-xl font-semibold mb-2">All Matching Sentences</h3>
        <p className="text-sm text-slate-600 mb-4">
          Total matching sentence pairs found: {details.topMatches.length}
        </p>

        {details.topMatches.length === 0 ? (
          <EmptyState
            title="No strong sentence matches"
            description="The selected documents do not have strong sentence-level overlap in the current analysis."
          />
        ) : (
          <div className="space-y-4">
            {details.topMatches.map((match, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 p-4 bg-slate-50"
              >
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-semibold">Match #{index + 1}</h4>
                  <span className="text-sm font-medium text-slate-700">
                    {(match.similarity * 100).toFixed(2)}%
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">
                      Sentence from Document A
                    </p>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm whitespace-pre-wrap">
                      {match.sentence_a}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-slate-500 mb-1">
                      Sentence from Document B
                    </p>
                    <div className="rounded-lg border border-slate-200 bg-white p-3 text-sm whitespace-pre-wrap">
                      {match.sentence_b}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <HighlightedTextPanel
          title={`Highlighted Text - ${details.documentATitle}`}
          text={loadingDocuments ? '' : documentADetail?.extracted_text || ''}
          matchedSentences={matchedSentencesA}
        />

        <HighlightedTextPanel
          title={`Highlighted Text - ${details.documentBTitle}`}
          text={loadingDocuments ? '' : documentBDetail?.extracted_text || ''}
          matchedSentences={matchedSentencesB}
        />
      </div>
    </div>
  )
}

export default ComparisonDetailsPage
