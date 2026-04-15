import { AdminLayout } from '@/components/administracao/AdminLayout';
import { UsersRolesView } from '@/components/acessos/UsersRolesView';
import { ManageAccessLink } from '@/components/acessos/ManageAccessLink';

const AdminAcessos = () => (
  <AdminLayout
    title="Gestão de Acessos"
    subtitle="Visualização e controle de permissões do sistema"
  >
    <ManageAccessLink />
    <UsersRolesView variant="compact" teamMemberColumnLabel="Equipe" />
  </AdminLayout>
);

export default AdminAcessos;
