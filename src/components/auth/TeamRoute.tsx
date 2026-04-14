import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const TeamRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isTeamMember, isAdmin, isLider, isSublider, mustChangePassword, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate to="/equipe" replace />;
  }

  if (mustChangePassword) {
    return <Navigate to="/primeiro-acesso" replace />;
  }

  if (!isTeamMember && !isAdmin && !isLider && !isSublider) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
