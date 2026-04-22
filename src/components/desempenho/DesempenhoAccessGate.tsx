import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePageAccess } from '@/hooks/usePageAccess';

interface DesempenhoAccessGateProps {
  children: React.ReactNode;
}

export const DesempenhoAccessGate = ({ children }: DesempenhoAccessGateProps) => {
  const { user, loading } = useAuth();
  // Visibilidade resolvida via usePageAccess — admin libera no próprio hook,
  // demais papéis precisam de registro explícito em user_page_access.
  const { hasAccess, isLoading: accessLoading } = usePageAccess('/equipe/board/desempenho');

  if (loading || accessLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/equipe" replace />;
  }

  if (!hasAccess) {
    return <Navigate to="/equipe/digital" replace />;
  }

  return <>{children}</>;
};
