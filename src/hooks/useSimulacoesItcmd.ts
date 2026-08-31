import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { Cenario, SaidaSimulacao } from '@/lib/osg/itcmd/simulacao';

/**
 * O HISTÓRICO DE SIMULAÇÕES DE ITCD, gravado.
 *
 * Antes as versões viviam em estado do React e morriam ao recarregar a página. As
 * três tabelas (`itcd_simulacao` e as duas filhas) existem desde a 20260826154524 e
 * não tinham nenhum escritor.
 *
 * A SIMULAÇÃO É UM RETRATO, e é isso que dita o que se grava: a UPF, o universo de
 * quotas, os totais do acervo e o RESULTADO apurado vão para o banco. Abrir uma
 * simulação antiga é LER, nunca reapurar — se o motor ou a lei mudarem, o número que
 * foi ao cliente continua o que era. É a regra escrita na migration, e é por isso
 * que este arquivo não chama `simular()` em lugar nenhum.
 *
 * O `as any` no client segue o que os outros hooks do OSG fazem com tabela recente:
 * o `types.ts` se REGENERA pelo CLI e não se edita à mão (AGENTS.md), e a
 * regeneração é dívida separada — ela precisa de token do CLI, que este ambiente não
 * tem. Tipar de verdade é trocar este `sb` por `supabase` e apagar a linha do eslint.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

const CHAVE = 'itcd-simulacoes';

/**
 * Os status que o banco aceita, na ordem do ciclo de vida. São os quatro do enum
 * `itcd_simulacao_status`, e a tela não inventa um quinto: valor fora do enum é erro
 * no clique.
 *
 * "Descartar" um cenário testado e recusado é `substituida` — ela sai do caminho e
 * deixa de ser a que vale.
 */
export const STATUS_DA_SIMULACAO = [
  'rascunho', 'gerada', 'aprovada', 'substituida',
] as const;

export type StatusDaSimulacao = typeof STATUS_DA_SIMULACAO[number];

export const ROTULO_DO_STATUS: Record<StatusDaSimulacao, string> = {
  rascunho: 'Rascunho',
  gerada: 'Gerada',
  aprovada: 'Aprovada',
  substituida: 'Substituída',
};

/**
 * UMA GUIA: o par doador declarante → beneficiário, com a apuração dele.
 *
 * É a unidade em que a SEFAZ tributa e em que o motor apura. O resultado morava no
 * DONATÁRIO, somando as guias em que ele aparece — e com dois doadores a linha passava
 * a descrever alguém que não existe: base somada ao lado de imposto somado, sem que um
 * seja função do outro, porque cada guia tem a sua faixa progressiva e a sua dedução.
 */
export interface GiaSalva {
  doadorId: string;
  doadorNome: string;
  donatarioId: string;
  donatarioNome: string;
  quotasRecebidas: string;
  /** "Percentual Transmitido ao Beneficiário": soma 100% entre os desta guia. */
  pctDaGia: string;
  /** A acumulação, em valor e por par. `null` = nada declarado. */
  doacaoAnterior: string | null;
  basePorCenario: Record<Cenario, string | null>;
  impostoPorCenario: Record<Cenario, string | null>;
}

/** Uma linha do quadro de usufruto, congelada. */
export interface LinhaDoUsufrutoSalva {
  pessoaId: string;
  nome: string;
  papel: 'usufrui' | 'concede';
  quotas: string;
  quotasPlena: string;
  quotasNuaReserva: string;
  quotasNuaInstituicao: string;
  quotasUsufruto: string;
}

/**
 * Uma concessão de usufruto: quem passou o voto de quantas quotas a quem.
 *
 * `reserva` não tem valor nem imposto — ela vive dentro da guia da doação. Só a
 * `instituicao` é guia própria, e aí os três cenários vêm preenchidos.
 */
export interface ConcessaoSalva {
  deId: string;
  deNome: string;
  paraId: string;
  paraNome: string;
  origem: 'reserva' | 'instituicao';
  quotas: string;
  basePorCenario: Record<Cenario, string | null>;
  impostoPorCenario: Record<Cenario, string | null>;
}

/** Uma linha do histórico, como a tela precisa dela. */
export interface SimulacaoSalva {
  id: string;
  versao: number;
  /**
   * O NOME que o analista deu. Nulo = nunca renomeada, e aí ela se chama pela versão.
   * Serve para o cenário ter nome de cenário — "Sem reserva", "51% pelo Avelino" —
   * em vez de um número que só diz a ordem em que foi gerada.
   */
  nome: string | null;
  status: StatusDaSimulacao;
  competencia: string;
  /** Decimal em texto, como veio do banco: `number` em dinheiro é proibido. */
  upf: string;
  totalDeQuotas: string;
  criadaEm: string;
  observacao: string | null;
  /**
   * De qual simulação este ato parte. `null` = parte do cadastro.
   *
   * É a cadeia que a OSG apresenta: a doação entre os herdeiros, depois a do fundador
   * para eles, e o total. O segundo ato parte do quadro que o primeiro deixou.
   */
  origemSimulacaoId: string | null;
  acervoPorCenario: Record<Cenario, string | null>;
  /** O imposto da DOAÇÃO. Já traz a base reduzida quando houve reserva. */
  impostoPorCenario: Record<Cenario, string | null>;
  /**
   * O IMPOSTO DO ATO INTEIRO: a doação mais as guias de instituição de usufruto.
   *
   * É o número que responde "quanto custa este cenário", e é o que a lista mostra.
   * O da doação sozinho já conta a reserva — ela não tem guia própria, ela reduz a
   * base desta —, mas deixava a instituição de fora, que é ato tributado com guia
   * separada. Somado a partir do que está GRAVADO, não do motor.
   */
  totalPorCenario: Record<Cenario, string | null>;
  /** A doação transmitiu a nua propriedade e o doador guardou o voto? */
  comReserva: boolean;
  pctBaseReserva: string;
  pctBaseInstituicao: string;
  /** O quadro de usufruto congelado, e as concessões que saíram dele. */
  usufruto: LinhaDoUsufrutoSalva[];
  concessoes: ConcessaoSalva[];
  /** O QUADRO CONGELADO do lado de quem doa. */
  doadores: Array<{
    pessoaId: string;
    nome: string;
    /** Quotas que ele tinha na sociedade no momento da simulação. */
    quotas: string;
    /** O que efetivamente saiu dele. */
    quotasTransmitidas: string;
    /** Com quantas termina. */
    quotasFinal: string;
    /** A GIA saiu no nome do casal? */
    emissaoConjunta: boolean;
    conjugeNome: string | null;
    /** Dinheiro integralizado no capital NESTA simulação. Zero é o caso comum. */
    vlrAporteMoeda: string;
    /** Quantas das quotas dele vieram do aporte, ao preço da quota de antes dele. */
    quotasDoAporte: string;
  }>;
  /** E do lado de quem recebe. */
  donatarios: Array<{
    pessoaId: string;
    nome: string;
    quotasAtuais: string;
    quotasLegitima: string;
    quotasDisponivel: string;
    quotasFinal: string;
    /** Donatário também aporta: não há regra dizendo que só o fundador paga. */
    vlrAporteMoeda: string;
    quotasDoAporte: string;
    /** Participação no CAPITAL depois do ato. É do donatário: não se reparte. */
    percentual: string;
  }>;
  /**
   * O RESULTADO, uma linha por guia. Antes vivia no donatário, somado — e a soma não
   * se desdobra de volta, porque a repartição não estava em lugar nenhum.
   */
  gias: GiaSalva[];
}

/**
 * COMO A SIMULAÇÃO SE CHAMA. Sem nome dado, é a versão — que é o rótulo que ela sempre
 * teve. Um só lugar decide isso, porque a lista e a tela aberta precisam concordar.
 */
export const rotuloDaSimulacao = (s: { nome: string | null; versao: number }): string =>
  (s.nome?.trim() ? s.nome.trim() : `Versão ${s.versao}`);

/**
 * O NOME QUE VAI PARA A TRILHA DE AUDITORIA.
 *
 * `audit_logs.entity_name` é o que a tela de logs mostra sem precisar consultar a
 * entidade — e por isso ele tem de fazer sentido sozinho, meses depois, quando quem lê
 * não tem a simulação aberta na frente. "Versão 3" não diz de que cliente nem de
 * quando; com a competência ao lado, diz.
 */
const nomeParaAuditoria = (
  s: { nome: string | null; versao: number; competencia?: string },
): string => (s.competencia
  ? `${rotuloDaSimulacao(s)} · ${s.competencia}`
  : rotuloDaSimulacao(s));

/** `numeric` chega como número ou string do PostgREST; texto é a forma canônica. */
const texto = (v: unknown): string | null => (v == null ? null : String(v));
const textoOuZero = (v: unknown): string => texto(v) ?? '0';

/**
 * SOMA DE DINHEIRO EM CENTAVOS INTEIROS, nunca em `number`.
 *
 * São `numeric(18,2)` do banco, que chegam como texto. Converter para `number` para
 * somar é o erro clássico de arredondamento binário, e aqui o número vai numa guia.
 */
const emCentavos = (v: string): bigint => {
  const negativo = v.trim().startsWith('-');
  const [inteiro, fracao = ''] = v.trim().replace('-', '').split('.');
  const c = BigInt(inteiro || '0') * 100n + BigInt(fracao.padEnd(2, '0').slice(0, 2));
  return negativo ? -c : c;
};

const deCentavos = (c: bigint): string => {
  const negativo = c < 0n;
  const abs = negativo ? -c : c;
  return `${negativo ? '-' : ''}${abs / 100n}.${(abs % 100n).toString().padStart(2, '0')}`;
};

/**
 * O total do cenário: a doação mais as guias de instituição.
 *
 * Nulo quando a doação é nula — cenário sem apuração não vira total. Concessão sem
 * valor é a `reserva`, que não tem guia própria: ela entra com zero, não bloqueia.
 */
function somarOAto(
  doacao: string | null,
  concessoes: ConcessaoSalva[],
  cenario: Cenario,
): string | null {
  if (doacao == null) return null;
  const daInstituicao = concessoes.reduce((a, c) => {
    const v = c.impostoPorCenario[cenario];
    return v == null ? a : a + emCentavos(v);
  }, 0n);
  return deCentavos(emCentavos(doacao) + daInstituicao);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function paraSimulacaoSalva(row: any): SimulacaoSalva {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nome = (p: any): string => p?.pessoa?.denominacao ?? p?.pessoa_id ?? '—';

   
  const gias: GiaSalva[] = (row.itcd_simulacao_gia ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((g: any) => ({
      doadorId: g.doador_pessoa_id,
      doadorNome: g.doador?.denominacao ?? g.doador_pessoa_id,
      donatarioId: g.donatario_pessoa_id,
      donatarioNome: g.donatario?.denominacao ?? g.donatario_pessoa_id,
      quotasRecebidas: String(g.quotas_recebidas ?? 0),
      pctDaGia: textoOuZero(g.pct_da_gia),
      doacaoAnterior: texto(g.vlr_doacao_anterior),
      basePorCenario: {
        contabil: texto(g.vlr_base_contabil),
        itr: texto(g.vlr_base_itr),
        mercado: texto(g.vlr_base_mercado),
      },
      impostoPorCenario: {
        contabil: texto(g.vlr_imposto_contabil),
        itr: texto(g.vlr_imposto_itr),
        mercado: texto(g.vlr_imposto_mercado),
      },
    }));

  const usufruto: LinhaDoUsufrutoSalva[] = (row.itcd_simulacao_usufruto ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((u: any) => ({
      pessoaId: u.pessoa_id,
      nome: u.pessoa?.denominacao ?? u.pessoa_id,
      papel: u.papel,
      quotas: String(u.quotas ?? 0),
      quotasPlena: String(u.quotas_plena ?? 0),
      quotasNuaReserva: String(u.quotas_nua_reserva ?? 0),
      quotasNuaInstituicao: String(u.quotas_nua_instituicao ?? 0),
      quotasUsufruto: String(u.quotas_usufruto ?? 0),
    }));

   
  const concessoes: ConcessaoSalva[] = (row.itcd_simulacao_concessao ?? [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((c: any) => ({
      deId: c.de_pessoa_id,
      deNome: c.de?.denominacao ?? c.de_pessoa_id,
      paraId: c.para_pessoa_id,
      paraNome: c.para?.denominacao ?? c.para_pessoa_id,
      origem: c.origem,
      quotas: String(c.quotas ?? 0),
      basePorCenario: {
        contabil: texto(c.vlr_base_contabil),
        itr: texto(c.vlr_base_itr),
        mercado: texto(c.vlr_base_mercado),
      },
      impostoPorCenario: {
        contabil: texto(c.vlr_imposto_contabil),
        itr: texto(c.vlr_imposto_itr),
        mercado: texto(c.vlr_imposto_mercado),
      },
    }));

  return {
    id: row.id,
    versao: row.versao,
    nome: row.nome ?? null,
    status: row.status,
    competencia: row.competencia,
    upf: textoOuZero(row.vlr_upf),
    totalDeQuotas: String(row.quotas_total),
    criadaEm: row.created_at,
    observacao: row.observacao ?? null,
    origemSimulacaoId: row.origem_simulacao_id ?? null,
    acervoPorCenario: {
      contabil: texto(row.vlr_acervo_contabil),
      itr: texto(row.vlr_acervo_itr),
      mercado: texto(row.vlr_acervo_mercado),
    },
    impostoPorCenario: {
      contabil: texto(row.vlr_imposto_contabil),
      itr: texto(row.vlr_imposto_itr),
      mercado: texto(row.vlr_imposto_mercado),
    },
    totalPorCenario: {
      contabil: somarOAto(texto(row.vlr_imposto_contabil), concessoes, 'contabil'),
      itr: somarOAto(texto(row.vlr_imposto_itr), concessoes, 'itr'),
      mercado: somarOAto(texto(row.vlr_imposto_mercado), concessoes, 'mercado'),
    },
    comReserva: row.com_reserva === true,
    pctBaseReserva: textoOuZero(row.pct_base_reserva),
    pctBaseInstituicao: textoOuZero(row.pct_base_instituicao),
    usufruto,
    concessoes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    doadores: (row.itcd_simulacao_doador ?? []).map((d: any) => ({
      pessoaId: d.doador_pessoa_id,
      nome: d.pessoa?.denominacao ?? d.doador_pessoa_id,
      quotas: String(d.quotas),
      quotasTransmitidas: String(d.quotas_transmitidas ?? 0),
      quotasFinal: String(d.quotas_final ?? 0),
      emissaoConjunta: d.emissao_conjunta === true,
      conjugeNome: d.conjuge?.denominacao ?? null,
      vlrAporteMoeda: textoOuZero(d.vlr_aporte_moeda),
      quotasDoAporte: String(d.quotas_do_aporte ?? 0),
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    donatarios: (row.itcd_simulacao_donatario ?? []).map((d: any) => ({
      pessoaId: d.donatario_pessoa_id,
      nome: nome({ pessoa: d.pessoa, pessoa_id: d.donatario_pessoa_id }),
      quotasAtuais: String(d.quotas_atuais ?? 0),
      quotasLegitima: String(d.quotas_legitima),
      quotasDisponivel: String(d.quotas_disponivel),
      quotasFinal: String(d.quotas_final ?? 0),
      vlrAporteMoeda: textoOuZero(d.vlr_aporte_moeda),
      quotasDoAporte: String(d.quotas_do_aporte ?? 0),
      percentual: textoOuZero(d.percentual),
    })),
    gias,
  };
}

/**
 * A CADEIA de uma simulação: ela e todas as que vieram antes, da mais antiga para a
 * mais nova.
 *
 * É o fluxo que a OSG apresenta — a doação entre os herdeiros, depois a do fundador
 * para eles — e é por isso que a ordem é cronológica: é a ordem dos atos.
 *
 * A guarda de CICLO não é zelo excessivo: `origem_simulacao_id` é uma FK livre, e um
 * A→B→A travaria a tela num laço infinito. Ao encontrar um id repetido, para.
 */
export function cadeiaDe(
  simulacao: SimulacaoSalva,
  todas: SimulacaoSalva[],
): SimulacaoSalva[] {
  const porId = new Map(todas.map((s) => [s.id, s]));
  const cadeia: SimulacaoSalva[] = [];
  const vistos = new Set<string>();
  let atual: SimulacaoSalva | undefined = simulacao;
  while (atual != null && !vistos.has(atual.id)) {
    vistos.add(atual.id);
    cadeia.unshift(atual);
    atual = atual.origemSimulacaoId == null
      ? undefined
      : porId.get(atual.origemSimulacaoId);
  }
  return cadeia;
}

/**
 * O TOTAL DA CADEIA num cenário: a soma dos totais de cada ato.
 *
 * SOMA SIMPLES, e é assim mesmo. A acumulação da Lei 10.488/2016 tem chave de TRIO —
 * mesmo doador · mesmo beneficiário · mesmo ano civil —, então atos de doadores
 * diferentes são apurações separadas e somam. E mesmo quando acumulam, a soma dos
 * devidos é igual à apuração da base consolidada (a invariante do §7.2 em
 * `acumulacao.ts`): fracionar não economiza.
 *
 * Um ato sem valor no cenário torna o total do cenário nulo: ausência não é zero, e
 * somar por cima diria um total que ninguém apurou.
 */
export function totalDaCadeia(
  cadeia: SimulacaoSalva[],
  cenario: Cenario,
): string | null {
  let soma = 0n;
  for (const s of cadeia) {
    const v = s.totalPorCenario[cenario];
    if (v == null) return null;
    soma += emCentavos(v);
  }
  return deCentavos(soma);
}

/**
 * O histórico do cliente, mais recente primeiro, com doadores e donatários dentro.
 *
 * Sem `fallback` de erro: se a consulta falha, o erro sobe e a tela diz. Devolver
 * lista vazia diria "não há simulação", que é outra afirmação.
 */
export function useSimulacoesItcmd(clienteId: string | null) {
  return useQuery({
    queryKey: [CHAVE, clienteId],
    enabled: !!clienteId,
    queryFn: async (): Promise<SimulacaoSalva[]> => {
      const { data, error } = await sb
        .from('itcd_simulacao')
        .select(`
          *,
          itcd_simulacao_doador ( doador_pessoa_id, quotas, quotas_transmitidas,
            quotas_final, emissao_conjunta, vlr_aporte_moeda, quotas_do_aporte,
            pessoa:doador_pessoa_id ( denominacao ),
            conjuge:conjuge_pessoa_id ( denominacao ) ),
          itcd_simulacao_donatario ( donatario_pessoa_id, quotas_atuais,
            quotas_legitima, quotas_disponivel, quotas_final, percentual,
            vlr_aporte_moeda, quotas_do_aporte,
            pessoa:donatario_pessoa_id ( denominacao ) ),
          itcd_simulacao_gia ( doador_pessoa_id, donatario_pessoa_id,
            quotas_recebidas, pct_da_gia, vlr_doacao_anterior,
            vlr_base_contabil, vlr_base_itr, vlr_base_mercado,
            vlr_imposto_contabil, vlr_imposto_itr, vlr_imposto_mercado,
            doador:doador_pessoa_id ( denominacao ),
            donatario:donatario_pessoa_id ( denominacao ) ),
          itcd_simulacao_usufruto ( pessoa_id, papel, quotas, quotas_plena,
            quotas_nua_reserva, quotas_nua_instituicao, quotas_usufruto,
            pessoa:pessoa_id ( denominacao ) ),
          itcd_simulacao_concessao ( de_pessoa_id, para_pessoa_id, origem, quotas,
            vlr_base_contabil, vlr_base_itr, vlr_base_mercado,
            vlr_imposto_contabil, vlr_imposto_itr, vlr_imposto_mercado,
            de:de_pessoa_id ( denominacao ),
            para:para_pessoa_id ( denominacao ) )
        `)
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []).map(paraSimulacaoSalva);
    },
  });
}

/** O que a tela entrega para gravar: o retrato inteiro, já apurado. */
export interface SimulacaoParaGravar {
  clienteId: string;
  empresaPessoaId: string;
  saida: SaidaSimulacao;
  /** De qual simulação este ato parte. `null` = parte do cadastro. */
  origemSimulacaoId: string | null;
  /**
   * O QUADRO INTEIRO, congelado. Não só o que cada um doou ou recebeu: também com
   * quantas quotas cada um estava e com quantas termina, e em que guia o doador
   * emite. É o registro de execução do ato — abrir depois é ler, e derivar isso na
   * exibição faria o quadro antigo mudar quando o cadastro muda.
   */
  doadores: Array<{
    pessoaId: string;
    quotas: string;
    quotasTransmitidas: string;
    quotasFinal: string;
    emissaoConjunta: boolean;
    conjugePessoaId: string | null;
    vlrAporteMoeda: string;
    quotasDoAporte: string;
  }>;
  donatarios: Array<{
    pessoaId: string;
    quotasAtuais: string;
    quotasLegitima: string;
    quotasDisponivel: string;
    quotasFinal: string;
    vlrAporteMoeda: string;
    quotasDoAporte: string;
  }>;
  /**
   * AS GUIAS: o resultado, por par doador declarante → beneficiário.
   *
   * `doadorPessoaId` é o TITULAR, e não o id do doador fiscal: na emissão conjunta o
   * doador fiscal tem id COMPOSTO (`titular+cônjuge`), que não é `pessoa.id` nenhum e
   * quebraria a chave estrangeira. Quem diz que a guia saiu no nome do casal é
   * `itcd_simulacao_doador.emissao_conjunta`.
   */
  gias: Array<{
    doadorPessoaId: string;
    donatarioPessoaId: string;
    quotasRecebidas: string;
    pctDaGia: string;
    doacaoAnterior: string | null;
    basePorCenario: Record<Cenario, string | null>;
    impostoPorCenario: Record<Cenario, string | null>;
  }>;
  /**
   * O USUFRUTO DESTE CENÁRIO. Vem sempre — o quadro existe mesmo quando o ato não
   * gera guia nenhuma, que é o caso comum: sem reserva e sem instituição, cada um
   * vota o que tem. Gravar o quadro nesse caso é o que permite dizer depois "aqui
   * não se recolheu nada", em vez de não saber.
   */
  comReserva: boolean;
  pctBaseReserva: string;
  pctBaseInstituicao: string;
  usufruto: Array<{
    pessoaId: string;
    papel: 'usufrui' | 'concede';
    quotas: string;
    quotasPlena: string;
    quotasNuaReserva: string;
    quotasNuaInstituicao: string;
    quotasUsufruto: string;
  }>;
  concessoes: Array<{
    deId: string;
    paraId: string;
    origem: 'reserva' | 'instituicao';
    quotas: string;
    /** Nulo na reserva: ela não tem guia própria. */
    basePorCenario: Record<Cenario, string | null> | null;
    impostoPorCenario: Record<Cenario, string | null> | null;
  }>;
}

/**
 * Grava uma simulação — pai e duas filhas.
 *
 * A VERSÃO é contada no banco, não na sessão: `max(versao) + 1` do cliente. Contar
 * em estado do React fazia duas abas darem a mesma versão, e recarregar a página
 * reiniciar do 1.
 *
 * Sem transação: o PostgREST não expõe uma. Se uma filha falhar, o pai é APAGADO
 * antes de propagar o erro — meia simulação gravada é pior que nenhuma, porque
 * apareceria no histórico sem o resultado dos donatários.
 */
export function useGravarSimulacaoItcmd() {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();
  return useMutation({
    mutationFn: async (s: SimulacaoParaGravar): Promise<string> => {
      const { data: ultima, error: erroDaVersao } = await sb
        .from('itcd_simulacao')
        .select('versao')
        .eq('cliente_id', s.clienteId)
        .order('versao', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (erroDaVersao) throw new Error(erroDaVersao.message);

      const { data: sessao } = await supabase.auth.getUser();
      const quem = sessao?.user?.id ?? null;
      const versao = (ultima?.versao ?? 0) + 1;

      // OS TRÊS CENÁRIOS SÃO OBRIGATÓRIOS, por desenho da tabela. Cenário sem valor
      // é cadastro incompleto — na apuração de verdade os bens têm valor contábil, de
      // ITR e de mercado —, e gravar zero no lugar afirmaria um imposto que ninguém
      // apurou. Quem barra antes é a tela; aqui é a rede.
      const exigir = (rotulo: string, v: string | null): string => {
        if (v == null) {
          throw new Error(
            `Cenário ${rotulo} sem valor: complete o cadastro dos bens para apurar os `
            + 'três cenários. A simulação não foi gravada.',
          );
        }
        return v;
      };

      const { data: pai, error: erroDoPai } = await sb
        .from('itcd_simulacao')
        .insert({
          cliente_id: s.clienteId,
          empresa_pessoa_id: s.empresaPessoaId,
          // `gerada` e não `rascunho`: o que chega aqui já foi apurado. Rascunho é
          // o que está na tela antes de o analista mandar gerar, e isso não grava.
          status: 'gerada',
          competencia: s.saida.competencia,
          vlr_upf: s.saida.upf,
          quotas_total: Number(s.saida.totalDeQuotas),
          vlr_acervo_contabil: exigir('contábil', s.saida.acervoPorCenario.contabil),
          vlr_acervo_itr: exigir('ITR', s.saida.acervoPorCenario.itr),
          vlr_acervo_mercado: exigir('mercado', s.saida.acervoPorCenario.mercado),
          vlr_imposto_contabil: exigir('contábil', s.saida.totaisPorCenario.contabil),
          vlr_imposto_itr: exigir('ITR', s.saida.totaisPorCenario.itr),
          vlr_imposto_mercado: exigir('mercado', s.saida.totaisPorCenario.mercado),
          // O USUFRUTO DA DOAÇÃO é modalidade dela: muda a natureza da guia e a base.
          origem_simulacao_id: s.origemSimulacaoId,
          com_reserva: s.comReserva,
          pct_base_reserva: s.pctBaseReserva,
          pct_base_instituicao: s.pctBaseInstituicao,
          versao,
          created_by: quem,
          updated_by: quem,
        })
        .select('id')
        .single();
      if (erroDoPai) throw new Error(erroDoPai.message);

      const simulacaoId: string = pai.id;
      const desfazer = async (mensagem: string) => {
        await sb.from('itcd_simulacao').delete().eq('id', simulacaoId);
        throw new Error(mensagem);
      };

      const { error: erroDoador } = await sb.from('itcd_simulacao_doador').insert(
        s.doadores.map((d) => ({
          simulacao_id: simulacaoId,
          doador_pessoa_id: d.pessoaId,
          quotas: Number(d.quotas),
          quotas_transmitidas: Number(d.quotasTransmitidas),
          quotas_final: Number(d.quotasFinal),
          emissao_conjunta: d.emissaoConjunta,
          // APORTE: dinheiro integralizado nesta hipótese. Não é fato gerador — fica
          // gravado porque é o que explica as quotas de quem aportou.
          vlr_aporte_moeda: d.vlrAporteMoeda,
          quotas_do_aporte: Number(d.quotasDoAporte),
          // Só com emissão conjunta: cônjuge em guia individual é contradição, e o
          // banco tem CHECK para isso.
          conjuge_pessoa_id: d.emissaoConjunta ? d.conjugePessoaId : null,
        })),
      );
      if (erroDoador) await desfazer(erroDoador.message);

      const porId = new Map(s.saida.linhas.map((l) => [l.donatarioId, l]));
      // QUEM NÃO RECEBEU NADA não é beneficiário do ato e não entra: a tabela pede
      // `percentual > 0`, e é a mesma afirmação. Alguém pode estar na tabela da tela
      // com zero — adicionado e ainda não destinado —, e isso não é uma linha de guia.
      const beneficiarios = s.donatarios.filter((d) => porId.has(d.pessoaId));
      const { error: erroDonatario } = await sb.from('itcd_simulacao_donatario').insert(
        beneficiarios.map((d) => {
          const linha = porId.get(d.pessoaId)!;
          return {
            simulacao_id: simulacaoId,
            donatario_pessoa_id: d.pessoaId,
            quotas_atuais: Number(d.quotasAtuais),
            quotas_legitima: Number(d.quotasLegitima),
            quotas_disponivel: Number(d.quotasDisponivel),
            quotas_final: Number(d.quotasFinal),
            vlr_aporte_moeda: d.vlrAporteMoeda,
            quotas_do_aporte: Number(d.quotasDoAporte),
            // O QUADRO fica aqui; o RESULTADO é por guia, em itcd_simulacao_gia.
            percentual: linha.percentual,
          };
        }),
      );
      if (erroDonatario) await desfazer(erroDonatario.message);

      // ── AS GUIAS ────────────────────────────────────────────────────────────
      // Cada linha fecha consigo mesma: `imposto = f(base)` vale DENTRO dela. Não
      // valia no resumo por donatário quando havia mais de um doador — duas bases
      // menores, cada uma na sua faixa, pagam menos que a soma delas numa faixa só, e
      // essa economia é legal (a chave da acumulação é o trio doador · beneficiário ·
      // ano civil). O resumo guardava a base de uma leitura e o imposto de outra.
      if (s.gias.length > 0) {
        const { error } = await sb.from('itcd_simulacao_gia').insert(
          s.gias.map((g) => ({
            simulacao_id: simulacaoId,
            doador_pessoa_id: g.doadorPessoaId,
            donatario_pessoa_id: g.donatarioPessoaId,
            quotas_recebidas: Number(g.quotasRecebidas),
            pct_da_gia: g.pctDaGia,
            vlr_doacao_anterior: g.doacaoAnterior,
            vlr_base_contabil: exigir('contábil da guia', g.basePorCenario.contabil),
            vlr_base_itr: exigir('ITR da guia', g.basePorCenario.itr),
            vlr_base_mercado: exigir('mercado da guia', g.basePorCenario.mercado),
            vlr_imposto_contabil:
              exigir('contábil da guia', g.impostoPorCenario.contabil),
            vlr_imposto_itr: exigir('ITR da guia', g.impostoPorCenario.itr),
            vlr_imposto_mercado:
              exigir('mercado da guia', g.impostoPorCenario.mercado),
          })),
        );
        if (error) await desfazer(error.message);
      }

      // ── O QUADRO DE USUFRUTO ────────────────────────────────────────────────
      // Vai SEMPRE, mesmo sem reserva e sem instituição. Nesse caso ele diz que cada
      // um vota o que tem e que nada foi recolhido — que é uma afirmação, e diferente
      // de não haver registro. É o caso comum: a reserva é escolha, não regra.
      if (s.usufruto.length > 0) {
        const { error } = await sb.from('itcd_simulacao_usufruto').insert(
          s.usufruto.map((u) => ({
            simulacao_id: simulacaoId,
            pessoa_id: u.pessoaId,
            papel: u.papel,
            quotas: Number(u.quotas),
            quotas_plena: Number(u.quotasPlena),
            quotas_nua_reserva: Number(u.quotasNuaReserva),
            quotas_nua_instituicao: Number(u.quotasNuaInstituicao),
            quotas_usufruto: Number(u.quotasUsufruto),
          })),
        );
        if (error) await desfazer(error.message);
      }

      // ── AS CONCESSÕES ───────────────────────────────────────────────────────
      // Uma linha por par de → para. A `reserva` entra sem valor: ela não tem guia
      // própria, o imposto dela está na guia da doação. A `instituicao` entra com os
      // três cenários, e o banco exige os três — cenário sem valor é cadastro
      // incompleto, e gravar zero afirmaria um imposto que ninguém apurou.
      if (s.concessoes.length > 0) {
        const { error } = await sb.from('itcd_simulacao_concessao').insert(
          s.concessoes.map((c) => ({
            simulacao_id: simulacaoId,
            de_pessoa_id: c.deId,
            para_pessoa_id: c.paraId,
            origem: c.origem,
            quotas: Number(c.quotas),
            vlr_base_contabil: c.basePorCenario
              && exigir('contábil da instituição', c.basePorCenario.contabil),
            vlr_base_itr: c.basePorCenario
              && exigir('ITR da instituição', c.basePorCenario.itr),
            vlr_base_mercado: c.basePorCenario
              && exigir('mercado da instituição', c.basePorCenario.mercado),
            vlr_imposto_contabil: c.impostoPorCenario
              && exigir('contábil da instituição', c.impostoPorCenario.contabil),
            vlr_imposto_itr: c.impostoPorCenario
              && exigir('ITR da instituição', c.impostoPorCenario.itr),
            vlr_imposto_mercado: c.impostoPorCenario
              && exigir('mercado da instituição', c.impostoPorCenario.mercado),
          })),
        );
        if (error) await desfazer(error.message);
      }

      // ── A TRILHA ────────────────────────────────────────────────────────────
      // No padrão do resto do sistema: `audit_logs`, área `osg`. As colunas de autoria
      // da própria tabela (`created_by`, `aprovada_por`) dizem QUEM fez; a trilha diz
      // O QUE FOI FEITO, em ordem, no mesmo lugar em que se procura o histórico das
      // outras entidades da OSG.
      //
      // `logAction` não propaga falha de propósito: a simulação já está gravada, e
      // desfazê-la porque o log não entrou seria perder o trabalho para salvar o
      // registro dele. A falha vai para o console.
      await logAction({
        area: 'osg',
        entity_type: 'itcd_simulacao',
        entity_id: simulacaoId,
        entity_name: `Versão ${versao} · ${s.saida.competencia}`,
        action: 'created',
        details: `${s.doadores.length} doador(es), ${beneficiarios.length} `
          + `beneficiário(s), ${s.gias.length} guia(s). `
          + `Imposto contábil do ato: ${s.saida.totaisPorCenario.contabil}.`,
      });

      return simulacaoId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CHAVE] });
    },
  });
}

/**
 * Renomeia uma simulação.
 *
 * NOME VAZIO VOLTA PARA NULO, não para string vazia: nulo significa "não tem nome" e
 * faz a tela cair no rótulo da versão. Gravar `''` daria uma simulação sem rótulo
 * nenhum na lista.
 *
 * Renomear NÃO é fato tributário e não mexe no retrato: nada aqui toca valor, quota
 * ou status. Só `updated_at`/`updated_by`, para "quem mexeu" continuar respondível.
 */
export function useRenomearSimulacaoItcmd() {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();
  return useMutation({
    mutationFn: async (
      { id, nome, nomeAnterior, versao }: {
        id: string;
        nome: string;
        /** Para a trilha dizer de que para que — `changed_fields` pede os dois. */
        nomeAnterior: string | null;
        versao: number;
      },
    ): Promise<void> => {
      const { data: sessao } = await supabase.auth.getUser();
      const quem = sessao?.user?.id ?? null;
      const limpo = nome.trim();
      const { error } = await sb
        .from('itcd_simulacao')
        .update({
          nome: limpo === '' ? null : limpo,
          updated_at: new Date().toISOString(),
          updated_by: quem,
        })
        .eq('id', id);
      if (error) throw new Error(error.message);

      await logAction({
        area: 'osg',
        entity_type: 'itcd_simulacao',
        entity_id: id,
        entity_name: nomeParaAuditoria({ nome: limpo === '' ? null : limpo, versao }),
        action: 'updated',
        changed_fields: { nome: { old: nomeAnterior, new: limpo === '' ? null : limpo } },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CHAVE] });
    },
  });
}

/**
 * Troca o status de uma simulação.
 *
 * `aprovada` também estampa quem aprovou e quando: é o portão antes de a
 * apresentação sair para o cliente, e "quem aprovou" é a pergunta que se faz depois.
 * Sair de aprovada limpa os dois — a aprovação anterior deixou de valer, e manter o
 * nome ali diria que ainda vale.
 */
export function useAlterarStatusSimulacaoItcmd() {
  const qc = useQueryClient();
  const { logAction } = useAuditLog();
  return useMutation({
    mutationFn: async (
      { id, status, statusAnterior, nome, versao }: {
        id: string;
        status: StatusDaSimulacao;
        statusAnterior: StatusDaSimulacao;
        nome: string | null;
        versao: number;
      },
    ): Promise<void> => {
      const { data: sessao } = await supabase.auth.getUser();
      const quem = sessao?.user?.id ?? null;
      const aprovada = status === 'aprovada';
      const { error } = await sb
        .from('itcd_simulacao')
        .update({
          status,
          aprovada_por: aprovada ? quem : null,
          aprovada_em: aprovada ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
          updated_by: quem,
        })
        .eq('id', id);
      if (error) throw new Error(error.message);

      // APROVAR é o portão antes de a apresentação sair para o cliente, e é a mudança
      // de status que mais importa registrar: `aprovada_por` diz quem aprovou AGORA, e
      // sai quando o status muda. A trilha é o que sobra.
      await logAction({
        area: 'osg',
        entity_type: 'itcd_simulacao',
        entity_id: id,
        entity_name: nomeParaAuditoria({ nome, versao }),
        action: 'updated',
        changed_fields: { status: { old: statusAnterior, new: status } },
        details: aprovada
          ? 'Aprovada: a revisão passa a ser a que vale para a apresentação.'
          : undefined,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [CHAVE] });
    },
  });
}
