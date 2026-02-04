import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Calculator,
  LogOut,
  ArrowLeft,
  User
} from 'lucide-react';

interface FiscalLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export const FiscalLayout = ({ children, title, subtitle, headerActions }: FiscalLayoutProps) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col w-full">
      {/* Header Compacto */}
      <header className="h-14 bg-white border-b border-slate-200/60 px-6 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Calculator className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {headerActions}
          
          {/* User Info */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200/60">
            <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <User className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <span className="text-sm font-medium text-slate-700">
              {user?.email?.split('@')[0] || 'Usuario'}
            </span>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="text-slate-600 hover:text-emerald-600"
            onClick={() => navigate('/equipe/projetos')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Trocar area
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            className="text-slate-600 hover:text-red-600"
            onClick={handleSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Conteudo Full Width */}
      <ScrollArea className="flex-1">
        <main className="p-6">
          {children}
        </main>
      </ScrollArea>
    </div>
  );
};

export default FiscalLayout;
