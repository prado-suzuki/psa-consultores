import { Building } from 'lucide-react';
import { FixosLayout } from '@/components/equipe/fixos/FixosLayout';

const FixosDashboard = () => {
  return (
    <FixosLayout title="Dashboard" subtitle="Visão geral da área Fixos">
      <div className="flex items-center justify-center h-[60vh] text-slate-400">
        <div className="text-center">
          <Building className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Área em desenvolvimento</p>
          <p className="text-sm mt-2">O conteúdo desta seção será adicionado em breve.</p>
        </div>
      </div>
    </FixosLayout>
  );
};

export default FixosDashboard;
