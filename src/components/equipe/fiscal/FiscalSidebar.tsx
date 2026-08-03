import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ClipboardList,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  MessageSquare,
  MessagesSquare,
  ArrowLeft,
  LogOut,
  Shield,
  Home,
  LineChart,
  User,
} from 'lucide-react';
import logoPsa from '@/assets/logo-psa.png';
import TaxIcon from '@/components/equipe/fiscal/TaxIcon';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  /** Item visível apenas para líder ou admin (área Gerencial). */
  requiresLider?: boolean;
  children?: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
  }[];
}

const menuItems: MenuItem[] = [
  {
    id: 'inicio',
    label: 'Início',
    icon: Home,
    path: '/equipe/tax'
  },
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/equipe/tax/dashboard'
  },
  {
    id: 'projetos',
    label: 'Projetos',
    icon: FolderKanban,
    children: [
      {
        id: 'clientes',
        label: 'Clientes',
        icon: ClipboardList,
        path: '/equipe/tax/projetos/clientes'
      },
      {
        id: 'projetos-tarefas',
        label: 'Projetos e tarefas',
        icon: FolderKanban,
        path: '/equipe/tax/projetos/cadastro'
      },
      {
        id: 'feed',
        label: 'Feed',
        icon: MessagesSquare,
        path: '/equipe/tax/projetos/feed'
      }
    ]
  },
  {
    id: 'gerencial',
    label: 'Gerencial',
    icon: LineChart,
    path: '/equipe/tax/gerencial',
    requiresLider: true
  },
  {
    id: 'auditoria',
    label: 'Auditoria',
    icon: Shield,
    path: '/equipe/tax/auditoria',
    requiresLider: true
  },
  {
    id: 'chamados',
    label: 'Chamados',
    icon: MessageSquare,
    path: '/equipe/chamados'
  }
];

// Hover espelhado da OSG: leve elevação + sombra suave ao passar o mouse.
const ITEM_BASE =
  'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10';

interface FiscalSidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

export const FiscalSidebar = ({ isCollapsed, onToggle }: FiscalSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user, isAdmin, isLider } = useAuth();
  // "Gerencial" só aparece para líder+ (isLider é estrito, não engloba admin).
  const canGerencial = isAdmin || isLider;

  const isActive = (path?: string) => !!path && location.pathname === path;

  const isParentActive = (children?: MenuItem['children']) =>
    location.pathname.startsWith('/equipe/tax/projetos') ||
    (!!children && children.some(child => location.pathname === child.path));

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const goTo = (path: string) =>
    navigate(
      path,
      // Chamados é uma página compartilhada fora da área Tax; informamos a origem
      // para que o "Voltar" retorne ao dashboard Tax, não ao seletor de área.
      path === '/equipe/chamados'
        ? { state: { from: '/equipe/tax/dashboard' } }
        : undefined
    );

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;

    // Agrupador com expansão no hover + animação fluida (grid-rows), igual à OSG.
    if (hasChildren) {
      const parentActive = isParentActive(item.children);
      return (
        <div key={item.id} className="group/sub">
          <button
            type="button"
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              parentActive
                ? 'bg-primary/5 text-primary'
                : 'text-muted-foreground group-hover/sub:bg-primary/5 group-hover/sub:text-primary'
            )}
          >
            <Icon className="h-4 w-4 flex-shrink-0" />
            {!isCollapsed && (
              <>
                <span className="flex-1 text-left">{item.label}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform duration-300 ease-out',
                    parentActive ? 'rotate-180' : 'group-hover/sub:rotate-180'
                  )}
                />
              </>
            )}
          </button>

          <div
            className={cn(
              'grid transition-[grid-template-rows] duration-300 ease-out',
              parentActive
                ? 'grid-rows-[1fr]'
                : 'grid-rows-[0fr] group-hover/sub:grid-rows-[1fr]'
            )}
          >
            <div className="min-h-0 overflow-hidden">
              <div
                className={cn(
                  'space-y-1 pt-1',
                  isCollapsed ? '' : 'ml-2 pl-2 border-l border-border'
                )}
              >
                {item.children?.map(child => {
                  const ChildIcon = child.icon;
                  const childActive = isActive(child.path) ||
                    (child.id === 'projetos-tarefas' && location.pathname === '/equipe/tax/projetos/tarefas');
                  return (
                    <button
                      key={child.id}
                      onClick={() => navigate(child.path)}
                      title={isCollapsed ? child.label : undefined}
                      className={cn(
                        ITEM_BASE,
                        'whitespace-nowrap',
                        childActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                      )}
                    >
                      <ChildIcon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span>{child.label}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      );
    }

    const active = isActive(item.path);
    return (
      <button
        key={item.id}
        onClick={() => item.path && goTo(item.path)}
        title={isCollapsed ? item.label : undefined}
        className={cn(
          ITEM_BASE,
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        {!isCollapsed && <span>{item.label}</span>}
      </button>
    );
  };

  return (
    // Wrapper da barra fixa — espelhado do OSG Projects: largura animada, sticky de
    // altura de tela, e o botão de colapso como irmão do <aside> para não ser
    // recortado pelo overflow do scroll interno.
    <div
      className={cn(
        'transition-all duration-300 flex-shrink-0 sticky top-0 h-screen relative',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Botão de colapso flutuante na borda direita da barra */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        className="absolute top-6 -right-3 z-20 h-6 w-6 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground shadow-sm"
      >
        {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
      </Button>

      <aside className="h-full w-full bg-card border-r border-border flex flex-col overflow-y-auto">
        {/* Header — no trilho colapsado sobra só o ícone da área, centralizado */}
        <div className="p-6 border-b border-border">
          {isCollapsed ? (
            <div className="flex justify-center">
              <div className="h-10 w-10 flex items-center justify-center">
                <TaxIcon size={40} className="h-full w-full block" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
                <TaxIcon size={40} className="h-full w-full block" />
              </div>
              <div>
                <h1 className="font-semibold text-foreground text-lg">Tax</h1>
                <p className="text-xs text-muted-foreground">Gestão de Projetos</p>
              </div>
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="p-4 space-y-1">
          {menuItems.filter((item) => !item.requiresLider || canGerencial).map(renderMenuItem)}
        </nav>

        {/* Footer com o cartão do usuário e as ações da área */}
        <div className="mt-auto p-4 border-t border-border space-y-2">
          {!isCollapsed && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted mb-3">
              <div className="h-8 w-8 rounded-full bg-success/10 flex items-center justify-center">
                <User className="h-4 w-4 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user?.email?.split('@')[0] || 'Usuário'}
                </p>
                <p className="text-xs text-muted-foreground">Tax</p>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            className={cn(
              'w-full py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-success hover:bg-success/5 transition-colors',
              isCollapsed ? 'justify-center px-2' : 'justify-start px-3'
            )}
            onClick={() => navigate('/equipe')}
            title={isCollapsed ? 'Trocar área' : undefined}
          >
            <ArrowLeft className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
            {!isCollapsed && 'Trocar área'}
          </Button>
          <Button
            variant="ghost"
            className={cn(
              'w-full py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors',
              isCollapsed ? 'justify-center px-2' : 'justify-start px-3'
            )}
            onClick={handleSignOut}
            title={isCollapsed ? 'Sair' : undefined}
          >
            <LogOut className={cn('h-4 w-4', !isCollapsed && 'mr-3')} />
            {!isCollapsed && 'Sair'}
          </Button>
          {!isCollapsed && (
            <div className="pt-2 border-t border-border">
              <img src={logoPsa} alt="PSA" className="h-5 opacity-50" />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
};

export default FiscalSidebar;
