import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, mustChangePassword, loading } = useAuth();

  if (loading && !user) {
    return null;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/primeiro-acesso" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/cliente" replace />;
  }

  return <>{children}</>;
};
