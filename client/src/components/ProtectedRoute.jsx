import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading, maintenanceMode, isAdmin } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F6F0] text-[#5A6354]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#5E734F] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-widest uppercase">Verifying Edge Credentials...</span>
        </div>
      </div>
    );
  }

  // If maintenance mode is on and user is not admin, redirect to maintenance screen
  if (maintenanceMode && !isAdmin && location.pathname !== '/maintenance') {
    return <Navigate to="/maintenance" replace />;
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If role is not allowed
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    // If admin is in wrong place, redirect to /admin, else /portal
    return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/portal'} replace />;
  }

  return children;
};
