import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole, UserWithRoles } from '@/hooks/useUsersWithRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { RefreshCw, Pencil, Trash2, Users, Search } from 'lucide-react';
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
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');

  const { data: users, isLoading: loadingUsers } = useUsersWithRoles();
  const { data: pages } = usePagePermissions();
  // Fetch per usuário selecionado: filtra server-side e contorna o cap padrão de
  // linhas do PostgREST que truncava o select global quando user_page_access cresceu.
  const { data: userAccess } = useUserPageAccess(selectedUserId);

  const selectedUser = users?.find((u) => u.id === selectedUserId) ?? null;

  // Agrupa usuários por role principal (hierarquia) e ordena alfabeticamente dentro do grupo.
  const ROLE_ORDER: AppRole[] = ['admin', 'lider', 'sublider', 'team_member', 'timecliente', 'client'];
  const groupedUsers = useMemo(() => {
    if (!users) return [] as Array<{ role: AppRole | 'none'; users: UserWithRoles[] }>;
    const normalize = (s: string) =>
      s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const term = normalize(searchTerm.trim());
    const filtered = term
      ? users.filter((u) => {
          const fullName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
          return normalize(fullName).includes(term);
        })
      : users;
    const primaryRole = (u: UserWithRoles): AppRole | 'none' =>
      ROLE_ORDER.find((r) => u.roles.includes(r)) ?? 'none';
    const buckets = new Map<AppRole | 'none', UserWithRoles[]>();
    for (const u of filtered) {
      const r = primaryRole(u);
      if (!buckets.has(r)) buckets.set(r, []);
      buckets.get(r)!.push(u);
    }
    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
    const sortKey = (u: UserWithRoles) => `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
    const order: Array<AppRole | 'none'> = [...ROLE_ORDER, 'none'];
    return order
      .filter((r) => buckets.has(r))
      .map((role) => ({
        role,
        users: buckets.get(role)!.sort((a, b) => collator.compare(sortKey(a), sortKey(b))),
      }));
  }, [users, searchTerm]);

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
            <div className="relative mt-2">
              <Search className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Pesquisar por nome..."
                className="pl-8 h-9 text-sm bg-white border-slate-200"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {loadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <RefreshCw className="h-5 w-5 animate-spin text-teal-600" />
              </div>
            ) : groupedUsers.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-500">
                Nenhum usuário encontrado
              </div>
            ) : (
              groupedUsers.map((group) => (
                <div key={group.role} className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-1 pt-2">
                    {group.role === 'none' ? 'Sem role' : (ROLE_SHORT_LABELS[group.role] ?? group.role)}
                    <span className="ml-1 text-slate-400 font-normal normal-case tracking-normal">({group.users.length})</span>
                  </p>
                  {group.users.map((u) => (
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
                  ))}
                </div>
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
