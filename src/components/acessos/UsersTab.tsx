import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Pencil, Trash2, Users } from 'lucide-react';
import { useUsersWithRoles } from '@/hooks/useUsersWithRoles';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useUserPageAccess } from '@/hooks/useUserPageAccess';
import { CreateUserDialog } from './CreateUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { DeleteUserDialog } from './DeleteUserDialog';
import { PermissionsTree } from './PermissionsTree';
import { ROLE_BADGE_CLASSES, ROLE_SHORT_LABELS } from './roleOptions';

/**
 * Aba "Usuários" do Controle de Acessos.
 *
 * Composta de:
 * - Header com botão "Criar Novo Usuário" (CreateUserDialog).
 * - Lista lateral de usuários (selecionável).
 * - Painel central com botões Editar / Excluir + acessos granulares
 *   agrupados por categoria de página (Grant/Revoke).
 * - EditUserDialog e DeleteUserDialog controlados.
 */
export const UsersTab = () => {
  const { user: currentUser } = useAuth();
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const { data: users, isLoading: loadingUsers } = useUsersWithRoles();
  const { data: pages } = usePagePermissions();
  const { data: userAccess } = useUserPageAccess();

  const selectedUser = users?.find((u) => u.id === selectedUserId) ?? null;

  return (
    <div className="space-y-4">
      {/* Header com botão de criar usuário */}
      <div className="flex items-center justify-between bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
        <div>
          <h3 className="text-base font-medium text-slate-900">Usuários do Sistema</h3>
          <p className="text-sm text-slate-500">Gerencie usuários e suas permissões de acesso</p>
        </div>
        <CreateUserDialog />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Users List */}
        <Card className="bg-white border-slate-200/60 shadow-sm">
          <CardHeader>
            <CardTitle className="text-slate-900 text-sm">Usuários</CardTitle>
            <CardDescription className="text-slate-500">
              Selecione um usuário para gerenciar acessos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-5 w-5 animate-spin text-teal-600" />
              </div>
            ) : (
              users?.map((u) => (
                <button
                  key={u.id}
                  className={`w-full p-3 rounded-lg text-left transition-colors ${
                    selectedUserId === u.id
                      ? 'bg-teal-500/10 border border-teal-200'
                      : 'bg-slate-50 hover:bg-slate-100 border border-transparent'
                  }`}
                  onClick={() => setSelectedUserId(u.id)}
                >
                  <p className="font-medium text-slate-900 text-sm">
                    {u.first_name} {u.last_name}
                  </p>
                  <p className="text-xs text-slate-500">{u.email}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    {u.roles.map((role) => (
                      <Badge
                        key={role}
                        variant="outline"
                        className={`text-xs ${
                          ROLE_BADGE_CLASSES[role] ?? 'border-slate-200 text-slate-600 bg-slate-50'
                        }`}
                      >
                        {ROLE_SHORT_LABELS[role] ?? role}
                      </Badge>
                    ))}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        {/* User Permissions */}
        <Card className="lg:col-span-2 bg-white border-slate-200/60 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-slate-900 text-sm">
                  {selectedUser
                    ? `Acessos de ${selectedUser.first_name} ${selectedUser.last_name}`
                    : 'Selecione um usuário'}
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Gerencie as permissões individuais de acesso às páginas
                </CardDescription>
              </div>
              {selectedUser && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditOpen(true)}
                    className="border-slate-200 text-slate-600 hover:text-teal-600 hover:bg-teal-50"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  {selectedUser.id !== currentUser?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsDeleteOpen(true)}
                      className="border-red-200 text-red-600 hover:text-red-700 hover:bg-red-50"
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
              <PermissionsTree
                userId={selectedUserId}
                userIsAdmin={selectedUser.roles.includes('admin')}
                pages={pages ?? []}
                userAccess={userAccess ?? []}
              />
            ) : (
              <div className="text-center py-8 text-slate-500">
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
