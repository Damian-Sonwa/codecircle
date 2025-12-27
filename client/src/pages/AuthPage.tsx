import {type ReactNode} from 'react';
import {useAuthStore} from '@/store/authStore';
import {Navigate} from 'react-router-dom';

interface Props {
  component: ReactNode;
}

export const AuthPage = ({component}: Props) => {
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);

  // If user is already authenticated, redirect to dashboard
  if (user && accessToken) {
    const redirectPath = (user.role === 'admin' || user.role === 'superadmin') ? '/admin' : '/dashboard';
    return <Navigate to={redirectPath} replace />;
  }

  return <>{component}</>;
};

