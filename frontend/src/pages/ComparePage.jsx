function ComparePage() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
      <h2 className="text-2xl font-bold mb-3">Compare Documents</h2>
      <p className="text-slate-700 mb-4">
        This page will compare one document against another and show passage-level matches.
      </p>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
          <h3 className="font-semibold mb-2">Document A</h3>
          <p className="text-sm text-slate-600">Input area will come later.</p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
          <h3 className="font-semibold mb-2">Document B</h3>
          <p className="text-sm text-slate-600">Input area will come later.</p>
        </div>
      </div>
    </div>
  )
}

export default ComparePage
