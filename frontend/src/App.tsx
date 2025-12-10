import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import DashboardCitizen from './pages/DashboardCitizen'
import DashboardOfficer from './pages/DashboardOfficer'
import DashboardAdmin from './pages/DashboardAdmin'
import FeedbackForm from './pages/FeedbackForm'
import Profile from './pages/Profile'
import StatusTracking from './pages/StatusTracking'
import NotFound from './pages/NotFound'
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute'
import './App.css'
import AdminUsers from './pages/AdminUsers'
import AdminOfficers from './pages/AdminOfficers'
import AdminFeedbacks from './pages/AdminFeedbacks'

function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/citizen" element={
            <ProtectedRoute>
              <RoleRoute roles={["CITIZEN"]}>
                <DashboardCitizen />
              </RoleRoute>
            </ProtectedRoute>
          } />
          <Route path="/officer" element={
            <ProtectedRoute>
              <RoleRoute roles={["OFFICER"]}>
                <DashboardOfficer />
              </RoleRoute>
            </ProtectedRoute>
          } />
          <Route path="/admin" element={<Navigate to="/admin/users" />} />
          <Route path="/admin/users" element={
            <ProtectedRoute>
              <RoleRoute roles={["ADMIN"]}>
                <AdminUsers />
              </RoleRoute>
            </ProtectedRoute>
          } />
          <Route path="/admin/officers" element={
            <ProtectedRoute>
              <RoleRoute roles={["ADMIN"]}>
                <AdminOfficers />
              </RoleRoute>
            </ProtectedRoute>
          } />
          <Route path="/admin/feedbacks" element={
            <ProtectedRoute>
              <RoleRoute roles={["ADMIN"]}>
                <AdminFeedbacks />
              </RoleRoute>
            </ProtectedRoute>
          } />

          <Route path="/feedback/new" element={
            <ProtectedRoute>
              <RoleRoute roles={["CITIZEN"]}>
                <FeedbackForm />
              </RoleRoute>
            </ProtectedRoute>
          } />
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />
          <Route path="/status" element={
            <ProtectedRoute>
              <RoleRoute roles={["CITIZEN"]}>
                <StatusTracking />
              </RoleRoute>
            </ProtectedRoute>
          } />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
