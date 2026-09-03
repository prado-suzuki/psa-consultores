import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { computeFieldDiff } from '@/lib/diffUtils';
import type { Database, Json } from '@/integrations/supabase/types';
import {
  draftParaCabecalho,
  draftParaImoveis,
  draftParaOrigens,
  draftParaPartes,
  type DraftExploracaoRural,
} from '@/lib/exploracaoRuralModalModels';

export type OsgTipoExploracao = Database['public']['Enums']['osg_tipo_exploracao'];

type ExploracaoRuralRowBase = Database['public']['Tables']['exploracao_rural']['Row'];
export type ExploracaoRuralParteRow = Database['public']['Tables']['exploracao_rural_parte']['Row'];
export type ExploracaoRuralImovelRow = Database['public']['Tables']['exploracao_rural_imovel']['Row'];
export type ExploracaoRuralOrigemRow =
  Database['public']['Tables']['exploracao_rural_origem_externa']['Row'];

/**
 * A linha do instrumento com as três filhas e os nomes que vêm por join.
 *
 * O corpo sai do tipo gerado: coluna nova (ou removida) na migration aparece aqui
 * sozinha, em vez de ficar divergindo de uma cópia escrita à mão.
 *
 * Tudo vem numa consulta só, aninhado. São poucos instrumentos por cliente, e o
 * modal precisa das quatro tabelas juntas para montar o rascunho — quatro
 * requisições em cascata deixariam a tela piscando por nada.
 */
export type ExploracaoRuralEnriched = ExploracaoRuralRowBase & {
  outorgante: { denominacao: string | null; tipo_pessoa: string | null } | null;
  partes: (ExploracaoRuralParteRow & { pessoa: { denominacao: string | null } | null })[];
  imoveis: (ExploracaoRuralImovelRow & {
    matricula: {
      numero: string | null;
      municipio_imovel: string | null;
      uf_imovel: string | null;
      area_documento: number | null;
      area_unidade: string;
      bem: { denominacao: string | null } | null;
    } | null;
  })[];
  origens: ExploracaoRuralOrigemRow[];
};

// TODA FK ambígua é NOMEADA neste select, e as duas que existem aqui têm o mesmo
// motivo: a mesma tabela é alcançável por mais de um caminho.
//
//   · `pessoa` — outorgante do instrumento, parte, contraparte da origem;
//   · `exploracao_rural_imovel` — o imóvel pertence a um instrumento
//     (`exploracao_rural_id`) E pode APONTAR para outro como origem interna da
//     posse (`origem_exploracao_rural_id`). Sem nomear, o PostgREST devolve
//     PGRST201 e a consulta inteira falha — a tela mostra "0 instrumentos" para um
//     cliente que tem dois.
//
// As colunas legadas `explorador_pessoa_id`/`bem_id` NÃO aparecem mais neste
// select — era o que impedia a migration 20260901144839 de remover as 12 mortas.
const SELECT_ENRIQUECIDO = `
  *,
  outorgante:pessoa!outorgante_pessoa_id(denominacao, tipo_pessoa),
  partes:exploracao_rural_parte(*, pessoa:pessoa(denominacao)),
  imoveis:exploracao_rural_imovel!exploracao_rural_imovel_exploracao_rural_id_fkey(
    *,
    matricula:matricula(
      numero, municipio_imovel, uf_imovel, area_documento, area_unidade,
      bem:bem(denominacao)
    )
  ),
  origens:exploracao_rural_origem_externa(*)
`;

export function useExploracaoRural(clienteId: string | null | undefined) {
  return useQuery({
    queryKey: ['exploracao-rural', clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<ExploracaoRuralEnriched[]> => {
      const { data, error } = await supabase
        .from('exploracao_rural')
        .select(SELECT_ENRIQUECIDO)
        .eq('cliente_id', clienteId as string)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ExploracaoRuralEnriched[];
    },
  });
}

/**
 * Instrumentos que podem servir de ORIGEM interna de um imóvel: os do mesmo cliente,
 * menos o que está sendo editado (um instrumento não nasce de si mesmo — é o
 * `CHECK` `origem_exploracao_rural_id <> exploracao_rural_id`).
 */
export function instrumentosDeOrigem(
  todos: ExploracaoRuralEnriched[],
  emEdicao: string | null,
): { id: string; rotulo: string; vigente: boolean }[] {
  // `vigente` é DERIVADO da data de encerramento do instrumento de origem, não um
  // campo — por isso não existe coluna para ele. Mas precisa aparecer na tela: uma
  // origem já encerrada muda como a cláusula que a cita é lida.
  const hoje = new Date().toISOString().slice(0, 10);
  return todos
    .filter((item) => item.id !== emEdicao)
    .map((item) => ({
      id: item.id,
      rotulo: [
        item.referencia || item.tipo_exploracao,
        item.data_assinatura ? item.data_assinatura.split('-').reverse().join('/') : null,
      ]
        .filter(Boolean)
        .join(' · '),
      vigente: !item.data_encerramento || item.data_encerramento >= hoje,
    }));
}

/** Campos do cabeçalho que entram no diff de auditoria. */
const DIFF_FIELDS = [
  'tipo_exploracao', 'referencia', 'outorgante_pessoa_id', 'data_assinatura',
  'data_encerramento', 'data_inicio_vigencia', 'vigencia_prorrogavel',
  'percentual_outorgante', 'percentual_explorador', 'culturas', 'inclui_pecuaria',
  'permite_penhor', 'prazo_indivisao_quantidade', 'prazo_indivisao_unidade',
  'indivisao_prorrogavel', 'indivisao_aviso_quantidade', 'indivisao_aviso_unidade',
  'regra_administracao', 'liquidacao_periodicidade', 'liquidacao_numero_parcelas',
  'estudo_fiscal_documento_id', 'documento_comprobatorio_id',
];

const rotuloDoInstrumento = (row: { referencia: string | null; tipo_exploracao: string }): string =>
  row.referencia?.trim() ? row.referencia : `Exploração rural (${row.tipo_exploracao})`;

/**
 * Traduz o erro do banco para uma frase.
 *
 * As mensagens da RPC já vêm escritas para o consultor (soma das frações, área
 * cedida, parte repetida), então elas passam direto. O que traduzimos é o que sai do
 * Postgres cru — código de constraint não é mensagem.
 */
function mensagemDeErro(error: { message?: string; code?: string }): string {
  const msg = error.message ?? '';
  if (error.code === '23505' || msg.includes('duplicate key')) {
    if (msg.includes('uq_exploracao_rural_imovel')) {
      return 'A mesma matrícula está listada duas vezes neste instrumento.';
    }
    if (msg.includes('uq_exploracao_rural_parte')) {
      return 'A mesma pessoa aparece duas vezes no mesmo papel.';
    }
    return 'Registro repetido: confira se algum item foi listado duas vezes.';
  }
  if (error.code === '42501' || msg.includes('row-level security')) {
    return 'Sem permissão para gravar nesta exploração rural — confira se o cliente é do seu cluster.';
  }
  if (msg.includes('chk_exploracao_rural_imovel_origem_exclusiva')) {
    return 'Um imóvel não pode ter origem interna e origem externa ao mesmo tempo.';
  }
  if (msg.includes('chk_exploracao_rural_parte_fracao_so_compossuidor')) {
    return 'Só compossuidor tem fração. Explorador e administrador nomeado não.';
  }
  return msg || 'Erro ao gravar a exploração rural.';
}

export function useUpsertExploracaoRural() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async ({
      draft,
      clienteId,
      original,
    }: {
      draft: DraftExploracaoRural;
      clienteId: string;
      original?: ExploracaoRuralEnriched | null;
    }) => {
      // Uma chamada só: a RPC grava as quatro tabelas na mesma transação e valida o
      // que `CHECK` não alcança (soma das frações, área cedida × área da matrícula).
      // Ver 20260901154624_exploracao_rural_gravacao_transacional.sql.
      const payload = {
        id: original?.id ?? null,
        cabecalho: draftParaCabecalho(draft, clienteId),
        partes: draftParaPartes(draft),
        origens: draftParaOrigens(draft),
        imoveis: draftParaImoveis(draft),
      };
      const { data, error } = await supabase.rpc('salvar_exploracao_rural', {
        p: payload as unknown as Json,
      });
      if (error) throw error;
      return { id: data as string, original: original ?? null, draft, clienteId };
    },
    onSuccess: async ({ id, original, draft, clienteId }) => {
      queryClient.invalidateQueries({ queryKey: ['exploracao-rural', clienteId] });

      const changed = computeFieldDiff(
        original as unknown as Record<string, unknown> | null,
        draftParaCabecalho(draft, clienteId) as unknown as Record<string, unknown>,
        DIFF_FIELDS,
      );

      // As filhas são auditadas PELO INSTRUMENTO, não uma linha por parte: o log de
      // um instrumento de 15 imóveis viraria 15 entradas e ninguém leria nenhuma.
      await logAction({
        area: 'osg',
        entity_type: 'exploracao_rural',
        entity_id: id,
        entity_name: rotuloDoInstrumento({
          referencia: draft.referencia || null,
          tipo_exploracao: draft.tipo_exploracao,
        }),
        action: original ? 'updated' : 'created',
        changed_fields: Object.keys(changed).length > 0 ? changed : undefined,
      });

      toast({
        title: original ? 'Exploração rural atualizada' : 'Exploração rural cadastrada',
        description: rotuloDoInstrumento({
          referencia: draft.referencia || null,
          tipo_exploracao: draft.tipo_exploracao,
        }),
      });
    },
    onError: (error: { message?: string; code?: string }) => {
      toast({
        title: 'Erro ao salvar exploração rural',
        description: mensagemDeErro(error),
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteExploracaoRural() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (row: ExploracaoRuralEnriched) => {
      // As três filhas saem por `on delete cascade` — declarado na migration, não
      // aqui: apagar filha por filha do front seria a mesma transação partida que a
      // RPC de gravação existe para evitar.
      const { error } = await supabase.from('exploracao_rural').delete().eq('id', row.id);
      if (error) throw error;
      return row;
    },
    onSuccess: async (row) => {
      queryClient.invalidateQueries({ queryKey: ['exploracao-rural', row.cliente_id] });
      await logAction({
        area: 'osg',
        entity_type: 'exploracao_rural',
        entity_id: row.id,
        entity_name: rotuloDoInstrumento(row),
        action: 'deleted',
      });
      toast({ title: 'Exploração rural excluída', description: rotuloDoInstrumento(row) });
    },
    onError: (error: { message?: string; code?: string }) => {
      toast({
        title: 'Erro ao excluir exploração rural',
        description: mensagemDeErro(error),
        variant: 'destructive',
      });
    },
  });
}
