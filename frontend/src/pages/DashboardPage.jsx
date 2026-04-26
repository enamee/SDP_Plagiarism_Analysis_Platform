import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import StatusBadge from '../components/StatusBadge'
import {
 deleteDocumentById,
 getDashboardSummary,
 getDocuments,
 resetAllDemoData,
 updateDocumentMetadata,
 reprocessDocument,
} from '../services/documentService'

function isOcrSuccessMessage(extractionWarning) {
 if (!extractionWarning) {
   return false
 }

 const normalized = extractionWarning.toLowerCase()
 return normalized.includes('ocr') && normalized.includes('text extracted')
}

function DashboardPage() {
 const [summary, setSummary] = useState(null)
 const [documents, setDocuments] = useState([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')
 const [actionMessage, setActionMessage] = useState('')
 const [deletingId, setDeletingId] = useState(null)
 const [reprocessingId, setReprocessingId] = useState(null)
 const [resettingAll, setResettingAll] = useState(false)
 const [editingDocument, setEditingDocument] = useState(null)
 const [editTitle, setEditTitle] = useState('')
 const [editComparisonGroup, setEditComparisonGroup] = useState('')
 const [editDocumentType, setEditDocumentType] = useState('')
 const [editTopicTag, setEditTopicTag] = useState('')
 const [savingMetadata, setSavingMetadata] = useState(false)

 async function loadDashboardData() {
   try {
     setLoading(true)
     setError('')

     const [summaryData, documentsData] = await Promise.all([
       getDashboardSummary(),
       getDocuments(),
     ])

     setSummary(summaryData)
     setDocuments(documentsData)
   } catch (err) {
     setError(err.message)
   } finally {
     setLoading(false)
   }
 }

 useEffect(() => {
   loadDashboardData()
 }, [])

 const handleDeleteDocument = async (documentId, title) => {
   const confirmed = window.confirm(
     `Are you sure you want to delete "${title}"?`
   )

   if (!confirmed) return

   try {
     setActionMessage('')
     setDeletingId(documentId)
     const data = await deleteDocumentById(documentId)
     setActionMessage(data.message)
     await loadDashboardData()
   } catch (err) {
     setError(err.message)
   } finally {
     setDeletingId(null)
   }
 }

 const handleResetAll = async () => {
   const confirmed = window.confirm(
     'This will delete all uploaded documents, extracted files, and generated reports. Continue?'
   )

   if (!confirmed) return

   try {
     setActionMessage('')
     setResettingAll(true)
     const data = await resetAllDemoData()
     setActionMessage(
       `${data.message} Deleted documents: ${data.deleted_documents}, deleted reports: ${data.deleted_reports}.`
     )
     await loadDashboardData()
   } catch (err) {
     setError(err.message)
   } finally {
     setResettingAll(false)
   }
 }

 const handleReprocessDocument = async (documentId, title) => {
   const confirmed = window.confirm(
     `Re-extract and reprocess "${title}" using the latest extraction logic?`
   )

   if (!confirmed) return

   try {
     setActionMessage('')
     setReprocessingId(documentId)
     const data = await reprocessDocument(documentId)
     setActionMessage(data.message)
     await loadDashboardData()
   } catch (err) {
     setError(err.message)
   } finally {
     setReprocessingId(null)
   }
 }

 const handleOpenEdit = (doc) => {
   setError('')
   setActionMessage('')
   setEditingDocument(doc)
   setEditTitle(doc.title || '')
   setEditComparisonGroup(doc.comparison_group || '')
   setEditDocumentType(doc.document_type || '')
   setEditTopicTag(doc.topic_tag || '')
 }

 const handleCloseEdit = () => {
   setEditingDocument(null)
   setEditTitle('')
   setEditComparisonGroup('')
   setEditDocumentType('')
   setEditTopicTag('')
 }

 const handleSaveMetadata = async (event) => {
   event.preventDefault()

   if (!editingDocument) return

   if (!editTitle.trim()) {
     setError('Title is required.')
     return
   }

   if (!editComparisonGroup.trim()) {
     setError('Comparison group is required.')
     return
   }

   if (!editDocumentType.trim()) {
     setError('Document type is required.')
     return
   }

   try {
     setSavingMetadata(true)
     setError('')
     setActionMessage('')

     const data = await updateDocumentMetadata(editingDocument.id, {
       title: editTitle,
       comparison_group: editComparisonGroup,
       document_type: editDocumentType,
       topic_tag: editTopicTag,
     })

     setActionMessage(data.message)
     handleCloseEdit()
     await loadDashboardData()
   } catch (err) {
     setError(err.message)
   } finally {
     setSavingMetadata(false)
   }
 }

 return (
   <div className="space-y-6">
     <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
       <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
         <div>
           <h2 className="text-2xl font-bold mb-2">Dashboard</h2>
           <p className="text-slate-700">
             Overview and management panel for the plagiarism analysis system.
           </p>
         </div>

         <div className="flex gap-3">
           <button
             type="button"
             onClick={loadDashboardData}
             className="rounded-lg border border-slate-300 px-4 py-2 bg-white hover:bg-slate-50"
           >
             Refresh
           </button>

           <button
             type="button"
             onClick={handleResetAll}
             disabled={resettingAll}
             className="rounded-lg bg-red-700 text-white px-4 py-2 hover:bg-red-600 disabled:opacity-60"
           >
             {resettingAll ? 'Resetting...' : 'Reset All Demo Data'}
           </button>
         </div>
       </div>

       {loading && (
         <p className="text-slate-600">Loading dashboard...</p>
       )}

       {error && (
         <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 mb-4">
           {error}
         </div>
       )}

       {actionMessage && (
         <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 mb-4">
           {actionMessage}
         </div>
       )}

       {summary && !loading && (
         <div className="grid md:grid-cols-5 gap-4">
           <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
             <h3 className="font-semibold mb-2">Total Documents</h3>
             <p className="text-2xl font-bold">{summary.total_documents}</p>
           </div>

           <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
             <h3 className="font-semibold mb-2">Manual Inputs</h3>
             <p className="text-2xl font-bold">{summary.manual_documents}</p>
           </div>

           <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
             <h3 className="font-semibold mb-2">File Uploads</h3>
             <p className="text-2xl font-bold">{summary.file_documents}</p>
           </div>

           <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
             <h3 className="font-semibold mb-2">Warnings</h3>
             <p className="text-2xl font-bold">{summary.warning_documents}</p>
           </div>

           <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
             <h3 className="font-semibold mb-2">Extracted Characters</h3>
             <p className="text-2xl font-bold">{summary.total_extracted_characters}</p>
           </div>
         </div>
       )}
     </div>

     <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
       <h3 className="text-xl font-semibold mb-4">How to Demo Quickly</h3>
       <div className="grid md:grid-cols-3 gap-4">
         <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
           <h4 className="font-semibold mb-2">1. Upload Data</h4>
           <p className="text-sm text-slate-600">
             Add a few documents from TXT, PDF, DOCX, or manual text input.
           </p>
         </div>

         <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
           <h4 className="font-semibold mb-2">2. Run Analysis</h4>
           <p className="text-sm text-slate-600">
             Use Compare, Corpus Check, Batch Check, Graph, and Reports pages.
           </p>
         </div>

         <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
           <h4 className="font-semibold mb-2">3. Export & Explain</h4>
           <p className="text-sm text-slate-600">
             Export PDF report and explain how retrieval, matching, and style-shift work.
           </p>
         </div>
       </div>
     </div>

     <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
       <h3 className="text-xl font-semibold mb-4">Recent Documents</h3>

       {!loading && summary && summary.recent_documents.length === 0 && (
         <EmptyState
           title="No recent documents"
           description="Upload a few documents first to see recent activity here."
         />
       )}

       {!loading && summary && summary.recent_documents.length > 0 && (
         <div className="space-y-3">
           {summary.recent_documents.map((doc) => (
             <div
               key={doc.id}
               className="rounded-xl border border-slate-200 bg-slate-50 p-4"
             >
               <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                 <div>
                   <p className="font-semibold">
                     #{doc.id} - {doc.title}
                   </p>
                   <p className="text-sm text-slate-600 mb-2">
                     Type: {doc.source_type} | Extension: {doc.extension} | Extracted Characters: {doc.extracted_char_count}
                   </p>
                   <p className="text-sm text-slate-600 mb-2">
                     Comparison Group: {doc.comparison_group || 'N/A'} | Document Type: {doc.document_type || 'N/A'}
                   </p>
                   <p className="text-sm text-slate-600 mb-2">
                     Topic Tags: {doc.topic_tag || 'N/A'}
                   </p>

                   {isOcrSuccessMessage(doc.extraction_warning) ? (
                     <StatusBadge label="Processed using OCR" type="success" />
                   ) : doc.extraction_warning ? (
                     <StatusBadge label="Extraction Warning" type="warning" />
                   ) : (
                     <StatusBadge label="Processed" type="success" />
                   )}
                 </div>

                 <div className="text-sm text-slate-600">
                   {new Date(doc.created_at).toLocaleString()}
                 </div>
               </div>
             </div>
           ))}
         </div>
       )}
     </div>

     <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
       <h3 className="text-xl font-semibold mb-4">All Documents</h3>

       {!loading && documents.length === 0 && (
         <EmptyState
           title="No uploaded documents yet"
           description="Use the Upload page to add documents, then come back here to manage them."
         />
       )}

       {!loading && documents.length > 0 && (
         <div className="overflow-x-auto">
           <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
             <thead className="bg-slate-100">
               <tr>
                 <th className="text-left px-4 py-3 border-b">ID</th>
                 <th className="text-left px-4 py-3 border-b">Title</th>
                 <th className="text-left px-4 py-3 border-b">Comparison Group</th>
                 <th className="text-left px-4 py-3 border-b">Document Type</th>
                 <th className="text-left px-4 py-3 border-b">Topic Tags</th>
                 <th className="text-left px-4 py-3 border-b">Type</th>
                 <th className="text-left px-4 py-3 border-b">Extension</th>
                 <th className="text-left px-4 py-3 border-b">Extracted Characters</th>
                 <th className="text-left px-4 py-3 border-b">Warning</th>
                 <th className="text-left px-4 py-3 border-b">Created</th>
                 <th className="text-left px-4 py-3 border-b">Action</th>
               </tr>
             </thead>

             <tbody>
               {documents.map((doc) => (
                 <tr key={doc.id} className="hover:bg-slate-50">
                   <td className="px-4 py-3 border-b">{doc.id}</td>
                   <td className="px-4 py-3 border-b">{doc.title}</td>
                   <td className="px-4 py-3 border-b">{doc.comparison_group || 'N/A'}</td>
                   <td className="px-4 py-3 border-b">{doc.document_type || 'N/A'}</td>
                   <td className="px-4 py-3 border-b">{doc.topic_tag || 'N/A'}</td>
                   <td className="px-4 py-3 border-b capitalize">{doc.source_type}</td>
                   <td className="px-4 py-3 border-b">{doc.extension}</td>
                   <td className="px-4 py-3 border-b">{doc.extracted_char_count}</td>
                   <td className="px-4 py-3 border-b">
                     {isOcrSuccessMessage(doc.extraction_warning) ? (
                       <StatusBadge label="OCR Used" type="success" />
                     ) : doc.extraction_warning ? (
                       <StatusBadge label="Yes" type="warning" />
                     ) : (
                       <StatusBadge label="No" type="success" />
                     )}
                   </td>
                   <td className="px-4 py-3 border-b">
                     {new Date(doc.created_at).toLocaleString()}
                   </td>
                   <td className="px-4 py-3 border-b">
                     <div className="flex gap-2">
                       <button
                         type="button"
                         onClick={() => handleOpenEdit(doc)}
                         className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm bg-white hover:bg-slate-100"
                       >
                         Edit
                       </button>

                       {doc.source_type === 'file' && (
                         <button
                           type="button"
                           onClick={() => handleReprocessDocument(doc.id, doc.title)}
                           disabled={reprocessingId === doc.id}
                           className="rounded-lg border border-amber-300 px-3 py-1.5 text-sm bg-amber-50 hover:bg-amber-100 disabled:opacity-60"
                         >
                           {reprocessingId === doc.id ? 'Reprocessing...' : 'Reprocess'}
                         </button>
                       )}

                       <button
                         type="button"
                         onClick={() => handleDeleteDocument(doc.id, doc.title)}
                         disabled={deletingId === doc.id}
                         className="rounded-lg bg-red-600 text-white px-3 py-1.5 text-sm hover:bg-red-500 disabled:opacity-60"
                       >
                         {deletingId === doc.id ? 'Deleting...' : 'Delete'}
                       </button>
                     </div>
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       )}
     </div>

     {editingDocument && (
       <div className="fixed inset-0 bg-slate-950/40 flex items-center justify-center p-4 z-50">
         <div className="w-full max-w-2xl bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
           <h3 className="text-xl font-semibold mb-4">
             Edit Metadata - #{editingDocument.id}
           </h3>

           <form onSubmit={handleSaveMetadata} className="space-y-4">
             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">
                 Document Title
               </label>
               <input
                 type="text"
                 value={editTitle}
                 onChange={(e) => setEditTitle(e.target.value)}
                 className="w-full rounded-lg border border-slate-300 px-4 py-2"
               />
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">
                 Comparison Group
               </label>
               <input
                 type="text"
                 value={editComparisonGroup}
                 onChange={(e) => setEditComparisonGroup(e.target.value)}
                 className="w-full rounded-lg border border-slate-300 px-4 py-2"
               />
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">
                 Document Type
               </label>
               <input
                 type="text"
                 value={editDocumentType}
                 onChange={(e) => setEditDocumentType(e.target.value)}
                 className="w-full rounded-lg border border-slate-300 px-4 py-2"
               />
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-2">
                 Topic Tags
               </label>
               <input
                 type="text"
                 value={editTopicTag}
                 onChange={(e) => setEditTopicTag(e.target.value)}
                 className="w-full rounded-lg border border-slate-300 px-4 py-2"
               />
             </div>

             <div className="flex justify-end gap-3 pt-2">
               <button
                 type="button"
                 onClick={handleCloseEdit}
                 className="rounded-lg border border-slate-300 px-4 py-2 bg-white hover:bg-slate-50"
               >
                 Cancel
               </button>

               <button
                 type="submit"
                 disabled={savingMetadata}
                 className="rounded-lg bg-slate-900 text-white px-4 py-2 hover:bg-slate-800 disabled:opacity-60"
               >
                 {savingMetadata ? 'Saving...' : 'Save Metadata'}
               </button>
             </div>
           </form>
         </div>
       </div>
     )}
   </div>
 )
}

export default DashboardPage
