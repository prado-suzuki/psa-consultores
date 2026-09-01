/**
 * A leitura de DIRETORIA do Board (acordo de 28/08, Mariana + Patricia).
 *
 * A régua desta camada não é "quantos números cabem": é "o que eu decido com
 * isso?". Por isso hora total e pontualidade saíram da faixa — são operação —
 * e por isso nada aqui estima: quando o cadastro não tem o campo, a função
 * devolve `null` E o motivo, para a tela escrever "—" com a explicação em vez
 * de inventar um número que a diretoria vai (com razão) chamar de errado.
 *
 * Tudo aqui é função pura sobre as linhas que a página já carrega — nenhuma
 * consulta nova, nenhum campo inventado.
 */
import type { OsRow, ProjetoRow } from '@/lib/dashboardClientesOs/types';

/** Horas de um FTE por mês — a régua que a diretoria usa para ler capacidade. */
export const HORAS_MES_FTE = 176;

/** Meta anual de captação da OSG, dita na reunião de 28/08. */
export const META_CLIENTES_ANO_OSG = 30;

// ── utilidades de data (string 'YYYY-MM-DD', sem fuso) ─────────────────

function somaDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const dentro = (data: string | null, de: string, ate: string) => !!data && data >= de && data < ate;

function variacao(atual: number, anterior: number): number | null {
  if (anterior <= 0) return null;
  return ((atual - anterior) / anterior) * 100;
}

// ── 1. Projetos ativos: variação e mix ─────────────────────────────────

export interface MixProjetosAtivos {
  /** Projetos com status ativo no cadastro (o número grande do cartão). */
  ativos: number;
  /** Projetos iniciados na janela e na janela imediatamente anterior. */
  iniciadosJanela: number;
  iniciadosJanelaAnterior: number;
  /** Variação % entre as duas janelas. `null` quando não há base anterior. */
  variacaoPct: number | null;
  /** Mix dos projetos iniciados na janela. */
  clienteNovo: number;
  aditivo: number;
  /**
   * "Entrega já planejada/paga" não existe como campo em `ordem_servico` nem
   * em `org_projects` — não dá para separar de aditivo sem chutar.
   */
  planejadaPaga: null;
  /** Ativos que não deu para classificar (sem OS ou sem data de início). */
  semClassificacao: number;
  motivos: { planejadaPaga: string; semClassificacao: string };
}

/**
 * Mix "cliente novo × aditivo": um projeto é de CLIENTE NOVO quando a OS que o
 * originou é a primeira OS daquele cliente (menor `data_inicio` no cadastro);
 * qualquer OS posterior do mesmo cliente é ADITIVO de relação existente.
 */
export function mixProjetosAtivos(entrada: {
  projetos: ProjetoRow[];
  os: OsRow[];
  hoje: string;
  dias: number;
}): MixProjetosAtivos {
  const { projetos, os, hoje, dias } = entrada;
  const inicioAtual = somaDias(hoje, -dias);
  const inicioAnterior = somaDias(hoje, -2 * dias);
  const fimAtual = somaDias(hoje, 1);

  const osPorId = new Map(os.map((o) => [o.os_id, o]));
  const primeiraOsDoCliente = new Map<string, string>();
  for (const o of os) {
    if (!o.data_inicio) continue;
    const atual = primeiraOsDoCliente.get(o.cliente_id);
    if (!atual || o.data_inicio < atual) primeiraOsDoCliente.set(o.cliente_id, o.data_inicio);
  }

  const ativos = projetos.filter((p) => p.status_projeto === 'active');

  let iniciadosJanela = 0;
  let iniciadosJanelaAnterior = 0;
  let clienteNovo = 0;
  let aditivo = 0;
  let semClassificacao = 0;

  for (const p of ativos) {
    const o = p.os_id ? osPorId.get(p.os_id) : undefined;
    const inicio = o?.data_inicio ?? null;
    if (!o || !inicio) {
      semClassificacao += 1;
      continue;
    }
    if (dentro(inicio, inicioAnterior, inicioAtual)) iniciadosJanelaAnterior += 1;
    if (!dentro(inicio, inicioAtual, fimAtual)) continue;
    iniciadosJanela += 1;
    if (primeiraOsDoCliente.get(o.cliente_id) === inicio) clienteNovo += 1;
    else aditivo += 1;
  }

  return {
    ativos: ativos.length,
    iniciadosJanela,
    iniciadosJanelaAnterior,
    variacaoPct: variacao(iniciadosJanela, iniciadosJanelaAnterior),
    clienteNovo,
    aditivo,
    planejadaPaga: null,
    semClassificacao,
    motivos: {
      planejadaPaga: 'sem campo que marque entrega já planejada/paga no cadastro de OS',
      semClassificacao: 'projeto ativo sem OS vinculada ou sem data de início',
    },
  };
}

// ── 2. Receita: ticket médio, caixa contratado e folha ─────────────────

export interface ReceitaDiretoria {
  /** Média do valor das OS com faturamento lançado. `null` se não há nenhuma. */
  ticketMedio: number | null;
  osComValor: number;
  osSemValor: number;
  /** OS em andamento cujo contrato ainda cobre datas à frente. */
  projetosGerandoCaixa: number;
  /** Até quando o contratado gera caixa ('YYYY-MM'). `null` sem data de fim. */
  horizonteCaixa: string | null;
  /** Valor contratado das OS que ainda geram caixa. */
  caixaContratadoAFrente: number;
  osSemDataFim: number;
  /** Folha e cobertura: não existem no banco hoje. */
  folhaMensal: null;
  coberturaFolhaPct: null;
  motivos: { folha: string; faturamentoTotal: string };
}

const EM_ANDAMENTO = new Set(['em andamento', 'em_andamento', 'ativa', 'ativo', 'vigente']);

export function receitaDiretoria(os: OsRow[], hoje: string): ReceitaDiretoria {
  const comValor = os.filter((o) => o.faturamento > 0);
  const aFrente = os.filter(
    (o) =>
      o.faturamento > 0 &&
      (o.situacao === null || EM_ANDAMENTO.has((o.situacao_label || o.situacao || '').toLowerCase())) &&
      !!o.data_fim &&
      (o.data_fim as string) >= hoje,
  );
  const horizonte = aFrente.reduce<string | null>(
    (max, o) => (o.data_fim && (!max || o.data_fim > max) ? o.data_fim : max),
    null,
  );

  return {
    ticketMedio: comValor.length > 0
      ? comValor.reduce((a, o) => a + o.faturamento, 0) / comValor.length
      : null,
    osComValor: comValor.length,
    osSemValor: os.length - comValor.length,
    projetosGerandoCaixa: aFrente.length,
    horizonteCaixa: horizonte ? horizonte.slice(0, 7) : null,
    caixaContratadoAFrente: aFrente.reduce((a, o) => a + o.faturamento, 0),
    osSemDataFim: os.filter((o) => !o.data_fim).length,
    folhaMensal: null,
    coberturaFolhaPct: null,
    motivos: {
      folha: 'sem custo de folha no cadastro: `job_roles` tem salário de referência, mas nenhuma pessoa está vinculada a cargo',
      faturamentoTotal: 'cadastro de OS ainda incompleto — total de faturamento fica fora da faixa da diretoria',
    },
  };
}

// ── 3. Melhorias: capacidade interna × tempo do cliente ────────────────

/** Só o que a leitura de capacidade precisa de `process_improvements`. */
export interface MelhoriaCapacidade {
  id: string;
  cluster_id?: string | null;
  time_saved_hours?: number | null;
  cost_saved_monthly: number | null;
}

export interface CapacidadeMelhorias {
  melhorias: number;
  melhoriasComHoras: number;
  /** Horas/mês devolvidas pelas melhorias. `null` quando ninguém preencheu. */
  horasReduzidasMes: number | null;
  /** Horas → FTE (176h/mês). `null` junto com as horas. */
  fteLiberado: number | null;
  economiaMensal: number;
  economiaAnual: number;
  /** Interna (capacidade PSA) × cliente (tempo de entrega): sem campo hoje. */
  ganhoInterno: null;
  ganhoCliente: null;
  motivos: { distincao: string };
}

export function capacidadeMelhorias(melhorias: MelhoriaCapacidade[]): CapacidadeMelhorias {
  const comHoras = melhorias.filter((m) => (m.time_saved_hours ?? 0) > 0);
  const horas = comHoras.reduce((a, m) => a + (m.time_saved_hours || 0), 0);
  const economiaMensal = melhorias.reduce((a, m) => a + (m.cost_saved_monthly || 0), 0);
  return {
    melhorias: melhorias.length,
    melhoriasComHoras: comHoras.length,
    horasReduzidasMes: comHoras.length > 0 ? horas : null,
    fteLiberado: comHoras.length > 0 ? horas / HORAS_MES_FTE : null,
    economiaMensal,
    economiaAnual: economiaMensal * 12,
    ganhoInterno: null,
    ganhoCliente: null,
    motivos: {
      distincao:
        'melhoria interna (capacidade PSA) × melhoria no cliente (tempo de entrega) ainda não é campo de `process_improvements`',
    },
  };
}

// ── 4. Recorte OSG ─────────────────────────────────────────────────────

export interface SaudeOsg {
  metaClientesAno: number;
  /** Clientes cuja PRIMEIRA OS caiu no ano corrente. */
  captadosAno: number | null;
  captadosAnoAnterior: number | null;
  ticketMedio: number | null;
  receitaAno: number;
  receitaAnoAnterior: number;
  variacaoReceitaPct: number | null;
  /** Pessoas nas equipes das áreas do cluster. `null` se a consulta falhou. */
  headcount: number | null;
  /** Senioridade não está no cadastro de pessoas. */
  senioresJson: null;
  folhaMensal: null;
  horasReduzidasMes: number | null;
  fteLiberado: number | null;
  motivos: { seniores: string; folha: string };
}

export function saudeOsg(entrada: {
  os: OsRow[];
  melhorias: MelhoriaCapacidade[];
  headcount: number | null;
  hoje: string;
}): SaudeOsg {
  const { os, melhorias, headcount, hoje } = entrada;
  const ano = hoje.slice(0, 4);
  const anoAnterior = String(Number(ano) - 1);

  const primeira = new Map<string, string>();
  for (const o of os) {
    if (!o.data_inicio) continue;
    const atual = primeira.get(o.cliente_id);
    if (!atual || o.data_inicio < atual) primeira.set(o.cliente_id, o.data_inicio);
  }
  const captados = (alvo: string) =>
    [...primeira.values()].filter((d) => d.slice(0, 4) === alvo).length;

  const receitaDoAno = (alvo: string) =>
    os.reduce((a, o) => (o.data_inicio?.slice(0, 4) === alvo ? a + o.faturamento : a), 0);

  const comValor = os.filter((o) => o.faturamento > 0);
  const capacidade = capacidadeMelhorias(melhorias);
  const receitaAno = receitaDoAno(ano);
  const receitaAnoAnterior = receitaDoAno(anoAnterior);

  return {
    metaClientesAno: META_CLIENTES_ANO_OSG,
    captadosAno: primeira.size > 0 ? captados(ano) : null,
    captadosAnoAnterior: primeira.size > 0 ? captados(anoAnterior) : null,
    ticketMedio: comValor.length > 0
      ? comValor.reduce((a, o) => a + o.faturamento, 0) / comValor.length
      : null,
    receitaAno,
    receitaAnoAnterior,
    variacaoReceitaPct: variacao(receitaAno, receitaAnoAnterior),
    headcount,
    senioresJson: null,
    folhaMensal: null,
    horasReduzidasMes: capacidade.horasReduzidasMes,
    fteLiberado: capacidade.fteLiberado,
    motivos: {
      seniores: 'senioridade não está no cadastro de pessoas (nenhum vínculo pessoa ↔ cargo)',
      folha: 'sem custo de folha por área no cadastro',
    },
  };
}
