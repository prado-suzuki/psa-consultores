import { JuridicoLayout } from '@/components/equipe/juridico/JuridicoLayout';
import { GestaoClientesContent } from '@/pages/equipe/fiscal/GestaoClientes';

const JuridicoClientes = () => (
  <JuridicoLayout tela="clientes">
    <GestaoClientesContent area="juridico" />
  </JuridicoLayout>
);

export default JuridicoClientes;
