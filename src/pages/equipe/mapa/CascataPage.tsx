// Página de Cascata — Eventos de Disrupção.
// Aba 1: lista os eventos cadastrados e permite criar/editar via Modal com
//        seletor hierárquico Projeto → Processo → Etapa (AS-IS / TO-BE) usando
//        GrupoAccordion.
// Aba 2: Simulador gráfico — escolhe um evento, renderiza o fluxo das etapas
//        marcadas via Mermaid e anima passo a passo (Play / Pause / Reset /
//        Velocidade) com a classe `.cascata-retrabalho.is-firing`.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import mermaid from 'mermaid';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import GrupoAccordion from '@/components/equipe/mapa/GrupoAccordion';
import DiagramViewer from '@/components/equipe/mapa/DiagramViewer';
import FiltrosBar from '@/components/equipe/mapa/FiltrosBar';
import { useClusterCadastroOpcoes, useClusterFiltroOpcoes } from '@/hooks/useClusters';
import { buildEventoDiagram, etapaNodeId } from '@/utils/cascataDiagram';
import {
  useCascataEventos, useCreateCascataEvento, useUpdateCascataEvento,
  useDeleteCascataEvento,
} from '@/hooks/useCascataEventos';
import {
  useProjetosLista, useProcessosLista, useEtapasLista,
} from '@/hooks/useDominioListas';
import { toast } from 'sonner';
import type {
  CascataEvento, CascataEventoEtapaRef, CenarioEtapa,
  Projeto, Processo, Etapa,
} from '@/types';

type Aba = 'eventos' | 'simulador';

// Inicialização do Mermaid: única por sessão, com fonte Inter padrão.
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

// ─── Componente auxiliar: tag visual para cenário ─────────────────────────
function CenarioTag({ cenario }: { cenario: CenarioEtapa }) {
  return (
    <span className={`cascata-tag${cenario === 'TO-BE' ? ' is-tobe' : ''}`}>
      {cenario}
    </span>
  );
}

// ─── Comparador estável para a chave (etapaId, cenario). ──────────────────
function refKey(r: { etapaId: string; cenario: CenarioEtapa }): string {
  return `${r.etapaId}::${r.cenario}`;
}

// ============================================================
// SELETOR HIERÁRQUICO — Projeto → Processo → Etapa
// ============================================================
interface EtapaNodeUI {
  etapa: Etapa;
  /** Cenários disponíveis para a etapa — sempre 'AS-IS'; 'TO-BE' só se houver projeção. */
  cenariosDisponiveis: CenarioEtapa[];
}

interface ProcessoBucket {
  processo: Processo;
  projetoNome: string;
  etapas: EtapaNodeUI[];
}

function SeletorEtapas({
  projetos,
  processos,
  etapas,
  selecionadas,
  onChange,
}: {
  projetos: Projeto[];
  processos: Processo[];
  etapas: Etapa[];
  selecionadas: Set<string>;
  onChange: (next: Set<string>) => void;
}) {
  const projetoNome = useMemo(() => new Map(projetos.map(p => [p.id, p.name])), [projetos]);

  // Buckets: 1 por processo, ordenados por projeto/ordem.
  const buckets = useMemo<ProcessoBucket[]>(() => {
    const etapasPorProc = new Map<string, Etapa[]>();
    for (const e of etapas) {
      if (!etapasPorProc.has(e.process_id)) etapasPorProc.set(e.process_id, []);
      etapasPorProc.get(e.process_id)!.push(e);
    }
    for (const arr of etapasPorProc.values()) arr.sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0));

    return [...processos]
      .filter(p => etapasPorProc.has(p.id))
      .sort((a, b) => {
        const pa = a.project_id ? projetoNome.get(a.project_id) || '' : '';
        const pb = b.project_id ? projetoNome.get(b.project_id) || '' : '';
        if (pa !== pb) return pa.localeCompare(pb);
        return (a.order_index ?? 0) - (b.order_index ?? 0);
      })
      .map<ProcessoBucket>(proc => ({
        processo: proc,
        projetoNome: proc.project_id ? (projetoNome.get(proc.project_id) || 'Sem projeto') : 'Sem projeto',
        etapas: (etapasPorProc.get(proc.id) || []).map<EtapaNodeUI>(e => ({
          etapa: e,
          cenariosDisponiveis: e.ficou ? ['AS-IS', 'TO-BE'] : ['AS-IS'],
        })),
      }));
  }, [processos, etapas, projetoNome]);

  const toggle = (etapaId: string, cenario: CenarioEtapa) => {
    const key = refKey({ etapaId, cenario });
    const next = new Set(selecionadas);
    if (next.has(key)) next.delete(key); else next.add(key);
    onChange(next);
  };

  const toggleProcesso = (bucket: ProcessoBucket, cenario: CenarioEtapa, marcar: boolean) => {
    const next = new Set(selecionadas);
    for (const n of bucket.etapas) {
      if (!n.cenariosDisponiveis.includes(cenario)) continue;
      const k = refKey({ etapaId: n.etapa.id, cenario });
      if (marcar) next.add(k); else next.delete(k);
    }
    onChange(next);
  };

  const grupos = buckets.map(b => ({
    key: b.processo.id,
    titulo: `${b.projetoNome} → ${b.processo.name}`,
    itens: [b], // 1 bucket por grupo para reusar a estrutura
  }));

  return (
    <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, padding: 0, maxHeight: 380, overflow: 'auto' }}>
      <GrupoAccordion
        grupos={grupos}
        substantivo={['etapa', 'etapas']}
        emptyMessage="Nenhum processo com etapas mapeadas."
        renderGrupo={(itens) => {
          const b = itens[0];
          const hasTobe = b.etapas.some(n => n.cenariosDisponiveis.includes('TO-BE'));
          // Para checkbox "selecionar todos" do processo, calcula estado.
          const todosAsIs = b.etapas.every(n => selecionadas.has(refKey({ etapaId: n.etapa.id, cenario: 'AS-IS' })));
          return (
            <div className="cascata-etapa-checks">
              <div style={{ display: 'flex', gap: 12, fontSize: '0.74rem', color: '#64748b', paddingBottom: 6, borderBottom: '1px dashed #e2e8f0' }}>
                <button
                  type="button"
                  className="btn-action-sm"
                  onClick={() => toggleProcesso(b, 'AS-IS', !todosAsIs)}
                >
                  {todosAsIs ? 'Desmarcar AS-IS' : 'Marcar todas AS-IS'}
                </button>
                {hasTobe && (
                  <button
                    type="button"
                    className="btn-action-sm"
                    onClick={() => toggleProcesso(b, 'TO-BE', !b.etapas.every(n => n.cenariosDisponiveis.includes('TO-BE') && selecionadas.has(refKey({ etapaId: n.etapa.id, cenario: 'TO-BE' }))))}
                  >
                    Alternar todas TO-BE
                  </button>
                )}
              </div>
              {b.etapas.map(({ etapa, cenariosDisponiveis }) => (
                <div key={etapa.id} className="cascata-etapa-row">
                  <span className="nome">{etapa.stage_order != null ? `${etapa.stage_order}. ` : ''}{etapa.name}</span>
                  {cenariosDisponiveis.map(c => {
                    const k = refKey({ etapaId: etapa.id, cenario: c });
                    return (
                      <label key={c}>
                        <input
                          type="checkbox"
                          checked={selecionadas.has(k)}
                          onChange={() => toggle(etapa.id, c)}
                        />
                        <CenarioTag cenario={c} />
                      </label>
                    );
                  })}
                </div>
              ))}
            </div>
          );
        }}
      />
    </div>
  );
}

// ============================================================
// SIMULADOR (Aba 2)
// ============================================================
type Velocidade = 0.5 | 1 | 2;

function SimuladorEvento({
  evento,
  etapas,
}: {
  evento: CascataEvento;
  etapas: Etapa[];
}) {
  const [svg, setSvg] = useState('');
  const [erro, setErro] = useState('');
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [rodando, setRodando] = useState(false);
  const [passoAtual, setPassoAtual] = useState(0);
  const [velocidade, setVelocidade] = useState<Velocidade>(1);
  const [viewerOpen, setViewerOpen] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hidrata a sequência de animação: etapas marcadas, ordenadas por ordem do
  // processo e ordem da etapa dentro do processo.
  const sequencia = useMemo(() => {
    const etapaMap = new Map(etapas.map(e => [e.id, e]));
    const items = (evento.etapas || []).map<CascataEventoEtapaRef & { ord: number; procOrd: number }>(r => {
      const e = etapaMap.get(r.etapaId);
      return {
        ...r,
        ord: r.etapaOrdem ?? e?.stage_order ?? 0,
        procOrd: 0,
      };
    });
    items.sort((a, b) => {
      const pn = (a.processoNome || '').localeCompare(b.processoNome || '');
      if (pn !== 0) return pn;
      return (a.ord || 0) - (b.ord || 0);
    });
    return items;
  }, [evento.etapas, etapas]);

  const codigo = useMemo(
    () => buildEventoDiagram({
      eventoNome: evento.nome,
      processoRaizId: evento.processoRaizId,
      etapasMarcadas: evento.etapas,
    }),
    [evento],
  );

  // Render do Mermaid: marca os nós das etapas com classe `cascata-retrabalho`.
  useEffect(() => {
    if (!codigo) return;
    ensureMermaid();
    let cancelado = false;
    const id = `casc-sim-${Date.now()}`;
    mermaid.render(id, codigo)
      .then(({ svg }) => { if (!cancelado) { setSvg(svg); setErro(''); } })
      .catch((e: unknown) => { if (!cancelado) setErro(e instanceof Error ? e.message : String(e)); });
    return () => { cancelado = true; };
  }, [codigo]);

  // Após o SVG entrar no DOM, marca os <g.node> de cada etapa do evento com a
  // classe `cascata-retrabalho` (anclora do CSS de destaque e da animação).
  useEffect(() => {
    if (!svg || !stageRef.current) return;
    const root = stageRef.current;
    for (const r of evento.etapas || []) {
      const nid = etapaNodeId(r.etapaId, r.cenario);
      const node = root.querySelector(`[id*="${nid}"]`);
      if (node) node.classList.add('cascata-retrabalho');
    }
  }, [svg, evento.etapas]);

  const limparAnimacao = useCallback(() => {
    if (!stageRef.current) return;
    stageRef.current.querySelectorAll('.cascata-retrabalho.is-firing')
      .forEach(el => el.classList.remove('is-firing'));
  }, []);

  // Avança a animação até `idx` aplicando `is-firing` em cada etapa em ordem.
  const avancarAte = useCallback((idx: number) => {
    if (!stageRef.current) return;
    limparAnimacao();
    for (let i = 0; i <= idx && i < sequencia.length; i++) {
      const r = sequencia[i];
      const nid = etapaNodeId(r.etapaId, r.cenario);
      const node = stageRef.current.querySelector(`[id*="${nid}"]`);
      if (node) node.classList.add('is-firing');
    }
  }, [sequencia, limparAnimacao]);

  // Loop de animação. Cancelado por Pause e Reset.
  useEffect(() => {
    if (!rodando) return;
    if (passoAtual >= sequencia.length) { setRodando(false); return; }
    const delay = 800 / velocidade;
    timerRef.current = setTimeout(() => {
      const proximo = passoAtual + 1;
      avancarAte(passoAtual);
      setPassoAtual(proximo);
    }, delay);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [rodando, passoAtual, sequencia.length, velocidade, avancarAte]);

  const handlePlay = () => {
    if (passoAtual >= sequencia.length) {
      // chegou ao fim — recomeça do zero
      limparAnimacao();
      setPassoAtual(0);
    }
    setRodando(true);
  };
  const handlePause = () => setRodando(false);
  const handleReset = () => {
    setRodando(false);
    setPassoAtual(0);
    limparAnimacao();
  };

  return (
    <div>
      <div className="cascata-sim-controls">
        <button
          type="button"
          className="btn-save"
          onClick={rodando ? handlePause : handlePlay}
          disabled={sequencia.length === 0}
        >
          {rodando ? '⏸ Pausar' : '▶ Reproduzir'}
        </button>
        <button
          type="button"
          className="btn-cancel"
          onClick={handleReset}
          disabled={sequencia.length === 0}
        >
          ⟲ Reset
        </button>
        <span className="label">Velocidade:</span>
        <div className="speed-grp">
          {[0.5, 1, 2].map(v => (
            <button
              key={v}
              type="button"
              className={velocidade === v ? 'active' : ''}
              onClick={() => setVelocidade(v as Velocidade)}
            >
              {v === 0.5 ? '0.5×' : v === 1 ? '1×' : '2×'}
            </button>
          ))}
        </div>
        <span className="label" style={{ marginLeft: 'auto' }}>
          {sequencia.length === 0
            ? 'Sem etapas marcadas'
            : `Passo ${Math.min(passoAtual, sequencia.length)} / ${sequencia.length}`}
        </span>
        <button
          type="button"
          className="btn-action"
          onClick={() => setViewerOpen(true)}
          disabled={!codigo}
          title="Abrir o diagrama em tela cheia"
        >
          ⤢ Ampliar
        </button>
      </div>

      <div className="cascata-sim-stage" style={{ border: '1px solid #e2e8f0', borderRadius: 8, background: '#f8fafc', padding: 14, minHeight: 320 }}>
        {erro ? (
          <div style={{ color: '#dc2626', fontSize: '0.85rem' }}>Erro ao renderizar: {erro}</div>
        ) : !svg ? (
          <div style={{ color: '#64748b', fontSize: '0.85rem' }}>Renderizando…</div>
        ) : (
          <div ref={stageRef} style={{ overflow: 'auto', maxHeight: 520 }} dangerouslySetInnerHTML={{ __html: svg }} />
        )}
      </div>

      <DiagramViewer
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        code={codigo}
        filename={`cascata-evento-${evento.id}`}
        title={`Simulador · ${evento.nome}`}
      />
    </div>
  );
}

// ============================================================
// PÁGINA PRINCIPAL
// ============================================================
export default function CascataPage() {
  const [aba, setAba] = useState<Aba>('eventos');
  const CLUSTER_OPCOES = useClusterCadastroOpcoes();
  const CLUSTER_FILTRO_OPCOES = useClusterFiltroOpcoes();

  // ── Dados base via hooks (Hook-First) ─────────────────────────────────
  const eventosQuery = useCascataEventos();
  // Memoiza para que `eventos` mantenha identidade estável entre renders
  // — evita invalidar useMemo's que dependem dele em cascata.
  const eventos = useMemo(() => eventosQuery.data ?? [], [eventosQuery.data]);
  const { data: projetos = [] } = useProjetosLista();
  const { data: processos = [] } = useProcessosLista();
  const { data: etapas = [] } = useEtapasLista();
  const loaded = !eventosQuery.isLoading;

  const createEvento = useCreateCascataEvento();
  const updateEvento = useUpdateCascataEvento();
  const deleteEvento = useDeleteCascataEvento();

  // Filtros da lista
  const [fCluster, setFCluster] = useState('');
  const [fProcesso, setFProcesso] = useState('');

  // Modal de criação/edição
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [processoRaiz, setProcessoRaiz] = useState('');
  const [cluster, setCluster] = useState('');
  const [etapasSelecionadas, setEtapasSelecionadas] = useState<Set<string>>(new Set());
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState('');

  // Modal de exclusão
  const [confirmDel, setConfirmDel] = useState<CascataEvento | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Seletor do simulador
  const [eventoSimuladorId, setEventoSimuladorId] = useState('');

  const procNome = useMemo(() => new Map(processos.map(p => [p.id, p.name])), [processos]);

  const eventosFiltrados = useMemo(() => eventos.filter(e =>
    (!fCluster || e.cluster === fCluster) &&
    (!fProcesso || (e.processoRaizId === fProcesso || (e.etapas || []).some(et => et.process_id === fProcesso)))
  ), [eventos, fCluster, fProcesso]);

  const eventoSelSimulador = useMemo(
    () => eventos.find(e => e.id === eventoSimuladorId) || null,
    [eventos, eventoSimuladorId],
  );

  // ─── Modal handlers ─────────────────────────────────────────
  const abrirNovo = () => {
    setEditingId(null);
    setNome(''); setDescricao(''); setProcessoRaiz(''); setCluster('');
    setEtapasSelecionadas(new Set());
    setErroForm(''); setModalOpen(true);
  };
  const abrirEdicao = (evt: CascataEvento) => {
    setEditingId(evt.id);
    setNome(evt.nome);
    setDescricao(evt.descricao || '');
    setProcessoRaiz(evt.processoRaizId || '');
    setCluster(evt.cluster || '');
    setEtapasSelecionadas(new Set((evt.etapas || []).map(refKey)));
    setErroForm(''); setModalOpen(true);
  };

  const salvar = async () => {
    if (!nome.trim()) { setErroForm('Preencha o nome do evento.'); return; }
    setSalvando(true);
    setErroForm('');
    try {
      const etapasArr: CascataEventoEtapaRef[] = Array.from(etapasSelecionadas).map(k => {
        const [etapaId, cenario] = k.split('::') as [string, CenarioEtapa];
        return { etapaId, cenario };
      });
      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim(),
        processoRaizId: processoRaiz || null,
        cluster: cluster || undefined,
        etapas: etapasArr,
      };
      if (editingId) {
        await updateEvento.mutateAsync({ id: editingId, patch: payload as Partial<CascataEvento> });
      } else {
        await createEvento.mutateAsync(payload as Partial<CascataEvento>);
      }
      setModalOpen(false);
    } catch (e: unknown) {
      toast.error('Não foi possível salvar o evento', { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSalvando(false);
    }
  };

  const excluir = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await deleteEvento.mutateAsync(confirmDel.id);
      setConfirmDel(null);
      if (eventoSimuladorId === confirmDel.id) setEventoSimuladorId('');
    } catch (e: unknown) {
      toast.error('Não foi possível excluir o evento', { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setDeleting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────
  if (!loaded) return (
    <div className="loading-container"><div className="spinner" /></div>
  );

  return (
    <div className="cascata-page">
      <h1 style={{ margin: '0 0 6px' }}>Cascata · Eventos de Disrupção</h1>
      <p style={{ color: '#475569', fontSize: '0.88rem', margin: '0 0 14px' }}>
        Catalogue eventos que disparam <strong>retrabalho</strong> em etapas específicas dos processos.
        Para cada evento você marca manualmente <em>quais</em> etapas (e em qual cenário, AS-IS ou TO-BE)
        precisam ser refeitas. O simulador exibe o impacto resultante.
      </p>

      <div className="dashv2-tabs" style={{ marginBottom: 12 }}>
        {(['eventos', 'simulador'] as Aba[]).map((id) => (
          <button
            key={id}
            type="button"
            className={`dashv2-tab${aba === id ? ' active' : ''}`}
            onClick={() => setAba(id)}
          >
            {id === 'eventos' ? `Eventos (${eventos.length})` : 'Simulador'}
          </button>
        ))}
      </div>

      {/* =================== ABA EVENTOS =================== */}
      {aba === 'eventos' && (
        <div>
          <FiltrosBar
            filtros={[
              { id: 'casc-cluster', label: 'Cluster', value: fCluster, onChange: setFCluster, options: CLUSTER_FILTRO_OPCOES },
              { id: 'casc-proc', label: 'Processo', value: fProcesso, onChange: setFProcesso, options: [
                { value: '', label: 'Todos os processos' },
                ...processos.map(p => ({ value: p.id, label: p.name })),
              ] },
            ]}
            ativo={!!(fCluster || fProcesso)}
            onLimpar={() => { setFCluster(''); setFProcesso(''); }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '10px 0' }}>
            <button className="btn-save" onClick={abrirNovo}>+ Novo Evento</button>
          </div>

          {eventosFiltrados.length === 0 ? (
            <div style={{ color: '#64748b', fontSize: '0.85rem', padding: 24, textAlign: 'center', background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: 8 }}>
              Nenhum evento cadastrado. Use "+ Novo Evento" para começar.
            </div>
          ) : (
            <div className="dashv2-table-wrap">
              <table className="cascata-evt-table">
                <thead>
                  <tr>
                    <th>Evento</th>
                    <th>Processo raiz</th>
                    <th>Cluster</th>
                    <th>Etapas afetadas</th>
                    <th style={{ width: 160 }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {eventosFiltrados.map(evt => (
                    <tr key={evt.id}>
                      <td>
                        <strong>{evt.nome}</strong>
                        {evt.descricao && <div style={{ color: '#64748b', fontSize: '0.78rem', marginTop: 2 }}>{evt.descricao}</div>}
                      </td>
                      <td>{evt.processoRaizId ? (procNome.get(evt.processoRaizId) || evt.processoRaizId) : '—'}</td>
                      <td>{evt.cluster || '—'}</td>
                      <td>
                        {(evt.etapas || []).length === 0 ? (
                          <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>nenhuma</span>
                        ) : (
                          <div>
                            <span style={{ fontWeight: 600 }}>{(evt.etapas || []).length}</span>{' '}
                            <span style={{ color: '#64748b', fontSize: '0.78rem' }}>
                              em {new Set((evt.etapas || []).map(e => e.process_id)).size} processo(s)
                            </span>
                          </div>
                        )}
                      </td>
                      <td>
                        <button className="btn-action-sm" onClick={() => abrirEdicao(evt)}>Editar</button>{' '}
                        <button
                          className="btn-action-sm"
                          onClick={() => { setEventoSimuladorId(evt.id); setAba('simulador'); }}
                          title="Abrir no simulador"
                        >Simular</button>{' '}
                        <button className="btn-action-sm" style={{ color: '#b91c1c' }} onClick={() => setConfirmDel(evt)}>Excluir</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =================== ABA SIMULADOR =================== */}
      {aba === 'simulador' && (
        <div>
          <div style={{ maxWidth: 520, marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: 4 }}>
              Evento a simular
            </label>
            <Select
              value={eventoSimuladorId}
              onChange={setEventoSimuladorId}
              options={[
                { value: '', label: 'Selecione um evento…' },
                ...eventos.map(e => ({ value: e.id, label: e.nome })),
              ]}
              placeholder="Selecione um evento…"
            />
          </div>

          {!eventoSelSimulador ? (
            <div style={{ color: '#64748b', fontSize: '0.85rem', padding: 24, textAlign: 'center', background: '#f8fafc', border: '1px dashed #e2e8f0', borderRadius: 8 }}>
              Escolha um evento acima para simular o impacto.
            </div>
          ) : (
            <SimuladorEvento evento={eventoSelSimulador} etapas={etapas} />
          )}
        </div>
      )}

      {/* =================== MODAL NOVO/EDIT =================== */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="modal" style={{ maxWidth: '95vw', width: 760 }}>
          <h2>{editingId ? 'Editar evento' : 'Novo evento de disrupção'}</h2>

          <FormField label="Nome" required error={erroForm}>
            <input
              type="text"
              value={nome}
              onChange={(e) => { setNome(e.target.value); if (erroForm) setErroForm(''); }}
              placeholder="Ex.: Alteração no contrato societário"
            />
          </FormField>
          <FormField label="Descrição">
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Quando este evento dispara o retrabalho?"
            />
          </FormField>
          <div className="form-row" style={{ display: 'flex', gap: 12 }}>
            <FormField label="Processo raiz">
              <Select
                value={processoRaiz}
                onChange={setProcessoRaiz}
                options={[
                  { value: '', label: '— sem processo raiz —' },
                  ...processos.map(p => ({ value: p.id, label: p.name })),
                ]}
                placeholder="— sem processo raiz —"
              />
            </FormField>
            <FormField label="Cluster">
              <Select
                value={cluster}
                onChange={setCluster}
                options={CLUSTER_OPCOES}
                placeholder="—"
              />
            </FormField>
          </div>

          <div style={{ marginTop: 12 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', color: '#475569', marginBottom: 6, fontWeight: 600 }}>
              Etapas refeitas quando este evento ocorre
            </label>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
              Selecione manualmente as etapas afetadas. Etapas com projeção TO-BE permitem marcar o cenário projetado também.
              <span style={{ marginLeft: 6 }}>
                <strong>{etapasSelecionadas.size}</strong> etapa{etapasSelecionadas.size === 1 ? '' : 's'} marcada{etapasSelecionadas.size === 1 ? '' : 's'}.
              </span>
            </div>
            <SeletorEtapas
              projetos={projetos}
              processos={processos}
              etapas={etapas}
              selecionadas={etapasSelecionadas}
              onChange={setEtapasSelecionadas}
            />
          </div>

          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)} disabled={salvando}>Cancelar</button>
            <button className="btn-save" onClick={salvar} disabled={salvando}>
              {salvando ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Criar evento'}
            </button>
          </div>
        </div>
      </Modal>

      {/* =================== MODAL EXCLUSÃO =================== */}
      <Modal isOpen={!!confirmDel} onClose={() => setConfirmDel(null)}>
        <div className="modal">
          <h2>Excluir evento</h2>
          <p>
            Tem certeza que deseja excluir <strong>{confirmDel?.nome}</strong>? Esta ação não pode ser desfeita.
          </p>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setConfirmDel(null)} disabled={deleting}>Cancelar</button>
            <button className="btn-save" style={{ background: '#b91c1c' }} onClick={excluir} disabled={deleting}>
              {deleting ? 'Excluindo…' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
