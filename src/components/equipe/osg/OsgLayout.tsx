import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Briefcase,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  ArrowLeft,
  User,
  Shield,
  Users,
  Landmark,
  FileText,
  Building2,
  AlertCircle,
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
                  ? 'border-2 border-osg-300 ring-2 ring-osg-100 bg-white'
                  : 'border-osg-200 bg-white',
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
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

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
  const isProjects = location.pathname.startsWith('/equipe/osg/dashboard');

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
    <div className="min-h-screen bg-slate-50 flex w-full">
      {/* Sidebar wrapper — keeps toggle button outside the scroll container */}
      <div
        className={`${collapsed ? 'w-16' : 'w-64'} transition-all duration-300 flex-shrink-0 sticky top-0 h-screen relative`}
      >
        {/* Toggle Button — sibling of <aside> so it isn't clipped by overflow */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 -right-3 z-20 h-6 w-6 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

        <aside className="h-full w-full bg-white border-r border-slate-200/60 flex flex-col overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200/60">
          {collapsed ? (
            <div className="flex justify-center">
              <div className="h-10 w-10 rounded-xl bg-osg-500/10 flex items-center justify-center overflow-hidden">
                {AreaIcon}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-osg-500/10 flex items-center justify-center flex-shrink-0 overflow-hidden">
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
          <button
            onClick={() => navigate('/equipe/osg/work/quadro-societario')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              location.pathname === '/equipe/osg/work/quadro-societario'
                ? "bg-osg-100 text-osg-700"
                : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
            )}
          >
            <Users className="h-4 w-4" />
            {!collapsed && <span>Quadro Societário</span>}
          </button>
          <button
            onClick={() => navigate('/equipe/osg/work/diagnostico-patrimonial')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
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
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              location.pathname === '/equipe/osg/work/controle-matriculas'
                ? "bg-osg-100 text-osg-700"
                : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
            )}
          >
            <FileText className="h-4 w-4" />
            {!collapsed && <span>Controle de Matrículas</span>}
          </button>
          <button
            onClick={() => navigate('/equipe/osg/auditoria')}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              location.pathname === '/equipe/osg/auditoria'
                ? "bg-osg-100 text-osg-700"
                : "text-slate-600 hover:bg-osg-50 hover:text-osg-700"
            )}
          >
            <Shield className="h-4 w-4" />
            {!collapsed && <span>Auditoria</span>}
          </button>
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
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors`}
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
        <header className="h-16 border-b border-slate-200/60 bg-white flex items-center justify-between px-6 flex-shrink-0">
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
