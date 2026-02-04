import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FolderKanban,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  ArrowLeft,
  User,
  LayoutDashboard,
  ListTodo
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProjetosLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

const navItems = [
  { path: '/equipe/projetos/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { path: '/equipe/projetos/demandas', label: 'Demandas', icon: ListTodo },
];

export const ProjetosLayout = ({ children, title, subtitle, headerActions }: ProjetosLayoutProps) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => location.pathname === path;

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
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <FolderKanban className="h-5 w-5 text-violet-600" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center flex-shrink-0">
                <FolderKanban className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900 text-lg">Projetos</h2>
                <p className="text-xs text-slate-500">Área de Projetos</p>
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
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active
                    ? 'bg-violet-100 text-violet-900'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200/60 space-y-2">
          {/* User Card */}
          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50 mb-3">
              <div className="h-8 w-8 rounded-full bg-violet-500/10 flex items-center justify-center">
                <User className="h-4 w-4 text-violet-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {user?.email?.split('@')[0] || 'Usuário'}
                </p>
                <p className="text-xs text-slate-500">Projetos</p>
              </div>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition-colors`}
            onClick={() => navigate('/equipe')}
            title={collapsed ? 'Trocar área' : undefined}
          >
            <ArrowLeft className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Trocar área'}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-violet-600 transition-colors`}
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
            {headerActions}
          </div>
        </header>

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

export default ProjetosLayout;
