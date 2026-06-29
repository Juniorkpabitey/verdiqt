import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './routes/ProtectedRoute'
import AdminRoute from './routes/AdminRoute'
import LawyerRoute from './routes/LawyerRoute'
import RoleRoute from './routes/RoleRoute'
import AppLayout from './layouts/AppLayout'
import AdminLayout from './layouts/AdminLayout'

import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import CasesPage from './pages/CasesPage'
import CaseIntelligencePage from './pages/CaseIntelligencePage'
import ChatPage from './pages/ChatPage'
import DocumentsPage from './pages/DocumentsPage'
import ReviewQueuePage from './pages/ReviewQueuePage'
import ProcedurePathwayPage from './pages/ProcedurePathwayPage'

import AdminOverviewPage from './pages/admin/AdminOverviewPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'
import AdminCasesPage from './pages/admin/AdminCasesPage'
import AdminLogsPage from './pages/admin/AdminLogsPage'
import AdminGovernancePage from './pages/admin/AdminGovernancePage'
import AdminIntegrationsPage from './pages/admin/AdminIntegrationsPage'
import LawyerDashboardPage from './pages/lawyer/LawyerDashboardPage'
import LawyerAppointmentsPage from './pages/lawyer/LawyerAppointmentsPage'
import MonitorDashboardPage from './pages/monitor/MonitorDashboardPage'
import ResearchDashboardPage from './pages/research/ResearchDashboardPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="cases" element={<CasesPage />} />
            <Route path="cases/:caseId/intelligence" element={<CaseIntelligencePage />} />
            <Route path="chat" element={<ChatPage />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="reviews" element={<ReviewQueuePage />} />
            <Route path="pathway" element={<ProcedurePathwayPage />} />
          </Route>

          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="cases" element={<AdminCasesPage />} />
            <Route path="logs" element={<AdminLogsPage />} />
            <Route path="governance" element={<AdminGovernancePage />} />
            <Route path="integrations" element={<AdminIntegrationsPage />} />
          </Route>

          <Route
            path="/lawyer"
            element={
              <LawyerRoute>
                <AppLayout />
              </LawyerRoute>
            }
          >
            <Route index element={<LawyerDashboardPage />} />
            <Route path="appointments" element={<LawyerAppointmentsPage />} />
          </Route>

          <Route
            path="/monitor"
            element={
              <ProtectedRoute>
                <RoleRoute roles={['hr_monitor', 'admin']}>
                  <AppLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<MonitorDashboardPage />} />
          </Route>

          <Route
            path="/research"
            element={
              <ProtectedRoute>
                <RoleRoute roles={['researcher', 'admin']}>
                  <AppLayout />
                </RoleRoute>
              </ProtectedRoute>
            }
          >
            <Route index element={<ResearchDashboardPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
