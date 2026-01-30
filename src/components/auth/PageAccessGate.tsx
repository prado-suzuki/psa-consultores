import { useNavigate } from 'react-router-dom';
import { usePageAccess } from '@/hooks/usePageAccess';
import { Button } from '@/components/ui/button';
import { ShieldX, ArrowLeft } from 'lucide-react';

interface PageAccessGateProps {
  pagePath: string;
  children: React.ReactNode;
  fallbackPath?: string;
}

/**
 * Component that verifies page-specific access and shows access denied screen if needed.
 * Wraps protected pages to enforce granular permissions from user_page_access table.
 */
export const PageAccessGate = ({ 
  pagePath, 
  children,
  fallbackPath = '/equipe/digital'
}: PageAccessGateProps) => {
  const { hasAccess, isLoading } = usePageAccess(pagePath);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
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
            onClick={() => navigate(fallbackPath)}
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
