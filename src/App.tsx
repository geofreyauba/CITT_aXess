import React from 'react';
import './App.css';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';

const App: React.FC = () => {
  return (
    <DashboardLayout role="Admin">
      <Dashboard />
    </DashboardLayout>
  );
};

export default App;