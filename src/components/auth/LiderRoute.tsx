import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { resolveLoginPath } from '@/lib/loginRedirect';

interface LiderRouteProps {
  children: React.ReactNode;
  /** Para onde volta quem não é líder+. Use a home da área da rota guardada. */
  fallbackPath?: string;
}

/**
 * Guarda de rota para áreas gerenciais: libera apenas líder ou admin.
 *
 * Atenção: no AuthContext o `isLider` é ESTRITO (não engloba admin), por isso o
 * OR explícito com `isAdmin`. Quem está logado mas não é líder+ volta para a
 * home da área em vez do login (não é falta de sessão, é falta de papel).
 */
export const LiderRoute = ({ children, fallbackPath = '/equipe/tax' }: LiderRouteProps) => {
  const { user, isAdmin, isLider, mustChangePassword, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to={resolveLoginPath(location.pathname)} replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/primeiro-acesso" replace />;
  }

  if (!(isAdmin || isLider)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};

export default LiderRoute;
