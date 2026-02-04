import { Briefcase } from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';

const OsgDashboard = () => {
  return (
    <OsgLayout title="Dashboard" subtitle="Visão geral da área OSG">
      <div className="flex items-center justify-center h-[60vh] text-slate-400">
        <div className="text-center">
          <Briefcase className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="text-lg">Área em desenvolvimento</p>
          <p className="text-sm mt-2">O conteúdo desta seção será adicionado em breve.</p>
        </div>
      </div>
    </OsgLayout>
  );
};

export default OsgDashboard;
