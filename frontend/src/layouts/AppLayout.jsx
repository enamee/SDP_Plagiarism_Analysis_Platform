import SidebarLink from '../components/SidebarLink'

function AppLayout({ children }) {
  return (
    <div className="h-screen overflow-hidden bg-slate-100">
      <header className="bg-slate-900 text-white px-6 py-4 shadow">
        <h1 className="text-xl font-semibold">
          Similarity Detection & Analysis
        </h1>
      </header>

      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        <aside className="w-64 shrink-0 bg-white border-r border-slate-200 p-4 overflow-y-auto">
          <h2 className="text-sm font-bold text-slate-500 uppercase mb-4">
            Navigation
          </h2>

          <nav className="space-y-2">
            <SidebarLink to="/upload" label="Upload Documents" />
            <SidebarLink to="/compare" label="Compare Documents" />
            <SidebarLink to="/corpus-check" label="Corpus Check" />
            <SidebarLink to="/batch-check" label="Batch Check" />
            <SidebarLink to="/graph" label="Similarity Graph" />
            <SidebarLink to="/style-shift-analysis" label="Style Shift Analysis" />
          </nav>
        </aside>

        <main className="flex-1 min-w-0 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}

export default AppLayout
