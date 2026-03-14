// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// ── Public / guest pages ──────────────────────────────────────────────────────
import Login         from './pages/Login';
import Register      from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Splash        from './pages/Splash';
import Home          from './pages/Home';
import Clubs         from './pages/Clubs';
import Contact       from './pages/Contact';

// ── Protected pages ───────────────────────────────────────────────────────────
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard       from './pages/Dashboard';
import Rooms           from './pages/Rooms';
import Requests        from './pages/Requests';
import Reports         from './pages/Reports';
import Settings        from './pages/Settings';
import HelpSupport     from './pages/HelpSupport';
import Members         from './pages/Members';
import PendingReturns  from './pages/PendingReturns';

import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>

        {/* ── Entry point ─────────────────────────────────────────────────── */}
        <Route path="/" element={<Splash />} />

        {/* ── Guest pages ──────────────────────────────────────────────────── */}
        <Route path="/home"    element={<Home />} />
        <Route path="/clubs"   element={<Clubs />} />
        <Route path="/contact" element={<Contact />} />

        {/* ── Auth pages ───────────────────────────────────────────────────── */}
        <Route path="/login"          element={<Login />} />
        <Route path="/register"       element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ── Protected — all logged-in roles ──────────────────────────────── */}
        <Route element={<ProtectedRoute />}>

          <Route path="/dashboard"
            element={<DashboardLayout><Dashboard /></DashboardLayout>} />

          <Route path="/requests"
            element={<DashboardLayout><Requests /></DashboardLayout>} />

          <Route path="/reports"
            element={<DashboardLayout><Reports /></DashboardLayout>} />

          <Route path="/pending-returns"
            element={<DashboardLayout><PendingReturns /></DashboardLayout>} />

          <Route path="/settings"
            element={<DashboardLayout><Settings /></DashboardLayout>} />

          <Route path="/help"
            element={<DashboardLayout><HelpSupport /></DashboardLayout>} />

        </Route>

        {/* ── Admin-only routes (guard is blocked by ProtectedRoute) ────────── */}
        <Route element={<ProtectedRoute requireAdmin />}>

          <Route path="/members"
            element={<DashboardLayout><Members /></DashboardLayout>} />

          <Route path="/rooms"
            element={<DashboardLayout><Rooms /></DashboardLayout>} />

        </Route>

        {/* ── Fallback ─────────────────────────────────────────────────────── */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </Router>
  );
};

export default App;