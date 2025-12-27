import {useEffect} from 'react';
import {Navigate, useLocation} from 'react-router-dom';
import {useAuthStore} from '@/store/authStore';

interface RequireRoleProps {
  children: React.ReactNode;
  role: 'admin' | 'superadmin';
  allowedRoles?: ('admin' | 'superadmin')[];
}

export const RequireRole = ({children, role, allowedRoles}: RequireRoleProps) => {
  const {user} = useAuthStore();
  const location = useLocation();

  const userRole = user?.role;
  const isAllowed = allowedRoles
    ? allowedRoles.includes(userRole as 'admin' | 'superadmin')
    : userRole === role || userRole === 'superadmin';

  useEffect(() => {
    if (!isAllowed) {
      console.warn(`[RequireRole] Access denied: User role "${userRole}" does not have required role "${role}"`);
    }
  }, [isAllowed, userRole, role]);

  if (!user) {
    return <Navigate to="/login" state={{from: location}} replace />;
  }

  if (!isAllowed) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

