import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const TeamRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isTeamMember, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/equipe" replace />;
  }

  if (!isTeamMember && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};
