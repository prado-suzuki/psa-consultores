import { useAuth } from '@/contexts/AuthContext';
import { User } from 'lucide-react';
import { FiscalSidebar } from './FiscalSidebar';

interface FiscalLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  headerActions?: React.ReactNode;
}

export const FiscalLayout = ({ children, title, subtitle, headerActions }: FiscalLayoutProps) => {
  const { user } = useAuth();

  return (
    <div className="h-screen bg-slate-50 flex w-full overflow-hidden">
      {/* Sidebar */}
      <FiscalSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-slate-200/60 px-6 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="font-semibold text-slate-900">{title}</h1>
              {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
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
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default FiscalLayout;
