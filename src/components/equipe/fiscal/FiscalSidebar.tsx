import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ClipboardList,
  ChevronDown,
  ChevronLeft,
  FolderKanban,
  MessageSquare,
  MessagesSquare,
  ArrowLeft,
  LogOut,
  Shield,
  Home,
  LineChart,
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
  const { signOut, isAdmin, isLider } = useAuth();
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
            <span className="flex-1 text-left">{item.label}</span>
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-300 ease-out',
                parentActive ? 'rotate-180' : 'group-hover/sub:rotate-180'
              )}
            />
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
              <div className="space-y-1 pt-1 ml-2 pl-2 border-l border-border">
                {item.children?.map(child => {
                  const ChildIcon = child.icon;
                  const childActive = isActive(child.path) ||
                    (child.id === 'projetos-tarefas' && location.pathname === '/equipe/tax/projetos/tarefas');
                  return (
                    <button
                      key={child.id}
                      onClick={() => navigate(child.path)}
                      className={cn(
                        ITEM_BASE,
                        childActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                      )}
                    >
                      <ChildIcon className="h-4 w-4 flex-shrink-0" />
                      <span>{child.label}</span>
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
        className={cn(
          ITEM_BASE,
          active
            ? 'bg-primary/10 text-primary'
            : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
        )}
      >
        <Icon className="h-4 w-4 flex-shrink-0" />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div
      className={cn(
        'bg-card border-r border-border flex flex-col h-screen flex-shrink-0 transition-all duration-200',
        isCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-64 overflow-y-auto'
      )}
    >
      {/* Header with collapse button — espacamento/tamanhos espelhados do OSG Projects */}
      <div className="border-b border-border flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
            <TaxIcon size={40} className="h-full w-full block" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground text-lg">Tax</h1>
            <p className="text-xs text-muted-foreground">Gestão de Projetos</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggle}
          className="h-8 w-8 flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Menu */}
      <nav className="p-3 space-y-1">
        {menuItems.filter((item) => !item.requiresLider || canGerencial).map(renderMenuItem)}
      </nav>

      {/* Footer with actions */}
      <div className="mt-auto p-3 border-t border-border space-y-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-success hover:bg-success/5"
          onClick={() => navigate('/equipe')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Trocar área
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/5"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </Button>
        <div className="pt-2 border-t border-border">
          <img src={logoPsa} alt="PSA" className="h-5 opacity-50" />
        </div>
      </div>
    </div>
  );
};

export default FiscalSidebar;
