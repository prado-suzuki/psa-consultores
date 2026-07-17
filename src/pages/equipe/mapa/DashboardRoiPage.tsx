import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Select from '@/components/equipe/mapa/Select';
import type { ProjetoStatus, Sistema, MelhoriaStatus } from '@/types';
import {
  calcularRoi, execucoesAnuais, statusEconomiaProcesso,
  type RoiAgregado, type RoiProcesso,
} from '@/utils/roiCalculator';
import { fmtRoi, roiDisponivel } from '@/utils/roiGuards';
import { melhoriasRelacionadasAoGargalo, processoIdsDoGargalo, melhoriaIdsDoProcesso, gargalosDoProcesso } from '@/utils/gargaloMelhorias';
import { useEtapasPorCenario } from '@/hooks/useEtapasPorCenario';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import { useClusters } from '@/hooks/useClusters';
import { NotasMetodologicasModal, NotasInfoButton } from '@/components/equipe/mapa/NotasMetodologicasModal';
import HistoricoMedicoes from '@/components/equipe/mapa/HistoricoMedicoes';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';
import {
  useProjetosLista, useProcessosLista, useResponsaveisLista,
  useSistemasLista, useGargalosLista, useMelhoriasLista, useDocumentosLista,
} from '@/hooks/useDominioListas';
import { useSnapshotsLatest, fetchSnapshotsLatest, SNAPSHOTS_LATEST_QUERY_KEY } from '@/hooks/useSnapshots';
import { useQueryClient } from '@tanstack/react-query';
import { buildRoiCsv, triggerCsvDownload } from '@/lib/roiCsv';
import Modal from '@/components/equipe/mapa/Modal';
import type { SecaoImagem } from '@/lib/roiVisualExport';
import TourTrigger from '@/components/equipe/mapa/tour/TourTrigger';

// Dashboard ROI = 100% AO VIVO (Fase 4). Snapshot NÃO entra no consolidado —
// o cálculo ao vivo (calcularRoi) é a única fonte; processos não-calculáveis
// ficam fora (emMapeamento). Histórico/snapshot é tela separada (Fase 5).

type Aba = 'sumario' | 'mapeamento' | 'diagnostico' | 'melhorias' | 'futuro' | 'evolucao';

const STATUS_ORDEM: ProjetoStatus[] = ['Mapeamento', 'Diagnóstico', 'Melhorias', 'ROI'];
const ABA_STATUS_MIN: Record<Aba, ProjetoStatus> = {
  mapeamento: 'Mapeamento',
  diagnostico: 'Diagnóstico',
  melhorias: 'Melhorias',
  futuro: 'Melhorias',
  evolucao: 'Melhorias',
  sumario: 'Mapeamento',
};

// Filtro de maturidade (estreita o escopo por fase atingida).
type FiltroMaturidade = '' | 'mapeado' | 'diagnosticado' | 'futuro' | 'implementado';
const MATURIDADE_OPCOES: { value: FiltroMaturidade; label: string }[] = [
  { value: '', label: 'Todas as fases' },
  { value: 'mapeado', label: 'Mapeado' },
  { value: 'diagnosticado', label: 'Diagnosticado' },
  { value: 'futuro', label: 'Com cenário futuro' },
  { value: 'implementado', label: 'Implementado' },
];
const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const fmtNum = (v: number, dp = 1) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const fmtPct = (v: number) => `${fmtNum(v, 1)}%`;

const ABAS: { id: Aba; label: string; numero: string; subtitulo: string }[] = [
  { id: 'sumario', label: 'Sumário Executivo', numero: '1', subtitulo: 'A história em um olhar' },
  { id: 'mapeamento', label: 'O Mapeamento', numero: '2', subtitulo: 'Escopo analisado' },
  { id: 'diagnostico', label: 'Diagnóstico', numero: '3', subtitulo: 'Como era — dores e custos' },
  { id: 'melhorias', label: 'As Melhorias', numero: '4', subtitulo: 'Plano de ação e investment' },
  { id: 'futuro', label: 'Cenário Futuro', numero: '5', subtitulo: 'Como ficará — estado projetado' },
  { id: 'evolucao', label: 'Evolução', numero: '6', subtitulo: 'Realizado vs Potencial' },
];

// ============================================================
//  Componentes de gráfico (SVG inline, sem dependências)
// ============================================================

interface BarData { label: string; atual: number; otimizado: number; }
interface BarChartProps { data: BarData[]; modo?: 'comparacao' | 'atual' | 'otimizado'; valueFmt?: (v: number) => string; }

function BarChart({ data, modo = 'comparacao', valueFmt = fmtBRL }: BarChartProps) {
  const W = 1000;
  const H = 220;
  const padTop = 22;
  const padBottom = 44;
  const padX = 20;
  const innerW = W - padX * 2;
  const innerH = H - padTop - padBottom;

  const showAtual = modo !== 'otimizado';
  const showOtimizado = modo !== 'atual';
  const allVals = data.flatMap((d) => [showAtual ? d.atual : 0, showOtimizado ? d.otimizado : 0]);
  const max = Math.max(1, ...allVals);
  const grupos = data.length || 1;
  const grupoW = innerW / grupos;
  const barCount = (showAtual ? 1 : 0) + (showOtimizado ? 1 : 0);
  const innerPad = 20;
  const barGap = 6;
  const barW = barCount > 0 ? (grupoW - innerPad - (barCount - 1) * barGap) / barCount : grupoW;

  return (
    <div className="dashv2-chart">
      <div className="dashv2-chart-wrap" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
          {/* gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <line key={p} x1={padX} x2={W - padX} y1={padTop + innerH * p} y2={padTop + innerH * p} stroke="#e2e8f0" strokeWidth="0.8" />
          ))}
          {data.map((d, i) => {
            const xBase = padX + i * grupoW + innerPad / 2;
            let xCursor = xBase;
            const elements: React.ReactNode[] = [];
            if (showAtual) {
              const h = (innerH * (d.atual / max));
              elements.push(
                <g key="a">
                  <rect x={xCursor} y={padTop + innerH - h} width={barW} height={Math.max(h, 0.5)} fill="#94a3b8" rx="2" />
                  {d.atual > 0 && <text x={xCursor + barW / 2} y={padTop + innerH - h - 5} fontSize="10" textAnchor="middle" fill="#475569" fontWeight="600">{valueFmt(d.atual)}</text>}
                </g>
              );
              xCursor += barW + barGap;
            }
            if (showOtimizado) {
              const h = (innerH * (d.otimizado / max));
              elements.push(
                <g key="o">
                  <rect x={xCursor} y={padTop + innerH - h} width={barW} height={Math.max(h, 0.5)} fill="#0d9488" rx="2" />
                  {d.otimizado > 0 && <text x={xCursor + barW / 2} y={padTop + innerH - h - 5} fontSize="10" textAnchor="middle" fill="#0f766e" fontWeight="600">{valueFmt(d.otimizado)}</text>}
                </g>
              );
            }
            return (
              <g key={d.label}>
                {elements}
                <text x={padX + i * grupoW + grupoW / 2} y={padTop + innerH + 18} fontSize="11" textAnchor="middle" fill="#334155" fontWeight="600">{d.label}</text>
              </g>
            );
          })}
          {/* baseline */}
          <line x1={padX} x2={W - padX} y1={padTop + innerH} y2={padTop + innerH} stroke="#94a3b8" strokeWidth="1" />
        </svg>
      </div>
      {modo === 'comparacao' && (
        <div className="dashv2-legend">
          <span><i style={{ background: '#94a3b8' }} /> Como Era</span>
          <span><i style={{ background: '#0d9488' }} /> Como Ficará</span>
        </div>
      )}
    </div>
  );
}

interface HBarItem { label: string; valor: number; cor: string; }
function HBarChart({ items, valueFmt = fmtBRL }: { items: HBarItem[]; valueFmt?: (v: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.valor));
  return (
    <div className="dashv2-hbar">
      {items.map((it) => {
        const pct = Math.min(100, (it.valor / max) * 100);
        return (
          <div key={it.label} className="dashv2-hbar-row">
            <div className="dashv2-hbar-label">{it.label}</div>
            <div className="dashv2-hbar-track">
              <div className="dashv2-hbar-fill" style={{ width: `${pct}%`, background: it.cor }} />
            </div>
            <div className="dashv2-hbar-value">{valueFmt(it.valor)}</div>
          </div>
        );
      })}
    </div>
  );
}

function ProjectionChart({ meses, investment, economiaMensal }: { meses: number; investment: number; economiaMensal: number }) {
  const W = 1200;
  const H = 200;
  const padTop = 24;
  const padBottom = 30;
  const padLeft = 60;
  const padRight = 24;
  const innerW = W - padLeft - padRight;
  const innerH = H - padTop - padBottom;
  const midY = padTop + innerH / 2;

  const points: { m: number; econ: number; saldo: number }[] = [];
  for (let m = 0; m <= meses; m++) {
    const econ = m * economiaMensal;
    points.push({ m, econ, saldo: econ - investment });
  }
  const maxAbs = Math.max(investment, ...points.map((p) => Math.abs(p.saldo)), 1);
  const x = (m: number) => padLeft + (m / meses) * innerW;
  const y = (v: number) => midY - (v / maxAbs) * (innerH / 2 - 6);
  const pathEcon = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.m).toFixed(1)},${y(p.econ).toFixed(1)}`).join(' ');
  const investY = y(-investment);
  const paybackM = economiaMensal > 0 && investment > 0 ? investment / economiaMensal : null;
  const tickCount = Math.min(meses, 12);
  const ticks = Array.from({ length: tickCount + 1 }).map((_, i) => Math.round((i / tickCount) * meses));
  const hasInvest = investment > 0;
  const hasEcon = economiaMensal > 0;

  return (
    <div className="dashv2-chart">
      <div className="dashv2-chart-wrap" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="dashv2-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* break-even (eixo zero) */}
          <line x1={padLeft} x2={W - padRight} y1={midY} y2={midY} stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="4 4" />
          <text x={padLeft - 8} y={midY + 3.5} fontSize="10" fill="#94a3b8" textAnchor="end">Break-even</text>

          {/* investment — só desenha se > 0 */}
          {hasInvest && (
            <>
              <line x1={padLeft} x2={W - padRight} y1={investY} y2={investY} stroke="#b91c1c" strokeWidth="1" strokeDasharray="6 4" />
              <text x={padLeft - 8} y={investY + 3.5} fontSize="10" fill="#b91c1c" textAnchor="end">Invest.</text>
              <text x={padLeft + 8} y={investY - 5} fontSize="10" fill="#b91c1c" fontWeight="600">{fmtBRL(investment)}</text>
            </>
          )}

          {/* economia área + linha — só desenha se > 0 */}
          {hasEcon && (
            <>
              <path d={`${pathEcon} L${W - padRight},${midY} L${padLeft},${midY} Z`} fill="url(#dashv2-area)" />
              <path d={pathEcon} stroke="#0d9488" strokeWidth="2" fill="none" />
            </>
          )}

          {/* payback marker */}
          {paybackM != null && paybackM > 0 && paybackM <= meses && (
            <>
              <line x1={x(paybackM)} x2={x(paybackM)} y1={padTop} y2={padTop + innerH} stroke="#b45309" strokeWidth="1" />
              <circle cx={x(paybackM)} cy={midY} r="3.5" fill="#b45309" />
              <text x={x(paybackM) + 6} y={midY - 6} fontSize="10" fill="#b45309" fontWeight="700">Payback {fmtNum(paybackM, 0)}m</text>
            </>
          )}

          {/* eixo X */}
          <line x1={padLeft} x2={W - padRight} y1={padTop + innerH} y2={padTop + innerH} stroke="#cbd5e1" strokeWidth="0.8" />
          {ticks.map((m, i) => (
            <g key={i}>
              <line x1={x(m)} x2={x(m)} y1={padTop + innerH} y2={padTop + innerH + 3} stroke="#cbd5e1" strokeWidth="0.8" />
              <text x={x(m)} y={padTop + innerH + 14} fontSize="10" textAnchor="middle" fill="#94a3b8">{m}m</text>
            </g>
          ))}
        </svg>
      </div>
      <div className="dashv2-legend">
        <span><i style={{ background: '#b91c1c' }} /> Investimento</span>
        <span><i style={{ background: '#0d9488' }} /> Economia acumulada</span>
        <span><i style={{ background: '#b45309' }} /> Payback</span>
      </div>
    </div>
  );
}

function MiniSparkline({ points, color = '#0d9488' }: { points: number[]; color?: string }) {
  const max = Math.max(1, ...points);
  const W = 80; const H = 24;
  const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / Math.max(1, points.length - 1)) * W},${H - (v / max) * H}`).join(' ');
  return <svg viewBox={`0 0 ${W} ${H}`} className="dashv2-spark" preserveAspectRatio="none"><path d={path} stroke={color} strokeWidth="1.5" fill="none" /></svg>;
}

// ============================================================
//  Maturidade & Evolução (Realizado vs Potencial)
// ============================================================

type NivelAlerta = 'ok' | 'warn' | 'crit';
const alertaDePct = (pct: number): NivelAlerta => (pct >= 67 ? 'ok' : pct >= 34 ? 'warn' : 'crit');
const ALERTA_GLYPH: Record<NivelAlerta, string> = { ok: '🟢', warn: '🟡', crit: '🔴' };

function AlertChip({ pct }: { pct: number }) {
  const n = alertaDePct(pct);
  return <span className={`dashv2-alert-chip ${n}`} aria-label={`${pct}%`}>{ALERTA_GLYPH[n]}</span>;
}

// Texto-narrativa acima/abaixo de um gráfico ("insight callout").
function InsightCallout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashv2-callout">
      <span className="dashv2-callout-icon" aria-hidden>💡</span>
      <p>{children}</p>
    </div>
  );
}

// Heatmap de maturidade: linhas = processos, colunas = fases. CSS-grid (não SVG)
// para exportar limpo. Célula ✓ (fase concluída) ou ∅ (pendente).
const HEATMAP_COLS: { key: 'isMapeado' | 'temDiagnostico' | 'temCenarioFuturo' | 'temInvestimento' | 'implementado'; label: string }[] = [
  { key: 'isMapeado', label: 'Mapeado' },
  { key: 'temDiagnostico', label: 'Diagnóstico' },
  { key: 'temCenarioFuturo', label: 'Cenário Futuro' },
  { key: 'temInvestimento', label: 'Investimento' },
  { key: 'implementado', label: 'Implementado' },
];
function MaturityHeatmap({ processos }: { processos: RoiProcesso[] }) {
  if (processos.length === 0) {
    return <p className="dashv2-empty-row" style={{ padding: 16 }}>Sem processos no escopo.</p>;
  }
  return (
    <div className="dashv2-heatmap" role="table" aria-label="Maturidade por processo">
      <div className="dashv2-heatmap-row dashv2-heatmap-head" role="row">
        <div className="dashv2-heatmap-proc" role="columnheader">Processo</div>
        {HEATMAP_COLS.map(c => <div key={c.key} className="dashv2-heatmap-cell" role="columnheader">{c.label}</div>)}
      </div>
      {processos.map(p => (
        <div key={p.processoId} className="dashv2-heatmap-row" role="row">
          <div className="dashv2-heatmap-proc" role="cell" title={p.processoNome}>{p.processoNome}</div>
          {HEATMAP_COLS.map(c => {
            const on = !!p.maturidade[c.key];
            return (
              <div key={c.key} className={`dashv2-heatmap-cell ${on ? 'on' : 'off'}`} role="cell" aria-label={`${c.label}: ${on ? 'sim' : 'não'}`}>
                {on ? '✓' : '∅'}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// Waterfall: ponte do custo atual ao custo futuro, separando a economia já
// realizada (melhorias concluídas) do potencial restante.
function WaterfallChart({ custoAtual, economiaRealizada, economiaProjetada, custoFuturo }: {
  custoAtual: number; economiaRealizada: number; economiaProjetada: number; custoFuturo: number;
}) {
  const W = 1000, H = 240, padTop = 26, padBottom = 52, padX = 30;
  const innerH = H - padTop - padBottom;
  const innerW = W - padX * 2;
  const max = Math.max(custoAtual, 1);
  const y = (val: number) => padTop + innerH * (1 - val / max);
  const slot = innerW / 4;
  const barW = slot * 0.5;
  const cols = [
    { label: 'Custo atual', base: 0, top: custoAtual, cor: '#1e3a8a', val: custoAtual },
    { label: '− Realizada', base: custoAtual - economiaRealizada, top: custoAtual, cor: '#0d9488', val: economiaRealizada },
    { label: '− Potencial', base: custoFuturo, top: custoAtual - economiaRealizada, cor: '#5eead4', val: economiaProjetada },
    { label: 'Custo futuro', base: 0, top: custoFuturo, cor: '#475569', val: custoFuturo },
  ];
  return (
    <div className="dashv2-chart">
      <div className="dashv2-chart-wrap" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
          {[0, 0.25, 0.5, 0.75, 1].map(p => (
            <line key={p} x1={padX} x2={W - padX} y1={padTop + innerH * p} y2={padTop + innerH * p} stroke="#e2e8f0" strokeWidth="0.8" />
          ))}
          {cols.map((c, i) => {
            const x = padX + i * slot + (slot - barW) / 2;
            const yt = y(c.top);
            const h = Math.max(2, y(c.base) - yt);
            const prev = cols[i - 1];
            return (
              <g key={c.label}>
                {i > 0 && (
                  <line x1={padX + (i - 1) * slot + (slot + barW) / 2} x2={x} y1={y(prev.base)} y2={y(prev.base)} stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="3 3" />
                )}
                <rect x={x} y={yt} width={barW} height={h} fill={c.cor} rx="2" />
                <text x={x + barW / 2} y={yt - 6} fontSize="11" textAnchor="middle" fill="#334155" fontWeight="700">{fmtBRL(c.val)}</text>
                <text x={x + barW / 2} y={padTop + innerH + 18} fontSize="11" textAnchor="middle" fill="#334155" fontWeight="600">{c.label}</text>
              </g>
            );
          })}
          <line x1={padX} x2={W - padX} y1={padTop + innerH} y2={padTop + innerH} stroke="#94a3b8" strokeWidth="1" />
        </svg>
      </div>
      <div className="dashv2-legend">
        <span><i style={{ background: '#0d9488' }} /> Economia realizada</span>
        <span><i style={{ background: '#5eead4' }} /> Potencial restante</span>
      </div>
    </div>
  );
}

// Bullet: barra = realizado, marcador = meta (potencial total).
function BulletChart({ realizado, meta }: { realizado: number; meta: number }) {
  const max = Math.max(meta, realizado, 1);
  const pct = Math.min(100, (realizado / max) * 100);
  const metaPct = Math.min(100, (meta / max) * 100);
  return (
    <div className="dashv2-bullet">
      <div className="dashv2-bullet-track">
        <div className="dashv2-bullet-fill" style={{ width: `${pct}%` }} />
        <div className="dashv2-bullet-meta" style={{ left: `${metaPct}%` }} title={`Meta ${fmtBRL(meta)}`} />
      </div>
      <div className="dashv2-bullet-labels">
        <span><i style={{ background: '#0d9488' }} /> Realizado {fmtBRL(realizado)}</span>
        <span>Meta {fmtBRL(meta)}</span>
      </div>
    </div>
  );
}

// Funil de status das melhorias (Backlog → Não iniciado → Em progresso → Concluído).
function FunnelChart({ items }: { items: { label: string; valor: number; cor: string }[] }) {
  const max = Math.max(1, ...items.map(i => i.valor));
  return (
    <div className="dashv2-funnel">
      {items.map(it => {
        const pct = it.valor > 0 ? Math.max(8, (it.valor / max) * 100) : 0;
        return (
          <div key={it.label} className="dashv2-funnel-row">
            <span className="dashv2-funnel-label">{it.label}</span>
            <div className="dashv2-funnel-track">
              <div className="dashv2-funnel-bar" style={{ width: `${pct}%`, background: it.cor }} />
            </div>
            <span className="dashv2-funnel-val">{it.valor}</span>
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
//  Cards utilitários
// ============================================================

type KPIVariant = 'default' | 'highlight' | 'warning';
interface KPICardProps { label: string; valor: string; variacao?: string; positivo?: boolean; hint?: string; spark?: number[]; size?: 'sm' | 'md' | 'lg'; tooltip?: string; variant?: KPIVariant; }
function KPICard({ label, valor, variacao, positivo, hint, spark, size = 'md', tooltip, variant = 'default' }: KPICardProps) {
  const variantClass = variant === 'highlight' ? ' highlight' : variant === 'warning' ? ' warning' : '';
  return (
    <div className={`dashv2-kpi dashv2-kpi-${size}${variantClass}`}>
      <div className="dashv2-kpi-label">{tooltip ? <Tooltip text={tooltip}>{label}</Tooltip> : label}</div>
      <div className="dashv2-kpi-valor">{valor}</div>
      {variacao && <div className={`dashv2-kpi-var${positivo ? ' positivo' : positivo === false ? ' negativo' : ''}`}>{variacao}</div>}
      {hint && <div className="dashv2-kpi-hint">{hint}</div>}
      {spark && <MiniSparkline points={spark} />}
    </div>
  );
}

function StatChip({ label, valor, variant = 'default' }: { label: string; valor: string | number; variant?: KPIVariant }) {
  const variantClass = variant === 'highlight' ? ' highlight' : variant === 'warning' ? ' warning' : '';
  return (
    <div className={`dashv2-stat-chip${variantClass}`}>
      <div className="dashv2-stat-valor">{valor}</div>
      <div className="dashv2-stat-label">{label}</div>
    </div>
  );
}

function StorySection({ numero, titulo, intro, children }: { numero: string; titulo: string; intro: string; children: React.ReactNode }) {
  return (
    <section className="dashv2-story">
      <div className="dashv2-story-header">
        <div className="dashv2-story-num">{numero}</div>
        <div>
          <h2>{titulo}</h2>
          <p>{intro}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

interface EmptyRowProps { cols: number; msg?: string; }
function EmptyRow({ cols, msg = 'Sem dados — preencha o cadastro para visualizar.' }: EmptyRowProps) {
  return <tr><td colSpan={cols} className="dashv2-empty-row">{msg}</td></tr>;
}

// ============================================================
//  Página
// ============================================================

export default function DashboardRoiPage() {
  const [aba, setAba] = useState<Aba>('sumario');
  // ── Listas via hooks (Hook-First) ──────────────────────────────────────
  const { data: projetos = [] } = useProjetosLista();
  const { data: processos = [] } = useProcessosLista();
  const { data: responsaveis = [] } = useResponsaveisLista();
  const { data: sistemas = [] } = useSistemasLista();
  const { data: gargalos = [] } = useGargalosLista();
  const { data: melhorias = [] } = useMelhoriasLista();
  const { data: documentos = [] } = useDocumentosLista();
  const { data: snapshotsLatest = [] } = useSnapshotsLatest();
  const queryClient = useQueryClient();
  // Etapas por cenário (modelo por-cenário). `etapas` = AS-IS (era); `etapasFuturoTodas` = TO-BE.
  const { asis: etapas, tobe: etapasFuturoTodas } = useEtapasPorCenario();

  // Cluster vem do seletor global no header.
  const { cluster: filtroCluster } = useClusterGlobal();
  const { data: clusters = [] } = useClusters();
  const [filtroProjeto, setFiltroProjeto] = useState<string>('');
  const [filtroProcesso, setFiltroProcesso] = useState<string>('');
  const [filtroMaturidade, setFiltroMaturidade] = useState<FiltroMaturidade>('');
  const [horizonte, setHorizonte] = useState<12 | 24 | 36>(24);
  const [exportando, setExportando] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const captureRef = useRef<HTMLDivElement>(null);
  const [notasOpen, setNotasOpen] = useState(false);

  // Sem auto-seleção: o padrão é "Todos os projetos" (filtroProjeto vazio),
  // que o dashboard já sabe agregar. O usuário escolhe um projeto no filtro.

  const projetoAtivo = projetos.find((p) => p.id === filtroProjeto);
  // No modo "Todos os projetos", o título vira uma visão geral nomeada pelo
  // cluster ativo (filtroCluster = UUID; '' = todos os clusters).
  const clusterNome = clusters.find((c) => c.id === filtroCluster)?.nome;
  const tituloProjeto =
    projetoAtivo?.name
    || (filtroCluster && clusterNome
          ? `Visão Geral — ${clusterNome}`
          : 'Visão Geral — Todos os projetos');
  const projetoStatus: ProjetoStatus = projetoAtivo?.status || 'Mapeamento';
  const statusIdx = STATUS_ORDEM.indexOf(projetoStatus);

  // Cluster do projeto → usado para filtrar projetos/processos por cluster.
  // filtroCluster vem do seletor global no header (value = cluster_id UUID),
  // então o mapa precisa ser projeto.id → cluster_id (não clusterName).
  const clusterIdPorProjetoId = useMemo(
    () => new Map(projetos.map(p => [p.id, p.cluster_id || ''])),
    [projetos],
  );
  const projetosDoCluster = useMemo(
    () => (filtroCluster ? projetos.filter(p => (p.cluster_id || '') === filtroCluster) : projetos),
    [projetos, filtroCluster],
  );

  // Escopo filtrado
  const processosFiltrados = useMemo(() => {
    let arr = processos;
    if (filtroCluster) arr = arr.filter(p => p.project_id && clusterIdPorProjetoId.get(p.project_id) === filtroCluster);
    if (filtroProjeto) arr = arr.filter(p => p.project_id === filtroProjeto);
    if (filtroProcesso) arr = arr.filter(p => p.id === filtroProcesso);
    if (filtroMaturidade) {
      arr = arr.filter(p => {
        const ets = etapas.filter(e => e.process_id === p.id);
        switch (filtroMaturidade) {
          case 'mapeado': return ets.length > 0 && execucoesAnuais(p) > 0;
          case 'diagnosticado': return gargalosDoProcesso(gargalos, p.id).length > 0 || ets.some(e => (e.error_rate ?? 0) > 0 || (e.rework_rate ?? 0) > 0);
          case 'futuro': return ets.some(e => e.ficou != null) || etapasFuturoTodas.some(e => e.process_id === p.id);
          case 'implementado': return statusEconomiaProcesso(p, melhorias) === 'realizado';
          default: return true;
        }
      });
    }
    return arr;
  }, [processos, filtroCluster, filtroProjeto, filtroProcesso, filtroMaturidade, clusterIdPorProjetoId, etapas, etapasFuturoTodas, gargalos, melhorias]);

  const etapasFiltradas = useMemo(() => {
    const idsProc = new Set(processosFiltrados.map(p => p.id));
    return etapas.filter(e => idsProc.has(e.process_id));
  }, [etapas, processosFiltrados]);

  const etapasFuturoFiltradas = useMemo(() => {
    const idsProc = new Set(processosFiltrados.map(p => p.id));
    return etapasFuturoTodas.filter(e => idsProc.has(e.process_id));
  }, [etapasFuturoTodas, processosFiltrados]);

  const gargalosFiltrados = useMemo(() => {
    const idsProc = new Set(processosFiltrados.map(p => p.id));
    return gargalos.filter(g => processoIdsDoGargalo(g).some(pid => idsProc.has(pid)));
  }, [gargalos, processosFiltrados]);

  // Última mensuração de cada processo no escopo filtrado.
  const latestDoEscopo = useMemo(() => {
    const idsProc = new Set(processosFiltrados.map(p => p.id));
    return snapshotsLatest.filter(s => idsProc.has(s.process_id));
  }, [snapshotsLatest, processosFiltrados]);

  // Agregado de ROI: cálculo AO VIVO (calcularRoi) preenche o BREAKDOWN
  // (porProcesso, custosCategoria, taxaRetrabalho, investimentoBreakdown). Os
  // TOTAIS (annual_cost/savings/investment/hours) vêm dos snapshots quando
  // existem (refletem o ROI consolidado já validado) — senão, vêm do cálculo.
  // Filtros de cluster aplicados aos catálogos (melhorias/sistemas/documentos)
  // para não vazar entidades de outros clusters quando filtroCluster está setado.
  // job_roles (responsáveis) é catálogo GLOBAL — fica sem filtro de cluster.
  const melhoriasDoEscopo = useMemo(
    () => (filtroCluster ? melhorias.filter(m => (m.cluster_id || '') === filtroCluster) : melhorias),
    [melhorias, filtroCluster],
  );
  const sistemasDoEscopo = useMemo(
    () => (filtroCluster ? sistemas.filter(s => ((s as unknown as { cluster_id?: string }).cluster_id || '') === filtroCluster) : sistemas),
    [sistemas, filtroCluster],
  );
  const documentosDoEscopo = useMemo(
    () => (filtroCluster ? documentos.filter(d => ((d as unknown as { cluster_id?: string }).cluster_id || '') === filtroCluster) : documentos),
    [documentos, filtroCluster],
  );

  const v: RoiAgregado & { qtdProjetos: number; qtdProcessos: number; qtdEtapas: number; qtdGargalos: number; qtdMelhorias: number; qtdSistemas: number; qtdSistemasNovos: number; qtdSistemasAposMelhorias: number; qtdDocumentos: number; qtdResponsaveis: number } = useMemo(() => {
    const calculo = calcularRoi({
      processos: processosFiltrados,
      etapas: etapasFiltradas,
      etapasFuturo: etapasFuturoFiltradas,
      responsaveis,
      sistemas: sistemasDoEscopo,
      gargalos: gargalosFiltrados,
      melhorias: melhoriasDoEscopo,
      projetos,
    });
    const agregado = calculo; // 100% ao vivo — sem overlay de snapshot
    // Sistemas novos (internos/Digital) só existem no "Como Ficou" — são os
    // referenciados pelas melhorias do escopo. Não contam no escopo atual (AS-IS).
    const novosSisIds = new Set(melhoriasDoEscopo.flatMap(m => m.sistemas || []));
    const ehNovo = (s: Sistema) => novosSisIds.has(s.id) || novosSisIds.has(s.nome);
    const sistemasAtuais = sistemasDoEscopo.filter(s => !ehNovo(s));
    return {
      ...agregado,
      qtdProjetos: filtroProjeto ? 1 : projetosDoCluster.length,
      qtdProcessos: processosFiltrados.length,
      qtdEtapas: etapasFiltradas.length,
      qtdGargalos: gargalosFiltrados.length,
      qtdMelhorias: melhoriasDoEscopo.length,
      qtdSistemas: sistemasAtuais.length,
      qtdSistemasNovos: novosSisIds.size,
      qtdSistemasAposMelhorias: sistemasAtuais.length + novosSisIds.size,
      qtdDocumentos: documentosDoEscopo.length,
      qtdResponsaveis: responsaveis.length,
    };
  }, [filtroProjeto, projetosDoCluster.length, processosFiltrados, etapasFiltradas, etapasFuturoFiltradas, gargalosFiltrados, melhoriasDoEscopo, sistemasDoEscopo, documentosDoEscopo.length, responsaveis, projetos]);

  // Métricas dependentes do horizonte de análise selecionado (12/24/36 meses).
  // Os campos *Ano em `v` são sempre anuais; multiplicamos por `horizonteFator`
  // para mostrar custos/horas acumulados no horizonte escolhido. O sufixo de
  // período (`/ Ano`, `/ 24m`, `/ 36m`) é interpolado nos labels dos KPIs e
  // colunas que dependem do horizonte.
  const horizonteFator = horizonte / 12;
  const periodoSufixo = horizonte === 12 ? '/ Ano' : `/ ${horizonte}m`;
  const periodoSlash = horizonte === 12 ? '/ ano' : `/ ${horizonte}m`;
  const economiaHorizonte = v.economiaMensal * horizonte;
  const resultadoLiquidoHorizonte = economiaHorizonte - v.investimentoTotal;
  // Guarda de honestidade: sem investimento informado, ROI/payback não têm
  // sentido — mostramos "em construção" em vez de um número enganoso. O CÁLCULO
  // usa o mesmo gate do display (evita dividir por investimento ~0 e mostrar %).
  const roiDisp = roiDisponivel(v.investimentoTotal);
  const roiHorizonte = roiDisp ? (economiaHorizonte / v.investimentoTotal) * 100 : 0;
  const roiHorizonteTxt = roiDisp ? fmtPct(roiHorizonte) : 'em construção';
  const paybackTxt = v.paybackMeses == null ? 'em construção' : `${fmtNum(v.paybackMeses, 0)} meses`;

  const limparFiltros = () => {
    setFiltroProjeto('');
    setFiltroProcesso('');
    setFiltroMaturidade('');
  };

  // Ao trocar o cluster global, zera projeto/processo se saírem do escopo do cluster.
  const clusterAnterior = useRef(filtroCluster);
  useEffect(() => {
    if (clusterAnterior.current === filtroCluster) return;
    clusterAnterior.current = filtroCluster;
    if (filtroCluster && filtroProjeto && clusterIdPorProjetoId.get(filtroProjeto) !== filtroCluster) {
      setFiltroProjeto('');
    }
    setFiltroProcesso('');
  }, [filtroCluster, filtroProjeto, clusterIdPorProjetoId]);

  const handleExportCsv = async () => {
    setExportando(true);
    try {
      // Refetch fresh dos snapshots ANTES de exportar — sem isso, alterações
      // externas no banco (migrations SQL, edições em outra aba) ficam
      // invisíveis aqui porque o QueryClient global está com
      // `refetchOnWindowFocus: false` e `staleTime: 60s`.
      const freshSnaps = await queryClient.fetchQuery({
        queryKey: SNAPSHOTS_LATEST_QUERY_KEY as unknown as readonly unknown[],
        queryFn: fetchSnapshotsLatest,
        staleTime: 0,
      });
      const csv = buildRoiCsv({
        projetos, processos,
        snapshotsLatest: freshSnaps,
        project_id: filtroProjeto || undefined,
      });
      triggerCsvDownload(csv, filtroProjeto ? `roi-${filtroProjeto}.csv` : 'roi.csv');
    } finally {
      setExportando(false);
    }
  };

  // Exporta a apresentação VISUAL (todas as abas) em HTML ou PDF: percorre as
  // ABAS, captura a div de conteúdo em cada uma e monta o arquivo; restaura a aba.
  const esperarPaint = (ms = 380) =>
    new Promise<void>((res) => requestAnimationFrame(() => window.setTimeout(res, ms)));

  const exportVisual = async (formato: 'html' | 'pdf') => {
    setExportando(true);
    const abaOriginal = aba;
    const node = captureRef.current;
    try {
      const { capturarNodePng, montarHtml, montarPdf, baixarBlob } = await import('@/lib/roiVisualExport');
      // Garante fontes carregadas (senão a captura sai com fonte fallback).
      if (document.fonts?.ready) { try { await document.fonts.ready; } catch { /* noop */ } }
      // Modo de exportação: desclampa scrolls internos p/ capturar conteúdo inteiro.
      node?.classList.add('exporting');

      const secoes: SecaoImagem[] = [];
      let warmedUp = false;
      for (const a of ABAS) {
        setAba(a.id);
        await esperarPaint();
        if (!captureRef.current) continue;
        // Warm-up: a 1ª chamada do html-to-image costuma vir incompleta
        // (embute recursos lazy). Captura uma vez e descarta na 1ª seção.
        if (!warmedUp) { try { await capturarNodePng(captureRef.current); } catch { /* noop */ } warmedUp = true; }
        const img = await capturarNodePng(captureRef.current);
        secoes.push({ label: a.label, ...img });
      }
      const base = (filtroProjeto ? `dashboard-roi-${tituloProjeto}` : 'dashboard-roi')
        .replace(/[^\w.-]+/g, '_');
      if (formato === 'html') {
        const html = montarHtml(secoes, `${tituloProjeto} — Dashboard ROI`);
        baixarBlob(new Blob([html], { type: 'text/html;charset=utf-8' }), `${base}.html`);
      } else {
        await montarPdf(secoes, `${base}.pdf`);
      }
    } finally {
      node?.classList.remove('exporting');
      setAba(abaOriginal);
      setExportando(false);
      setExportOpen(false);
    }
  };

  // Paleta corporativa sóbria (navy / teal / slate / amber). Evita variações
  // neon/playful — agro-consultoria B2B prioriza legibilidade e gravidade.
  const custosCategoria = [
    { label: 'Pessoas',    atual: v.custosCategoria.pessoas    * horizonteFator, otimizado: v.custosCategoriaFicou.pessoas    * horizonteFator, cor: '#1e3a8a' },
    { label: 'Sistemas',   atual: v.custosCategoria.sistemas   * horizonteFator, otimizado: v.custosCategoriaFicou.sistemas   * horizonteFator, cor: '#0d9488' },
    { label: 'Retrabalho', atual: v.custosCategoria.retrabalho * horizonteFator, otimizado: v.custosCategoriaFicou.retrabalho * horizonteFator, cor: '#b45309' },
    { label: 'Externo',    atual: v.custosCategoria.externo    * horizonteFator, otimizado: v.custosCategoriaFicou.externo    * horizonteFator, cor: '#475569' },
  ];

  const investimentoComposicao = [
    { label: 'Treinamento (Melhorias)', valor: v.investimentoBreakdown.treinamentoMelhorias, cor: '#0d9488' },
    { label: 'Execução de Melhorias',   valor: v.investimentoBreakdown.execucaoMelhorias,    cor: '#1e3a8a' },
    { label: 'Custo Externo',           valor: v.investimentoBreakdown.externo,              cor: '#b45309' },
  ];

  // Funil de status das melhorias do escopo (aba Evolução).
  const statusMelhoriasFunnel = useMemo(() => {
    const cont: Record<MelhoriaStatus, number> = { 'Backlog': 0, 'Não iniciado': 0, 'Em progresso': 0, 'Concluído': 0 };
    for (const m of melhoriasDoEscopo) {
      const st = (m.improvement_status as MelhoriaStatus) || 'Não iniciado';
      if (st in cont) cont[st] += 1; else cont['Não iniciado'] += 1;
    }
    return [
      { label: 'Backlog', valor: cont['Backlog'], cor: '#94a3b8' },
      { label: 'Não iniciado', valor: cont['Não iniciado'], cor: '#b45309' },
      { label: 'Em progresso', valor: cont['Em progresso'], cor: '#1e3a8a' },
      { label: 'Concluído', valor: cont['Concluído'], cor: '#0d9488' },
    ];
  }, [melhoriasDoEscopo]);
  const pctRealizado = v.economiaAnual > 0 ? Math.round((v.economiaRealizada / v.economiaAnual) * 100) : 0;

  // Navegação: maturidade por aba (integra o medidor às páginas — sem banner separado).
  const matPctEscopo = (n: number) => (v.maturidade.total ? Math.round((n / v.maturidade.total) * 100) : 0);
  const matPorAba: Partial<Record<Aba, number>> = {
    mapeamento: matPctEscopo(v.maturidade.mapeados),
    diagnostico: matPctEscopo(v.maturidade.comDiagnostico),
    futuro: matPctEscopo(v.maturidade.comCenarioFuturo),
    evolucao: matPctEscopo(v.maturidade.implementados),
  };
  // "Maiores" do escopo — alimentam os insights automáticos de cada aba.
  const topCustoProc = [...v.porProcesso].sort((a, b) => b.custoAnual - a.custoAnual)[0];
  const topHorasProc = [...v.porProcesso].sort((a, b) => b.horasAnual - a.horasAnual)[0];
  const topCategoria = [...custosCategoria].sort((a, b) => b.atual - a.atual)[0];
  const gargaloTop = [...gargalosFiltrados].sort((a, b) => processoIdsDoGargalo(b).length - processoIdsDoGargalo(a).length)[0];
  // Valor "puro" (sem unidade) — a unidade (R$ / h) vai no TÍTULO do gráfico.
  const fmtPlain = (x: number) => x.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

  // Diff helper
  const delta = (atual: number, ficou: number) => atual - ficou;
  const deltaPct = (atual: number, ficou: number) => atual > 0 ? ((atual - ficou) / atual) * 100 : 0;

  // Gargalos por origem (para visualização)
  const gargalosPorOrigem = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of gargalosFiltrados) {
      const k = g.origem || 'Outros';
      m.set(k, (m.get(k) || 0) + 1);
    }
    return Array.from(m.entries()).map(([label, valor]) => ({
      label, valor,
      cor: label === 'Cliente' ? '#1e3a8a' :
           label === 'Interno' || label === 'Processo' ? '#0d9488' :
           label === 'Externo' ? '#b45309' :
           label === 'Sistema' ? '#475569' :
           label === 'Pessoas' ? '#047857' : '#94a3b8',
    }));
  }, [gargalosFiltrados]);

  // Top etapas por horas (filtradas)
  const topEtapas = useMemo(() => {
    return [...etapasFiltradas]
      .map(e => {
        const horas = (e.executadoPor || []).reduce((s, r) => s + (r.horas || 0), 0);
        const custoMedio = responsaveis.length ? responsaveis.reduce((s, r) => s + (r.hourly_rate || 0), 0) / responsaveis.length : 0;
        return {
          id: e.id, nome: e.name, process_id: e.process_id,
          horas, custo: horas * custoMedio,
        };
      })
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 10);
  }, [etapasFiltradas, responsaveis]);

  const procNomeById = useMemo(() => new Map(processos.map(p => [p.id, p.name])), [processos]);

  // Última atualização do escopo — usa o snapshot mais recente se houver, senão "Hoje".
  const ultimaAtualizacao = useMemo(() => {
    if (latestDoEscopo.length > 0) {
      const mais = latestDoEscopo.reduce((a, b) => a.snapshot_at > b.snapshot_at ? a : b);
      const [y, m, d] = mais.snapshot_at.slice(0, 10).split('-');
      return `${d}/${m}/${y}`;
    }
    return 'Hoje';
  }, [latestDoEscopo]);

  return (
    <div className="dashv2">
      {/* Hero — fase + título + ações */}
      <div className="dashv2-hero">
        <div className="dashv2-hero-text">
          <div className="dashv2-hero-eyebrow">
            {/* "Fase" é por projeto; no modo visão geral (todos) não há fase única. */}
            {projetoAtivo && <span className="dashv2-fase-badge">Fase: {projetoStatus}</span>}
            <span className="dashv2-hero-update">Última atualização: {ultimaAtualizacao}</span>
          </div>
          <h1>{tituloProjeto}</h1>
          <p>Esta apresentação percorre, em uma linha narrativa única, o caminho do projeto: o escopo mapeado, os gargalos diagnosticados, as melhorias propostas, o cenário futuro projetado e o retorno consolidado do investment.</p>
        </div>
        <div className="dashv2-hero-actions">
          <TourTrigger dataTour="help" />
          <NotasInfoButton onClick={() => setNotasOpen(true)} />
          <button
            className="btn-secondary"
            onClick={() => setExportOpen(true)}
            disabled={exportando}
            title="Exportar — escolha o formato (CSV, HTML ou PDF)"
            data-tour="roi-export"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {exportando ? 'Exportando…' : 'Exportar'}
          </button>
          <Link
            to={filtroProjeto ? `/equipe/digital/mapa/processos?focus=${encodeURIComponent(filtroProjeto)}` : '/equipe/digital/mapa/processos'}
            className="btn-primary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, background: '#0d9488', color: '#fff', border: '1px solid #0d9488' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar Escopo
          </Link>
        </div>
      </div>

      <NotasMetodologicasModal isOpen={notasOpen} onClose={() => setNotasOpen(false)} escopo="dashboard" />

      <Modal isOpen={exportOpen} onClose={() => setExportOpen(false)}>
        <div className="modal" style={{ maxWidth: 460, width: '100%' }}>
          <h2 style={{ margin: '0 0 4px', fontSize: '1.15rem', color: '#0f172a' }}>Exportar Dashboard ROI</h2>
          <p style={{ color: '#64748b', fontSize: '0.84rem', margin: '0 0 16px', lineHeight: 1.45 }}>
            Escolha o formato. O <strong>CSV</strong> traz os dados consolidados por processo (Ferramenta C);
            <strong> HTML</strong> e <strong>PDF</strong> capturam a apresentação visual — todas as seções, com os gráficos.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {([
              { fmt: 'csv', titulo: 'CSV', sub: 'Dados consolidados por processo', icone: <path d="M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18" /> },
              { fmt: 'html', titulo: 'HTML', sub: 'Apresentação visual (com gráficos)', icone: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></> },
              { fmt: 'pdf', titulo: 'PDF', sub: 'Apresentação visual (com gráficos)', icone: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></> },
            ] as const).map((opt) => (
              <button
                key={opt.fmt}
                type="button"
                disabled={exportando}
                onClick={() => { if (opt.fmt === 'csv') { setExportOpen(false); handleExportCsv(); } else { exportVisual(opt.fmt); } }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                  padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10,
                  background: '#fff', textAlign: 'left',
                  cursor: exportando ? 'default' : 'pointer', opacity: exportando ? 0.55 : 1,
                }}
              >
                <span style={{ display: 'inline-flex', width: 36, height: 36, flex: '0 0 36px', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: '#f1f5f9', color: '#0d9488' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{opt.icone}</svg>
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>{opt.titulo}</span>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>{opt.sub}</span>
                </span>
              </button>
            ))}
          </div>
          {exportando && (
            <p style={{ marginTop: 14, marginBottom: 0, fontSize: '0.82rem', color: '#0d9488', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="dashv2-spinner" aria-hidden style={{ width: 14, height: 14, border: '2px solid #99f6e4', borderTopColor: '#0d9488', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
              Gerando… percorrendo as seções e capturando os gráficos.
            </p>
          )}
        </div>
      </Modal>

      {/* Filtros */}
      <div className="dashv2-filters" data-tour="roi-filtros">
        <div className="dashv2-filter">
          <label><Tooltip text={dica('dashboard.filtro.projeto')}>Projeto</Tooltip></label>
          <Select
            value={filtroProjeto}
            onChange={setFiltroProjeto}
            options={[
              { value: '', label: 'Todos os projetos' },
              ...projetosDoCluster.map((p) => ({ value: p.id, label: p.name })),
            ]}
            placeholder="Selecione..."
          />
        </div>
        <div className="dashv2-filter">
          <label><Tooltip text={dica('dashboard.filtro.processo')}>Processo</Tooltip></label>
          <Select
            value={filtroProcesso}
            onChange={setFiltroProcesso}
            options={[
              { value: '', label: 'Todos os processos' },
              ...processosFiltrados.map(p => ({ value: p.id, label: p.name })),
            ]}
            placeholder="Todos os processos"
          />
        </div>
        <div className="dashv2-filter">
          <label>Fase / Maturidade</label>
          <Select
            value={filtroMaturidade}
            onChange={(val) => setFiltroMaturidade(val as FiltroMaturidade)}
            options={MATURIDADE_OPCOES}
            placeholder="Todas as fases"
          />
        </div>
        <div className="dashv2-filter">
          <label><Tooltip text={dica('dashboard.filtro.horizonte')}>Horizonte</Tooltip></label>
          <div className="dashv2-segment">
            <button className={horizonte === 12 ? 'active' : ''} onClick={() => setHorizonte(12)}>12m</button>
            <button className={horizonte === 24 ? 'active' : ''} onClick={() => setHorizonte(24)}>24m</button>
            <button className={horizonte === 36 ? 'active' : ''} onClick={() => setHorizonte(36)}>36m</button>
          </div>
        </div>
        <button className="dashv2-filter-clear" onClick={limparFiltros}>Limpar</button>
      </div>

      {/* Navegação — páginas do relatório (maturidade integrada às abas) */}
      <div className="dashv2-pagenav" data-tour="roi-stepper">
        <div className="dashv2-pagenav-head">
          <span className="dashv2-pagenav-eyebrow">Páginas do relatório · {ABAS.findIndex((x) => x.id === aba) + 1}/{ABAS.length} — clique para navegar</span>
          <span className="dashv2-pagenav-mat">Maturidade do escopo: <strong>{v.maturidade.completudePct}%</strong></span>
        </div>
        <div className="dashv2-tabs" role="tablist">
          {ABAS.map((a) => {
            const mat = matPorAba[a.id];
            // Gating só vale para um projeto específico; em "Todos" tudo é navegável.
            const fasePrevia = !projetoAtivo || STATUS_ORDEM.indexOf(ABA_STATUS_MIN[a.id]) <= statusIdx;
            return (
              <button
                key={a.id}
                role="tab"
                aria-selected={aba === a.id}
                className={`dashv2-tab${aba === a.id ? ' active' : ''}${fasePrevia ? '' : ' pendente'}`}
                onClick={() => setAba(a.id)}
                title={fasePrevia ? a.subtitulo : `${a.subtitulo} — dados completos quando o projeto chegar nesta fase`}
              >
                <span className="dashv2-tab-num">{a.numero}</span>
                <span className="dashv2-tab-text">
                  <span className="dashv2-tab-label">{a.label}</span>
                  <span className="dashv2-tab-sub">{a.subtitulo}</span>
                </span>
                {mat != null && <span className="dashv2-tab-mat"><AlertChip pct={mat} /> {mat}%</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Conteúdo */}
      <div className="dashv2-content" ref={captureRef}>
        {/* =================== SUMÁRIO EXECUTIVO =================== */}
        {aba === 'sumario' && (
          <StorySection
            numero="1"
            titulo="Sumário Executivo"
            intro="A apresentação completa em três linhas: o que mapeamos, o quanto o cenário atual custa, e qual o retorno do investment na transformação."
          >
            <div className="dashv2-kpi-grid">
              <KPICard variant="highlight" label={`Economia ${periodoSufixo}`} valor={fmtBRL(economiaHorizonte)} hint={`≈ ${fmtBRL(v.economiaMensal)} / mês`} tooltip={dica('dashboard.kpi.annual_savings')} />
              <KPICard variant="highlight" label="Retorno (ROI)" valor={roiHorizonteTxt} positivo={roiDisp ? roiHorizonte >= 0 : undefined} hint={roiDisp ? `Em ${horizonte} meses` : 'Investimento não informado'} tooltip={dica('dashboard.kpi.roi')} />
              <KPICard label={`Resultado líquido (${horizonte}m)`} valor={fmtBRL(resultadoLiquidoHorizonte)} positivo={resultadoLiquidoHorizonte >= 0} hint="Economia acum. − investment" />
              <KPICard label="Payback" valor={paybackTxt} hint="Tempo de recuperação" tooltip={dica('dashboard.kpi.payback')} />
              <KPICard label={`Horas Liberadas ${periodoSufixo}`} valor={`${fmtNum(v.horasLiberadas * horizonteFator)} h`} hint="Capacidade humana" tooltip={dica('dashboard.kpi.hours_freed')} />
            </div>

            <InsightCallout>
              {topCustoProc
                ? <>Escopo <strong>{v.maturidade.completudePct}%</strong> modelado. Maior custo operacional hoje: <strong>{topCustoProc.processoNome}</strong> — {fmtBRL(topCustoProc.custoAnual * horizonteFator)} em {horizonte}m.</>
                : <>Nenhum processo no escopo selecionado.</>}
            </InsightCallout>

            <div className="dashv2-quote">
              <div className="dashv2-quote-mark">"</div>
              <div className="dashv2-quote-body">
                {roiDisp ? (
                  <>
                    Investindo <strong>{fmtBRL(v.investimentoTotal)}</strong> no plano de melhorias, a operação passa a economizar
                    <strong> {fmtBRL(economiaHorizonte)} em {horizonte} meses</strong>, com retorno do investment em{' '}
                    <strong>{paybackTxt}</strong> — liberando <strong>{fmtNum(v.horasLiberadas * horizonteFator)} horas</strong> da equipe no período.
                  </>
                ) : (
                  <>
                    O escopo ainda está em construção: o cenário futuro e o investimento não foram totalmente informados, então
                    <strong> ROI e payback aparecem como "em construção"</strong>. O custo operacional mapeado hoje é de{' '}
                    <strong>{fmtBRL(v.custoAtualAno * horizonteFator)} em {horizonte} meses</strong> — base para o business case quando as melhorias forem desenhadas.
                  </>
                )}
              </div>
            </div>

            <div className="dashv2-section-header">
              <h3>Projeção financeira</h3>
              <span className="dashv2-section-sub">Investimento × economia acumulada ao longo dos próximos {horizonte} meses</span>
            </div>
            <div className="dashv2-card">
              <ProjectionChart meses={horizonte} investment={v.investimentoTotal} economiaMensal={v.economiaMensal} />
            </div>

          </StorySection>
        )}

        {/* =================== O MAPEAMENTO =================== */}
        {aba === 'mapeamento' && (
          <StorySection
            numero="2"
            titulo="O Mapeamento"
            intro="O ponto de partida: para entender o que pode ser melhorado, mapeamos integralmente o escopo da operação — pessoas, processos, sistemas e documentos."
          >
            <div className="dashv2-section-header">
              <h3>Tamanho do escopo</h3>
              <span className="dashv2-section-sub">O que foi catalogado</span>
            </div>
            <div className="dashv2-stat-grid">
              <StatChip label="Projetos" valor={v.qtdProjetos} />
              <StatChip label="Processos" valor={v.qtdProcessos} />
              {v.emMapeamento.length > 0 && <StatChip label="Em mapeamento" valor={v.emMapeamento.length} variant="warning" />}
              <StatChip label="Etapas" valor={v.qtdEtapas} variant="highlight" />
              <StatChip label="Responsáveis" valor={v.qtdResponsaveis} />
              <StatChip label="Documentos" valor={v.qtdDocumentos} />
              <StatChip label="Sistemas" valor={v.qtdSistemas} />
              <StatChip label="Gargalos" valor={v.qtdGargalos} variant="warning" />
            </div>

            <InsightCallout>
              {topHorasProc
                ? <>Processo de maior carga horária: <strong>{topHorasProc.processoNome}</strong> — {fmtPlain(topHorasProc.horasAnual * horizonteFator)} h em {horizonte}m. <strong>{v.maturidade.mapeados}/{v.maturidade.total}</strong> processos mapeados.</>
                : <>Sem processos no escopo.</>}
              {v.emMapeamento.length > 0 && <> {' '}<strong>{v.emMapeamento.length}</strong> processo{v.emMapeamento.length > 1 ? 's' : ''} em mapeamento (dados de ROI incompletos) {v.emMapeamento.length > 1 ? 'ficam' : 'fica'} fora do consolidado.</>}
            </InsightCallout>

            <div className="dashv2-section-header">
              <h3>Carga horária por processo (h)</h3>
              <span className="dashv2-section-sub">Horas atuais por processo — do maior para o menor</span>
            </div>
            <div className="dashv2-card">
              <HBarChart
                items={[...v.porProcesso]
                  .map((p) => ({ label: p.processoNome, valor: p.horasAnual * horizonteFator, cor: 'var(--accent-color)' }))
                  .sort((a, b) => b.valor - a.valor)}
                valueFmt={fmtPlain}
              />
            </div>

            <div className="dashv2-section-header">
              <h3>Processos mapeados</h3>
              <span className="dashv2-section-sub">Detalhamento por processo macro</span>
            </div>
            <div className="dashv2-table-wrap">
              <table className="dashv2-table">
                <thead>
                  <tr>
                    <th>Processo</th>
                    <th>Etapas</th>
                    <th>Documentos</th>
                    <th>Sistemas</th>
                    <th>Horas / Execução</th>
                    <th>{`Execuções ${periodoSufixo}`}</th>
                  </tr>
                </thead>
                <tbody>
                  {v.porProcesso.length === 0 ? <EmptyRow cols={6} /> : v.porProcesso.map(p => {
                    const ets = etapasFiltradas.filter(e => e.process_id === p.processoId);
                    const docsCount = new Set(ets.flatMap(e => [
                      ...(e.docsEntrada || []).map(d => d.documentoId || d.nome),
                      ...(e.docsSaida || []).map(d => d.documentoId || d.nome),
                    ])).size;
                    const sisCount = new Set(ets.flatMap(e => e.sistemas || [])).size;
                    return (
                      <tr key={p.processoId}>
                        <td>{p.processoNome}</td>
                        <td>{ets.length}</td>
                        <td>{docsCount}</td>
                        <td>{sisCount}</td>
                        <td>{fmtNum(p.horasPorExecucao)} h</td>
                        <td>{fmtNum(p.execucoesAnuais * horizonteFator, 0)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </StorySection>
        )}

        {/* =================== DIAGNÓSTICO =================== */}
        {aba === 'diagnostico' && (
          <StorySection
            numero="3"
            titulo="Diagnóstico — Como Era"
            intro="O custo do status quo: este é o cenário antes das melhorias. Aqui estão as dores quantificadas em horas, dinheiro e erros — base para o business case da transformação."
          >
            <div className="dashv2-section-header">
              <h3>O custo de operar hoje</h3>
              <span className="dashv2-section-sub">Visão financeira e de qualidade do estado atual</span>
            </div>
            <div className="dashv2-kpi-grid">
              <KPICard variant="highlight" label={`Custo Operacional ${periodoSufixo}`} valor={fmtBRL(v.custoAtualAno * horizonteFator)} hint={`${v.qtdProcessos} processos no escopo`} tooltip={dica('dashboard.kpi.custoAtual')} />
              <KPICard label={`Horas Alocadas ${periodoSufixo}`} valor={`${fmtNum(v.horasAtualAno * horizonteFator)} h`} hint={`${fmtNum(v.horasAtualAno / 12)} h / mês`} tooltip={dica('dashboard.kpi.horasAtual')} />
              <KPICard label={`Custo de Retrabalho ${periodoSufixo}`} valor={fmtBRL(v.custosCategoria.retrabalho * horizonteFator)} hint="Tempo perdido refazendo" tooltip={dica('dashboard.kpi.custoRetrabalho')} />
              <KPICard variant="warning" label="Retrabalho" valor={fmtPct(v.taxaRetrabalhoAtual * 100)} hint="% do tempo refazendo" tooltip={dica('dashboard.kpi.retrabalho')} />
            </div>

            <InsightCallout>
              {topCategoria && topCategoria.atual > 0
                ? <>Maior frente de custo: <strong>{topCategoria.label}</strong> — {fmtBRL(topCategoria.atual)} de {fmtBRL(v.custoAtualAno * horizonteFator)} em {horizonte}m.</>
                : <>Custo do estado atual ainda não quantificado neste escopo.</>}
            </InsightCallout>

            <div className="dashv2-section-header">
              <h3>Onde o dinheiro é gasto (R$)</h3>
              <span className="dashv2-section-sub">Composição do custo operacional atual — do maior para o menor</span>
            </div>
            <div className="dashv2-card">
              <HBarChart items={[...custosCategoria].map((c) => ({ label: c.label, valor: c.atual, cor: c.cor })).sort((a, b) => b.valor - a.valor)} valueFmt={fmtPlain} />
            </div>

            <div className="dashv2-section-header">
              <h3>Panorama dos gargalos</h3>
              <span className="dashv2-section-sub">Os pontos de fricção mapeados</span>
            </div>
            <div className="dashv2-kpi-grid">
              <KPICard variant="warning" label="Gargalos identificados" valor={fmtNum(v.qtdGargalos, 0)} hint="Total catalogado no escopo" />
              <KPICard
                label="Gargalos endereçados"
                valor={`${gargalosFiltrados.filter(g => melhoriasRelacionadasAoGargalo(g, melhorias).length > 0).length} / ${v.qtdGargalos}`}
                hint="Já têm melhoria no mesmo processo"
              />
              <KPICard
                label="Processos afetados"
                valor={fmtNum(new Set(gargalosFiltrados.flatMap(g => processoIdsDoGargalo(g))).size, 0)}
                hint="Com ao menos um gargalo"
              />
              <KPICard label="Origens distintas" valor={fmtNum(gargalosPorOrigem.length, 0)} hint="Cliente, Processo, Sistema…" />
            </div>

            <InsightCallout>
              Os gargalos são mapeados <strong>qualitativamente</strong> (origem, processos afetados e cobertura por melhorias). O custo quantitativo do estado atual vem das <strong>etapas</strong> (seção acima), que têm horas e responsáveis cadastrados.
            </InsightCallout>

            <div className="dashv2-grid2">
              <div>
                <div className="dashv2-section-header">
                  <h3>Gargalos por origem</h3>
                  <span className="dashv2-section-sub">De onde vem cada ponto de fricção</span>
                </div>
                <div className="dashv2-card">
                  {gargalosPorOrigem.length === 0
                    ? <p className="dashv2-empty-row" style={{ padding: 16 }}>Nenhum gargalo cadastrado no escopo.</p>
                    : <HBarChart items={[...gargalosPorOrigem].sort((a, b) => b.valor - a.valor)} valueFmt={(x) => `${fmtNum(x, 0)}`} />}
                </div>
              </div>
              <div>
                <div className="dashv2-section-header">
                  <h3>Gargalos por processo</h3>
                  <span className="dashv2-section-sub">Onde os pontos de fricção se concentram</span>
                </div>
                <div className="dashv2-card">
                  <HBarChart
                    items={processosFiltrados
                      .map(p => ({
                        label: p.name,
                        valor: gargalosFiltrados.filter(g => processoIdsDoGargalo(g).includes(p.id)).length,
                        cor: 'var(--accent-color)',
                      }))
                      .filter(it => it.valor > 0)
                      .sort((a, b) => b.valor - a.valor)}
                    valueFmt={(x) => `${fmtNum(x, 0)}`}
                  />
                </div>
              </div>
            </div>

            <div className="dashv2-section-header">
              <h3>Gargalos identificados</h3>
              <span className="dashv2-section-sub">Ranqueados por nº de processos afetados</span>
            </div>
            <div className="dashv2-table-wrap">
              <table className="dashv2-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Gargalo</th>
                    <th>Processos afetados</th>
                    <th>Origem</th>
                    <th>Endereçado por melhoria</th>
                  </tr>
                </thead>
                <tbody>
                  {gargalosFiltrados.length === 0 ? <EmptyRow cols={5} /> : [...gargalosFiltrados]
                    .sort((a, b) => processoIdsDoGargalo(b).length - processoIdsDoGargalo(a).length)
                    .slice(0, 12)
                    .map((g, i) => {
                      const procs = processoIdsDoGargalo(g).map(pid => procNomeById.get(pid) || pid);
                      const ms = melhoriasRelacionadasAoGargalo(g, melhorias);
                      return (
                        <tr key={g.id}>
                          <td>{i + 1}</td>
                          <td>{g.nome}</td>
                          <td>{procs.length ? procs.join(', ') : '—'}</td>
                          <td>{g.origem || '—'}</td>
                          <td>{ms.length ? ms.map(m => m.improvement_description).join('; ') : '—'}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="dashv2-section-header">
              <h3>Etapas mais críticas</h3>
              <span className="dashv2-section-sub">Top etapas por horas internas e custo</span>
            </div>
            <div className="dashv2-table-wrap">
              <table className="dashv2-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Etapa</th>
                    <th>Processo</th>
                    <th>Horas / Execução</th>
                    <th>Custo / Execução</th>
                  </tr>
                </thead>
                <tbody>
                  {topEtapas.length === 0 ? <EmptyRow cols={5} /> : topEtapas.map((e, i) => (
                    <tr key={e.id}>
                      <td>{i + 1}</td>
                      <td>{e.nome}</td>
                      <td>{procNomeById.get(e.process_id) || '—'}</td>
                      <td>{fmtNum(e.horas)} h</td>
                      <td>{fmtBRL(e.custo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </StorySection>
        )}

        {/* =================== MELHORIAS =================== */}
        {aba === 'melhorias' && (
          <StorySection
            numero="4"
            titulo="As Melhorias Propostas"
            intro="O plano de ação: cada melhoria foi desenhada para resolver um ou mais gargalos identificados no diagnóstico. Aqui está o que será implementado e quanto custa."
          >
            <div className="dashv2-section-header">
              <h3>O plano em números</h3>
              <span className="dashv2-section-sub">O investment necessário para alcançar o estado futuro</span>
            </div>
            <div className="dashv2-kpi-grid">
              <KPICard variant="highlight" label="Investimento Total" valor={fmtBRL(v.investimentoTotal)} hint="Pagamento único (CapEx)" tooltip={dica('dashboard.kpi.investment')} />
              <KPICard label="Melhorias Planejadas" valor={String(v.qtdMelhorias)} hint="Iniciativas catalogadas" />
              <KPICard
                label="Gargalos Atacados"
                valor={`${gargalosFiltrados.filter(g => melhoriasRelacionadasAoGargalo(g, melhorias).length > 0).length} / ${v.qtdGargalos}`}
                hint="Com melhoria no mesmo processo"
              />
              <KPICard
                label="Sistemas Novos"
                valor={String(v.qtdSistemasNovos)}
                hint="Internos, criados com as melhorias"
              />
              <KPICard
                label="Sistemas após melhorias"
                valor={`${v.qtdSistemas} → ${v.qtdSistemasAposMelhorias}`}
                hint="Atuais + novos sistemas internos"
              />
            </div>

            <InsightCallout>
              <><strong>{statusMelhoriasFunnel[3].valor}</strong> de <strong>{v.qtdMelhorias}</strong> melhorias concluídas · investimento total {fmtBRL(v.investimentoTotal)}{v.investimentoTotal === 0 ? ' (ainda não informado)' : ''}.</>
            </InsightCallout>

            <div className="dashv2-grid2">
              <div>
                <div className="dashv2-section-header">
                  <h3>Composição do investimento (R$)</h3>
                  <span className="dashv2-section-sub">Para onde vai cada real investido — do maior para o menor</span>
                </div>
                <div className="dashv2-card">
                  <HBarChart items={[...investimentoComposicao].sort((a, b) => b.valor - a.valor)} valueFmt={fmtPlain} />
                </div>
              </div>
              <div>
                <div className="dashv2-section-header">
                  <h3>De → Para: gargalo × melhoria</h3>
                  <span className="dashv2-section-sub">Quais melhorias resolvem cada gargalo</span>
                </div>
                <div className="dashv2-table-wrap">
                  <table className="dashv2-table">
                    <thead>
                      <tr>
                        <th>Gargalo</th>
                        <th>Melhoria(s) que resolve(m)</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {gargalosFiltrados.length === 0 ? <EmptyRow cols={3} /> : gargalosFiltrados.map(g => {
                        const ms = melhoriasRelacionadasAoGargalo(g, melhorias);
                        return (
                          <tr key={g.id}>
                            <td>{g.nome}</td>
                            <td>{ms.length ? ms.map(m => m.improvement_description).join('; ') : '—'}</td>
                            <td>{ms.length ? 'Coberto' : 'Aberto'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="dashv2-section-header">
              <h3>Melhorias catalogadas</h3>
              <span className="dashv2-section-sub">Lista completa com sistemas desenvolvidos e horas de implementação</span>
            </div>
            <div className="dashv2-table-wrap">
              <table className="dashv2-table">
                <thead>
                  <tr>
                    <th>Melhoria</th>
                    <th>Sistemas</th>
                    <th>Treinamento</th>
                    <th>Horas execução</th>
                    <th>Custo externo</th>
                    <th>Custo total</th>
                  </tr>
                </thead>
                <tbody>
                  {melhorias.length === 0 ? <EmptyRow cols={6} /> : melhorias.map(m => {
                    const sisNomes = (m.sistemas || []).map(sid => sistemas.find(s => s.id === sid)?.nome).filter(Boolean).join(', ');
                    const custoHM = responsaveis.length ? responsaveis.reduce((s, r) => s + (r.hourly_rate || 0), 0) / responsaveis.length : 0;
                    const horasExec = (m.executadoPor || []).reduce((s, r) => s + (r.horas || 0), 0);
                    const custoExec = (m.executadoPor || []).reduce((s, r) => {
                      const ch = (r.responsavelId && responsaveis.find(rr => rr.id === r.responsavelId)?.hourly_rate) || custoHM;
                      return s + (r.horas || 0) * ch;
                    }, 0);
                    const custoTotal = ((m.training_hours || 0) * custoHM) + custoExec + (m.one_time_external_cost || 0);
                    return (
                      <tr key={m.id}>
                        <td>{m.improvement_description}</td>
                        <td>{sisNomes || '—'}</td>
                        <td>{fmtNum(m.training_hours || 0)} h</td>
                        <td>{fmtNum(horasExec)} h</td>
                        <td>{fmtBRL(m.one_time_external_cost || 0)}</td>
                        <td>{fmtBRL(custoTotal)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </StorySection>
        )}

        {/* =================== CENÁRIO FUTURO =================== */}
        {aba === 'futuro' && (
          <StorySection
            numero="5"
            titulo="Cenário Futuro — Como Ficará"
            intro="O estado projetado após implementadas todas as melhorias. Este é o novo patamar de eficiência da operação."
          >
            <div className="dashv2-section-header">
              <h3>A operação otimizada</h3>
              <span className="dashv2-section-sub">Estado projetado após o plano de melhorias</span>
            </div>
            <div className="dashv2-kpi-grid">
              <KPICard variant="highlight" label={`Custo Operacional ${periodoSufixo}`} valor={fmtBRL(v.custoFuturoAno * horizonteFator)} hint={`Redução de ${fmtPct(deltaPct(v.custoAtualAno, v.custoFuturoAno))}`} tooltip={dica('dashboard.kpi.custoFuturo')} />
              <KPICard label={`Horas Alocadas ${periodoSufixo}`} valor={`${fmtNum(v.horasFuturoAno * horizonteFator)} h`} hint={`Liberadas: ${fmtNum(v.horasLiberadas * horizonteFator)} h`} tooltip={dica('dashboard.kpi.horasFuturo')} />
              <KPICard label={`Custo de Retrabalho ${periodoSufixo}`} valor={fmtBRL(v.custosCategoriaFicou.retrabalho * horizonteFator)} hint="Retrabalho residual" tooltip={dica('dashboard.kpi.custoRetrabalho')} />
              <KPICard label="Retrabalho" valor={fmtPct(v.taxaRetrabalhoFuturo * 100)} hint="% do tempo refazendo" tooltip={dica('dashboard.kpi.retrabalho')} />
            </div>

            <InsightCallout>
              {v.custoFuturoAno < v.custoAtualAno
                ? <>Redução projetada de custo: <strong>{fmtPct(deltaPct(v.custoAtualAno, v.custoFuturoAno))}</strong> · <strong>{fmtPlain(v.horasLiberadas * horizonteFator)} h</strong> liberadas em {horizonte}m.</>
                : <>Cenário futuro ainda não desenhado neste escopo (0 etapas com "como ficará").</>}
            </InsightCallout>

            <div className="dashv2-section-header">
              <h3>Nova distribuição de custos (R$)</h3>
              <span className="dashv2-section-sub">Composição do custo otimizado — do maior para o menor</span>
            </div>
            <div className="dashv2-card">
              <HBarChart items={[...custosCategoria].map((c) => ({ label: c.label, valor: c.otimizado, cor: c.cor })).sort((a, b) => b.valor - a.valor)} valueFmt={fmtPlain} />
            </div>

            <div className="dashv2-section-header">
              <h3>Etapas no novo fluxo</h3>
              <span className="dashv2-section-sub">Visão otimizada por etapa</span>
            </div>
            <div className="dashv2-table-wrap">
              <table className="dashv2-table">
                <thead>
                  <tr>
                    <th>Etapa</th>
                    <th>Processo</th>
                    <th>Melhorias aplicadas ao processo</th>
                    <th>Horas / Execução</th>
                    <th>Custo / Execução</th>
                  </tr>
                </thead>
                <tbody>
                  {etapasFuturoFiltradas.length === 0 ? <EmptyRow cols={5} /> : etapasFuturoFiltradas.map(e => {
                    // Cenário futuro: etapas TO-BE (linhas próprias por cenário).
                    const execFut = e.executadoPor;
                    const horasFut = (execFut || []).reduce((s, r) => s + (r.horas ?? 0), 0);
                    const custoHM = responsaveis.length ? responsaveis.reduce((s, r) => s + (r.hourly_rate || 0), 0) / responsaveis.length : 0;
                    // Melhorias do processo da etapa — derivadas via gargalo.
                    const melhoriaIdsProc = melhoriaIdsDoProcesso(melhorias, e.process_id);
                    const melhoriasDoProcesso = melhorias.filter(m => melhoriaIdsProc.has(m.id));
                    const melhNomes = melhoriasDoProcesso.map(m => m.improvement_description).join(', ');
                    return (
                      <tr key={e.id}>
                        <td>{e.name}</td>
                        <td>{procNomeById.get(e.process_id) || '—'}</td>
                        <td>{melhNomes || '—'}</td>
                        <td>{fmtNum(horasFut)} h</td>
                        <td>{fmtBRL(horasFut * custoHM)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </StorySection>
        )}

        {/* =================== EVOLUÇÃO — REALIZADO vs POTENCIAL =================== */}
        {aba === 'evolucao' && (
          <StorySection
            numero="6"
            titulo="Evolução — Realizado vs Potencial"
            intro="Quanto do retorno mapeado já foi capturado (melhorias concluídas) e quanto ainda é potencial. À medida que as melhorias são implementadas, a economia migra de potencial para realizada."
          >
            <div className="dashv2-section-header">
              <h3>Retorno: realizado e potencial</h3>
              <span className="dashv2-section-sub">O que já foi capturado vs o que ainda há a destravar</span>
            </div>
            <div className="dashv2-kpi-grid">
              <KPICard variant="highlight" label="Economia Realizada / ano" valor={fmtBRL(v.economiaRealizada)} hint={`${v.maturidade.implementados}/${v.maturidade.total} processos implementados`} />
              <KPICard label="Potencial restante / ano" valor={fmtBRL(v.economiaProjetada)} hint="A capturar com as melhorias" />
              <KPICard variant="highlight" label="ROI Realizado" valor={fmtRoi(v.roiRealizado)} positivo={v.roiRealizado != null ? v.roiRealizado >= 0 : undefined} hint="Economia ÷ investimento realizado" />
              <KPICard label="Maturidade do escopo" valor={`${v.maturidade.completudePct}%`} hint="Média das fases concluídas" />
            </div>

            <InsightCallout>
              {v.economiaAnual > 0
                ? <>Das <strong>{fmtBRL(v.economiaAnual)}</strong> de economia anual possível, <strong>{fmtBRL(v.economiaRealizada)}</strong> ({pctRealizado}%) já foram capturadas; restam <strong>{fmtBRL(v.economiaProjetada)}</strong> a destravar.</>
                : <>O cenário futuro ainda não foi desenhado neste escopo — a economia aparece quando as etapas tiverem o "como ficará".</>}
            </InsightCallout>

            <div className="dashv2-section-header">
              <h3>Ponte: do custo atual ao custo futuro</h3>
              <span className="dashv2-section-sub">Economia já realizada vs potencial restante (por ano)</span>
            </div>
            <div className="dashv2-card">
              <WaterfallChart custoAtual={v.custoAtualAno} economiaRealizada={v.economiaRealizada} economiaProjetada={v.economiaProjetada} custoFuturo={v.custoFuturoAno} />
            </div>

            <div className="dashv2-section-header">
              <h3>Captura da economia</h3>
              <span className="dashv2-section-sub">Realizado vs meta (economia potencial total)</span>
            </div>
            <div className="dashv2-card">
              <BulletChart realizado={v.economiaRealizada} meta={v.economiaAnual} />
            </div>

            <div className="dashv2-section-header">
              <h3>Entrega das melhorias</h3>
              <span className="dashv2-section-sub">Status do plano de melhorias do escopo</span>
            </div>
            <div className="dashv2-card">
              <FunnelChart items={statusMelhoriasFunnel} />
            </div>

            <div className="dashv2-section-header">
              <h3>Maturidade por processo</h3>
              <span className="dashv2-section-sub">Em que fase cada processo está</span>
            </div>
            <div className="dashv2-card">
              <MaturityHeatmap processos={v.porProcesso} />
            </div>

            <div className="dashv2-section-header">
              <h3>Custos por categoria — Como Era × Como Ficará (R$)</h3>
              <span className="dashv2-section-sub">Comparação lado a lado por frente de custo</span>
            </div>
            <div className="dashv2-card">
              <BarChart data={custosCategoria.map((c) => ({ label: c.label, atual: c.atual, otimizado: c.otimizado }))} valueFmt={fmtPlain} />
            </div>

            <div className="dashv2-section-header">
              <h3>Horas e qualidade</h3>
              <span className="dashv2-section-sub">Os outros eixos do ganho</span>
            </div>
            <div className="dashv2-card">
              <BarChart
                data={[
                  { label: `Horas ${periodoSlash}`, atual: v.horasAtualAno * horizonteFator, otimizado: v.horasFuturoAno * horizonteFator },
                  { label: 'Retrabalho %', atual: v.taxaRetrabalhoAtual * 100, otimizado: v.taxaRetrabalhoFuturo * 100 },
                ]}
                valueFmt={fmtNum}
              />
            </div>

            <div className="dashv2-section-header">
              <h3>Curva do break-even</h3>
              <span className="dashv2-section-sub">Quando o investment se paga</span>
            </div>
            <div className="dashv2-card">
              <ProjectionChart meses={horizonte} investment={v.investimentoTotal} economiaMensal={v.economiaMensal} />
            </div>

            <div className="dashv2-section-header">
              <h3>Comparativo final</h3>
              <span className="dashv2-section-sub">Linha por linha do que muda</span>
            </div>
            <div className="dashv2-table-wrap">
              <table className="dashv2-table">
                <thead>
                  <tr>
                    <th>Indicador</th>
                    <th>Como Era</th>
                    <th>Como Ficará</th>
                    <th>Δ</th>
                    <th>%</th>
                  </tr>
                </thead>
                <tbody>
                  <tr><td>{`Custo ${periodoSlash}`}</td><td>{fmtBRL(v.custoAtualAno * horizonteFator)}</td><td>{fmtBRL(v.custoFuturoAno * horizonteFator)}</td><td>{fmtBRL(delta(v.custoAtualAno, v.custoFuturoAno) * horizonteFator)}</td><td>{fmtPct(deltaPct(v.custoAtualAno, v.custoFuturoAno))}</td></tr>
                  <tr><td>{`Horas ${periodoSlash}`}</td><td>{fmtNum(v.horasAtualAno * horizonteFator)} h</td><td>{fmtNum(v.horasFuturoAno * horizonteFator)} h</td><td>{fmtNum(delta(v.horasAtualAno, v.horasFuturoAno) * horizonteFator)} h</td><td>{fmtPct(deltaPct(v.horasAtualAno, v.horasFuturoAno))}</td></tr>
                  <tr><td>Retrabalho médio</td><td>{fmtPct(v.taxaRetrabalhoAtual * 100)}</td><td>{fmtPct(v.taxaRetrabalhoFuturo * 100)}</td><td>{fmtPct(delta(v.taxaRetrabalhoAtual, v.taxaRetrabalhoFuturo) * 100)}</td><td>—</td></tr>
                  <tr className="dashv2-table-total">
                    <td>Investimento</td>
                    <td colSpan={2}>{fmtBRL(v.investimentoTotal)}</td>
                    <td colSpan={2}>Pagamento único</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="dashv2-section-header">
              <h3>Histórico de medições</h3>
              <span className="dashv2-section-sub">
                {filtroProcesso ? 'Evolução das baselines de ROI salvas deste processo' : 'Selecione um processo no filtro acima para ver a evolução das medições'}
              </span>
            </div>
            <div className="dashv2-card">
              {filtroProcesso
                ? <HistoricoMedicoes processId={filtroProcesso} processoNome={procNomeById.get(filtroProcesso)} />
                : <p className="dashv2-empty-row" style={{ padding: 16 }}>Selecione um processo no filtro <strong>Processo</strong> (acima) para ver o histórico de medições dele.</p>}
            </div>

            <div className="dashv2-quote dashv2-quote-final">
              <div className="dashv2-quote-mark">★</div>
              <div className="dashv2-quote-body">
                {roiDisp ? (
                  <>Recomendação: o investimento de <strong>{fmtBRL(v.investimentoTotal)}</strong> se paga em <strong>{paybackTxt}</strong> e gera ROI de <strong>{roiHorizonteTxt}</strong> em {horizonte} meses, além de liberar <strong>{fmtNum(v.horasLiberadas * horizonteFator)} horas</strong> da equipe no período para atividades de maior valor.</>
                ) : (
                  <>Já foram realizados <strong>{fmtBRL(v.economiaRealizada)}/ano</strong> de economia ({pctRealizado}% do potencial mapeado). ROI e payback serão consolidados quando o investimento das melhorias for informado.</>
                )}
              </div>
            </div>
          </StorySection>
        )}
      </div>

      {/* Rodapé — data da última atualização + respiro no fim da página */}
      <footer
        style={{
          marginTop: 32,
          paddingTop: 16,
          paddingBottom: 48,
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: '#64748b',
        }}
      >
        Última atualização: {ultimaAtualizacao}
      </footer>
    </div>
  );
}
