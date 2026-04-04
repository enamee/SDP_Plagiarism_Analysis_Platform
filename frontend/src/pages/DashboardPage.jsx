function DashboardPage() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
      <h2 className="text-2xl font-bold mb-3">Dashboard</h2>
      <p className="text-slate-700 mb-4">
        Welcome to the Explainable Plagiarism Analysis Platform.
      </p>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
          <h3 className="font-semibold mb-2">Documents</h3>
          <p className="text-sm text-slate-600">
            Later this card will show total uploaded documents.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
          <h3 className="font-semibold mb-2">Recent Checks</h3>
          <p className="text-sm text-slate-600">
            Later this card will show recent plagiarism checks.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50">
          <h3 className="font-semibold mb-2">Reports</h3>
          <p className="text-sm text-slate-600">
            Later this card will show exported reports.
          </p>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage
