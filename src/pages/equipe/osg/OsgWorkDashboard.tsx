import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import osgIcon from '@/assets/osg-icon.svg';

const OsgWorkDashboard = () => {
  return (
    <OsgLayout title="OSG Work" subtitle="Ferramentas e aplicações da área OSG">
      <div className="flex items-center justify-center h-[60vh] text-slate-400">
        <div className="text-center">
          <img src={osgIcon} alt="OSG Work" className="h-20 w-20 mx-auto mb-4" />
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
