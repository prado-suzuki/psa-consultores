import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { FiscalClients } from '@/components/equipe/fiscal/FiscalClients';

const FiscalDemandasClientes = () => {
  return (
    <FiscalLayout title="Clientes" subtitle="Gestão de clientes">
      <FiscalClients />
    </FiscalLayout>
  );
};

export default FiscalDemandasClientes;
