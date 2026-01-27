// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Layout & Pages
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';

const App: React.FC = () => {
  return (
    <Router>
      <DashboardLayout role="Admin">
        <Routes>
          {/* Redirect root "/" to Dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Main pages */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/rooms" element={<Rooms />} />

          {/* Optional: 404 fallback */}
          <Route path="*" element={
            <div style={{ padding: '4rem', textAlign: 'center' }}>
              <h2>Page not found</h2>
              <p>Return to <a href="/dashboard">Dashboard</a></p>
            </div>
          } />
        </Routes>
      </DashboardLayout>
    </Router>
  );
};

export default App;