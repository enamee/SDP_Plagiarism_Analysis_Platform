import { useEffect, useState } from 'react'
import EmptyState from '../components/EmptyState'
import { clearDebugLogs, getDebugLogs } from '../services/documentService'

function DebugLogsPage() {
  const [logs, setLogs] = useState([])
  const [limit, setLimit] = useState(200)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadLogs(showLoading = false) {
    try {
      if (showLoading) {
        setLoading(true)
      } else {
        setRefreshing(true)
      }

      setError('')
      const data = await getDebugLogs(limit)
      setLogs(data.logs)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadLogs(true)
  }, [limit])

  useEffect(() => {
    if (!autoRefresh) return

    const intervalId = setInterval(() => {
      loadLogs(false)
    }, 3000)

    return () => clearInterval(intervalId)
  }, [autoRefresh, limit])

  const handleClearLogs = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to clear the debug logs?'
    )

    if (!confirmed) return

    try {
      setMessage('')
      const data = await clearDebugLogs()
      setMessage(data.message)
      await loadLogs(false)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-2">Debug Logs</h2>
            <p className="text-slate-700">
              View live backend activity to understand what the system is doing behind the scenes.
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => loadLogs(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 bg-white hover:bg-slate-50"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>

            <button
              type="button"
              onClick={handleClearLogs}
              className="rounded-lg bg-red-700 text-white px-4 py-2 hover:bg-red-600"
            >
              Clear Logs
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Number of Lines
            </label>
            <input
              type="number"
              min="20"
              max="1000"
              step="20"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full md:w-64 rounded-lg border border-slate-300 px-4 py-2"
            />
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-3 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
              Auto refresh every 3 seconds
            </label>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 mb-4">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700 mb-4">
            {message}
          </div>
        )}

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Current lines shown: <strong>{logs.length}</strong>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <h3 className="text-xl font-semibold mb-4">Log Output</h3>

        {loading ? (
          <p className="text-slate-600">Loading logs...</p>
        ) : logs.length === 0 ? (
          <EmptyState
            title="No logs available"
            description="Run a few actions in the system first, such as upload, compare, corpus check, or report export."
          />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-slate-950 text-slate-100 p-4 overflow-x-auto">
            <pre className="text-xs whitespace-pre-wrap font-mono">
              {logs.join('\n')}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}

export default DebugLogsPage
