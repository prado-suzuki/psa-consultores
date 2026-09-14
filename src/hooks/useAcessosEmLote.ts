import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AREA_CATEGORIES_MAP, type AreaKey } from '@/config/areaCategories';
import { paginasDaArea, type PaginaComCategoria } from '@/lib/areasDeAcessoDoUsuario';
import { useAuditLog } from './useAuditLog';
import { assertCanPerform } from './useRlsPrecheck';
import { paraRoleDoBanco, type AppRole } from './useUsersWithRoles';

/**
 * As três mutações da matriz de acessos: papel, área de acesso e equipe.
 *
 * ## Uma assinatura só para o clique e para o lote
 *
 * Todas recebem `userIds: string[]`. O clique numa célula da matriz é o caso de
 * `length === 1`, e não uma mutação à parte — duas versões da mesma escrita
 * (uma "simples", outra "em lote") divergiriam em auditoria, em invalidação e
 * na regra de quem pode o quê, e a que diverge é sempre a menos usada.
 *
 * ## Todas devolvem `alterados`, e é isso que o Desfazer usa
 *
 * A mutação primeiro LÊ o estado atual e calcula quem de fato muda. Marcar
 * `admin` em 12 pessoas das quais 9 já eram admin escreve 3 linhas, audita 3 e
 * devolve 3 ids. O Desfazer aplica o inverso **só nesses**, então ele não tira
 * o papel de quem já o tinha antes do clique. Sem esse recorte, desfazer seria
 * destrutivo.
 *
 * ## O que NÃO acontece aqui
 *
 * Tirar `team_member` de alguém não revoga as páginas dele. É o mesmo
 * comportamento do diálogo de edição (lá, sem papel interno o `syncAreaAccess`
 * nem roda) e é deliberado: papel e acesso a página são dois eixos, e a matriz
 * mostra os dois em colunas separadas justamente porque eles não se implicam.
 */

/** O que uma mutação da matriz devolve — a lista de quem realmente mudou. */
export interface ResultadoEmLote {
  alterados: string[];
}

export interface AlvoDaMatriz {
  id: string;
  nome: string;
}

const nomeDe = (alvos: AlvoDaMatriz[], userId: string) =>
  alvos.find((a) => a.id === userId)?.nome ?? userId;

/** Invalidação comum: as chaves que qualquer mudança de acesso toca. */
function useInvalidarAcessos() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['users-with-roles'] });
    queryClient.invalidateQueries({ queryKey: ['user-page-access'] });
    queryClient.invalidateQueries({ queryKey: ['estrutura-membros'] });
    queryClient.invalidateQueries({ queryKey: ['profiles-min-role'] });
    queryClient.invalidateQueries({ queryKey: ['user-accessible-categories'] });
  };
}

/* ── Papel ──────────────────────────────────────────────────────────────── */

export interface AplicarPapelInput {
  userIds: string[];
  papel: AppRole;
  /** `true` concede, `false` remove. */
  conceder: boolean;
  /** Nomes, só para a trilha de auditoria ficar legível. */
  alvos: AlvoDaMatriz[];
}

export function useAplicarPapel() {
  const invalidar = useInvalidarAcessos();
  const { logAction } = useAuditLog();
  const { user: usuarioAtual } = useAuth();

  return useMutation({
    mutationFn: async (
      { userIds, papel, conceder, alvos }: AplicarPapelInput,
    ): Promise<ResultadoEmLote> => {
      /* A trava de se trancar para fora. Ela vive AQUI, e não só no botão: a
         matriz, o lote e qualquer chamador futuro passam por este ponto, e quem
         tira o próprio `admin` perde a própria tela de acessos — sem outra
         conta de admin à mão, não há caminho de volta pelo produto. */
      if (!conceder && papel === 'admin' && usuarioAtual && userIds.includes(usuarioAtual.id)) {
        throw new Error('Você não pode remover o seu próprio papel de Administrador.');
      }

      const { data: atuais, error: erroLeitura } = await supabase
        .from('user_roles')
        .select('id, user_id')
        .in('user_id', userIds)
        .eq('role', paraRoleDoBanco(papel));
      if (erroLeitura) throw erroLeitura;

      const jaTem = new Map((atuais ?? []).map((linha) => [linha.user_id, linha.id]));
      const alterados = userIds.filter((id) => (conceder ? !jaTem.has(id) : jaTem.has(id)));
      if (!alterados.length) return { alterados: [] };

      if (conceder) {
        const { error } = await supabase
          .from('user_roles')
          .insert(alterados.map((userId) => ({ user_id: userId, role: paraRoleDoBanco(papel) })));
        if (error) throw error;
      } else {
        // Precheck uma vez só: a RLS de `user_roles` é uniforme (admin), então
        // uma linha de amostra responde pelo lote inteiro. Mesmo caminho que o
        // `useUpdateTeamMember` já usa.
        await assertCanPerform('user_roles', 'delete', jaTem.get(alterados[0])!);
        const { error } = await supabase
          .from('user_roles')
          .delete()
          .in('user_id', alterados)
          .eq('role', paraRoleDoBanco(papel));
        if (error) throw error;
      }

      for (const userId of alterados) {
        await logAction({
          area: 'estrutura',
          entity_type: 'papel',
          entity_id: userId,
          entity_name: nomeDe(alvos, userId),
          action: 'updated',
          changed_fields: { [`papel_${papel}`]: { old: !conceder, new: conceder } },
          details: `${conceder ? 'Concedido' : 'Removido'} o papel ${papel} pela matriz de acessos`,
        });
      }

      return { alterados };
    },
    onSuccess: invalidar,
  });
}

/* ── Área de acesso ─────────────────────────────────────────────────────── */

export interface AplicarAreaInput {
  userIds: string[];
  area: AreaKey;
  conceder: boolean;
  alvos: AlvoDaMatriz[];
  /** `page_permissions` já carregadas pela tela — a mutação não refaz a query. */
  paginas: PaginaComCategoria[];
}

export function useAplicarAreaDeAcesso() {
  const invalidar = useInvalidarAcessos();
  const { logAction } = useAuditLog();
  const { user: usuarioAtual } = useAuth();

  return useMutation({
    mutationFn: async (
      { userIds, area, conceder, alvos, paginas }: AplicarAreaInput,
    ): Promise<ResultadoEmLote> => {
      const idsDaArea = paginasDaArea(area, paginas);
      if (!idsDaArea.length) {
        throw new Error(
          `A área ${AREA_CATEGORIES_MAP[area].label} não tem nenhuma página cadastrada — não há o que conceder.`,
        );
      }

      const { data: atuais, error: erroLeitura } = await supabase
        .from('user_page_access')
        .select('user_id, page_permission_id')
        .in('user_id', userIds)
        .in('page_permission_id', idsDaArea);
      if (erroLeitura) throw erroLeitura;

      /* "Tem a área" é ter AO MENOS UMA página dela — a mesma regra de
         `areasDeAcessoDoUsuario`, que é o que a célula da matriz desenha.
         Conceder preenche o conjunto inteiro; remover esvazia. */
      const comAlguma = new Set((atuais ?? []).map((linha) => linha.user_id));
      const alterados = userIds.filter((id) => (conceder ? !comAlguma.has(id) : comAlguma.has(id)));
      if (!alterados.length) return { alterados: [] };

      if (conceder) {
        const linhas = alterados.flatMap((userId) =>
          idsDaArea.map((pageId) => ({
            user_id: userId,
            page_permission_id: pageId,
            granted_by: usuarioAtual?.id,
          })),
        );
        const { error } = await supabase
          .from('user_page_access')
          .upsert(linhas, { onConflict: 'user_id,page_permission_id', ignoreDuplicates: true });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_page_access')
          .delete()
          .in('user_id', alterados)
          .in('page_permission_id', idsDaArea);
        if (error) throw error;
      }

      for (const userId of alterados) {
        await logAction({
          area: 'estrutura',
          entity_type: 'area_de_acesso',
          entity_id: userId,
          entity_name: nomeDe(alvos, userId),
          action: 'updated',
          changed_fields: { [`area_${area}`]: { old: !conceder, new: conceder } },
          details:
            `${conceder ? 'Concedida' : 'Removida'} a área ${AREA_CATEGORIES_MAP[area].label} ` +
            `(${idsDaArea.length} páginas) pela matriz de acessos`,
        });
      }

      return { alterados };
    },
    onSuccess: invalidar,
  });
}

/* ── Equipe da estrutura ────────────────────────────────────────────────── */

export interface AplicarEquipeInput {
  userIds: string[];
  equipeId: string;
  /** Nome da equipe, para o log e para o aviso. */
  equipeNome: string;
  conceder: boolean;
  alvos: AlvoDaMatriz[];
}

export function useAplicarEquipe() {
  const invalidar = useInvalidarAcessos();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (
      { userIds, equipeId, equipeNome, conceder, alvos }: AplicarEquipeInput,
    ): Promise<ResultadoEmLote> => {
      const { data: atuais, error: erroLeitura } = await supabase
        .from('estrutura_equipe_membros')
        .select('id, user_id')
        .eq('equipe_id', equipeId)
        .in('user_id', userIds);
      if (erroLeitura) throw erroLeitura;

      const vinculoPorUsuario = new Map((atuais ?? []).map((m) => [m.user_id, m.id]));
      const alterados = userIds.filter((id) =>
        conceder ? !vinculoPorUsuario.has(id) : vinculoPorUsuario.has(id),
      );
      if (!alterados.length) return { alterados: [] };

      if (conceder) {
        const { error } = await supabase
          .from('estrutura_equipe_membros')
          .insert(alterados.map((userId) => ({ equipe_id: equipeId, user_id: userId })));
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('estrutura_equipe_membros')
          .delete()
          .in('id', alterados.map((userId) => vinculoPorUsuario.get(userId)!));
        if (error) throw error;
      }

      for (const userId of alterados) {
        await logAction({
          area: 'estrutura',
          entity_type: 'membro',
          // Ao remover, a linha de vínculo deixa de existir — o id dela não
          // serve de âncora. A pessoa serve, e é por ela que se procura.
          entity_id: userId,
          entity_name: nomeDe(alvos, userId),
          action: conceder ? 'created' : 'deleted',
          details: `${conceder ? 'Adicionado à' : 'Removido da'} equipe ${equipeNome} pela matriz de acessos`,
        });
      }

      return { alterados };
    },
    onSuccess: invalidar,
  });
}

/* ── O aviso com Desfazer ───────────────────────────────────────────────── */

/**
 * O aviso de "pronto", com o botão que reverte.
 *
 * Ele não some sozinho em 4 segundos: são 10, porque o desfazer é a rede de
 * segurança do gesto de um clique só, e um aviso que evapora antes da pessoa
 * perceber o engano não é rede de nenhuma.
 *
 * Quando nada mudou (todo mundo já estava como o clique pediu) não há o que
 * desfazer, e o aviso diz isso em vez de mentir "1 alterado".
 */
export function avisarComDesfazer(
  resultado: ResultadoEmLote,
  texto: { feito: string; nada: string },
  desfazer: (alterados: string[]) => void,
): void {
  if (!resultado.alterados.length) {
    toast.info(texto.nada);
    return;
  }
  toast.success(texto.feito, {
    duration: 10000,
    action: { label: 'Desfazer', onClick: () => desfazer(resultado.alterados) },
  });
}

/** "3 pessoas" / "1 pessoa" — o plural do aviso e da barra de lote. */
export function contagemDePessoas(quantidade: number): string {
  return quantidade === 1 ? '1 pessoa' : `${quantidade} pessoas`;
}
