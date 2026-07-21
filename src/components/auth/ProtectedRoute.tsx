import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { resolveLoginPath } from '@/lib/loginRedirect';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, mustChangePassword, loading } = useAuth();
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

  return <>{children}</>;
};
