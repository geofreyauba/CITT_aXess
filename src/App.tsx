import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Public pages
import Login from './pages/Login';
import Register from './pages/Register';

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

        {/* Protected routes: wrap each page inside DashboardLayout so layout is not shown on public pages */}
        <Route element={<ProtectedRoute />}>
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

          {/* root of protected area goes to dashboard */}
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
};

export default App;