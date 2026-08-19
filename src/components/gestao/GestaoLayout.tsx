import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import {
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  ArrowLeft,
  LayoutDashboard,
  Newspaper,
  Users,
} from 'lucide-react';
import { useSidebarRecolhimentoController } from '@/hooks/useSidebarRecolhimentoController';
import { SidebarCartaoUsuario } from '@/components/shared/SidebarCartaoUsuario';
import {
  classeLarguraBarra,
  classeRecuoCabecalho,
  larguraBarraCss,
} from '@/lib/sidebarMedidas';

interface GestaoLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

interface NavItem {
  icon: any;
  label: string;
  path: string;
}

export const GestaoLayout = ({ children, title, subtitle, headerActions }: GestaoLayoutProps) => {
  const { signOut, isAdmin, isLider } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // O recolhimento automático em telas de trabalho largo mora no hook — é a
  // tela que pede, com `useTelaDeTrabalhoLargo()`; o layout não conhece rotas.
  const { collapsed, setCollapsed } = useSidebarRecolhimentoController();

  // Chamados e o dashboard dele saíram daqui: passaram para o dropdown Gerencial
  // da Tax e da OSG, restritos a líder+. A área de Marketing fica com Novidades
  // e Contatos, que é o desenho acordado com a Patricia.
  const navItems: NavItem[] = [
    { icon: Newspaper, label: 'Novidades', path: '/gestao' },
    { icon: Users, label: 'Contatos', path: '/gestao/contatos' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-canvas flex w-full relative">
      {/* Toggle Button — fora do <aside> para não ser clipado pelo overflow da sidebar */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-6 left-[calc(var(--sidebar-width)-12px)] z-30 h-6 w-6 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground shadow-sm"
        style={{ '--sidebar-width': larguraBarraCss(collapsed) } as React.CSSProperties}
        onClick={() => setCollapsed(!collapsed)}
      >
        {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      {/* Sidebar */}
      <aside
        className={`${classeLarguraBarra(collapsed)} bg-card border-r border-border/60 flex flex-col transition-all duration-300 flex-shrink-0 sticky top-0 h-screen overflow-y-auto`}
      >
        {/* Header */}
        <div className={`${classeRecuoCabecalho(collapsed)} border-b border-border/60`}>
          {collapsed ? (
            <div className="flex justify-center">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <LayoutDashboard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground text-lg">Gestão</h2>
                <p className="text-xs text-muted-foreground">Painel de Controle</p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant="ghost"
              className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.path)
                  ? 'bg-primary/10 text-primary hover:bg-primary/15'
                  : 'text-foreground hover:bg-muted hover:text-primary'
              }`}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
              {!collapsed && item.label}
            </Button>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="mt-auto p-4 border-t border-border/60 space-y-2">
          {/* Cartão do usuário: padrão compartilhado, com o recolhido embutido. */}
          <SidebarCartaoUsuario area="gestao" collapsed={collapsed} />

          <Button
            variant="ghost"
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-primary transition-colors`}
            onClick={() => navigate('/equipe')}
            title={collapsed ? 'Trocar área' : undefined}
          >
            <ArrowLeft className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Trocar área'}
          </Button>
          <Button
            variant="ghost"
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors`}
            onClick={handleSignOut}
            title={collapsed ? 'Sair' : undefined}
          >
            <LogOut className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Sair'}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-border/60 bg-card flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-muted-foreground"
              onClick={() => setCollapsed(!collapsed)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            </div>
          </div>
          {/* O atalho de chamados e a faixa de pendentes saíram junto com a tela:
              esta área não trata mais chamado, e apontar para a Gerencial da Tax
              levaria quem é do Marketing a uma porta que não abre para ele. */}
          <div className="flex items-center gap-3">
            <NotificationPopover navigateTo="/gestao" />
            {headerActions}
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default GestaoLayout;
