function StatusBadge({ label, type = 'default' }) {
 const styles = {
   default: 'bg-slate-100 text-slate-700 border-slate-200',
   success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
   warning: 'bg-amber-100 text-amber-700 border-amber-200',
   danger: 'bg-red-100 text-red-700 border-red-200',
   info: 'bg-blue-100 text-blue-700 border-blue-200',
 }

 return (
   <span
     className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[type] || styles.default}`}
   >
     {label}
   </span>
 )
}

export default StatusBadge
