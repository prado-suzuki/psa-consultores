import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import OsgWorkIcon from '@/components/equipe/osg/OsgWorkIcon';

const OsgWorkDashboard = () => {
  return (
    <OsgLayout title="OSG Work" subtitle="Ferramentas e aplicações da área OSG">
      <div className="flex items-center justify-center h-[60vh] text-slate-400">
        <div className="text-center">
          <OsgWorkIcon size={80} className="mx-auto mb-4 rounded-xl shadow-lg" />
          <p className="text-lg">Área em desenvolvimento</p>
          <p className="text-sm mt-2">
            Em breve as ferramentas criadas para a área OSG serão adicionadas aqui.
          </p>
        </div>
      </div>
    </OsgLayout>
  );
};

export default OsgWorkDashboard;
