// Motor de diagnóstico para o Wizard de ROI.
// Analisa todos os dados necessários para o cálculo e retorna
// um relatório estruturado do que está OK, faltando ou incompleto.
//
// Cada item do diagnóstico informa:
//   - campo: nome do campo
//   - origem: de onde o valor é extraído (entidade/tabela)
//   - valor: valor atual
//   - status: 'ok' | 'faltando' | 'incompleto' | 'zerado'
//   - mensagem: descrição dinâmica adaptada ao status
//   - impacto: qual métrica do ROI é afetada

import type {
  Processo, Etapa, Responsavel, Sistema, Gargalo, Melhoria,
} from '../types';
import { execucoesAnuais } from './roiCalculator';
import { formatDecimal, formatarMoeda } from './format';

// ---------------------------------------------------------------------------
// Tipos do diagnóstico
// ---------------------------------------------------------------------------

export type StatusItem = 'ok' | 'faltando' | 'incompleto' | 'zerado';
export type CategoriaIcone = 'process' | 'team' | 'quality' | 'system';

export interface ItemDiagnostico {
  campo: string;
  origem: string;
  valor: number | string | null;
  status: StatusItem;
  mensagem: string;
  impacto: string;
  formula?: string;        // ex.: "Σ horas × hourly_rate × volume_per_process"
  camposFonte?: string[];  // ex.: ["etapas.executado_por.horas", "responsaveis.custo_hora"]
  /** Destino exato ao clicar em "ver erro": rota + id do item a focar (abre o modal de detalhe). */
  alvo?: { rota: string; focusId: string };
  /** Quando o item é uma etapa, id da etapa a abrir diretamente no editor de etapas. */
  alvoEtapaId?: string;
}

export interface CategoriaDiagnostico {
  id: string;
  nome: string;
  icone: CategoriaIcone;
  itens: ItemDiagnostico[];
  status: StatusItem;  // pior status entre os itens
}

export interface DiagnosticoRoi {
  process_id: string;
  processoNome: string;
  categorias: CategoriaDiagnostico[];
  resumo: string;
  totalItens: number;
  itensOk: number;
  itensFaltando: number;
  itensIncompletos: number;
  itensZerados: number;
  criticos: ItemDiagnostico[];   // itens faltando ou incompletos
  podeCalcular: boolean;          // true se nenhum item crítico bloqueia o cálculo
  progresso: number;              // 0..100
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function piorStatus(itens: ItemDiagnostico[]): StatusItem {
  const ordem: Record<StatusItem, number> = { ok: 0, zerado: 1, incompleto: 2, faltando: 3 };
  let pior: StatusItem = 'ok';
  for (const i of itens) {
    if (ordem[i.status] > ordem[pior]) pior = i.status;
  }
  return pior;
}

interface ItemArgs {
  campo: string;
  origem: string;
  valor: number | string | null;
  status: StatusItem;
  impacto: string;
  formula?: string;
  camposFonte?: string[];
  mensagemOk?: string;
  alvo?: { rota: string; focusId: string };
  alvoEtapaId?: string;
}

function item(args: ItemArgs): ItemDiagnostico {
  const { campo, origem, valor, status, impacto, formula, camposFonte, mensagemOk, alvo, alvoEtapaId } = args;
  const mensagens: Record<StatusItem, string> = {
    ok: mensagemOk || `${campo}: ${typeof valor === 'number' ? formatDecimal(valor) : valor || '—'}`,
    zerado: `${campo} está zerado — não afeta o cálculo, mas pode indicar dado faltante.`,
    incompleto: `${campo} está incompleto ou parcial. Verifique na origem: ${origem}.`,
    faltando: `${campo} não foi preenchido. Edite em: ${origem}.`,
  };
  return {
    campo,
    origem,
    valor: valor ?? null,
    status,
    mensagem: mensagens[status],
    impacto,
    formula,
    camposFonte,
    alvo,
    alvoEtapaId,
  };
}

// ---------------------------------------------------------------------------
// Diagnóstico principal
// ---------------------------------------------------------------------------

export function diagnosticarRoi(
  processo: Processo,
  etapas: Etapa[],
  responsaveis: Responsavel[],
  sistemas: Sistema[],
  gargalos: Gargalo[],
  melhorias: Melhoria[],
): DiagnosticoRoi {
  const categorias: CategoriaDiagnostico[] = [];

  // ---- 1. Dados do Processo ----
  const catProcesso: ItemDiagnostico[] = [];
  const freq = processo.frequency;
  const ann = execucoesAnuais(processo);

  if (!freq) {
    catProcesso.push(item({
      campo: 'Frequência',
      origem: 'Processo → editar metadados (lápis no card)',
      valor: null,
      status: 'faltando',
      impacto: 'execuções anuais, custo anual, horas anuais',
      formula: 'FATOR_ANUAL[frequency]',
      camposFonte: ['processos.frequency'],
      alvo: { rota: '/processos', focusId: processo.id },
    }));
  } else {
    catProcesso.push(item({
      campo: 'Frequência',
      origem: 'Processo → editar metadados',
      valor: `${freq} (${ann} exec./ano)`,
      status: 'ok',
      impacto: 'multiplicador anual de custos e horas',
      formula: 'FATOR_ANUAL[frequency]',
      camposFonte: ['processos.frequency'],
      alvo: { rota: '/processos', focusId: processo.id },
    }));
  }

  categorias.push({
    id: 'processo', nome: 'Dados do Processo', icone: 'process',
    itens: catProcesso, status: piorStatus(catProcesso),
  });

  // ---- 2. Etapas — Equipe & Horas ----
  const catEquipe: ItemDiagnostico[] = [];

  if (etapas.length === 0) {
    catEquipe.push(item({
      campo: 'Etapas do processo',
      origem: 'Mapear → Aba "Como era" → Editar etapas',
      valor: null,
      status: 'faltando',
      impacto: 'todo o cálculo de ROI — sem etapas não há custo',
      formula: 'Σ etapas (custo + horas + qualidade)',
      camposFonte: ['etapas.processo_id'],
    }));
  } else {
    for (const e of etapas) {
      const temExec = (e.executadoPor || []).length > 0;
      const horasTotal = (e.executadoPor || []).reduce((s, r) => s + (r.horas || 0), 0);

      if (!temExec) {
        catEquipe.push(item({
          campo: `Etapa "${e.name}" — Responsáveis`,
          origem: 'Mapear → Editar etapas → Aba Equipe',
          valor: null,
          status: 'faltando',
          impacto: 'custo de pessoas desta etapa',
          formula: 'Σ executadoPor.horas × hourly_rate',
          camposFonte: ['etapa_responsaveis.papel', 'etapa_responsaveis.horas'],
          alvoEtapaId: e.id,
        }));
      } else if (horasTotal === 0) {
        catEquipe.push(item({
          campo: `Etapa "${e.name}" — Horas`,
          origem: 'Mapear → Editar etapas → Equipe (horas por pessoa)',
          valor: '0h',
          status: 'zerado',
          impacto: 'custo de pessoas desta etapa',
          formula: 'Σ executadoPor.horas',
          camposFonte: ['etapa_responsaveis.horas'],
          alvoEtapaId: e.id,
        }));
      } else {
        catEquipe.push(item({
          campo: `Etapa "${e.name}" — Equipe`,
          origem: 'Mapear → Editar etapas → Equipe',
          valor: `${formatDecimal(horasTotal, 'h')} (${(e.executadoPor || []).length} pessoas)`,
          status: 'ok',
          impacto: 'custo de pessoas desta etapa',
          formula: 'Σ executadoPor.horas × volume_per_process',
          camposFonte: ['etapa_responsaveis.horas', 'etapas.volume_por_processo'],
          alvoEtapaId: e.id,
        }));
      }

      // Volume por processo
      const vpp = e.volume_per_process;
      if (vpp == null || vpp === 0) {
        catEquipe.push(item({
          campo: `Etapa "${e.name}" — Volume/Projeto`,
          origem: 'Mapear → Editar etapas → Métricas',
          valor: vpp ?? null,
          status: vpp === 0 ? 'zerado' : 'faltando',
          impacto: 'multiplicador de volume da etapa (default 1 se ausente)',
          formula: 'horas × volume_por_processo',
          camposFonte: ['etapas.volume_por_processo'],
          mensagemOk: 'Volume por processo não definido — será usado 1 como padrão.',
          alvoEtapaId: e.id,
        }));
      }
    }

    // Custo/hora — apenas os responsáveis que APARECEM no escopo (etapas,
    // melhorias e gargalos do processo). Não analisa o catálogo inteiro.
    const respKeys = new Set<string>();
    const addResp = (arr?: { responsavelId?: string; nome?: string }[]) =>
      (arr || []).forEach(r => { if (r.responsavelId) respKeys.add(r.responsavelId); if (r.nome) respKeys.add(r.nome); });
    etapas.forEach(e => { addResp(e.executadoPor); });
    melhorias.forEach(m => { addResp(m.executadoPor); addResp(m.treinamentoPor); });
    gargalos.forEach(g => addResp(g.responsaveisHoras));
    const respUsados = responsaveis.filter(r => respKeys.has(r.id) || respKeys.has(r.name));

    if (respKeys.size > 0 && respUsados.length === 0) {
      catEquipe.push(item({
        campo: 'Cadastro de Responsáveis',
        origem: 'Página Responsáveis',
        valor: null,
        status: 'faltando',
        impacto: 'custo/hora de cada pessoa — sem cadastro, custo usa média = R$ 0',
        formula: 'custoPorHora × horasAlocadas',
        camposFonte: ['responsaveis.custo_hora'],
      }));
    }
    for (const r of respUsados) {
      const temCusto = !!r.hourly_rate && r.hourly_rate > 0;
      catEquipe.push(item({
        campo: `Responsável "${r.name}"`,
        origem: 'Página Responsáveis → editar',
        valor: temCusto ? `${formatarMoeda(r.hourly_rate)}/h` : 'sem custo/hora',
        status: temCusto ? 'ok' : 'incompleto',
        impacto: 'custo de cada hora trabalhada por esta pessoa',
        formula: 'responsaveis.custo_hora × horas',
        camposFonte: ['responsaveis.custo_hora'],
        alvo: { rota: '/responsaveis', focusId: r.id },
      }));
    }
  }

  categorias.push({
    id: 'equipe', nome: 'Equipe & Horas', icone: 'team',
    itens: catEquipe, status: piorStatus(catEquipe),
  });

  // ---- 3. Qualidade — Erros & Retrabalho ----
  const catQualidade: ItemDiagnostico[] = [];

  if (etapas.length === 0) {
    catQualidade.push(item({
      campo: 'Métricas de qualidade',
      origem: '(sem etapas)',
      valor: null,
      status: 'faltando',
      impacto: 'custo de retrabalho',
      formula: 'rework_rate × custoPessoas',
      camposFonte: ['etapas.taxa_retrabalho'],
    }));
  } else {
    for (const e of etapas) {
      const txErro = e.error_rate ?? 0;
      const txRetrab = e.rework_rate ?? 0;

      const temQualidade = txErro > 0 || txRetrab > 0;

      if (!temQualidade) {
        catQualidade.push(item({
          campo: `Etapa "${e.name}" — Qualidade`,
          origem: 'Mapear → Editar etapas → Métricas',
          valor: 'todas zeradas',
          status: 'zerado',
          impacto: 'custo de retrabalho desta etapa (taxa de erros é informativa)',
          formula: 'rework_rate × custoPessoas',
          camposFonte: ['etapas.taxa_erros', 'etapas.taxa_retrabalho'],
          alvoEtapaId: e.id,
        }));
      } else {
        const partes: string[] = [];
        if (txErro > 0) partes.push(`erros ${formatDecimal(txErro * 100, '%')}`);
        if (txRetrab > 0) partes.push(`retrab. ${formatDecimal(txRetrab * 100, '%')}`);
        catQualidade.push(item({
          campo: `Etapa "${e.name}" — Qualidade`,
          origem: 'Mapear → Editar etapas → Métricas',
          valor: partes.join(' · '),
          status: 'ok',
          impacto: 'custo de retrabalho desta etapa (taxa de erros é informativa)',
          formula: 'rework_rate × custoPessoas',
          camposFonte: ['etapas.taxa_erros', 'etapas.taxa_retrabalho'],
          alvoEtapaId: e.id,
        }));
      }
    }
  }

  categorias.push({
    id: 'qualidade', nome: 'Qualidade — Retrabalho', icone: 'quality',
    itens: catQualidade, status: piorStatus(catQualidade),
  });

  // ---- 4. Sistemas & Investimentos ----
  const catSistemas: ItemDiagnostico[] = [];

  // Sistemas usados pelo processo
  const sistemasIds = new Set<string>();
  etapas.forEach(e => (e.sistemas || []).forEach(s => sistemasIds.add(s)));
  const sistemasUsados = sistemas.filter(s => sistemasIds.has(s.id) || sistemasIds.has(s.nome));

  if (sistemasUsados.length === 0) {
    catSistemas.push(item({
      campo: 'Sistemas utilizados',
      origem: 'Mapear → Editar etapas → Sistemas',
      valor: 'nenhum sistema vinculado',
      status: 'zerado',
      impacto: 'custo mensal de sistemas — sem sistemas, custo = R$ 0',
      formula: 'Σ custo_variavel_por_uso × 12 × rateio%',
      camposFonte: ['etapa_sistemas.sistema_id', 'etapa_sistemas.rateio', 'sistemas_processo.custo_variavel_por_uso'],
    }));
  } else {
    for (const s of sistemasUsados) {
      const temCusto = (s.custo_variavel_por_uso || 0) > 0;
      catSistemas.push(item({
        campo: `Sistema "${s.nome}"`,
        origem: 'Página Sistemas → editar',
        valor: temCusto ? `${formatarMoeda(s.custo_variavel_por_uso || 0)}/mês` : 'sem custo mensal',
        status: temCusto ? 'ok' : 'incompleto',
        impacto: 'custo anual de sistemas (custo mensal × 12 × rateio)',
        formula: 'custo_variavel_por_uso × 12 × rateio%',
        camposFonte: ['sistemas_processo.custo_variavel_por_uso', 'etapa_sistemas.rateio'],
        alvo: { rota: '/sistemas', focusId: s.id },
      }));
    }
  }

  // Melhorias e investimentos — uma melhoria entra no investment do processo
  // se está associada ao processo (M:N direta) OU se resolve um gargalo do processo.
  const gargalosDoProc = new Set(
    gargalos.filter(g => (g.processos || []).includes(processo.id)).map(g => g.id)
  );
  const melhoriaIdsViaGargalos = new Set(
    gargalos
      .filter(g => gargalosDoProc.has(g.id) && g.melhoria_id)
      .map(g => g.melhoria_id as string)
  );
  const melhoriasRelevantes = melhorias.filter(m =>
    (m.processos || []).includes(processo.id) ||
    melhoriaIdsViaGargalos.has(m.id)
  );

  if (melhoriasRelevantes.length === 0) {
    catSistemas.push(item({
      campo: 'Melhorias vinculadas',
      origem: 'Página Melhorias → associar processos atendidos',
      valor: 'nenhuma melhoria',
      status: 'zerado',
      impacto: 'investment em melhorias (treinamento, execução, custo externo)',
      formula: 'Σ horas_treinamento×CH + executadoPor.horas×CH + custo_externo_unico',
      camposFonte: ['melhoria_processos', 'gargalos.melhoria_id', 'melhorias.horas_treinamento', 'melhoria_responsaveis.horas', 'melhorias.custo_externo_unico'],
    }));
  } else {
    for (const m of melhoriasRelevantes) {
      const invTreino = (m.training_hours || 0);
      const invExec = (m.executadoPor || []).reduce((s, r) => s + (r.horas || 0), 0);
      const invExt = m.one_time_external_cost || 0;
      const invMelhoria = invTreino + invExec + invExt;
      catSistemas.push(item({
        campo: `Melhoria "${m.improvement_description}"`,
        origem: 'Página Melhorias → editar',
        valor: invMelhoria > 0
          ? `${formatDecimal(invTreino, 'h')} treino + ${formatDecimal(invExec, 'h')} exec + ${formatarMoeda(invExt)} ext.`
          : 'sem investment cadastrado',
        status: invMelhoria > 0 ? 'ok' : 'incompleto',
        impacto: 'investment total (treinamento + execução + custo externo)',
        formula: 'horas_treinamento×CH + executadoPor.horas×CH + custo_externo_unico',
        camposFonte: ['melhorias.horas_treinamento', 'melhoria_responsaveis.horas', 'melhorias.custo_externo_unico'],
        alvo: { rota: '/melhorias', focusId: m.id },
      }));
    }
  }

  // Horas de treinamento das melhorias (já coberto acima, mas consolidado)
  const melhoriasSemTreino = melhoriasRelevantes.filter(m => !m.training_hours);
  if (melhoriasRelevantes.length > 0 && melhoriasSemTreino.length === melhoriasRelevantes.length) {
    // já reportado individualmente
  }

  categorias.push({
    id: 'sistemas', nome: 'Sistemas & Investimentos', icone: 'system',
    itens: catSistemas, status: piorStatus(catSistemas),
  });

  // ---- 5. Gargalos do processo ----
  // Lista os gargalos vinculados ao processo e sinaliza os que estão sem
  // dimensionamento (horas estimadas), para não ficarem despercebidos.
  const catGargalos: ItemDiagnostico[] = [];
  const gargalosDoProcLista = gargalos.filter(g => (g.processos || []).includes(processo.id));
  for (const g of gargalosDoProcLista) {
    const horas = g.horas_gastas || 0;
    catGargalos.push(item({
      campo: `Gargalo "${g.nome}"`,
      origem: 'Página Gargalos → editar',
      valor: horas > 0 ? `${formatDecimal(horas, 'h')}/mês` : 'sem horas estimadas',
      status: horas > 0 ? 'ok' : 'incompleto',
      impacto: 'dimensiona o impacto do gargalo (horas perdidas por mês)',
      formula: 'gargalos.horas_gastas',
      camposFonte: ['gargalos.horas_gastas'],
      alvo: { rota: '/gargalos', focusId: g.id },
    }));
  }
  if (catGargalos.length > 0) {
    categorias.push({
      id: 'gargalos', nome: 'Gargalos do Processo', icone: 'quality',
      itens: catGargalos, status: piorStatus(catGargalos),
    });
  }

  // ---- Consolida ----
  const todosItens = categorias.flatMap(c => c.itens);
  const itensOk = todosItens.filter(i => i.status === 'ok').length;
  const itensFaltando = todosItens.filter(i => i.status === 'faltando').length;
  const itensIncompletos = todosItens.filter(i => i.status === 'incompleto').length;
  const itensZerados = todosItens.filter(i => i.status === 'zerado').length;
  const criticos = todosItens.filter(i => i.status === 'faltando' || i.status === 'incompleto');
  const podeCalcular = itensFaltando === 0 && itensIncompletos === 0;
  const progresso = todosItens.length > 0
    ? Math.round((itensOk / todosItens.length) * 100)
    : 0;

  // ---- Resumo dinâmico ----
  let resumo: string;
  if (!freq && etapas.length === 0) {
    resumo = 'O mapeamento está vazio. Comece definindo a frequência do processo e cadastrando as etapas na aba "Como era".';
  } else if (!freq) {
    resumo = 'Defina a frequência do processo (Diária, Semanal, etc.) para calcular a projeção anual. Edite o card do processo (ícone de lápis).';
  } else if (etapas.length === 0) {
    resumo = 'Cadastre as etapas do processo na aba "Como era" → "Editar etapas". Sem etapas não há custo de mão de obra para calcular.';
  } else if (criticos.length > 0) {
    const porCat: Record<string, number> = {};
    for (const c of criticos) {
      const cat = categorias.find(cc => cc.itens.includes(c));
      if (cat) porCat[cat.nome] = (porCat[cat.nome] || 0) + 1;
    }
    const catsCriticas = Object.entries(porCat)
      .map(([nome, n]) => `**${nome}** (${n} campo${n > 1 ? 's' : ''})`)
      .join(', ');
    resumo = `Há ${criticos.length} campo${criticos.length > 1 ? 's' : ''} pendente${criticos.length > 1 ? 's' : ''} em: ${catsCriticas}. Preencha-os para um cálculo preciso.`;
  } else if (itensZerados > 0) {
    resumo = `${itensZerados} campo${itensZerados > 1 ? 's' : ''} zerado${itensZerados > 1 ? 's' : ''} (qualidade, sistemas ou investimentos). O cálculo funciona, mas valores zerados podem indicar mapeamento incompleto.`;
  } else {
    resumo = 'Todos os campos necessários estão preenchidos. O cálculo do ROI está pronto.';
  }

  return {
    process_id: processo.id,
    processoNome: processo.name,
    categorias,
    resumo,
    totalItens: todosItens.length,
    itensOk,
    itensFaltando,
    itensIncompletos,
    itensZerados,
    criticos,
    podeCalcular,
    progresso,
  };
}
