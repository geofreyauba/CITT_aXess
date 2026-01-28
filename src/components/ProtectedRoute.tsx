import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';

function isAuthenticated() {
  // Use whatever client-side check you want; here we check authToken in localStorage.
  try {
    return !!localStorage.getItem('authToken');
  } catch {
    return false;
  }
}

const ProtectedRoute: React.FC = () => {
  if (isAuthenticated()) return <Outlet />; // continue to nested routes
  return <Navigate to="/login" replace />;
};

export default ProtectedRoute;