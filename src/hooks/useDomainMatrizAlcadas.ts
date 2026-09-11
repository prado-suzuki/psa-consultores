import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuditLog } from '@/hooks/useAuditLog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

/**
 * Camada de dados da Matriz de Alçadas (GOV-02).
 *
 * A Matriz é uma grade: ATIVIDADES em linha, ÓRGÃOS em coluna, e na célula o que
 * aquele órgão faz naquela atividade. Os órgãos vêm da GOV-01; as atividades e os
 * papéis vêm de dois catálogos compartilhados.
 *
 * **A leitura é uma só.** A tela precisa da grade inteira de uma vez, senão cada
 * célula viraria uma consulta e 115 células virariam 115 idas ao banco. Por isso
 * `useMatrizDoCliente` traz matriz, linhas, células e papéis num aninhamento só,
 * e a tela monta a grade em memória.
 *
 * **A escrita é por LINHA, e não por célula.** Quem preenche pensa por atividade,
 * que é como a planilha é organizada e como a entrevista de diagnóstico anda. O
 * `salvarLinha` recebe as células daquela atividade inteiras e as substitui, o
 * que evita meia dúzia de mutações penduradas na mesma caixa aberta.
 *
 * SEM FILTRO DE `ambiente`, pelo mesmo motivo da GOV-01: nenhuma destas tabelas
 * tem a coluna, o ambiente é o do cliente, e a tela só oferece cliente do
 * ambiente corrente.
 */

type MatrizRow = Database['public']['Tables']['matriz_alcadas']['Row'];
type AtividadeCatalogoRow = Database['public']['Tables']['atividade_governanca']['Row'];
type PapelRow = Database['public']['Tables']['papel_governanca']['Row'];
type CompetenciaRow = Database['public']['Tables']['matriz_competencia']['Row'];

export type AtividadeDoCatalogo = AtividadeCatalogoRow;
export type PapelDeGovernanca = PapelRow;

/** Uma célula, com os papéis já resolvidos. */
export interface Competencia extends CompetenciaRow {
  papeis: string[];
}

/** Uma linha da matriz, com as células de todos os órgãos. */
export interface LinhaDaMatriz {
  id: string;
  atividade_id: string;
  ordem: number;
  detalhamento: string | null;
  competencias: Competencia[];
}

export interface MatrizDoCliente {
  matriz: MatrizRow;
  linhas: LinhaDaMatriz[];
}

/** O que a tela manda ao salvar UMA célula. */
export interface CompetenciaInput {
  orgao_id: string;
  nao_participa: boolean;
  papeis: string[];
  sobe_para_orgao_id: string | null;
  alcada_valor: number | null;
  alcada_unidade: 'moeda' | 'percentual' | null;
  alcada_base: string | null;
  /**
   * Esta celula tambem trata do que foge da politica ou do orcamento.
   *
   * Era um par motivo + orgao, e o par pedia um endereco que nao varia: nas 48
   * celulas medidas em cinco matrizes reais, o destino da excecao e sempre o
   * mesmo do `sobe_para_orgao_id`. Virou bandeira, e quem le a bandeira decide
   * a frase pelo `sobe_para`: com destino, "e submete a X o que estiver fora da
   * politica"; sem destino, "e autorizar os atos nao previstos nestas
   * politicas", que e a redacao do lado de quem recebe.
   */
  fora_da_politica: boolean;
}

export const matrizQueryKey = (clienteId?: string | null) =>
  ['matriz-alcadas', clienteId ?? null] as const;

export const catalogoAtividadesQueryKey = (clienteId?: string | null) =>
  ['matriz-atividades-catalogo', clienteId ?? null] as const;

export const catalogoPapeisQueryKey = () => ['matriz-papeis-catalogo'] as const;

// ─── Catálogos ────────────────────────────────────────────────────────────────

/**
 * As atividades disponíveis: as padrão da OSG mais as que este cliente criou.
 *
 * O `or` com `is.null` é o que traz as duas famílias numa consulta. A RLS já
 * garante que o cliente de outro não vem junto.
 */
export function useCatalogoDeAtividades(clienteId?: string | null) {
  return useQuery<AtividadeDoCatalogo[]>({
    queryKey: catalogoAtividadesQueryKey(clienteId),
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('atividade_governanca')
        .select('*')
        .or(`cliente_id.is.null,cliente_id.eq.${clienteId}`)
        .eq('excluido', false)
        .order('ordem')
        .order('nome');
      if (error) throw error;
      return data ?? [];
    },
  });
}

/** O catálogo de papéis: os padrão da OSG mais os que este cliente criou. */
export function useCatalogoDePapeis(clienteId?: string | null) {
  return useQuery<PapelDeGovernanca[]>({
    queryKey: [...catalogoPapeisQueryKey(), clienteId ?? null],
    queryFn: async () => {
      const consulta = supabase.from('papel_governanca').select('*').eq('excluido', false);
      const { data, error } = await (clienteId
        ? consulta.or(`cliente_id.is.null,cliente_id.eq.${clienteId}`)
        : consulta.is('cliente_id', null)
      ).order('ordem');
      if (error) throw error;
      return data ?? [];
    },
  });
}

// ─── A matriz ─────────────────────────────────────────────────────────────────

/**
 * A matriz vigente do cliente, com tudo dentro.
 *
 * Devolve `null` quando o cliente ainda não tem matriz, e é a tela que oferece
 * criar. Traz a de maior versão: versões antigas ficam guardadas porque cada uma
 * virou um contrato, mas quem edita edita a atual.
 */
export function useMatrizDoCliente(clienteId?: string | null) {
  return useQuery<MatrizDoCliente | null>({
    queryKey: matrizQueryKey(clienteId),
    enabled: !!clienteId,
    queryFn: async () => {
      const { data: matriz, error: erroMatriz } = await supabase
        .from('matriz_alcadas')
        .select('*')
        .eq('cliente_id', clienteId as string)
        .eq('excluido', false)
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (erroMatriz) throw erroMatriz;
      if (!matriz) return null;

      const { data: linhas, error: erroLinhas } = await supabase
        .from('matriz_atividade')
        .select('id, atividade_id, ordem, detalhamento, matriz_competencia(*)')
        .eq('matriz_id', matriz.id)
        .order('ordem');
      if (erroLinhas) throw erroLinhas;

      const idsDeCelula = (linhas ?? []).flatMap((l) =>
        (l.matriz_competencia ?? []).map((c) => c.id),
      );

      /*
       * Os papéis vêm numa consulta só, e não uma por célula. Com 115 células e
       * um a três papéis cada, a segunda forma seria mais de cem idas ao banco
       * para desenhar uma tela.
       */
      const papeisPorCelula = new Map<string, string[]>();
      if (idsDeCelula.length > 0) {
        const { data: elos, error: erroElos } = await supabase
          .from('matriz_competencia_papel')
          .select('competencia_id, papel_id, ordem')
          .in('competencia_id', idsDeCelula)
          .order('ordem');
        if (erroElos) throw erroElos;
        for (const elo of elos ?? []) {
          const lista = papeisPorCelula.get(elo.competencia_id) ?? [];
          lista.push(elo.papel_id);
          papeisPorCelula.set(elo.competencia_id, lista);
        }
      }

      return {
        matriz,
        linhas: (linhas ?? []).map((l) => ({
          id: l.id,
          atividade_id: l.atividade_id,
          ordem: l.ordem,
          detalhamento: l.detalhamento,
          competencias: (l.matriz_competencia ?? []).map((c) => ({
            ...c,
            papeis: papeisPorCelula.get(c.id) ?? [],
          })),
        })),
      };
    },
  });
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

export function useMatrizMutations(clienteId?: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: matrizQueryKey(clienteId) });
    queryClient.invalidateQueries({ queryKey: catalogoAtividadesQueryKey(clienteId) });
  };

  /**
   * Cria a matriz do cliente e já traz as atividades padrão como linhas.
   *
   * As 24 entram de uma vez, e não uma a uma: a matriz do modelo tem todas, e
   * quem preenche tira o que não se aplica, como faz na planilha. Começar vazio
   * obrigaria a escolher 24 vezes antes de digitar o primeiro papel.
   */
  const criarMatriz = useMutation({
    mutationFn: async () => {
      const { data: matriz, error } = await supabase
        .from('matriz_alcadas')
        .insert({
          cliente_id: clienteId as string,
          data_referencia: new Date().toISOString().slice(0, 10),
          versao: 1,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      const { data: padrao, error: erroPadrao } = await supabase
        .from('atividade_governanca')
        .select('id, ordem')
        .is('cliente_id', null)
        .eq('excluido', false)
        .order('ordem');
      if (erroPadrao) throw erroPadrao;

      if ((padrao ?? []).length > 0) {
        const { error: erroLinhas } = await supabase.from('matriz_atividade').insert(
          (padrao ?? []).map((a) => ({
            matriz_id: matriz.id,
            atividade_id: a.id,
            ordem: a.ordem,
            created_by: user?.id ?? null,
            updated_by: user?.id ?? null,
          })),
        );
        if (erroLinhas) throw erroLinhas;
      }

      await logAction({
        area: 'osg',
        entity_type: 'matriz_alcadas',
        entity_id: matriz.id,
        entity_name: `Matriz versão ${matriz.versao}`,
        action: 'created',
      });

      return matriz;
    },
    onSuccess: () => {
      invalidar();
      toast.success('Matriz criada com as atividades padrão');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Não consegui criar'),
  });

  /**
   * Substitui as células de UMA linha.
   *
   * Apaga e regrava em vez de reconciliar célula a célula. São no máximo seis
   * células por linha, e comparar o que mudou custaria mais código do que o
   * banco gasta para refazer. O `matriz_competencia_papel` cai por cascade.
   */
  const salvarLinha = useMutation({
    mutationFn: async (args: {
      linhaId: string;
      detalhamento: string | null;
      competencias: CompetenciaInput[];
      rotulo: string;
      /** O que mudou, celula a celula, ja em nome de gente. Ver `lib/matrizAlcadas`. */
      diff: Record<string, { old: string; new: string }>;
    }) => {
      const { error: erroLinha } = await supabase
        .from('matriz_atividade')
        .update({ detalhamento: args.detalhamento, updated_by: user?.id ?? null })
        .eq('id', args.linhaId);
      if (erroLinha) throw erroLinha;

      const { error: erroApagar } = await supabase
        .from('matriz_competencia')
        .delete()
        .eq('matriz_atividade_id', args.linhaId);
      if (erroApagar) throw erroApagar;

      /* Célula em branco não vira linha: o vazio na grade já diz o que precisa. */
      const aGravar = args.competencias.filter(
        (c) => c.nao_participa || c.papeis.length > 0 || c.sobe_para_orgao_id || c.alcada_valor,
      );
      if (aGravar.length === 0) return;

      const { data: criadas, error: erroCelulas } = await supabase
        .from('matriz_competencia')
        .insert(
          aGravar.map((c) => ({
            matriz_atividade_id: args.linhaId,
            orgao_id: c.orgao_id,
            nao_participa: c.nao_participa,
            sobe_para_orgao_id: c.nao_participa ? null : c.sobe_para_orgao_id,
            alcada_valor: c.nao_participa ? null : c.alcada_valor,
            alcada_unidade: c.nao_participa ? null : c.alcada_unidade,
            alcada_base: c.nao_participa ? null : c.alcada_base,
            fora_da_politica: c.nao_participa ? false : c.fora_da_politica,
            created_by: user?.id ?? null,
            updated_by: user?.id ?? null,
          })),
        )
        .select('id, orgao_id');
      if (erroCelulas) throw erroCelulas;

      const elos = (criadas ?? []).flatMap((celula) => {
        const entrada = aGravar.find((c) => c.orgao_id === celula.orgao_id);
        return (entrada?.papeis ?? []).map((papelId, i) => ({
          competencia_id: celula.id,
          papel_id: papelId,
          ordem: i + 1,
          created_by: user?.id ?? null,
        }));
      });
      if (elos.length > 0) {
        const { error: erroElos } = await supabase.from('matriz_competencia_papel').insert(elos);
        if (erroElos) throw erroElos;
      }

      /*
       * Nada mudou, nada se audita: senao o historico enche de linha de quem so
       * abriu a caixa e fechou. Mesma regra da GOV-01.
       */
      if (Object.keys(args.diff).length > 0) {
        await logAction({
          area: 'osg',
          entity_type: 'matriz_atividade',
          entity_id: args.linhaId,
          entity_name: args.rotulo,
          action: 'updated',
          changed_fields: args.diff,
        });
      }
    },
    onSuccess: () => {
      invalidar();
      toast.success('Linha salva');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Não consegui salvar'),
  });

  /**
   * Tira uma atividade da matriz.
   *
   * O estado vazio promete que a pessoa "tira as que não se aplicam", e sem isto
   * a promessa ficava sem botão. As células caem por cascade; o catálogo não é
   * tocado, então a atividade pode voltar depois.
   */
  const removerLinha = useMutation({
    mutationFn: async (args: { linhaId: string; rotulo: string }) => {
      const { error } = await supabase.from('matriz_atividade').delete().eq('id', args.linhaId);
      if (error) throw error;
      await logAction({
        area: 'osg',
        entity_type: 'matriz_atividade',
        entity_id: args.linhaId,
        entity_name: args.rotulo,
        action: 'deleted',
      });
    },
    onSuccess: () => {
      invalidar();
      toast.success('Atividade tirada da matriz');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Não consegui tirar'),
  });

  /** Traz de volta, ou acrescenta pela primeira vez, atividades do catálogo. */
  const adicionarAtividades = useMutation({
    mutationFn: async (args: { matrizId: string; atividadeIds: string[]; ordemBase: number }) => {
      const { error } = await supabase.from('matriz_atividade').insert(
        args.atividadeIds.map((id, i) => ({
          matriz_id: args.matrizId,
          atividade_id: id,
          ordem: args.ordemBase + (i + 1) * 10,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })),
      );
      if (error) throw error;
    },
    onSuccess: () => {
      invalidar();
      toast.success('Atividade acrescentada');
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Não consegui acrescentar'),
  });

  /**
   * Cria uma atividade que só existe neste cliente, e já a põe na matriz.
   *
   * É a metade do catálogo que faltava: as 24 padrão cobrem o modelo, e o cliente
   * real traz as dele. Medido: o Grupo Mattei tem nove que o modelo não tem, todas
   * operacionais e rurais.
   */
  const criarAtividadeDoCliente = useMutation({
    mutationFn: async (args: { matrizId: string; nome: string; ordemBase: number }) => {
      const { data: atividade, error } = await supabase
        .from('atividade_governanca')
        .insert({
          cliente_id: clienteId as string,
          nome: args.nome,
          ordem: args.ordemBase + 10,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      const { error: erroLinha } = await supabase.from('matriz_atividade').insert({
        matriz_id: args.matrizId,
        atividade_id: atividade.id,
        ordem: args.ordemBase + 10,
        created_by: user?.id ?? null,
        updated_by: user?.id ?? null,
      });
      if (erroLinha) throw erroLinha;

      await logAction({
        area: 'osg',
        entity_type: 'matriz_atividade',
        entity_id: atividade.id,
        entity_name: atividade.nome,
        action: 'created',
      });
      return atividade;
    },
    onSuccess: () => {
      invalidar();
      toast.success('Atividade criada e posta na matriz');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Não consegui criar'),
  });

  /**
   * Cria um papel que so existe neste cliente.
   *
   * A outra metade do catalogo, a mesma que as atividades ja tinham. As 29
   * padrao saem das 110 celulas do modelo VF, e cliente real usa verbo fora
   * dela: o proprio modelo diz "Solicita" numa linha, e a Produtecnica usa
   * "contrata" seis vezes. Sem isto o consultor trava no meio do preenchimento.
   */
  const criarPapel = useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from('papel_governanca')
        .insert({
          cliente_id: clienteId as string,
          nome,
          grupo: 'Deste cliente',
          ordem: 900,
          created_by: user?.id ?? null,
          updated_by: user?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: catalogoPapeisQueryKey() });
      toast.success('Papel criado');
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Nao consegui criar o papel'),
  });

  return {
    criarMatriz,
    salvarLinha,
    removerLinha,
    adicionarAtividades,
    criarAtividadeDoCliente,
    criarPapel,
  };
}
