import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Public pages
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';

// Protected pages + layout
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Requests from './pages/Requests';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import HelpSupport from './pages/HelpSupport';
import Members from './pages/Members';

// Guard
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected routes with role control */}
        <Route element={<ProtectedRoute />}>
          {/* Admin only */}
          <Route
            path="/dashboard"
            element={
              <DashboardLayout role="Admin">
                <Dashboard />
              </DashboardLayout>
            }
          />
          <Route
            path="/members"
            element={
              <DashboardLayout role="Admin">
                <Members />
              </DashboardLayout>
            }
          />

          {/* User + Admin */}
          <Route
            path="/rooms"
            element={
              <DashboardLayout role="Admin">
                <Rooms />
              </DashboardLayout>
            }
          />
          <Route
            path="/requests"
            element={
              <DashboardLayout role="Admin">
                <Requests />
              </DashboardLayout>
            }
          />
          <Route
            path="/reports"
            element={
              <DashboardLayout role="Admin">
                <Reports />
              </DashboardLayout>
            }
          />

          {/* Common */}
          <Route
            path="/settings"
            element={
              <DashboardLayout role="Admin">
                <Settings />
              </DashboardLayout>
            }
          />
          <Route
            path="/help"
            element={
              <DashboardLayout role="Admin">
                <HelpSupport />
              </DashboardLayout>
            }
          />

          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;