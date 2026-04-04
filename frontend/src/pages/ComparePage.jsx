import { useEffect, useMemo, useState } from 'react'
import {
 compareDocuments,
 getDocumentById,
 getDocuments,
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

function ComparePage() {
 const [documents, setDocuments] = useState([])
 const [documentAId, setDocumentAId] = useState('')
 const [documentBId, setDocumentBId] = useState('')
 const [loadingDocuments, setLoadingDocuments] = useState(true)
 const [comparing, setComparing] = useState(false)
 const [error, setError] = useState('')
 const [result, setResult] = useState(null)
 const [documentADetail, setDocumentADetail] = useState(null)
 const [documentBDetail, setDocumentBDetail] = useState(null)

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

 const handleCompare = async (event) => {
   event.preventDefault()
   setError('')
   setResult(null)
   setDocumentADetail(null)
   setDocumentBDetail(null)

   if (!documentAId || !documentBId) {
     setError('Please select both documents.')
     return
   }

   if (documentAId === documentBId) {
     setError('Please choose two different documents.')
     return
   }

   try {
     setComparing(true)

     const [comparisonResult, docA, docB] = await Promise.all([
       compareDocuments(documentAId, documentBId),
       getDocumentById(documentAId),
       getDocumentById(documentBId),
     ])

     setResult(comparisonResult)
     setDocumentADetail(docA)
     setDocumentBDetail(docB)
   } catch (err) {
     setError(err.message)
   } finally {
     setComparing(false)
   }
 }

 const matchedSentencesA = result
   ? result.top_matches.map((match) => match.sentence_a)
   : []

 const matchedSentencesB = result
   ? result.top_matches.map((match) => match.sentence_b)
   : []

 return (
   <div className="space-y-6">
     <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
       <h2 className="text-2xl font-bold mb-3">Compare Documents</h2>
       <p className="text-slate-700 mb-6">
         Select two uploaded documents and compare their extracted text.
       </p>

       {loadingDocuments ? (
         <p className="text-slate-600">Loading documents...</p>
       ) : (
         <form onSubmit={handleCompare} className="space-y-5">
           <div className="grid md:grid-cols-2 gap-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">
                 Document A
               </label>
               <select
                 value={documentAId}
                 onChange={(e) => setDocumentAId(e.target.value)}
                 className="w-full rounded-lg border border-slate-300 px-4 py-2 bg-white"
               >
                 <option value="">Select Document A</option>
                 {documents.map((doc) => (
                   <option key={doc.id} value={doc.id}>
                     #{doc.id} - {doc.title} ({doc.extension})
                   </option>
                 ))}
               </select>
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">
                 Document B
               </label>
               <select
                 value={documentBId}
                 onChange={(e) => setDocumentBId(e.target.value)}
                 className="w-full rounded-lg border border-slate-300 px-4 py-2 bg-white"
               >
                 <option value="">Select Document B</option>
                 {documents.map((doc) => (
                   <option key={doc.id} value={doc.id}>
                     #{doc.id} - {doc.title} ({doc.extension})
                   </option>
                 ))}
               </select>
             </div>
           </div>

           {error && (
             <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
               {error}
             </div>
           )}

           <button
             type="submit"
             disabled={comparing}
             className="rounded-lg bg-slate-900 text-white px-5 py-2.5 hover:bg-slate-800 disabled:opacity-60"
           >
             {comparing ? 'Comparing...' : 'Compare Documents'}
           </button>
         </form>
       )}
     </div>

     {result && (
       <>
         <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
           <h3 className="text-xl font-semibold mb-4">Comparison Result</h3>

           <div className="grid md:grid-cols-2 gap-4 mb-6">
             <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
               <p className="text-sm text-slate-500 mb-1">Document A</p>
               <p className="font-semibold">{result.document_a_title}</p>
             </div>

             <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
               <p className="text-sm text-slate-500 mb-1">Document B</p>
               <p className="font-semibold">{result.document_b_title}</p>
             </div>
           </div>

           <div className="grid md:grid-cols-2 gap-4">
             <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
               <p className="text-sm text-slate-500 mb-1">Overall Similarity</p>
               <p className="text-3xl font-bold">{result.overall_percentage}%</p>
             </div>

             <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
               <p className="text-sm text-slate-500 mb-1">Assessment</p>
               <p className="text-xl font-semibold">{result.similarity_label}</p>
             </div>
           </div>
         </div>

         <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
           <h3 className="text-xl font-semibold mb-4">Top Matching Sentences</h3>

           {result.top_matches.length === 0 ? (
             <p className="text-slate-600">
               No strong sentence-level matches were found.
             </p>
           ) : (
             <div className="space-y-4">
               {result.top_matches.map((match, index) => (
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
             title={`Highlighted Text - ${result.document_a_title}`}
             text={documentADetail?.extracted_text || ''}
             matchedSentences={matchedSentencesA}
           />

           <HighlightedTextPanel
             title={`Highlighted Text - ${result.document_b_title}`}
             text={documentBDetail?.extracted_text || ''}
             matchedSentences={matchedSentencesB}
           />
         </div>
       </>
     )}
   </div>
 )
}

export default ComparePage
