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
  /**
   * Destino do item. Um agrupador TAMBÉM pode ter destino: clicar no próprio
   * "Projetos" ou "Gerencial" abre a página principal daquele grupo, no modelo
   * da Digital. Foi o que permitiu tirar "Dashboard" da raiz do menu.
   */
  path?: string;
  /** Item visível apenas para líder ou admin (área Gerencial). */
  requiresLider?: boolean;
  /** O inverso: item que some para líder+, porque ele tem um caminho melhor. */
  ocultaParaLider?: boolean;
  /**
   * Prefixo que marca o grupo como ativo. Antes isso era fixo em
   * `/equipe/tax/projetos`, o que deixaria a Gerencial nova sempre apagada.
   */
  basePath?: string;
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
    id: 'projetos',
    label: 'Projetos',
    icon: FolderKanban,
    // Clicar no grupo abre o antigo item "Dashboard", que saiu da raiz do menu.
    path: '/equipe/tax/dashboard',
    basePath: '/equipe/tax/projetos',
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
    // Clicar no grupo abre "Dashboards", que é a tela que antes se chamava
    // Gerencial. O endereço não mudou, só o rótulo.
    path: '/equipe/tax/gerencial',
    basePath: '/equipe/tax/gerencial',
    requiresLider: true,
    children: [
      {
        id: 'gerencial-dashboards',
        label: 'Dashboards',
        icon: LayoutDashboard,
        path: '/equipe/tax/gerencial'
      },
      {
        id: 'gerencial-chamados',
        label: 'Gestão de Chamados',
        icon: MessageSquare,
        path: '/equipe/tax/gerencial/chamados'
      },
      {
        id: 'gerencial-chamados-dashboard',
        label: 'Dashboard de Chamados',
        icon: LineChart,
        path: '/equipe/tax/gerencial/chamados/dashboard'
      },
      {
        id: 'gerencial-logs',
        label: 'Logs de Equipe',
        icon: Shield,
        path: '/equipe/tax/gerencial/logs-equipe'
      }
    ]
  },
  {
    id: 'chamados',
    label: 'Chamados',
    icon: MessageSquare,
    path: '/equipe/chamados',
    // Some para o Líder Geral: ele trabalha chamado pela "Gestão de Chamados"
    // do dropdown Gerencial, que mostra tudo ao alcance dele em vez de só o que
    // lhe foi atribuído. Dois caminhos para chamado no mesmo menu confundem.
    // Admin NÃO perde o item: admin vê tudo.
    // É só o menu: a página continua liberada para quem tiver o link.
    ocultaParaLider: true
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

  const isParentActive = (item: MenuItem) =>
    (!!item.basePath && location.pathname.startsWith(item.basePath)) ||
    location.pathname === item.path ||
    (!!item.children && item.children.some(child => location.pathname === child.path));

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
      const parentActive = isParentActive(item);
      return (
        <div key={item.id} className="group/sub">
          <button
            type="button"
            // O grupo com destino é clicável; sem destino, segue só abrindo a
            // lista no hover, como era antes.
            onClick={() => item.path && goTo(item.path)}
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
                      // O título vale sempre, não só recolhido: rótulo comprido
                      // agora corta com reticências em vez de vazar, e a versão
                      // inteira fica ao alcance do mouse.
                      title={child.label}
                      className={cn(
                        ITEM_BASE,
                        // Item de submenu ganha um respiro: o recuo da barra à
                        // esquerda já come largura, e "Dashboard de Chamados"
                        // estourava por poucos pixels.
                        'min-w-0 gap-2 px-2',
                        childActive
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-primary/5 hover:text-primary'
                      )}
                    >
                      <ChildIcon className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && <span className="min-w-0 truncate">{child.label}</span>}
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
          {menuItems
            .filter((item) => !item.requiresLider || canGerencial)
            // `isLider` estrito, e não `canGerencial`: admin vê tudo, inclusive o
            // atalho. Quem perde o item é só o Líder Geral, que trabalha chamado
            // pela Gestão de Chamados do dropdown.
            .filter((item) => !item.ocultaParaLider || !isLider)
            .map(renderMenuItem)}
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
