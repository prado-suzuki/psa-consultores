import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

// Catálogo (documento_tipo, ex-checklist_item_padrao — renomeada na EDU-20) e
// checklist_cliente_item. O `as any` no client é herança de quando essas tabelas
// ainda não estavam no types.ts; hoje já estão, e tipar de verdade é dívida
// separada — aqui só o nome da tabela acompanhou o rename.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

export type ChecklistStatus =
  | 'pendente'
  | 'solicitado'
  | 'recebido'
  | 'dispensado'
  | 'nao_aplicavel'
  | 'nao_solicitado';
export type ChecklistOrigem = 'padrao' | 'manual';
export type Granularidade =
  | 'pessoa_pf' | 'pessoa_pj' | 'matricula_rural' | 'matricula_urbana' | 'bem' | 'cliente';

export interface ChecklistPadraoRow {
  id: string;
  codigo: string;
  modulo: string;
  entidade: string;
  documento: string;
  nota: string | null;
  categoria: string | null;
  categoria_docbox: string | null;
  confidencial: boolean;
  obrigatorio_default: boolean;
  granularidade: Granularidade;
  ordem: number;
  ativo: boolean;
}

export interface ChecklistArquivoLink {
  id: string;
  nome_original: string;
  excluido: boolean;
  status: string;
}

export interface ChecklistClienteRow {
  id: string;
  cliente_id: string;
  item_padrao_id: string | null;
  modulo: string;
  entidade: string;
  documento: string;
  nota: string | null;
  categoria: string | null;
  categoria_docbox: string | null;
  confidencial: boolean;
  obrigatorio: boolean;
  origem: ChecklistOrigem;
  status: ChecklistStatus;
  pessoa_id: string | null;
  bem_id: string | null;
  matricula_id: string | null;
  observacao: string | null;
  arquivos: ChecklistArquivoLink[];
}

const PADRAO_KEY = 'checklist-padrao';
const CLIENTE_KEY = 'checklist-cliente';
/**
 * Chave da lista de checklist de um cliente. Exportada porque o checklist conta
 * como "recebido" o item que tem documento ativo vinculado — então quem mexe em
 * `documento_arquivo` (anexar/excluir) precisa invalidar esta query. Exportar a
 * fábrica em vez do literal evita que um rename aqui silencie a invalidação lá.
 */
export const checklistClienteKey = (clienteId: string) => [CLIENTE_KEY, clienteId];

/**
 * Catálogo PADRÃO editável (os 63 tipos). Fonte da tela e do seletor de condicionais.
 *
 * `cliente_id is null` recorta o padrão: desde a migration 20260807150000 a
 * mesma tabela também guarda os documentos AVULSOS, criados quando alguém pede
 * um documento à mão numa solicitação. Sem este filtro, a lista de escolha
 * passaria a misturar os 67 padrões com a cauda de pedidos avulsos de todos os
 * clientes. Avulso não se acha no catálogo: chega pelo item pedido.
 */
export function useChecklistPadrao() {
  return useQuery({
    queryKey: [PADRAO_KEY],
    queryFn: async (): Promise<ChecklistPadraoRow[]> => {
      const { data, error } = await sb
        .from('documento_tipo')
        .select('*')
        .is('cliente_id', null)
        .eq('ativo', true)
        .order('ordem', { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChecklistPadraoRow[];
    },
  });
}

const AVULSOS_KEY = 'documento-tipo-avulsos';

/**
 * Os tipos AVULSOS de um cliente, indexados pelo item manual que os originou.
 *
 * Existem desde a migration 20260807150000: documento pedido à mão ganha linha
 * própria em `documento_tipo`, fora do catálogo, para o arquivo que responde a
 * ele ter em que se apoiar. Como estão fora do catálogo, nenhum leitor de lista
 * os enxerga — este hook é o caminho.
 *
 * Devolve um mapa id do item → id do tipo, que é o formato que
 * `tiposPedidos` consome: o resto do item (nome, grão) já vem da solicitação.
 */
export function useTiposAvulsosDoCliente(clienteId: string | null) {
  return useQuery({
    queryKey: [AVULSOS_KEY, clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<Record<string, string>> => {
      const { data, error } = await sb
        .from('documento_tipo')
        .select('id, solicitacao_item_id')
        .eq('cliente_id', clienteId)
        .eq('ativo', true);
      if (error) throw error;
      const porItem: Record<string, string> = {};
      for (const linha of (data ?? []) as { id: string; solicitacao_item_id: string | null }[]) {
        if (linha.solicitacao_item_id) porItem[linha.solicitacao_item_id] = linha.id;
      }
      return porItem;
    },
  });
}

/** Itens do checklist de um cliente + os arquivos ligados a cada item (p/ recebido/pendente). */
export function useChecklistClienteItens(clienteId: string | null) {
  return useQuery({
    queryKey: [CLIENTE_KEY, clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<ChecklistClienteRow[]> => {
      const { data, error } = await sb
        .from('checklist_cliente_item')
        .select('*, arquivos:documento_arquivo(id, nome_original, excluido, status)')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return ((data ?? []) as ChecklistClienteRow[]).map((r) => ({
        ...r,
        arquivos: (r.arquivos ?? []).filter((a) => !a.excluido && a.status === 'ativo'),
      }));
    },
  });
}

/** True se o item conta como recebido (tem arquivo ativo vinculado, e não foi dispensado). */
export function itemRecebido(r: ChecklistClienteRow): boolean {
  if (r.status === 'dispensado' || r.status === 'nao_aplicavel' || r.status === 'nao_solicitado') return false;
  return (r.arquivos?.length ?? 0) > 0 || r.status === 'recebido';
}

interface EntidadeInstancia {
  pessoaPF: { id: string }[];
  pessoaPJ: { id: string }[];
  matriculaRural: { id: string }[];
  matriculaUrbana: { id: string }[];
  bens: { id: string }[];
}

function linhaBase(p: ChecklistPadraoRow, clienteId: string) {
  return {
    cliente_id: clienteId,
    item_padrao_id: p.id,
    modulo: p.modulo,
    entidade: p.entidade,
    documento: p.documento,
    nota: p.nota,
    categoria: p.categoria,
    categoria_docbox: p.categoria_docbox,
    confidencial: p.confidencial,
    obrigatorio: p.obrigatorio_default,
    origem: 'padrao' as ChecklistOrigem,
    status: 'pendente' as ChecklistStatus,
    pessoa_id: null as string | null,
    bem_id: null as string | null,
    matricula_id: null as string | null,
  };
}

/**
 * Gera (ou completa) o checklist do cliente: copia os itens obrigatórios do catálogo,
 * criando UMA linha por INSTÂNCIA conforme a granularidade (RG por PF, matrícula por
 * matrícula rural/urbana, etc.). Idempotente: só insere combinações que ainda não existem,
 * então dá pra reexecutar quando o cliente ganhar novas pessoas/matrículas.
 */
export function useGerarChecklistCliente(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<number> => {
      // 1) padrão obrigatório. `cliente_id is null` mantém fora os documentos
      // avulsos (migration 20260807150000): eles nascem de um pedido manual, que
      // por definição não é obrigatório-por-padrão, e multiplicá-los por
      // instância inventaria pendência que ninguém pediu.
      const { data: padrao, error: e1 } = await sb
        .from('documento_tipo')
        .select('*')
        .is('cliente_id', null)
        .eq('ativo', true)
        .eq('obrigatorio_default', true);
      if (e1) throw e1;

      // 2) instâncias do cliente
      const [{ data: pessoas }, { data: bens }, { data: matriculas }, { data: existentes }] =
        await Promise.all([
          sb.from('pessoa').select('id, tipo_pessoa').eq('cliente_id', clienteId),
          sb.from('bem').select('id, tipo_bem').eq('cliente_id', clienteId),
          sb.from('matricula').select('id, tipo_bem, bem:bem!inner(cliente_id, tipo_bem)').eq('bem.cliente_id', clienteId),
          sb.from('checklist_cliente_item')
            .select('item_padrao_id, pessoa_id, bem_id, matricula_id')
            .eq('cliente_id', clienteId),
        ]);

      const ehRural = (m: { tipo_bem: string | null; bem?: { tipo_bem: string | null } }) =>
        (m.tipo_bem ?? m.bem?.tipo_bem ?? '') === 'IR';

      const inst: EntidadeInstancia = {
        pessoaPF: (pessoas ?? []).filter((p: { tipo_pessoa: string }) => p.tipo_pessoa === 'PF'),
        pessoaPJ: (pessoas ?? []).filter((p: { tipo_pessoa: string }) => p.tipo_pessoa === 'PJ'),
        matriculaRural: (matriculas ?? []).filter(ehRural),
        matriculaUrbana: (matriculas ?? []).filter((m: { tipo_bem: string | null; bem?: { tipo_bem: string | null } }) => !ehRural(m)),
        bens: bens ?? [],
      };

      // 3) chave de deduplicação por (item padrão × instância)
      const chave = (itemId: string | null, pid: string | null, bid: string | null, mid: string | null) =>
        `${itemId ?? ''}|${pid ?? ''}|${bid ?? ''}|${mid ?? ''}`;
      const jaTem = new Set<string>(
        (existentes ?? []).map((r: { item_padrao_id: string | null; pessoa_id: string | null; bem_id: string | null; matricula_id: string | null }) =>
          chave(r.item_padrao_id, r.pessoa_id, r.bem_id, r.matricula_id)),
      );

      // 4) monta as linhas faltantes
      const novas: ReturnType<typeof linhaBase>[] = [];
      const push = (p: ChecklistPadraoRow, campo: 'pessoa_id' | 'bem_id' | 'matricula_id' | null, id: string | null) => {
        const pid = campo === 'pessoa_id' ? id : null;
        const bid = campo === 'bem_id' ? id : null;
        const mid = campo === 'matricula_id' ? id : null;
        if (jaTem.has(chave(p.id, pid, bid, mid))) return;
        jaTem.add(chave(p.id, pid, bid, mid));
        novas.push({ ...linhaBase(p, clienteId), pessoa_id: pid, bem_id: bid, matricula_id: mid });
      };

      for (const p of (padrao ?? []) as ChecklistPadraoRow[]) {
        switch (p.granularidade) {
          case 'pessoa_pf': inst.pessoaPF.forEach((x) => push(p, 'pessoa_id', x.id)); break;
          case 'pessoa_pj': inst.pessoaPJ.forEach((x) => push(p, 'pessoa_id', x.id)); break;
          case 'matricula_rural': inst.matriculaRural.forEach((x) => push(p, 'matricula_id', x.id)); break;
          case 'matricula_urbana': inst.matriculaUrbana.forEach((x) => push(p, 'matricula_id', x.id)); break;
          case 'bem': inst.bens.forEach((x) => push(p, 'bem_id', x.id)); break;
          default: push(p, null, null); break; // 'cliente' (agregado)
        }
      }

      if (novas.length === 0) return 0;
      const { error: e2 } = await sb.from('checklist_cliente_item').insert(novas);
      if (e2) throw e2;
      return novas.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: [CLIENTE_KEY, clienteId] });
      toast({ title: n > 0 ? `${n} item(ns) adicionado(s) ao checklist` : 'Checklist já está completo' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro ao gerar checklist', description: (e as Error).message, variant: 'destructive' }),
  });
}

export interface AddCondicionalArgs {
  padrao: ChecklistPadraoRow;
  pessoaId?: string | null;
  bemId?: string | null;
  matriculaId?: string | null;
}

/** Adiciona manualmente um item (normalmente um condicional do catálogo) ao cliente. */
export function useAdicionarCondicional(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ padrao, pessoaId, bemId, matriculaId }: AddCondicionalArgs) => {
      const row = {
        ...linhaBase(padrao, clienteId),
        origem: 'manual' as ChecklistOrigem,
        pessoa_id: pessoaId ?? null,
        bem_id: bemId ?? null,
        matricula_id: matriculaId ?? null,
      };
      const { error } = await sb.from('checklist_cliente_item').insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLIENTE_KEY, clienteId] });
      toast({ title: 'Condicional adicionado ao checklist' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro ao adicionar', description: (e as Error).message, variant: 'destructive' }),
  });
}

/** Muda o status manual do item (dispensado / não aplicável / volta a pendente). */
export function useDefinirStatusItem(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ChecklistStatus }) => {
      const { error } = await sb.from('checklist_cliente_item').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [CLIENTE_KEY, clienteId] }),
    onError: (e: unknown) =>
      toast({ title: 'Erro ao atualizar status', description: (e as Error).message, variant: 'destructive' }),
  });
}

/** Vincula (ou desvincula) um documento_arquivo ao item — é o que torna o item "recebido". */
export function useVincularDocumento(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ documentoId, itemId }: { documentoId: string; itemId: string | null }) => {
      const { error } = await sb
        .from('documento_arquivo')
        .update({ checklist_item_id: itemId })
        .eq('id', documentoId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLIENTE_KEY, clienteId] });
      qc.invalidateQueries({ queryKey: ['documento-arquivo', clienteId] });
      toast({ title: 'Vínculo atualizado' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro ao vincular documento', description: (e as Error).message, variant: 'destructive' }),
  });
}

/** Remove um item do checklist do cliente (usar em itens manuais). */
export function useRemoverChecklistItem(clienteId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from('checklist_cliente_item').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CLIENTE_KEY, clienteId] });
      toast({ title: 'Item removido do checklist' });
    },
    onError: (e: unknown) =>
      toast({ title: 'Erro ao remover', description: (e as Error).message, variant: 'destructive' }),
  });
}
