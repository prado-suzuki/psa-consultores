import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { Database } from '@/integrations/supabase/types';
import type { RegistroFamilias, TipoBloco, VarianteFamilia } from '@/lib/templates';

/**
 * Colunas de família de variantes (migration 20260806120000_tmpl_bloco_familia_variantes).
 * O codegen do Supabase já as conhece, mas tipa `variante_seletor` como `Json`; a
 * interseção continua para estreitar esse campo no objeto "caminho => valor esperado"
 * que o resolvedor espera, e para documentar o papel de cada coluna num lugar só.
 */
export interface BlocoVarianteCols {
  /** Cabeça da família. Nulo = bloco normal; preenchido = este bloco é UMA variante. */
  familia_id: string | null;
  /** Condições (caminho => valor esperado) que elegem a variante. Objeto vazio = padrão. */
  variante_seletor: Record<string, unknown> | null;
  variante_rotulo: string | null;
  /** Ordem de avaliação dentro da família (menor primeiro). */
  variante_ordem: number | null;
}

export type BlocoRow =
  Omit<Database['public']['Tables']['tmpl_bloco']['Row'], keyof BlocoVarianteCols> & BlocoVarianteCols;
export type BlocoVersaoRow = Database['public']['Tables']['tmpl_bloco_versao']['Row'];

/** Linha de tmpl_flag com a definição declarativa (colunas novas, fora dos types gerados). */
export interface FlagRow {
  id: string;
  nome: string;
  tipo: 'derivada' | 'manual';
  escopo: string;
  descricao: string | null;
  ativo: boolean;
  entidade: string | null;
  campo: string | null;
  valor: string | null;
}

/** Bloco com a sua versão atual (conteúdo vigente) e as flags requeridas. */
export interface BlocoComVersao extends BlocoRow {
  versao_atual: BlocoVersaoRow | null;
  flag_ids: string[];
  /**
   * Variantes desta família, em ordem de avaliação. Vazio no bloco normal, que é
   * a maioria absoluta: quem tem variantes é a cabeça da família.
   */
  variantes: BlocoComVersao[];
}

const QUERY_KEY = ['biblioteca-modelos', 'blocos'];
const FLAGS_KEY = ['biblioteca-modelos', 'flags'];

/** Catálogo de flags ativas (governam a inclusão condicional de blocos). */
export function useFlags() {
  return useQuery({
    queryKey: FLAGS_KEY,
    queryFn: async (): Promise<FlagRow[]> => {
      const { data, error } = await supabase
        .from('tmpl_flag')
        .select('*')
        .eq('ativo', true)
        .order('nome');
      if (error) throw error;
      return (data ?? []) as unknown as FlagRow[];
    },
  });
}

/**
 * Lista os blocos com a versão marcada como atual e as flags vinculadas.
 * Variantes de família não vêm soltas: cada uma é aninhada em `variantes` da sua
 * cabeça, que é o bloco que o modelo referencia.
 */
export function useBlocos() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<BlocoComVersao[]> => {
      const { data, error } = await supabase
        .from('tmpl_bloco')
        .select('*, tmpl_bloco_versao(*), tmpl_bloco_flag(flag_id)')
        // Blocos canônicos apenas: derivados de override (bloco_origem_id != null)
        // existem só para rastreabilidade de um documento e não entram na Biblioteca
        // nem no montador.
        .is('bloco_origem_id', null)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const linhas: BlocoComVersao[] = (data ?? []).map((bloco) => {
        const versoes = (bloco.tmpl_bloco_versao ?? []) as BlocoVersaoRow[];
        return {
          ...(bloco as unknown as BlocoRow),
          versao_atual: versoes.find((v) => v.atual) ?? null,
          flag_ids: ((bloco.tmpl_bloco_flag ?? []) as Array<{ flag_id: string }>).map((f) => f.flag_id),
          variantes: [],
        };
      });

      // Variante é conteúdo alternativo de uma cláusula, não uma peça de catálogo:
      // aparece aninhada na cabeça, nunca solta (mesmo cuidado dos derivados de
      // override, acima). Variante cuja cabeça não veio na consulta fica de fora,
      // senão viraria uma carta solta com redação parcial.
      const porId = new Map(linhas.map((b) => [b.id, b]));
      for (const b of linhas) {
        if (b.familia_id) porId.get(b.familia_id)?.variantes.push(b);
      }
      for (const b of linhas) {
        if (b.variantes.length > 1) {
          b.variantes.sort((x, y) => (x.variante_ordem ?? 0) - (y.variante_ordem ?? 0));
        }
      }

      return linhas.filter((b) => !b.familia_id);
    },
  });
}

/**
 * Traduz as cabeças de família da Biblioteca no registro que o render consome
 * ({{familia nome="…"}} => variantes elegíveis). A chave é o NOME da cabeça,
 * porque é o nome que o autor do modelo escreve.
 *
 * `conteudoDe` existe para o chamador injetar o texto que vale naquele contexto:
 * a tela Gerar passa o conteúdo com OVERRIDE do documento aplicado, o espelho do
 * diff passa o original, e a versão selada passa o texto congelado no snapshot.
 *
 * Variante inativa ou sem versão publicada fica FORA: sem texto ela renderizaria
 * um trecho vazio no meio do contrato, e é melhor o resolvedor acusar que nenhuma
 * redação atende o caso.
 */
export function montarRegistroFamilias(
  blocos: BlocoComVersao[],
  conteudoDe: (variante: BlocoComVersao) => string | null = (v) => v.versao_atual?.conteudo ?? null,
): RegistroFamilias {
  const registro: RegistroFamilias = {};
  for (const cabeca of blocos) {
    if (cabeca.variantes.length === 0) continue;
    const variantes: VarianteFamilia[] = [];
    for (const v of cabeca.variantes) {
      const conteudo = v.ativo ? conteudoDe(v) : null;
      if (!conteudo) continue;
      variantes.push({
        id: v.id,
        rotulo: v.variante_rotulo,
        ordem: v.variante_ordem ?? 0,
        // O seletor vem de jsonb: os valores são comparados como texto pelo
        // resolvedor, então normaliza aqui em vez de espalhar String() no render.
        seletor: Object.fromEntries(
          Object.entries(v.variante_seletor ?? {}).map(([caminho, valor]) => [caminho, String(valor ?? '')]),
        ),
        conteudo,
      });
    }
    if (variantes.length > 0) registro[cabeca.nome] = variantes;
  }
  return registro;
}

export interface SalvarBlocoInput {
  /** Presente em edição; ausente em criação. */
  id?: string;
  nome: string;
  /** Tipo estrutural (capitulo/clausula/paragrafo/livre) — governa a numeração automática. */
  tipo: TipoBloco;
  categoria: string | null;
  descricao: string | null;
  conteudo: string;
  /** Coleção sobre a qual o bloco repete (uma instância por item na composição) — só faz sentido em parágrafo. */
  repeteColecao?: string | null;
  /** Âncora p/ referências de numeração ({{ refs.ancora }}) — letras/dígitos/underscore. */
  ancora?: string | null;
  /** Motivo da alteração — vira changelog da nova versão (apenas em edição). */
  changelog?: string | null;
  /** Flags requeridas pelo bloco (tmpl_bloco_flag é sincronizada com esta lista). */
  flagIds?: string[];
}

/** Sincroniza a junção tmpl_bloco_flag com a lista desejada (insere novas, remove ausentes). */
async function sincronizarFlagsDoBloco(blocoId: string, flagIds: string[]) {
  const { data: atuais, error: erroAtuais } = await supabase
    .from('tmpl_bloco_flag')
    .select('flag_id')
    .eq('bloco_id', blocoId);
  if (erroAtuais) throw erroAtuais;

  const existentes = new Set((atuais ?? []).map((f) => f.flag_id));
  const desejadas = new Set(flagIds);

  const inserir = flagIds.filter((id) => !existentes.has(id));
  const remover = [...existentes].filter((id) => !desejadas.has(id));

  if (inserir.length > 0) {
    const { error } = await supabase
      .from('tmpl_bloco_flag')
      .insert(inserir.map((flag_id) => ({ bloco_id: blocoId, flag_id })));
    if (error) throw error;
  }
  if (remover.length > 0) {
    const { error } = await supabase
      .from('tmpl_bloco_flag')
      .delete()
      .eq('bloco_id', blocoId)
      .in('flag_id', remover);
    if (error) throw error;
  }
}

/**
 * Cria um bloco novo (com versão 1) ou edita um existente.
 * Na edição, se o conteúdo mudar, cria uma NOVA versão e rebaixa a anterior —
 * garantindo reprodutibilidade dos documentos já gerados (princípio da arquitetura OSG).
 * Mudanças apenas de metadados (nome/categoria/descrição) não geram versão.
 */
export function useSalvarBloco() {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();

  return useMutation({
    mutationFn: async (input: SalvarBlocoInput) => {
      const { data: userData } = await supabase.auth.getUser();
      const autorId = userData.user?.id ?? null;

      // ----- Criação -----
      if (!input.id) {
        const { data: bloco, error: erroBloco } = await supabase
          .from('tmpl_bloco')
          .insert({
            nome: input.nome,
            tipo: input.tipo,
            categoria: input.categoria,
            descricao: input.descricao,
            repete_colecao: input.repeteColecao ?? null,
            ancora: input.ancora ?? null,
            autor_id: autorId,
          })
          .select('*')
          .single();
        if (erroBloco) throw erroBloco;

        // Versão 1 de um bloco recém-criado: sem versão anterior a baixar, mas
        // pela mesma porta das outras, para numeração e marca de `atual` viverem
        // num lugar só.
        const { error: erroVersao } = await supabase.rpc('nova_versao_bloco', {
          _bloco_id: bloco.id,
          _conteudo: input.conteudo,
          _changelog: 'Versão inicial',
        });
        if (erroVersao) {
          // Evita bloco órfão sem versão se a segunda etapa falhar.
          await supabase.from('tmpl_bloco').delete().eq('id', bloco.id);
          throw erroVersao;
        }
        if (input.flagIds) await sincronizarFlagsDoBloco(bloco.id, input.flagIds);
        return { bloco: bloco as BlocoRow, acao: 'created' as const };
      }

      // ----- Edição -----
      const { data: bloco, error: erroBloco } = await supabase
        .from('tmpl_bloco')
        .update({
          nome: input.nome,
          tipo: input.tipo,
          categoria: input.categoria,
          descricao: input.descricao,
          repete_colecao: input.repeteColecao ?? null,
          ancora: input.ancora ?? null,
        })
        .eq('id', input.id)
        .select('*')
        .single();
      if (erroBloco) throw erroBloco;

      // Versão atual para comparar o conteúdo.
      const { data: versaoAtual, error: erroVersaoAtual } = await supabase
        .from('tmpl_bloco_versao')
        .select('*')
        .eq('bloco_id', input.id)
        .eq('atual', true)
        .maybeSingle();
      if (erroVersaoAtual) throw erroVersaoAtual;

      const conteudoMudou = (versaoAtual?.conteudo ?? '') !== input.conteudo;
      if (conteudoMudou) {
        // Baixar a atual e subir a nova numa transação só. Em duas escritas, o
        // bloco ficava sem versão `atual` entre uma e outra — e para sempre, se
        // a segunda falhasse; quem lê resolve `find(v => v.atual) ?? null`, ou
        // seja, o bloco sairia com texto vazio em todo documento que o cita.
        const { error } = await supabase.rpc('nova_versao_bloco', {
          _bloco_id: input.id,
          _conteudo: input.conteudo,
          _changelog: input.changelog ?? undefined,
        });
        if (error) throw error;
      }

      if (input.flagIds) await sincronizarFlagsDoBloco(input.id, input.flagIds);

      return { bloco: bloco as BlocoRow, acao: 'updated' as const, conteudoMudou };
    },
    onSuccess: async ({ bloco, acao }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      await logAction({
        area: 'osg',
        entity_type: 'tmpl_bloco',
        entity_id: bloco.id,
        entity_name: bloco.nome,
        action: acao,
      });
      toast({ title: acao === 'created' ? 'Bloco criado' : 'Bloco salvo', description: bloco.nome });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar bloco', description: error.message, variant: 'destructive' });
    },
  });
}

/** Ativa ou desativa um bloco (soft toggle — não remove do histórico). */
export function useToggleBlocoAtivo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { data, error } = await supabase
        .from('tmpl_bloco')
        .update({ ativo })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data as BlocoRow;
    },
    onSuccess: (bloco) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({ title: bloco.ativo ? 'Bloco ativado' : 'Bloco desativado', description: bloco.nome });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao alterar bloco', description: error.message, variant: 'destructive' });
    },
  });
}
