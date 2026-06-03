import { useState } from 'react';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';

// Notas Metodológicas — 3 abas alinhadas às três telas de ROI:
//   1. ROI do processo   → wizard "Configurar ROI" + roiCalculator.calcProcesso
//   2. Dashboard ROI     → DashboardRoiPage (agrega calcularRoi sobre o escopo)
//   3. Evolução do setor → SetorEvolucaoPage (série histórica de snapshots)
// Foco: qual campo de qual página abastece cada indicador e qual o cálculo.

type Aba = 'processo' | 'dashboard' | 'setor';

interface Linha {
  indicador: string;
  formula: string;
  fontes: string[]; // "campo — página"
  nota?: string;
}
interface Bloco {
  titulo: string;
  intro?: string;
  linhas: Linha[];
}

// ───────────────────────────── ABA 1 — ROI do processo ─────────────────────────────
const PROCESSO: Bloco[] = [
  {
    titulo: 'Base anual',
    intro: 'Todo custo/hora por execução é multiplicado pela frequência do processo para virar valor anual.',
    linhas: [
      {
        indicador: 'Execuções por ano',
        formula: 'FATOR_ANUAL[frequência] — Diária=252, Semanal=52, Quinzenal=26, Mensal=12, Trimestral=4, Anual=1',
        fontes: ['frequency — Processos (editar metadados)'],
        nota: 'É a frequência do processo que anualiza os custos — não há multiplicador "projetos por ano".',
      },
    ],
  },
  {
    titulo: 'Custo atual (Como Era)',
    intro: 'Somatório das etapas do processo. Cada etapa é ponderada pelo seu volume_per_process.',
    linhas: [
      {
        indicador: 'Horas / execução',
        formula: 'Σ etapas [ (Σ executadoPor.horas + Σ revisadoPor.horas) × volume_per_process ]',
        fontes: ['executadoPor[].horas, revisadoPor[].horas, volume_per_process — Etapas (Mapear → Como era)'],
      },
      {
        indicador: 'Custo de pessoas / execução',
        formula: 'Σ etapas [ (Σ horas × responsavel.hourly_rate) × volume_per_process ]',
        fontes: ['horas — Etapas', 'hourly_rate — Responsáveis'],
        nota: 'Responsável com hourly_rate = 0 (externo/cliente) entra com custo zero; vínculo perdido cai no custo/hora médio.',
      },
      {
        indicador: 'Custo de sistemas / ano',
        formula: 'Σ sistemas usados (custo fixo/licença mensal × 12 × rateio%)',
        fontes: ['sistemas[] — Etapas (rateio % por sistema)', 'custo_variavel_por_uso (custo fixo/licença) — Sistemas'],
        nota: 'Só o custo fixo/licença mensal entra (× 12). O rateio % por sistema define quanto do custo é atribuído ao processo (somado entre etapas, limitado a 100%).',
      },
      {
        indicador: 'Custo de retrabalho / ano',
        formula: 'Σ etapas [ custoPessoasDaEtapa × rework_rate ] × execuções/ano',
        fontes: ['rework_rate — Etapas', 'custo de pessoas da etapa (acima)'],
      },
      {
        indicador: 'Custo anual (atual)',
        formula: '(custo pessoas/exec × execuções/ano) + custo sistemas/ano + custo retrabalho/ano',
        fontes: ['derivado das linhas acima'],
        nota: 'Taxa de erros é registrada (informativa), mas NÃO entra no custo. Custo de erro e volume de erros foram descontinuados.',
      },
    ],
  },
  {
    titulo: 'Cenário projetado (Como Ficou)',
    intro: 'Mesmas fórmulas, lendo o espelho etapa.ficou. Sem projeção salva, faz fallback para os valores da era.',
    linhas: [
      {
        indicador: 'Custo anual (projetado)',
        formula: 'idem "Custo anual (atual)", usando etapa.ficou.* + sistemas das melhorias',
        fontes: ['etapa.ficou.* — Editar etapas (Como ficou)', 'melhoria.sistemas[] + rateio % — Melhorias'],
        nota: 'O custo de sistemas do cenário Ficou inclui os sistemas adotados pelas melhorias, com o rateio % da melhoria tendo precedência sobre o rateio da etapa.',
      },
    ],
  },
  {
    titulo: 'Investimento (one-shot)',
    intro: 'Soma dos custos únicos para alcançar o cenário projetado. Melhorias relevantes = vinculadas ao processo (M:N) OU que resolvem um gargalo do processo.',
    linhas: [
      {
        indicador: 'Treinamento de melhorias',
        formula: 'Σ melhoria.training_hours × hourly_rate médio',
        fontes: ['training_hours — Melhorias', 'hourly_rate — Responsáveis'],
      },
      {
        indicador: 'Execução de melhorias',
        formula: 'Σ melhoria.executadoPor[].horas × hourly_rate',
        fontes: ['executadoPor[].horas — Melhorias', 'hourly_rate — Responsáveis'],
        nota: 'Inclui a implantação/desenvolvimento dos sistemas (horas rateadas por responsável na melhoria). O sistema não tem mais campo próprio de horas de implantação.',
      },
      {
        indicador: 'Custo externo',
        formula: 'Σ melhoria.custoExternoUnico',
        fontes: ['custoExternoUnico — Melhorias'],
      },
    ],
  },
  {
    titulo: 'Resultado financeiro',
    linhas: [
      {
        indicador: 'Economia anual',
        formula: 'annual_cost − custoAnualFicou',
        fontes: ['derivado'],
        nota: 'Pode ser NEGATIVA: se o cenário futuro custar mais que o atual, a economia (e o ROI) ficam negativos — não é mais zerado.',
      },
      {
        indicador: 'Horas liberadas / ano',
        formula: 'annual_hours − horasAnualFicou',
        fontes: ['derivado'],
        nota: 'Também pode ser negativa.',
      },
      {
        indicador: 'ROI (%)',
        formula: 'annual_savings / investment × 100',
        fontes: ['derivado'],
        nota: 'Investimento zero → ROI indefinido (—). Pode ser negativo. No Dashboard, o ROI exibido usa o horizonte selecionado: (economiaMensal × horizonte) / investment.',
      },
      {
        indicador: 'Payback (meses)',
        formula: 'investment / (annual_savings / 12)',
        fontes: ['derivado'],
        nota: 'Só definido quando a economia é positiva; caso contrário exibido como "—".',
      },
    ],
  },
];

// ───────────────────────────── ABA 2 — Dashboard ROI ─────────────────────────────
const DASHBOARD: Bloco[] = [
  {
    titulo: 'Agregação e filtros',
    intro: 'O Dashboard roda o mesmo cálculo do processo para cada item do escopo filtrado (Projeto / Processo) e soma os resultados.',
    linhas: [
      {
        indicador: 'Escopo',
        formula: 'processos do projeto selecionado (e do processo, se filtrado); etapas e gargalos seguem o escopo',
        fontes: ['Filtros Projeto / Processo — topo do Dashboard'],
      },
      {
        indicador: 'Versão',
        formula: '"Ao vivo" = recalcula agora · data = soma os snapshots daquela data',
        fontes: ['snapshots — gerados no wizard "Configurar ROI"'],
      },
    ],
  },
  {
    titulo: '2. Diagnóstico (Como Era)',
    linhas: [
      { indicador: 'Custo operacional / ano', formula: 'Σ processos annual_cost', fontes: ['derivado (aba ROI do processo)'] },
      { indicador: 'Horas alocadas / ano', formula: 'Σ processos annual_hours', fontes: ['derivado'] },
      { indicador: 'Custo de retrabalho / ano', formula: 'Σ custosCategoria.retrabalho', fontes: ['rework_rate — Etapas'] },
      { indicador: 'Retrabalho médio %', formula: 'média de taxaRetrabalhoMedia entre processos', fontes: ['rework_rate — Etapas'] },
      {
        indicador: 'Composição de custo',
        formula: 'barras: Pessoas · Sistemas · Retrabalho · Externo',
        fontes: ['Etapas, Responsáveis, Sistemas, Melhorias'],
      },
      {
        indicador: 'Impacto dos gargalos',
        formula: 'horas = Σ gargalo.horas_gastas · custo = horas_gastas × hourly_rate médio · agrupado por origem',
        fontes: ['horas_gastas, origem, processos[] — Gargalos', 'hourly_rate — Responsáveis'],
      },
    ],
  },
  {
    titulo: '3. Melhorias e investment',
    linhas: [
      {
        indicador: 'Composição do investment',
        formula: 'Treinamento (Melhorias) + Execução de Melhorias + Custo Externo',
        fontes: ['Melhorias, Responsáveis'],
        nota: '"Treinamento de processo" foi descontinuado (campo removido de Processos).',
      },
      {
        indicador: 'De → Para (gargalo × melhoria)',
        formula: 'liga cada gargalo à melhoria apontada pela FK gargalos.melhoria_id (1:N — um gargalo tem no máximo 1 melhoria)',
        fontes: ['gargalos.melhoria_id', 'processos[] — Gargalos'],
      },
    ],
  },
  {
    titulo: '4. Cenário Futuro (Como Ficará)',
    linhas: [
      { indicador: 'Custo / horas / retrabalho projetados', formula: 'Σ processos custoAnualFicou / horasAnualFicou / custosCategoriaFicou.retrabalho', fontes: ['etapa.ficou.* — Editar etapas (Como ficou)'] },
    ],
  },
  {
    titulo: '5. ROI Consolidado',
    linhas: [
      { indicador: 'Economia anual', formula: 'Σ annual_savings dos processos (pode ser negativa)', fontes: ['derivado'] },
      { indicador: 'ROI / Resultado líquido (horizonte)', formula: 'ROI = (economiaMensal × horizonte) ÷ investment · Resultado líquido = economiaMensal × horizonte − investment', fontes: ['Horizonte — filtro do Dashboard'], nota: 'KPIs recalculam ao trocar o horizonte (12/24/36 meses); ROI e resultado líquido podem ser negativos antes do payback.' },
      { indicador: 'Payback', formula: 'investimentoTotal ÷ (economia/12)', fontes: ['derivado'] },
      { indicador: 'Curva break-even', formula: 'economia mensal acumulada × horizonte (12/24/36) vs. investment', fontes: ['Horizonte — filtro do Dashboard'] },
    ],
  },
];

// ───────────────────────────── ABA 3 — Evolução do setor ─────────────────────────────
const SETOR: Bloco[] = [
  {
    titulo: 'Fonte: snapshots',
    intro: 'Esta tela NÃO recalcula nada ao vivo. Lê apenas os snapshots gravados ao salvar baseline/remensuração no wizard "Configurar ROI" de cada processo.',
    linhas: [
      {
        indicador: 'Snapshot',
        formula: 'fotografia de annual_cost, annual_hours, annual_savings, hours_freed, roi_percent e payback no momento do salvamento',
        fontes: ['wizard Configurar ROI → "Salvar baseline / remensuração"'],
        nota: 'Sem ao menos 2 medições, a curva temporal não é desenhada.',
      },
    ],
  },
  {
    titulo: 'Comparativo por processo',
    intro: 'Agrupa snapshots por processo e compara a 1ª versão (baseline) com a última.',
    linhas: [
      { indicador: 'Δ custo', formula: 'baseline.annual_cost − última.annual_cost', fontes: ['annual_cost (snapshot)'] },
      { indicador: 'Δ %', formula: 'Δ custo / baseline.annual_cost × 100', fontes: ['annual_cost (snapshot)'] },
      { indicador: 'Δ horas', formula: 'baseline.annual_hours − última.annual_hours', fontes: ['annual_hours (snapshot)'] },
    ],
  },
  {
    titulo: 'KPIs do portfólio',
    linhas: [
      { indicador: 'Horas liberadas acumuladas', formula: 'Σ máx(0, Δ horas) dos processos', fontes: ['snapshots'] },
      { indicador: 'Economia anual acumulada', formula: 'Σ máx(0, Δ custo) dos processos', fontes: ['snapshots'] },
      { indicador: 'Processos com melhoria', formula: 'contagem de processos com Δ custo > 0', fontes: ['snapshots'] },
      { indicador: 'ROI médio do portfólio', formula: 'média de roi_percent das últimas medições', fontes: ['roi_percent (snapshot)'] },
      {
        indicador: 'Série temporal',
        formula: 'em ordem cronológica, acumula annual_savings/12 de cada snapshot mês a mês',
        fontes: ['annual_savings, snapshot_at (snapshot)'],
      },
    ],
  },
];

const ABAS: { id: Aba; label: string; intro: string; blocos: Bloco[] }[] = [
  { id: 'processo', label: 'ROI do processo', intro: 'Cálculo de um único processo (wizard "Configurar ROI"). Compara Como Era × Como Ficou e atribui o investment das melhorias. No diagnóstico, cada item pendente é clicável e leva direto ao campo de origem — a etapa exata no editor, ou o modal de detalhe do sistema, responsável, melhoria ou gargalo.', blocos: PROCESSO },
  { id: 'dashboard', label: 'Dashboard ROI', intro: 'Consolida os processos do escopo filtrado, somando os resultados individuais e exibindo a narrativa em 6 etapas.', blocos: DASHBOARD },
  { id: 'setor', label: 'Evolução do setor', intro: 'Série histórica do portfólio, lida exclusivamente dos snapshots salvos ao longo do tempo.', blocos: SETOR },
];

export default function NotasMetodologicasPage() {
  const [aba, setAba] = useState<Aba>('processo');
  const ativa = ABAS.find(a => a.id === aba)!;

  return (
    <div className="notasv2">
      <div className="notasv2-hero">
        <div className="notasv2-hero-text">
          <div className="notasv2-hero-eyebrow">Documentação interna</div>
          <h1>Notas Metodológicas</h1>
          <p>
            Como cada número de ROI é calculado e <strong>qual campo de qual página</strong> o abastece.
            Três abas, uma por tela de ROI.
          </p>
        </div>
        <div className="notasv2-hero-card">
          <div className="notasv2-hero-stat"><span>Telas de ROI</span><strong>3</strong></div>
          <div className="notasv2-hero-stat"><span>Versão</span><strong>3.1</strong></div>
        </div>
      </div>

      <nav className="notasv2-nav">
        {ABAS.map(a => (
          <button key={a.id} className={aba === a.id ? 'active' : ''} onClick={() => setAba(a.id)}>
            <Tooltip text={dica(a.id === 'processo' ? 'notas.aba.processo' : a.id === 'dashboard' ? 'notas.aba.dashboard' : 'notas.aba.setor')}>{a.label}</Tooltip>
          </button>
        ))}
      </nav>

      <div className="notasv2-content">
        <section className="notasv2-section">
          <div className="notasv2-callout"><strong>{ativa.label}:</strong> {ativa.intro}</div>

          {ativa.blocos.map((b) => (
            <div key={b.titulo} style={{ marginTop: 24 }}>
              <h3 style={{ marginBottom: 4 }}>{b.titulo}</h3>
              {b.intro && <p style={{ marginTop: 0, color: '#475569', fontSize: '0.9rem' }}>{b.intro}</p>}
              <div className="notasv2-dict-table">
                <div className="notasv2-dict-head" style={{ gridTemplateColumns: '1.1fr 1.6fr 1.5fr' }}>
                  <div><Tooltip text={dica('notas.col.indicador')}>Indicador</Tooltip></div>
                  <div><Tooltip text={dica('notas.col.calculo')}>Cálculo</Tooltip></div>
                  <div><Tooltip text={dica('notas.col.fontes')}>Campos-fonte → página</Tooltip></div>
                </div>
                {b.linhas.map((l) => (
                  <div key={l.indicador} className="notasv2-dict-row" style={{ gridTemplateColumns: '1.1fr 1.6fr 1.5fr', alignItems: 'start' }}>
                    <div><strong>{l.indicador}</strong></div>
                    <div>
                      <code style={{ whiteSpace: 'normal' }}>{l.formula}</code>
                      {l.nota && <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>{l.nota}</div>}
                    </div>
                    <div style={{ fontSize: '0.82rem' }}>
                      {l.fontes.map((f, i) => <div key={i}>{f}</div>)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
}
