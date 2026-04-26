import { Routes, Route } from 'react-router-dom'
import AppLayout from './layouts/AppLayout'
import DashboardPage from './pages/DashboardPage'
import UploadPage from './pages/UploadPage'
import ComparePage from './pages/ComparePage'
import CorpusCheckPage from './pages/CorpusCheckPage'
import BatchCheckPage from './pages/BatchCheckPage'
import GraphPage from './pages/GraphPage'
import ComparisonDetailsPage from './pages/ComparisonDetailsPage'
import ReportsPage from './pages/ReportsPage'
import DebugLogsPage from './pages/DebugLogsPage'
import NotFoundPage from './pages/NotFoundPage'

function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/corpus-check" element={<CorpusCheckPage />} />
        <Route path="/batch-check" element={<BatchCheckPage />} />
        <Route path="/graph" element={<GraphPage />} />
        <Route path="/comparison-details" element={<ComparisonDetailsPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/debug" element={<DebugLogsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppLayout>
  )
}

export default App
