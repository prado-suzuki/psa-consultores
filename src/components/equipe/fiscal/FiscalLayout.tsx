import { Menu } from 'lucide-react';
import { FiscalSidebar } from './FiscalSidebar';
import { Button } from '@/components/ui/button';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import { useSidebarRecolhimentoController } from '@/hooks/useSidebarRecolhimentoController';
import { TourProvider } from '@/components/tour/TourProvider';
import TourTrigger from '@/components/tour/TourTrigger';
import { REGISTRO_TAX, resolverTourTax } from './tour/tours';
import { useLocation } from 'react-router-dom';

interface FiscalLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export const FiscalLayout = ({ children, title, subtitle, headerActions }: FiscalLayoutProps) => {
  // O recolhimento automático em telas de trabalho largo mora no hook — é a
  // tela que pede, com `useTelaDeTrabalhoLargo()`; o layout não conhece rotas.
  const { collapsed: isCollapsed, setCollapsed: setIsCollapsed } =
    useSidebarRecolhimentoController();
  const { pathname } = useLocation();
  const temGuia = resolverTourTax(pathname) !== null;

  // O tema da área NÃO é aplicado aqui: quem o aplica é o `AreaThemeProvider`,
  // a partir da rota, acima dos gates de acesso (ver `src/lib/areaTheme.ts`).
  // Fazer isso no layout deixava a tela sem tema enquanto o `LiderRoute`
  // carregava o papel do usuário — era de onde vinha o anel de foco lime em
  // /equipe/tax/gerencial/chamados.

  return (
    // O provider embrulha a área: o guia de cada tela abre por rota, e o "?" do
    // header precisa do contexto. A árvore abaixo fica sem reindentar de
    // propósito, para o diff mostrar o que mudou e não o arquivo inteiro.
    <TourProvider registro={REGISTRO_TAX}>
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

            {/* O "?" abre o guia da tela atual. Em rota sem guia ele não
                aparece: botão que não faz nada ensina a ignorar o botão. */}
            {temGuia && (
              <TourTrigger
                className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                dataTour="help"
              />
            )}

            <NotificationPopover
              navigateTo="/equipe/chamados"
              espelho="tax"
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
    </TourProvider>
  );
};

export default FiscalLayout;
