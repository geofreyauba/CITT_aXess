// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Layout & Pages
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Requests from './pages/Requests';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import HelpSupport from './pages/HelpSupport';

const App: React.FC = () => {
  return (
    <Router>
      <DashboardLayout role="Admin">
        <Routes>
          {/* Redirect root to Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Pages */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/rooms" element={<Rooms />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/help" element={<HelpSupport />} />

          {/* 404 fallback */}
          <Route path="*" element={
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <h2>Page not found</h2>
              <p>Go back to <a href="/dashboard">Dashboard</a></p>
            </div>
          } />
        </Routes>
      </DashboardLayout>
    </Router>
  );
};

export default App;