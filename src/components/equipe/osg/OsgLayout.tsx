import { useEffect, useState } from 'react';
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
  User,
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import OsgWorkIcon from '@/components/equipe/osg/OsgWorkIcon';
import OsgProjectsIcon from '@/components/equipe/osg/OsgProjectsIcon';

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
            <Building2 className="h-4 w-4" />
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
            <AlertCircle className="h-4 w-4" />
            <span>Selecione um cliente para usar as ferramentas</span>
          </div>
        ) : (
          <div className="text-xs text-slate-600 truncate">
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
  const { signOut, user, isAdmin, isLider } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  // "Gerencial" só aparece para líder+ (isLider é estrito, não engloba admin).
  const canGerencial = isAdmin || isLider;

  // Enquanto a área OSG está montada, marca o <html> para o tema OSG sobrescrever
  // o accent teal padrão pelo verde osg-moss — alcança também menus em portal (body).
  useEffect(() => {
    document.documentElement.classList.add('osg-theme');
    return () => document.documentElement.classList.remove('osg-theme');
  }, []);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isWork = location.pathname.startsWith('/equipe/osg/work');
  const isProjects = location.pathname.startsWith('/equipe/osg/inicio')
    || location.pathname.startsWith('/equipe/osg/dashboard')
    || location.pathname.startsWith('/equipe/osg/projetos')
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

  // Itens do agrupador "Documentos" — expande no hover (e fica aberto na rota ativa)
  const docItems = [
    { path: '/equipe/osg/work/biblioteca-modelos', label: 'Biblioteca de Modelos' },
    { path: '/equipe/osg/work/montagem-documentos', label: 'Montagem de Documentos' },
    { path: '/equipe/osg/work/gerar-documento', label: 'Gerar Documento' },
  ];
  const isDocsActive = docItems.some((item) => item.path === location.pathname);

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
        className={`${collapsed ? 'w-16' : 'w-64'} transition-all duration-300 flex-shrink-0 sticky top-0 h-screen relative`}
      >
        {/* Toggle Button — sibling of <aside> so it isn't clipped by overflow */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 -right-3 z-20 h-6 w-6 rounded-full border border-slate-200 bg-background hover:bg-slate-50 text-slate-600 shadow-sm"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

        <aside className="h-full w-full bg-background border-r border-slate-200/60 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200/60">
          {collapsed ? (
            <div className="flex justify-center">
              <div className="h-10 w-10 flex items-center justify-center">
                {AreaIcon}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
                {AreaIcon}
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-lg">{areaLabel}</h2>
                <p className="text-xs text-slate-500">{areaSubtitle}</p>
              </div>
            </div>
          )}
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
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-900/5",
              location.pathname === '/equipe/osg/inicio'
                ? "bg-osg-100 text-osg-700"
                : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
            )}
          >
            <Home className="h-4 w-4" />
            {!collapsed && <span>Início</span>}
          </button>
          <button
            onClick={() => navigate('/equipe/osg/dashboard')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-900/5",
              location.pathname === '/equipe/osg/dashboard'
                ? "bg-osg-100 text-osg-700"
                : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            {!collapsed && <span>Dashboard</span>}
          </button>

          {/* Agrupador "Projetos" — expande no hover (e fica aberto na rota ativa) */}
          <div className="group/proj">
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isProjetosActive
                  ? "bg-osg-50 text-osg-700"
                  : "text-slate-600 group-hover/proj:bg-osg-50 group-hover/proj:text-osg-700"
              )}
            >
              <FolderKanban className="h-4 w-4 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span>Projetos</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 ml-auto transition-transform duration-300 ease-out",
                      isProjetosActive ? "rotate-180" : "group-hover/proj:rotate-180"
                    )}
                  />
                </>
              )}
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isProjetosActive
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
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-900/5",
                        location.pathname === path
                          ? "bg-osg-100 text-osg-700"
                          : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
                      )}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span>{label}</span>}
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
          <button
            onClick={() => navigate('/equipe/osg/work/qualificacao-das-partes')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-900/5",
              location.pathname === '/equipe/osg/work/qualificacao-das-partes'
                ? "bg-osg-100 text-osg-700"
                : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
            )}
          >
            <Users className="h-4 w-4" />
            {!collapsed && <span>Qualificação das Partes</span>}
          </button>
          <button
            onClick={() => navigate('/equipe/osg/work/diagnostico-patrimonial')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-900/5",
              location.pathname === '/equipe/osg/work/diagnostico-patrimonial'
                ? "bg-osg-100 text-osg-700"
                : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
            )}
          >
            <Landmark className="h-4 w-4" />
            {!collapsed && <span>Diagnóstico Patrimonial</span>}
          </button>
          <button
            onClick={() => navigate('/equipe/osg/work/controle-matriculas')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-900/5",
              location.pathname === '/equipe/osg/work/controle-matriculas'
                ? "bg-osg-100 text-osg-700"
                : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
            )}
          >
            <FileText className="h-4 w-4" />
            {!collapsed && <span>Controle de Matrículas</span>}
          </button>
          {/* Agrupador "Oficina de Contratos" — expande no hover com animação suave */}
          <div className="group/docs">
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isDocsActive
                  ? "bg-osg-50 text-osg-700"
                  : "text-slate-600 group-hover/docs:bg-osg-50 group-hover/docs:text-osg-700"
              )}
            >
              <FileSignature className="h-4 w-4 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span>Oficina de Contratos</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 ml-auto transition-transform duration-300 ease-out",
                      isDocsActive ? "rotate-180" : "group-hover/docs:rotate-180"
                    )}
                  />
                </>
              )}
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isDocsActive
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
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-900/5",
                        location.pathname === path
                          ? "bg-osg-100 text-osg-700"
                          : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
                      )}
                    >
                      {!collapsed && <span>{label}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/equipe/osg/work/quadro-societario')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-900/5",
              location.pathname === '/equipe/osg/work/quadro-societario'
                ? "bg-osg-100 text-osg-700"
                : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
            )}
          >
            <PieChart className="h-4 w-4" />
            {!collapsed && <span>Quadro Societário</span>}
          </button>
          {/* Agrupador "Documentos do Cliente" — expande no hover com animação suave */}
          <div className="group/docsCli">
            <button
              type="button"
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                isDocClienteActive
                  ? "bg-osg-50 text-osg-700"
                  : "text-slate-600 group-hover/docsCli:bg-osg-50 group-hover/docsCli:text-osg-700"
              )}
            >
              <FolderArchive className="h-4 w-4 flex-shrink-0" />
              {!collapsed && (
                <>
                  <span className="flex-1 min-w-0 truncate text-left">Documentos</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 flex-shrink-0 transition-transform duration-300 ease-out",
                      isDocClienteActive ? "rotate-180" : "group-hover/docsCli:rotate-180"
                    )}
                  />
                </>
              )}
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isDocClienteActive
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
                        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-900/5",
                        location.pathname === path
                          ? "bg-osg-100 text-osg-700"
                          : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
                      )}
                    >
                      {!collapsed && <span>{label}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/equipe/osg/work/relatorios')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-900/5",
              location.pathname === '/equipe/osg/work/relatorios'
                ? "bg-osg-100 text-osg-700"
                : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
            )}
          >
            <FileBarChart2 className="h-4 w-4" />
            {!collapsed && <span>Relatórios</span>}
          </button>
          </>
          )}

          {/* Gerencial — dashboard de Clientes e OS por cluster, só para líder+ */}
          {isProjects && canGerencial && (
            <button
              onClick={() => navigate('/equipe/osg/gerencial')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-900/5",
                location.pathname === '/equipe/osg/gerencial'
                  ? "bg-osg-100 text-osg-700"
                  : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
              )}
            >
              <LineChart className="h-4 w-4" />
              {!collapsed && <span>Gerencial</span>}
            </button>
          )}

          {/* Auditoria — exclusiva da área Projetos (a rota /equipe/osg/auditoria é
              classificada como Projetos, então não deve aparecer no OSG Work). */}
          {isProjects && (
            <button
              onClick={() => navigate('/equipe/osg/auditoria')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-900/5",
                location.pathname === '/equipe/osg/auditoria'
                  ? "bg-osg-100 text-osg-700"
                  : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
              )}
            >
              <Shield className="h-4 w-4" />
              {!collapsed && <span>Auditoria</span>}
            </button>
          )}

          {/* Chamados — atalho espelhado da área Tax (mesma página /equipe/chamados,
              que já escopa o filtro de cluster pelo cluster do usuário OSG). */}
          {isProjects && (
            <button
              onClick={() => navigate('/equipe/chamados')}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-osg-900/5",
                location.pathname.startsWith('/equipe/chamados')
                  ? "bg-osg-100 text-osg-700"
                  : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
              )}
            >
              <MessageSquare className="h-4 w-4" />
              {!collapsed && <span>Chamados</span>}
            </button>
          )}
        </nav>

        {/* Footer Actions */}
        <div className="mt-auto p-4 border-t border-slate-200/60 space-y-2">
          {/* User Card */}
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 mb-3">
              <div className="h-8 w-8 rounded-full bg-osg-500/10 flex items-center justify-center">
                <User className="h-4 w-4 text-osg-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.email?.split('@')[0] || 'Usuário'}
                </p>
                <p className="text-xs text-slate-500">OSG</p>
              </div>
            </div>
          )}
          
          <Button
            variant="ghost"
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-osg-600 transition-colors`}
            onClick={() => navigate('/equipe/osg')}
            title={collapsed ? 'Trocar área' : undefined}
          >
            <ArrowLeft className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Trocar área'}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-osg-600 transition-colors`}
            onClick={() => navigate('/')}
            title={collapsed ? 'Voltar ao site' : undefined}
          >
            <ArrowLeft className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Voltar ao site'}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-destructive/10 hover:text-destructive transition-colors`}
            onClick={handleSignOut}
            title={collapsed ? 'Sair' : undefined}
          >
            <LogOut className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Sair'}
          </Button>
        </div>
      </aside>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-200/60 bg-background flex items-center justify-between px-6 flex-shrink-0">
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
            <NotificationPopover
              navigateTo="/equipe/chamados"
              tasksNavigateTo="/equipe/osg/projetos/tarefas"
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
