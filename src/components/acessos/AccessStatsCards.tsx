import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Users, ShieldCheck } from 'lucide-react';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useUsersWithRoles } from '@/hooks/useUsersWithRoles';
import { useUserPageAccess } from '@/hooks/useUserPageAccess';

/**
 * Três cards de estatísticas no topo do Controle de Acessos.
 * Páginas ativas, total de usuários, permissões customizadas.
 * Dados via hooks compartilhados — React Query deduplica as requisições.
 */
export const AccessStatsCards = () => {
  const { data: pages } = usePagePermissions();
  const { data: users } = useUsersWithRoles();
  const { data: userAccess } = useUserPageAccess();

  const activePages = pages?.filter((p) => p.is_active).length ?? 0;
  const totalPages = pages?.length ?? 0;
  const totalUsers = users?.length ?? 0;
  const totalAccess = userAccess?.length ?? 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Páginas Ativas</CardTitle>
          <div className="p-2 rounded-full bg-primary/15">
            <FileText className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{activePages}</div>
          <p className="text-sm text-muted-foreground">de {totalPages} páginas</p>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-foreground">Usuários</CardTitle>
          <div className="p-2 rounded-full bg-primary/15">
            <Users className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{totalUsers}</div>
          <p className="text-sm text-muted-foreground">cadastrados no sistema</p>
        </CardContent>
      </Card>

      <Card className="border-border/60 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-foreground">
            Permissões Customizadas
          </CardTitle>
          <div className="p-2 rounded-full bg-primary/15">
            <ShieldCheck className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-foreground">{totalAccess}</div>
          <p className="text-sm text-muted-foreground">acessos individuais</p>
        </CardContent>
      </Card>
    </div>
  );
};
