import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { AREA_CATEGORIES_MAP, ALL_AREA_CATEGORIES } from '@/config/areaCategories';
import { useSyncUserAreaAccess } from './useUserPageAccess';
import { paraRoleDoBanco } from './useUsersWithRoles';
import { N8N_WELCOME_WEBHOOK } from '@/lib/webhooks';
import { assertCanPerform } from './useRlsPrecheck';
import { useAuditLog } from './useAuditLog';
import { diferencaDeEquipes } from '@/lib/equipesDaEstrutura';

export interface CreateTeamMemberInput {
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  roles: string[];
  areas: string[];
  /** Equipes da estrutura em que a pessoa entra já no cadastro. */
  equipe_ids?: string[];
}

export interface UpdateTeamMemberInput {
  userId: string;
  first_name: string;
  last_name: string;
  email: string;
  roles: string[];
  areas: string[];
  /** Equipes da estrutura. `undefined` deixa os vínculos como estão. */
  equipe_ids?: string[];
}

type LogAction = ReturnType<typeof useAuditLog>['logAction'];

/**
 * Põe a pessoa nas equipes escolhidas, por diferença contra o que já existe.
 *
 * Vive aqui, junto da criação/edição do usuário, porque o vínculo com a
 * estrutura faz parte do mesmo cadastro: sem isso o usuário nasce em "Sem área"
 * e só entra na equipe numa segunda ida à aba Cadastros Estrutura.
 */
async function sincronizarEquipesDaEstrutura(
  userId: string,
  equipeIds: string[],
  pessoa: string,
  logAction: LogAction,
): Promise<void> {
  const { data: atuais, error: leituraError } = await supabase
    .from('estrutura_equipe_membros')
    .select('id, equipe_id')
    .eq('user_id', userId);
  if (leituraError) throw leituraError;

  const vinculoPorEquipe = new Map((atuais ?? []).map((m) => [m.equipe_id, m.id]));
  const { adicionar, remover } = diferencaDeEquipes([...vinculoPorEquipe.keys()], equipeIds);
  if (!adicionar.length && !remover.length) return;

  // Nome da equipe só para a trilha de auditoria ficar legível.
  const { data: equipes } = await supabase
    .from('estrutura_equipes')
    .select('id, name')
    .in('id', [...adicionar, ...remover]);
  const nomeDaEquipe = (id: string) =>
    (equipes ?? []).find((e) => e.id === id)?.name ?? id;

  for (const equipeId of adicionar) {
    const { data, error } = await supabase
      .from('estrutura_equipe_membros')
      .insert({ equipe_id: equipeId, user_id: userId })
      .select('id')
      .single();
    if (error) throw error;
    await logAction({
      area: 'estrutura',
      entity_type: 'membro',
      entity_id: data.id,
      entity_name: pessoa,
      action: 'created',
      details: `Adicionado à equipe ${nomeDaEquipe(equipeId)} pelo cadastro de usuário`,
    });
  }

  for (const equipeId of remover) {
    const vinculoId = vinculoPorEquipe.get(equipeId)!;
    const { error } = await supabase
      .from('estrutura_equipe_membros')
      .delete()
      .eq('id', vinculoId);
    if (error) throw error;
    await logAction({
      area: 'estrutura',
      entity_type: 'membro',
      entity_id: vinculoId,
      entity_name: pessoa,
      action: 'deleted',
      details: `Removido da equipe ${nomeDaEquipe(equipeId)} pelo cadastro de usuário`,
    });
  }
}

/**
 * Criação de team member via edge function `create-team-member` +
 * concessão de acessos de área + webhook de boas-vindas (fire-and-forget).
 *
 * Retorna `user_id` criado (via data da edge function). Chamar
 * diretamente com `.mutateAsync(input)` quando precisar do id no caller.
 */
export function useCreateTeamMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const syncAreaAccess = useSyncUserAreaAccess();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: CreateTeamMemberInput) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('create-team-member', {
        body: input,
      });

      if (response.error) {
        throw new Error(response.error.message || 'Erro ao criar usuário');
      }
      if (response.data?.error) {
        throw new Error(response.data.error);
      }

      const newUserId = response.data?.user_id as string | undefined;
      const temporaryPassword = (response.data?.temporary_password as string | undefined) ?? '';

      // Grant area access (mesmo fluxo usado por update)
      const hasInternalRole =
        input.roles.includes('team_member') ||
        input.roles.includes('lider') ||
        input.roles.includes('sublider');

      if (hasInternalRole && input.areas.length > 0 && newUserId) {
        try {
          const selectedCategories = input.areas.flatMap(
            area => AREA_CATEGORIES_MAP[area as keyof typeof AREA_CATEGORIES_MAP]?.categories || []
          );
          await syncAreaAccess.mutateAsync({
            userId: newUserId,
            selectedCategories,
            allAreaCategories: ALL_AREA_CATEGORIES,
          });
        } catch (err) {
          console.error('[useCreateTeamMember] Falha ao sincronizar áreas:', err);
        }
      }

      // Vínculo com a estrutura (cluster → área → equipe). O usuário já existe
      // neste ponto: se o vínculo falhar, o erro é dito por extenso em vez de
      // deixar a pessoa achando que ficou tudo cadastrado.
      const equipeIds = input.equipe_ids ?? [];
      if (hasInternalRole && equipeIds.length > 0 && newUserId) {
        try {
          await sincronizarEquipesDaEstrutura(
            newUserId,
            equipeIds,
            `${input.first_name} ${input.last_name}`.trim(),
            logAction,
          );
        } catch (err) {
          console.error('[useCreateTeamMember] Falha ao vincular equipe:', err);
          toast.error(
            'Usuário criado, mas não entrou na equipe. Vincule em Cadastros Estrutura.',
            { duration: 10000 },
          );
        }
      }

      // Webhook de boas-vindas (fire-and-forget — não bloqueia a mutation)
      const adminName =
        user?.user_metadata?.first_name && user?.user_metadata?.last_name
          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
          : user?.email || 'Admin';

      fetch(N8N_WELCOME_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'user_created',
          user_data: {
            first_name: input.first_name,
            last_name: input.last_name,
            email: input.email,
            roles: input.roles,
            areas: input.areas,
          },
          credentials: {
            email: input.email,
            temporary_password: temporaryPassword,
          },
          platform: {
            login_url: 'https://psa-consultores.lovable.app/auth',
            name: 'PSA Consultores',
          },
          created_by: adminName,
          created_at: new Date().toISOString(),
        }),
      }).catch((err) =>
        console.error('[useCreateTeamMember] Webhook boas-vindas falhou:', err)
      );

      return { user_id: newUserId, temporary_password: temporaryPassword };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      queryClient.invalidateQueries({ queryKey: ['estrutura-membros'] });
      queryClient.invalidateQueries({ queryKey: ['profiles-min-role'] });
      toast.success('Usuário criado com sucesso!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

/**
 * Edição de team member: atualiza profile + sincroniza roles + sincroniza
 * acessos de área.
 */
export function useUpdateTeamMember() {
  const queryClient = useQueryClient();
  const syncAreaAccess = useSyncUserAreaAccess();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: UpdateTeamMemberInput) => {
      const { userId, first_name, last_name, email, roles, areas, equipe_ids } = input;

      // 1. Update profile
      await assertCanPerform('profiles', 'update', userId);
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ first_name, last_name, email })
        .eq('id', userId);
      if (profileError) throw profileError;

      // 2. Sync roles (diff → add + remove)
      const { data: currentRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      if (rolesError) throw rolesError;

      const currentRoleNames = (currentRoles ?? []).map(r => r.role as string);
      const rolesToAdd = roles.filter(r => !currentRoleNames.includes(r));
      const rolesToRemove = currentRoleNames.filter(r => !roles.includes(r));

      // Precheck do delete em user_roles uma única vez antes do loop —
      // RLS uniforme (admin only), basta uma linha pra cobrir todas as iterações.
      if (rolesToRemove.length > 0) {
        const { data: sampleRole } = await supabase
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .eq('role', paraRoleDoBanco(rolesToRemove[0]))
          .maybeSingle();
        if (sampleRole?.id) {
          await assertCanPerform('user_roles', 'delete', sampleRole.id);
        }
      }
      for (const role of rolesToRemove) {
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', paraRoleDoBanco(role));
        if (error) throw error;
      }
      for (const role of rolesToAdd) {
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: paraRoleDoBanco(role) });
        if (error) throw error;
      }

      // 3. Sync area access
      const hasInternalRole =
        roles.includes('team_member') ||
        roles.includes('lider') ||
        roles.includes('sublider');

      if (hasInternalRole) {
        const selectedCategories = areas.flatMap(
          area => AREA_CATEGORIES_MAP[area as keyof typeof AREA_CATEGORIES_MAP]?.categories || []
        );
        await syncAreaAccess.mutateAsync({
          userId,
          selectedCategories,
          allAreaCategories: ALL_AREA_CATEGORIES,
        });
      }

      // 4. Sync vínculo com a estrutura (só quando a tela mandou a lista).
      // Sem amarrar ao papel de propósito: tirar o papel de membro não deve
      // desvincular ninguém da equipe por baixo dos panos — sair da equipe é
      // gesto explícito, feito no próprio campo.
      if (equipe_ids) {
        await sincronizarEquipesDaEstrutura(
          userId,
          equipe_ids,
          `${first_name} ${last_name}`.trim(),
          logAction,
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      queryClient.invalidateQueries({ queryKey: ['estrutura-membros'] });
      queryClient.invalidateQueries({ queryKey: ['profiles-min-role'] });
      toast.success('Usuário atualizado com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao atualizar usuário');
    },
  });
}

/**
 * Exclusão de team member via edge function `delete-team-member`.
 */
export function useDeleteTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await supabase.functions.invoke('delete-team-member', {
        body: { user_id: userId },
      });
      if (response.error) throw new Error(response.error.message);
      if (response.data?.error) throw new Error(response.data.error);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
      queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
      toast.success('Usuário excluído com sucesso');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Erro ao excluir usuário');
    },
  });
}
