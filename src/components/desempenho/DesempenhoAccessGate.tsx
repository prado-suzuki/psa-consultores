import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePageAccess } from '@/hooks/usePageAccess';

const RAIZ_DESEMPENHO = '/equipe/board/desempenho';

interface DesempenhoAccessGateProps {
  children: React.ReactNode;
}

/**
 * Visibilidade das telas de Desempenho.
 *
 * Antes checava SÓ `/equipe/board/desempenho`, então as 9 sub-páginas
 * registradas em `protectedPages.ts` eram decorativas: não havia como liberar
 * "Feedbacks" sem liberar o módulo inteiro.
 *
 * Agora vale o acesso à PÁGINA ATUAL **ou** à raiz do módulo:
 * - quem tem a raiz continua vendo tudo (nada muda para os acessos atuais);
 * - quem recebe só uma sub-página passa a entrar apenas nela.
 *
 * Admin é liberado dentro do próprio `usePageAccess`.
 */
export const DesempenhoAccessGate = ({ children }: DesempenhoAccessGateProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  const paginaAtual = usePageAccess(location.pathname);
  const raiz = usePageAccess(RAIZ_DESEMPENHO);

  const accessLoading = paginaAtual.isLoading || raiz.isLoading;
  const hasAccess = paginaAtual.hasAccess || raiz.hasAccess;

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

  // Sem acesso: volta para a porta de entrada do próprio Board (o destino
  // anterior era /equipe/digital, área que o usuário pode nem ter).
  if (!hasAccess) {
    return <Navigate to="/equipe/board/dashboard" replace />;
  }

  return <>{children}</>;
};
