import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NotificationPopover } from '@/components/notifications/NotificationPopover';
import { PendingTicketsAlert } from '@/components/notifications/PendingTicketsAlert';
import { 
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  ArrowLeft,
  LayoutDashboard,
  Newspaper,
  MessageSquare,
  Users,
  User,
  MessageCircle,
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

export const GestaoLayout = ({ children, title, subtitle, headerActions }: GestaoLayoutProps) => {
  const { signOut, user, isAdmin, isLider } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const navItems: NavItem[] = [
    { icon: Newspaper, label: 'Novidades', path: '/gestao' },
    { icon: MessageSquare, label: 'Chamados', path: '/gestao/chamados' },
    { icon: Users, label: 'Contatos', path: '/gestao/contatos' },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-slate-50 flex w-full">
      {/* Sidebar */}
      <aside
        className={`${collapsed ? 'w-16' : 'w-64'} bg-white border-r border-slate-200/60 flex flex-col transition-all duration-300 flex-shrink-0 sticky top-0 h-screen overflow-y-auto`}
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
                <h2 className="font-semibold text-slate-900 text-lg">Gestão</h2>
                <p className="text-xs text-slate-500">Painel de Controle</p>
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
        <nav className="p-4 space-y-1">
          {navItems.map((item) => (
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
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="mt-auto p-4 border-t border-slate-200/60 space-y-2">
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
                <p className="text-xs text-slate-500">Gestão</p>
              </div>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            className={`w-full ${collapsed ? 'justify-center px-2' : 'justify-start px-3'} py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-teal-600 transition-colors`}
            onClick={() => navigate('/equipe')}
            title={collapsed ? 'Trocar área' : undefined}
          >
            <ArrowLeft className={`h-4 w-4 ${collapsed ? '' : 'mr-3'}`} />
            {!collapsed && 'Trocar área'}
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
              onClick={() => navigate('/gestao/chamados')}
              title="Ver Chamados"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <NotificationPopover navigateTo="/gestao/chamados" />
            {headerActions}
          </div>
        </header>

        {/* Pending Tickets Alert */}
        <PendingTicketsAlert navigateTo="/gestao/chamados" />

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
