import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, mustChangePassword, loading } = useAuth();

  if (loading && !user) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/primeiro-acesso" replace />;
  }

  return <>{children}</>;
};
