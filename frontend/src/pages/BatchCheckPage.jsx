import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getCachedPageState, setCachedPageState } from '../services/pageStateCache'
import { getDocuments, runBatchCheck } from '../services/documentService'
import { filterDocumentsByQuery, getUniqueDocumentValues } from '../utils/documentFilters'

const PAGE_CACHE_KEY = 'batch-check'

function BatchCheckPage() {
 const cachedState = getCachedPageState(PAGE_CACHE_KEY) || {}

 const [documents, setDocuments] = useState([])
 const [selectedIds, setSelectedIds] = useState(cachedState.selectedIds || [])
 const [documentSearchQuery, setDocumentSearchQuery] = useState(cachedState.documentSearchQuery || '')
 const [selectedComparisonGroups, setSelectedComparisonGroups] = useState(cachedState.selectedComparisonGroups || [])
 const [selectedDocumentTypes, setSelectedDocumentTypes] = useState(cachedState.selectedDocumentTypes || [])
 const [selectedTopicTags, setSelectedTopicTags] = useState(cachedState.selectedTopicTags || [])
 const [minSimilarity, setMinSimilarity] = useState(cachedState.minSimilarity ?? 0.2)
 const [maxPairs, setMaxPairs] = useState(cachedState.maxPairs ?? 20)
 const [useSemanticScoring, setUseSemanticScoring] = useState(cachedState.useSemanticScoring ?? true)
 const [sentenceMatchThreshold, setSentenceMatchThreshold] = useState(cachedState.sentenceMatchThreshold ?? 0.4)
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
     documentSearchQuery,
     selectedComparisonGroups,
     selectedDocumentTypes,
     selectedTopicTags,
     minSimilarity,
     maxPairs,
     useSemanticScoring,
     sentenceMatchThreshold,
     result,
   })
 }, [
   documentSearchQuery,
   maxPairs,
   minSimilarity,
   result,
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
     const data = await runBatchCheck(
       selectedIds,
       minSimilarity,
       maxPairs,
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
               <EmptyState
                title="No suspicious pairs found"
                description="No document pairs met the selected similarity threshold."
                />

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
               onChange={(e) => {
                 const checked = e.target.checked
                 setUseSemanticScoring(checked)
                 setSentenceMatchThreshold(checked ? 0.4 : 0.3)
               }}
               className="h-4 w-4 rounded border-slate-300"
             />
             Use semantic scoring for pair comparison
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
                             topMatches: pair.top_matches || [],
                             useSemanticScoring,
                             sentenceMatchThreshold,
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

                     <div className="text-right flex flex-col gap-2 items-start md:items-end">
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
                             topMatches: pair.top_matches || [],
                             useSemanticScoring,
                             sentenceMatchThreshold,
                           },
                         }}
                         className="inline-block rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 bg-white hover:bg-slate-100"
                       >
                         View Details
                       </Link>

                     </div>
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
