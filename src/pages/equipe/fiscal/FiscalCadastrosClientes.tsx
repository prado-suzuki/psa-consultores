import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { GestaoClientesContent } from '@/pages/equipe/fiscal/GestaoClientes';

const FiscalCadastrosClientes = () => {
  return (
    <FiscalLayout title="Clientes" subtitle="Cadastros de clientes e contribuintes">
      <GestaoClientesContent />
    </FiscalLayout>
  );
};

export default FiscalCadastrosClientes;
