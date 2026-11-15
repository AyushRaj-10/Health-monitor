import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LoadingState } from '../common/LoadingState';
import { UserRole } from '../../types/auth';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050B0A] flex items-center justify-center p-6">
        <LoadingState message="Verifying secure clinical credentials & session..." rows={3} />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 bg-healthcare-surface border border-rose-900/40 rounded-2xl text-center max-w-lg mx-auto mt-12">
        <div className="w-12 h-12 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-400 flex items-center justify-center mb-4">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-rose-200 mb-1">
          Access Restricted
        </h2>
        <p className="text-xs text-rose-300/80 mb-4 leading-relaxed">
          Your account role (<span className="font-mono font-semibold">{user.role}</span>) does not possess clinical clearance to access this module. Contact the Medical Informatics Administrator.
        </p>
      </div>
    );
  }

  return <Outlet />;
};
