// Página de Cascata — Visualização derivada em tempo real ("Impact Flow").
//
// Sem cadastro próprio. A cascata é a invalidação documental disparada por
// um gargalo que aponta etapas-origem (gargalo_etapas): documento alterado →
// etapas que o consomem re-executam (e as seguintes do processo também) →
// seus documentos de saída ficam desatualizados → propaga. Esta página:
//
//   1. Rail esquerdo: gargalos com etapasOrigem.length > 0, com busca
//      integrada (cluster vem do seletor global no header), seleção com
//      indicador animado.
//   2. Ao selecionar, deriva a BFS em tempo real (cascataDocumento) e monta
//      o grafo executivo por ondas (cascataGraph), renderizado pelo
//      CascataCanvas: colunas Gargalo → Origem → 1ª onda → ... com conectores
//      SVG animados, docs a atualizar por processo, zoom e expansão granular.

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Layers, ListTree, Search, Waves } from 'lucide-react';
import { useGargalos } from '@/hooks/useGargalos';
import { useEtapas } from '@/hooks/useEtapas';
import { useDocumentos } from '@/hooks/useDocumentos';
import { useProcessos } from '@/hooks/useProcessos';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import { canon } from '@/utils/cascataEngine';
import PageStats from '@/components/equipe/mapa/PageStats';
import CascataCanvas from '@/components/equipe/mapa/cascata/CascataCanvas';
import { derivarCascataPorEtapas, type DerivacaoCascata } from '@/utils/cascataDocumento';
import { buildCascataGraph } from '@/utils/cascataGraph';
import type { Gargalo } from '@/types';
import './styles/cascata.css';

export default function CascataPage() {
  const { data: gargalos = [], isLoading: gLoading } = useGargalos();
  const { data: etapas = [], isLoading: eLoading } = useEtapas();
  const { data: docs = [], isLoading: dLoading } = useDocumentos();
  const { data: processos = [], isLoading: pLoading } = useProcessos();

  const loaded = !gLoading && !eLoading && !dLoading && !pLoading;

  // Cluster vem do seletor global no header.
  const { cluster: fCluster } = useClusterGlobal();
  const [busca, setBusca] = useState('');

  const gargalosComCascata = useMemo<Gargalo[]>(() => {
    const q = canon(busca);
    return gargalos
      .filter((g) => (g.etapasOrigem ?? []).length > 0)
      .filter((g) => !fCluster || g.cluster_id === fCluster)
      .filter((g) => !q || canon(g.nome).includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [gargalos, fCluster, busca]);

  const [selectedGargaloId, setSelectedGargaloId] = useState<string | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (gargalosComCascata.length === 0) {
      if (selectedGargaloId !== null) setSelectedGargaloId(null);
      return;
    }
    if (!selectedGargaloId || !gargalosComCascata.some((g) => g.id === selectedGargaloId)) {
      setSelectedGargaloId(gargalosComCascata[0].id);
    }
  }, [loaded, gargalosComCascata, selectedGargaloId]);

  const selectedGargalo = useMemo(
    () => gargalosComCascata.find((g) => g.id === selectedGargaloId) ?? null,
    [gargalosComCascata, selectedGargaloId],
  );

  const derivacao = useMemo<DerivacaoCascata | null>(() => {
    if (!selectedGargalo) return null;
    const seedIds = (selectedGargalo.etapasOrigem ?? []).map((r) => r.etapaId);
    return derivarCascataPorEtapas(seedIds, etapas, docs, processos);
  }, [selectedGargalo, etapas, docs, processos]);

  const graph = useMemo(() => {
    if (!derivacao || derivacao.processos.length === 0) return null;
    return buildCascataGraph(derivacao, etapas, processos, docs);
  }, [derivacao, etapas, processos, docs]);

  // Expansão granular por processo (Macro = nada expandido)
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  useEffect(() => {
    setExpanded(new Set());
  }, [selectedGargaloId]);

  const allProcessIds = useMemo(
    () => graph?.waves.flat().map((n) => n.processId) ?? [],
    [graph],
  );
  const macroAtivo = expanded.size === 0;
  const granularAtivo = allProcessIds.length > 0 && expanded.size === allProcessIds.length;

  const toggleProcess = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  if (!loaded) {
    return (
      <div className="loading-container">
        <div className="spinner" />
      </div>
    );
  }

  const totalEtapas = derivacao?.stageIds.length ?? 0;
  const totalProcs = derivacao?.processos.length ?? 0;
  const totalDocs = derivacao?.documentoIds.length ?? 0;
  const processosTotal = derivacao?.processos.filter((p) => p.intensidade === 'TOTAL').length ?? 0;
  const processosParcial = derivacao?.processos.filter((p) => p.intensidade === 'PARCIAL').length ?? 0;
  const profundidade = derivacao?.profundidadeMax ?? 0;

  return (
    <div className="card">
      <div className="page-header-v2">
        <div className="page-header-titles">
          <h1>Cascata</h1>
          <p>
            Visualização do impacto jusante de gargalos. Cadastre as etapas-origem na aba{' '}
            <strong>Gargalos</strong>; aqui o grafo é derivado automaticamente em tempo real.
          </p>
        </div>
      </div>

      <PageStats
        stats={[
          { label: 'Gargalos com cascata', value: String(gargalosComCascata.length), tooltip: 'Gargalos com ≥1 etapa-origem.' },
          { label: 'Docs a atualizar', value: String(totalDocs), tooltip: 'Documentos invalidados pela cascata do gargalo selecionado: precisam ser refeitos/atualizados.' },
          { label: 'Processos afetados', value: String(totalProcs), tooltip: 'Processos distintos atingidos pelo fluxo documental do gargalo selecionado.' },
          { label: 'Etapas afetadas', value: String(totalEtapas), tooltip: 'Etapas atingidas: origem, consumo de doc invalidado ou reexecução sequencial.' },
          { label: 'Total / Parcial', value: `${processosTotal} / ${processosParcial}`, tooltip: 'Processos re-executados na totalidade vs parcialmente (≥60% de etapas afetadas).' },
          { label: 'Profundidade', value: String(profundidade), tooltip: 'Ondas de propagação documental (1 = só etapas-origem).' },
        ]}
      />

      <div className="cascata-layout">
        {/* ─── Rail de gargalos ─── */}
        <aside className="cascata-rail">
          <div className="cascata-rail-head">
            <div className="cascata-rail-search">
              <Search size={14} />
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar gargalo..."
                aria-label="Buscar gargalo"
              />
            </div>
          </div>

          <div className="cascata-rail-count">
            {gargalosComCascata.length}{' '}
            {gargalosComCascata.length === 1 ? 'gargalo com cascata' : 'gargalos com cascata'}
          </div>

          <div className="cascata-rail-list">
            {gargalosComCascata.length === 0 ? (
              <div className="cascata-rail-empty">
                {busca || fCluster ? (
                  <>Nenhum gargalo encontrado com os filtros atuais.</>
                ) : (
                  <>
                    Nenhum gargalo com etapas-origem.
                    <br />
                    Vá em <strong>Gargalos</strong>, edite um gargalo e selecione as etapas onde
                    ele se manifesta.
                  </>
                )}
              </div>
            ) : (
              gargalosComCascata.map((g) => {
                const sel = g.id === selectedGargaloId;
                const nOrigens = (g.etapasOrigem ?? []).length;
                return (
                  <button
                    key={g.id}
                    type="button"
                    className={`cascata-rail-item${sel ? ' is-active' : ''}`}
                    onClick={() => setSelectedGargaloId(g.id)}
                    aria-pressed={sel}
                  >
                    {sel && (
                      <motion.span
                        layoutId="cascata-rail-pill"
                        className="cascata-rail-pill"
                        transition={{ type: 'spring', stiffness: 430, damping: 36 }}
                      />
                    )}
                    <span className="cascata-rail-item-body">
                      <span className="cascata-rail-item-nome">{g.nome}</span>
                      <span className="cascata-rail-item-meta">
                        <Waves size={11} />
                        {nOrigens} {nOrigens === 1 ? 'etapa-origem' : 'etapas-origem'}
                        {g.clusterName && (
                          <span className="cascata-rail-item-cluster">{g.clusterName}</span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* ─── Visualização ─── */}
        <section className="cascata-main">
          <AnimatePresence mode="wait">
            {!selectedGargalo ? (
              <motion.div
                key="vazio"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="cascata-canvas-shell"
              >
                <div className="cascata-empty">
                  <Waves size={40} />
                  <div>
                    <strong>Nenhum gargalo selecionado.</strong>
                    <br />
                    Cadastre etapas-origem em um gargalo para derivar a cascata de impacto.
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={selectedGargalo.id}
                initial={{ opacity: 0, x: 14 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -14 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
              >
                <div className="cascata-hero">
                  <h2>{selectedGargalo.nome}</h2>
                  <p>{selectedGargalo.descricao || 'Sem descrição.'}</p>
                  <div className="cascata-hero-chips">
                    <span className="cascata-hero-chips-label">Etapas-origem</span>
                    {(selectedGargalo.etapasOrigem ?? []).map((ref) => (
                      <span key={`${ref.etapaId}-${ref.scenario}`} className="cascata-chip-origem">
                        {ref.processoNome && <span className="proc">{ref.processoNome} ·</span>}
                        {ref.etapaNome ?? ref.etapaId}
                      </span>
                    ))}
                  </div>
                </div>

                {graph ? (
                  <>
                    <div className="cascata-controls">
                      <div className="cascata-seg" role="group" aria-label="Nível de detalhe">
                        <button
                          type="button"
                          className={macroAtivo ? 'is-active' : ''}
                          onClick={() => setExpanded(new Set())}
                        >
                          {macroAtivo && (
                            <motion.span
                              layoutId="cascata-seg-thumb"
                              className="cascata-seg-thumb"
                              transition={{ type: 'spring', stiffness: 430, damping: 36 }}
                            />
                          )}
                          <span>
                            <Layers size={14} />
                            Macro
                          </span>
                        </button>
                        <button
                          type="button"
                          className={granularAtivo ? 'is-active' : ''}
                          onClick={() => setExpanded(new Set(allProcessIds))}
                        >
                          {granularAtivo && (
                            <motion.span
                              layoutId="cascata-seg-thumb"
                              className="cascata-seg-thumb"
                              transition={{ type: 'spring', stiffness: 430, damping: 36 }}
                            />
                          )}
                          <span>
                            <ListTree size={14} />
                            Granular
                          </span>
                        </button>
                      </div>

                      <div className="cascata-legend">
                        <span>
                          <i className="dot-total" /> Reexecução total
                        </span>
                        <span>
                          <i className="dot-parcial" /> Reexecução parcial
                        </span>
                        <span>
                          <i className="dot-origem" /> Etapa-origem
                        </span>
                        <span>
                          <i className="dot-doc" /> Consome doc alterado
                        </span>
                        <span>
                          <i className="dot-seq" /> Reexecução sequencial
                        </span>
                      </div>
                    </div>

                    <CascataCanvas
                      gargalo={selectedGargalo}
                      graph={graph}
                      expandedIds={expanded}
                      onToggleProcess={toggleProcess}
                    />
                  </>
                ) : (
                  <div className="cascata-canvas-shell">
                    <div className="cascata-empty">
                      <Waves size={40} />
                      <div>
                        <strong>Nenhum impacto derivado.</strong>
                        <br />
                        As etapas-origem (e as seguintes dos seus processos) não produzem
                        documentos consumidos por outras etapas.
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </div>
    </div>
  );
}
