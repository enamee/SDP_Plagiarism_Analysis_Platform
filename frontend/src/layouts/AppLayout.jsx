import SidebarLink from '../components/SidebarLink'

function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white px-6 py-4 shadow">
        <h1 className="text-xl font-semibold">
          Explainable Plagiarism Analysis Platform
        </h1>
      </header>

      <div className="flex min-h-[calc(100vh-64px)]">
        <aside className="w-64 bg-white border-r border-slate-200 p-4">
          <h2 className="text-sm font-bold text-slate-500 uppercase mb-4">
            Navigation
          </h2>

          <nav className="space-y-2">
            <SidebarLink to="/" label="Dashboard" />
            <SidebarLink to="/upload" label="Upload Documents" />
            <SidebarLink to="/compare" label="Compare Documents" />
            <SidebarLink to="/corpus-check" label="Corpus Check" />
            <SidebarLink to="/batch-check" label="Batch Check" />
            <SidebarLink to="/graph" label="Similarity Graph" />
            <SidebarLink to="/reports" label="Reports" />
            <SidebarLink to="/debug" label="Debug Logs" />
          </nav>
        </aside>

        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppLayout
