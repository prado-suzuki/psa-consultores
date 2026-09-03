import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

type AuditArea = 'tax' | 'osg' | 'estrutura' | 'cadastros' | 'dev';

type AuditEntityType =
  | 'project'
  | 'task'
  | 'subtask'
  | 'backlog_item'
  | 'cluster'
  | 'area'
  | 'equipe'
  | 'membro'
  | 'lider'
  | 'produto_segmento'
  | 'servico'
  | 'produto_servico'
  | 'centro_custo'
  | 'empresa'
  | 'cliente'
  | 'contribuinte'
  | 'representante'
  | 'ordem_servico'
  | 'regra_pis_cofins'
  | 'procedimento'
  | 'correcao_icms'
  | 'ciclo_avaliacao'
  | 'meta'
  | 'kpi_meta'
  | 'feedback'
  | 'reuniao_1a1'
  | 'analise_semestral'
  | 'pessoa'
  | 'parentesco'
  | 'administracao'
  | 'quadro_societario'
  | 'movimentacao_quotas'
  | 'ato_societario'
  | 'bem'
  | 'matricula'
  | 'titularidade'
  | 'impedimento'
  | 'cartorio'
  // O instrumento rural é auditado INTEIRO, não uma linha por parte ou por imóvel:
  // um instrumento de 15 imóveis viraria 15 entradas e ninguém leria nenhuma. Por
  // isso as três tabelas filhas (parte / imóvel / origem externa) não têm tipo próprio.
  | 'exploracao_rural'
  | 'tmpl_bloco'
  | 'tmpl_documento'
  | 'documento_arquivo'
  | 'projeto_flag_valor'
  | 'documento_gerado'
  | 'documento_override'
  | 'solicitacao'
  | 'solicitacao_item'
  | 'solicitacao_item_nao_aplicavel'
  | 'org_comment'
  | 'itcd_simulacao'
  // GOV-01: orgao de governanca por cliente.
  | 'orgao_governanca'
  // PT-02: a importacao de um papel de trabalho. Audita-se a IMPORTACAO, e
  // nao os milhares de valores dela: um registro por linha afogaria o log.
  | 'wp_importacao';

interface AuditLogEntry {
  area: AuditArea;
  entity_type: AuditEntityType;
  entity_id: string;
  entity_name: string;
  action: 'created' | 'updated' | 'deleted';
  changed_fields?: Record<string, { old: unknown; new: unknown }>;
  details?: string;
}

export const useAuditLog = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const inserirLog = useCallback(
    async (entry: AuditLogEntry, userId: string) => {
      // `insert` do supabase-js NÃO lança: devolve `{ error }`. Sem checar aqui,
      // uma recusa de RLS passava batida — nem o console.error abaixo rodava.
      const { error } = await supabase.from('audit_logs').insert({
        area: entry.area,
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        entity_name: entry.entity_name,
        action: entry.action,
        // O cast é só do diff: `changed_fields` é uma coluna jsonb, e o tipo `Json`
        // gerado não aceita o `unknown` de dentro do FieldDiff. Antes o escape era
        // no `.from('audit_logs' as any)`, que tirava a checagem da tabela inteira.
        changed_fields: (entry.changed_fields ?? null) as Json,
        performed_by: userId,
        details: entry.details ?? null,
      });
      if (error) throw error;
      // Recém-escrito o log, a timeline do histórico (painel flutuante nos
      // modais de cadastro) fica obsoleta — refetch para refletir na hora,
      // inclusive nas edições de sub-cadastros que não fecham o modal.
      queryClient.invalidateQueries({ queryKey: ['historico-cadastro'] });
    },
    [queryClient],
  );

  /** Registra depois da operação, sem atrapalhar quem chamou se falhar. */
  const logAction = useCallback(
    async (entry: AuditLogEntry) => {
      if (!user?.id) return;
      try {
        await inserirLog(entry, user.id);
      } catch (err) {
        console.error('Audit log error:', err);
      }
    },
    [user?.id, inserirLog],
  );

  /**
   * Igual ao `logAction`, mas propaga a falha.
   *
   * Para quem grava o log ANTES da operação e desiste dela se o log não entrar
   * — o caso das ações que precisam de rastro obrigatório (ex.: exclusão de
   * cliente, que tira o registro da vista de todo mundo que não é admin). Com o
   * `logAction` normal, a operação aconteceria e o log sumiria calado, que é
   * exatamente como a base ficou sem nenhum registro de exclusão de cliente.
   */
  const logActionOrThrow = useCallback(
    async (entry: AuditLogEntry) => {
      if (!user?.id) {
        throw new Error('Sessão expirada. Entre novamente para concluir esta ação.');
      }
      await inserirLog(entry, user.id);
    },
    [user?.id, inserirLog],
  );

  return { logAction, logActionOrThrow };
};
