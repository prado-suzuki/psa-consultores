import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole, UserWithRoles } from '@/hooks/useUsersWithRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PapelBadge } from '@/components/ui/PapelBadge';
import { Loader2, Pencil, Trash2, Users } from 'lucide-react';
import { useUsersWithRoles } from '@/hooks/useUsersWithRoles';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useUserPageAccess } from '@/hooks/useUserPageAccess';
import { useDomainAreasPorUsuario } from '@/hooks/useDomainAreasPorUsuario';
import { SEM_AREA, agruparUsuariosPorArea } from '@/lib/acessosPorArea';
import {
  FILTRO_VAZIO,
  filtrarUsuarios,
  ordenarUsuarios,
  type FiltroDeUsuarios,
} from '@/lib/filtroDeUsuarios';
import { CreateUserDialog } from './CreateUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { DeleteUserDialog } from './DeleteUserDialog';
import { FiltroDeUsuariosBar } from './FiltroDeUsuariosBar';
import { PermissionsTree } from './PermissionsTree';
import { PontoDaArea } from './PontoDaArea';

/**
 * Aba"Usuários" do Controle de Acessos.
 *
 * Composta de:
 * - Header com botão"Criar Novo Usuário" (CreateUserDialog).
 * - Lista lateral de usuários, agrupada pela área da estrutura e filtrável por
 *   papel e por área (selecionável).
 * - Painel central com botões Editar / Excluir + acessos granulares
 *   agrupados por categoria de página (Grant/Revoke).
 * - EditUserDialog e DeleteUserDialog controlados.
 */
export const UsersTab = () => {
  const { user: currentUser } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [filtro, setFiltro] = useState<FiltroDeUsuarios>(FILTRO_VAZIO);

  const { data: users, isLoading: loadingUsers } = useUsersWithRoles();
  const { areasPorUsuario, areas } = useDomainAreasPorUsuario();
  const { data: pages } = usePagePermissions();
  // Fetch per usuário selecionado: filtra server-side e contorna o cap padrão de
  // linhas do PostgREST que truncava o select global quando user_page_access cresceu.
  const { data: userAccess } = useUserPageAccess(selectedUserId);

  const selectedUser = users?.find((u) => u.id === selectedUserId) ?? null;

  /**
   * Lista final: filtra por nome, papel e área e agrupa pela área da estrutura.
   *
   * Dentro do grupo a ordem é hierarquia de papel e depois nome — quem lidera
   * aparece primeiro, que é por onde a liberação de caminhos costuma começar.
   * Quem está em duas áreas aparece nos dois grupos, de propósito.
   *
   * `visiveis` conta a lista ANTES de agrupar: quem está em duas áreas aparece
   * nos dois grupos, então somar os grupos daria uma pessoa duas vezes no"N de
   * M" da barra.
   */
  const { groupedUsers, visiveis } = useMemo(() => {
    if (!users) return { groupedUsers: [], visiveis: 0 };
    const filtrados = filtrarUsuarios(users, filtro, areasPorUsuario);
    return {
      groupedUsers: agruparUsuariosPorArea(ordenarUsuarios(filtrados), areasPorUsuario),
      visiveis: filtrados.length,
    };
  }, [users, filtro, areasPorUsuario]);

  return (
    <div className="space-y-4">
      {/* Header com botão de criar usuário */}
      <div className="flex items-center justify-between bg-superficie-cartao rounded-lg p-4 border border-border shadow-sm">
        <div>
          <h3 className="text-base font-medium text-foreground">Usuários do Sistema</h3>
          <p className="text-sm text-muted-foreground">Gerencie usuários e suas permissões de acesso</p>
        </div>
        <CreateUserDialog />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Users List */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-foreground text-sm">Usuários</CardTitle>
            <CardDescription>
              Selecione um usuário para gerenciar acessos
            </CardDescription>
            {/* A MESMA barra da matriz, empilhada. Papel, área e busca eram
                escritos aqui à mão, com a regra de"só área com gente dentro"
                repetida — duas cópias da mesma coisa, e a daqui não tinha o"N
                de M" nem o Limpar. */}
            <div className="mt-3">
              <FiltroDeUsuariosBar
                filtro={filtro}
                onChange={setFiltro}
                usuarios={users ?? []}
                areas={areas}
                areasPorUsuario={areasPorUsuario}
                visiveis={visiveis}
                empilhado
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : groupedUsers.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            ) : (
              groupedUsers.map((group) => (
                <div key={group.area?.id ?? SEM_AREA} className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1 pt-2">
                    <PontoDaArea area={group.area} />
                    {group.area?.name ?? 'Sem área'}
                    <span className="text-muted-foreground font-normal normal-case tracking-normal">({group.usuarios.length})</span>
                  </p>
                  {group.usuarios.map((u) => (
                    <button
                      key={`${group.area?.id ?? SEM_AREA}-${u.id}`}
                      className={`w-full p-3 rounded-lg text-left transition-colors ${
                        selectedUserId === u.id
                          ? 'bg-primary/10 border border-primary/20'
                          : 'bg-muted hover:bg-foreground/[0.04] border border-transparent'
                      }`}
                      onClick={() => setSelectedUserId(u.id)}
                    >
                      <p className="font-medium text-foreground text-sm">
                        {u.first_name} {u.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {u.roles.map((role) => (
                          <PapelBadge key={role} papel={role} />
                        ))}
                      </div>
                    </button>
                  ))}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* User Permissions */}
        <Card className="lg:col-span-2 border-border/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-foreground text-sm">
                  {selectedUser
                    ? `Acessos de ${selectedUser.first_name} ${selectedUser.last_name}`
                    : 'Selecione um usuário'}
                </CardTitle>
                <CardDescription>
                  Gerencie as permissões individuais de acesso às páginas
                </CardDescription>
              </div>
              {selectedUser && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditOpen(true)}
                    className="border-border text-muted-foreground hover:text-primary hover:bg-primary/5"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  {selectedUser.id !== currentUser?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDeleteOpen(true)}
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Excluir
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            {selectedUserId && selectedUser ? (
              <div className="space-y-6">
                <PermissionsTree
                  userId={selectedUserId}
                  userIsAdmin={selectedUser.roles.includes('admin')}
                  pages={pages ?? []}
                  userAccess={userAccess ?? []}
                />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Selecione um usuário na lista ao lado</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dialogs controlados */}
      <EditUserDialog open={isEditOpen} onOpenChange={setIsEditOpen} user={selectedUser} />
      <DeleteUserDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        user={selectedUser}
        onDeleted={() => setSelectedUserId(null)}
      />
    </div>
  );
};
