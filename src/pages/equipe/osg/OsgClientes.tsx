import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { GestaoClientesContent } from '@/pages/equipe/fiscal/GestaoClientes';

// Clientes da área OSG — espelha a página de Clientes do Tax usando o MESMO
// conteúdo compartilhado (<GestaoClientesContent />), no layout da OSG.
const OsgClientes = () => (
  <OsgLayout title="Clientes" subtitle="Cadastros de clientes e contribuintes">
    <GestaoClientesContent area="osg" />
  </OsgLayout>
);

export default OsgClientes;
