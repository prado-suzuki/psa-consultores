import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const TeamRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isTeamMember, isAdmin, loading } = useAuth();

  if (loading && !user) {
    return null;
  }

  if (!user) {
    return <Navigate to="/equipe" replace />;
  }

  if (!isTeamMember && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
