import React from 'react';
import { Navigate } from 'react-router-dom';

import type { ReactNode } from 'react';
import { useAuth } from '@/auth/context/auth-context';

interface ProtectedRouteProps {
  roles?: string[];
  children: ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ roles = [], children }) => {
  // const { currentUser } = useAuthS();
  const { user } = useAuth();

  // Redirect to login if the user is not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Redirect to "403 Forbidden" if the user's role is not allowed
  if (roles.length > 0 && !roles.includes(user.role || '')) {
    return <Navigate to="/error/403" replace />;
  }

  // Render the child component if all checks pass
  return children;
};

export default ProtectedRoute;
