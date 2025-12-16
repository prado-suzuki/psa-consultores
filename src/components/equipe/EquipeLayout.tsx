import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Users,
  Workflow,
  Library,
  Settings,
  ArrowLeft
} from 'lucide-react';
import logoDark from '@/assets/logo-psa-dark.png';

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
  { icon: ClipboardList, label: 'Demandas', path: '/equipe/demandas' },
  { 
    icon: FolderKanban, 
    label: 'Projetos', 
    path: '/equipe/projetos',
    children: [
      { icon: Workflow, label: 'Processos', path: '/equipe/processos' },
      { icon: Kanban, label: 'Kanban', path: '/equipe/kanban' },
      { icon: Calendar, label: 'Sprints', path: '/equipe/sprints' },
      { icon: MessageSquare, label: 'Daily', path: '/equipe/daily' },
    ]
  },
  { icon: Library, label: 'Biblioteca', path: '/equipe/biblioteca' },
];

const adminItems: NavItem[] = [
  { 
    icon: Settings, 
    label: 'Administrador', 
    path: '/equipe/admin',
    children: [
      { icon: Users, label: 'Usuários', path: '/equipe/usuarios' },
    ]
  },
];

export const EquipeLayout = ({ children, title, subtitle, headerActions, fullWidth = false }: EquipeLayoutProps) => {
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [adminOpen, setAdminOpen] = useState(true);

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
    <div className="min-h-screen bg-white flex w-full">
      {/* Sidebar */}
      <aside 
        className={`${collapsed ? 'w-16' : 'w-60'} bg-gray-50 border-r border-gray-200 flex flex-col transition-all duration-300 flex-shrink-0`}
      >
        {/* Header */}
        <div className={`p-3 border-b border-gray-200 flex items-center ${collapsed ? 'justify-center' : 'justify-center'}`}>
          {collapsed ? (
            <img src={logoDark} alt="PSA" className="h-8" />
          ) : (
            <div className="flex flex-col items-center text-center">
              <img src={logoDark} alt="PSA" className="h-8 mb-1" />
              <h1 className="text-gray-900 font-semibold text-sm">Equipe PSA</h1>
              <p className="text-xs text-gray-500">Gestão de Demandas</p>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 left-[calc(var(--sidebar-width)-12px)] z-10 h-6 w-6 rounded-full border border-gray-200 bg-white hover:bg-gray-100 shadow-sm"
          style={{ '--sidebar-width': collapsed ? '64px' : '240px' } as React.CSSProperties}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            item.children ? (
              <Collapsible 
                key={item.path} 
                open={projectsOpen && !collapsed} 
                onOpenChange={setProjectsOpen}
              >
                <div className="flex items-center gap-1">
                  <Button
                    variant={isActive(item.path) || isChildActive(item.children) ? "secondary" : "ghost"}
                    className={`flex-1 ${collapsed ? 'justify-center px-2' : 'justify-start'} ${
                      isActive(item.path) || isChildActive(item.children)
                        ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
                        className="h-8 w-8 text-gray-400 hover:text-gray-600"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${projectsOpen ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                  )}
                </div>
                {!collapsed && (
                  <CollapsibleContent className="pl-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Button
                        key={child.path}
                        variant={isActive(child.path) ? "secondary" : "ghost"}
                        className={`w-full justify-start ${
                          isActive(child.path) 
                            ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
                variant={isActive(item.path) ? "secondary" : "ghost"}
                className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start'} ${
                  isActive(item.path) 
                    ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
                {!collapsed && item.label}
              </Button>
            )
          ))}

          {/* Admin Section - only visible to admins */}
          {isAdmin && adminItems.map((item) => (
            item.children ? (
              <Collapsible 
                key={item.path} 
                open={adminOpen && !collapsed} 
                onOpenChange={setAdminOpen}
              >
                <div className="flex items-center gap-1 mt-4 pt-4 border-t border-gray-200">
                  <Button
                    variant={isActive(item.path) || isChildActive(item.children) ? "secondary" : "ghost"}
                    className={`flex-1 ${collapsed ? 'justify-center px-2' : 'justify-start'} ${
                      isActive(item.path) || isChildActive(item.children)
                        ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                    onClick={() => item.children && navigate(item.children[0].path)}
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
                        className="h-8 w-8 text-gray-400 hover:text-gray-600"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform ${adminOpen ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                  )}
                </div>
                {!collapsed && (
                  <CollapsibleContent className="pl-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <Button
                        key={child.path}
                        variant={isActive(child.path) ? "secondary" : "ghost"}
                        className={`w-full justify-start ${
                          isActive(child.path) 
                            ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
                variant={isActive(item.path) ? "secondary" : "ghost"}
                className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start'} ${
                  isActive(item.path) 
                    ? 'bg-primary/10 text-primary hover:bg-primary/20' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
                {!collapsed && item.label}
              </Button>
            )
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-2 border-t border-gray-200 space-y-1">
          <Button 
            variant="ghost" 
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start'} text-gray-500 hover:text-gray-700 hover:bg-gray-100`}
            onClick={() => navigate('/')}
            title={collapsed ? 'Voltar ao site' : undefined}
          >
            <ArrowLeft className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Voltar ao site'}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start'} text-gray-500 hover:text-red-600 hover:bg-red-50`}
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
        <header className="h-16 border-b border-gray-200 bg-white flex items-center justify-between px-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-600"
              onClick={() => setCollapsed(!collapsed)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
          {headerActions && (
            <div className="flex items-center gap-3">
              {headerActions}
            </div>
          )}
        </header>

        {/* Scrollable Content Area */}
        <ScrollArea className="flex-1">
          <div className={`p-6 ${fullWidth ? 'w-full' : 'min-w-[800px]'}`}>
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
};

export default EquipeLayout;