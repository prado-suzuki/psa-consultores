import { AREAS } from '@/lib/nomeDaArea';
import { TituloDaPagina } from '@/components/layout/TituloDaPagina';
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import { PendingTicketsAlert } from '@/components/notifications/PendingTicketsAlert';
import {
  LayoutDashboard,
  Kanban,
  Calendar,
  MessageSquare,
  LogOut,
  FolderKanban,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  ClipboardList,
  Workflow,
  Library,
  ArrowLeft,
  Layers,
  Settings,
   BarChart3,
   FileBarChart,
   RefreshCw,
   Sparkles,
   Map
} from 'lucide-react';
import {
  useFecharGavetaAoNavegar,
  useSidebarRecolhimentoController,
} from '@/hooks/useSidebarRecolhimentoController';
import { SidebarFundoGaveta } from '@/components/shared/SidebarFundoGaveta';
import { SidebarCartaoUsuario } from '@/components/shared/SidebarCartaoUsuario';
import {
  classeLarguraBarra,
  classeRecuoCabecalho,
  classesGavetaBarra,
} from '@/lib/sidebarMedidas';
import { cn } from '@/lib/utils';

interface EquipeLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
  fullWidth?: boolean;
}

interface NavItem {
  icon: any;
  label: string;
  path: string;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    icon: LayoutDashboard,
    label: 'Estratégico',
    path: '/equipe/dashboard',
    children: [
      { icon: LayoutDashboard, label: 'Visão Geral', path: '/equipe/dashboard' },
      { icon: BarChart3, label: 'Dashboards', path: '/equipe/dashboards' },
      { icon: Sparkles, label: 'Análise Inteligente', path: '/equipe/dashboards/analise-inteligente' },
      { icon: FileBarChart, label: 'Relatórios', path: '/equipe/relatorios' },
      { icon: FolderKanban, label: 'Projetos', path: '/equipe/projetos' },
    ],
  },
  {
    icon: Calendar,
    label: 'Planejamento',
    path: '/equipe/sprints',
    children: [
      { icon: Calendar, label: 'Sprints', path: '/equipe/sprints' },
      { icon: Layers, label: 'Backlog', path: '/equipe/backlog' },
      { icon: Map, label: 'Mapeamento', path: '/equipe/mapeamento' },
      { icon: Workflow, label: 'Processos', path: '/equipe/processos' },
      { icon: RefreshCw, label: 'Rotinas', path: '/equipe/rotinas' },
    ],
  },
  {
    icon: Kanban,
    label: 'Execução',
    path: '/equipe/kanban',
    children: [
      { icon: Kanban, label: 'Kanban', path: '/equipe/kanban' },
      { icon: MessageSquare, label: 'Daily', path: '/equipe/daily' },
      // { icon: BarChart3, label: 'Semana', path: '/equipe/semana' }, // habilitar na Etapa 4
    ],
  },
  // { icon: Library, label: 'Biblioteca', path: '/equipe/biblioteca' }, // Temporariamente oculto
];

export const EquipeLayout = ({ children, title, subtitle, headerActions, fullWidth = false }: EquipeLayoutProps) => {
  const { signOut, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // O recolhimento automático em telas de trabalho largo mora no hook — é a
  // tela que pede, com `useTelaDeTrabalhoLargo()`; o layout não conhece rotas.
  const barra = useSidebarRecolhimentoController();
  const { collapsed, setCollapsed, emGaveta } = barra;
  // No celular a barra é gaveta: cada navegação a fecha (ver o hook).
  useFecharGavetaAoNavegar(barra);
  // Recolhida, a barra vira TRILHO de 80px com os ícones — não some mais. Ela
  // era uma das duas que zeravam a largura (a outra é a `DevLayout`), e sumir
  // deixa o usuário sem âncora nenhuma: o menu inteiro desaparece e o único
  // caminho de volta é o hambúrguer do cabeçalho. Na gaveta não existe trilho:
  // ela é sempre de 16rem e desliza para fora da tela com os rótulos montados.
  const trilho = collapsed && !emGaveta;
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    '/equipe/dashboard': true,
    '/equipe/sprints': true,
    '/equipe/kanban': true,
  });

  // O tema da área NÃO é aplicado aqui: quem o aplica é o `AreaThemeProvider`,
  // a partir da rota, acima dos gates de acesso (ver `src/lib/areaTheme.ts`).

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isChildActive = (children?: NavItem[]) => {
    if (!children) return false;
    return children.some(child => isActive(child.path));
  };

  return (
    <div
      // Sem fundo de página: quem pinta é o `body`, uma vez, no `index.css`.
      // Oito layouts decidindo isso por conta própria foi como cinco deles
      // acabaram pintando com a superfície REBAIXADA. Ver a nota lá.
      className="min-h-screen flex w-full"
    >
      {/* A barra e o botão de recolher são IRMÃOS, e não pai e filho: o botão
          pousa meio fora da borda direita (`-right-3`) e o `overflow-y-auto` da
          barra o recortaria pela metade. Mesmo arranjo da Tax e da OSG. */}
      <div
        className={cn(
          'sticky top-0 h-screen relative flex-shrink-0 transition-all duration-300 ease-in-out',
          classeLarguraBarra(trilho),
          classesGavetaBarra(collapsed),
        )}
      >
        {/* `max-md:hidden`: na gaveta quem abre é o hambúrguer do cabeçalho e
            quem fecha é o fundo escuro — aqui o botão pousaria fora da tela. */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 -right-3 z-20 h-6 w-6 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground shadow-sm max-md:hidden"
          onClick={() => setCollapsed(!collapsed)}
          title={trilho ? 'Expandir menu' : 'Recolher menu'}
        >
          {trilho ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

        <aside className="h-full w-full border-r border-border/60 bg-white flex flex-col overflow-y-auto overflow-x-hidden scrollbar-hide">
            {/* Header — no trilho sobra só o selo da área, centralizado. O
                recuo cai de `p-6` para `p-4`: com 24px de cada lado sobrariam
                32px de largura útil para um selo de 40px. */}
            <div className={cn('border-b border-border/60 flex-shrink-0', classeRecuoCabecalho(trilho))}>
              {trilho ? (
                <div className="flex justify-center">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <LayoutDashboard className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="font-semibold text-foreground text-lg">{AREAS.rotina.nome}</h2>
                    <p className="text-xs text-muted-foreground">{AREAS.rotina.subtitulo}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="p-4 space-y-1">
              {navItems.map((item) => (
                item.children ? (
                  <Collapsible
                    key={item.path}
                    open={openGroups[item.path] ?? true}
                    onOpenChange={(open) => setOpenGroups(prev => ({ ...prev, [item.path]: open }))}
                  >
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        className={cn(
                          'flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors',
                          trilho ? 'justify-center px-2' : 'justify-start px-3',
                          isActive(item.path) || isChildActive(item.children)
                            ? 'bg-primary/10 text-primary hover:bg-primary/15'
                            : 'text-foreground hover:bg-muted hover:text-primary',
                        )}
                        onClick={() => navigate(item.path)}
                        title={trilho ? item.label : undefined}
                      >
                        <item.icon className={cn('h-4 w-4', !trilho && 'mr-3')} />
                        {!trilho && item.label}
                      </Button>
                      {/* No trilho o grupo não abre: os filhos não teriam onde
                          caber, e a seta ao lado de um ícone centralizado tira
                          o ícone do centro. Clicar no pai continua navegando. */}
                      {!trilho && (
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                          >
                            <ChevronDown className={`h-4 w-4 transition-transform ${(openGroups[item.path] ?? true) ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                    {!trilho && (
                      <CollapsibleContent className="mt-1 ml-4 space-y-1 border-l border-border/60 pl-3">
                        {item.children.map((child) => (
                          <Button
                            key={child.path}
                            variant="ghost"
                            className={`w-full justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              isActive(child.path)
                                ? 'bg-primary/10 text-primary hover:bg-primary/15'
                                : 'text-muted-foreground hover:bg-muted hover:text-primary'
                            }`}
                            onClick={() => navigate(child.path)}
                          >
                            <child.icon className="h-4 w-4 mr-3" />
                            {child.label}
                          </Button>
                        ))}
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                ) : (
                  <Button
                    key={item.path}
                    variant="ghost"
                    className={cn(
                      'w-full py-2.5 rounded-lg text-sm font-medium transition-colors',
                      trilho ? 'justify-center px-2' : 'justify-start px-3',
                      isActive(item.path)
                        ? 'bg-primary/10 text-primary hover:bg-primary/15'
                        : 'text-foreground hover:bg-muted hover:text-primary',
                    )}
                    onClick={() => navigate(item.path)}
                    title={trilho ? item.label : undefined}
                  >
                    <item.icon className={cn('h-4 w-4', !trilho && 'mr-3')} />
                    {!trilho && item.label}
                  </Button>
                )
              ))}
            </nav>

            {/* Footer Actions */}
            <div className="mt-auto p-4 border-t border-border/60 space-y-2">
              {/* Cartão do usuário: padrão compartilhado, com o recolhido
                  embutido. Era markup copiado à mão aqui, e copiado SEM o
                  estado recolhido — no trilho de 80px ele cortaria o avatar. */}
              <SidebarCartaoUsuario area="rotina" collapsed={trilho} />

              <Button
                variant="ghost"
                className={cn(
                  'w-full py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-primary transition-colors',
                  trilho ? 'justify-center px-2' : 'justify-start px-3',
                )}
                onClick={() => navigate('/equipe/digital')}
                title={trilho ? 'Trocar área' : undefined}
              >
                <ArrowLeft className={cn('h-4 w-4', !trilho && 'mr-3')} />
                {!trilho && 'Trocar área'}
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  'w-full py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-primary transition-colors',
                  trilho ? 'justify-center px-2' : 'justify-start px-3',
                )}
                onClick={() => navigate('/')}
                title={trilho ? 'Voltar ao site' : undefined}
              >
                <ArrowLeft className={cn('h-4 w-4', !trilho && 'mr-3')} />
                {!trilho && 'Voltar ao site'}
              </Button>
              <Button
                variant="ghost"
                className={cn(
                  'w-full py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-red-50 hover:text-red-600 transition-colors',
                  trilho ? 'justify-center px-2' : 'justify-start px-3',
                )}
                onClick={handleSignOut}
                title={trilho ? 'Sair' : undefined}
              >
                <LogOut className={cn('h-4 w-4', !trilho && 'mr-3')} />
                {!trilho && 'Sair'}
              </Button>
            </div>
        </aside>
      </div>

      {/* Fundo que fecha a gaveta no toque. Só aparece abaixo de `md`. */}
      <SidebarFundoGaveta aberta={!collapsed} onFechar={() => setCollapsed(true)} />

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="min-h-16 border-b border-border/60 bg-card flex items-center justify-between px-4 py-2 md:px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            {collapsed && (
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground flex-shrink-0"
                onClick={() => setCollapsed(false)}
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div>
              <TituloDaPagina titulo={title} subtitulo={subtitle} sobretitulo={AREAS.rotina.nome} />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-primary hover:bg-muted"
              // SEM espelho, de propósito. A Rotina é o chão comum e não um
              // recorte: "os chamados da Rotina" não quer dizer nada. Daqui se vê
              // a lista completa, no piso. Ver o bloco `ESPELHO` em
              // `src/lib/areaTheme.ts`, que registra por que ela saiu.
              onClick={() => navigate('/equipe/chamados', { state: { from: location.pathname } })}
              title="Ver Chamados"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            <NotificationPopover navigateTo="/equipe/chamados" backTo={location.pathname} />
            {headerActions}
          </div>
        </header>

        {/* Pending Tickets Alert */}
        <PendingTicketsAlert navigateTo="/equipe/chamados" backTo={location.pathname} />

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default EquipeLayout;
