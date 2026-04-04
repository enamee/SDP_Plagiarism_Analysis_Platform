function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white px-6 py-4 shadow">
        <h1 className="text-xl font-semibold">
          Plagiarism Analysis System
        </h1>
      </header>

      <main className="max-w-6xl mx-auto py-8 px-4">
        {children}
      </main>
    </div>
  )
}

export default AppLayout
