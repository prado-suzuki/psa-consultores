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
  Target,
  CalendarRange,
  Crosshair,
  MessageSquareHeart,
  Users2,
  TrendingUp,
  Menu,
  Eye,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  FileText,
  MapPin,
  Shield,
  User,
  LogOut,
} from 'lucide-react';
import { useDomainBoardLayout } from '@/hooks/useDomainBoardLayout';
import { usePageAccess } from '@/hooks/usePageAccess';
import { useSidebarRecolhimentoController } from '@/hooks/useSidebarRecolhimentoController';
import { BoardClusterBar, honraClusterGlobal } from '@/components/equipe/board/BoardClusterBar';
import { AgenteNotificacaoPopup } from '@/components/agente/AgenteNotificacaoPopup';

interface BoardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  noPadding?: boolean;
}

interface NavItem {
  icon: any;
  label: string;
  path: string;
  children?: { icon: any; label: string; path: string; badge?: number }[];
  adminOnly?: boolean;
  badge?: number | 'amber';
}

const buildDesempenhoSubItems = (pendingDecisions: number) => [
  { icon: Eye, label: 'Visao Geral', path: '/equipe/board/desempenho' },
  { icon: CalendarRange, label: 'Ciclos', path: '/equipe/board/desempenho/ciclos' },
  { icon: Crosshair, label: 'Metas e PPR', path: '/equipe/board/desempenho/metas' },
  { icon: CheckCircle, label: 'Decisoes', path: '/equipe/board/desempenho/decisoes', badge: pendingDecisions },
  { icon: FileText, label: 'Relatorios', path: '/equipe/board/desempenho/relatorios' },
  { icon: TrendingUp, label: 'Evolucao', path: '/equipe/board/desempenho/evolucao' },
  { icon: MessageSquareHeart, label: 'Feedbacks', path: '/equipe/board/desempenho/feedbacks' },
  { icon: Users2, label: '1:1s', path: '/equipe/board/desempenho/1a1' },
];

interface BoardNavAccess {
  performance: boolean;
  desempenho: boolean;
  usoEnvio: boolean;
  chamados: boolean;
  capacidade: boolean;
  logsEquipe: boolean;
}

const buildNavItems = (
  acesso: BoardNavAccess,
  pendingDecisions: number,
): NavItem[] => [
  { icon: LayoutDashboard, label: 'Estratégico', path: '/equipe/board/dashboard' },
  // REMOVIDO DA DIRETORIA (reunião 17/08): os relatórios do Looker Studio saem
  // do board. Rota desativada em App.tsx, arquivo intacto.
  // { icon: FileBarChart, label: 'Dashboards', path: '/equipe/board/relatorios' },
  ...(acesso.usoEnvio ? [
    { icon: BarChart3, label: 'Ferramentas', path: '/equipe/board/uso-envio' } as NavItem,
  ] : []),
  { icon: Users2, label: 'Projetos', path: '/equipe/board/dashboard-clientes-os' },
  { icon: MapPin, label: 'Clientes', path: '/equipe/board/clientes' },
  // REMOVIDO DA DIRETORIA (reunião 17/08): volta depois como recorte estratégico
  // dentro de Clientes. Rota desativada em App.tsx, arquivo intacto.
  // ...(acesso.chamados ? [
  //   { icon: MessageSquareHeart, label: 'Chamados', path: '/equipe/board/chamados/dashboard' } as NavItem,
  // ] : []),
  // REMOVIDO DE GESTÃO DE TIME (reunião 17/08): saiu do menu, mas a ROTA em
  // App.tsx continua ATIVA de propósito -- "Áreas em um olhar" e
  // "Acompanhamento de execução" no Estratégico, e um card da faixa de KPIs,
  // navegam para /equipe/board/performance como detalhe. Desativar a rota
  // também quebraria esses três links.
  // ...(acesso.performance ? [
  //   { icon: BarChart3, label: 'Operacional', path: '/equipe/board/performance', adminOnly: true } as NavItem,
  // ] : []),
  ...(acesso.capacidade ? [
    // Carga do time e prazos — o dashboard de área do Tax e da OSG, somado.
    { icon: Users2, label: 'Capacidade', path: '/equipe/board/capacidade', adminOnly: true } as NavItem,
  ] : []),
  ...(acesso.desempenho ? [
    { icon: Target, label: 'Desempenho', path: '/equipe/board/desempenho', adminOnly: true, children: buildDesempenhoSubItems(pendingDecisions) } as NavItem,
  ] : []),
  ...(acesso.logsEquipe ? [
    { icon: Shield, label: 'Logs', path: '/equipe/board/logs-equipe', adminOnly: true } as NavItem,
  ] : []),
];

const getBreadcrumb = (pathname: string) => {
  const segments: { label: string; path: string }[] = [{ label: 'Board', path: '/equipe/board' }];
  if (pathname.includes('/performance')) {
    segments.push({ label: 'Operacional', path: '/equipe/board/performance' });
  } else if (pathname.includes('/desempenho')) {
    segments.push({ label: 'Desempenho', path: '/equipe/board/desempenho' });
    if (pathname.includes('/ciclos')) segments.push({ label: 'Ciclos', path: '/equipe/board/desempenho/ciclos' });
    else if (pathname.includes('/metas')) segments.push({ label: 'Metas e PPR', path: '/equipe/board/desempenho/metas' });
    else if (pathname.includes('/decisoes')) segments.push({ label: 'Decisoes', path: '/equipe/board/desempenho/decisoes' });
    else if (pathname.includes('/relatorios')) segments.push({ label: 'Relatorios', path: '/equipe/board/desempenho/relatorios' });
    else if (pathname.includes('/feedbacks')) segments.push({ label: 'Feedbacks', path: '/equipe/board/desempenho/feedbacks' });
    else if (pathname.includes('/1a1')) segments.push({ label: '1:1s', path: '/equipe/board/desempenho/1a1' });
    else if (pathname.includes('/minha-evolucao')) segments.push({ label: 'Minha Evolução', path: '/equipe/board/desempenho/minha-evolucao' });
    else if (pathname.includes('/evolucao')) segments.push({ label: 'Evolucao', path: '/equipe/board/desempenho/evolucao' });
  } else if (pathname.includes('/chamados')) {
    // Antes do teste de '/dashboard': `/chamados/dashboard` cairia no ramo do
    // Estratégico e o breadcrumb mentiria.
    segments.push({ label: 'Chamados', path: '/equipe/board/chamados' });
    if (pathname.endsWith('/dashboard')) segments.push({ label: 'Dashboard', path: '/equipe/board/chamados/dashboard' });
    else if (!pathname.endsWith('/chamados')) segments.push({ label: 'Detalhe', path: pathname });
  } else if (pathname.includes('/capacidade')) {
    segments.push({ label: 'Capacidade', path: '/equipe/board/capacidade' });
  } else if (pathname.includes('/logs-equipe')) {
    segments.push({ label: 'Logs', path: '/equipe/board/logs-equipe' });
  } else if (pathname.includes('/uso-envio')) {
    segments.push({ label: 'Ferramentas', path: '/equipe/board/uso-envio' });
  } else if (pathname.includes('/relatorios')) {
    segments.push({ label: 'Dashboards', path: '/equipe/board/relatorios' });
  } else if (pathname.includes('/dashboard-clientes-os')) {
    segments.push({ label: 'Projetos', path: '/equipe/board/dashboard-clientes-os' });
  } else if (pathname.includes('/clientes')) {
    segments.push({ label: 'Clientes', path: '/equipe/board/clientes' });
  } else if (pathname.includes('/dashboard')) {
    segments.push({ label: 'Estratégico', path: '/equipe/board/dashboard' });
  }
  return segments;
};

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
 * Nome, papel e iniciais ficavam num bloco na barra lateral, que sumia quando
 * ela recolhia. Passaram para a direita do topbar, onde a referência os põe e
 * onde continuam visíveis com a barra recolhida.
 */
export const BoardLayout = ({ children, title, subtitle, headerActions, noPadding }: BoardLayoutProps) => {
  const { user, isAdmin, isLider, signOut } = useAuth();
  const { hasAccess: canPerformance } = usePageAccess('/equipe/board/performance');
  const { hasAccess: canDesempenho } = usePageAccess('/equipe/board/desempenho');
  const { hasAccess: canUsoEnvio } = usePageAccess('/equipe/board/uso-envio');
  const { hasAccess: canChamados } = usePageAccess('/equipe/board/chamados/dashboard');
  const { hasAccess: canCapacidade } = usePageAccess('/equipe/board/capacidade');
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

  const { pendingDecisions, hasUnreadOrOverdue } = useDomainBoardLayout({
    canDesempenho,
    userId: user?.id,
  });

  // `isLider` é ESTRITO no AuthContext (não engloba admin) — daí o OR, como no
  // LiderRoute.
  const podeGerencial = isAdmin || isLider;

  const navItems = buildNavItems(
    {
      performance: canPerformance === true,
      desempenho: canDesempenho === true,
      usoEnvio: canUsoEnvio === true,
      // Estas três rotas são líder+ (LiderRoute em App.tsx). Sem o mesmo teste
      // aqui, quem não é líder veria o item e o clique só redirecionaria.
      chamados: canChamados === true && podeGerencial,
      capacidade: canCapacidade === true && podeGerencial,
      logsEquipe: canLogsEquipe === true && podeGerencial,
    },
    pendingDecisions,
  );
  // O grupo aparece quando existe pelo menos um item dele — hoje Operacional,
  // Capacidade, Desempenho e Logs de Equipe.
  const showGestaoTime = navItems.some(item => item.adminOnly);
  const isDesempenhoRoute = location.pathname.startsWith('/equipe/board/desempenho');
  const isMiEvolucaoRoute = location.pathname.includes('/minha-evolucao');
  const breadcrumb = getBreadcrumb(location.pathname);

  const isActive = (path: string) => {
    if (path === '/equipe/board/desempenho') return location.pathname === path;
    // O menu de Chamados leva ao dashboard, mas fica aceso na lista e no detalhe
    // também — são a mesma seção para quem está navegando.
    if (path === '/equipe/board/chamados/dashboard') {
      return location.pathname.startsWith('/equipe/board/chamados');
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isParentActive = (item: NavItem) => {
    if (isActive(item.path)) return true;
    return item.children?.some(c => isActive(c.path)) ?? false;
  };

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
              <div key={item.path}>
                <button
                  onClick={() => { navigate(item.path); setMobileOpen(false); }}
                  className="w-full flex items-center gap-2.5 rounded-[10px] text-[13px] transition-all duration-150 relative mb-0.5 px-2.5 py-2"
                  style={navBtnStyle(isParentActive(item), collapsed)}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-[15px] w-[15px] flex-shrink-0" style={{ opacity: isParentActive(item) ? 1 : 0.7 }} />
                  {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                  {!collapsed && item.children && (
                    <ChevronRight
                      className={`h-3 w-3 transition-transform ${isDesempenhoRoute ? 'rotate-90' : ''}`}
                      style={{ color: isParentActive(item) ? 'rgba(255,255,255,.7)' : 'var(--bd-ink4)' }}
                    />
                  )}
                </button>
                {/* Sub-itens */}
                {!collapsed && item.children && isDesempenhoRoute && (
                  <div className="ml-[18px] mt-1 pl-2.5" style={{ borderLeft: '1px solid var(--bd-line)' }}>
                    {item.children.map((sub) => (
                      <button
                        key={sub.path}
                        onClick={() => { navigate(sub.path); setMobileOpen(false); }}
                        className="w-full flex items-center gap-2.5 rounded-[9px] text-[12.5px] transition-all duration-150 px-2.5 py-[6px] relative mb-0.5"
                        style={{
                          color: isActive(sub.path) ? 'var(--bd-accent-d)' : 'var(--bd-ink3)',
                          fontWeight: isActive(sub.path) ? 600 : 500,
                          backgroundColor: isActive(sub.path) ? 'var(--bd-accent-t)' : 'transparent',
                        }}
                      >
                        <sub.icon className="h-[14px] w-[14px] flex-shrink-0" style={{ opacity: isActive(sub.path) ? 1 : 0.7 }} />
                        <span className="flex-1 text-left">{sub.label}</span>
                        {sub.badge !== undefined && sub.badge > 0 && (
                          <span
                            className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white px-1"
                            style={{ backgroundColor: 'var(--bd-risk-d)' }}
                          >
                            {sub.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MINHA AREA */}
        <div className="mb-5">
          {!collapsed && (
            <p className="px-2.5 mb-1.5 text-[9.5px] font-bold uppercase tracking-[0.13em]" style={{ color: 'var(--bd-ink4)' }}>
              Minha Area
            </p>
          )}
          <button
            onClick={() => { navigate('/equipe/board/desempenho/minha-evolucao'); setMobileOpen(false); }}
            className="w-full flex items-center gap-2.5 rounded-[10px] text-[13px] transition-all duration-150 relative mb-0.5 px-2.5 py-2"
            style={navBtnStyle(isMiEvolucaoRoute, collapsed)}
            title={collapsed ? 'Minha Evolução' : undefined}
          >
            <User className="h-[15px] w-[15px] flex-shrink-0" style={{ opacity: isMiEvolucaoRoute ? 1 : 0.7 }} />
            {!collapsed && <span className="flex-1 text-left">Minha Evolução</span>}
            {!collapsed && hasUnreadOrOverdue && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--bd-warn)' }} />
            )}
          </button>
        </div>
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
          className="h-14 min-h-14 flex items-center px-4 md:px-6 gap-3 flex-shrink-0"
          style={{ backgroundColor: 'var(--bd-chrome)', borderBottom: '1px solid var(--bd-chrome-line)' }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            style={{ color: 'var(--bd-ink3)' }}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[12px]" style={{ color: 'var(--bd-ink3)' }}>
              {breadcrumb.map((b, i) => (
                <span key={b.path} className="flex items-center gap-1.5">
                  {/* Sem cor própria: herda o `--bd-ink3` do contêiner acima.
                      Antes o separador pintava com token de BORDA — 1,21:1
                      como texto. */}
                  {i > 0 && <span aria-hidden>/</span>}
                  {i === breadcrumb.length - 1 ? (
                    <span className="text-[13px] font-semibold" style={{ color: 'var(--bd-ink)' }}>{b.label}</span>
                  ) : (
                    <button onClick={() => navigate(b.path)} className="hover:underline">{b.label}</button>
                  )}
                </span>
              ))}
            </div>
            {subtitle && (
              <div className="hidden sm:block text-[11.5px] leading-tight" style={{ color: 'var(--bd-ink3)' }}>
                {subtitle}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2.5 ml-auto">
            {headerActions}
            {/* Chip do usuário — veio da barra lateral (ver o cabeçalho deste
                arquivo). Continua visível com a barra recolhida. */}
            <div
              className="hidden sm:flex items-center gap-2.5 pl-3"
              style={{ borderLeft: '1px solid var(--bd-line)' }}
            >
              <div className="text-right leading-tight">
                <p className="text-[12.5px] font-semibold" style={{ color: 'var(--bd-ink)' }}>
                  {firstName} {lastName}
                </p>
                <p className="text-[10.5px]" style={{ color: 'var(--bd-ink3)' }}>{role}</p>
              </div>
              <div className="v4-av v4-av-sm">{initials}</div>
            </div>
          </div>
        </header>

        {/* Seletor global de empresa — só nas rotas que realmente o honram
            (ver ROTAS_COM_CLUSTER_GLOBAL). Fora do scroll, como no OSG Work:
            fica sempre visível enquanto a página rola. */}
        {honraClusterGlobal(location.pathname) && <BoardClusterBar />}

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className={`${noPadding ? '' : 'p-4 md:p-6 lg:p-7'}`} style={{ fontFamily: "'Instrument Sans', sans-serif" }}>
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
