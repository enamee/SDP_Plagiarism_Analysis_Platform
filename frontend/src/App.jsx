import { Routes, Route, Navigate } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import ComparePage from './pages/ComparePage'
import CorpusCheckPage from './pages/CorpusCheckPage'
import BatchCheckPage from './pages/BatchCheckPage'
import GraphPage from './pages/GraphPage'
import ComparisonDetailsPage from './pages/ComparisonDetailsPage'
import StyleShiftAnalysisPage from './pages/ReportsPage'
import DebugLogsPage from './pages/DebugLogsPage'
import AdminLoginPage from './pages/AdminLoginPage'
import NotFoundPage from './pages/NotFoundPage'
import { isAdminAuthenticated } from './services/documentService'

function AdminProtectedRoute({ children }) {
  if (!isAdminAuthenticated()) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/corpus-check" element={<CorpusCheckPage />} />
        <Route path="/batch-check" element={<BatchCheckPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/comparison-details" element={<ComparisonDetailsPage />} />
        <Route path="/style-shift-analysis" element={<StyleShiftAnalysisPage />} />
        <Route
          path="/admin/login"
          element={
            isAdminAuthenticated()
              ? <Navigate to="/admin/dashboard" replace />
              : <AdminLoginPage />
          }
        />
        <Route
          path="/admin/dashboard"
          element={
            <AdminProtectedRoute>
              <DashboardPage />
            </AdminProtectedRoute>
          }
        />
        <Route
          path="/admin/debug-logs"
          element={
            <AdminProtectedRoute>
              <DebugLogsPage />
            </AdminProtectedRoute>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  )
}

export default App
