import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { MinhasDemandas } from '@/components/equipe/fiscal/MinhasDemandas';

const FiscalDemandasInbox = () => {
  return (
    <FiscalLayout 
      title="Minhas Demandas" 
      subtitle="Demandas atribuidas, criadas ou sob sua responsabilidade"
    >
      <MinhasDemandas />
    </FiscalLayout>
  );
};

export default FiscalDemandasInbox;
