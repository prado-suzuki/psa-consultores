// Notas Metodológicas — antes uma página própria, agora dois modais
// contextuais, um por dashboard:
//   - escopo "dashboard" → Dashboard ROI (com a aba ROI do processo, cujo
//     cálculo individual é o que o dashboard agrega)
//   - escopo "setor"     → Evolução do Setor (série histórica de snapshots)
// Cada dashboard abre o seu via <NotasInfoButton> (ícone ⓘ com tooltip).
// Foco: qual campo de qual página abastece cada indicador e qual o cálculo.

import { useState } from 'react';
import Modal from './Modal';
import { Tooltip } from './Tooltip';
import { dica } from '@/utils/tooltips';

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

// ───────────────────────────── ROI do processo ─────────────────────────────
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

// ───────────────────────────── Dashboard ROI ─────────────────────────────
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
        formula: 'não há vínculo direto gargalo↔melhoria — a relação é por associação ao PROCESSO: lista as melhorias que atuam no(s) mesmo(s) processo(s) do gargalo',
        fontes: ['gargalo_processos', 'melhoria_processos'],
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

// ───────────────────────────── Evolução do setor ─────────────────────────────
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

interface AbaInterna {
  id: string;
  label: string;
  dicaKey: string;
  intro: string;
  blocos: Bloco[];
}

const ABAS_POR_ESCOPO: Record<'dashboard' | 'setor', AbaInterna[]> = {
  dashboard: [
    {
      id: 'dashboard',
      label: 'Dashboard ROI',
      dicaKey: 'notas.aba.dashboard',
      intro: 'Consolida os processos do escopo filtrado, somando os resultados individuais e exibindo a narrativa em 6 etapas.',
      blocos: DASHBOARD,
    },
    {
      id: 'processo',
      label: 'ROI do processo',
      dicaKey: 'notas.aba.processo',
      intro: 'Cálculo de um único processo (wizard "Configurar ROI") — é este resultado que o Dashboard agrega. Compara Como Era × Como Ficou e atribui o investment das melhorias.',
      blocos: PROCESSO,
    },
  ],
  setor: [
    {
      id: 'setor',
      label: 'Evolução do setor',
      dicaKey: 'notas.aba.setor',
      intro: 'Série histórica do portfólio, lida exclusivamente dos snapshots salvos ao longo do tempo.',
      blocos: SETOR,
    },
  ],
};

const TITULOS: Record<'dashboard' | 'setor', string> = {
  dashboard: 'Notas Metodológicas — Dashboard ROI',
  setor: 'Notas Metodológicas — Evolução do Setor',
};

interface NotasMetodologicasModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Qual dashboard este modal documenta. */
  escopo: 'dashboard' | 'setor';
}

export function NotasMetodologicasModal({ isOpen, onClose, escopo }: NotasMetodologicasModalProps) {
  const abas = ABAS_POR_ESCOPO[escopo];
  const [abaId, setAbaId] = useState(abas[0].id);
  const ativa = abas.find(a => a.id === abaId) ?? abas[0];

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="modal" style={{ maxWidth: 960 }}>
        <h2>{TITULOS[escopo]}</h2>
        <p style={{ marginTop: -12, marginBottom: 16, color: '#475569', fontSize: '0.9rem' }}>
          Como cada número é calculado e <strong>qual campo de qual página</strong> o abastece.
        </p>

        {abas.length > 1 && (
          <nav className="notasv2-nav" style={{ marginBottom: 8 }}>
            {abas.map(a => (
              <button key={a.id} className={abaId === a.id ? 'active' : ''} onClick={() => setAbaId(a.id)}>
                <Tooltip text={dica(a.dicaKey)}>{a.label}</Tooltip>
              </button>
            ))}
          </nav>
        )}

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

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <button type="button" className="btn-cancel" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </Modal>
  );
}

interface NotasInfoButtonProps {
  onClick: () => void;
}

/** Botão ⓘ que abre o modal de notas metodológicas do dashboard. */
export function NotasInfoButton({ onClick }: NotasInfoButtonProps) {
  return (
    <Tooltip text="Acesse as notas metodológicas: fórmulas, indicadores e campos-fonte deste dashboard.">
      <button
        type="button"
        className="btn-secondary"
        onClick={onClick}
        aria-label="Abrir notas metodológicas"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        Notas metodológicas
      </button>
    </Tooltip>
  );
}
