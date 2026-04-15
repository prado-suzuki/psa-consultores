import { GestaoLayout } from '@/components/gestao/GestaoLayout';
import { UsersRolesView } from '@/components/acessos/UsersRolesView';
import { ManageAccessLink } from '@/components/acessos/ManageAccessLink';

const GestaoAcessos = () => (
  <GestaoLayout
    title="Controle de Acessos"
    subtitle="Visualização e controle de permissões do sistema"
  >
    <ManageAccessLink />
    <UsersRolesView variant="full" />
  </GestaoLayout>
);

export default GestaoAcessos;
