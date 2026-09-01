import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { 
  Building,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  ArrowLeft
} from 'lucide-react';
import { useSidebarRecolhimentoController } from '@/hooks/useSidebarRecolhimentoController';
import { SidebarCartaoUsuario } from '@/components/shared/SidebarCartaoUsuario';
import {
  classeLarguraBarra,
  classeRecuoCabecalho,
  larguraBarraCss,
} from '@/lib/sidebarMedidas';

interface FixosLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export const FixosLayout = ({ children, title, subtitle, headerActions }: FixosLayoutProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  // O recolhimento automático em telas de trabalho largo mora no hook — é a
  // tela que pede, com `useTelaDeTrabalhoLargo()`; o layout não conhece rotas.
  const { collapsed, setCollapsed } = useSidebarRecolhimentoController();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-muted flex w-full">
      {/* Sidebar */}
      <aside
        className={`${classeLarguraBarra(collapsed)} bg-white border-r border-border/60 flex flex-col transition-all duration-300 flex-shrink-0 sticky top-0 h-screen overflow-y-auto`}
      >
        {/* Header */}
        <div className={`${classeRecuoCabecalho(collapsed)} border-b border-border/60`}>
          {collapsed ? (
            <div className="flex justify-center">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Building className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-lg">Fixos</h2>
                <p className="text-xs text-slate-500">Área Fixos</p>
              </div>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 left-[calc(var(--sidebar-width)-12px)] z-10 h-6 w-6 rounded-full border border-border bg-white hover:bg-muted text-slate-600 shadow-sm"
          style={{ '--sidebar-width': larguraBarraCss(collapsed) } as React.CSSProperties}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

        {/* Navigation - Empty for now */}
        <nav className="p-4 space-y-1">
          {/* Navigation items will be added here later */}
        </nav>

        {/* Footer Actions */}
        <div className="mt-auto p-4 border-t border-border/60 space-y-2">
          {/* Cartão do usuário: padrão compartilhado, com o recolhido embutido. */}
          <SidebarCartaoUsuario area="fixos" collapsed={collapsed} />

          
          <Button 
            variant="ghost" 
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-muted hover:text-blue-600 transition-colors`}
            onClick={() => navigate('/equipe/projetos')}
            title={collapsed ? 'Trocar área' : undefined}
          >
            <ArrowLeft className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Trocar área'}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-muted hover:text-blue-600 transition-colors`}
            onClick={() => navigate('/')}
            title={collapsed ? 'Voltar ao site' : undefined}
          >
            <ArrowLeft className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Voltar ao site'}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors`}
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
        <header className="h-16 border-b border-border/60 bg-white flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-slate-600"
              onClick={() => setCollapsed(!collapsed)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{title}</h1>
              {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
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

export default FixosLayout;
