import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  ArrowLeft,
  LayoutDashboard,
  Newspaper,
  MessageSquare
} from 'lucide-react';

interface GestaoLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

interface NavItem {
  icon: any;
  label: string;
  path: string;
}

const navItems: NavItem[] = [
  { icon: Newspaper, label: 'Novidades', path: '/gestao' },
  { icon: MessageSquare, label: 'Chamados', path: '/gestao/chamados' },
];

export const GestaoLayout = ({ children, title, subtitle, headerActions }: GestaoLayoutProps) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-white flex w-full">
      {/* Sidebar */}
      <aside 
        className={`${collapsed ? 'w-16' : 'w-60'} bg-slate-900 flex flex-col transition-all duration-300 flex-shrink-0`}
      >
        {/* Header */}
        <div className={`p-3 border-b border-slate-800 flex items-center ${collapsed ? 'justify-center' : 'justify-center'}`}>
          {collapsed ? (
            <LayoutDashboard className="h-8 w-8 text-primary" />
          ) : (
            <div className="flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-1">
                <LayoutDashboard className="h-6 w-6 text-primary" />
                <h1 className="text-white font-semibold text-sm">Gestão</h1>
              </div>
              <p className="text-xs text-slate-500">Painel de Controle</p>
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 left-[calc(var(--sidebar-width)-12px)] z-10 h-6 w-6 rounded-full border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300"
          style={{ '--sidebar-width': collapsed ? '64px' : '240px' } as React.CSSProperties}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "secondary" : "ghost"}
              className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start'} ${
                isActive(item.path) 
                  ? 'bg-primary/20 text-primary hover:bg-primary/30' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              onClick={() => navigate(item.path)}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
              {!collapsed && item.label}
            </Button>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-2 border-t border-slate-800 space-y-1">
          <Button 
            variant="ghost" 
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start'} text-slate-500 hover:text-white hover:bg-slate-800`}
            onClick={() => navigate('/equipe')}
            title={collapsed ? 'Trocar área' : undefined}
          >
            <ArrowLeft className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Trocar área'}
          </Button>
          <Button 
            variant="ghost" 
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start'} text-slate-500 hover:text-red-400 hover:bg-red-500/10`}
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
          <div className="p-6">
            {children}
          </div>
        </ScrollArea>
      </main>
    </div>
  );
};

export default GestaoLayout;
