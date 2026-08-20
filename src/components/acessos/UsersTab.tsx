import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import type { AppRole, UserWithRoles } from '@/hooks/useUsersWithRoles';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RefreshCw, Pencil, Trash2, Users, Search } from 'lucide-react';
import { useUsersWithRoles } from '@/hooks/useUsersWithRoles';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { useUserPageAccess } from '@/hooks/useUserPageAccess';
import { useDomainAreasPorUsuario } from '@/hooks/useDomainAreasPorUsuario';
import {
  SEM_AREA,
  agruparUsuariosPorArea,
  contarUsuariosPorArea,
  usuarioEstaNaArea,
} from '@/lib/acessosPorArea';
import { CreateUserDialog } from './CreateUserDialog';
import { EditUserDialog } from './EditUserDialog';
import { DeleteUserDialog } from './DeleteUserDialog';
import { PermissionsTree } from './PermissionsTree';
import { ROLE_BADGE_CLASSES, ROLE_SHORT_LABELS } from './roleOptions';
import { PontoDaArea } from './PontoDaArea';

/** Hierarquia de papéis: ordena a lista e define o papel principal de cada um. */
const ROLE_ORDER: AppRole[] = [
  'admin', 'lider', 'sublider', 'team_member', 'marketing', 'timecliente', 'client',
];

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
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<AppRole | 'all'>('all');
  const [areaFilter, setAreaFilter] = useState<string>('all');

  const { data: users, isLoading: loadingUsers } = useUsersWithRoles();
  const { areasPorUsuario, areas } = useDomainAreasPorUsuario();
  const { data: pages } = usePagePermissions();
  // Fetch per usuário selecionado: filtra server-side e contorna o cap padrão de
  // linhas do PostgREST que truncava o select global quando user_page_access cresceu.
  const { data: userAccess } = useUserPageAccess(selectedUserId);

  const selectedUser = users?.find((u) => u.id === selectedUserId) ?? null;

  // Contagem por role (independente da pesquisa) para mostrar nas abas.
  const roleCounts = useMemo(() => {
    const counts: Record<AppRole | 'all', number> = {
      all: 0, admin: 0, lider: 0, sublider: 0, team_member: 0, client: 0, timecliente: 0, marketing: 0,
    };
    if (!users) return counts;
    counts.all = users.length;
    for (const u of users) {
      for (const r of u.roles) {
        if (r in counts) counts[r] += 1;
      }
    }
    return counts;
  }, [users]);

  // Contagem por área (independente da pesquisa) para os chips do filtro.
  const areaCounts = useMemo(
    () => contarUsuariosPorArea((users ?? []).map((u) => u.id), areasPorUsuario),
    [users, areasPorUsuario],
  );

  // Só entram no seletor as áreas com gente dentro — área recém-criada e ainda
  // vazia não vira opção que não filtra nada.
  const areaOptions = useMemo(() => {
    const comGente = areas.filter((a) => (areaCounts[a.id] ?? 0) > 0);
    if (!comGente.length && !areaCounts[SEM_AREA]) return [];
    return [
      ...comGente.map((a) => ({ id: a.id, label: a.name, color: a.color, color_index: a.color_index })),
      ...(areaCounts[SEM_AREA] ? [{ id: SEM_AREA, label: 'Sem área', color: null, color_index: null }] : []),
    ];
  }, [areas, areaCounts]);

  /**
   * Lista final: filtra por nome, papel e área e agrupa pela área da estrutura.
   *
   * Dentro do grupo a ordem é hierarquia de papel e depois nome — quem lidera
   * aparece primeiro, que é por onde a liberação de caminhos costuma começar.
   * Quem está em duas áreas aparece nos dois grupos, de propósito.
   */
  const groupedUsers = useMemo(() => {
    if (!users) return [];
    const normalize = (s: string) =>
      s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
    const term = normalize(searchTerm.trim());
    let filtered = term
      ? users.filter((u) => {
          const fullName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
          return normalize(fullName).includes(term);
        })
      : users;
    if (roleFilter !== 'all') {
      filtered = filtered.filter((u) => u.roles.includes(roleFilter));
    }
    if (areaFilter !== 'all') {
      filtered = filtered.filter((u) => usuarioEstaNaArea(u.id, areaFilter, areasPorUsuario));
    }

    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' });
    const sortKey = (u: UserWithRoles) => `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();
    const rolePeso = (u: UserWithRoles) => {
      const i = ROLE_ORDER.findIndex((r) => u.roles.includes(r));
      return i === -1 ? ROLE_ORDER.length : i;
    };
    const ordenados = [...filtered].sort(
      (a, b) => rolePeso(a) - rolePeso(b) || collator.compare(sortKey(a), sortKey(b)),
    );

    return agruparUsuariosPorArea(ordenados, areasPorUsuario);
  }, [users, searchTerm, roleFilter, areaFilter, areasPorUsuario]);

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
            {/* Papel e Área lado a lado: dois seletores de largura fixa, que não
                crescem com o número de papéis nem de áreas ativas — a fileira de
                chips rolava para o lado e escondia opção. */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as AppRole | 'all')}>
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Papel" />
                </SelectTrigger>
                <SelectContent>
                  {(['all', ...ROLE_ORDER] as Array<AppRole | 'all'>).map((r) => (
                    <SelectItem key={r} value={r} className="text-xs">
                      {r === 'all' ? 'Todos os papéis' : (ROLE_SHORT_LABELS[r] ?? r)}
                      <span className="ml-1 text-slate-400">({roleCounts[r] ?? 0})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={areaFilter}
                onValueChange={setAreaFilter}
                disabled={areaOptions.length === 0}
              >
                <SelectTrigger className="h-9 text-xs bg-white border-slate-200">
                  <SelectValue placeholder="Área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">
                    Todas as áreas
                    <span className="ml-1 text-slate-400">({users?.length ?? 0})</span>
                  </SelectItem>
                  {areaOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} className="text-xs">
                      <span className="flex items-center gap-1.5">
                        <PontoDaArea area={opt} />
                        {opt.label}
                        <span className="text-slate-400">({areaCounts[opt.id] ?? 0})</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
                <RefreshCw className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : groupedUsers.length === 0 ? (
              <div className="text-center py-6 text-sm text-slate-500">
                Nenhum usuário encontrado
              </div>
            ) : (
              groupedUsers.map((group) => (
                <div key={group.area?.id ?? SEM_AREA} className="space-y-2">
                  <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-1 pt-2">
                    <PontoDaArea area={group.area} />
                    {group.area?.name ?? 'Sem área'}
                    <span className="text-slate-400 font-normal normal-case tracking-normal">({group.usuarios.length})</span>
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
                              ROLE_BADGE_CLASSES[role] ?? 'border-slate-200 text-slate-600 bg-muted'
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
                    className="border-slate-200 text-slate-600 hover:text-primary hover:bg-primary/5"
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
              <div className="space-y-6">
                <PermissionsTree
                  userId={selectedUserId}
                  userIsAdmin={selectedUser.roles.includes('admin')}
                  pages={pages ?? []}
                  userAccess={userAccess ?? []}
                />
              </div>
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
