import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import {
  Briefcase,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  ArrowLeft,
  Shield,
  Users,
  Landmark,
  FileText,
  Building2,
  AlertCircle,
  FileSignature,
  FolderArchive,
  PieChart,
  LayoutDashboard,
  FolderKanban,
  ClipboardList,
  FileBarChart2,
  MessageSquare,
  MessagesSquare,
  Home,
  LineChart,
  Rocket,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSidebarRecolhimentoController } from '@/hooks/useSidebarRecolhimentoController';
import { SidebarCartaoUsuario } from '@/components/shared/SidebarCartaoUsuario';
import { classeLarguraBarra } from '@/lib/sidebarMedidas';
import OsgWorkIcon from '@/components/equipe/osg/OsgWorkIcon';
import OsgProjectsIcon from '@/components/equipe/osg/OsgProjectsIcon';
import { linkEspelhado } from '@/lib/areaTheme';

const OsgWorkClienteBar = () => {
  const { clienteId, setClienteId } = useOsgWork();
  const { data: clientes = [], isLoading } = useClientesLista();
  const clienteSelecionado = clientes.find((c) => c.id === clienteId);
  const semCliente = !clienteId;

  return (
    <div
      className={cn(
        'border-b px-6 py-3 transition-colors',
        semCliente
          ? 'bg-osg-50 border-osg-100'
          : 'bg-osg-50/40 border-osg-100',
      )}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
        <div className="flex items-center gap-2 whitespace-nowrap">
          <div
            className={cn(
              'h-8 w-8 rounded-lg flex items-center justify-center',
              semCliente ? 'bg-osg-500 text-white animate-pulse' : 'bg-osg-100 text-osg-700',
            )}
          >
            <Building2 className="h-4 w-4 flex-shrink-0" />
          </div>
          <Label className="text-sm font-bold text-osg-700 uppercase tracking-wide">
            Cliente
          </Label>
        </div>
        <div className="flex-1 max-w-md">
          <Select
            value={clienteId || undefined}
            onValueChange={setClienteId}
            disabled={isLoading}
          >
            <SelectTrigger
              className={cn(
                'h-10 font-medium',
                semCliente
                  ? 'border-2 border-osg-300 ring-2 ring-osg-100 bg-background'
                  : 'border-osg-200 bg-background',
              )}
            >
              <SelectValue placeholder={isLoading ? 'Carregando...' : 'Selecione um cliente...'} />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {semCliente ? (
          <div className="flex items-center gap-1.5 text-xs font-medium text-osg-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>Selecione um cliente para usar as ferramentas</span>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground truncate">
            Trabalhando em: <span className="font-semibold">{clienteSelecionado?.nome}</span>
          </div>
        )}
      </div>
    </div>
  );
};

interface OsgLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export const OsgLayout = ({ children, title, subtitle, headerActions }: OsgLayoutProps) => {
  const { signOut, isAdmin, isLider } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Telas de trabalho largas recolhem a barra sozinhas — quem pede é a própria
  // tela, com `useTelaDeTrabalhoLargo()`; este layout não conhece rota nenhuma.
  const { collapsed, setCollapsed } = useSidebarRecolhimentoController();
  // "Gerencial" só aparece para líder+ (isLider é estrito, não engloba admin).
  const canGerencial = isAdmin || isLider;

  // Os rótulos ficam SEMPRE montados e são clipados pela largura da <aside>.
  // Desmontá-los (o `{!collapsed && ...}` de antes) fazia o texto sumir de
  // estalo enquanto a barra ainda encolhia — é isso que dava a sensação de
  // corte seco. Agora eles desbotam e deslizam junto com a largura: ao recolher
  // saem primeiro (sem delay), ao expandir entram depois que a barra já abriu.
  const rotuloCls = cn(
    'transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none',
    collapsed ? 'pointer-events-none -translate-x-1 opacity-0' : 'opacity-100 delay-150',
  );

  // O tema da área NÃO é aplicado aqui: quem o aplica é o `AreaThemeProvider`,
  // a partir da rota, acima dos gates de acesso (ver `src/lib/areaTheme.ts`).

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isWork = location.pathname.startsWith('/equipe/osg/work');
  const isProjects = location.pathname.startsWith('/equipe/osg/inicio')
    || location.pathname.startsWith('/equipe/osg/dashboard')
    || location.pathname.startsWith('/equipe/osg/projetos')
    // `/equipe/osg/gerencial` cobre tudo do agrupador novo, inclusive
    // logs-equipe e chamados, que agora vivem debaixo dele.
    || location.pathname.startsWith('/equipe/osg/gerencial')
    || location.pathname.startsWith('/equipe/osg/auditoria');

  // Itens do agrupador "Projetos" — espelhado da área Tax (Dashboard / Projetos /
  // Auditoria). Expande no hover e fica aberto quando uma rota filha está ativa.
  const projetosItems = [
    { path: '/equipe/osg/projetos/clientes', label: 'Clientes', icon: ClipboardList },
    { path: '/equipe/osg/projetos/cadastro', label: 'Projetos e tarefas', icon: FolderKanban },
    { path: '/equipe/osg/projetos/feed', label: 'Feed', icon: MessagesSquare },
  ];
  const isProjetosActive = location.pathname.startsWith('/equipe/osg/projetos');

  // Itens do agrupador "Gerencial" — espelha o da Tax. "Dashboards" é a tela que
  // antes se chamava Gerencial (mesmo endereço, rótulo novo); chamados e logs
  // vieram para debaixo dela.
  const gerencialItems = [
    { path: '/equipe/osg/gerencial', label: 'Dashboards', icon: LayoutDashboard },
    { path: '/equipe/osg/gerencial/chamados', label: 'Gestão de Chamados', icon: MessageSquare },
    { path: '/equipe/osg/gerencial/chamados/dashboard', label: 'Dashboard de Chamados', icon: LineChart },
    { path: '/equipe/osg/gerencial/logs-equipe', label: 'Logs de Uso', icon: Shield },
  ];
  const isGerencialActive = location.pathname.startsWith('/equipe/osg/gerencial');

  // Itens do agrupador "Documentos" — expande no hover (e fica aberto na rota ativa)
  const docItems = [
    { path: '/equipe/osg/work/biblioteca-modelos', label: 'Biblioteca de Modelos' },
    { path: '/equipe/osg/work/montagem-documentos', label: 'Montagem de Documentos' },
    { path: '/equipe/osg/work/gerar-documento', label: 'Gerar Documento' },
  ];
  const isDocsActive = docItems.some((item) => item.path === location.pathname);

  // Itens do agrupador "Onboarding" — a solicitação inicial e a tela onde os
  // arquivos que chegaram viram cadastro. Mesmo padrão de dropdown por hover.
  const onbItems = [
    { path: '/equipe/osg/work/onboarding', label: 'Solicitação Inicial' },
    { path: '/equipe/osg/work/onboarding/cadastro', label: 'Cadastro por Documento' },
  ];
  const isOnbActive = onbItems.some((item) => item.path === location.pathname);

  // Itens do agrupador "Documentos do Cliente" — mesmo padrão de dropdown por hover
  const docClienteItems = [
    { path: '/equipe/osg/work/documentos', label: 'Explorador de arquivos' },
    { path: '/equipe/osg/work/checklists', label: 'Checklists de documentos' },
  ];
  const isDocClienteActive = docClienteItems.some((item) => item.path === location.pathname);

  const areaLabel = isWork ? 'OSG Work' : isProjects ? 'OSG Projects' : 'OSG';
  const areaSubtitle = isWork
    ? 'Ferramentas OSG'
    : isProjects
      ? 'Projetos OSG'
      : 'Área OSG';
  const AreaIcon = isWork
    ? <OsgWorkIcon size={40} className="h-full w-full block" />
    : isProjects
      ? <OsgProjectsIcon size={40} className="h-full w-full block" />
      : <Briefcase className="h-5 w-5 text-osg-600" />;

  return (
    <div className="min-h-screen bg-osg-canvas flex w-full">
      {/* Sidebar wrapper — keeps toggle button outside the scroll container */}
      <div
        className={cn(
          'flex-shrink-0 sticky top-0 h-screen relative',
          // Só a largura anima (o `transition-all` de antes também pegava cor e
          // sombra). A curva é ease-out-quint: sai rápido e "pousa" devagar.
          //
          // A curva vai como propriedade arbitrária, e não pela utilitária
          // `ease` com valor entre colchetes: naquela forma o Tailwind 3 não
          // desambigua entre `transition-timing-function` e
          // `animation-timing-function`, avisa no build e DESCARTA a classe. A
          // barra vinha animando sem curva nenhuma — sem erro de build, de lint
          // ou de tipo. Mesmo defeito que a duração das linhas de lista tinha.
          'transition-[width] duration-500',
          '[transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
          'motion-reduce:transition-none',
          // 5rem, e não 4rem: ver docs/geral/sidebar-recolhe-em-tela-larga.md.
          classeLarguraBarra(collapsed),
        )}
      >
        {/* Toggle Button — sibling of <aside> so it isn't clipped by overflow */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 -right-3 z-20 h-6 w-6 rounded-full border border-border bg-background hover:bg-muted text-muted-foreground shadow-sm"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

        {/* overflow-x-hidden: é este clipe que "engole" os rótulos conforme a
            largura diminui, em vez de eles sumirem de uma vez. */}
        <aside className="h-full w-full bg-background border-r border-border/60 flex flex-col overflow-y-auto overflow-x-hidden">
        {/* Header */}
        <div className="px-4 py-6 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
              {AreaIcon}
            </div>
            <div className={cn(rotuloCls, "min-w-0 whitespace-nowrap")}>
              <h2 className="font-semibold text-foreground text-lg">{areaLabel}</h2>
              <p className="text-xs text-muted-foreground">{areaSubtitle}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {/* ───── OSG Projects: Dashboard + Projetos (espelhado da área Tax). */}
          {/* Aparece só fora do OSG Work, que mantém suas próprias ferramentas. */}
          {isProjects && (
          <>
          <button
            onClick={() => navigate('/equipe/osg/inicio')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              location.pathname === '/equipe/osg/inicio'
                ? "bg-osg-100 text-primary"
                : "text-muted-foreground [&>svg]:opacity-75 hover:bg-osg-50 hover:text-primary"
            )}
          >
            <Home className="h-4 w-4 flex-shrink-0" />
            <span className={cn(rotuloCls, "whitespace-nowrap")}>Início</span>
          </button>
          <button
            onClick={() => navigate('/equipe/osg/dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              location.pathname === '/equipe/osg/dashboard'
                ? "bg-osg-100 text-primary"
                : "text-muted-foreground [&>svg]:opacity-75 hover:bg-osg-50 hover:text-primary"
            )}
          >
            <LayoutDashboard className="h-4 w-4 flex-shrink-0" />
            <span className={cn(rotuloCls, "whitespace-nowrap")}>Dashboard</span>
          </button>

          {/* Agrupador "Projetos" — expande no hover (e fica aberto na rota ativa) */}
          <div className="group/proj">
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isProjetosActive
                  ? "bg-osg-50 text-primary"
                  : "text-muted-foreground [&>svg]:opacity-75 group-hover/proj:bg-osg-50 group-hover/proj:text-primary"
              )}
            >
              <FolderKanban className="h-4 w-4 flex-shrink-0" />
              <span className={cn(rotuloCls, "whitespace-nowrap")}>Projetos</span>
              <ChevronDown
                className={cn(
                  rotuloCls,
                  "h-4 w-4 ml-auto flex-shrink-0 duration-300",
                  isProjetosActive ? "rotate-180" : "group-hover/proj:rotate-180"
                )}
              />
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                collapsed
                  ? "grid-rows-[0fr]"
                  : isProjetosActive
                    ? "grid-rows-[1fr]"
                    : "grid-rows-[0fr] group-hover/proj:grid-rows-[1fr]"
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className={cn(
                    "space-y-1 pt-1",
                    collapsed ? "" : "ml-2 pl-2 border-l border-osg-100"
                  )}
                >
                  {projetosItems.map(({ path, label, icon: Icon }) => (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                        location.pathname === path
                          ? "bg-osg-100 text-primary"
                          : "text-muted-foreground [&>svg]:opacity-75 hover:bg-osg-50 hover:text-primary"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className={cn(rotuloCls, "whitespace-nowrap")}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          </>
          )}

          {/* ───── OSG Work: ferramentas próprias (inalteradas) ───── */}
          {isWork && (
          <>
          {/* Agrupador "Onboarding" — expande no hover (e fica aberto na rota ativa) */}
          <div className="group/onb">
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isOnbActive
                  ? "bg-osg-50 text-primary"
                  : "text-muted-foreground group-hover/onb:bg-osg-50 group-hover/onb:text-primary"
              )}
            >
              <Rocket className="h-4 w-4 flex-shrink-0" />
              <span className={cn(rotuloCls, "flex-1 min-w-0 truncate text-left")}>Onboarding</span>
              <ChevronDown
                className={cn(
                  rotuloCls,
                  "h-4 w-4 flex-shrink-0 duration-300",
                  isOnbActive ? "rotate-180" : "group-hover/onb:rotate-180"
                )}
              />
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                collapsed
                  ? "grid-rows-[0fr]"
                  : isOnbActive
                    ? "grid-rows-[1fr]"
                    : "grid-rows-[0fr] group-hover/onb:grid-rows-[1fr]"
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className={cn(
                    "space-y-1 pt-1",
                    collapsed ? "" : "ml-2 pl-2 border-l border-osg-100"
                  )}
                >
                  {onbItems.map(({ path, label }) => (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                        location.pathname === path
                          ? "bg-osg-100 text-primary"
                          : "text-muted-foreground [&>svg]:opacity-75 hover:bg-osg-50 hover:text-primary"
                      )}
                    >
                      <span className={cn(rotuloCls, "whitespace-nowrap")}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/equipe/osg/work/qualificacao-das-partes')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              location.pathname === '/equipe/osg/work/qualificacao-das-partes'
                ? "bg-osg-100 text-primary"
                : "text-muted-foreground [&>svg]:opacity-75 hover:bg-osg-50 hover:text-primary"
            )}
          >
            <Users className="h-4 w-4 flex-shrink-0" />
            <span className={cn(rotuloCls, "whitespace-nowrap")}>Qualificação das Partes</span>
          </button>
          <button
            onClick={() => navigate('/equipe/osg/work/diagnostico-patrimonial')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              location.pathname === '/equipe/osg/work/diagnostico-patrimonial'
                ? "bg-osg-100 text-primary"
                : "text-muted-foreground [&>svg]:opacity-75 hover:bg-osg-50 hover:text-primary"
            )}
          >
            <Landmark className="h-4 w-4 flex-shrink-0" />
            <span className={cn(rotuloCls, "whitespace-nowrap")}>Diagnóstico Patrimonial</span>
          </button>
          <button
            onClick={() => navigate('/equipe/osg/work/controle-matriculas')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              location.pathname === '/equipe/osg/work/controle-matriculas'
                ? "bg-osg-100 text-primary"
                : "text-muted-foreground [&>svg]:opacity-75 hover:bg-osg-50 hover:text-primary"
            )}
          >
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span className={cn(rotuloCls, "whitespace-nowrap")}>Controle de Matrículas</span>
          </button>
          {/* Agrupador "Oficina de Contratos" — expande no hover com animação suave */}
          <div className="group/docs">
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isDocsActive
                  ? "bg-osg-50 text-primary"
                  : "text-muted-foreground group-hover/docs:bg-osg-50 group-hover/docs:text-primary"
              )}
            >
              <FileSignature className="h-4 w-4 flex-shrink-0" />
              <span className={cn(rotuloCls, "whitespace-nowrap")}>Oficina de Contratos</span>
              <ChevronDown
                className={cn(
                  rotuloCls,
                  "h-4 w-4 ml-auto flex-shrink-0 duration-300",
                  isDocsActive ? "rotate-180" : "group-hover/docs:rotate-180"
                )}
              />
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                collapsed
                  ? "grid-rows-[0fr]"
                  : isDocsActive
                    ? "grid-rows-[1fr]"
                    : "grid-rows-[0fr] group-hover/docs:grid-rows-[1fr]"
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className={cn(
                    "space-y-1 pt-1",
                    collapsed ? "" : "ml-2 pl-2 border-l border-osg-100"
                  )}
                >
                  {docItems.map(({ path, label }) => (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                        location.pathname === path
                          ? "bg-osg-100 text-primary"
                          : "text-muted-foreground [&>svg]:opacity-75 hover:bg-osg-50 hover:text-primary"
                      )}
                    >
                      <span className={cn(rotuloCls, "whitespace-nowrap")}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/equipe/osg/work/quadro-societario')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              location.pathname === '/equipe/osg/work/quadro-societario'
                ? "bg-osg-100 text-primary"
                : "text-muted-foreground [&>svg]:opacity-75 hover:bg-osg-50 hover:text-primary"
            )}
          >
            <PieChart className="h-4 w-4 flex-shrink-0" />
            <span className={cn(rotuloCls, "whitespace-nowrap")}>Quadro Societário</span>
          </button>
          {/* Agrupador "Documentos do Cliente" — expande no hover com animação suave */}
          <div className="group/docsCli">
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isDocClienteActive
                  ? "bg-osg-50 text-primary"
                  : "text-muted-foreground group-hover/docsCli:bg-osg-50 group-hover/docsCli:text-primary"
              )}
            >
              <FolderArchive className="h-4 w-4 flex-shrink-0" />
              <span className={cn(rotuloCls, "flex-1 min-w-0 truncate text-left")}>Documentos</span>
              <ChevronDown
                className={cn(
                  rotuloCls,
                  "h-4 w-4 flex-shrink-0 duration-300",
                  isDocClienteActive ? "rotate-180" : "group-hover/docsCli:rotate-180"
                )}
              />
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                collapsed
                  ? "grid-rows-[0fr]"
                  : isDocClienteActive
                    ? "grid-rows-[1fr]"
                    : "grid-rows-[0fr] group-hover/docsCli:grid-rows-[1fr]"
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div
                  className={cn(
                    "space-y-1 pt-1",
                    collapsed ? "" : "ml-2 pl-2 border-l border-osg-100"
                  )}
                >
                  {docClienteItems.map(({ path, label }) => (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                        location.pathname === path
                          ? "bg-osg-100 text-primary"
                          : "text-muted-foreground [&>svg]:opacity-75 hover:bg-osg-50 hover:text-primary"
                      )}
                    >
                      <span className={cn(rotuloCls, "whitespace-nowrap")}>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/equipe/osg/work/relatorios')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
              location.pathname === '/equipe/osg/work/relatorios'
                ? "bg-osg-100 text-primary"
                : "text-muted-foreground [&>svg]:opacity-75 hover:bg-osg-50 hover:text-primary"
            )}
          >
            <FileBarChart2 className="h-4 w-4 flex-shrink-0" />
            <span className={cn(rotuloCls, "whitespace-nowrap")}>Relatórios</span>
          </button>
          </>
          )}

          {/* Agrupador "Gerencial" — exclusivo da área Projetos e só para líder+.
              Reúne o que antes eram dois itens soltos (Gerencial e Auditoria) mais
              as duas telas de chamados que vieram da área de Gestão. Espelha o
              agrupador "Projetos" logo acima; clicar no próprio grupo abre
              "Dashboards", que é a tela que antes se chamava Gerencial. */}
          {isProjects && canGerencial && (
            <div className="group/ger">
              <button
                type="button"
                onClick={() => navigate('/equipe/osg/gerencial')}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  isGerencialActive
                    ? "bg-osg-50 text-primary"
                    : "text-muted-foreground group-hover/ger:bg-osg-50 group-hover/ger:text-primary"
                )}
              >
                <LineChart className="h-4 w-4 flex-shrink-0" />
                <span className={cn(rotuloCls, "whitespace-nowrap")}>Gerencial</span>
                <ChevronDown
                  className={cn(
                    rotuloCls,
                    "h-4 w-4 ml-auto flex-shrink-0 duration-300",
                    isGerencialActive ? "rotate-180" : "group-hover/ger:rotate-180"
                  )}
                />
              </button>

              <div
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-out",
                  collapsed
                    ? "grid-rows-[0fr]"
                    : isGerencialActive
                      ? "grid-rows-[1fr]"
                      : "grid-rows-[0fr] group-hover/ger:grid-rows-[1fr]"
                )}
              >
                <div className="min-h-0 overflow-hidden">
                  <div
                    className={cn(
                      "space-y-1 pt-1",
                      collapsed ? "" : "ml-2 pl-2 border-l border-osg-100"
                    )}
                  >
                    {gerencialItems.map(({ path, label, icon: Icon }) => (
                      <button
                        key={path}
                        onClick={() => navigate(path)}
                        // Rótulo comprido ("Dashboard de Chamados") corta com
                        // reticências em vez de vazar, e o título traz o inteiro.
                        title={label}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-sm font-medium min-w-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                          location.pathname === path
                            ? "bg-osg-100 text-primary"
                            : "text-muted-foreground [&>svg]:opacity-75 hover:bg-osg-50 hover:text-primary"
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className={cn(rotuloCls, "min-w-0 truncate")}>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Chamados — atalho espelhado da área Tax (mesma página /equipe/chamados,
              que já escopa o filtro de cluster pelo cluster do usuário OSG).
              Some para o Líder Geral, que tem "Gestão de Chamados" no dropdown
              Gerencial: dois caminhos para chamado no mesmo menu confundem.
              Admin NÃO perde o item — admin vê tudo. É só o menu; a página
              segue liberada para quem tiver o link. */}
          {isProjects && !isLider && (
            <button
              onClick={() => navigate(linkEspelhado('/equipe/chamados', 'osg'))}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md",
                location.pathname.startsWith('/equipe/chamados')
                  ? "bg-osg-100 text-primary"
                  : "text-muted-foreground [&>svg]:opacity-75 hover:bg-osg-50 hover:text-primary"
              )}
            >
              <MessageSquare className="h-4 w-4 flex-shrink-0" />
              <span className={cn(rotuloCls, "whitespace-nowrap")}>Chamados</span>
            </button>
          )}
        </nav>

        {/* Footer Actions */}
        <div className="mt-auto p-4 border-t border-border/60 space-y-2">
          {/* Cartão do usuário: padrão compartilhado, com o recolhido embutido. */}
          <SidebarCartaoUsuario area="osg" collapsed={collapsed} />

          <Button
            variant="ghost"
            className="w-full justify-start px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-osg-600 transition-colors"
            onClick={() => navigate('/equipe/osg')}
            title={collapsed ? 'Trocar área' : undefined}
          >
            <ArrowLeft className="h-4 w-4 mr-3 flex-shrink-0" />
            <span className={cn(rotuloCls, "whitespace-nowrap")}>Trocar área</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-osg-600 transition-colors"
            onClick={() => navigate('/')}
            title={collapsed ? 'Voltar ao site' : undefined}
          >
            <ArrowLeft className="h-4 w-4 mr-3 flex-shrink-0" />
            <span className={cn(rotuloCls, "whitespace-nowrap")}>Voltar ao site</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            onClick={handleSignOut}
            title={collapsed ? 'Sair' : undefined}
          >
            <LogOut className="h-4 w-4 mr-3 flex-shrink-0" />
            <span className={cn(rotuloCls, "whitespace-nowrap")}>Sair</span>
          </Button>
        </div>
      </aside>
      </div>

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
          <div className="flex items-center gap-3">
            {headerActions}
            <NotificationPopover
              navigateTo="/equipe/chamados"
              espelho="osg"
              tasksNavigateTo="/equipe/osg/projetos/tarefas"
              mencoesArea="osg"
            />
          </div>
        </header>

        {isWork && <OsgWorkClienteBar />}

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

export default OsgLayout;
