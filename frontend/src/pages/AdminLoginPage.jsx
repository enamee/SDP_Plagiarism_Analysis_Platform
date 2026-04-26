import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminLogin } from '../services/documentService'

function AdminLoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!username.trim()) {
      setError('Username is required.')
      return
    }

    if (!password) {
      setError('Password is required.')
      return
    }

    try {
      setLoading(true)
      await adminLogin(username.trim(), password)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
      <h2 className="text-2xl font-bold mb-3">Admin Login</h2>
      <p className="text-slate-700 mb-6">
        Sign in to access the admin dashboard and debug logs.
      </p>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-amber-800 text-sm mb-6">
        Default username: <strong>admin</strong> | Default password: <strong>admin</strong>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2"
            autoComplete="username"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2"
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-900 text-white px-5 py-2.5 hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? 'Signing in...' : 'Sign In as Admin'}
        </button>
      </form>
    </div>
  )
}

export default AdminLoginPage
