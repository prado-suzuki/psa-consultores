import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

export type AuditArea = 'tax' | 'osg' | 'auditoria' | 'juridico' | 'estrutura' | 'cadastros' | 'dev';

export type AuditEntityType =
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
  // GOV-02: a Matriz de Alçadas. Audita-se a matriz e a LINHA dela, e nao cada
  // celula: uma linha e o que a pessoa abre, preenche e salva de uma vez, entao
  // e o recorte que o log precisa ter para alguem reconstituir o que mudou.
  | 'matriz_alcadas'
  | 'matriz_atividade'
  // GOV-03: o Acordo de Quotistas. Audita-se o ACORDO INTEIRO, e nenhuma das
  // cinco filhas tem tipo próprio, pelo mesmo motivo do instrumento rural: os
  // quóruns, os ramos, a ordem da preferência, os signatários e as sociedades
  // são listas curtas que a pessoa preenche e salva de uma vez. Uma entrada por
  // linha viraria dezenas de registros para um clique só, e o `changed_fields`
  // já leva cada lista escrita por extenso (ver `lib/acordoQuotistas`).
  | 'acordo_quotistas'
  // PT-02: a importacao de um papel de trabalho. Audita-se a IMPORTACAO, e
  // nao os milhares de valores dela: um registro por linha afogaria o log.
  | 'wp_importacao'
  | 'wp_apresentacao'
  | 'wp_estudo'
  // Os decks .pptx da OSG (patrimonial e societária), da `gerar-apresentacao`.
  // NÃO é o `wp_apresentacao`, que é a tabela do deck tributário: aquela geração
  // grava uma linha e esta não persiste nada. Sem linha para apontar, o
  // `entity_id` aqui é o CLIENTE — a pergunta que se faz ao log é "quem gerou
  // deck de qual cliente", e os nomes dos arquivos vão no `entity_name`.
  | 'apresentacao_osg'
  // GOV-F: o Protocolo de Remuneracao. Mesmo recorte da GOV-02 na grade: audita-se
  // o PROTOCOLO e a LINHA, e nao cada celula, porque a linha e o que a pessoa
  // abre, preenche e salva de uma vez. Os catalogos (tema e item) entram porque
  // sao compartilhados: um item criado para um cliente fica visivel na tela de
  // todo mundo que o cliente alcanca. E a COLUNA entra por um motivo proprio: ela
  // e o que mais varia entre clientes (nenhum dos medidos usa as tres do modelo),
  // e tirar uma leva junto, por cascade, todo o texto escrito nela.
  | 'protocolo_remuneracao'
  | 'protocolo_linha'
  | 'protocolo_tema_governanca'
  | 'protocolo_item_governanca'
  | 'protocolo_beneficiario'
  // Controle de Acessos: o vinculo de PAPEL (`user_roles`) e o de AREA DE
  // ACESSO (o conjunto de paginas de uma area em `user_page_access`). O
  // `entity_id` dos dois e o id da PESSOA, e nao o da linha de vinculo: a
  // pergunta que se faz ao log e sempre "o que mudou no acesso do fulano", e a
  // linha de `user_roles` deixa de existir no momento em que o papel e tirado.
  | 'papel'
  | 'area_de_acesso'
  // O onus sobre a quota: so o ato era auditado, e o gravame nao deixava rastro.
  | 'onus_quota'
  // O MAPA: as duas entidades que o factory de CRUD cria.
  | 'processo'
  | 'documento_processo';

/** `null` e `undefined` são a mesma ausência; o resto compara por valor. */
function mesmoValor(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == null && b == null;
  if (typeof a !== 'object' || typeof b !== 'object') return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Só os campos que mudaram de verdade.
 *
 * Quem chama monta o diff com o objeto inteiro, e o log passava a afirmar
 * alteração em campo que ficou igual. Sem `undefined` quando nada sobra.
 */
export function apenasOQueMudou(
  campos: Record<string, { old: unknown; new: unknown }> | undefined,
): Record<string, { old: unknown; new: unknown }> | undefined {
  if (!campos) return undefined;
  const mudou = Object.entries(campos).filter(([, par]) => !mesmoValor(par.old, par.new));
  return mudou.length > 0 ? Object.fromEntries(mudou) : undefined;
}

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
        changed_fields: (apenasOQueMudou(entry.changed_fields) ?? null) as Json,
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
