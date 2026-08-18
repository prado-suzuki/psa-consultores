import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { FiscalSidebar } from './FiscalSidebar';
import { Button } from '@/components/ui/button';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';

interface FiscalLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export const FiscalLayout = ({ children, title, subtitle, headerActions }: FiscalLayoutProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Enquanto a área Tax está montada, marca o <html> com o tema dela — mesmo
  // mecanismo do OsgLayout, para alcançar menus e modais em portal (body).
  // Sem isso a Tax herdaria a paleta base do sistema em vez de declarar a sua.
  useEffect(() => {
    document.documentElement.classList.add('tax-theme');
    return () => document.documentElement.classList.remove('tax-theme');
  }, []);

  return (
    <div className="min-h-screen bg-muted flex w-full">
      {/* Sidebar */}
      <FiscalSidebar isCollapsed={isCollapsed} onToggle={() => setIsCollapsed(!isCollapsed)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header — altura, tipografia e conteúdo espelhados do OSG Projects. O
            usuário mora no rodapé da barra da esquerda; aqui ficam só o título
            da página e as ações. */}
        <header className="h-16 border-b border-border/60 bg-card flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {headerActions}

            <NotificationPopover
              navigateTo="/equipe/chamados"
              tasksNavigateTo="/equipe/tax/projetos/tarefas"
            />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default FiscalLayout;
