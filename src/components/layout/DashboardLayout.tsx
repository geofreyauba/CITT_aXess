// src/components/layout/DashboardLayout.tsx
import React, { ReactNode, useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface DashboardLayoutProps {
  children: ReactNode;
  role?: string;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, role = 'Admin' }) => {
  const [userName, setUserName] = useState('demo');
  const [userId, setUserId] = useState('REG-DEMO-001');
  const [membership, setMembership] = useState('No Membership');

  useEffect(() => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    setUserName(currentUser.name || 'demo');
    setUserId(currentUser.id || 'REG-DEMO-001');
    setMembership(currentUser.membership || 'No Membership');
  }, []);

  return (
    <div className="app">
      <Header role={role} userName={userName} userId={userId} membership={membership} />
      <div className="main-layout">
        <Sidebar role={role} />
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;