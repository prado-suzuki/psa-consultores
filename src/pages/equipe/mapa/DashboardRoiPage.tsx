import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Select from '@/components/equipe/mapa/Select';
import type { ProjetoStatus, Sistema, ProcessSnapshot } from '@/types';
import type { RoiAgregado } from '@/utils/roiCalculator';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { CLUSTER_FILTRO_OPCOES } from '@/utils/clusters';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';
import {
  useProjetosLista, useProcessosLista, useEtapasLista, useResponsaveisLista,
  useSistemasLista, useGargalosLista, useMelhoriasLista, useDocumentosLista,
} from '@/hooks/useDominioListas';
import { useSnapshotsLatest } from '@/hooks/useSnapshots';
import { buildRoiCsv, triggerCsvDownload } from '@/lib/roiCsv';

// Consolida a ÚLTIMA mensuração de cada processo (MAX(snapshot_em) por processo_id)
// em um RoiAgregado. Esta é a única fonte do Dashboard de ROI — sem cálculo
// ao vivo e sem agregação por data.
function agregaUltimasMensuracoes(snaps: ProcessSnapshot[]): RoiAgregado {
  const sum = (k: keyof ProcessSnapshot) => snaps.reduce((s, x) => s + (Number(x[k]) || 0), 0);
  const custoAtualAno = sum('custoAnual');
  const economiaAnual = sum('economiaAnual');
  const investimento = sum('investimento');
  const economiaMensal = economiaAnual / 12;
  return {
    porProcesso: [],
    custoAtualAno,
    custoFuturoAno: Math.max(0, custoAtualAno - economiaAnual),
    horasAtualAno: sum('horasAnual'),
    horasFuturoAno: Math.max(0, sum('horasAnual') - sum('horasLiberadas')),
    economiaAnual,
    economiaMensal,
    horasLiberadas: sum('horasLiberadas'),
    taxaRetrabalhoAtual: 0,
    taxaRetrabalhoFuturo: 0,
    investimentoTotal: investimento,
    investimentoBreakdown: { treinamentoMelhorias: 0, sistemas: 0, execucaoMelhorias: 0, externo: investimento },
    custosCategoria: { pessoas: custoAtualAno, sistemas: 0, retrabalho: 0, externo: 0 },
    custosCategoriaFicou: { pessoas: Math.max(0, custoAtualAno - economiaAnual), sistemas: 0, retrabalho: 0, externo: 0 },
    roiPercentual: investimento > 0 ? (economiaAnual / investimento) * 100 : 0,
    paybackMeses: economiaMensal > 0 ? investimento / economiaMensal : 0,
  };
}

type Aba = 'sumario' | 'mapeamento' | 'diagnostico' | 'melhorias' | 'futuro' | 'roi';

const STATUS_ORDEM: ProjetoStatus[] = ['Mapeamento', 'Diagnóstico', 'Melhorias', 'ROI'];
const ABA_STATUS_MIN: Record<Aba, ProjetoStatus> = {
  mapeamento: 'Mapeamento',
  diagnostico: 'Diagnóstico',
  melhorias: 'Melhorias',
  futuro: 'ROI',
  roi: 'ROI',
  sumario: 'ROI',
};
const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 });
const fmtNum = (v: number, dp = 1) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: dp, maximumFractionDigits: dp });
const fmtPct = (v: number) => `${fmtNum(v, 1)}%`;

const ABAS: { id: Aba; label: string; numero: string; subtitulo: string }[] = [
  { id: 'mapeamento', label: 'O Mapeamento', numero: '1', subtitulo: 'Escopo analisado' },
  { id: 'diagnostico', label: 'Diagnóstico', numero: '2', subtitulo: 'Como era — dores e custos' },
  { id: 'melhorias', label: 'As Melhorias', numero: '3', subtitulo: 'Plano de ação e investimento' },
  { id: 'futuro', label: 'Cenário Futuro', numero: '4', subtitulo: 'Como ficará — estado projetado' },
  { id: 'roi', label: 'ROI Consolidado', numero: '5', subtitulo: 'Investimento × retorno' },
  { id: 'sumario', label: 'Sumário Executivo', numero: '6', subtitulo: 'A história em um olhar' },
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

function ProjectionChart({ meses, investimento, economiaMensal }: { meses: number; investimento: number; economiaMensal: number }) {
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
    points.push({ m, econ, saldo: econ - investimento });
  }
  const maxAbs = Math.max(investimento, ...points.map((p) => Math.abs(p.saldo)), 1);
  const x = (m: number) => padLeft + (m / meses) * innerW;
  const y = (v: number) => midY - (v / maxAbs) * (innerH / 2 - 6);
  const pathEcon = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.m).toFixed(1)},${y(p.econ).toFixed(1)}`).join(' ');
  const investY = y(-investimento);
  const paybackM = economiaMensal > 0 && investimento > 0 ? investimento / economiaMensal : null;
  const tickCount = Math.min(meses, 12);
  const ticks = Array.from({ length: tickCount + 1 }).map((_, i) => Math.round((i / tickCount) * meses));
  const hasInvest = investimento > 0;
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

          {/* investimento — só desenha se > 0 */}
          {hasInvest && (
            <>
              <line x1={padLeft} x2={W - padRight} y1={investY} y2={investY} stroke="#b91c1c" strokeWidth="1" strokeDasharray="6 4" />
              <text x={padLeft - 8} y={investY + 3.5} fontSize="10" fill="#b91c1c" textAnchor="end">Invest.</text>
              <text x={padLeft + 8} y={investY - 5} fontSize="10" fill="#b91c1c" fontWeight="600">{fmtBRL(investimento)}</text>
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
  const [aba, setAba] = useState<Aba>('mapeamento');
  // ── Listas via hooks (Hook-First) ──────────────────────────────────────
  const { data: projetos = [] } = useProjetosLista();
  const { data: processos = [] } = useProcessosLista();
  const { data: rawEtapas = [] } = useEtapasLista();
  const { data: responsaveis = [] } = useResponsaveisLista();
  const { data: sistemas = [] } = useSistemasLista();
  const { data: gargalos = [] } = useGargalosLista();
  const { data: melhorias = [] } = useMelhoriasLista();
  const { data: documentos = [] } = useDocumentosLista();
  const { data: snapshotsLatest = [] } = useSnapshotsLatest();
  const etapas = useMemo(
    () => enrichEtapas(rawEtapas, documentos, sistemas, responsaveis),
    [rawEtapas, documentos, sistemas, responsaveis],
  );

  const [filtroCluster, setFiltroCluster] = useState<string>('');
  const [filtroProjeto, setFiltroProjeto] = useState<string>('');
  const [filtroProcesso, setFiltroProcesso] = useState<string>('');
  const [horizonte, setHorizonte] = useState<12 | 24 | 36>(24);
  const [exportando, setExportando] = useState(false);

  // Quando a lista de projetos chega, seleciona o primeiro como filtro default.
  useEffect(() => {
    if (projetos.length > 0) setFiltroProjeto(prev => prev || projetos[0].id);
  }, [projetos]);

  const projetoAtivo = projetos.find((p) => p.id === filtroProjeto);
  const tituloProjeto = projetoAtivo?.nome || 'Projeto não selecionado';
  const projetoStatus: ProjetoStatus = projetoAtivo?.status || 'Mapeamento';
  const statusIdx = STATUS_ORDEM.indexOf(projetoStatus);

  // Cluster do projeto → usado para filtrar projetos/processos por cluster.
  const clusterPorProjetoId = useMemo(
    () => new Map(projetos.map(p => [p.id, p.cluster || ''])),
    [projetos],
  );
  const projetosDoCluster = useMemo(
    () => (filtroCluster ? projetos.filter(p => (p.cluster || '') === filtroCluster) : projetos),
    [projetos, filtroCluster],
  );

  // Escopo filtrado
  const processosFiltrados = useMemo(() => {
    let arr = processos;
    if (filtroCluster) arr = arr.filter(p => p.projetoId && clusterPorProjetoId.get(p.projetoId) === filtroCluster);
    if (filtroProjeto) arr = arr.filter(p => p.projetoId === filtroProjeto);
    if (filtroProcesso) arr = arr.filter(p => p.id === filtroProcesso);
    return arr;
  }, [processos, filtroCluster, filtroProjeto, filtroProcesso, clusterPorProjetoId]);

  const etapasFiltradas = useMemo(() => {
    const idsProc = new Set(processosFiltrados.map(p => p.id));
    return etapas.filter(e => idsProc.has(e.processoId));
  }, [etapas, processosFiltrados]);

  const gargalosFiltrados = useMemo(() => {
    const idsProc = new Set(processosFiltrados.map(p => p.id));
    return gargalos.filter(g => (g.processos || []).some(pid => idsProc.has(pid)));
  }, [gargalos, processosFiltrados]);

  // Última mensuração de cada processo no escopo filtrado.
  const latestDoEscopo = useMemo(() => {
    const idsProc = new Set(processosFiltrados.map(p => p.id));
    return snapshotsLatest.filter(s => idsProc.has(s.processoId));
  }, [snapshotsLatest, processosFiltrados]);

  // Agregado de ROI: sempre a SOMA das últimas mensurações por processo.
  // O Dashboard nunca recalcula em memória — depende exclusivamente do que foi
  // registrado em process_snapshots (MAX(snapshot_em) por processo).
  const v: RoiAgregado & { qtdProjetos: number; qtdProcessos: number; qtdEtapas: number; qtdGargalos: number; qtdMelhorias: number; qtdSistemas: number; qtdSistemasNovos: number; qtdSistemasAposMelhorias: number; qtdDocumentos: number; qtdResponsaveis: number } = useMemo(() => {
    const agregado = agregaUltimasMensuracoes(latestDoEscopo);
    // Sistemas novos (internos/Digital) só existem no "Como Ficou" — são os
    // referenciados pelas melhorias. Não contam no escopo atual (AS-IS).
    const novosSisIds = new Set(melhorias.flatMap(m => m.sistemas || []));
    const ehNovo = (s: Sistema) => novosSisIds.has(s.id) || novosSisIds.has(s.nome);
    const sistemasAtuais = sistemas.filter(s => !ehNovo(s));
    return {
      ...agregado,
      qtdProjetos: filtroProjeto ? 1 : projetosDoCluster.length,
      qtdProcessos: processosFiltrados.length,
      qtdEtapas: etapasFiltradas.length,
      qtdGargalos: gargalosFiltrados.length,
      qtdMelhorias: melhorias.length,
      qtdSistemas: sistemasAtuais.length,
      qtdSistemasNovos: novosSisIds.size,
      qtdSistemasAposMelhorias: sistemasAtuais.length + novosSisIds.size,
      qtdDocumentos: documentos.length,
      qtdResponsaveis: responsaveis.length,
    };
  }, [latestDoEscopo, filtroProjeto, projetosDoCluster.length, processosFiltrados.length, etapasFiltradas.length, gargalosFiltrados.length, melhorias, sistemas, documentos.length, responsaveis.length]);

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
  const roiHorizonte = v.investimentoTotal > 0 ? (economiaHorizonte / v.investimentoTotal) * 100 : 0;

  const limparFiltros = () => {
    setFiltroCluster('');
    setFiltroProjeto(projetos[0]?.id || '');
    setFiltroProcesso('');
  };

  // Ao trocar de cluster, zera projeto/processo se saírem do escopo do cluster.
  const onChangeCluster = (c: string) => {
    setFiltroCluster(c);
    if (c && filtroProjeto && clusterPorProjetoId.get(filtroProjeto) !== c) {
      setFiltroProjeto('');
    }
    setFiltroProcesso('');
  };

  const handleExportCsv = () => {
    setExportando(true);
    try {
      // Dados já estão no client via hooks — função pura monta o CSV.
      const csv = buildRoiCsv({
        projetos, processos, snapshotsLatest,
        projetoId: filtroProjeto || undefined,
      });
      triggerCsvDownload(csv, filtroProjeto ? `roi-${filtroProjeto}.csv` : 'roi.csv');
    } finally {
      setExportando(false);
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
        const custoMedio = responsaveis.length ? responsaveis.reduce((s, r) => s + (r.custoHora || 0), 0) / responsaveis.length : 0;
        return {
          id: e.id, nome: e.nome, processoId: e.processoId,
          horas, custo: horas * custoMedio,
        };
      })
      .sort((a, b) => b.horas - a.horas)
      .slice(0, 10);
  }, [etapasFiltradas, responsaveis]);

  const procNomeById = useMemo(() => new Map(processos.map(p => [p.id, p.nome])), [processos]);

  // Última atualização do escopo — usa o snapshot mais recente se houver, senão "Hoje".
  const ultimaAtualizacao = useMemo(() => {
    if (latestDoEscopo.length > 0) {
      const mais = latestDoEscopo.reduce((a, b) => a.snapshotEm > b.snapshotEm ? a : b);
      const [y, m, d] = mais.snapshotEm.slice(0, 10).split('-');
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
            <span className="dashv2-fase-badge">Fase: {projetoStatus}</span>
            <span className="dashv2-hero-update">Última atualização: {ultimaAtualizacao}</span>
          </div>
          <h1>{tituloProjeto}</h1>
          <p>Esta apresentação percorre, em uma linha narrativa única, o caminho do projeto: o escopo mapeado, os gargalos diagnosticados, as melhorias propostas, o cenário futuro projetado e o retorno consolidado do investimento.</p>
        </div>
        <div className="dashv2-hero-actions">
          <button
            className="btn-secondary"
            onClick={handleExportCsv}
            disabled={exportando}
            title="Exportar dados consolidados em CSV para a Ferramenta C (Digital Rotina)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            {exportando ? 'Exportando…' : 'Exportar'}
          </button>
          <Link
            to={filtroProjeto ? `/processos?focus=${encodeURIComponent(filtroProjeto)}` : '/processos'}
            className="btn-primary"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600, background: '#0d9488', color: '#fff', border: '1px solid #0d9488' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar Escopo
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="dashv2-filters">
        <div className="dashv2-filter">
          <label><Tooltip text={dica('comum.filtro.cluster')}>Cluster</Tooltip></label>
          <Select
            value={filtroCluster}
            onChange={onChangeCluster}
            options={CLUSTER_FILTRO_OPCOES}
          />
        </div>
        <div className="dashv2-filter">
          <label><Tooltip text={dica('dashboard.filtro.projeto')}>Projeto</Tooltip></label>
          <Select
            value={filtroProjeto}
            onChange={setFiltroProjeto}
            options={[
              { value: '', label: 'Todos os projetos' },
              ...projetosDoCluster.map((p) => ({ value: p.id, label: p.nome })),
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
              ...processosFiltrados.map(p => ({ value: p.id, label: p.nome })),
            ]}
            placeholder="Todos os processos"
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

      {/* Stepper narrativo */}
      <div className="dashv2-stepper">
        {ABAS.map((a, i) => {
          const ativaIdx = ABAS.findIndex((x) => x.id === aba);
          const fasePrevia = STATUS_ORDEM.indexOf(ABA_STATUS_MIN[a.id]) <= statusIdx;
          return (
            <button
              key={a.id}
              className={`dashv2-step${aba === a.id ? ' active' : ''}${ativaIdx > i ? ' done' : ''}${fasePrevia ? ' fase-ok' : ''}`}
              onClick={() => setAba(a.id)}
              title={fasePrevia ? `${a.subtitulo} — dados disponíveis nesta fase` : `${a.subtitulo} — dados serão preenchidos quando o projeto chegar nesta fase`}
            >
              <div className="dashv2-step-num">{a.numero}</div>
              <div className="dashv2-step-body">
                <div className="dashv2-step-label">{a.label}</div>
                <div className="dashv2-step-sub">{a.subtitulo}</div>
              </div>
              {i < ABAS.length - 1 && <div className="dashv2-step-conn" />}
            </button>
          );
        })}
      </div>

      {/* Conteúdo */}
      <div className="dashv2-content">
        {/* =================== SUMÁRIO EXECUTIVO =================== */}
        {aba === 'sumario' && (
          <StorySection
            numero="6"
            titulo="Sumário Executivo"
            intro="A apresentação completa em três linhas: o que mapeamos, o quanto o cenário atual custa, e qual o retorno do investimento na transformação."
          >
            <div className="dashv2-kpi-grid">
              <KPICard variant="highlight" label={`Economia ${periodoSufixo}`} valor={fmtBRL(economiaHorizonte)} hint={`≈ ${fmtBRL(v.economiaMensal)} / mês`} tooltip={dica('dashboard.kpi.economiaAnual')} />
              <KPICard variant="highlight" label="Retorno (ROI)" valor={fmtPct(roiHorizonte)} positivo={roiHorizonte >= 0} hint={`Em ${horizonte} meses`} tooltip={dica('dashboard.kpi.roi')} />
              <KPICard label={`Resultado líquido (${horizonte}m)`} valor={fmtBRL(resultadoLiquidoHorizonte)} positivo={resultadoLiquidoHorizonte >= 0} hint="Economia acum. − investimento" />
              <KPICard label="Payback" valor={v.paybackMeses > 0 ? `${fmtNum(v.paybackMeses, 0)} meses` : '—'} hint="Tempo de recuperação" tooltip={dica('dashboard.kpi.payback')} />
              <KPICard label={`Horas Liberadas ${periodoSufixo}`} valor={`${fmtNum(v.horasLiberadas * horizonteFator)} h`} hint="Capacidade humana" tooltip={dica('dashboard.kpi.horasLiberadas')} />
            </div>

            <div className="dashv2-quote">
              <div className="dashv2-quote-mark">"</div>
              <div className="dashv2-quote-body">
                Investindo <strong>{fmtBRL(v.investimentoTotal)}</strong> no plano de melhorias, a operação passa a economizar
                <strong> {fmtBRL(economiaHorizonte)} em {horizonte} meses</strong>, com retorno do investimento em{' '}
                <strong>{fmtNum(v.paybackMeses, 0)} meses</strong> — liberando <strong>{fmtNum(v.horasLiberadas * horizonteFator)} horas</strong> da equipe no período.
              </div>
            </div>

            <div className="dashv2-section-header">
              <h3>Projeção financeira</h3>
              <span className="dashv2-section-sub">Investimento × economia acumulada ao longo dos próximos {horizonte} meses</span>
            </div>
            <div className="dashv2-card">
              <ProjectionChart meses={horizonte} investimento={v.investimentoTotal} economiaMensal={v.economiaMensal} />
            </div>

          </StorySection>
        )}

        {/* =================== O MAPEAMENTO =================== */}
        {aba === 'mapeamento' && (
          <StorySection
            numero="1"
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
              <StatChip label="Etapas" valor={v.qtdEtapas} variant="highlight" />
              <StatChip label="Responsáveis" valor={v.qtdResponsaveis} />
              <StatChip label="Documentos" valor={v.qtdDocumentos} />
              <StatChip label="Sistemas" valor={v.qtdSistemas} />
              <StatChip label="Gargalos" valor={v.qtdGargalos} variant="warning" />
            </div>

            <div className="dashv2-section-header">
              <h3>Carga horária por processo</h3>
              <span className="dashv2-section-sub">Horas atuais mapeadas em cada processo macro</span>
            </div>
            <div className="dashv2-card">
              <HBarChart
                items={v.porProcesso.map((p) => ({ label: p.processoNome, valor: p.horasAnual * horizonteFator, cor: 'var(--accent-color)' }))}
                valueFmt={(x) => `${fmtNum(x)} h`}
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
                    const ets = etapasFiltradas.filter(e => e.processoId === p.processoId);
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
            numero="2"
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

            <div className="dashv2-section-header">
              <h3>Onde o dinheiro é gasto</h3>
              <span className="dashv2-section-sub">Composição do custo operacional atual</span>
            </div>
            <div className="dashv2-card">
              <HBarChart items={custosCategoria.map((c) => ({ label: c.label, valor: c.atual, cor: c.cor }))} />
            </div>

            <div className="dashv2-section-header">
              <h3>Panorama dos gargalos</h3>
              <span className="dashv2-section-sub">Os pontos de fricção mapeados</span>
            </div>
            <div className="dashv2-kpi-grid">
              <KPICard variant="warning" label="Gargalos identificados" valor={fmtNum(v.qtdGargalos, 0)} hint="Total catalogado" />
              <KPICard label="Impacto total" valor={`${fmtNum(gargalosFiltrados.reduce((s, g) => s + (g.horasGastas || 0), 0) * horizonte)} h`} hint={`Horas perdidas em ${horizonte} meses`} />
              <KPICard label="Custo de retrabalho" valor={fmtBRL(v.custosCategoria.retrabalho * horizonteFator)} hint={`Retrabalho em ${horizonte} meses`} />
              <KPICard
                label="Processos afetados"
                valor={fmtNum(new Set(gargalosFiltrados.flatMap(g => g.processos || [])).size, 0)}
                hint="Pelo menos um gargalo"
              />
            </div>

            <div className="dashv2-section-header">
              <h3>Gargalos por origem</h3>
              <span className="dashv2-section-sub">De onde vem cada ponto de fricção</span>
            </div>
            <div className="dashv2-card">
              {gargalosPorOrigem.length === 0
                ? <p className="dashv2-empty-row" style={{ padding: 16 }}>Nenhum gargalo cadastrado no escopo.</p>
                : <HBarChart items={gargalosPorOrigem} valueFmt={(x) => `${fmtNum(x, 0)}`} />}
            </div>

            <div className="dashv2-section-header">
              <h3>Impacto dos gargalos por processo</h3>
              <span className="dashv2-section-sub">Quantas horas cada processo perde com gargalos</span>
            </div>
            <div className="dashv2-card">
              <HBarChart
                items={processosFiltrados.map(p => ({
                  label: p.nome,
                  valor: gargalosFiltrados.filter(g => (g.processos || []).includes(p.id)).reduce((s, g) => s + (g.horasGastas || 0), 0) * horizonte,
                  cor: 'var(--accent-color)',
                }))}
                valueFmt={(x) => `${fmtNum(x)} h`}
              />
            </div>

            <div className="dashv2-section-header">
              <h3>Top gargalos identificados</h3>
              <span className="dashv2-section-sub">Ranqueados por impacto em horas</span>
            </div>
            <div className="dashv2-table-wrap">
              <table className="dashv2-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Gargalo</th>
                    <th>Processos afetados</th>
                    <th>{`Impacto (h em ${horizonte}m)`}</th>
                    <th>{`Custo estimado em ${horizonte}m`}</th>
                    <th>Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {gargalosFiltrados.length === 0 ? <EmptyRow cols={6} /> : [...gargalosFiltrados]
                    .sort((a, b) => (b.horasGastas || 0) - (a.horasGastas || 0))
                    .slice(0, 10)
                    .map((g, i) => {
                      const custoHM = responsaveis.length ? responsaveis.reduce((s, r) => s + (r.custoHora || 0), 0) / responsaveis.length : 0;
                      const procs = (g.processos || []).map(pid => procNomeById.get(pid) || pid);
                      return (
                        <tr key={g.id}>
                          <td>{i + 1}</td>
                          <td>{g.nome}</td>
                          <td>{procs.length ? procs.join(', ') : '—'}</td>
                          <td>{fmtNum((g.horasGastas || 0) * horizonte)}</td>
                          <td>{fmtBRL((g.horasGastas || 0) * horizonte * custoHM)}</td>
                          <td>{g.origem || '—'}</td>
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
                      <td>{procNomeById.get(e.processoId) || '—'}</td>
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
            numero="3"
            titulo="As Melhorias Propostas"
            intro="O plano de ação: cada melhoria foi desenhada para resolver um ou mais gargalos identificados no diagnóstico. Aqui está o que será implementado e quanto custa."
          >
            <div className="dashv2-section-header">
              <h3>O plano em números</h3>
              <span className="dashv2-section-sub">O investimento necessário para alcançar o estado futuro</span>
            </div>
            <div className="dashv2-kpi-grid">
              <KPICard variant="highlight" label="Investimento Total" valor={fmtBRL(v.investimentoTotal)} hint="Pagamento único (CapEx)" tooltip={dica('dashboard.kpi.investimento')} />
              <KPICard label="Melhorias Planejadas" valor={String(v.qtdMelhorias)} hint="Iniciativas catalogadas" />
              <KPICard
                label="Gargalos Atacados"
                valor={`${gargalos.filter(g => g.melhoriaId).length} / ${v.qtdGargalos}`}
                hint="Resolvidos pelas melhorias"
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

            <div className="dashv2-section-header">
              <h3>Composição do investimento</h3>
              <span className="dashv2-section-sub">Para onde vai cada real investido</span>
            </div>
            <div className="dashv2-card">
              <HBarChart items={investimentoComposicao} />
            </div>

            <div className="dashv2-section-header">
              <h3>De → Para: gargalo × melhoria</h3>
              <span className="dashv2-section-sub">Mapa de impacto direto</span>
            </div>
            <div className="dashv2-table-wrap">
              <table className="dashv2-table">
                <thead>
                  <tr>
                    <th>Gargalo</th>
                    <th>Processos afetados</th>
                    <th>Melhoria(s) que resolve(m)</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {gargalosFiltrados.length === 0 ? <EmptyRow cols={4} /> : gargalosFiltrados.map(g => {
                    const m = g.melhoriaId ? melhorias.find(x => x.id === g.melhoriaId) : null;
                    const procs = (g.processos || []).map(pid => procNomeById.get(pid) || pid);
                    return (
                      <tr key={g.id}>
                        <td>{g.nome}</td>
                        <td>{procs.length ? procs.join(', ') : '—'}</td>
                        <td>{m ? m.nome : '—'}</td>
                        <td>{m ? 'Coberto' : 'Aberto'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
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
                    const custoHM = responsaveis.length ? responsaveis.reduce((s, r) => s + (r.custoHora || 0), 0) / responsaveis.length : 0;
                    const horasExec = (m.executadoPor || []).reduce((s, r) => s + (r.horas || 0), 0);
                    const custoExec = (m.executadoPor || []).reduce((s, r) => {
                      const ch = (r.responsavelId && responsaveis.find(rr => rr.id === r.responsavelId)?.custoHora) || custoHM;
                      return s + (r.horas || 0) * ch;
                    }, 0);
                    const custoTotal = ((m.horasTreinamento || 0) * custoHM) + custoExec + (m.custoExternoUnico || 0);
                    return (
                      <tr key={m.id}>
                        <td>{m.nome}</td>
                        <td>{sisNomes || '—'}</td>
                        <td>{fmtNum(m.horasTreinamento || 0)} h</td>
                        <td>{fmtNum(horasExec)} h</td>
                        <td>{fmtBRL(m.custoExternoUnico || 0)}</td>
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
            numero="4"
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

            <div className="dashv2-section-header">
              <h3>Nova distribuição de custos</h3>
              <span className="dashv2-section-sub">Composição do custo otimizado</span>
            </div>
            <div className="dashv2-card">
              <HBarChart items={custosCategoria.map((c) => ({ label: c.label, valor: c.otimizado, cor: c.cor }))} />
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
                  {etapasFiltradas.length === 0 ? <EmptyRow cols={5} /> : etapasFiltradas.map(e => {
                    // Cenário futuro: lê de etapa.ficou.* (espelho lateral), com fallback para era.
                    const execFut = e.ficou?.executadoPor ?? e.executadoPor;
                    const horasFut = (execFut || []).reduce((s, r) => s + (r.horas ?? 0), 0);
                    const custoHM = responsaveis.length ? responsaveis.reduce((s, r) => s + (r.custoHora || 0), 0) / responsaveis.length : 0;
                    // Melhorias aplicadas ao processo da etapa (M:N).
                    const melhoriasDoProcesso = melhorias.filter(m => (m.processos || []).includes(e.processoId));
                    const melhNomes = melhoriasDoProcesso.map(m => m.nome).join(', ');
                    return (
                      <tr key={e.id}>
                        <td>{e.nome}</td>
                        <td>{procNomeById.get(e.processoId) || '—'}</td>
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

        {/* =================== ROI CONSOLIDADO =================== */}
        {aba === 'roi' && (
          <StorySection
            numero="5"
            titulo="ROI Consolidado"
            intro="A síntese: a comparação direta entre o cenário atual e o otimizado, traduzida em retorno financeiro, payback e ganho de qualidade."
          >
            <div className="dashv2-section-header">
              <h3>Resultado do investimento</h3>
              <span className="dashv2-section-sub">Indicadores consolidados da transformação</span>
            </div>
            <div className="dashv2-kpi-grid">
              <KPICard variant="highlight" label={`Economia ${periodoSufixo}`} valor={fmtBRL(economiaHorizonte)} variacao={fmtPct(deltaPct(v.custoAtualAno, v.custoFuturoAno))} positivo={economiaHorizonte >= 0} hint="Vs. cenário atual" tooltip={dica('dashboard.kpi.economiaAnual')} />
              <KPICard variant="highlight" label="ROI" valor={fmtPct(roiHorizonte)} positivo={roiHorizonte >= 0} hint={`Em ${horizonte} meses`} tooltip={dica('dashboard.kpi.roi')} />
              <KPICard label={`Resultado líquido (${horizonte}m)`} valor={fmtBRL(resultadoLiquidoHorizonte)} positivo={resultadoLiquidoHorizonte >= 0} hint="Economia acum. − investimento" />
              <KPICard label="Payback" valor={v.paybackMeses > 0 ? `${fmtNum(v.paybackMeses, 0)} meses` : '—'} hint="Recuperação" tooltip={dica('dashboard.kpi.payback')} />
            </div>

            <div className="dashv2-section-header">
              <h3>Custos por categoria — Como Era × Como Ficará</h3>
              <span className="dashv2-section-sub">Barras agrupadas para visualizar a redução em cada frente</span>
            </div>
            <div className="dashv2-card">
              <BarChart data={custosCategoria.map((c) => ({ label: c.label, atual: c.atual, otimizado: c.otimizado }))} />
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
              <span className="dashv2-section-sub">Quando o investimento se paga</span>
            </div>
            <div className="dashv2-card">
              <ProjectionChart meses={horizonte} investimento={v.investimentoTotal} economiaMensal={v.economiaMensal} />
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

            <div className="dashv2-quote dashv2-quote-final">
              <div className="dashv2-quote-mark">★</div>
              <div className="dashv2-quote-body">
                Recomendação: o investimento de <strong>{fmtBRL(v.investimentoTotal)}</strong> se paga em
                <strong> {fmtNum(v.paybackMeses, 0)} meses</strong> e gera ROI de <strong>{fmtPct(roiHorizonte)}</strong> em {horizonte} meses,
                além de liberar <strong>{fmtNum(v.horasLiberadas * horizonteFator)} horas</strong> da equipe no período para atividades de maior valor.
              </div>
            </div>
          </StorySection>
        )}
      </div>

    </div>
  );
}
