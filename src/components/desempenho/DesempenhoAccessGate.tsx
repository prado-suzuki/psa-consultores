import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface DesempenhoAccessGateProps {
  children: React.ReactNode;
}

export const DesempenhoAccessGate = ({ children }: DesempenhoAccessGateProps) => {
  const { user, isAdmin, isLider, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/equipe" replace />;
  }

  if (!isAdmin && !isLider) {
    return <Navigate to="/equipe/digital" replace />;
  }

  return <>{children}</>;
};
