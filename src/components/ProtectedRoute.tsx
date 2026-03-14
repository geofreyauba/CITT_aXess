// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  requireAdmin?: boolean;
}

// Routes that the guard role is NOT allowed to access
const GUARD_BLOCKED_ROUTES = ['/members', '/rooms'];

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requireAdmin = false }) => {
  const location = useLocation();

  const token   = localStorage.getItem('authToken');
  const userStr = localStorage.getItem('currentUser');

  if (!token || !userStr) {
    return <Navigate to="/login" replace />;
  }

  let user: any;
  try {
    user = JSON.parse(userStr);
  } catch {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    return <Navigate to="/login" replace />;
  }

  // ── Pending account ────────────────────────────────────────────────────────
  if (user.verificationStatus === 'pending') {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '100px auto',
        background: '#fef3c7',
        borderRadius: '12px',
        border: '1px solid #f59e0b',
      }}>
        <h2 style={{ color: '#92400e', marginBottom: '16px' }}>⏳ Account Pending Approval</h2>
        <p style={{ color: '#92400e', lineHeight: '1.6' }}>
          Your account is awaiting admin approval. You'll be able to access the system once approved.
        </p>
        <button
          onClick={() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = '/login';
          }}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  // ── Rejected account ───────────────────────────────────────────────────────
  if (user.verificationStatus === 'rejected') {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '100px auto',
        background: '#fee2e2',
        borderRadius: '12px',
        border: '1px solid #ef4444',
      }}>
        <h2 style={{ color: '#b91c1c', marginBottom: '16px' }}>❌ Account Rejected</h2>
        <p style={{ color: '#b91c1c', lineHeight: '1.6' }}>
          Your account application was not approved. Please contact the administrator for more information.
        </p>
        <button
          onClick={() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('currentUser');
            window.location.href = '/login';
          }}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  // ── Admin-only routes ──────────────────────────────────────────────────────
  if (requireAdmin && user.role !== 'admin') {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '100px auto',
        background: '#fee2e2',
        borderRadius: '12px',
        border: '1px solid #ef4444',
      }}>
        <h2 style={{ color: '#b91c1c', marginBottom: '16px' }}>🚫 Access Denied</h2>
        <p style={{ color: '#b91c1c', lineHeight: '1.6', marginBottom: '8px' }}>
          You don't have permission to access this page.
        </p>
        <p style={{ color: '#b91c1c', lineHeight: '1.6' }}>
          This area is restricted to administrators only.
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  // ── Guard blocked routes (/members, /rooms) ────────────────────────────────
  if (user.role === 'guard' && GUARD_BLOCKED_ROUTES.includes(location.pathname)) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        maxWidth: '600px',
        margin: '100px auto',
        background: '#fff7ed',
        borderRadius: '12px',
        border: '1px solid #f97316',
      }}>
        <h2 style={{ color: '#c2410c', marginBottom: '16px' }}>🔒 Restricted Area</h2>
        <p style={{ color: '#c2410c', lineHeight: '1.6' }}>
          This section is not available for your role. Please contact an administrator if you need access.
        </p>
        <button
          onClick={() => window.history.back()}
          style={{
            marginTop: '20px',
            padding: '10px 20px',
            background: '#6366f1',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  // ── All checks passed ──────────────────────────────────────────────────────
  return <Outlet />;
};

export default ProtectedRoute;