import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
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
   User,
   FileBarChart,
   RefreshCw
} from 'lucide-react';

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
  { icon: LayoutDashboard, label: 'Dashboard', path: '/equipe/dashboard' },
   { icon: FileBarChart, label: 'Relatórios', path: '/equipe/relatorios' },
  { 
    icon: FolderKanban, 
    label: 'Projetos', 
    path: '/equipe/projetos',
    children: [
      { icon: Workflow, label: 'Processos', path: '/equipe/processos' },
      { icon: Kanban, label: 'Kanban', path: '/equipe/kanban' },
      { icon: Calendar, label: 'Sprints', path: '/equipe/sprints' },
      { icon: Layers, label: 'Backlog', path: '/equipe/backlog' },
      { icon: MessageSquare, label: 'Daily', path: '/equipe/daily' },
      { icon: RefreshCw, label: 'Rotinas', path: '/equipe/rotinas' },
    ]
  },
  // { icon: Library, label: 'Biblioteca', path: '/equipe/biblioteca' }, // Temporariamente oculto
];

export const EquipeLayout = ({ children, title, subtitle, headerActions, fullWidth = false }: EquipeLayoutProps) => {
  const { signOut, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(true);

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
    <div className="min-h-screen bg-slate-50 flex w-full">
      {/* Sidebar */}
      <aside 
        className={`${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-slate-200/60 flex flex-col transition-all duration-300 flex-shrink-0`}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200/60">
          {collapsed ? (
            <div className="flex justify-center">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center">
                <LayoutDashboard className="h-5 w-5 text-teal-600" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center flex-shrink-0">
                <LayoutDashboard className="h-5 w-5 text-teal-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-lg">Digital Rotina</h2>
                <p className="text-xs text-slate-500">Gestão de Projetos</p>
              </div>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-6 left-[calc(var(--sidebar-width)-12px)] z-10 h-6 w-6 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 shadow-sm"
          style={{ '--sidebar-width': collapsed ? '64px' : '256px' } as React.CSSProperties}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            item.children ? (
              <Collapsible 
                key={item.path} 
                open={projectsOpen && !collapsed} 
                onOpenChange={setProjectsOpen}
              >
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    className={`flex-1 ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.path) || isChildActive(item.children)
                        ? 'bg-teal-500/10 text-teal-700 hover:bg-teal-500/15' 
                        : 'text-slate-700 hover:bg-slate-50 hover:text-teal-600'
                    }`}
                    onClick={() => navigate(item.path)}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
                    {!collapsed && item.label}
                  </Button>
                  {!collapsed && (
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-500 hover:text-slate-700 hover:bg-slate-50"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${projectsOpen ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                  )}
                </div>
                {!collapsed && (
                  <CollapsibleContent className="mt-1 ml-4 space-y-1 border-l border-slate-200/60 pl-3">
                    {item.children.map((child) => (
                      <Button
                        key={child.path}
                        variant="ghost"
                        className={`w-full justify-start px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isActive(child.path) 
                            ? 'bg-teal-500/10 text-teal-700 hover:bg-teal-500/15' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-teal-600'
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
                className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(item.path) 
                    ? 'bg-teal-500/10 text-teal-700 hover:bg-teal-500/15' 
                    : 'text-slate-700 hover:bg-slate-50 hover:text-teal-600'
                }`}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
                {!collapsed && item.label}
              </Button>
            )
          ))}
          
          {/* Admin-only: Cadastros */}
          {isAdmin && (
            <Button
              variant="ghost"
              className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive('/equipe/cadastros')
                  ? 'bg-teal-500/10 text-teal-700 hover:bg-teal-500/15' 
                  : 'text-slate-700 hover:bg-slate-50 hover:text-teal-600'
              }`}
              onClick={() => navigate('/equipe/cadastros')}
              title={collapsed ? 'Cadastros' : undefined}
            >
              <Settings className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
              {!collapsed && 'Cadastros'}
            </Button>
          )}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200/60 space-y-2">
          {/* User Card */}
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 mb-3">
              <div className="h-8 w-8 rounded-full bg-teal-500/10 flex items-center justify-center">
                <User className="h-4 w-4 text-teal-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.email?.split('@')[0] || 'Usuário'}
                </p>
                <p className="text-xs text-slate-500">Digital Rotina</p>
              </div>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-teal-600 transition-colors`}
            onClick={() => navigate('/equipe/digital')}
            title={collapsed ? 'Trocar área' : undefined}
          >
            <ArrowLeft className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Trocar área'}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-teal-600 transition-colors`}
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
            <Button
              variant="ghost"
              size="icon"
              className="relative text-slate-600 hover:text-teal-600 hover:bg-slate-50"
              onClick={() => navigate('/equipe/chamados')}
              title="Ver Chamados"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
            <NotificationPopover navigateTo="/equipe/chamados" />
            {headerActions}
          </div>
        </header>

        {/* Pending Tickets Alert */}
        <PendingTicketsAlert navigateTo="/equipe/chamados" />

        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
};

export default EquipeLayout;
