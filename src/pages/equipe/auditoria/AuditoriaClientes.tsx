import { AuditoriaLayout } from '@/components/equipe/auditoria/AuditoriaLayout';
import { GestaoClientesContent } from '@/pages/equipe/fiscal/GestaoClientes';

const AuditoriaClientes = () => (
  <AuditoriaLayout tela="clientes">
    <GestaoClientesContent area="auditoria" />
  </AuditoriaLayout>
);

export default AuditoriaClientes;
