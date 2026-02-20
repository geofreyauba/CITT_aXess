// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Public pages
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Splash from './pages/Splash';

// Protected pages + layout
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Requests from './pages/Requests';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import HelpSupport from './pages/HelpSupport';
import Members from './pages/Members';
import PendingReturns from './pages/PendingReturns'; // ← was missing entirely

// Guard
import ProtectedRoute from './components/ProtectedRoute';

// ─────────────────────────────────────────────────────────────────────────────
// WHY role prop is removed from every DashboardLayout:
//   Previously every route had role="Admin" hardcoded, so Header + Sidebar
//   always showed "Admin" even for Innovators and regular users.
//   DashboardLayout now reads the real role from localStorage itself,
//   so no prop is needed and the correct role is always displayed.
// ─────────────────────────────────────────────────────────────────────────────

const App: React.FC = () => {
  return (
    <Router>
      <Routes>

        {/* Splash screen — first screen before auth check */}
        <Route path="/" element={<Splash />} />

        {/* ── Public routes ─────────────────────────────────────────── */}
        <Route path="/login"          element={<Login />} />
        <Route path="/register"       element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ── Protected routes (require valid auth token) ───────────── */}
        <Route element={<ProtectedRoute />}>

          {/* Dashboard — all authenticated users */}
          <Route
            path="/dashboard"
            element={
              <DashboardLayout>
                <Dashboard />
              </DashboardLayout>
            }
          />

          {/* Members — admin only (ProtectedRoute + page-level guard) */}
          <Route
            path="/members"
            element={
              <DashboardLayout>
                <Members />
              </DashboardLayout>
            }
          />

          {/* Rooms — admin only (sidebar hides it from users) */}
          <Route
            path="/rooms"
            element={
              <DashboardLayout>
                <Rooms />
              </DashboardLayout>
            }
          />

          {/* Requests — all authenticated users */}
          <Route
            path="/requests"
            element={
              <DashboardLayout>
                <Requests />
              </DashboardLayout>
            }
          />

          {/* Reports — admin only */}
          <Route
            path="/reports"
            element={
              <DashboardLayout>
                <Reports />
              </DashboardLayout>
            }
          />

          {/* ── PENDING RETURNS — was missing, causing redirect to /login ── */}
          <Route
            path="/pending-returns"
            element={
              <DashboardLayout>
                <PendingReturns />
              </DashboardLayout>
            }
          />

          {/* Settings — all authenticated users */}
          <Route
            path="/settings"
            element={
              <DashboardLayout>
                <Settings />
              </DashboardLayout>
            }
          />

          {/* Help & Support — all authenticated users */}
          <Route
            path="/help"
            element={
              <DashboardLayout>
                <HelpSupport />
              </DashboardLayout>
            }
          />

        </Route>

        {/* Fallback — unknown paths go to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </Router>
  );
};

export default App;