// Página de Cascata — Visualização derivada em tempo real.
//
// Sem cadastro próprio. A cascata é o grafo de impacto jusante de um gargalo
// que aponta etapas-origem (gargalo_etapas). Esta página:
//
//   1. Lista gargalos com etapasOrigem.length > 0 (esquerda).
//   2. Ao selecionar um gargalo, deriva BFS em tempo real e renderiza um
//      diagrama vertical Mermaid TB (topo: gargalo → baixo: cascata):
//      - Topo: card do gargalo (vermelho)
//      - Camada de processos (TOTAL laranja / PARCIAL amarelo)
//      - Toggle "Macro / Granular" expande dentro de cada processo as etapas
//        afetadas (cinza) com o número de ordem.

import { useEffect, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { useGargalos } from '@/hooks/useGargalos';
import { useEtapas } from '@/hooks/useEtapas';
import { useDocumentos } from '@/hooks/useDocumentos';
import { useProcessos } from '@/hooks/useProcessos';
import { useClusterFiltroOpcoes } from '@/hooks/useClusters';
import FiltrosBar from '@/components/equipe/mapa/FiltrosBar';
import PageStats from '@/components/equipe/mapa/PageStats';
import {
  derivarCascataPorEtapas,
  type DerivacaoCascata,
  type ProcessoAfetado,
} from '@/utils/cascataDocumento';
import type { Gargalo } from '@/types';

let mermaidReady = false;
function ensureMermaid() {
  if (mermaidReady) return;
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    theme: 'base',
    themeVariables: { fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", fontSize: '13px' },
    flowchart: { htmlLabels: true, curve: 'basis', padding: 14, nodeSpacing: 36, rankSpacing: 50 },
  });
  mermaidReady = true;
}

function safeId(prefix: string, raw: string): string {
  return `${prefix}_${raw.replace(/[^A-Za-z0-9_]+/g, '_')}`;
}
function safeLabel(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\n/g, ' ');
}

type Vista = 'macro' | 'granular';

/**
 * Gera o flowchart TB com:
 *   - Nó-raiz: card do gargalo
 *   - Aresta para cada processo afetado
 *   - Em modo macro: nó por processo, cor por intensidade
 *   - Em modo granular: nó por processo (com label do processo) e sub-nós por
 *     etapa afetada (dentro de subgraph)
 */
function buildDiagram(
  gargalo: Gargalo,
  derivacao: DerivacaoCascata,
  vista: Vista,
  etapaNomeById: Map<string, string>,
  procNomeById: Map<string, string>,
  etapaOrderById: Map<string, number>,
): string {
  const lines: string[] = ['flowchart TB'];

  // Classes (cores semânticas)
  lines.push('classDef gargalo  fill:#7f1d1d,stroke:#7f1d1d,color:#fff,font-weight:bold;');
  lines.push('classDef total    fill:#fb923c,stroke:#7c2d12,color:#7c2d12,font-weight:bold;');
  lines.push('classDef parcial  fill:#fde68a,stroke:#92400e,color:#78350f;');
  lines.push('classDef etapa    fill:#f1f5f9,stroke:#64748b,color:#334155;');
  lines.push('classDef origem   fill:#fecaca,stroke:#b91c1c,color:#7f1d1d,font-weight:bold;');

  // Nó-raiz: gargalo
  const gid = safeId('G', gargalo.id);
  lines.push(`${gid}["🚨 ${safeLabel(gargalo.nome)}"]:::gargalo`);

  // Set de etapas-origem para destacar no modo granular
  const origemSet = new Set(derivacao.origemStageIds);

  if (vista === 'macro') {
    // Aresta gargalo → cada processo afetado
    for (const p of derivacao.processos) {
      const pid = safeId('P', p.processId);
      const nome = procNomeById.get(p.processId) ?? p.processId;
      const klass = p.intensidade === 'TOTAL' ? 'total' : 'parcial';
      const label = `${safeLabel(nome)}<br/><small>${p.intensidade} (${p.etapasAfetadas.length}/${p.etapasTotais})</small>`;
      lines.push(`${pid}["${label}"]:::${klass}`);
      lines.push(`${gid} --> ${pid}`);
    }
  } else {
    // Modo granular: cada processo é um subgraph com suas etapas afetadas
    for (const p of derivacao.processos) {
      const sgId = safeId('SG', p.processId);
      const nome = procNomeById.get(p.processId) ?? p.processId;
      const klass = p.intensidade === 'TOTAL' ? 'total' : 'parcial';
      const headerLabel = `${safeLabel(nome)} · ${p.intensidade} (${p.etapasAfetadas.length}/${p.etapasTotais})`;

      // Subgraph com nó-header (clicável visualmente) + etapas
      lines.push(`subgraph ${sgId}["${headerLabel}"]`);
      lines.push('  direction TB');
      const sortedEtapas = [...p.etapasAfetadas].sort(
        (a, b) => (etapaOrderById.get(a) ?? 0) - (etapaOrderById.get(b) ?? 0),
      );
      for (const sid of sortedEtapas) {
        const eid = safeId('E', sid);
        const ord = etapaOrderById.get(sid);
        const nomeE = etapaNomeById.get(sid) ?? sid;
        const ordPrefix = ord !== undefined ? `${ord}. ` : '';
        const etapaKlass = origemSet.has(sid) ? 'origem' : 'etapa';
        lines.push(`  ${eid}["${ordPrefix}${safeLabel(nomeE)}"]:::${etapaKlass}`);
      }
      lines.push('end');

      // Estiliza o subgraph pelo título — Mermaid v10 aplica via classe no header
      lines.push(`class ${sgId} ${klass}`);

      // Aresta gargalo → header do processo (subgraph)
      lines.push(`${gid} --> ${sgId}`);
    }
  }

  return lines.join('\n');
}

export default function CascataPage() {
  const { data: gargalos = [], isLoading: gLoading } = useGargalos();
  const { data: etapas = [], isLoading: eLoading } = useEtapas();
  const { data: _docs = [], isLoading: dLoading } = useDocumentos();
  const { data: processos = [], isLoading: pLoading } = useProcessos();
  const CLUSTER_OPCOES = useClusterFiltroOpcoes();

  const loaded = !gLoading && !eLoading && !dLoading && !pLoading;

  const etapaNomeById = useMemo(
    () => new Map(etapas.map((e) => [e.id, e.name])),
    [etapas],
  );
  const etapaOrderById = useMemo(
    () => new Map(etapas.map((e) => [e.id, e.stage_order ?? 0])),
    [etapas],
  );
  const procNomeById = useMemo(
    () => new Map(processos.map((p) => [p.id, p.name])),
    [processos],
  );

  // Apenas gargalos COM etapas-origem
  const [fCluster, setFCluster] = useState('');
  const gargalosComCascata = useMemo<Gargalo[]>(() => {
    return gargalos
      .filter((g) => (g.etapasOrigem ?? []).length > 0)
      .filter((g) => !fCluster || g.cluster_id === fCluster)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [gargalos, fCluster]);

  const [selectedGargaloId, setSelectedGargaloId] = useState<string | null>(null);
  useEffect(() => {
    if (loaded && !selectedGargaloId && gargalosComCascata.length > 0) {
      setSelectedGargaloId(gargalosComCascata[0].id);
    }
  }, [loaded, gargalosComCascata, selectedGargaloId]);

  const selectedGargalo = useMemo(
    () => gargalosComCascata.find((g) => g.id === selectedGargaloId) ?? null,
    [gargalosComCascata, selectedGargaloId],
  );

  const [vista, setVista] = useState<Vista>('macro');

  const derivacao = useMemo<DerivacaoCascata | null>(() => {
    if (!selectedGargalo) return null;
    const seedIds = (selectedGargalo.etapasOrigem ?? []).map((r) => r.etapaId);
    return derivarCascataPorEtapas(seedIds, etapas, _docs, processos);
  }, [selectedGargalo, etapas, _docs, processos]);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState<string>('');
  const [erro, setErro] = useState<string>('');

  const codigo = useMemo(() => {
    if (!derivacao || !selectedGargalo) return '';
    if (derivacao.processos.length === 0) return '';
    return buildDiagram(selectedGargalo, derivacao, vista, etapaNomeById, procNomeById, etapaOrderById);
  }, [derivacao, selectedGargalo, vista, etapaNomeById, procNomeById, etapaOrderById]);

  useEffect(() => {
    if (!codigo) {
      setSvg('');
      return;
    }
    ensureMermaid();
    let cancelado = false;
    const id = `casc-${Date.now()}`;
    mermaid.render(id, codigo)
      .then(({ svg }) => { if (!cancelado) { setSvg(svg); setErro(''); } })
      .catch((e: unknown) => { if (!cancelado) setErro(e instanceof Error ? e.message : String(e)); });
    return () => { cancelado = true; };
  }, [codigo]);

  if (!loaded) {
    return <div className="loading-container"><div className="spinner" /></div>;
  }

  const totalEtapas = derivacao?.stageIds.length ?? 0;
  const totalProcs = derivacao?.processos.length ?? 0;
  const processosTotal = derivacao?.processos.filter((p: ProcessoAfetado) => p.intensidade === 'TOTAL').length ?? 0;
  const processosParcial = derivacao?.processos.filter((p: ProcessoAfetado) => p.intensidade === 'PARCIAL').length ?? 0;
  const profundidade = derivacao?.profundidadeMax ?? 0;

  return (
    <div className="card">
      <div className="page-header-v2">
        <div className="page-header-titles">
          <h1>Cascata</h1>
          <p>
            Visualização do impacto jusante de gargalos. Cadastre as etapas-origem na aba <strong>Gargalos</strong>;
            aqui o grafo é derivado automaticamente em tempo real.
          </p>
        </div>
      </div>

      <PageStats stats={[
        { label: 'Gargalos com cascata', value: String(gargalosComCascata.length), tooltip: 'Gargalos com ≥1 etapa-origem.' },
        { label: 'Processos afetados', value: String(totalProcs), tooltip: 'Processos distintos atingidos pela BFS do gargalo selecionado.' },
        { label: 'Etapas afetadas', value: String(totalEtapas), tooltip: 'Etapas atingidas (inclui as origens).' },
        { label: 'Total / Parcial', value: `${processosTotal} / ${processosParcial}`, tooltip: 'Processos re-executados na totalidade vs parcialmente (≥60% de etapas afetadas).' },
        { label: 'Profundidade', value: String(profundidade), tooltip: 'Camadas BFS percorridas (1 = só etapas-origem).' },
      ]} />

      <FiltrosBar
        ativo={!!fCluster}
        onLimpar={() => setFCluster('')}
        filtros={[
          { id: 'fc-cluster', label: 'Cluster', value: fCluster, onChange: setFCluster, options: CLUSTER_OPCOES, tooltip: 'Filtra por cluster do gargalo.' },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, marginTop: 16 }}>
        {/* Lista */}
        <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: 12, maxHeight: 780, overflow: 'auto' }}>
          <h3 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: 8 }}>
            Gargalos com cascata ({gargalosComCascata.length})
          </h3>
          {gargalosComCascata.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', padding: '24px 8px' }}>
              Nenhum gargalo com etapas-origem.<br />
              Vá em <strong>Gargalos</strong>, edite um gargalo e selecione as etapas onde ele se manifesta.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {gargalosComCascata.map((g) => {
                const isSel = g.id === selectedGargaloId;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGargaloId(g.id)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: isSel ? '2px solid #b91c1c' : '1px solid #e2e8f0',
                      background: isSel ? '#fef2f2' : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#0f172a', marginBottom: 4 }}>
                      {g.nome}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>
                      📡 {(g.etapasOrigem ?? []).length} {(g.etapasOrigem ?? []).length === 1 ? 'etapa-origem' : 'etapas-origem'}
                      {g.clusterName && ` · ${g.clusterName}`}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Grafo */}
        <div>
          {!selectedGargalo ? (
            <div style={{ padding: 32, color: '#94a3b8', textAlign: 'center', border: '1px dashed #e2e8f0', borderRadius: 8 }}>
              Selecione um gargalo à esquerda.
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a' }}>{selectedGargalo.nome}</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                    {selectedGargalo.descricao || 'Sem descrição.'}
                  </p>
                </div>
                <div style={{ display: 'inline-flex', border: '1px solid #cbd5e1', borderRadius: 6, overflow: 'hidden' }}>
                  <button
                    type="button"
                    onClick={() => setVista('macro')}
                    style={{
                      padding: '6px 14px',
                      border: 0,
                      background: vista === 'macro' ? '#0f172a' : '#fff',
                      color: vista === 'macro' ? '#fff' : '#0f172a',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Macro (processos)
                  </button>
                  <button
                    type="button"
                    onClick={() => setVista('granular')}
                    style={{
                      padding: '6px 14px',
                      border: 0,
                      background: vista === 'granular' ? '#0f172a' : '#fff',
                      color: vista === 'granular' ? '#fff' : '#0f172a',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Granular (etapas)
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, fontSize: '0.78rem' }}>
                <strong style={{ color: '#475569' }}>Etapas-origem:</strong>
                {(selectedGargalo.etapasOrigem ?? []).map((ref) => (
                  <span key={`${ref.etapaId}-${ref.scenario}`} className="tag" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 4 }}>
                    {ref.processoNome && <span style={{ opacity: 0.7 }}>{ref.processoNome} · </span>}
                    {ref.etapaNome ?? ref.etapaId}
                  </span>
                ))}
              </div>

              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: '#f8fafc',
                  padding: 14,
                  minHeight: 360,
                }}
              >
                {erro ? (
                  <div style={{ color: '#b91c1c', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    Erro ao renderizar: {erro}
                  </div>
                ) : !codigo ? (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: 24 }}>
                    Nenhum impacto derivado — as etapas-origem não produzem documentos consumidos por outras etapas.
                  </div>
                ) : (
                  <div ref={stageRef} style={{ overflow: 'auto', maxHeight: 700, display: 'flex', justifyContent: 'center' }} dangerouslySetInnerHTML={{ __html: svg }} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
