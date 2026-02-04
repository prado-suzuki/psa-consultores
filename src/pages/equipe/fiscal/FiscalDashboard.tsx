import { Calculator } from 'lucide-react';
import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';

const FiscalDashboard = () => {
  return (
    <FiscalLayout title="Dashboard" subtitle="Visão geral da área Fiscal">
      <div className="flex items-center justify-center h-[60vh] text-slate-400">
        <div className="text-center">
          <Calculator className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Área em desenvolvimento</p>
          <p className="text-sm mt-2">O conteúdo desta seção será adicionado em breve.</p>
        </div>
      </div>
    </FiscalLayout>
  );
};

export default FiscalDashboard;
