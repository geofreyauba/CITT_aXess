// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Layout & Pages
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Rooms from './pages/Rooms';
import Requests from './pages/Requests';  // Make sure this import exists

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
          <Route path="/requests" element={<Requests />} />  {/* This is the important line */}

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