function EmptyState({ title, description }) {
 return (
   <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center">
     <h3 className="text-lg font-semibold mb-2">{title}</h3>
     <p className="text-slate-600">{description}</p>
   </div>
 )
}

export default EmptyState
