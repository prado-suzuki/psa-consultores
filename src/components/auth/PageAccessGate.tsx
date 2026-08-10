import { useNavigate, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { usePageAccess } from '@/hooks/usePageAccess';
import { resolveLoginPath } from '@/lib/loginRedirect';
import { homeDaArea } from '@/lib/homeDaArea';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft } from 'lucide-react';

interface PageAccessGateProps {
  pagePath: string;
  children: React.ReactNode;
  /**
   * Para onde o "Voltar" leva. Sem valor, vai para a home da área do endereço
   * atual — antes era fixo em `/equipe/digital`, então quem tomava negativa na
   * Tax era jogado para a Digital e caía num seletor vazio.
   */
  fallbackPath?: string;
}

/**
 * Component that verifies page-specific access and shows access denied screen if needed.
 * Wraps protected pages to enforce granular permissions from user_page_access table.
 */
export const PageAccessGate = ({
  pagePath,
  children,
  fallbackPath,
}: PageAccessGateProps) => {
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, isLoading } = usePageAccess(pagePath);
  const navigate = useNavigate();
  const location = useLocation();

  // Enquanto a autenticação está sendo resolvida, mantém o layout montado
  // (evita flash de "Acesso Negado" durante TOKEN_REFRESHED).
  if (authLoading) {
    return <>{children}</>;
  }

  // Sessão expirada ou inexistente: manda para o login correto da área
  // (rotas da equipe voltam para /equipe; as demais para /auth), em vez de
  // exibir "Acesso Negado".
  if (!user) {
    return <Navigate to={resolveLoginPath(location.pathname)} replace />;
  }

  if (isLoading) {
    return <>{children}</>;
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-6 max-w-md mx-auto px-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <ShieldX className="h-8 w-8 text-destructive" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Acesso Negado</h1>
            <p className="text-muted-foreground">
              Você não tem permissão para acessar esta página.
            </p>
            <p className="text-muted-foreground/70 text-sm">
              Entre em contato com um administrador para solicitar acesso.
            </p>
          </div>
          <Button
            onClick={() => navigate(fallbackPath ?? homeDaArea(location.pathname))}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
