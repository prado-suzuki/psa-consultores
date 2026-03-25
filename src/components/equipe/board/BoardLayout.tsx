import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent } from '@/components/ui/sheet';
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
  CheckCircle,
  FileText,
  User,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
  children?: { icon: any; label: string; path: string; badge?: number }[];
  adminOnly?: boolean;
  badge?: number | 'amber';
}

const buildDesempenhoSubItems = (pendingDecisions: number) => [
  { icon: Eye, label: 'Visao Geral', path: '/equipe/board/desempenho' },
  { icon: CalendarRange, label: 'Ciclos', path: '/equipe/board/desempenho/ciclos' },
  { icon: Crosshair, label: 'Metas e PPR', path: '/equipe/board/desempenho/metas' },
  { icon: CheckCircle, label: 'Decisoes', path: '/equipe/board/desempenho/decisoes', badge: pendingDecisions },
  { icon: FileText, label: 'Relatorios', path: '/equipe/board/desempenho/relatorios' },
  { icon: TrendingUp, label: 'Evolucao', path: '/equipe/board/desempenho/evolucao' },
  { icon: MessageSquareHeart, label: 'Feedbacks', path: '/equipe/board/desempenho/feedbacks' },
  { icon: Users2, label: '1:1s', path: '/equipe/board/desempenho/1a1' },
];

const buildNavItems = (isAdmin: boolean, isLider: boolean, pendingDecisions: number): NavItem[] => [
  { icon: LayoutDashboard, label: 'Dashboard Estrategico', path: '/equipe/board/dashboard' },
  ...((isAdmin || isLider) ? [
    { icon: BarChart3, label: 'Performance', path: '/equipe/board/performance', adminOnly: true },
    { icon: Target, label: 'Desempenho', path: '/equipe/board/desempenho', adminOnly: true, children: buildDesempenhoSubItems(pendingDecisions) },
  ] : []),
];

const getBreadcrumb = (pathname: string) => {
  const segments: { label: string; path: string }[] = [{ label: 'Board', path: '/equipe/board' }];
  if (pathname.includes('/performance')) {
    segments.push({ label: 'Performance', path: '/equipe/board/performance' });
  } else if (pathname.includes('/desempenho')) {
    segments.push({ label: 'Desempenho', path: '/equipe/board/desempenho' });
    if (pathname.includes('/ciclos')) segments.push({ label: 'Ciclos', path: '/equipe/board/desempenho/ciclos' });
    else if (pathname.includes('/metas')) segments.push({ label: 'Metas e PPR', path: '/equipe/board/desempenho/metas' });
    else if (pathname.includes('/decisoes')) segments.push({ label: 'Decisoes', path: '/equipe/board/desempenho/decisoes' });
    else if (pathname.includes('/relatorios')) segments.push({ label: 'Relatorios', path: '/equipe/board/desempenho/relatorios' });
    else if (pathname.includes('/feedbacks')) segments.push({ label: 'Feedbacks', path: '/equipe/board/desempenho/feedbacks' });
    else if (pathname.includes('/1a1')) segments.push({ label: '1:1s', path: '/equipe/board/desempenho/1a1' });
    else if (pathname.includes('/minha-evolucao')) segments.push({ label: 'Minha Evolucao', path: '/equipe/board/desempenho/minha-evolucao' });
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

  // Count pending decisions for badge
  const { data: pendingDecisions = 0 } = useQuery({
    queryKey: ['pending-decisions-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('metas' as any)
        .select('*', { count: 'exact', head: true })
        .eq('nivel', 'individual')
        .is('recomendacao_decisao', null)
        .eq('status', 'ativa');
      return count ?? 0;
    },
    enabled: isAdmin || isLider,
    staleTime: 5 * 60 * 1000,
  });

  // Check unread leader comments for "Minha Evolucao" badge
  const { data: hasUnreadOrOverdue = false } = useQuery({
    queryKey: ['minha-evolucao-badge', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data: unread } = await supabase
        .from('comentarios_avaliacao' as any)
        .select('id')
        .eq('destinatario_id', user.id)
        .eq('tipo', 'lider_para_membro')
        .eq('lido', false)
        .limit(1);
      if (unread?.length) return true;
      const { data: overdue } = await supabase
        .from('metas' as any)
        .select('id')
        .eq('responsavel_id', user.id)
        .eq('nivel', 'individual')
        .eq('status', 'ativa')
        .lt('prazo', new Date().toISOString().split('T')[0])
        .lt('progresso_atual', 100)
        .limit(1);
      return (overdue?.length ?? 0) > 0;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const navItems = buildNavItems(isAdmin, isLider, pendingDecisions);
  const isDesempenhoRoute = location.pathname.startsWith('/equipe/board/desempenho');
  const isMiEvolucaoRoute = location.pathname.includes('/minha-evolucao');
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
    <div className="flex flex-col h-full relative overflow-hidden" style={{ backgroundColor: 'var(--board-sb)' }}>
      {/* Radial gradient decoration */}
      <div className="absolute bottom-[-60px] left-[-40px] w-[180px] h-[180px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(91,110,240,.15) 0%, transparent 70%)' }} />

      {/* Brand + User */}
      <div className="px-[18px] pt-[22px] pb-[18px]" style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        {!collapsed ? (
          <>
            <div className="flex items-center gap-[9px] mb-[18px]">
              <div className="w-7 h-7 rounded-[7px] flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--board-indigo)' }}>
                <LayoutDashboard className="h-3.5 w-3.5 text-white" />
              </div>
              <span className="text-[15px] font-bold tracking-[-0.01em]" style={{ fontFamily: "'Syne', sans-serif", color: 'var(--board-sb-txt-a)' }}>PSA Board</span>
            </div>
            <div className="flex items-center gap-[9px]">
              <div className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0" style={{ background: 'linear-gradient(135deg, #5B6EF0, #8054F0)' }}>
                {initials}
              </div>
              <div>
                <p className="text-[12.5px] font-medium" style={{ color: '#C8D6EC' }}>{firstName} {lastName}</p>
                <p className="text-[10.5px]" style={{ color: 'var(--board-sb-txt)' }}>{role}</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex justify-center">
            <div className="w-7 h-7 rounded-[7px] flex items-center justify-center" style={{ backgroundColor: 'var(--board-indigo)' }}>
              <LayoutDashboard className="h-3.5 w-3.5 text-white" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-[14px]">
        {/* DIRETORIA group */}
        <div className="mb-5">
          {!collapsed && (
            <p className="px-2 mb-[5px] text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--board-sb-grp)' }}>
              Diretoria
            </p>
          )}
          {navItems.filter(i => !i.adminOnly).map((item) => (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); setMobileOpen(false); }}
              className={`w-full flex items-center gap-[9px] rounded-lg text-[13px] font-[450] transition-all duration-150 relative mb-px ${collapsed ? 'justify-center px-2 py-[7px]' : 'px-[10px] py-[7px]'}`}
              style={{
                backgroundColor: isActive(item.path) ? 'var(--board-sb-active)' : 'transparent',
                color: isActive(item.path) ? 'var(--board-sb-txt-a)' : 'var(--board-sb-txt)',
                fontWeight: isActive(item.path) ? 500 : 450,
              }}
              title={collapsed ? item.label : undefined}
            >
              {isActive(item.path) && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r" style={{ backgroundColor: 'var(--board-indigo)' }} />
              )}
              <item.icon className="h-[15px] w-[15px] flex-shrink-0" style={{ opacity: isActive(item.path) ? 1 : 0.75 }} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          ))}
        </div>

        {/* GERENCIAL group */}
        {(isAdmin || isLider) && (
          <div className="mb-5">
            {!collapsed && (
              <p className="px-2 mb-[5px] text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--board-sb-grp)' }}>
                Gerencial
              </p>
            )}
            {navItems.filter(i => i.adminOnly).map((item) => (
              <div key={item.path}>
                <button
                  onClick={() => { navigate(item.path); setMobileOpen(false); }}
                  className={`w-full flex items-center gap-[9px] rounded-lg text-[13px] font-[450] transition-all duration-150 relative mb-px ${collapsed ? 'justify-center px-2 py-[7px]' : 'px-[10px] py-[7px]'}`}
                  style={{
                    backgroundColor: isParentActive(item) ? 'var(--board-sb-active)' : 'transparent',
                    color: isParentActive(item) ? 'var(--board-sb-txt-a)' : 'var(--board-sb-txt)',
                    fontWeight: isParentActive(item) ? 500 : 450,
                  }}
                  title={collapsed ? item.label : undefined}
                >
                  {isParentActive(item) && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r" style={{ backgroundColor: 'var(--board-indigo)' }} />
                  )}
                  <item.icon className="h-[15px] w-[15px] flex-shrink-0" style={{ opacity: isParentActive(item) ? 1 : 0.75 }} />
                  {!collapsed && <span className="flex-1 text-left">{item.label}</span>}
                  {!collapsed && item.children && (
                    <ChevronRight className={`h-3 w-3 transition-transform ${isDesempenhoRoute ? 'rotate-90' : ''}`} style={{ color: 'var(--board-sb-grp)' }} />
                  )}
                </button>
                {/* Sub-items */}
                {!collapsed && item.children && isDesempenhoRoute && (
                  <div className="ml-6 mt-0.5 pl-[10px]" style={{ borderLeft: '1px solid rgba(255,255,255,.08)' }}>
                    {item.children.map((sub) => (
                      <button
                        key={sub.path}
                        onClick={() => { navigate(sub.path); setMobileOpen(false); }}
                        className="w-full flex items-center gap-[9px] rounded-lg text-[12.5px] font-[450] transition-all duration-150 px-2 py-[5px] relative mb-px"
                        style={{
                          color: isActive(sub.path) ? 'var(--board-sb-txt-a)' : 'var(--board-sb-txt)',
                          fontWeight: isActive(sub.path) ? 500 : 450,
                          backgroundColor: isActive(sub.path) ? 'var(--board-sb-active)' : 'transparent',
                        }}
                      >
                        {isActive(sub.path) && (
                          <div className="absolute left-[-11px] top-1/2 -translate-y-1/2 w-[3px] h-3 rounded-r" style={{ backgroundColor: 'var(--board-indigo)' }} />
                        )}
                        <sub.icon className="h-[14px] w-[14px] flex-shrink-0" style={{ opacity: isActive(sub.path) ? 1 : 0.75 }} />
                        <span className="flex-1 text-left">{sub.label}</span>
                        {sub.badge !== undefined && sub.badge > 0 && (
                          <span className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: 'var(--board-red)' }}>
                            {sub.badge}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* MINHA AREA group */}
        <div className="mb-5">
          {!collapsed && (
            <p className="px-2 mb-[5px] text-[9.5px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--board-sb-grp)' }}>
              Minha Area
            </p>
          )}
          <button
            onClick={() => { navigate('/equipe/board/desempenho/minha-evolucao'); setMobileOpen(false); }}
            className={`w-full flex items-center gap-[9px] rounded-lg text-[13px] font-[450] transition-all duration-150 relative mb-px ${collapsed ? 'justify-center px-2 py-[7px]' : 'px-[10px] py-[7px]'}`}
            style={{
              backgroundColor: isMiEvolucaoRoute ? 'var(--board-sb-active)' : 'transparent',
              color: isMiEvolucaoRoute ? 'var(--board-sb-txt-a)' : 'var(--board-sb-txt)',
              fontWeight: isMiEvolucaoRoute ? 500 : 450,
            }}
            title={collapsed ? 'Minha Evolucao' : undefined}
          >
            {isMiEvolucaoRoute && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r" style={{ backgroundColor: 'var(--board-indigo)' }} />
            )}
            <User className="h-[15px] w-[15px] flex-shrink-0" style={{ opacity: isMiEvolucaoRoute ? 1 : 0.75 }} />
            {!collapsed && <span className="flex-1 text-left">Minha Evolucao</span>}
            {!collapsed && hasUnreadOrOverdue && (
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--board-amber)' }} />
            )}
          </button>
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="px-3 pb-[14px] pt-[14px]" style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
        <button
          onClick={() => navigate('/equipe/')}
          className="w-full flex items-center gap-2 rounded-lg text-[12.5px] transition-all duration-150 px-[10px] py-[7px]"
          style={{ color: 'var(--board-sb-txt)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--board-sb-hover)'; (e.currentTarget as HTMLElement).style.color = '#A8BADA'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--board-sb-txt)'; }}
        >
          <ArrowLeft className="h-[14px] w-[14px]" />
          {!collapsed && <span>Voltar ao Portal</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex w-full" style={{ backgroundColor: 'var(--board-bg)' }}>
      {/* Desktop sidebar (>=1280px) */}
      <aside className="hidden xl:flex flex-col flex-shrink-0 w-[232px] fixed top-0 left-0 h-screen z-30">
        <SidebarContent />
      </aside>

      {/* Tablet sidebar (768-1279px) */}
      <aside
        className="hidden md:flex xl:hidden flex-col flex-shrink-0 fixed top-0 left-0 h-screen z-30 transition-all duration-300"
        style={{ width: hovered ? 232 : 64 }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <SidebarContent collapsed={!hovered} />
      </aside>

      {/* Mobile sidebar (drawer) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[260px] border-0" style={{ backgroundColor: 'var(--board-sb)' }}>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden xl:ml-[232px] md:ml-[64px] ml-0">
        {/* Topbar — 52px */}
        <header className="h-[52px] min-h-[52px] flex items-center px-6 gap-[14px] flex-shrink-0" style={{ backgroundColor: 'var(--board-card)', borderBottom: '1px solid var(--board-border)' }}>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileOpen(true)}
              style={{ color: 'var(--board-t3)' }}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <div className="flex items-center gap-[6px] text-[12px]" style={{ color: 'var(--board-t3)' }}>
                {breadcrumb.map((b, i) => (
                  <span key={b.path} className="flex items-center gap-[6px]">
                    {i > 0 && <span style={{ color: 'var(--board-border)' }}>/</span>}
                    {i === breadcrumb.length - 1 ? (
                      <span className="text-[12.5px] font-medium" style={{ color: 'var(--board-t1)' }}>{b.label}</span>
                    ) : (
                      <button onClick={() => navigate(b.path)} className="hover:underline">{b.label}</button>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            {headerActions}
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-[22px] md:p-6 lg:p-6">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default BoardLayout;
