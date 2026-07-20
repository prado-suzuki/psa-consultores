import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { resolveLoginPath } from '@/lib/loginRedirect';

export const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, mustChangePassword, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    // Rotas da equipe voltam para o login da equipe; as demais, para o do cliente.
    return <Navigate to={resolveLoginPath(location.pathname)} replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/primeiro-acesso" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/cliente" replace />;
  }

  return <>{children}</>;
};
