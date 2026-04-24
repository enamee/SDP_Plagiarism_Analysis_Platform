import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCachedPageState, setCachedPageState } from '../services/pageStateCache'
import { getDocuments, runBatchCheck } from '../services/documentService'

const PAGE_CACHE_KEY = 'batch-check'

function BatchCheckPage() {
 const cachedState = getCachedPageState(PAGE_CACHE_KEY) || {}

 const [documents, setDocuments] = useState([])
 const [selectedIds, setSelectedIds] = useState(cachedState.selectedIds || [])
 const [minSimilarity, setMinSimilarity] = useState(cachedState.minSimilarity ?? 0.2)
 const [maxPairs, setMaxPairs] = useState(cachedState.maxPairs ?? 20)
 const [useSemanticScoring, setUseSemanticScoring] = useState(cachedState.useSemanticScoring ?? true)
 const [loadingDocuments, setLoadingDocuments] = useState(true)
 const [runningCheck, setRunningCheck] = useState(false)
 const [error, setError] = useState('')
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
     selectedIds,
     minSimilarity,
     maxPairs,
     useSemanticScoring,
     result,
   })
 }, [maxPairs, minSimilarity, result, selectedIds, useSemanticScoring])

 const handleToggleDocument = (documentId) => {
   setSelectedIds((prev) =>
     prev.includes(documentId)
       ? prev.filter((id) => id !== documentId)
       : [...prev, documentId]
   )
 }

 const handleRunBatchCheck = async (event) => {
   event.preventDefault()
   setError('')
   setResult(null)

   if (selectedIds.length < 2) {
     setError('Please select at least two documents.')
     return
   }

   if (Number(minSimilarity) < 0 || Number(minSimilarity) > 1) {
     setError('Minimum similarity must be between 0 and 1.')
     return
   }

   if (Number(maxPairs) < 1) {
     setError('Maximum pairs must be at least 1.')
     return
   }

   try {
     setRunningCheck(true)
     const data = await runBatchCheck(selectedIds, minSimilarity, maxPairs, useSemanticScoring)
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
       <h2 className="text-2xl font-bold mb-3">Batch Check</h2>
       <p className="text-slate-700 mb-6">
         Select multiple uploaded documents and compare every pair to find the most suspicious similarities.
       </p>

       {loadingDocuments ? (
         <p className="text-slate-600">Loading documents...</p>
       ) : (
         <form onSubmit={handleRunBatchCheck} className="space-y-6">
           <div>
             <label className="block text-sm font-medium text-slate-700 mb-3">
               Select Documents
             </label>

             {documents.length === 0 ? (
               <EmptyState
                title="No suspicious pairs found"
                description="No document pairs met the selected similarity threshold."
                />

             ) : (
               <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 p-4 bg-slate-50 space-y-3">
                 {documents.map((doc) => (
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
                         Type: {doc.source_type} | Extension: {doc.extension} | Extracted Characters: {doc.extracted_char_count}
                       </p>
                     </div>
                   </label>
                 ))}
               </div>
             )}
           </div>

           <div className="grid md:grid-cols-2 gap-4">
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
                 className="w-full rounded-lg border border-slate-300 px-4 py-2"
               />
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">
                 Maximum Returned Pairs
               </label>
               <input
                 type="number"
                 min="1"
                 max="100"
                 value={maxPairs}
                 onChange={(e) => setMaxPairs(e.target.value)}
                 className="w-full rounded-lg border border-slate-300 px-4 py-2"
               />
             </div>
           </div>

           <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
             Selected documents: <strong>{selectedIds.length}</strong>
           </div>

           <label className="inline-flex items-center gap-2 text-sm text-slate-700">
             <input
               type="checkbox"
               checked={useSemanticScoring}
               onChange={(e) => setUseSemanticScoring(e.target.checked)}
               className="h-4 w-4 rounded border-slate-300"
             />
             Use semantic scoring for pair comparison
           </label>

           {error && (
             <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
               {error}
             </div>
           )}

           <button
             type="submit"
             disabled={runningCheck}
             className="rounded-lg bg-slate-900 text-white px-5 py-2.5 hover:bg-slate-800 disabled:opacity-60"
           >
             {runningCheck ? 'Running Batch Check...' : 'Run Batch Check'}
           </button>
         </form>
       )}
     </div>

     {result && (
       <div className="space-y-6">
         <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
           <h3 className="text-xl font-semibold mb-4">Batch Check Summary</h3>

           <div className="grid md:grid-cols-3 gap-4">
             <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
               <p className="text-sm text-slate-500 mb-1">Selected Documents</p>
               <p className="text-2xl font-bold">{result.selected_document_count}</p>
             </div>

             <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
               <p className="text-sm text-slate-500 mb-1">Pairs Checked</p>
               <p className="text-2xl font-bold">{result.total_pairs_checked}</p>
             </div>

             <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
               <p className="text-sm text-slate-500 mb-1">Returned Pairs</p>
               <p className="text-2xl font-bold">{result.returned_pairs}</p>
             </div>
           </div>
         </div>

         <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
           <h3 className="text-xl font-semibold mb-4">Most Suspicious Pairs</h3>

           {result.results.length === 0 ? (
             <p className="text-slate-600">
               No document pairs met the similarity threshold.
             </p>
           ) : (
             <div className="space-y-5">
               {result.results.map((pair, index) => (
                 <div
                   key={`${pair.document_a_id}-${pair.document_b_id}`}
                   className="rounded-2xl border border-slate-200 p-5 bg-slate-50"
                 >
                   <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                     <div>
                       <Link
                         to="/comparison-details"
                         state={{
                           comparisonDetails: {
                             documentAId: pair.document_a_id,
                             documentBId: pair.document_b_id,
                             documentATitle: pair.document_a_title,
                             documentBTitle: pair.document_b_title,
                             overallSimilarity: pair.overall_similarity,
                             overallPercentage: pair.overall_percentage,
                             similarityLabel: pair.similarity_label,
                             topMatches: pair.top_matches,
                           },
                         }}
                         className="text-sm text-blue-700 hover:underline"
                       >
                         Rank #{index + 1}
                       </Link>
                       <h4 className="text-lg font-semibold">
                         {pair.document_a_title} ↔ {pair.document_b_title}
                       </h4>
                       <p className="text-sm text-slate-600">
                         IDs: {pair.document_a_id} and {pair.document_b_id}
                       </p>
                     </div>

                     <div className="text-right">
                       <p className="text-2xl font-bold">{pair.overall_percentage}%</p>
                       <StatusBadge
                        label={pair.similarity_label}
                        type={
                          pair.similarity_label === 'High Similarity'
                            ? 'danger'
                            : pair.similarity_label === 'Moderate Similarity'
                            ? 'warning'
                            : 'success'
                        }
                        />

                       <Link
                         to="/comparison-details"
                         state={{
                           comparisonDetails: {
                             documentAId: pair.document_a_id,
                             documentBId: pair.document_b_id,
                             documentATitle: pair.document_a_title,
                             documentBTitle: pair.document_b_title,
                             overallSimilarity: pair.overall_similarity,
                             overallPercentage: pair.overall_percentage,
                             similarityLabel: pair.similarity_label,
                             topMatches: pair.top_matches,
                           },
                         }}
                         className="inline-block mt-3 rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 bg-white hover:bg-slate-100"
                       >
                         View Details
                       </Link>

                     </div>
                   </div>

                   <div>
                     <h5 className="font-medium mb-3">Top Matching Sentences</h5>

                     {pair.top_matches.length === 0 ? (
                       <p className="text-sm text-slate-600">
                         No strong sentence-level matches found.
                       </p>
                     ) : (
                       <div className="space-y-3">
                         {pair.top_matches.slice(0, 3).map((match, matchIndex) => (
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
                                   Sentence from Document A
                                 </p>
                                 <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm whitespace-pre-wrap">
                                   {match.sentence_a}
                                 </div>
                               </div>

                               <div>
                                 <p className="text-xs font-medium text-slate-500 mb-1">
                                   Sentence from Document B
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

export default BatchCheckPage
