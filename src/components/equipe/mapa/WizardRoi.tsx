// Wizard executivo de ROI.
// 5 passos que explicitam de onde cada valor é extraído (entidade.campo)
// e quais campos faltam para o cálculo. Sem emojis; paleta institucional PSA.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  Processo, Etapa, Responsavel, Sistema, Gargalo, Melhoria, ProcessSnapshot,
} from '@/types';
import type { ItemDiagnostico } from '@/utils/diagnosticoRoi';
import { calcularRoi, execucoesAnuais } from '@/utils/roiCalculator';
import {
  diagnosticarRoi,
  type StatusItem,
  type CategoriaDiagnostico,
  type CategoriaIcone,
} from '@/utils/diagnosticoRoi';
import { formatarMoeda, formatDecimal } from '@/utils/format';
import { Icon, StatusGlyph, type RoiIconName } from '@/components/icons/RoiIcons';
import { useSnapshots, useCreateSnapshot } from '@/hooks/useSnapshots';

interface Props {
  processo: Processo | undefined;
  etapas: Etapa[];
  responsaveis: Responsavel[];
  sistemas: Sistema[];
  gargalos: Gargalo[];
  melhorias: Melhoria[];
  onSnapshotCriado: (snap: ProcessSnapshot) => void;
  /** Abre o modal "Editar etapas (Como era)" do processo, focando a etapa informada. */
  onEditarEtapas?: (etapaId?: string) => void;
}

// Indica se o item do diagnóstico tem um destino de edição navegável.
// Prioriza os alvos explícitos (alvoEtapaId / alvo) emitidos pelo motor de
// diagnóstico; faz fallback para a heurística pelo 1º campo-fonte.
function temDestino(it: ItemDiagnostico): boolean {
  if (it.alvoEtapaId || it.alvo) return true;
  const fonte = it.camposFonte?.[0] || '';
  return (
    fonte.startsWith('etapa') ||
    fonte.startsWith('processos') ||
    fonte.startsWith('responsaveis') ||
    fonte.startsWith('sistemas') ||
    fonte.startsWith('melhoria')
  );
}

type Passo = 1 | 2 | 3 | 4 | 5;

const PASSOS: { id: Passo; label: string }[] = [
  { id: 1, label: 'Diagnóstico' },
  { id: 2, label: 'Equipe & Horas' },
  { id: 3, label: 'Qualidade' },
  { id: 4, label: 'Sistemas & Invest.' },
  { id: 5, label: 'Prévia & Salvar' },
];

const CAT_ICON: Record<CategoriaIcone, RoiIconName> = {
  process: 'process',
  team: 'team',
  quality: 'quality',
  system: 'system',
};

type StatusKey = 'ok' | 'warn' | 'crit' | 'zero';

function statusKey(s: StatusItem): StatusKey {
  if (s === 'ok') return 'ok';
  if (s === 'zerado') return 'zero';
  if (s === 'incompleto') return 'warn';
  return 'crit';
}

function statusLabel(s: StatusItem): string {
  if (s === 'ok') return 'OK';
  if (s === 'zerado') return 'Vazio';
  if (s === 'incompleto') return 'Pendente';
  return 'Faltando';
}

// ---------------------------------------------------------------------------
// Subcomponentes
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: StatusItem }) {
  const key = statusKey(status);
  const icon: RoiIconName =
    key === 'ok' ? 'check' :
    key === 'warn' ? 'alert' :
    key === 'crit' ? 'cross' : 'minus';
  return (
    <span className={`roi-status-badge is-${key}`}>
      <Icon name={icon} size={11} strokeWidth={2.4} />
      {statusLabel(status)}
    </span>
  );
}

function StatusDot({ status }: { status: StatusItem }) {
  const key = statusKey(status);
  return (
    <span className={`roi-status-dot is-${key}`} aria-label={statusLabel(status)}>
      <StatusGlyph status={key} size={8} />
    </span>
  );
}

function FormulaChip({ formula }: { formula?: string }) {
  if (!formula) return null;
  return (
    <code className="roi-formula" title={formula}>
      {formula}
    </code>
  );
}

function FieldChips({ campos }: { campos?: string[] }) {
  if (!campos || campos.length === 0) return null;
  return (
    <div className="roi-fields">
      {campos.map(c => (
        <span key={c} className="roi-field-chip">{c}</span>
      ))}
    </div>
  );
}

function CategoryCard({ cat, onItemClick }: { cat: CategoriaDiagnostico; onItemClick?: (it: ItemDiagnostico) => void }) {
  const key = statusKey(cat.status);
  const nOk = cat.itens.filter(i => i.status === 'ok').length;
  return (
    <div className={`roi-cat-card is-${key}`}>
      <div className="roi-cat-head">
        <span className="roi-cat-title">
          <Icon name={CAT_ICON[cat.icone]} size={16} />
          {cat.nome}
        </span>
        <span className="roi-cat-count">{nOk}/{cat.itens.length}</span>
      </div>
      <div className="roi-cat-items">
        {cat.itens.slice(0, 3).map((it, i) => {
          const editavel = it.status !== 'ok' && !!onItemClick && temDestino(it);
          return (
            <div
              key={i}
              className="roi-cat-row"
              style={editavel ? { cursor: 'pointer' } : undefined}
              title={editavel ? 'Clique para editar' : undefined}
              onClick={editavel ? () => onItemClick!(it) : undefined}
            >
              <StatusDot status={it.status} />
              <span>{it.campo}</span>
            </div>
          );
        })}
        {cat.itens.length > 3 && (
          <div className="roi-cat-more">+{cat.itens.length - 3} itens — veja tabela consolidada abaixo</div>
        )}
      </div>
    </div>
  );
}

function RoiDataMap({ categorias, onItemClick }: { categorias: CategoriaDiagnostico[]; onItemClick?: (it: ItemDiagnostico) => void }) {
  const todos = categorias.flatMap(c => c.itens);
  const ok = todos.filter(i => i.status === 'ok').length;
  const pend = todos.filter(i => i.status === 'incompleto' || i.status === 'faltando').length;
  const zero = todos.filter(i => i.status === 'zerado').length;

  return (
    <div className="roi-data-map">
      <div className="roi-data-map-head">
        <h4>Mapa de dados do ROI</h4>
        <div className="roi-data-map-counts">
          <span>OK: <em>{ok}</em></span>
          <span>Pendentes: <em>{pend}</em></span>
          <span>Vazios: <em>{zero}</em></span>
          <span>Total: <em>{todos.length}</em></span>
        </div>
      </div>
      <div className="roi-table-wrap" style={{ border: 'none', borderRadius: 0, margin: 0 }}>
        <table className="roi-data-map-table">
          <thead>
            <tr>
              <th className="col-indicator">Indicador</th>
              <th className="col-formula">Fórmula</th>
              <th className="col-fields">Campos-fonte</th>
              <th className="col-value">Valor atual</th>
              <th className="col-status">Status</th>
            </tr>
          </thead>
          <tbody>
            {todos.map((it, i) => {
              const editavel = it.status !== 'ok' && !!onItemClick && temDestino(it);
              return (
              <tr
                key={i}
                style={editavel ? { cursor: 'pointer' } : undefined}
                title={editavel ? 'Clique para editar este campo' : undefined}
                onClick={editavel ? () => onItemClick!(it) : undefined}
              >
                <td className="col-indicator">{it.campo}</td>
                <td>
                  {it.formula ? <FormulaChip formula={it.formula} /> : <span style={{ color: '#94a3b8' }}>—</span>}
                </td>
                <td><FieldChips campos={it.camposFonte} /></td>
                <td className="col-value">
                  {it.valor != null && it.valor !== ''
                    ? (typeof it.valor === 'number' ? formatDecimal(it.valor) : it.valor)
                    : <span style={{ color: '#94a3b8' }}>—</span>}
                </td>
                <td className="col-status"><StatusBadge status={it.status} /></td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type KpiVariant = 'default' | 'investment' | 'payback' | 'atual' | 'estimado' | 'economia';

interface KpiExecProps {
  label: string;
  value: string;
  formula?: string;
  variant?: KpiVariant;
}

function KpiExec({ label, value, formula, variant = 'default' }: KpiExecProps) {
  const cls = variant === 'default' ? 'roi-kpi-exec' : `roi-kpi-exec is-${variant}`;
  return (
    <div className={cls}>
      <div className="roi-kpi-label">{label}</div>
      <div className="roi-kpi-value">{value}</div>
      {formula && <div className="roi-kpi-formula">{formula}</div>}
    </div>
  );
}

// Compara dois valores no formato "atual → estimado". `melhorMenor` indica se
// estimado < atual é desejável (custo, horas, erros). Se os valores são iguais,
// renderiza apenas um número (sem seta) — zero fica esmaecido.
function Compare({
  atual, ficou, fmt, melhorMenor = true,
}: {
  atual: number;
  ficou: number;
  fmt: (n: number) => string;
  melhorMenor?: boolean;
}) {
  const sameValue = Math.abs(atual - ficou) < 1e-9;
  if (sameValue) {
    const isZero = Math.abs(atual) < 1e-9;
    return (
      <span className={`roi-compare-single${isZero ? ' is-muted' : ''}`}>
        {fmt(atual)}
      </span>
    );
  }
  const better = melhorMenor ? ficou < atual : ficou > atual;
  const cls = better ? 'is-better' : 'is-worse';
  return (
    <span className="roi-compare">
      <span className="roi-compare-atual">{fmt(atual)}</span>
      <Icon name="arrowRight" size={10} className="roi-compare-arrow" />
      <span className={`roi-compare-ficou ${cls}`}>{fmt(ficou)}</span>
    </span>
  );
}

function Delta({
  atual, ficou, fmt, melhorMenor = true,
}: {
  atual: number;
  ficou: number;
  fmt: (n: number) => string;
  melhorMenor?: boolean;
}) {
  const diff = melhorMenor ? atual - ficou : ficou - atual;
  const cls = Math.abs(diff) < 1e-9 ? 'is-zero' : diff > 0 ? 'is-positive' : 'is-negative';
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  return <span className={`roi-delta ${cls}`}>{sign}{fmt(Math.abs(diff))}</span>;
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function WizardRoi({
  processo, etapas, responsaveis, sistemas, gargalos, melhorias,
  onSnapshotCriado, onEditarEtapas,
}: Props) {
  const navigate = useNavigate();
  const handleEditarItem = (it: ItemDiagnostico) => {
    // 1) Etapa específica → abre o editor de etapas já posicionado nela.
    if (it.alvoEtapaId) { onEditarEtapas?.(it.alvoEtapaId); return; }
    // 2) Alvo explícito (sistema, responsável, melhoria, gargalo, processo) →
    //    navega à página e abre o modal de detalhe do item exato via focusId.
    if (it.alvo) { navigate(it.alvo.rota, { state: { focusId: it.alvo.focusId } }); return; }
    // 3) Fallback pela heurística do campo-fonte.
    const fonte = it.camposFonte?.[0] || '';
    if (fonte.startsWith('etapa')) { onEditarEtapas?.(); return; }
    if (fonte.startsWith('processos')) navigate('/equipe/digital/mapa/processos');
    else if (fonte.startsWith('responsaveis')) navigate('/equipe/digital/mapa/responsaveis');
    else if (fonte.startsWith('sistemas')) navigate('/equipe/digital/mapa/sistemas');
    else if (fonte.startsWith('melhoria')) navigate('/equipe/digital/mapa/melhorias');
  };
  const [passo, setPasso] = useState<Passo>(1);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Histórico linear de mensurações deste processo (Hook-First — via React
  // Query). O selector na aba "Prévia" permite alternar entre "Ao vivo"
  // (cálculo atual) e qualquer mensuração salva. Mensurações antigas exibem
  // os indicadores estáticos do snapshot, sem recálculo.
  const snapshotsQuery = useSnapshots(processo?.id);
  const snapshotsProcesso = useMemo(
    () => [...(snapshotsQuery.data ?? [])].sort((a, b) => a.snapshot_at.localeCompare(b.snapshot_at)),
    [snapshotsQuery.data],
  );
  const createSnapshotMutation = useCreateSnapshot();
  const [snapshotSelecionado, setSnapshotSelecionado] = useState<'ao-vivo' | string>('ao-vivo');

  useEffect(() => {
    setPasso(1);
    setErro('');
    setSnapshotSelecionado('ao-vivo');
  }, [processo?.id]);

  const diag = useMemo(() => {
    if (!processo) return null;
    return diagnosticarRoi(processo, etapas, responsaveis, sistemas, gargalos, melhorias);
  }, [processo, etapas, responsaveis, sistemas, gargalos, melhorias]);

  const calc = useMemo(() => processo ? calcularRoi({
    processos: [processo], etapas, responsaveis, sistemas, gargalos, melhorias,
  }).porProcesso[0] : undefined, [processo, etapas, responsaveis, sistemas, gargalos, melhorias]);

  const respById = useMemo(() => new Map(responsaveis.map(r => [r.id, r])), [responsaveis]);
  const custoHM = responsaveis.length
    ? responsaveis.reduce((s, r) => s + (r.hourly_rate || 0), 0) / responsaveis.length
    : 0;

  // Breakdown por etapa: horas e custo, atual × estimado (ficou).
  // Usa hourly_rate do responsável quando vinculado, senão o custo-médio.
  // O cenário "ficou" lê de etapa.ficou.* (espelho lateral); quando ausente,
  // faz fallback para os valores da era.
  const etapasBreakdown = useMemo(() => {
    const sumLado = (arr: { responsavelId?: string; horas?: number }[] | undefined): { h: number; c: number } => {
      let h = 0, c = 0;
      for (const r of arr || []) {
        const horas = r.horas ?? 0;
        const resp = r.responsavelId ? respById.get(r.responsavelId) : undefined;
        const ch = resp ? (resp.hourly_rate ?? 0) : custoHM;
        h += horas;
        c += horas * ch;
      }
      return { h, c };
    };
    return etapas.map(e => {
      const f = e.ficou;
      const volEra = e.volume_per_process || 1;
      const volFicou = (f?.volume_per_process ?? e.volume_per_process) || 1;

      const exe  = sumLado(e.executadoPor);
      const exeF = sumLado(f?.executadoPor ?? e.executadoPor);

      const horasExec = exe.h * volEra;
      const horasFicou = exeF.h * volFicou;
      const custoExec = exe.c * volEra;
      const custoFicou = exeF.c * volFicou;

      const txRetrab = e.rework_rate ?? 0;
      const txRetrabFicou = f?.rework_rate ?? txRetrab;
      const custoRetrabExec = custoExec * txRetrab;
      const custoRetrabExecFicou = custoFicou * txRetrabFicou;

      return {
        id: e.id,
        nome: e.name,
        horasExec, horasFicou,
        custoExec, custoFicou,
        error_rate: e.error_rate ?? 0,
        taxaErrosFicou: f?.error_rate ?? e.error_rate ?? 0,
        taxaRetrab: txRetrab,
        taxaRetrabFicou: txRetrabFicou,
        custoRetrabExec, custoRetrabExecFicou,
      };
    });
  }, [etapas, respById, custoHM]);

  // Sistemas efetivamente usados pelo processo
  const sistemasUsados = useMemo(() => {
    const ids = new Set<string>();
    etapas.forEach(e => (e.sistemas || []).forEach(s => ids.add(s)));
    return sistemas.filter(s => ids.has(s.id) || ids.has(s.nome));
  }, [etapas, sistemas]);

  // Melhorias relevantes para este processo: vínculo direto M:N ou via gargalo.
  const melhoriasRelevantes = useMemo(() => {
    if (!processo) return [];
    const gargalosIds = new Set(
      gargalos.filter(g => (g.processos || []).includes(processo.id)).map(g => g.id)
    );
    const melhoriaIdsViaGargalos = new Set(
      gargalos
        .filter(g => gargalosIds.has(g.id) && g.melhoria_id)
        .map(g => g.melhoria_id as string)
    );
    return melhorias.filter(m =>
      (m.processos || []).includes(processo.id) ||
      melhoriaIdsViaGargalos.has(m.id)
    );
  }, [processo, gargalos, melhorias]);

  if (!processo || !diag) return null;

  const ann = execucoesAnuais(processo);

  const salvarMensuracao = async () => {
    setSalvando(true);
    setErro('');
    try {
      const snap = await createSnapshotMutation.mutateAsync({
        process_id: processo.id,
        annual_cost: calc?.custoAnual ?? 0,
        annual_hours: calc?.horasAnual ?? 0,
        annual_savings: calc?.economiaAnual ?? 0,
        roi_percent: calc?.roiPercentual ?? 0,
        payback_months: calc?.paybackMeses ?? 0,
        hours_freed: calc?.horasLiberadas ?? 0,
        investment: calc?.investimento ?? 0,
      });
      // O hook já invalida `process_snapshots` no onSuccess — a lista
      // recarrega automaticamente via React Query.
      setSnapshotSelecionado('ao-vivo');
      onSnapshotCriado(snap);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  };

  // Indicadores exibidos no passo "Prévia": ao-vivo usa `calc` (recálculo em
  // memória); ao escolher uma mensuração específica, lê os valores estáticos
  // do snapshot pelo seu id.
  const snapAtivo = typeof snapshotSelecionado === 'string' && snapshotSelecionado !== 'ao-vivo'
    ? snapshotsProcesso.find(s => s.id === snapshotSelecionado)
    : undefined;
  const indicadores = snapAtivo
    ? {
        annual_cost: snapAtivo.annual_cost,
        annual_hours: snapAtivo.annual_hours,
        annual_savings: snapAtivo.annual_savings,
        roi_percent: snapAtivo.roi_percent,
        payback_months: snapAtivo.payback_months,
        hours_freed: snapAtivo.hours_freed,
        investment: snapAtivo.investment,
      }
    : {
        annual_cost: calc?.custoAnual ?? 0,
        annual_hours: calc?.horasAnual ?? 0,
        annual_savings: calc?.economiaAnual ?? 0,
        roi_percent: calc?.roiPercentual ?? 0,
        payback_months: calc?.paybackMeses ?? 0,
        hours_freed: calc?.horasLiberadas ?? 0,
        investment: calc?.investimento ?? 0,
      };
  const visualizandoHistorico = !!snapAtivo;

  const irPara = (p: Passo) => { setErro(''); setPasso(p); };

  const progresso = diag.progresso;
  const progressoCls =
    progresso >= 100 ? '' :
    progresso >= 50 ? 'is-warn' : 'is-crit';

  return (
    <div className="roi-config-shell">
      {/* ---------- Header executivo ---------- */}
      <div className="roi-config-header">
        <div>
          <span className="roi-config-eyebrow">Configurar ROI · {processo.name}</span>
          <h2>Diagnóstico e baseline do retorno do processo</h2>
        </div>
        <div className="roi-config-meta">
          <span>Passo <strong>{passo}</strong> de <strong>{PASSOS.length}</strong></span>
          <span>{PASSOS[passo - 1].label}</span>
        </div>
      </div>

      {/* ---------- Progress meter ---------- */}
      <div className="roi-progress">
        <div className="roi-progress-head">
          <span className="roi-progress-label">Preenchimento de dados</span>
          <span className="roi-progress-value">{progresso}%</span>
        </div>
        <div className="roi-progress-track">
          <div
            className={`roi-progress-fill ${progressoCls}`}
            style={{ width: `${progresso}%` }}
          />
        </div>
      </div>

      {/* ---------- Stepper ---------- */}
      <nav className="roi-stepper" aria-label="Passos do wizard">
        {PASSOS.map((p, i) => {
          const ativo = p.id === passo;
          const feito = p.id < passo;
          const cls = `roi-stepper-item${ativo ? ' is-active' : ''}${feito ? ' is-done' : ''}`;
          return (
            <div key={p.id} className={cls}>
              <button
                type="button"
                className="roi-stepper-node"
                onClick={() => irPara(p.id)}
                aria-current={ativo ? 'step' : undefined}
                aria-label={`Ir para o passo ${p.id}: ${p.label}`}
              >
                <span className="roi-stepper-circle">
                  {feito ? <Icon name="check" size={14} strokeWidth={2.4} /> : p.id}
                </span>
                <span className="roi-stepper-label">{p.label}</span>
              </button>
              {i < PASSOS.length - 1 && <span className="roi-stepper-line" />}
            </div>
          );
        })}
      </nav>

      {/* ---------- Corpo dos passos ---------- */}
      <div className="roi-config-body">

        {/* ====================== PASSO 1 — Diagnóstico ====================== */}
        {passo === 1 && (
          <>
            <div className="roi-section-head">
              <h3>Diagnóstico do mapeamento</h3>
              <p>
                Cada indicador abaixo identifica <strong>de onde o valor é extraído</strong> e qual métrica do
                ROI ele alimenta. Itens marcados como <strong>Faltando</strong> bloqueiam o cálculo; itens
                <strong> Pendentes</strong> precisam de ajuste.
              </p>
            </div>

            <div className={`roi-callout is-${diag.podeCalcular ? 'ok' : 'warn'}`}>
              <span className="roi-callout-icon">
                <Icon name={diag.podeCalcular ? 'check' : 'alert'} size={16} />
              </span>
              <div className="roi-callout-body">
                <strong>{diag.podeCalcular ? 'Pronto para calcular.' : 'Há campos pendentes.'}</strong>{' '}
                {diag.resumo}
              </div>
            </div>

            <div className="roi-subhead">
              Visão por categoria
              <span className="roi-subhead-rule" />
            </div>
            <div className="roi-cat-grid">
              {diag.categorias.map(cat => (
                <CategoryCard key={cat.id} cat={cat} onItemClick={handleEditarItem} />
              ))}
            </div>

            <div className="roi-subhead">
              Visão consolidada
              <span className="roi-subhead-rule" />
            </div>
            <RoiDataMap categorias={diag.categorias} onItemClick={handleEditarItem} />
          </>
        )}

        {/* ====================== PASSO 2 — Mão de obra (mini-ROI) ====================== */}
        {passo === 2 && (
          <>
            <div className="roi-section-head">
              <h3>Mão de obra — atual × estimado</h3>
              <p>
                Custo de pessoas e horas alocadas no processo, comparando o cenário atual
                ao projetado após as melhorias. Detalhamento dos campos faltantes está no
                passo <strong>Diagnóstico</strong>.
              </p>
            </div>

            {(() => {
              const pAtual = calc?.custosCategoria.pessoas ?? 0;
              const pFicou = calc?.custosCategoriaFicou.pessoas ?? 0;
              const horasA = calc?.horasAnual ?? 0;
              const horasF = calc?.horasAnualFicou ?? 0;
              const econ = Math.max(0, pAtual - pFicou);
              const horasLib = Math.max(0, horasA - horasF);
              return (
                <div className="roi-kpi-grid">
                  <KpiExec
                    label="Custo Atual / Ano"
                    value={formatarMoeda(pAtual)}
                    formula={`= pessoas × ${formatDecimal(ann, 'exec./ano')}`}
                    variant="atual"
                  />
                  <KpiExec
                    label="Estimado / Ano"
                    value={formatarMoeda(pFicou)}
                    formula="= pessoas após melhorias"
                    variant="estimado"
                  />
                  <KpiExec
                    label="Economia / Ano"
                    value={formatarMoeda(econ)}
                    formula="= atual − estimado"
                    variant="economia"
                  />
                  <KpiExec
                    label="Horas Liberadas / Ano"
                    value={formatDecimal(horasLib, 'h')}
                    formula={`= ${formatDecimal(horasA, 'h')} − ${formatDecimal(horasF, 'h')}`}
                    variant="economia"
                  />
                </div>
              );
            })()}

            <div className="roi-subhead">
              Por etapa
              <span className="roi-subhead-rule" />
            </div>
            <div className="roi-table-wrap">
              <table className="roi-table">
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th>Horas / exec</th>
                    <th>Custo / exec</th>
                    <th style={{ textAlign: 'right' }}>Δ Custo / ano</th>
                  </tr>
                </thead>
                <tbody>
                  {etapasBreakdown.length === 0 ? (
                    <tr><td colSpan={4} className="is-empty">Sem etapas cadastradas.</td></tr>
                  ) : etapasBreakdown.map(e => (
                    <tr key={e.id}>
                      <td>{e.nome}</td>
                      <td>
                        <Compare
                          atual={e.horasExec}
                          ficou={e.horasFicou}
                          fmt={(n) => formatDecimal(n, 'h')}
                        />
                      </td>
                      <td>
                        <Compare
                          atual={e.custoExec}
                          ficou={e.custoFicou}
                          fmt={formatarMoeda}
                        />
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Delta
                          atual={e.custoExec * ann}
                          ficou={e.custoFicou * ann}
                          fmt={formatarMoeda}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!processo.frequency && (
              <div className="roi-callout is-warn">
                <span className="roi-callout-icon"><Icon name="alert" size={16} /></span>
                <div className="roi-callout-body">
                  Frequência do processo não definida — projeção anual está zerada. Defina a
                  frequência no card do processo para ativar o cálculo.
                </div>
              </div>
            )}
          </>
        )}

        {/* ====================== PASSO 3 — Custo da Não-Qualidade ====================== */}
        {passo === 3 && (
          <>
            <div className="roi-section-head">
              <h3>Custo da Não-Qualidade</h3>
              <p>
                Quanto o processo <strong>perde por ano</strong> em retrabalho —
                no cenário atual e no projetado após melhorias.
                O <em>driver</em> de cálculo (taxa de retrabalho × custo de pessoas
                da etapa) é editado em <em> Editar etapas → Métricas</em>.
              </p>
            </div>

            {(() => {
              const reA = calc?.custosCategoria.retrabalho ?? 0;
              const reF = calc?.custosCategoriaFicou.retrabalho ?? 0;
              const econ = Math.max(0, reA - reF);
              return (
                <div className="roi-kpi-grid">
                  <KpiExec
                    label="Retrabalho Atual / Ano"
                    value={formatarMoeda(reA)}
                    formula="= Σ rework_rate × custoPessoas (hoje)"
                    variant="atual"
                  />
                  <KpiExec
                    label="Retrabalho Projetado / Ano"
                    value={formatarMoeda(reF)}
                    formula="= Σ rework_rate × custoPessoas (após melhorias)"
                    variant="estimado"
                  />
                  <KpiExec
                    label="Economia Projetada / Ano"
                    value={formatarMoeda(econ)}
                    formula="= atual − projetado"
                    variant="economia"
                  />
                </div>
              );
            })()}

            <div className="roi-subhead">
              Perdas por etapa — R$ / ano
              <span className="roi-subhead-rule" />
            </div>
            <div className="roi-table-wrap">
              <table className="roi-table">
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th>Retrabalho atual</th>
                    <th style={{ textAlign: 'right' }}>Retrabalho projetado</th>
                    <th style={{ textAlign: 'right' }}>Economia projetada</th>
                  </tr>
                </thead>
                <tbody>
                  {etapasBreakdown.length === 0 ? (
                    <tr><td colSpan={4} className="is-empty">Sem etapas cadastradas.</td></tr>
                  ) : etapasBreakdown.map(e => {
                    const retrabA = e.custoRetrabExec * ann;
                    const retrabF = e.custoRetrabExecFicou * ann;
                    return (
                      <tr key={e.id}>
                        <td>{e.nome}</td>
                        <td>{formatarMoeda(retrabA)}</td>
                        <td style={{ textAlign: 'right' }}>{formatarMoeda(retrabF)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <Delta atual={retrabA} ficou={retrabF} fmt={formatarMoeda} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ====================== PASSO 4 — Sistemas & Investimento (mini-ROI) ====================== */}
        {passo === 4 && (
          <>
            <div className="roi-section-head">
              <h3>Sistemas &amp; Investimento</h3>
              <p>
                Custo recorrente dos <strong>sistemas</strong> (custo fixo/licença mensal × 12 × rateio%) e
                <strong> investment</strong> one-shot das melhorias vinculadas aos gargalos do
                processo — entradas que determinam <strong>ROI %</strong> e <strong>payback</strong>.
              </p>
            </div>

            <div className="roi-kpi-grid">
              <KpiExec
                label="Sistemas / Ano"
                value={formatarMoeda(calc?.custosCategoria.sistemas ?? 0)}
                formula="= Σ custo fixo/licença × 12 × rateio%"
                variant="atual"
              />
              <KpiExec
                label="Investimento Total"
                value={formatarMoeda(calc?.investimento ?? 0)}
                formula="= treino + execução + externo"
                variant="investment"
              />
              <KpiExec
                label="Melhorias vinculadas"
                value={String(melhoriasRelevantes.length)}
                formula={`em ${gargalos.filter(g => (g.processos || []).includes(processo.id)).length} gargalo(s) do processo`}
                variant="default"
              />
            </div>

            <div className="roi-subhead">
              Sistemas utilizados
              <span className="roi-subhead-rule" />
            </div>
            <div className="roi-table-wrap">
              <table className="roi-table">
                <thead>
                  <tr>
                    <th>Sistema</th>
                    <th>Custo fixo/licença / mês</th>
                    <th style={{ textAlign: 'right' }}>Total / ano (×12)</th>
                  </tr>
                </thead>
                <tbody>
                  {sistemasUsados.length === 0 ? (
                    <tr><td colSpan={3} className="is-empty">Nenhum sistema vinculado às etapas do processo.</td></tr>
                  ) : sistemasUsados.map(s => {
                    const va = s.custo_variavel_por_uso ?? 0;
                    const tot = va * 12;
                    return (
                      <tr key={s.id}>
                        <td>{s.nome}</td>
                        <td className={va > 0 ? '' : 'is-muted'}>{formatarMoeda(va)}</td>
                        <td style={{ textAlign: 'right' }} className={tot > 0 ? '' : 'is-muted'}>
                          {formatarMoeda(tot)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="roi-subhead">
              Composição do investment
              <span className="roi-subhead-rule" />
            </div>
            <div className="roi-table-wrap">
              <table className="roi-table">
                <thead>
                  <tr>
                    <th>Melhoria</th>
                    <th>Treino</th>
                    <th>Execução</th>
                    <th>Externo</th>
                    <th style={{ textAlign: 'right' }}>Total invest.</th>
                  </tr>
                </thead>
                <tbody>
                  {melhoriasRelevantes.length === 0 ? (
                    <tr><td colSpan={5} className="is-empty">Nenhuma melhoria vinculada aos gargalos deste processo.</td></tr>
                  ) : melhoriasRelevantes.map(m => {
                    const treino = (m.training_hours || 0) * custoHM;
                    const exec = (m.executadoPor || []).reduce((acc, r) => {
                      const ch = (r.responsavelId && respById.get(r.responsavelId)?.hourly_rate) || custoHM;
                      return acc + (r.horas || 0) * ch;
                    }, 0);
                    const ext = m.one_time_external_cost || 0;
                    const total = treino + exec + ext;
                    return (
                      <tr key={m.id}>
                        <td>{m.improvement_description}</td>
                        <td className={treino > 0 ? '' : 'is-muted'}>{formatarMoeda(treino)}</td>
                        <td className={exec > 0 ? '' : 'is-muted'}>{formatarMoeda(exec)}</td>
                        <td className={ext > 0 ? '' : 'is-muted'}>{formatarMoeda(ext)}</td>
                        <td style={{ textAlign: 'right' }} className={total > 0 ? '' : 'is-muted'}>
                          {formatarMoeda(total)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {calc && (
              <div className="roi-callout is-info">
                <span className="roi-callout-icon"><Icon name="info" size={16} /></span>
                <div className="roi-callout-body">
                  <div className="roi-summary-grid">
                    <div>Treino melhorias: <strong>{formatarMoeda(calc.investimentoBreakdown.treinamentoMelhorias)}</strong></div>
                    <div>Execução melhorias: <strong>{formatarMoeda(calc.investimentoBreakdown.execucaoMelhorias)}</strong></div>
                    <div>Externo: <strong>{formatarMoeda(calc.investimentoBreakdown.externo)}</strong></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ====================== PASSO 5 — Prévia & Salvar ====================== */}
        {passo === 5 && (
          <>
            <div className="roi-section-head">
              <h3>Prévia do ROI</h3>
              <p>
                Indicadores consolidados conforme o estado atual do mapeamento. Salve para
                registrar uma nova <strong>mensuração</strong> no histórico cronológico
                do processo.
              </p>
            </div>

            {snapshotsProcesso.length > 0 && (
              <div className="roi-callout is-info">
                <span className="roi-callout-icon"><Icon name="info" size={16} /></span>
                <div className="roi-callout-body" style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <label htmlFor="roi-snapshot-selector" style={{ fontWeight: 600 }}>
                    Visualizar mensuração:
                  </label>
                  <select
                    id="roi-snapshot-selector"
                    className="roi-snapshot-select"
                    value={snapshotSelecionado}
                    onChange={(e) => setSnapshotSelecionado(e.target.value)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 6,
                      border: '1px solid #cbd5e1',
                      background: '#fff',
                      fontSize: '0.85rem',
                      minWidth: 280,
                    }}
                  >
                    <option value="ao-vivo">Ao vivo (cálculo atual)</option>
                    {[...snapshotsProcesso].reverse().map(s => (
                      <option key={s.id} value={s.id}>
                        Mensuração de {new Date(s.snapshot_at).toLocaleString('pt-BR')}
                      </option>
                    ))}
                  </select>
                  {visualizandoHistorico && (
                    <span style={{ fontSize: '0.78rem', color: '#475569' }}>
                      Você está vendo dados <strong>estáticos</strong> de uma mensuração anterior. Voltar para "Ao vivo" para salvar nova mensuração.
                    </span>
                  )}
                </div>
              </div>
            )}

            {!visualizandoHistorico && (!diag.podeCalcular ? (
              <div className="roi-callout is-warn">
                <span className="roi-callout-icon"><Icon name="alert" size={16} /></span>
                <div className="roi-callout-body">
                  <strong>Há {diag.criticos.length} campo{diag.criticos.length !== 1 ? 's' : ''} pendente{diag.criticos.length !== 1 ? 's' : ''}.</strong>{' '}
                  Os valores abaixo podem estar subestimados. Volte aos passos anteriores para preencher os dados faltantes.
                </div>
              </div>
            ) : (
              <div className="roi-callout is-ok">
                <span className="roi-callout-icon"><Icon name="check" size={16} /></span>
                <div className="roi-callout-body">
                  <strong>Todos os campos críticos estão preenchidos.</strong> O cálculo abaixo reflete fielmente o mapeamento atual.
                </div>
              </div>
            ))}

            <div className="roi-subhead">
              Indicadores consolidados
              {visualizandoHistorico && (
                <span style={{ marginLeft: 8, fontSize: '0.78rem', color: '#0d9488', fontWeight: 600 }}>
                  · Mensuração de {new Date(snapAtivo!.snapshot_at).toLocaleString('pt-BR')}
                </span>
              )}
              <span className="roi-subhead-rule" />
            </div>
            <div className="roi-kpi-grid">
              <KpiExec
                label="Custo Anual"
                value={formatarMoeda(indicadores.annual_cost)}
                formula="= pessoas + sistemas + erros + retrabalho"
              />
              <KpiExec
                label="Horas Anuais"
                value={formatDecimal(indicadores.annual_hours, 'h')}
                formula={`= horas/exec × ${formatDecimal(ann, 'exec/ano')}`}
              />
              <KpiExec
                label="Economia Anual"
                value={formatarMoeda(indicadores.annual_savings)}
                formula="= annual_cost − custoAnualFicou"
              />
              <KpiExec
                label="ROI"
                value={formatDecimal(indicadores.roi_percent, '%')}
                formula="= economia ÷ investment × 100"
              />
              <KpiExec
                label="Payback"
                value={formatDecimal(indicadores.payback_months, ' meses')}
                formula="= investment ÷ (economia / 12)"
                variant="payback"
              />
              <KpiExec
                label="Horas Liberadas"
                value={formatDecimal(indicadores.hours_freed, 'h/ano')}
                formula="= annual_hours − horasAnualFicou"
              />
              <KpiExec
                label="Investimento"
                value={formatarMoeda(indicadores.investment)}
                formula="= treino + execução + externo"
                variant="investment"
              />
            </div>

            {!visualizandoHistorico && calc && (
              <>
                <div className="roi-subhead">
                  Composição do custo anual
                  <span className="roi-subhead-rule" />
                </div>
                <div className="roi-callout is-info">
                  <span className="roi-callout-icon"><Icon name="info" size={16} /></span>
                  <div className="roi-callout-body">
                    <div className="roi-summary-grid">
                      <div>Pessoas: <strong>{formatarMoeda(calc.custosCategoria.pessoas)}</strong></div>
                      <div>Sistemas: <strong>{formatarMoeda(calc.custosCategoria.sistemas)}</strong></div>
                      <div>Retrabalho: <strong>{formatarMoeda(calc.custosCategoria.retrabalho)}</strong></div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {erro && (
              <div className="roi-callout is-crit">
                <span className="roi-callout-icon"><Icon name="alert" size={16} /></span>
                <div className="roi-callout-body">{erro}</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ---------- Footer ---------- */}
      <div className="roi-config-footer">
        <button
          type="button"
          className="btn-cancel"
          onClick={() => irPara(Math.max(1, passo - 1) as Passo)}
          disabled={passo === 1}
        >
          <Icon name="chevronLeft" size={14} />
          Voltar
        </button>
        {passo < PASSOS.length ? (
          <button
            type="button"
            className="btn-save"
            onClick={() => irPara((passo + 1) as Passo)}
          >
            Próximo
            <Icon name="chevronRight" size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="btn-save"
            onClick={salvarMensuracao}
            disabled={salvando || visualizandoHistorico}
            title={
              visualizandoHistorico
                ? 'Volte para "Ao vivo" antes de salvar uma nova mensuração'
                : !diag.podeCalcular ? 'Preencha os campos faltantes antes de salvar' : ''
            }
          >
            {salvando ? 'Salvando...' : 'Salvar mensuração'}
          </button>
        )}
      </div>
    </div>
  );
}
