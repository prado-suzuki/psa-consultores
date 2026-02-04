import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ClipboardList,
  Inbox,
  Package,
  Building,
  ChevronDown,
  ChevronRight,
  Calculator,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import logoPsa from '@/assets/logo-psa.png';

interface MenuItem {
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
    path: '/equipe/tex/dashboard'
  },
  {
    id: 'demandas',
    label: 'Demandas',
    icon: ClipboardList,
    children: [
      {
        id: 'minhas',
        label: 'Minhas Demandas',
        icon: Inbox,
        path: '/equipe/tex/demandas/inbox'
      },
      {
        id: 'pacotes',
        label: 'Pacotes de Trabalho',
        icon: Package,
        path: '/equipe/tex/demandas/pacotes'
      },
      {
        id: 'clientes',
        label: 'Clientes',
        icon: Building,
        path: '/equipe/tex/demandas/clientes'
      }
    ]
  }
];

export const FiscalSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [openMenus, setOpenMenus] = useState<string[]>(['demandas']);

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

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen flex-shrink-0">
      {/* Logo */}
      <div className="h-14 border-b border-slate-200 flex items-center px-4">
        <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center mr-3">
          <Calculator className="h-5 w-5 text-emerald-600" />
        </div>
        <div>
          <h1 className="font-semibold text-slate-900 text-sm">Tex</h1>
          <p className="text-xs text-slate-500">Gestão de Projetos</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const hasChildren = item.children && item.children.length > 0;
          const isOpen = openMenus.includes(item.id);
          const parentActive = isParentActive(item.children);

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
                    const active = isActive(child.path);
                    return (
                      <button
                        key={child.id}
                        onClick={() => navigate(child.path)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                          active
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

          const active = isActive(item.path);
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
        })}
      </nav>

      {/* Footer com ações */}
      <div className="p-3 border-t border-slate-200 space-y-2">
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
      </div>
    </div>
  );
};

export default FiscalSidebar;
