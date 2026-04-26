import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  compareDocuments,
  downloadComparisonReport,
  getDocumentById,
} from '../services/documentService'

function splitTextIntoDisplaySentences(text) {
  if (!text) return []

  let normalizedText = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  if (!normalizedText) return []

  normalizedText = normalizedText.replace(/[\t\f\v]+/g, ' ')
  normalizedText = normalizedText.replace(/\n{3,}/g, '\n\n')
  normalizedText = normalizedText.replace(/([.!?।॥]+)(?=[A-Z\u0980-\u09ff])/gu, '$1 ')

  const rawSentences = normalizedText
    .split(/(?<=[.!?।॥])\s+|\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean)

  const cleanedSentences = []

  for (let index = 0; index < rawSentences.length; index += 1) {
    let candidate = rawSentences[index]

    if (/^\d+[.)]$/.test(candidate) && index + 1 < rawSentences.length) {
      const nextCandidate = rawSentences[index + 1].trim()
      if (nextCandidate) {
        candidate = `${candidate} ${nextCandidate}`
        index += 1
      }
    }

    if (!/[a-z0-9\u0980-\u09ff]/iu.test(candidate)) {
      continue
    }

    cleanedSentences.push(candidate)
  }

  return cleanedSentences
}

function normalizeSentence(sentence) {
  return sentence
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function HighlightedTextPanel({
  title,
  text,
  matchedSentences,
  linkedSentences,
  selectedSentence,
  onSentenceClick,
}) {
  const sentenceList = useMemo(() => splitTextIntoDisplaySentences(text), [text])

  const normalizedMatchSet = useMemo(() => {
    const set = new Set()
    matchedSentences.forEach((sentence) => {
      const normalized = normalizeSentence(sentence)
      if (normalized) {
        set.add(normalized)
      }
    })
    return set
  }, [matchedSentences])

  const linkedSet = useMemo(() => new Set(linkedSentences), [linkedSentences])

  const handleKeySelect = (event, sentenceKey, isMatched) => {
    if (!isMatched) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSentenceClick(sentenceKey)
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-lg font-semibold mb-4">{title}</h4>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {sentenceList.length === 0 ? (
          <p className="text-slate-500">No extracted text available.</p>
        ) : (
          sentenceList.map((sentence, index) => {
            const sentenceKey = normalizeSentence(sentence)
            const isMatched = Boolean(sentenceKey) && normalizedMatchSet.has(sentenceKey)
            const isSelected = selectedSentence === sentenceKey
            const isLinked = linkedSet.has(sentenceKey)

            const sentenceClass = [
              'inline rounded px-1 transition',
              isMatched ? 'cursor-pointer' : '',
              isMatched && !isSelected && !isLinked ? 'bg-yellow-200' : '',
              isLinked ? 'bg-emerald-200 ring-1 ring-emerald-400' : '',
              isSelected ? 'bg-blue-200 ring-2 ring-blue-500' : '',
            ]
              .filter(Boolean)
              .join(' ')

            return (
              <span
                key={index}
                role={isMatched ? 'button' : undefined}
                tabIndex={isMatched ? 0 : -1}
                onClick={() => isMatched && onSentenceClick(sentenceKey)}
                onKeyDown={(event) => handleKeySelect(event, sentenceKey, isMatched)}
                className={sentenceClass}
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
  const initialTopMatches = details?.topMatches || []

  const [loadingDocuments, setLoadingDocuments] = useState(Boolean(details))
  const [loadingSentenceMatches, setLoadingSentenceMatches] = useState(
    Boolean(details && initialTopMatches.length === 0)
  )
  const [error, setError] = useState('')
  const [documentADetail, setDocumentADetail] = useState(null)
  const [documentBDetail, setDocumentBDetail] = useState(null)
  const [downloadingReport, setDownloadingReport] = useState(false)
  const [activeSentenceSelection, setActiveSentenceSelection] = useState(null)
  const [topMatches, setTopMatches] = useState(initialTopMatches)

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [details?.documentAId, details?.documentBId])

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

        if (initialTopMatches.length === 0) {
          setLoadingSentenceMatches(true)
          const comparison = await compareDocuments(
            details.documentAId,
            details.documentBId,
            details.useSemanticScoring,
            details.sentenceMatchThreshold
          )
          setTopMatches(comparison.top_matches || [])
        } else {
          setTopMatches(initialTopMatches)
        }

        setDocumentADetail(docA)
        setDocumentBDetail(docB)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoadingDocuments(false)
        setLoadingSentenceMatches(false)
      }
    }

    loadDocuments()
  }, [details, initialTopMatches])

  const matchedSentencesA = topMatches.map((match) => match.sentence_a)

  const matchedSentencesB = topMatches.map((match) => match.sentence_b)

  const sentenceLinks = useMemo(() => {
    const aToB = new Map()
    const bToA = new Map()

    if (!details || topMatches.length === 0) {
      return { aToB, bToA }
    }

    topMatches.forEach((match) => {
      const sentenceAKey = normalizeSentence(match.sentence_a)
      const sentenceBKey = normalizeSentence(match.sentence_b)

      if (!sentenceAKey || !sentenceBKey) {
        return
      }

      if (!aToB.has(sentenceAKey)) {
        aToB.set(sentenceAKey, new Set())
      }

      if (!bToA.has(sentenceBKey)) {
        bToA.set(sentenceBKey, new Set())
      }

      aToB.get(sentenceAKey).add(sentenceBKey)
      bToA.get(sentenceBKey).add(sentenceAKey)
    })

    return { aToB, bToA }
  }, [details, topMatches])

  const linkedSentencesA = useMemo(() => {
    if (!activeSentenceSelection || activeSentenceSelection.side !== 'b') {
      return []
    }

    return Array.from(
      sentenceLinks.bToA.get(activeSentenceSelection.sentence) || new Set()
    )
  }, [activeSentenceSelection, sentenceLinks])

  const linkedSentencesB = useMemo(() => {
    if (!activeSentenceSelection || activeSentenceSelection.side !== 'a') {
      return []
    }

    return Array.from(
      sentenceLinks.aToB.get(activeSentenceSelection.sentence) || new Set()
    )
  }, [activeSentenceSelection, sentenceLinks])

  const selectedSentenceA =
    activeSentenceSelection?.side === 'a' ? activeSentenceSelection.sentence : ''

  const selectedSentenceB =
    activeSentenceSelection?.side === 'b' ? activeSentenceSelection.sentence : ''

  const handleSentenceSelect = (side, sentenceKey) => {
    setActiveSentenceSelection((previous) => {
      if (previous?.side === side && previous?.sentence === sentenceKey) {
        return null
      }

      return { side, sentence: sentenceKey }
    })
  }

  const handleDownloadReport = async () => {
    if (!details) {
      setError('Comparison details are not available for export.')
      return
    }

    try {
      setDownloadingReport(true)
      await downloadComparisonReport(
        details.documentAId,
        details.documentBId,
        details.useSemanticScoring,
        details.sentenceMatchThreshold
      )
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
            {downloadingReport ? 'Generating TXT...' : 'Export TXT Report'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <h3 className="text-xl font-semibold mb-2">All Matching Sentences</h3>
        <p className="text-sm text-slate-600 mb-1">
          Total matching sentence pairs found: {topMatches.length}
        </p>
        <p className="text-xs text-slate-500 mb-4">
          Click any highlighted sentence in either panel below to emphasize its linked matches.
        </p>

        {loadingSentenceMatches ? (
          <p className="text-slate-600">Loading sentence-level matches...</p>
        ) : topMatches.length === 0 ? (
          <EmptyState
            title="No strong sentence matches"
            description="The selected documents do not have strong sentence-level overlap in the current analysis."
          />
        ) : (
          <div className="space-y-4">
            {topMatches.map((match, index) => (
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
          linkedSentences={linkedSentencesA}
          selectedSentence={selectedSentenceA}
          onSentenceClick={(sentenceKey) => handleSentenceSelect('a', sentenceKey)}
        />

        <HighlightedTextPanel
          title={`Highlighted Text - ${details.documentBTitle}`}
          text={loadingDocuments ? '' : documentBDetail?.extracted_text || ''}
          matchedSentences={matchedSentencesB}
          linkedSentences={linkedSentencesB}
          selectedSentence={selectedSentenceB}
          onSentenceClick={(sentenceKey) => handleSentenceSelect('b', sentenceKey)}
        />
      </div>
    </div>
  )
}

export default ComparisonDetailsPage
