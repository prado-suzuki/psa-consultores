// Página de Cascata — Visualização derivada em tempo real.
//
// Não há mais cadastro de cascatas. A "cascata" agora é o grafo de impacto
// jusante de um gargalo que afeta um ou mais documentos. Esta página:
//
//   1. Lista gargalos com documentosAfetados.length > 0 (esquerda).
//   2. Ao selecionar um gargalo, deriva BFS doc → etapa → doc → etapa em
//      tempo real (sem persistência) e renderiza o grafo (direita).
//   3. Toggle granular ↔ macro alterna entre:
//        granular: doc ↔ etapa  (cada etapa é nó)
//        macro:    doc ↔ processo (etapas agrupadas no processo)
//
// Stack visual: Mermaid (já carregado no projeto) — gera flowchart LR.

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
  derivarCascataPorDocumentos,
  agruparPorProcesso,
  type DerivacaoCascata,
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
    flowchart: { htmlLabels: true, curve: 'basis', padding: 14 },
  });
  mermaidReady = true;
}

// Sanitiza string para uso como ID Mermaid (apenas alfanumérico + underscore)
function safeId(prefix: string, raw: string): string {
  return `${prefix}_${raw.replace(/[^A-Za-z0-9_]+/g, '_')}`;
}
function safeLabel(s: string): string {
  return s.replace(/"/g, '\\"').replace(/\n/g, ' ');
}

type Modo = 'granular' | 'macro';

/**
 * Gera código Mermaid (flowchart LR) a partir da derivação de cascata.
 * Em modo `granular`, nós-etapa são distintos. Em modo `macro`, nós são
 * agrupados em processos (cada nó "etapa" vira o processo pai).
 */
function buildDiagram(
  derivacao: DerivacaoCascata,
  modo: Modo,
  ctx: {
    docNomeById: Map<string, string>;
    etapaNomeById: Map<string, string>;
    procNomeById: Map<string, string>;
    seedDocIds: Set<string>;
  },
): string {
  const { docNomeById, etapaNomeById, procNomeById, seedDocIds } = ctx;
  const lines: string[] = ['flowchart LR'];

  lines.push('classDef doc       fill:#ecfeff,stroke:#0e7490,color:#155e75;');
  lines.push('classDef docSeed   fill:#fef2f2,stroke:#b91c1c,color:#7f1d1d,font-weight:bold;');
  lines.push('classDef stage     fill:#f1f5f9,stroke:#475569,color:#0f172a;');
  lines.push('classDef proc      fill:#eff6ff,stroke:#1d4ed8,color:#1e3a8a,font-weight:bold;');

  const declared = new Set<string>();

  function declareDoc(id: string) {
    const nid = safeId('D', id);
    if (declared.has(nid)) return nid;
    declared.add(nid);
    const label = safeLabel(docNomeById.get(id) ?? id);
    const klass = seedDocIds.has(id) ? 'docSeed' : 'doc';
    lines.push(`${nid}["📄 ${label}"]:::${klass}`);
    return nid;
  }
  function declareStage(id: string) {
    const nid = safeId('S', id);
    if (declared.has(nid)) return nid;
    declared.add(nid);
    const label = safeLabel(etapaNomeById.get(id) ?? id);
    lines.push(`${nid}["⚙ ${label}"]:::stage`);
    return nid;
  }
  function declareProc(id: string) {
    const nid = safeId('P', id);
    if (declared.has(nid)) return nid;
    declared.add(nid);
    const label = safeLabel(procNomeById.get(id) ?? id);
    lines.push(`${nid}["🔧 ${label}"]:::proc`);
    return nid;
  }

  for (const ed of derivacao.edges) {
    let fromId: string;
    let toId: string;

    if (ed.from.kind === 'doc') fromId = declareDoc(ed.from.id);
    else fromId = modo === 'macro' ? declareProc(ed.from.id) : declareStage(ed.from.id);

    if (ed.to.kind === 'doc') toId = declareDoc(ed.to.id);
    else toId = modo === 'macro' ? declareProc(ed.to.id) : declareStage(ed.to.id);

    lines.push(`${fromId} --> ${toId}`);
  }

  return lines.join('\n');
}

export default function CascataPage() {
  const { data: gargalos = [], isLoading: gLoading } = useGargalos();
  const { data: etapas = [], isLoading: eLoading } = useEtapas();
  const { data: documentos = [], isLoading: dLoading } = useDocumentos();
  const { data: processos = [], isLoading: pLoading } = useProcessos();
  const CLUSTER_OPCOES = useClusterFiltroOpcoes();

  const loaded = !gLoading && !eLoading && !dLoading && !pLoading;

  // Maps de lookup
  const docNomeById = useMemo(
    () => new Map(documentos.map(d => [d.id, d.nome])),
    [documentos]
  );
  const etapaNomeById = useMemo(
    () => new Map(etapas.map(e => [e.id, e.name])),
    [etapas]
  );
  const procNomeById = useMemo(
    () => new Map(processos.map(p => [p.id, p.name])),
    [processos]
  );

  // Apenas gargalos COM documentos afetados aparecem na cascata
  const [fCluster, setFCluster] = useState('');
  const gargalosComCascata = useMemo<Gargalo[]>(() => {
    return gargalos
      .filter(g => (g.documentosAfetados ?? []).length > 0)
      .filter(g => !fCluster || g.cluster_id === fCluster)
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [gargalos, fCluster]);

  // Seleção do gargalo atual
  const [selectedGargaloId, setSelectedGargaloId] = useState<string | null>(null);
  useEffect(() => {
    // Auto-seleciona o primeiro gargalo quando a lista carrega
    if (loaded && !selectedGargaloId && gargalosComCascata.length > 0) {
      setSelectedGargaloId(gargalosComCascata[0].id);
    }
  }, [loaded, gargalosComCascata, selectedGargaloId]);

  const selectedGargalo = useMemo(
    () => gargalosComCascata.find(g => g.id === selectedGargaloId) ?? null,
    [gargalosComCascata, selectedGargaloId]
  );

  // Toggle granular/macro
  const [modo, setModo] = useState<Modo>('granular');

  // Derivação em tempo real
  const derivacaoGranular = useMemo<DerivacaoCascata | null>(() => {
    if (!selectedGargalo) return null;
    return derivarCascataPorDocumentos(
      selectedGargalo.documentosAfetados ?? [],
      etapas,
      documentos,
      processos,
      { clusterId: selectedGargalo.cluster_id ?? null },
    );
  }, [selectedGargalo, etapas, documentos, processos]);

  const derivacaoExibida = useMemo<DerivacaoCascata | null>(() => {
    if (!derivacaoGranular) return null;
    return modo === 'macro' ? agruparPorProcesso(derivacaoGranular, etapas) : derivacaoGranular;
  }, [derivacaoGranular, modo, etapas]);

  // Render do diagrama Mermaid
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [svg, setSvg] = useState<string>('');
  const [erro, setErro] = useState<string>('');

  const codigo = useMemo(() => {
    if (!derivacaoExibida || !selectedGargalo) return '';
    if (derivacaoExibida.edges.length === 0) return '';
    const seedDocIds = new Set(selectedGargalo.documentosAfetados ?? []);
    return buildDiagram(derivacaoExibida, modo, {
      docNomeById,
      etapaNomeById,
      procNomeById,
      seedDocIds,
    });
  }, [derivacaoExibida, selectedGargalo, modo, docNomeById, etapaNomeById, procNomeById]);

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

  const totalDocs = derivacaoExibida?.documentoIds.length ?? 0;
  const totalEtapas = derivacaoGranular?.stageIds.length ?? 0;
  const totalProcs = derivacaoGranular?.processIds.length ?? 0;
  const profundidade = derivacaoGranular?.profundidadeMax ?? 0;

  return (
    <div className="card">
      <div className="page-header-v2">
        <div className="page-header-titles">
          <h1>Cascata</h1>
          <p>
            Visualização derivada em tempo real do impacto de gargalos que afetam documentos.
            Cadastre o vínculo gargalo↔documento na aba <strong>Gargalos</strong>; aqui o grafo é gerado automaticamente.
          </p>
        </div>
      </div>

      <PageStats stats={[
        { label: 'Gargalos com cascata', value: String(gargalosComCascata.length), tooltip: 'Total de gargalos que afetam ≥1 documento.' },
        { label: 'Documentos no grafo', value: String(totalDocs), tooltip: 'Documentos visitados pela BFS jusante do gargalo selecionado.' },
        { label: 'Etapas afetadas', value: String(totalEtapas), tooltip: 'Etapas que consomem documentos da cascata.' },
        { label: 'Processos afetados', value: String(totalProcs), tooltip: 'Processos distintos que contêm as etapas afetadas.' },
        { label: 'Profundidade', value: String(profundidade), tooltip: 'Número de camadas BFS percorridas (1 = só consumidores diretos).' },
      ]} />

      <FiltrosBar
        ativo={!!fCluster}
        onLimpar={() => setFCluster('')}
        filtros={[
          { id: 'fc-cluster', label: 'Cluster', value: fCluster, onChange: setFCluster, options: CLUSTER_OPCOES, tooltip: 'Filtra por cluster do gargalo.' },
        ]}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, marginTop: 16 }}>
        {/* Lista de gargalos-com-cascata */}
        <div style={{ borderRight: '1px solid #e2e8f0', paddingRight: 12, maxHeight: 720, overflow: 'auto' }}>
          <h3 style={{ fontSize: '0.88rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#475569', marginBottom: 8 }}>
            Gargalos com cascata ({gargalosComCascata.length})
          </h3>
          {gargalosComCascata.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: '0.88rem', padding: '24px 8px' }}>
              Nenhum gargalo com documentos afetados.<br />
              Vá em <strong>Gargalos</strong>, edite um gargalo e adicione documentos afetados.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {gargalosComCascata.map(g => {
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
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#0f172a', marginBottom: 4 }}>
                      {g.nome}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#b91c1c' }}>
                      📡 {(g.documentosAfetados ?? []).length} {(g.documentosAfetados ?? []).length === 1 ? 'doc afetado' : 'docs afetados'}
                      {g.clusterName && ` · ${g.clusterName}`}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Visualização do grafo */}
        <div>
          {!selectedGargalo ? (
            <div style={{ padding: 32, color: '#94a3b8', textAlign: 'center', border: '1px dashed #e2e8f0', borderRadius: 8 }}>
              Selecione um gargalo à esquerda para visualizar a cascata.
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
                    onClick={() => setModo('granular')}
                    style={{
                      padding: '6px 14px',
                      border: 0,
                      background: modo === 'granular' ? '#0f172a' : '#fff',
                      color: modo === 'granular' ? '#fff' : '#0f172a',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Granular (doc ↔ etapa)
                  </button>
                  <button
                    type="button"
                    onClick={() => setModo('macro')}
                    style={{
                      padding: '6px 14px',
                      border: 0,
                      background: modo === 'macro' ? '#0f172a' : '#fff',
                      color: modo === 'macro' ? '#fff' : '#0f172a',
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                    }}
                  >
                    Macro (doc ↔ processo)
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, fontSize: '0.78rem' }}>
                <strong style={{ color: '#475569' }}>Documentos-semente:</strong>
                {(selectedGargalo.documentosAfetados ?? []).map(did => (
                  <span key={did} className="tag" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', padding: '2px 8px', borderRadius: 4 }}>
                    {docNomeById.get(did) ?? did}
                  </span>
                ))}
              </div>

              <div
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 8,
                  background: '#f8fafc',
                  padding: 14,
                  minHeight: 320,
                }}
              >
                {erro ? (
                  <div style={{ color: '#b91c1c', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                    Erro ao renderizar: {erro}
                  </div>
                ) : !codigo ? (
                  <div style={{ color: '#94a3b8', textAlign: 'center', padding: 24 }}>
                    Nenhuma cascata derivada — provavelmente os documentos-semente não são consumidos por nenhuma etapa.
                  </div>
                ) : (
                  <div ref={stageRef} style={{ overflow: 'auto', maxHeight: 600 }} dangerouslySetInnerHTML={{ __html: svg }} />
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
