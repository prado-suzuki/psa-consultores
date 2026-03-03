import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ClipboardList,
  ListTodo,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calculator,
  FolderKanban,
  ArrowLeft,
  LogOut,
  Shield
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import logoPsa from '@/assets/logo-psa.png';

export interface MenuItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path?: string;
  children?: {
    id: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    path: string;
  }[];
}

const menuItems: MenuItem[] = [
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
      id: 'entregas-projetos',
        label: 'Entregas',
        icon: FolderKanban,
        path: '/equipe/tax/projetos/cadastro'
       },
       {
         id: 'tarefas',
         label: 'Tarefas',
         icon: ListTodo,
         path: '/equipe/tax/projetos/tarefas'
      }
    ]
  },
  {
    id: 'auditoria',
    label: 'Auditoria',
    icon: Shield,
    path: '/equipe/tax/auditoria'
  }
];

export const FiscalSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
   const [openMenus, setOpenMenus] = useState<string[]>(['projetos']);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const isActive = (path?: string) => {
    if (!path) return false;
    return location.pathname === path;
  };

  const isParentActive = (children?: MenuItem['children']) => {
    if (!children) return false;
    return children.some(child => location.pathname === child.path);
  };

  const toggleMenu = (id: string) => {
    setOpenMenus(prev => 
      prev.includes(id) 
        ? prev.filter(m => m !== id)
        : [...prev, id]
    );
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const renderMenuItem = (item: MenuItem) => {
    const Icon = item.icon;
    const hasChildren = item.children && item.children.length > 0;
    const isOpen = openMenus.includes(item.id);
    const parentActive = isParentActive(item.children);
    const active = isActive(item.path);

    if (isCollapsed) {
      if (hasChildren) {
        return (
          <div key={item.id} className="space-y-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => item.children?.[0]?.path && navigate(item.children[0].path)}
                  className={cn(
                    "w-full flex items-center justify-center p-2 rounded-lg transition-colors",
                    parentActive
                      ? "bg-emerald-100 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{item.label}</TooltipContent>
            </Tooltip>
          </div>
        );
      }

      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            <button
              onClick={() => item.path && navigate(item.path)}
              className={cn(
                "w-full flex items-center justify-center p-2 rounded-lg transition-colors",
                active
                  ? "bg-emerald-100 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      );
    }

    // Expanded view
    if (hasChildren) {
      return (
        <Collapsible
          key={item.id}
          open={isOpen}
          onOpenChange={() => toggleMenu(item.id)}
        >
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                parentActive
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1 text-left">{item.label}</span>
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pl-4 mt-1 space-y-1">
            {item.children?.map((child) => {
              const ChildIcon = child.icon;
              const childActive = isActive(child.path);
              return (
                <button
                  key={child.id}
                  onClick={() => navigate(child.path)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    childActive
                      ? "bg-emerald-100 text-emerald-700 font-medium"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  )}
                >
                  <ChildIcon className="h-4 w-4" />
                  <span>{child.label}</span>
                </button>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    return (
      <button
        key={item.id}
        onClick={() => item.path && navigate(item.path)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
          active
            ? "bg-emerald-100 text-emerald-700"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        )}
      >
        <Icon className="h-4 w-4" />
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <div 
      className={cn(
        "bg-white border-r border-slate-200 flex flex-col h-screen flex-shrink-0 transition-all duration-200",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header with collapse button */}
      <div className="h-14 border-b border-slate-200 flex items-center justify-between px-3">
        {!isCollapsed && (
          <div className="flex items-center">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center mr-3">
              <Calculator className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 text-sm">Tax</h1>
              <p className="text-xs text-slate-500">Gestão de Projetos</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center mx-auto">
            <Calculator className="h-5 w-5 text-emerald-600" />
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn("h-8 w-8 flex-shrink-0", isCollapsed && "absolute right-1 top-3")}
        >
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform",
            isCollapsed && "rotate-180"
          )} />
        </Button>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {menuItems.map(renderMenuItem)}
      </nav>

      {/* Footer with actions */}
      <div className={cn("p-3 border-t border-slate-200 space-y-2", isCollapsed && "px-2")}>
        {isCollapsed ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="w-full text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
                  onClick={() => navigate('/equipe')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Trocar área</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon"
                  className="w-full text-slate-600 hover:text-red-600 hover:bg-red-50"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Sair</TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <Button 
              variant="ghost" 
              size="sm"
              className="w-full justify-start text-slate-600 hover:text-emerald-600 hover:bg-emerald-50"
              onClick={() => navigate('/equipe')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Trocar área
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
            <div className="pt-2 border-t border-slate-100">
              <img src={logoPsa} alt="PSA" className="h-5 opacity-50" />
            </div>
          </>
        )}
        </div>
    </div>
  );
};

export default FiscalSidebar;
