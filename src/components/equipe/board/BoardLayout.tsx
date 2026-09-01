import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  ArrowLeft,
  BarChart3,
  Users2,
  Menu,
  ChevronRight,
  ChevronLeft,
  MapPin,
  Shield,
  LogOut,
  type LucideIcon,
} from 'lucide-react';
import { usePageAccess } from '@/hooks/usePageAccess';
import { useSidebarRecolhimentoController } from '@/hooks/useSidebarRecolhimentoController';
import { AgenteNotificacaoPopup } from '@/components/agente/AgenteNotificacaoPopup';
import { BoardToolbar } from '@/components/board/BoardToolbar';

interface BoardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  headerActions?: React.ReactNode;
  noPadding?: boolean;
}

interface NavItem {
  icon: LucideIcon;
  label: string;
  path: string;
  children?: { icon: LucideIcon; label: string; path: string; badge?: number }[];
  adminOnly?: boolean;
  badge?: number | 'amber';
}

interface BoardNavAccess {
  usoEnvio: boolean;
  logsEquipe: boolean;
}

const buildNavItems = (acesso: BoardNavAccess): NavItem[] => [
  { icon: LayoutDashboard, label: 'Estratégico', path: '/equipe/board/dashboard' },
  ...(acesso.usoEnvio ? [
    { icon: BarChart3, label: 'Ferramentas', path: '/equipe/board/uso-envio' } as NavItem,
  ] : []),
  { icon: Users2, label: 'Projetos', path: '/equipe/board/dashboard-clientes-os' },
  { icon: MapPin, label: 'Clientes', path: '/equipe/board/clientes' },
  // REMOVIDOS DO MENU (reuniões 17/08 e 28/08). Rotas ficam ativas de propósito
  // — link interno / bookmark não quebra. Não reabrir item sem a diretoria pedir.
  // Capacidade = réplica do dashboard de área. Desempenho e Minha Evolução = RH.
  ...(acesso.logsEquipe ? [
    { icon: Shield, label: 'Logs', path: '/equipe/board/logs-equipe', adminOnly: true } as NavItem,
  ] : []),
];

/**
 * O shell da área Board.
 *
 * ── Por que o chrome ficou CLARO ──────────────────────────────────────
 * A barra lateral era azul-noite (#0C1222) com acento índigo — a cara de
 * ferramenta de analytics genérica, e a única superfície escura do sistema
 * inteiro (Tax e OSG têm barra clara). Três consequências concretas:
 *
 * · o Board parecia outro produto, não outra área do mesmo produto;
 * · o azul-noite fixava a paleta: com ele na tela, qualquer acento quente ou
 *   teal ao lado lia como enfeite;
 * · módulos compartilhados (Capacidade monta o `AreaDashboardContent`, que é o
 *   mesmo do Tax e da OSG) entravam com chrome escuro em cima de conteúdo
 *   claro, e o contraste entre os dois roubava a atenção do dado.
 *
 * Agora a barra é branca, o item ativo é uma PÍLULA cheia no teal escuro
 * (`--bd-accent-d`, 6,7:1 com o texto branco em cima — o teal cheio da marca
 * daria 4,40:1 e não serve para carregar letra), e a hierarquia do menu vem do
 * peso e do espaçamento, como na referência.
 *
 * ── O usuário subiu para o topo ───────────────────────────────────────
 * Só o nome de acesso e as iniciais ficam no topbar — título e filtros
 * moram na toolbar do conteúdo, à direita do título da tela.
 */
export const BoardLayout = ({ children, title, subtitle, headerActions, noPadding }: BoardLayoutProps) => {
  const { user, isAdmin, isLider, signOut } = useAuth();
  const { hasAccess: canUsoEnvio } = usePageAccess('/equipe/board/uso-envio');
  const { hasAccess: canLogsEquipe } = usePageAccess('/equipe/board/logs-equipe');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // `title` nomeia a aba do navegador — as 13 telas do Board já passavam este
  // texto, que antes era ignorado (prop declarada e nunca usada).
  useEffect(() => {
    if (!title) return;
    const anterior = document.title;
    document.title = `${title} · PSA Board`;
    return () => { document.title = anterior; };
  }, [title]);
  const [mobileOpen, setMobileOpen] = useState(false);
  // A persistência entre sessões continua, agora dentro do hook: só a escolha
  // manual é gravada. O recolhimento automático de uma tela larga é daquela
  // tela — gravá-lo deixaria a barra estreita em todo o Board para sempre.
  const { collapsed, setCollapsed } = useSidebarRecolhimentoController({
    persistKey: 'board-sidebar-collapsed',
  });

  const podeGerencial = isAdmin || isLider;

  const navItems = buildNavItems({
    usoEnvio: canUsoEnvio === true,
    logsEquipe: canLogsEquipe === true && podeGerencial,
  });
  const showGestaoTime = navItems.some(item => item.adminOnly);

  const isActive = (path: string) =>
    location.pathname === path || location.pathname.startsWith(path + '/');

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Usuario';
  const lastName = user?.user_metadata?.last_name || '';
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'U';
  const role = isAdmin ? 'Admin' : isLider ? 'Lider' : 'Membro';

  /** Uma linha do menu. Ativo = pílula cheia; inativo = texto + hover suave. */
  const navBtnStyle = (ativo: boolean, recolhido: boolean): React.CSSProperties => ({
    backgroundColor: ativo ? 'var(--bd-chrome-active)' : 'transparent',
    color: ativo ? '#FFFFFF' : 'var(--bd-ink2)',
    fontWeight: ativo ? 600 : 500,
    justifyContent: recolhido ? 'center' : undefined,
  });

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div
      className="flex flex-col h-full relative overflow-hidden"
      style={{ backgroundColor: 'var(--bd-chrome)', borderRight: '1px solid var(--bd-chrome-line)' }}
    >
      {/* Lavagem de acento no pé da barra — o mesmo truque do gradiente radial
          de antes, agora em teal e quase imperceptível: dá profundidade sem
          virar cor de fundo. */}
      <div
        className="absolute bottom-[-80px] left-[-50px] w-[220px] h-[220px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, hsl(175 82% 29% / .07) 0%, transparent 70%)' }}
      />

      {/* Marca */}
      <div className="px-4 pt-5 pb-4" style={{ borderBottom: '1px solid var(--bd-chrome-line)' }}>
        <button
          onClick={() => { navigate('/equipe/board/dashboard'); setMobileOpen(false); }}
          className={`flex items-center gap-2.5 w-full ${collapsed ? 'justify-center' : ''}`}
          title="Estratégico"
        >
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: 'var(--bd-accent-d)' }}
          >
            <LayoutDashboard className="h-[15px] w-[15px] text-white" />
          </div>
          {!collapsed && (
            <span
              className="text-[15.5px] font-bold tracking-[-0.02em]"
              style={{ fontFamily: "'Instrument Sans', sans-serif", color: 'var(--bd-ink)' }}
            >
              PSA Board
            </span>
          )}
        </button>
      </div>

      {/* Navegação */}
      <ScrollArea className="flex-1 px-3 py-4">
        {/* DIRETORIA */}
        <div className="mb-5">
          {!collapsed && (
            <p className="px-2.5 mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em]" style={{ color: 'var(--bd-ink4)' }}>
              Diretoria
            </p>
          )}
          {navItems.filter(i => !i.adminOnly).map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              className="w-full flex items-center gap-2.5 rounded-[10px] text-[13px] transition-all duration-150 relative mb-0.5 px-2.5 py-2"
              style={navBtnStyle(isActive(item.path), collapsed)}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-[15px] w-[15px] flex-shrink-0" style={{ opacity: isActive(item.path) ? 1 : 0.7 }} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>

        {/* GESTÃO DE TIME group — nome escolhido para não repetir o "Gerencial"
            que existe nas áreas Tax e OSG (/equipe/tax/gerencial, /equipe/osg/gerencial). */}
        {showGestaoTime && (
          <div className="mb-5">
            {!collapsed && (
              <p className="px-2.5 mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em]" style={{ color: 'var(--bd-ink4)' }}>
                Gestão de Time
              </p>
            )}
            {navItems.filter(i => i.adminOnly).map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                className="w-full flex items-center gap-2.5 rounded-[10px] text-[13px] transition-all duration-150 relative mb-0.5 px-2.5 py-2"
                style={navBtnStyle(isActive(item.path), collapsed)}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className="h-[15px] w-[15px] flex-shrink-0" style={{ opacity: isActive(item.path) ? 1 : 0.7 }} />
                {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
              </button>
            ))}
          </div>
        )}

      </ScrollArea>

      {/* Rodapé */}
      <div className="px-3 pb-3.5 pt-3.5 space-y-1" style={{ borderTop: '1px solid var(--bd-chrome-line)' }}>
        <button
          onClick={() => navigate('/equipe/')}
          className="w-full flex items-center gap-2 rounded-[10px] text-[12.5px] transition-colors duration-150 px-2.5 py-2"
          style={{ color: 'var(--bd-ink3)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bd-chrome-hover)'; (e.currentTarget as HTMLElement).style.color = 'var(--bd-ink)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--bd-ink3)'; }}
          title={collapsed ? 'Voltar ao Portal' : undefined}
        >
          <ArrowLeft className="h-[14px] w-[14px] flex-shrink-0" />
          {!collapsed && <span>Voltar ao Portal</span>}
        </button>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 rounded-[10px] text-[12.5px] transition-colors duration-150 px-2.5 py-2"
          style={{ color: 'var(--bd-ink3)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bd-risk-t)'; (e.currentTarget as HTMLElement).style.color = 'var(--bd-risk-d)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--bd-ink3)'; }}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut className="h-[14px] w-[14px] flex-shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="bd-leitura min-h-screen flex w-full" style={{ backgroundColor: 'var(--bd-page)' }}>
      {/* Desktop/Tablet sidebar (md+) */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 fixed top-0 left-0 h-screen z-30 transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-[240px]'}`}
      >
        <SidebarContent collapsed={collapsed} />
        {/* Toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute top-[22px] -right-3 z-40 w-6 h-6 rounded-full flex items-center justify-center border transition-colors"
          style={{
            backgroundColor: 'var(--bd-surface)',
            borderColor: 'var(--bd-line)',
            color: 'var(--bd-ink3)',
            boxShadow: 'var(--bd-sh)',
          }}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </aside>

      {/* Mobile sidebar (drawer) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[264px] border-0" style={{ backgroundColor: 'var(--bd-chrome)' }}>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden ml-0 transition-all duration-300 ${collapsed ? 'md:ml-[68px]' : 'md:ml-[240px]'}`}>
        {/* Topbar — 56px */}
        <header
          className="bd-masthead flex items-center justify-end px-4 md:px-6 gap-3 flex-shrink-0"
          style={{ backgroundColor: 'var(--bd-chrome)', borderBottom: '1px solid var(--bd-chrome-line)' }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden mr-auto"
            onClick={() => setMobileOpen(true)}
            style={{ color: 'var(--bd-ink3)' }}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex items-center gap-2.5 py-2">
            <p className="text-[12.5px] font-semibold leading-none" style={{ color: 'var(--bd-ink)' }}>
              {firstName}{lastName ? ` ${lastName}` : ''}
            </p>
            <div className="v4-av v4-av-sm" title={role}>{initials}</div>
          </div>
        </header>

        {/* Scrollable content — o recorte de cluster mora à direita do título
            de cada tela, não numa faixa própria entre o topbar e o conteúdo. */}
        <div className="flex-1 overflow-y-auto">
          <div className={`${noPadding ? '' : 'px-4 pt-3 pb-8 md:px-6 md:pt-3 lg:px-8'}`} style={{ fontFamily: "'Instrument Sans', sans-serif" }}>
            <BoardToolbar title={title} meta={subtitle}>
              {headerActions}
            </BoardToolbar>
            {children}
          </div>
        </div>

        {/* Pop-up de análise estratégica / insight crítico. Fora do contêiner
            que rola, para não subir com o conteúdo; estilo próprio, inline. */}
        <AgenteNotificacaoPopup />
      </main>
    </div>
  );
};

export default BoardLayout;
