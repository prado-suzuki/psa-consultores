import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { FiscalWorkPackages } from '@/components/equipe/fiscal/FiscalWorkPackages';

const FiscalDemandasPacotes = () => {
  return (
    <FiscalLayout title="Pacotes de Trabalho" subtitle="Gestão de demandas">
      <FiscalWorkPackages />
    </FiscalLayout>
  );
};

export default FiscalDemandasPacotes;
