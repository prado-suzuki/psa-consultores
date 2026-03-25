import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  LayoutDashboard,
  ArrowLeft,
  BarChart3,
  Target,
  CalendarRange,
  Crosshair,
  MessageSquareHeart,
  Users2,
  TrendingUp,
  Menu,
  Eye,
  ChevronRight,
} from 'lucide-react';

interface BoardLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

interface NavItem {
  icon: any;
  label: string;
  path: string;
  children?: { icon: any; label: string; path: string }[];
  adminOnly?: boolean;
}

const desempenhoSubItems = [
  { icon: Eye, label: 'Visao Geral', path: '/equipe/board/desempenho' },
  { icon: CalendarRange, label: 'Ciclos', path: '/equipe/board/desempenho/ciclos' },
  { icon: Crosshair, label: 'Metas', path: '/equipe/board/desempenho/metas' },
  { icon: MessageSquareHeart, label: 'Feedbacks', path: '/equipe/board/desempenho/feedbacks' },
  { icon: Users2, label: '1:1s', path: '/equipe/board/desempenho/1a1' },
  { icon: TrendingUp, label: 'Evolucao', path: '/equipe/board/desempenho/evolucao' },
];

const buildNavItems = (isAdmin: boolean, isLider: boolean): NavItem[] => [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/equipe/board/dashboard' },
  ...((isAdmin || isLider) ? [
    { icon: BarChart3, label: 'Performance', path: '/equipe/board/performance', adminOnly: true },
    { icon: Target, label: 'Desempenho', path: '/equipe/board/desempenho', adminOnly: true, children: desempenhoSubItems },
  ] : []),
];

// Breadcrumb logic
const getBreadcrumb = (pathname: string) => {
  const segments: { label: string; path: string }[] = [{ label: 'Board', path: '/equipe/board/dashboard' }];
  if (pathname.includes('/performance')) {
    segments.push({ label: 'Performance', path: '/equipe/board/performance' });
  } else if (pathname.includes('/desempenho')) {
    segments.push({ label: 'Desempenho', path: '/equipe/board/desempenho' });
    if (pathname.includes('/ciclos')) segments.push({ label: 'Ciclos', path: '/equipe/board/desempenho/ciclos' });
    else if (pathname.includes('/metas')) segments.push({ label: 'Metas', path: '/equipe/board/desempenho/metas' });
    else if (pathname.includes('/feedbacks')) segments.push({ label: 'Feedbacks', path: '/equipe/board/desempenho/feedbacks' });
    else if (pathname.includes('/1a1')) segments.push({ label: '1:1s', path: '/equipe/board/desempenho/1a1' });
    else if (pathname.includes('/evolucao')) segments.push({ label: 'Evolucao', path: '/equipe/board/desempenho/evolucao' });
  } else if (pathname.includes('/dashboard')) {
    segments.push({ label: 'Dashboard', path: '/equipe/board/dashboard' });
  }
  return segments;
};

export const BoardLayout = ({ children, title, subtitle, headerActions }: BoardLayoutProps) => {
  const { user, isAdmin, isLider } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  const navItems = buildNavItems(isAdmin, isLider);
  const isDesempenhoRoute = location.pathname.startsWith('/equipe/board/desempenho');
  const breadcrumb = getBreadcrumb(location.pathname);

  const isActive = (path: string) => {
    if (path === '/equipe/board/desempenho') return location.pathname === path;
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const isParentActive = (item: NavItem) => {
    if (isActive(item.path)) return true;
    return item.children?.some(c => isActive(c.path)) ?? false;
  };

  const firstName = user?.user_metadata?.first_name || user?.email?.split('@')[0] || 'Usuario';
  const lastName = user?.user_metadata?.last_name || '';
  const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase() || 'U';
  const role = isAdmin ? 'Admin' : isLider ? 'Lider' : 'Membro';

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <div className="flex flex-col h-full" style={{ backgroundColor: '#0F172A' }}>
      {/* Logo / System name */}
      <div className="px-5 pt-6 pb-4">
        {!collapsed && (
          <h2 className="text-base font-semibold tracking-tight" style={{ color: '#F8FAFC' }}>PSA Consultores</h2>
        )}
        {collapsed && (
          <div className="flex justify-center">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#1E293B' }}>
              <LayoutDashboard className="h-4 w-4" style={{ color: '#94A3B8' }} />
            </div>
          </div>
        )}
      </div>

      {/* User card */}
      {!collapsed && (
        <div className="mx-4 mb-5 px-3 py-2.5 rounded-lg" style={{ backgroundColor: '#1E293B' }}>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0" style={{ backgroundColor: '#6366F1', color: '#F8FAFC' }}>
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#F8FAFC' }}>{firstName} {lastName}</p>
              <p className="text-[11px]" style={{ color: '#64748B' }}>{role}</p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3">
        {/* VISAO GERAL group */}
        <div className="mb-4">
          {!collapsed && (
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#475569' }}>
              Visao Geral
            </p>
          )}
          {navItems.filter(i => !i.adminOnly).map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}`}
              style={{
                backgroundColor: isActive(item.path) ? '#1E293B' : 'transparent',
                color: isActive(item.path) ? '#F8FAFC' : '#94A3B8',
              }}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>

        {/* GERENCIAL group */}
        {(isAdmin || isLider) && (
          <div className="mb-4">
            {!collapsed && (
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-[0.08em]" style={{ color: '#475569' }}>
                Gerencial
              </p>
            )}
            {navItems.filter(i => i.adminOnly).map((item) => (
              <div key={item.path}>
                <button
                  onClick={() => { navigate(item.path); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 ${collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5'}`}
                  style={{
                    backgroundColor: isParentActive(item) ? '#1E293B' : 'transparent',
                    color: isParentActive(item) ? '#F8FAFC' : '#94A3B8',
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                  {!collapsed && item.children && (
                    <ChevronRight className={`h-3 w-3 transition-transform ${isDesempenhoRoute ? 'rotate-90' : ''}`} style={{ color: '#475569' }} />
                  )}
                </button>
                {/* Sub-items */}
                {!collapsed && item.children && isDesempenhoRoute && (
                  <div className="ml-4 mt-0.5 space-y-0.5">
                    {item.children.map((sub) => (
                      <button
                        key={sub.path}
                        onClick={() => { navigate(sub.path); setMobileOpen(false); }}
                        className="w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-all duration-200 px-3 py-2 relative"
                        style={{
                          color: isActive(sub.path) ? '#F8FAFC' : '#94A3B8',
                          backgroundColor: isActive(sub.path) ? '#1E293B' : 'transparent',
                        }}
                      >
                        {isActive(sub.path) && (
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r" style={{ backgroundColor: '#6366F1' }} />
                        )}
                        <sub.icon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{sub.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 pb-5 pt-3" style={{ borderTop: '1px solid #1E293B' }}>
        <button
          onClick={() => navigate('/equipe/')}
          className="w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-200 px-3 py-2.5"
          style={{ color: '#94A3B8' }}
        >
          <ArrowLeft className="h-4 w-4" />
          {!collapsed && <span>Voltar ao Portal</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex w-full" style={{ backgroundColor: '#F8FAFC' }}>
      {/* Desktop sidebar (>=1280px) */}
      <aside className="hidden xl:flex flex-col flex-shrink-0 w-[240px] fixed top-0 left-0 h-screen z-30">
        <SidebarContent />
      </aside>

      {/* Tablet sidebar (768-1279px) — collapsed, expands on hover */}
      <aside
        className="hidden md:flex xl:hidden flex-col flex-shrink-0 fixed top-0 left-0 h-screen z-30 transition-all duration-300"
        style={{ width: hovered ? 240 : 64 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <SidebarContent collapsed={!hovered} />
      </aside>

      {/* Mobile sidebar (drawer) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[260px] border-0" style={{ backgroundColor: '#0F172A' }}>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden xl:ml-[240px] md:ml-[64px] ml-0">
        {/* Header */}
        <header className="h-16 flex items-center justify-between px-4 md:px-6 lg:px-8 flex-shrink-0 bg-white" style={{ borderBottom: '1px solid #E2E8F0' }}>
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              style={{ color: '#64748B' }}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              {/* Breadcrumb */}
              <div className="flex items-center gap-1 text-[12px]" style={{ color: '#94A3B8' }}>
                {breadcrumb.map((b, i) => (
                  <span key={b.path} className="flex items-center gap-1">
                    {i > 0 && <span>/</span>}
                    <button onClick={() => navigate(b.path)} className="hover:underline">{b.label}</button>
                  </span>
                ))}
              </div>
              <h1 className="text-lg font-semibold" style={{ color: '#0F172A' }}>{title}</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {headerActions}
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BoardLayout;
