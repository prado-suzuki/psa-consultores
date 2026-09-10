import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { SidebarCartaoUsuario } from '@/components/shared/SidebarCartaoUsuario';
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
  type LucideIcon,
} from 'lucide-react';
import { usePageAccess } from '@/hooks/usePageAccess';
import { useSidebarRecolhimentoController } from '@/hooks/useSidebarRecolhimentoController';
import { classeLarguraBarra } from '@/lib/sidebarMedidas';
import {
  FACE_DA_BARRA,
  classesEyebrowDaBarra,
  classesItemDaBarra,
} from '@/lib/barraLateralCromo';
import { cn } from '@/lib/utils';
import { AgenteNotificacaoPopup } from '@/components/agente/AgenteNotificacaoPopup';
import { BoardAgenteDiretoria } from '@/components/board/BoardAgenteDiretoria';
import { BoardToolbar } from '@/components/board/BoardToolbar';
import { rotaEhDiretoria } from '@/lib/agenteEscopos';

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
 * Agora a barra é branca, o item ativo é uma PÍLULA cheia e a hierarquia do
 * menu vem do peso e do espaçamento, como na referência.
 *
 * ── E a pílula virou o padrão das NOVE barras ─────────────────────────
 * Desde 10/09/2026 este desenho não é mais só do Board: a usuária olhou as
 * nove e pediu esta caixa em toda rota. Ele mora em `@/lib/barraLateralCromo`,
 * e o que sobrou aqui é a montagem.
 *
 * Uma coisa mudou na mudança: a pílula lia `--bd-chrome-active`, que aponta
 * para `--accent-d`. No piso isso é o teal escuro da marca e estava certo; na
 * Tax e na OSG, não — as duas apontam `--accent-d` para `--status-andamento`,
 * um token de STATUS. Agora ela lê `--primary`, a âncora da área.
 *
 * A nota antiga citava aqui um contraste de 4,40:1 para "o teal cheio da
 * marca", e isso ficou confuso ao ponto de virar argumento contra `--primary`.
 * O 4,40:1 é do `#0D877C`, o teal que este arquivo teve CRAVADO à mão até
 * `--bd-accent` passar a ler o token. Medido de novo, com letra branca:
 * piso 5,54:1, Tax 9,90:1, OSG 7,92:1 — os três passam AA.
 *
 * ── O usuário subiu para o topo ───────────────────────────────────────
 * Só o nome de acesso e as iniciais ficam no topbar — título e filtros
 * moram na toolbar do conteúdo, à direita do título da tela.
 */
export const BoardLayout = ({ children, title, subtitle, headerActions, noPadding }: BoardLayoutProps) => {
  const { isAdmin, isLider } = useAuth();
  const { hasAccess: canUsoEnvio } = usePageAccess('/equipe/board/uso-envio');
  const { hasAccess: canLogsEquipe } = usePageAccess('/equipe/board/logs-equipe');
  const navigate = useNavigate();
  const location = useLocation();

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
            // Mesmo papel da pílula: é a âncora da área, não o acento.
            style={{ backgroundColor: 'hsl(var(--primary))' }}
          >
            <LayoutDashboard className="h-[15px] w-[15px] text-white" />
          </div>
          {!collapsed && (
            <span
              className={cn(FACE_DA_BARRA, 'text-[15.5px] font-bold tracking-[-0.02em]')}
              style={{ color: 'var(--bd-ink)' }}
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
          {/* Montado SEMPRE: recolhido ele fica invisível e continua ocupando a
              altura. Desmontar colapsaria o respiro e os dois blocos do menu
              se encostariam — ver `classesEyebrowDaBarra`. */}
          <p className={classesEyebrowDaBarra(collapsed)}>Diretoria</p>
          {navItems.filter(i => !i.adminOnly).map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              className={cn(
                classesItemDaBarra({ ativo: isActive(item.path), trilho: collapsed }),
                'relative mb-0.5',
              )}
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
            <p className={classesEyebrowDaBarra(collapsed)}>Gestão de Time</p>
            {navItems.filter(i => i.adminOnly).map((item) => (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setMobileOpen(false); }}
                className={cn(
                  classesItemDaBarra({ ativo: isActive(item.path), trilho: collapsed }),
                  'relative mb-0.5',
                )}
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
        {/* O "Sair" que ficava aqui embaixo esta dentro do menu deste cartao
            desde 10/09/2026, como nas outras barras. */}
        <SidebarCartaoUsuario area="board" collapsed={collapsed} />
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

      </div>
    </div>
  );

  return (
    <div
      // Sem fundo de página: quem pinta é o `body`, uma vez, no `index.css`.
      // Oito layouts decidindo isso por conta própria foi como cinco deles
      // acabaram pintando com a superfície REBAIXADA. Ver a nota lá.
      className="bd-leitura min-h-screen flex w-full"
    >
      {/* Desktop/Tablet sidebar (md+)

          As medidas saíram de 68px recolhida e 240px aberta, escritas à mão,
          para as compartilhadas (80px/256px, ver `sidebarMedidas.ts`) — as
          classes antigas não aparecem aqui nem em comentário, porque o teste
          deste arquivo lê o fonte. O Board era a única barra fora
          da régua, e o trilho de 68px não é escolha de gosto: ele deixa 20px de
          largura útil (16px de recuo do rodapé de cada lado, mais 8px do chip)
          para um avatar de 32px. Enquanto o usuário morava no topbar isso não
          aparecia; com o cartão descendo para o pé da barra, 68px CORTA — é o
          mesmo corte que já levou o trilho de 64 para 80. */}
      <aside
        className={`hidden md:flex flex-col flex-shrink-0 fixed top-0 left-0 h-screen z-30 transition-all duration-300 ${classeLarguraBarra(collapsed)}`}
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
      {/* A barra é `fixed`, então é esta margem que reserva a coluna dela. Ela
          acompanha `classeLarguraBarra` à mão porque é margem, não largura: as
          duas classes ficam escritas literais para o Tailwind gerá-las. */}
      <main className={`flex-1 flex flex-col min-w-0 overflow-hidden ml-0 transition-all duration-300 ${collapsed ? 'md:ml-20' : 'md:ml-64'}`}>
        {/* Topbar — 56px */}
        {/* Topbar — 48px, e `md:hidden` desde 10/09/2026: o unico morador dela
            era o chip de nome + iniciais do usuario, que desceu para o cartao da
            barra junto com as outras oito areas. No desktop sobrava uma faixa
            vazia com borda; no celular ela continua sendo quem abre a gaveta. */}
        <header
          className="bd-masthead md:hidden flex items-center justify-end px-4 md:px-6 gap-3 flex-shrink-0"
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
        {rotaEhDiretoria(location.pathname) && <BoardAgenteDiretoria />}
      </main>
    </div>
  );
};

export default BoardLayout;
