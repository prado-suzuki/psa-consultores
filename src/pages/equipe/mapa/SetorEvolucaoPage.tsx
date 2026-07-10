// Fase 5.5 — Dashboard de Evolução do Setor
// Painel do portfólio: economia anual, horas liberadas, ROI médio.
//
// Os KPIs e o comparativo por processo são calculados AO VIVO via calcularRoi
// (mesma fonte do Dashboard ROI) — assim a página preenche mesmo sem snapshots.
// A curva temporal continua dependendo de snapshots (dado inerentemente
// histórico): mostra orientação quando ainda não há ≥ 2 medições.
//
// Visual: usa o design-system dashv2 (mesmo do DashboardRoiPage) — hero,
// filtros, kpi-grid, section-header, card, table-wrap.

import { useEffect, useMemo, useRef, useState } from 'react';
import Select from '@/components/equipe/mapa/Select';
import { calcularRoi, type RoiAgregado } from '@/utils/roiCalculator';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { processoIdsDoGargalo } from '@/utils/gargaloMelhorias';
import { formatarMoeda, formatDecimal } from '@/utils/format';
import { fmtRoi } from '@/utils/roiGuards';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import { NotasMetodologicasModal, NotasInfoButton } from '@/components/equipe/mapa/NotasMetodologicasModal';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';
import {
  useProjetosLista, useProcessosLista, useEtapasLista, useResponsaveisLista,
  useSistemasLista, useGargalosLista, useMelhoriasLista, useDocumentosLista,
} from '@/hooks/useDominioListas';
import { useSnapshots } from '@/hooks/useSnapshots';
import TourTrigger from '@/components/equipe/mapa/tour/TourTrigger';

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });
const fmtNum = (v: number, dp = 0) =>
  v.toLocaleString('pt-BR', { minimumFractionDigits: dp, maximumFractionDigits: dp });

// ============================================================
//  Cards / helpers visuais (espelham os do DashboardRoiPage)
// ============================================================

interface KPICardProps {
  label: string;
  valor: string;
  hint?: string;
  variacao?: string;
  positivo?: boolean;
  tooltip?: string;
}
function KPICard({ label, valor, hint, variacao, positivo, tooltip }: KPICardProps) {
  return (
    <div className="dashv2-kpi dashv2-kpi-md">
      <div className="dashv2-kpi-label">{tooltip ? <Tooltip text={tooltip}>{label}</Tooltip> : label}</div>
      <div className="dashv2-kpi-valor">{valor}</div>
      {variacao && (
        <div className={`dashv2-kpi-var${positivo ? ' positivo' : positivo === false ? ' negativo' : ''}`}>
          {variacao}
        </div>
      )}
      {hint && <div className="dashv2-kpi-hint">{hint}</div>}
    </div>
  );
}

// ============================================================
//  Página
// ============================================================

export default function SetorEvolucaoPage() {
  // ── Listas via hooks (Hook-First) ──────────────────────────────────────
  const { data: projetos = [] } = useProjetosLista();
  const { data: processos = [] } = useProcessosLista();
  const { data: rawEtapas = [] } = useEtapasLista();
  const { data: responsaveis = [] } = useResponsaveisLista();
  const { data: sistemas = [] } = useSistemasLista();
  const { data: gargalos = [] } = useGargalosLista();
  const { data: melhorias = [] } = useMelhoriasLista();
  const { data: docs = [] } = useDocumentosLista();
  const { data: snapshots = [] } = useSnapshots();
  const etapas = useMemo(
    () => enrichEtapas(rawEtapas, docs, sistemas, responsaveis),
    [rawEtapas, docs, sistemas, responsaveis],
  );

  // Cluster vem do seletor global no header.
  const { cluster: filtroCluster } = useClusterGlobal();
  const [filtroProjeto, setFiltroProjeto] = useState<string>('');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  const [notasOpen, setNotasOpen] = useState(false);

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

  // Escopo (processos do cluster + projeto selecionados, ou todos)
  const processosFiltrados = useMemo(() => {
    let arr = processos;
    if (filtroCluster) arr = arr.filter(p => p.project_id && clusterIdPorProjetoId.get(p.project_id) === filtroCluster);
    if (filtroProjeto) arr = arr.filter(p => p.project_id === filtroProjeto);
    return arr;
  }, [processos, filtroCluster, filtroProjeto, clusterIdPorProjetoId]);

  const idsProc = useMemo(() => new Set(processosFiltrados.map(p => p.id)), [processosFiltrados]);

  const etapasFiltradas = useMemo(
    () => etapas.filter(e => idsProc.has(e.process_id)),
    [etapas, idsProc],
  );
  const gargalosFiltrados = useMemo(
    () => gargalos.filter(g => processoIdsDoGargalo(g).some(pid => idsProc.has(pid))),
    [gargalos, idsProc],
  );
  // Catálogos filtrados por cluster — MESMO critério do Dashboard ROI, para os
  // dois dashboards baterem (senão o rateio de custo usa denominadores diferentes).
  const sistemasFiltrados = useMemo(
    () => (filtroCluster ? sistemas.filter(s => (s.cluster_id || '') === filtroCluster) : sistemas),
    [sistemas, filtroCluster],
  );
  const melhoriasFiltradas = useMemo(
    () => (filtroCluster ? melhorias.filter(m => (m.cluster_id || '') === filtroCluster) : melhorias),
    [melhorias, filtroCluster],
  );

  // Cálculo ao vivo — mesma fonte do Dashboard ROI.
  const roiLive: RoiAgregado = useMemo(() => calcularRoi({
    processos: processosFiltrados,
    etapas: etapasFiltradas,
    responsaveis,
    sistemas: sistemasFiltrados,
    gargalos: gargalosFiltrados,
    melhorias: melhoriasFiltradas,
    projetos,
  }), [processosFiltrados, etapasFiltradas, responsaveis, sistemasFiltrados, gargalosFiltrados, melhoriasFiltradas, projetos]);

  // Fase 4: setor/evolução também 100% AO VIVO (snapshot não entra no
  // consolidado). A curva temporal abaixo continua usando o histórico de
  // snapshots — esse é dado inerentemente histórico, não o consolidado atual.
  const roi: RoiAgregado = roiLive;

  // Comparativo por processo: Como Era × Como Ficará (live).
  const comparativoPorProcesso = useMemo(() => {
    return roi.porProcesso
      .map(p => ({
        process_id: p.processoId,
        processoNome: p.processoNome,
        execucoesAnuais: p.execucoesAnuais,
        custoEra: p.custoAnual,
        custoFicou: p.custoAnualFicou,
        deltaCusto: p.economiaAnual,
        deltaCustoPct: p.custoAnual > 0 ? (p.economiaAnual / p.custoAnual) * 100 : 0,
        deltaHoras: p.horasLiberadas,
        roi_percent: p.roiPercentual,
      }))
      .sort((a, b) => b.deltaCusto - a.deltaCusto);
  }, [roi]);

  // KPIs agregados (live)
  const horasLiberadasAcum = roi.horasLiberadas;
  const economiaAcum = roi.economiaAnual;
  const processosComMelhoria = roi.porProcesso.filter(p => p.economiaAnual > 0).length;
  const roiMedio = roi.roiPercentual;

  // Série temporal de economia acumulada por mês — depende de snapshots (histórico real).
  const snapshotsFiltrados = useMemo(() => {
    return snapshots
      .filter(s => idsProc.has(s.process_id))
      .filter(s => !dataInicio || s.snapshot_at.slice(0, 10) >= dataInicio)
      .filter(s => !dataFim || s.snapshot_at.slice(0, 10) <= dataFim);
  }, [snapshots, idsProc, dataInicio, dataFim]);

  const serieTemporal = useMemo(() => {
    const porMes = new Map<string, number>();
    const ordenados = [...snapshotsFiltrados].sort((a, b) => a.snapshot_at < b.snapshot_at ? -1 : 1);
    let acumulado = 0;
    for (const s of ordenados) {
      const mes = s.snapshot_at.slice(0, 7);
      acumulado += s.annual_savings / 12; // contribuição mensal desta medição
      porMes.set(mes, acumulado);
    }
    return Array.from(porMes.entries()).map(([mes, valor]) => ({ mes, valor }));
  }, [snapshotsFiltrados]);

  const limparFiltros = () => {
    setFiltroProjeto('');
    setDataInicio('');
    setDataFim('');
  };

  // Ao trocar o cluster global, zera o projeto se sair do escopo do cluster.
  const clusterAnterior = useRef(filtroCluster);
  useEffect(() => {
    if (clusterAnterior.current === filtroCluster) return;
    clusterAnterior.current = filtroCluster;
    if (filtroCluster && filtroProjeto && clusterIdPorProjetoId.get(filtroProjeto) !== filtroCluster) setFiltroProjeto('');
  }, [filtroCluster, filtroProjeto, clusterIdPorProjetoId]);

  const handleExportarPdf = () => {
    window.print();
  };

  return (
    <div className="dashv2">
      {/* Hero */}
      <div className="dashv2-hero">
        <div className="dashv2-hero-text">
          <div className="dashv2-hero-eyebrow">Visão consolidada · Portfólio</div>
          <h1>Evolução do Setor</h1>
          <p>
            Painel da transformação do portfólio. Os indicadores e o comparativo por processo são
            calculados ao vivo a partir do cenário mapeado (Como Era) e do cenário projetado (Como
            Ficará) — mesma base do Dashboard ROI. A curva temporal usa os snapshots criados via o
            wizard "Configurar ROI" e ganha forma à medida que novas medições são registradas.
          </p>
        </div>
        <div className="dashv2-hero-actions">
          <TourTrigger dataTour="help" />
          <NotasInfoButton onClick={() => setNotasOpen(true)} />
        </div>
      </div>

      <NotasMetodologicasModal isOpen={notasOpen} onClose={() => setNotasOpen(false)} escopo="setor" />

      {/* Filtros */}
      <div className="dashv2-filters" data-tour="setor-filtros">
        <div className="dashv2-filter">
          <label><Tooltip text={dica('setor.filtro.projeto')}>Projeto</Tooltip></label>
          <Select
            value={filtroProjeto}
            onChange={setFiltroProjeto}
            options={[{ value: '', label: 'Todos os projetos' }, ...projetosDoCluster.map(p => ({ value: p.id, label: p.name }))]}
            placeholder="Todos os projetos"
          />
        </div>
        <div className="dashv2-filter">
          <label><Tooltip text={dica('setor.filtro.periodo')}>Início</Tooltip></label>
          <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </div>
        <div className="dashv2-filter">
          <label><Tooltip text={dica('setor.filtro.periodo')}>Fim</Tooltip></label>
          <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
        </div>
        <button className="dashv2-filter-clear" onClick={limparFiltros}>Limpar</button>
        <button
          className="dashv2-filter-clear"
          onClick={handleExportarPdf}
          style={{ background: '#0d9488', color: 'white' }}
          title="Exportar relatório (usa Imprimir do navegador)"
          data-tour="setor-export"
        >
          Exportar relatório do setor
        </button>
      </div>

      {/* Conteúdo */}
      <div className="dashv2-content">
        {/* KPIs agregados */}
        <div className="dashv2-section-header">
          <h3>Indicadores consolidados</h3>
          <span className="dashv2-section-sub">Visão portfólio calculada ao vivo sobre o escopo filtrado</span>
        </div>
        <div className="dashv2-kpi-grid" data-tour="setor-kpis">
          <KPICard
            label="Horas Liberadas / ano"
            valor={`${fmtNum(horasLiberadasAcum)} h`}
            hint="Δ horas entre Como Era e Como Ficará"
            tooltip={dica('setor.kpi.hours_freed')}
          />
          <KPICard
            label="Economia Anual"
            valor={fmtBRL(economiaAcum)}
            hint={`≈ ${fmtBRL(economiaAcum / 12)} / mês`}
            tooltip={dica('setor.kpi.economiaAcum')}
          />
          <KPICard
            label="Processos com melhoria"
            valor={`${processosComMelhoria} / ${roi.porProcesso.length}`}
            hint="Economia projetada > 0"
            tooltip={dica('setor.kpi.processosMelhoria')}
          />
          <KPICard
            label="ROI do portfólio"
            valor={fmtRoi(roiMedio)}
            hint={`Investimento ${fmtBRL(roi.investimentoTotal)}`}
            tooltip={dica('setor.kpi.roiMedio')}
          />
        </div>

        {/* Série temporal */}
        <div className="dashv2-section-header">
          <h3>Economia acumulada — linha temporal</h3>
          <span className="dashv2-section-sub">Curva mês a mês a partir dos snapshots históricos</span>
        </div>
        <div className="dashv2-card">
          {serieTemporal.length < 2 ? (
            <p className="dashv2-empty-row" style={{ padding: 16 }}>
              São necessárias pelo menos 2 medições (snapshots) para desenhar a curva histórica. Use o
              wizard "Configurar ROI" no card de cada processo para registrar medições ao longo do tempo.
              Os indicadores acima já refletem o cálculo ao vivo.
            </p>
          ) : (
            <LineChart points={serieTemporal} />
          )}
        </div>

        {/* Tabela comparativa */}
        <div className="dashv2-section-header">
          <h3>Comparativo Como Era × Como Ficará</h3>
          <span className="dashv2-section-sub">Detalhamento por processo macro, ordenado pelo maior Δ de custo</span>
        </div>
        <div className="dashv2-table-wrap">
          <table className="dashv2-table">
            <thead>
              <tr>
                <th>Processo</th>
                <th>Execuções / ano</th>
                <th>Custo / ano (Como Era)</th>
                <th>Custo / ano (Como Ficará)</th>
                <th>Δ custo</th>
                <th>Δ %</th>
                <th>Δ horas</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {comparativoPorProcesso.length === 0 ? (
                <tr>
                  <td colSpan={8} className="dashv2-empty-row">
                    Nenhum processo no escopo atual. Ajuste os filtros ou cadastre processos com etapas.
                  </td>
                </tr>
              ) : comparativoPorProcesso.map(l => (
                <tr key={l.process_id}>
                  <td>{l.processoNome}</td>
                  <td>{fmtNum(l.execucoesAnuais)}</td>
                  <td>{formatarMoeda(l.custoEra)}</td>
                  <td>{formatarMoeda(l.custoFicou)}</td>
                  <td style={{ color: l.deltaCusto > 0 ? '#10b981' : l.deltaCusto < 0 ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                    {formatarMoeda(l.deltaCusto)}
                  </td>
                  <td style={{ color: l.deltaCustoPct > 0 ? '#10b981' : l.deltaCustoPct < 0 ? '#ef4444' : '#64748b', fontWeight: 600 }}>
                    {formatDecimal(l.deltaCustoPct, '%')}
                  </td>
                  <td>{formatDecimal(l.deltaHoras, ' h')}</td>
                  <td>{fmtRoi(l.roi_percent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================
//  Gráfico de linha — estilizado para casar com o dashv2-card
// ============================================================

function LineChart({ points }: { points: { mes: string; valor: number }[] }) {
  const W = 1000;
  const H = 240;
  const padL = 70;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;
  const max = Math.max(1, ...points.map(p => p.valor));
  const x = (i: number) => padL + (i / Math.max(1, points.length - 1)) * innerW;
  const y = (v: number) => padT + innerH - (v / max) * innerH;
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${x(points.length - 1).toFixed(1)},${(padT + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padT + innerH).toFixed(1)} Z`;
  const tickStep = Math.max(1, Math.ceil(points.length / 6));

  return (
    <div className="dashv2-chart">
      <div className="dashv2-chart-wrap" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="setor-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0d9488" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* gridlines */}
          {[0, 0.25, 0.5, 0.75, 1].map(p => (
            <line key={p}
              x1={padL} x2={W - padR}
              y1={padT + innerH * p} y2={padT + innerH * p}
              stroke="#e2e8f0" strokeWidth="0.8"
            />
          ))}

          {/* area + line */}
          <path d={areaPath} fill="url(#setor-area)" />
          <path d={linePath} stroke="#0d9488" strokeWidth="2" fill="none" />

          {/* pontos */}
          {points.map((p, i) => (
            <g key={p.mes}>
              <circle cx={x(i)} cy={y(p.valor)} r="3.5" fill="#fff" stroke="#0d9488" strokeWidth="1.8" />
              {(i === 0 || i === points.length - 1 || i % tickStep === 0) && (
                <text x={x(i)} y={H - 14} fontSize="10" textAnchor="middle" fill="#64748b">{p.mes}</text>
              )}
            </g>
          ))}

          {/* eixo Y labels */}
          <text x={padL - 8} y={padT + 4} fontSize="10" fill="#64748b" textAnchor="end">{fmtBRL(max)}</text>
          <text x={padL - 8} y={padT + innerH * 0.5 + 3} fontSize="10" fill="#94a3b8" textAnchor="end">{fmtBRL(max / 2)}</text>
          <text x={padL - 8} y={padT + innerH + 3} fontSize="10" fill="#64748b" textAnchor="end">R$ 0</text>

          {/* baseline */}
          <line x1={padL} x2={W - padR} y1={padT + innerH} y2={padT + innerH} stroke="#94a3b8" strokeWidth="1" />
        </svg>
      </div>
      <div className="dashv2-legend">
        <span><i style={{ background: '#0d9488' }} /> Economia acumulada</span>
      </div>
    </div>
  );
}
