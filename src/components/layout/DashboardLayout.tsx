// src/components/layout/DashboardLayout.tsx
import React, { ReactNode, useEffect, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

interface DashboardLayoutProps {
  children: ReactNode;
  role?: string; // optional explicit override — almost never needed now
}

// ─────────────────────────────────────────────────────────────────────────────
// DashboardLayout reads the logged-in user's real role from localStorage.
// The `role` prop is kept for backwards compatibility but is only used if
// no user is found in localStorage (which should never happen in practice).
//
// This fixes the "Admin" badge showing for Innovators / Users:
//   Before: every route passed role="Admin" → everyone saw "Admin"
//   After:  role comes from localStorage → each user sees their real role
// ─────────────────────────────────────────────────────────────────────────────
const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, role: roleProp }) => {
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    // Always read the real role from localStorage first
    try {
      const stored = localStorage.getItem('currentUser');
      if (stored) {
        const u = JSON.parse(stored);
        setRole(u.role || roleProp || 'user');
        return;
      }
    } catch {}

    // Fall back to the prop (or 'user') if localStorage is unavailable
    setRole(roleProp || 'user');
  }, [roleProp]);

  // Hold rendering until the role is resolved — prevents a flash of the
  // wrong badge colour / label on first load
  if (role === null) return null;

  return (
    <div className="app">
      <Header role={role} />
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