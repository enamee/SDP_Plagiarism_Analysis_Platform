import { useEffect, useState } from 'react'
import { getDocuments } from '../services/documentService'

function DashboardPage() {
 const [documents, setDocuments] = useState([])
 const [loading, setLoading] = useState(true)
 const [error, setError] = useState('')

 useEffect(() => {
   async function loadDocuments() {
     try {
       setLoading(true)
       const data = await getDocuments()
       setDocuments(data)
     } catch (err) {
       setError(err.message)
     } finally {
       setLoading(false)
     }
   }

   loadDocuments()
 }, [])

 const totalDocuments = documents.length
 const manualDocuments = documents.filter(doc => doc.source_type === 'manual').length
 const fileDocuments = documents.filter(doc => doc.source_type === 'file').length
 const warningDocuments = documents.filter(doc => doc.extraction_warning).length

 return (
   <div className="space-y-6">
     <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
       <h2 className="text-2xl font-bold mb-3">Dashboard</h2>
       <p className="text-slate-700 mb-4">
         Welcome to the Explainable Plagiarism Analysis Platform.
       </p>

       <div className="grid md:grid-cols-4 gap-4">
         <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
           <h3 className="font-semibold mb-2">Total Documents</h3>
           <p className="text-2xl font-bold">{totalDocuments}</p>
         </div>

         <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
           <h3 className="font-semibold mb-2">Manual Inputs</h3>
           <p className="text-2xl font-bold">{manualDocuments}</p>
         </div>

         <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
           <h3 className="font-semibold mb-2">File Uploads</h3>
           <p className="text-2xl font-bold">{fileDocuments}</p>
         </div>

         <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
           <h3 className="font-semibold mb-2">Warnings</h3>
           <p className="text-2xl font-bold">{warningDocuments}</p>
         </div>
       </div>
     </div>

     <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
       <h3 className="text-xl font-semibold mb-4">Uploaded Documents</h3>

       {loading && (
         <p className="text-slate-600">Loading documents...</p>
       )}

       {error && (
         <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
           {error}
         </div>
       )}

       {!loading && !error && documents.length === 0 && (
         <p className="text-slate-600">No documents uploaded yet.</p>
       )}

       {!loading && !error && documents.length > 0 && (
         <div className="overflow-x-auto">
           <table className="min-w-full border border-slate-200 rounded-lg overflow-hidden">
             <thead className="bg-slate-100">
               <tr>
                 <th className="text-left px-4 py-3 border-b">ID</th>
                 <th className="text-left px-4 py-3 border-b">Title</th>
                 <th className="text-left px-4 py-3 border-b">Type</th>
                 <th className="text-left px-4 py-3 border-b">Extension</th>
                 <th className="text-left px-4 py-3 border-b">Extracted Characters</th>
                 <th className="text-left px-4 py-3 border-b">Warning</th>
                 <th className="text-left px-4 py-3 border-b">Created</th>
               </tr>
             </thead>
             <tbody>
               {documents.map((doc) => (
                 <tr key={doc.id} className="hover:bg-slate-50">
                   <td className="px-4 py-3 border-b">{doc.id}</td>
                   <td className="px-4 py-3 border-b">{doc.title}</td>
                   <td className="px-4 py-3 border-b capitalize">{doc.source_type}</td>
                   <td className="px-4 py-3 border-b">{doc.extension}</td>
                   <td className="px-4 py-3 border-b">{doc.extracted_char_count}</td>
                   <td className="px-4 py-3 border-b">
                     {doc.extraction_warning ? (
                       <span className="text-amber-700 font-medium">Yes</span>
                     ) : (
                       <span className="text-emerald-700 font-medium">No</span>
                     )}
                   </td>
                   <td className="px-4 py-3 border-b">
                     {new Date(doc.created_at).toLocaleString()}
                   </td>
                 </tr>
               ))}
             </tbody>
           </table>
         </div>
       )}
     </div>
   </div>
 )
}

export default DashboardPage
