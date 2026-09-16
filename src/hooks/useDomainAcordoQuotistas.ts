import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { useAuditLog } from '@/hooks/useAuditLog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  QUORUNS_PADRAO,
  mecanismosPadrao,
  type BaseQuorum,
  type TipoQuorum,
} from '@/lib/acordoQuotistasPadrao';
import {
  diffDasListas,
  diffDoAcordo,
  resumoDaOrdem,
  resumoDosQuoruns,
  resumoDosRamos,
} from '@/lib/acordoQuotistas';

/**
 * Camada de dados do Acordo de Quotistas (GOV-03).
 *
 * O acordo é o contrato ENTRE OS SÓCIOS, e não da sociedade: o contrato social
 * diz quem é dono de quanto e quem manda, e o acordo diz o que acontece quando
 * alguém quer sair, morre, se separa ou quer vender.
 *
 * UM ACORDO POR CLIENTE, VERSIONADO, no mesmo desenho da Matriz de Alçadas. A
 * versão anterior não some porque o acordo vira cláusula de contrato, e saber
 * qual versão virou qual contrato importa. A leitura sempre traz a mais recente.
 *
 * SEM FILTRO DE `ambiente`, e é de propósito: nenhuma das seis tabelas tem a
 * coluna, porque o ambiente delas é o do cliente a que pertencem, como em
 * `orgao_governanca` e `matriz_alcadas`. A leitura é sempre por um cliente já
 * escolhido na tela, e a tela só oferece cliente do ambiente corrente.
 *
 * AS LISTAS FILHAS SÃO SUBSTITUÍDAS INTEIRAS, e não reconciliadas linha a linha.
 * São no máximo sete quóruns e um punhado de ramos; comparar o que mudou custaria
 * mais código do que o banco gasta para refazer. É a mesma escolha do
 * `salvarLinha` da Matriz, e o preço é o mesmo: entre o apagar e o gravar existe
 * uma janela, e um erro de rede no meio deixa a lista vazia. Para lista de sete
 * linhas que a tela recarrega em seguida, o troco compensa.
 */

type AcordoRow = Database['public']['Tables']['acordo_quotistas']['Row'];
type QuorumRow = Database['public']['Tables']['acordo_quorum']['Row'];
type RamoRow = Database['public']['Tables']['acordo_ramo_familiar']['Row'];
type OrdemRow = Database['public']['Tables']['acordo_ordem_preferencia']['Row'];
type SignatarioRow = Database['public']['Tables']['acordo_signatario']['Row'];
type SociedadeRow = Database['public']['Tables']['acordo_sociedade_relacionada']['Row'];

export type AcordoQuotistas = AcordoRow;
export type QuorumDoAcordo = QuorumRow;
export type RamoFamiliar = RamoRow;

/** O acordo com tudo o que pende dele, que é o que a tela desenha de uma vez. */
export interface AcordoCompleto {
  acordo: AcordoRow;
  quoruns: QuorumRow[];
  ramos: RamoRow[];
  ordemPreferencia: OrdemRow[];
  signatarios: SignatarioRow[];
  sociedades: SociedadeRow[];
}

/** O que a tela manda gravar no cabeçalho. Sem id, versão nem auditoria. */
export type AcordoInput = Partial<
  Omit<
    AcordoRow,
    'id' | 'cliente_id' | 'versao' | 'excluido' | 'created_at' | 'created_by' | 'updated_at' | 'updated_by'
  >
>;

export interface QuorumInput {
  materia: string;
  chave?: string | null;
  tipo: TipoQuorum;
  percentual?: number | null;
  base: BaseQuorum;
}

export interface RamoInput {
  nome: string;
}

export const acordoQueryKey = (clienteId?: string | null, acordoId?: string | null) =>
  ['acordo-quotistas', clienteId ?? null, acordoId ?? 'atual'] as const;

export const versoesDoAcordoQueryKey = (clienteId?: string | null) =>
  ['acordo-quotistas-versoes', clienteId ?? null] as const;

/** Uma linha do histórico: o bastante para a lista, sem carregar as filhas. */
export interface VersaoDoAcordo {
  id: string;
  versao: number;
  assinado_em: string | null;
  data_referencia: string | null;
  created_at: string;
  created_by: string | null;
}

// ─── Leitura ──────────────────────────────────────────────────────────────────

/**
 * O acordo vigente do cliente, com as cinco listas, numa ida só ao banco.
 *
 * Embutir as filhas no `select` em vez de fazer seis consultas: a tela precisa de
 * todas ao abrir, e seis idas seriam seis esperas para desenhar uma janela.
 */
export function useAcordoDoCliente(clienteId?: string | null, acordoId?: string | null) {
  return useQuery<AcordoCompleto | null>({
    queryKey: acordoQueryKey(clienteId, acordoId),
    enabled: !!clienteId,
    queryFn: async () => {
      /*
       * SEM `acordoId`, a versão mais alta; com ele, aquela versão.
       *
       * O filtro por id não dispensa o `cliente_id`: a RLS já barra o acordo de
       * outro cliente, mas um id vindo da URL não deve nem chegar ao banco
       * apontando para fora do cliente escolhido na barra.
       */
      const consulta = supabase
        .from('acordo_quotistas')
        /*
         * UMA LINHA SÓ, e não duas concatenadas com `+`.
         *
         * O cliente do Supabase deduz o TIPO do retorno lendo o texto do select
         * como literal. Quebrado em `'a' + 'b'`, o tipo vira `string` e a
         * dedução desiste, devolvendo `{ error: true }`: as cinco filhas somem
         * do tipo e o `data` deixa de ser objeto. Compilava assim mesmo porque o
         * `tsc --noEmit` que eu rodava não checa nada neste projeto de
         * referências; quem acusa é `npm run typecheck`.
         */
        .select('*, acordo_quorum(*), acordo_ramo_familiar(*), acordo_ordem_preferencia(*), acordo_signatario(*), acordo_sociedade_relacionada(*)')
        .eq('cliente_id', clienteId as string)
        .eq('excluido', false);

      const { data, error } = acordoId
        ? await consulta.eq('id', acordoId).maybeSingle()
        : await consulta.order('versao', { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      if (!data) return null;

      const {
        acordo_quorum: quoruns,
        acordo_ramo_familiar: ramos,
        acordo_ordem_preferencia: ordem,
        acordo_signatario: signatarios,
        acordo_sociedade_relacionada: sociedades,
        ...acordo
      } = data;

      const porOrdem = <T extends { ordem: number }>(l: T[] | null) =>
        [...(l ?? [])].sort((a, b) => a.ordem - b.ordem);

      return {
        acordo,
        quoruns: porOrdem(quoruns),
        ramos: porOrdem(ramos),
        ordemPreferencia: porOrdem(ordem),
        signatarios: porOrdem(signatarios),
        sociedades: porOrdem(sociedades),
      };
    },
  });
}

/**
 * TODAS as versões do acordo deste cliente, da mais nova para a mais velha.
 *
 * Consulta separada, e não um campo do acordo: a tela abre sempre numa versão
 * só, e trazer as filhas de todas seria carregar seis tabelas vezes o número de
 * versões para desenhar uma lista de datas.
 *
 * Existe porque a versão anterior ficava INALCANÇÁVEL. `useAcordoDoCliente`
 * pega a de número mais alto, e quem criasse a versão 2 perdia a 1 de vista: ela
 * seguia no banco, sem lista, sem link e sem volta.
 */
export function useVersoesDoAcordo(clienteId?: string | null) {
  return useQuery<VersaoDoAcordo[]>({
    queryKey: versoesDoAcordoQueryKey(clienteId),
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('acordo_quotistas')
        .select('id, versao, assinado_em, data_referencia, created_at, created_by')
        .eq('cliente_id', clienteId as string)
        .eq('excluido', false)
        .order('versao', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * TODAS as versões do acordo, cada uma com as cinco listas.
 *
 * A tela Gerar tem seletor de papel, e o consultor tem de poder escolher QUAL
 * versão o documento vai reproduzir: a versão 2 pode ser a negociação em curso
 * enquanto a 1 é a assinada e vigente. Enquanto só a mais nova chegava aqui, o
 * seletor mostrava um candidato e não havia escolha nenhuma a fazer.
 *
 * É a mesma consulta de `useAcordoDoCliente`, sem o `limit(1)`. Traz as filhas
 * de todas as versões de uma vez: são poucas por cliente, e a alternativa é uma
 * ida ao banco por versão escolhida.
 */
export function useAcordosDoCliente(clienteId?: string | null) {
  return useQuery<AcordoCompleto[]>({
    queryKey: ['acordo-quotistas', clienteId ?? null, 'todos'],
    enabled: !!clienteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('acordo_quotistas')
        .select('*, acordo_quorum(*), acordo_ramo_familiar(*), acordo_ordem_preferencia(*), acordo_signatario(*), acordo_sociedade_relacionada(*)')
        .eq('cliente_id', clienteId as string)
        .eq('excluido', false)
        .order('versao', { ascending: false });
      if (error) throw error;

      const porOrdem = <T extends { ordem: number }>(l: T[] | null) =>
        [...(l ?? [])].sort((a, b) => a.ordem - b.ordem);

      return (data ?? []).map((linha) => {
        const {
          acordo_quorum: quoruns,
          acordo_ramo_familiar: ramos,
          acordo_ordem_preferencia: ordem,
          acordo_signatario: signatarios,
          acordo_sociedade_relacionada: sociedades,
          ...acordo
        } = linha;
        return {
          acordo,
          quoruns: porOrdem(quoruns),
          ramos: porOrdem(ramos),
          ordemPreferencia: porOrdem(ordem),
          signatarios: porOrdem(signatarios),
          sociedades: porOrdem(sociedades),
        } as AcordoCompleto;
      });
    },
  });
}

// ─── Escrita ──────────────────────────────────────────────────────────────────

export function useAcordoMutations(clienteId?: string | null) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();

  /*
   * As DUAS consultas, e não só a do acordo.
   *
   * A chave do acordo ganhou o id da versão vista, então uma invalidação com a
   * chave de três partes não alcança as outras. `invalidateQueries` casa por
   * prefixo, e é por isso que a chave parcial basta aqui. A lista de versões tem
   * chave própria e precisa da sua: sem ela, criar a versão 2 deixaria o
   * histórico mostrando só a 1.
   */
  const invalidar = () => {
    queryClient.invalidateQueries({ queryKey: ['acordo-quotistas', clienteId ?? null] });
    queryClient.invalidateQueries({ queryKey: versoesDoAcordoQueryKey(clienteId) });
  };

  const carimbo = () => ({ created_by: user?.id ?? null, updated_by: user?.id ?? null });

  /**
   * Cria o acordo do cliente já semeado.
   *
   * Os sete quóruns entram preenchidos com o que foi medido no modelo, e os
   * mecanismos padrão vêm marcados. Nascer vazio obrigaria o consultor a digitar
   * sete linhas antes de olhar o primeiro campo que interessa a ele, e a semente
   * é justamente o que o escritório usa em quase todo acordo.
   *
   * A semente sai de `acordoQuotistasPadrao`, em código: quando a consultoria
   * responder, muda lá e todo acordo criado a partir dali nasce certo. Acordo já
   * criado não muda, porque os valores dele já são dados daquele cliente.
   */
  const criarAcordo = useMutation({
    mutationFn: async () => {
      if (!clienteId) throw new Error('Selecione um cliente antes de criar o acordo.');

      const { data: acordo, error } = await supabase
        .from('acordo_quotistas')
        .insert({
          cliente_id: clienteId,
          data_referencia: new Date().toISOString().slice(0, 10),
          versao: 1,
          mecanismos: mecanismosPadrao(),
          ...carimbo(),
        })
        .select()
        .single();
      if (error) throw error;

      const { error: erroQuoruns } = await supabase.from('acordo_quorum').insert(
        QUORUNS_PADRAO.map((q, i) => ({
          acordo_id: acordo.id,
          chave: q.chave,
          materia: q.materia,
          tipo: q.tipo,
          percentual: q.percentual ?? null,
          base: q.base,
          ordem: i,
          ...carimbo(),
        })),
      );
      if (erroQuoruns) throw erroQuoruns;

      await logAction({
        area: 'osg',
        entity_type: 'acordo_quotistas',
        entity_id: acordo.id,
        entity_name: `Acordo de Quotistas, versão ${acordo.versao}`,
        action: 'created',
      });

      return acordo;
    },
    onSuccess: () => {
      invalidar();
      toast.success('Acordo criado com os quóruns padrão');
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Não consegui criar o acordo'),
  });

  /**
   * Grava o cabeçalho, com o histórico em nome de gente.
   *
   * O diff sai da comparação com a linha atual, e não do formulário inteiro: sem
   * isso o log registraria como alteração todo campo que a pessoa apenas viu.
   */
  const salvarAcordo = useMutation({
    mutationFn: async (args: { id: string; campos: AcordoInput; grupo?: string }) => {
      const { data: atual, error: erroLeitura } = await supabase
        .from('acordo_quotistas')
        .select('*')
        .eq('id', args.id)
        .single();
      if (erroLeitura) throw erroLeitura;

      const mudou = diffDoAcordo(
        atual as unknown as Record<string, unknown>,
        args.campos as Record<string, unknown>,
      );

      /*
       * O BLOCO VIRA CONFERIDO AO SALVAR, mesmo que nada tenha mudado.
       *
       * São coisas diferentes: `mudou` diz se algum valor é outro, e conferido diz
       * que alguém abriu e concordou. O acordo nasce semeado, então o caso mais
       * comum de um bloco correto é justamente o de abrir, ler e fechar sem
       * digitar nada. Se só o que muda contasse, esse bloco ficaria eternamente
       * por conferir.
       */
      const conferidos = new Set<string>(atual.grupos_conferidos ?? []);
      const conferindo = args.grupo && !conferidos.has(args.grupo);
      if (conferindo) conferidos.add(args.grupo!);

      if (Object.keys(mudou).length === 0 && !conferindo) return atual;

      const { data, error } = await supabase
        .from('acordo_quotistas')
        .update({
          ...args.campos,
          grupos_conferidos: [...conferidos],
          updated_by: user?.id ?? null,
        })
        .eq('id', args.id)
        .select()
        .single();
      if (error) throw error;

      // Abrir e concordar sem mudar nada também é ato, e o log registra.
      await logAction({
        area: 'osg',
        entity_type: 'acordo_quotistas',
        entity_id: args.id,
        entity_name: `Acordo de Quotistas, versão ${data.versao}`,
        action: 'updated',
        changed_fields: Object.keys(mudou).length > 0
          ? mudou
          : { Conferência: { old: '', new: `bloco "${args.grupo}" conferido` } },
      });

      return data;
    },
    onSuccess: () => {
      invalidar();
      toast.success('Acordo salvo');
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Não consegui salvar o acordo'),
  });

  /**
   * Substitui os quóruns, os ramos e a ordem da preferência de uma vez.
   *
   * As três juntas porque a tela salva o grupo inteiro, e porque o log fica
   * legível assim: uma entrada dizendo como cada lista ficou, em vez de três
   * registros separados de um clique só.
   */
  const salvarListas = useMutation({
    mutationFn: async (args: {
      acordoId: string;
      versao: number;
      quoruns: QuorumInput[];
      ramos: RamoInput[];
      ordemPreferencia: string[];
      /** Como as três estavam antes, já em prosa, para o log. */
      antes: { quoruns: string; ramos: string; ordem: string };
    }) => {
      const depois = {
        quoruns: resumoDosQuoruns(args.quoruns),
        ramos: resumoDosRamos(args.ramos),
        ordem: resumoDaOrdem(args.ordemPreferencia.map((quem, ordem) => ({ quem, ordem }))),
      };
      const mudou = diffDasListas(args.antes, depois);
      if (Object.keys(mudou).length === 0) return;

      // Apaga e regrava. O `ordem` de cada linha nasce da posição na tela, que é
      // a ordem em que o documento vai escrever.
      const trocar = async (
        tabela: 'acordo_quorum' | 'acordo_ramo_familiar' | 'acordo_ordem_preferencia',
        linhas: Record<string, unknown>[],
      ) => {
        const { error: erroApagar } = await supabase
          .from(tabela)
          .delete()
          .eq('acordo_id', args.acordoId);
        if (erroApagar) throw erroApagar;
        if (linhas.length === 0) return;
        const { error: erroGravar } = await supabase.from(tabela).insert(linhas as never);
        if (erroGravar) throw erroGravar;
      };

      await trocar(
        'acordo_quorum',
        args.quoruns.map((q, i) => ({
          acordo_id: args.acordoId,
          materia: q.materia.trim(),
          chave: q.chave ?? null,
          tipo: q.tipo,
          // O CHECK da tabela recusa percentual em maioria e unanimidade, então
          // o valor é zerado aqui em vez de chegar ao banco e voltar como erro.
          percentual: q.tipo === 'percentual' ? q.percentual ?? null : null,
          base: q.base,
          ordem: i,
          ...carimbo(),
        })),
      );

      await trocar(
        'acordo_ramo_familiar',
        args.ramos.map((r, i) => ({
          acordo_id: args.acordoId,
          nome: r.nome.trim(),
          ordem: i,
          ...carimbo(),
        })),
      );

      await trocar(
        'acordo_ordem_preferencia',
        args.ordemPreferencia.map((quem, i) => ({
          acordo_id: args.acordoId,
          quem: quem.trim(),
          ordem: i,
          ...carimbo(),
        })),
      );

      await logAction({
        area: 'osg',
        entity_type: 'acordo_quotistas',
        entity_id: args.acordoId,
        entity_name: `Acordo de Quotistas, versão ${args.versao}`,
        action: 'updated',
        changed_fields: mudou,
      });
    },
    onSuccess: () => {
      invalidar();
      toast.success('Quóruns e listas salvos');
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Não consegui salvar as listas'),
  });

  /** Os signatários originais e as sociedades alcançadas, que são vínculos a pessoas. */
  const salvarVinculos = useMutation({
    mutationFn: async (args: {
      acordoId: string;
      versao: number;
      signatarios: string[];
      sociedades: string[];
    }) => {
      const { error: erroApagarS } = await supabase
        .from('acordo_signatario')
        .delete()
        .eq('acordo_id', args.acordoId);
      if (erroApagarS) throw erroApagarS;

      if (args.signatarios.length > 0) {
        const { error } = await supabase.from('acordo_signatario').insert(
          args.signatarios.map((pessoa_id, ordem) => ({
            acordo_id: args.acordoId, pessoa_id, ordem, ...carimbo(),
          })),
        );
        if (error) throw error;
      }

      const { error: erroApagarE } = await supabase
        .from('acordo_sociedade_relacionada')
        .delete()
        .eq('acordo_id', args.acordoId);
      if (erroApagarE) throw erroApagarE;

      if (args.sociedades.length > 0) {
        const { error } = await supabase.from('acordo_sociedade_relacionada').insert(
          args.sociedades.map((empresa_pessoa_id, ordem) => ({
            acordo_id: args.acordoId, empresa_pessoa_id, ordem, ...carimbo(),
          })),
        );
        if (error) throw error;
      }

      await logAction({
        area: 'osg',
        entity_type: 'acordo_quotistas',
        entity_id: args.acordoId,
        entity_name: `Acordo de Quotistas, versão ${args.versao}`,
        action: 'updated',
        changed_fields: {
          Signatários: { old: '', new: `${args.signatarios.length} pessoa(s)` },
          'Sociedades relacionadas': { old: '', new: `${args.sociedades.length} sociedade(s)` },
        },
      });
    },
    onSuccess: () => {
      invalidar();
      toast.success('Signatários e sociedades salvos');
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Não consegui salvar os vínculos'),
  });

  /**
   * Uma versão nova do acordo, EM BRANCO.
   *
   * Em branco e não copiando a anterior, por decisão de 15/09. O acordo que se
   * renegocia é outro documento, e partir do anterior arrastaria valor que
   * ninguém reviu justamente no momento em que tudo está sendo revisto. A
   * semente entra igual à da primeira: os sete quóruns e as regras mais comuns.
   *
   * A anterior não some, fica na mesma linha com a versão menor. É o que permite
   * saber qual versão do acordo virou qual contrato.
   */
  const novaVersao = useMutation({
    mutationFn: async (args: { versaoAtual: number }) => {
      if (!clienteId) throw new Error('Selecione um cliente.');

      const { data: acordo, error } = await supabase
        .from('acordo_quotistas')
        .insert({
          cliente_id: clienteId,
          data_referencia: new Date().toISOString().slice(0, 10),
          versao: args.versaoAtual + 1,
          mecanismos: mecanismosPadrao(),
          ...carimbo(),
        })
        .select()
        .single();
      if (error) throw error;

      const { error: erroQuoruns } = await supabase.from('acordo_quorum').insert(
        QUORUNS_PADRAO.map((q, i) => ({
          acordo_id: acordo.id,
          chave: q.chave,
          materia: q.materia,
          tipo: q.tipo,
          percentual: q.percentual ?? null,
          base: q.base,
          ordem: i,
          ...carimbo(),
        })),
      );
      if (erroQuoruns) throw erroQuoruns;

      await logAction({
        area: 'osg',
        entity_type: 'acordo_quotistas',
        entity_id: acordo.id,
        entity_name: `Acordo de Quotistas, versão ${acordo.versao}`,
        action: 'created',
      });

      return acordo;
    },
    onSuccess: (a) => {
      invalidar();
      toast.success(`Versão ${a.versao} criada, com os sete quóruns e os mecanismos padrão`);
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Não consegui criar a versão'),
  });

  /**
   * Exclusão é SOFT, por `excluido`.
   *
   * Mesma razão do órgão de governança: apagar um acordo que já virou cláusula de
   * contrato assinado apagaria história. O DELETE físico existe na RLS para
   * sublíder ou acima, e a tela não usa.
   */
  const excluirAcordo = useMutation({
    mutationFn: async (args: { id: string; versao: number }) => {
      const { error } = await supabase
        .from('acordo_quotistas')
        .update({ excluido: true, updated_by: user?.id ?? null })
        .eq('id', args.id);
      if (error) throw error;

      await logAction({
        area: 'osg',
        entity_type: 'acordo_quotistas',
        entity_id: args.id,
        entity_name: `Acordo de Quotistas, versão ${args.versao}`,
        action: 'deleted',
      });
    },
    onSuccess: () => {
      invalidar();
      toast.success('Acordo excluído');
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : 'Não consegui excluir o acordo'),
  });

  return {
    criarAcordo, salvarAcordo, salvarListas, salvarVinculos, novaVersao, excluirAcordo,
  };
}
