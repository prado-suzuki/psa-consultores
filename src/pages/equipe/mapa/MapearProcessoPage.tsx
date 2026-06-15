// Página única "Mapear processo" — substitui os múltiplos modais antes acessíveis pelo card.
// 4 abas (todas montadas, visibilidade alternada por CSS para carregamento instantâneo):
//   - Entradas / Saídas (visão agregada de documentos)
//   - Como era (view + Editar Etapas)
//   - Como ficou (view + Editar Etapas)
//   - Configurar ROI (wizard inline)
// Histórico de medições fica acessível via botão no header.

import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, ArrowLeft, Layers, Pencil, Settings2 } from 'lucide-react';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import ChipSelector from '@/components/equipe/mapa/ChipSelector';
import DecimalInput from '@/components/equipe/mapa/DecimalInput';
import Select from '@/components/equipe/mapa/Select';
import StatusBadge from '@/components/equipe/mapa/StatusBadge';
import WizardRoi from '@/components/equipe/mapa/WizardRoi';
import EmptyStateCadastro from '@/components/equipe/mapa/cadastro/EmptyStateCadastro';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';
import { toast } from 'sonner';
import type { Etapa, DocRef, ResponsavelEtapa } from '@/types';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { formatDecimal } from '@/utils/format';
import NovoDocumentoModal from '@/components/equipe/mapa/cadastros/NovoDocumentoModal';
import NovoSistemaModal from '@/components/equipe/mapa/cadastros/NovoSistemaModal';
import NovoResponsavelModal from '@/components/equipe/mapa/cadastros/NovoResponsavelModal';
import NovoGargaloModal from '@/components/equipe/mapa/cadastros/NovoGargaloModal';
import {
  useProcessoUnico, useEtapasLista, useDocumentosLista, useSistemasLista,
  useResponsaveisLista, useGargalosLista, useMelhoriasLista,
} from '@/hooks/useDominioListas';
import { useCreateEtapa, useUpdateEtapa, useDeleteEtapa, useUpsertEtapaToBe } from '@/hooks/useEtapas';
import ProcessoFormModal from '@/components/equipe/mapa/cadastro/ProcessoFormModal';
import TourTrigger from '@/components/equipe/mapa/tour/TourTrigger';

const EXECUCAO_OPCOES = [
  { value: 'manual', label: 'Manual' },
  { value: 'semi_automatica', label: 'Semi-Automática' },
  { value: 'automatica', label: 'Automática' },
];

type Aba = 'como-era' | 'como-ficou' | 'configurar-roi';

const ABAS: { id: Aba; label: string }[] = [
  { id: 'como-era',        label: 'Como era' },
  { id: 'como-ficou',      label: 'Como ficou' },
  { id: 'configurar-roi',  label: 'Configurar ROI' },
];

// Ordem canônica das etapas (a reordenação é persistida na coluna `ordem`).
const ordenarPorOrdem = (a: Etapa, b: Etapa) => (a.stage_order ?? 0) - (b.stage_order ?? 0);

export default function MapearProcessoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [aba, setAba] = useState<Aba>('como-era');
  const [editProcessoOpen, setEditProcessoOpen] = useState(false);

  // ── Dados base via hooks (Hook-First) ──────────────────────────────────
  const processoQuery = useProcessoUnico(id);
  const { data: rawEtapas = [] } = useEtapasLista();
  const { data: documentos = [] } = useDocumentosLista();
  const { data: sistemas = [] } = useSistemasLista();
  const { data: responsaveis = [] } = useResponsaveisLista();
  const { data: gargalos = [] } = useGargalosLista();
  const { data: melhorias = [] } = useMelhoriasLista();
  const processo = processoQuery.data ?? null;
  const loading = processoQuery.isLoading;
  // Etapas hidratadas e filtradas para este processo.
  const etapas = useMemo(() => {
    if (!id) return [] as Etapa[];
    const filtered = rawEtapas.filter(e => e.process_id === id).sort(ordenarPorOrdem);
    return enrichEtapas(filtered, documentos, sistemas, responsaveis);
  }, [id, rawEtapas, documentos, sistemas, responsaveis]);

  // ── Mutations (Hook-First) ─────────────────────────────────────────────
  const createEtapa = useCreateEtapa();
  const updateEtapa = useUpdateEtapa();
  const deleteEtapa = useDeleteEtapa();
  const upsertEtapaToBe = useUpsertEtapaToBe();

  // Edit Etapas (modal) — usado por "Como era" e "Como ficou"
  const [editEtapasOpen, setEditEtapasOpen] = useState(false);
  const [editEtapasMode, setEditEtapasMode] = useState<'era' | 'ficou'>('era');
  const [editEtapasList, setEditEtapasList] = useState<Etapa[]>([]);
  const [editEtapasActiveIndex, setEditEtapasActiveIndex] = useState(0);
  const [editEtapasSaving, setEditEtapasSaving] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  // IDs de etapas existentes removidas no modal — deletadas no banco ao salvar.
  const [removedEtapaIds, setRemovedEtapaIds] = useState<Set<string>>(new Set());

  // Cadastro rápido a partir das listas suspensas do editor de etapas —
  // permite criar documento/sistema/responsável sem sair do fluxo. As listas
  // de opções atualizam sozinhas via invalidação do React Query.
  const [cadastroRapido, setCadastroRapido] = useState<'documento' | 'sistema' | 'responsavel' | 'gargalo' | null>(null);

  const docNames = useMemo(() => documentos.map(d => d.nome), [documentos]);
  const sisNames = useMemo(() => sistemas.map(s => s.nome), [sistemas]);
  const respNames = useMemo(() => responsaveis.map(r => r.name), [responsaveis]);
  const gargaloNames = useMemo(() => gargalos.map(g => g.nome), [gargalos]);

  // Mapas nome↔id para resolver os vínculos no save (o editor opera por nome;
  // as junções persistem por id). O nome é a fonte de verdade na UI — o
  // ChipSelector mantém o id antigo ao trocar o nome do chip.
  const docIdByNome = useMemo(() => new Map(documentos.map(d => [d.nome, d.id])), [documentos]);
  const sisIdByNome = useMemo(() => new Map(sistemas.map(s => [s.nome, s.id])), [sistemas]);
  const respIdByNome = useMemo(() => new Map(responsaveis.map(r => [r.name, r.id])), [responsaveis]);
  const gargaloNomeById = useMemo(() => new Map(gargalos.map(g => [g.id, g.nome])), [gargalos]);
  const gargaloIdByNome = useMemo(() => new Map(gargalos.map(g => [g.nome, g.id])), [gargalos]);

  if (loading) {
    return <div className="loading-container"><div className="spinner" /></div>;
  }
  if (!processo) {
    return (
      <div className="card">
        <h2>Processo não encontrado</h2>
        <p>O processo solicitado não existe ou foi removido.</p>
        <Link to="/equipe/digital/mapa/processos" className="btn-add">Voltar aos processos</Link>
      </div>
    );
  }

  // ============================================================
  //  Handlers — Editar Etapas (Como era / Como ficou)
  // ============================================================
  const cleanEtapaName = (nome: string): string => {
    const match = nome.match(/^Etapa\s*\d+\s*:\s*/i);
    return match ? nome.slice(match[0].length).trim() : nome;
  };

  const cleanEtapa = (e: Etapa): Etapa => ({
    ...e,
    docsEntrada: (e.docsEntrada || []).filter(d => d.nome?.trim()),
    docsSaida: (e.docsSaida || []).filter(d => d.nome?.trim()),
    executadoPor: (e.executadoPor || []).filter(r => r.nome?.trim()),
    sistemas: (e.sistemas || []).filter(s => s?.trim()),
    gargalos: (e.gargalos || []).filter(g => g?.trim()),
  });

  const openEditEtapas = (mode: 'era' | 'ficou', focusEtapaId?: string) => {
    const snapshotsEtapas = etapas.map(e => cleanEtapa({ ...e, name: cleanEtapaName(e.name) }));
    let prepared: Etapa[];
    if (mode === 'era') {
      prepared = snapshotsEtapas;
    } else {
      // Ficou: se já há projeção salva → carrega ela; senão → clona da era
      // em memória (não persiste até "Salvar todas").
      prepared = snapshotsEtapas.map(eraEtapa => {
        const f = eraEtapa.ficou;
        return {
          ...eraEtapa,
          description: f?.description ?? eraEtapa.description,
          execution: f?.execution ?? eraEtapa.execution,
          lead_time_days: f?.lead_time_days ?? eraEtapa.lead_time_days,
          volume_per_process: f?.volume_per_process ?? eraEtapa.volume_per_process,
          error_rate: f?.error_rate ?? eraEtapa.error_rate,
          rework_rate: f?.rework_rate ?? eraEtapa.rework_rate ?? 0,
          error_cost: f?.error_cost ?? eraEtapa.error_cost,
          error_volume: f?.error_volume ?? eraEtapa.error_volume,
          executadoPor: f?.executadoPor ?? eraEtapa.executadoPor,
          sistemas: f?.sistemas ?? eraEtapa.sistemas,
          docsEntrada: f?.docsEntrada ?? eraEtapa.docsEntrada,
          docsSaida: f?.docsSaida ?? eraEtapa.docsSaida,
        };
      });
    }
    const focoIdx = focusEtapaId ? prepared.findIndex(e => e.id === focusEtapaId) : -1;
    setEditEtapasMode(mode);
    setEditEtapasList(prepared);
    setEditEtapasActiveIndex(focoIdx >= 0 ? focoIdx : 0);
    setRemovedEtapaIds(new Set());
    setEditEtapasOpen(true);
  };

  const handleDragStart = (index: number) => setDraggedIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    const list = [...editEtapasList];
    const [moved] = list.splice(draggedIndex, 1);
    list.splice(index, 0, moved);
    setEditEtapasList(list);
    setDraggedIndex(index);
    setEditEtapasActiveIndex(index);
  };
  const handleDrop = () => setDraggedIndex(null);

  const handleUpdateEtapaField = <K extends keyof Etapa>(index: number, field: K, value: Etapa[K]) => {
    setEditEtapasList(prev => {
      const list = [...prev];
      list[index] = { ...list[index], [field]: value };
      return list;
    });
  };

  // Nova etapa em branco — já atrelada ao processo atual (o modal vive dentro
  // de um processo, então process_id é automático).
  const addNovaEtapa = () => {
    const nova = {
      id: `etp-novo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      process_id: processo.id,
      name: '',
      description: '',
      execution: 'manual',
      docsEntrada: [],
      docsSaida: [],
      executadoPor: [],
      volumeMensal: 0,
      sistemas: [],
      rework_rate: 0,
    } as Etapa;
    const novaLista = [...editEtapasList, nova];
    setEditEtapasList(novaLista);
    setEditEtapasActiveIndex(novaLista.length - 1);
  };

  // Remove a etapa ativa da lista do modal. A remoção só é aplicada no banco ao
  // "Salvar todas" (fechar sem salvar desfaz) — por isso não usa window.confirm,
  // que é bloqueado em alguns navegadores embutidos. A última etapa fica protegida.
  const handleExcluirEtapa = (index: number) => {
    const etapa = editEtapasList[index];
    if (!etapa || editEtapasList.length <= 1) return;
    const tamanhoAntes = editEtapasList.length;
    setEditEtapasList(prev => prev.filter((_, i) => i !== index));
    if (etapas.some(e => e.id === etapa.id)) {
      setRemovedEtapaIds(prev => {
        const next = new Set(prev);
        next.add(etapa.id);
        return next;
      });
    }
    setEditEtapasActiveIndex(prev => Math.min(prev, tamanhoAntes - 2));
  };

  // O editor opera por nome (ChipSelector); as junções persistem por id.
  // O nome manda: trocar o nome de um chip troca o vínculo, mesmo que o id
  // antigo tenha ficado no objeto.
  const resolverVinculos = (e: Etapa): Etapa => ({
    ...e,
    docsEntrada: (e.docsEntrada || []).map(d => ({ ...d, documentoId: docIdByNome.get(d.nome) ?? d.documentoId })),
    docsSaida: (e.docsSaida || []).map(d => ({ ...d, documentoId: docIdByNome.get(d.nome) ?? d.documentoId })),
    executadoPor: (e.executadoPor || []).map(r => ({ ...r, responsavelId: respIdByNome.get(r.nome) ?? r.responsavelId })),
    sistemas: (e.sistemas || []).map(s => sisIdByNome.get(s) ?? s),
  });

  const handleSaveEtapas = async () => {
    if (!processo) return;
    setEditEtapasSaving(true);
    const cleaned = editEtapasList.map(cleanEtapa).map(resolverVinculos);
    try {
      const existingIds = new Set(etapas.map(e => e.id));
      for (let i = 0; i < cleaned.length; i++) {
        const e = { ...cleaned[i], stage_order: i + 1 };
        if (editEtapasMode === 'era') {
          if (existingIds.has(e.id)) {
            await updateEtapa.mutateAsync({ id: e.id, patch: e as Partial<Etapa>, old: e });
          } else {
            // Etapa nova: o id local é provisório — o banco gera o uuid.
            const { id: _tempId, ...semId } = e;
            void _tempId;
            await createEtapa.mutateAsync(semId as Partial<Etapa> as never);
          }
        } else {
          // mode === 'ficou' — projeção TO-BE via hook (upsert id+scenario).
          if (!existingIds.has(e.id)) continue;
          await upsertEtapaToBe.mutateAsync({ etapa: e, process_id: processo.id });
        }
      }
      // Etapas removidas no modal: deleta do banco (somente as que já existiam).
      if (editEtapasMode === 'era') {
        for (const rid of removedEtapaIds) {
          await deleteEtapa.mutateAsync({ id: rid, old: { id: rid } as Etapa });
        }
      }
      // React Query invalida a lista de etapas (process_stages) nos onSuccess
      // dos hooks — a UI rerenderiza com o estado fresco.
      setEditEtapasOpen(false);
    } catch (err) {
      toast.error('Erro ao salvar etapas', { description: err instanceof Error ? err.message : String(err) });
    } finally {
      setEditEtapasSaving(false);
    }
  };

  const handleSnapshotCriado = () => {
    // Invalida o processo para refletir `mapeado_em` (atualizado quando a
    // 1ª mensuração é salva). React Query refaz o GET sob demanda.
    if (id) queryClient.invalidateQueries({ queryKey: ['processes', id] });
  };

  // ============================================================
  //  Helpers de visualização
  // ============================================================
  const sumHorasEtapa = (e: Etapa, ficou = false): number => {
    const sum = (arr?: ResponsavelEtapa[]) =>
      (arr || []).reduce((s, r) => s + (r.horas || 0), 0);
    if (!ficou) return sum(e.executadoPor);
    // No ficou, usa os arrays do espelho lateral (com fallback para a era
    // quando não há projeção salva).
    const exec = e.ficou?.executadoPor ?? e.executadoPor;
    return sum(exec);
  };

  const fmtPct = (v: number) => formatDecimal((v || 0) * 100);

  // ============================================================
  //  Render
  // ============================================================
  return (
    <div className="card cadastro-shell mapear-shell">
      <div className="mapear-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button
          className="mapear-voltar"
          onClick={() => navigate('/equipe/digital/mapa/processos')}
          title="Voltar à listagem de processos"
        >
          <ArrowLeft size={16} strokeWidth={2.2} />
          <span>Processos</span>
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <TourTrigger />
          <button
            className="mapear-voltar"
            onClick={() => setEditProcessoOpen(true)}
            title="Editar este processo"
          >
            <Settings2 size={15} strokeWidth={2.2} />
            <span>Editar processo</span>
          </button>
        </div>
      </div>

      <div className="mapear-header">
        <span className="cadastro-eyebrow">
          <span className="cadastro-eyebrow-dot" aria-hidden="true" />
          Mapeamento
        </span>
        <h1 className="mapear-title">{processo.name}</h1>
        {processo.description && <p className="mapear-desc">{processo.description}</p>}
        <div className="mapear-badges">
          {processo.evaluation_status && processo.evaluation_status !== 'Não avaliado' && (
            <StatusBadge variant="diagnostic">{processo.evaluation_status}</StatusBadge>
          )}
          <span className={`mapear-etapas-chip${etapas.length === 0 ? ' vazio' : ''}`}>
            {etapas.length === 0
              ? 'Sem etapas ainda'
              : `${etapas.length} ${etapas.length === 1 ? 'etapa mapeada' : 'etapas mapeadas'}`}
          </span>
        </div>
      </div>

      {/* Navegação por abas — indicador deslizante (framer) */}
      <div className="mapear-tabs" role="tablist">
        {ABAS.map(a => {
          const ativa = aba === a.id;
          return (
            <button
              key={a.id}
              role="tab"
              aria-selected={ativa}
              className={`mapear-tab${ativa ? ' ativa' : ''}`}
              onClick={() => setAba(a.id)}
            >
              <Tooltip text={dica(
                a.id === 'como-era' ? 'mapear.aba.comoEra'
                : a.id === 'como-ficou' ? 'mapear.aba.comoFicou'
                : 'mapear.aba.configurarRoi'
              )}>{a.label}</Tooltip>
              {ativa && (
                <motion.span
                  layoutId="mapearTabInd"
                  className="mapear-tab-ind"
                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Painel das abas */}
      <div className="mapear-painel">
        {/* "Configurar ROI" fica sempre montado para preservar o estado do wizard */}
        <div style={{ display: aba === 'configurar-roi' ? 'block' : 'none' }}>
          <WizardRoi
            processo={processo}
            etapas={etapas}
            responsaveis={responsaveis}
            sistemas={sistemas}
            gargalos={gargalos.filter(g => (g.processos || []).includes(processo.id))}
            melhorias={melhorias}
            onSnapshotCriado={handleSnapshotCriado}
            onEditarEtapas={(etapaId) => openEditEtapas('era', etapaId)}
          />
        </div>

        <AnimatePresence mode="wait">
          {aba === 'como-era' && (
            <motion.div
              key="como-era"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <ComoEraView
                etapas={etapas}
                fmtPct={fmtPct}
                sumHorasEtapa={sumHorasEtapa}
                gargaloNomeById={gargaloNomeById}
                onEditar={() => openEditEtapas('era')}
              />
            </motion.div>
          )}
          {aba === 'como-ficou' && (
            <motion.div
              key="como-ficou"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <ComoFicouView
                etapas={etapas}
                fmtPct={fmtPct}
                sumHorasEtapa={sumHorasEtapa}
                onEditar={() => openEditEtapas('ficou')}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Editar Etapas */}
      <Modal isOpen={editEtapasOpen} onClose={() => setEditEtapasOpen(false)}>
        {(() => {
          const active = editEtapasList[editEtapasActiveIndex];
          if (!active) return null;
          const isFicou = editEtapasMode === 'ficou';
          return (
            <div className="modal-etapas edit-modal">
              <div className="modal-header">
                <h2>{isFicou ? 'Editar Etapas — Como Ficou' : 'Editar Etapas — Como Era'}</h2>
                <span className="etapas-count" aria-label={`${editEtapasList.length} etapas`}>
                  {editEtapasList.length} {editEtapasList.length === 1 ? 'etapa' : 'etapas'}
                </span>
              </div>
              <div className="etapas-layout">
                <aside className="etapas-sidebar" aria-label="Lista de etapas do processo">
                  <div className="etapas-sidebar-header">Etapas do processo</div>
                  <ol className="etapas-sidebar-list">
                    {editEtapasList.map((e, i) => {
                      const rotulo = cleanEtapaName(e.name) || 'Nova etapa';
                      const isActive = i === editEtapasActiveIndex;
                      return (
                        <li
                          key={e.id}
                          draggable={editEtapasMode === 'era'}
                          className={`etapas-sidebar-item${isActive ? ' active' : ''}${draggedIndex === i ? ' dragging' : ''}`}
                          onClick={() => setEditEtapasActiveIndex(i)}
                          onDragStart={() => handleDragStart(i)}
                          onDragOver={(ev) => handleDragOver(ev, i)}
                          onDrop={handleDrop}
                          onDragEnd={handleDrop}
                          title={editEtapasMode === 'era' ? 'Arraste para reordenar' : rotulo}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); setEditEtapasActiveIndex(i); } }}
                        >
                          {editEtapasMode === 'era' && (
                            <span className="etapas-sidebar-handle" aria-hidden="true" title="Arraste para reordenar">
                              <svg width="10" height="14" viewBox="0 0 10 14" fill="none">
                                <circle cx="2" cy="3" r="1.2" fill="currentColor"/>
                                <circle cx="2" cy="7" r="1.2" fill="currentColor"/>
                                <circle cx="2" cy="11" r="1.2" fill="currentColor"/>
                                <circle cx="8" cy="3" r="1.2" fill="currentColor"/>
                                <circle cx="8" cy="7" r="1.2" fill="currentColor"/>
                                <circle cx="8" cy="11" r="1.2" fill="currentColor"/>
                              </svg>
                            </span>
                          )}
                          <span className="etapas-sidebar-num">{i + 1}</span>
                          <span className="etapas-sidebar-name">{rotulo}</span>
                        </li>
                      );
                    })}
                  </ol>
                  {editEtapasMode === 'era' && (
                    <button
                      className="etapas-sidebar-add"
                      onClick={addNovaEtapa}
                      title="Adicionar nova etapa ao final"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="12" y1="5" x2="12" y2="19"/>
                        <line x1="5" y1="12" x2="19" y2="12"/>
                      </svg>
                      Adicionar etapa
                    </button>
                  )}
                </aside>
                <div className="etapas-form-area">
                <div className="modal-section">
                  <div className="modal-section-title"><Tooltip text={dica('mapear.secao.identificacao')}>Identificação</Tooltip></div>
                  <FormField label="Nome" compact tooltip={dica('mapear.etapa.nome')}>
                    <input type="text" value={active.name} onChange={(e) => handleUpdateEtapaField(editEtapasActiveIndex, 'name', e.target.value)} />
                  </FormField>
                  <FormField label="Descrição" compact tooltip={dica('mapear.etapa.descricao')}>
                    <textarea value={active.description} onChange={(e) => handleUpdateEtapaField(editEtapasActiveIndex, 'description', e.target.value)} />
                  </FormField>
                </div>

                <div className="modal-section">
                  <div className="modal-section-title"><Tooltip text={dica('mapear.secao.operacao')}>Operação</Tooltip></div>
                  <div className="form-row">
                    <FormField label="Execução" compact tooltip={dica('mapear.etapa.execution')}>
                      <Select
                        value={active.execution || ''}
                        onChange={(v) => handleUpdateEtapaField(editEtapasActiveIndex, 'execution', v)}
                        options={EXECUCAO_OPCOES}
                        placeholder="Selecione..."
                        compact
                      />
                    </FormField>
                  </div>
                  {editEtapasMode === 'ficou' && (
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                      As melhorias associadas a este processo são gerenciadas em
                      <strong> Melhorias → editar</strong>. Esta etapa herda automaticamente
                      todas as melhorias vinculadas ao processo.
                    </div>
                  )}
                </div>

                <div className="modal-section">
                  <div className="modal-section-title"><Tooltip text={dica('mapear.secao.documentos')}>Documentos</Tooltip></div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 6 }}>
                    O número ao lado de cada documento indica o <strong>volume por execução</strong>.
                  </div>
                  <FormField label="Docs Entrada" compact tooltip={dica('mapear.etapa.docsEntrada')}>
                    <ChipSelector options={docNames} value={active.docsEntrada || []}
                      onChange={(v) => handleUpdateEtapaField(editEtapasActiveIndex, 'docsEntrada', v as DocRef[])} withVolume compact
                      onAddNew={() => setCadastroRapido('documento')} addNewLabel="Cadastrar novo documento" />
                  </FormField>
                  <FormField label="Docs Saída" compact tooltip={dica('mapear.etapa.docsSaida')}>
                    <ChipSelector options={docNames} value={active.docsSaida || []}
                      onChange={(v) => handleUpdateEtapaField(editEtapasActiveIndex, 'docsSaida', v as DocRef[])} withVolume compact
                      onAddNew={() => setCadastroRapido('documento')} addNewLabel="Cadastrar novo documento" />
                  </FormField>
                </div>

                <div className="modal-section">
                  <div className="modal-section-title"><Tooltip text={dica('mapear.secao.equipe')}>Equipe — horas por pessoa</Tooltip></div>
                  <FormField label="Executado por" compact tooltip={dica('mapear.etapa.executadoPor')}>
                    <ChipSelector
                      options={respNames}
                      value={active.executadoPor || []}
                      onChange={(v) => handleUpdateEtapaField(editEtapasActiveIndex, 'executadoPor', v as ResponsavelEtapa[])}
                      withHours
                      compact
                      addLabel="Adicionar executor"
                      onAddNew={() => setCadastroRapido('responsavel')}
                      addNewLabel="Cadastrar novo responsável"
                    />
                  </FormField>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                    Horas gasta por projeto: <strong>{formatDecimal(sumHorasEtapa(active, isFicou), 'h')}</strong>
                  </div>
                </div>

                <div className="modal-section">
                  <div className="modal-section-title"><Tooltip text={dica('mapear.secao.metricas')}>Métricas</Tooltip></div>
                  <div className="form-row">
                    <FormField label="Volume por processo" compact tooltip={dica('mapear.etapa.volume_per_process')}>
                      <DecimalInput value={active.volume_per_process || 0} onChange={(n) => handleUpdateEtapaField(editEtapasActiveIndex, 'volume_per_process', n)} min={0} />
                    </FormField>
                    <FormField label="Taxa Erros (%)" compact tooltip={dica('mapear.etapa.error_rate')}>
                      <DecimalInput
                        value={(active.error_rate ?? 0) * 100}
                        onChange={(n) => handleUpdateEtapaField(editEtapasActiveIndex, 'error_rate', n / 100)}
                        min={0}
                        max={100}
                        placeholder="Ex: 5"
                      />
                    </FormField>
                  </div>
                  <FormField label="Taxa Retrabalho (%)" compact tooltip={dica('mapear.etapa.rework_rate')}>
                    <DecimalInput
                      value={(active.rework_rate || 0) * 100}
                      onChange={(n) => handleUpdateEtapaField(editEtapasActiveIndex, 'rework_rate', n / 100)}
                      min={0}
                      max={100}
                      placeholder="Ex: 15"
                    />
                  </FormField>
                </div>

                <div className="modal-section">
                  <div className="modal-section-title"><Tooltip text={dica('mapear.secao.sistemas')}>Sistemas</Tooltip></div>
                  <FormField label="Sistemas" compact tooltip={dica('mapear.etapa.sistemas')}>
                    <ChipSelector options={sisNames} value={active.sistemas || []}
                      onChange={(v) => handleUpdateEtapaField(editEtapasActiveIndex, 'sistemas', v as string[])} compact
                      onAddNew={() => setCadastroRapido('sistema')} addNewLabel="Cadastrar novo sistema" />
                  </FormField>
                  {(active.sistemas || []).filter(Boolean).length > 0 && (
                    <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#64748b' }}>
                      O rateio (%) do custo por cluster é configurado em <strong>Sistemas → editar sistema → Rateio por cluster</strong>.
                    </div>
                  )}
                </div>

                {!isFicou && (
                  <div className="modal-section">
                    <div className="modal-section-title">
                      <Tooltip text="Gargalos que se manifestam nesta etapa. A cascata e o diagnóstico de ROI derivam deste vínculo.">Gargalos</Tooltip>
                    </div>
                    <FormField label="Gargalos da etapa" compact tooltip="Selecione os gargalos que se manifestam nesta etapa, ou cadastre um novo sem sair do fluxo.">
                      <ChipSelector
                        options={gargaloNames}
                        value={(active.gargalos || []).map(gid => gargaloNomeById.get(gid) ?? gid)}
                        onChange={(v) => handleUpdateEtapaField(
                          editEtapasActiveIndex,
                          'gargalos',
                          (v as string[]).map(n => gargaloIdByNome.get(n) ?? n),
                        )}
                        compact
                        addLabel="Adicionar gargalo"
                        onAddNew={() => setCadastroRapido('gargalo')}
                        addNewLabel="Cadastrar novo gargalo"
                      />
                    </FormField>
                  </div>
                )}

                </div>
              </div>
              <div className="modal-footer">
                {editEtapasMode === 'era' ? (
                  <button
                    className="btn-delete-etapa"
                    onClick={() => handleExcluirEtapa(editEtapasActiveIndex)}
                    disabled={editEtapasList.length <= 1}
                    title={editEtapasList.length <= 1 ? 'O processo precisa de ao menos uma etapa' : 'Excluir esta etapa'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      <path d="M10 11v6"/>
                      <path d="M14 11v6"/>
                    </svg>
                    Excluir esta etapa
                  </button>
                ) : <span />}
                <div className="modal-footer-actions">
                  <button className="btn-cancel" onClick={() => setEditEtapasOpen(false)}>Cancelar</button>
                  <button className="btn-save" onClick={handleSaveEtapas} disabled={editEtapasSaving}>{editEtapasSaving ? 'Salvando...' : 'Salvar todas'}</button>
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Cadastro rápido a partir do editor de etapas */}
      <ProcessoFormModal aberto={editProcessoOpen} processo={processo} onClose={() => setEditProcessoOpen(false)} />
      <NovoDocumentoModal isOpen={cadastroRapido === 'documento'} onClose={() => setCadastroRapido(null)} />
      <NovoSistemaModal isOpen={cadastroRapido === 'sistema'} onClose={() => setCadastroRapido(null)} />
      <NovoResponsavelModal isOpen={cadastroRapido === 'responsavel'} onClose={() => setCadastroRapido(null)} />
      <NovoGargaloModal
        isOpen={cadastroRapido === 'gargalo'}
        onClose={() => setCadastroRapido(null)}
        onCreated={(g) => {
          const atual = editEtapasList[editEtapasActiveIndex];
          if (!atual) return;
          handleUpdateEtapaField(editEtapasActiveIndex, 'gargalos', [...(atual.gargalos || []), g.id]);
        }}
      />
    </div>
  );
}

// ============================================================
//  Sub-views (puramente apresentacionais)
// ============================================================

const EXEC_LABEL: Record<string, string> = {
  manual: 'Manual',
  semi_automatica: 'Semi-automática',
  automatica: 'Automática',
};
const execLabel = (v?: string) => (v ? (EXEC_LABEL[v] ?? v) : '—');

function docChips(arr?: DocRef[]) {
  const itens = (arr || []).filter(d => d.nome?.trim());
  if (!itens.length) return <span className="mapear-vazio">—</span>;
  return itens.map((d, i) => (
    <span key={`${d.nome}-${i}`} className="mapear-chip">
      {d.nome}{(d.volume || 0) > 0 && <em className="mapear-chip-vol">{formatDecimal(d.volume)}</em>}
    </span>
  ));
}
function pessoaChips(arr?: ResponsavelEtapa[]) {
  const itens = (arr || []).filter(r => r.nome?.trim());
  if (!itens.length) return <span className="mapear-vazio">—</span>;
  return itens.map((r, i) => (
    <span key={`${r.nome}-${i}`} className="mapear-chip teal">
      {r.nome}{r.horas != null && <em className="mapear-chip-vol">{formatDecimal(r.horas || 0, 'h')}</em>}
    </span>
  ));
}
function sistemaChips(arr?: string[]) {
  const itens = (arr || []).filter(Boolean);
  if (!itens.length) return <span className="mapear-vazio">—</span>;
  return itens.map((s, i) => <span key={`${s}-${i}`} className="mapear-chip indigo">{s}</span>);
}

function EtapaCampo({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mapear-campo">
      <span className="mapear-campo-label">{label}</span>
      <div className="mapear-chips">{children}</div>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="mapear-metric">
      <span className="mapear-metric-label">{label}</span>
      <strong className="mapear-metric-val">{value}</strong>
    </div>
  );
}
function MapearTabHead({ titulo, subtitulo, onEditar }: { titulo: string; subtitulo: string; onEditar: () => void }) {
  return (
    <div className="mapear-tab-head">
      <div className="mapear-tab-head-txt">
        <h3 className="mapear-tab-titulo">{titulo}</h3>
        <p className="mapear-tab-sub">{subtitulo}</p>
      </div>
      <button className="cadastro-cta" onClick={onEditar} title="Abrir o editor de etapas">
        <Pencil size={15} strokeWidth={2.2} />
        <span>Editar etapas</span>
      </button>
    </div>
  );
}

function GargalosDaEtapa({ ids, gargaloNomeById }: { ids?: string[]; gargaloNomeById: Map<string, string> }) {
  const nomes = (ids || []).map(gid => gargaloNomeById.get(gid) ?? gid).filter(Boolean);
  if (!nomes.length) return null;
  return (
    <div className="mapear-etapa-gargalos">
      <span className="mapear-etapa-gargalos-label"><AlertTriangle size={13} /> Gargalos</span>
      <div className="mapear-chips">
        {nomes.map((n, i) => <span key={`${n}-${i}`} className="mapear-chip amber">{n}</span>)}
      </div>
    </div>
  );
}

interface ComoEraProps {
  etapas: Etapa[];
  fmtPct: (v: number) => string;
  sumHorasEtapa: (e: Etapa, ficou?: boolean) => number;
  gargaloNomeById: Map<string, string>;
  onEditar: () => void;
}
function ComoEraView({ etapas, fmtPct, sumHorasEtapa, gargaloNomeById, onEditar }: ComoEraProps) {
  return (
    <div className="mapear-tab-content">
      <MapearTabHead titulo="Como era" subtitulo="O retrato atual do processo, etapa por etapa." onEditar={onEditar} />

      {etapas.length === 0 ? (
        <EmptyStateCadastro
          icone={<Layers size={32} strokeWidth={1.8} />}
          titulo="Comece a mapear"
          texto="Este processo ainda não tem etapas. Adicione a primeira e descreva como o trabalho acontece hoje."
          ctaLabel="Mapear primeira etapa"
          onCta={onEditar}
        />
      ) : (
        <ol className="mapear-fluxo list-stagger">
          {etapas.map((e, i) => (
            <li key={e.id} className="mapear-etapa">
              <div className="mapear-etapa-top">
                <span className="mapear-etapa-num">{i + 1}</span>
                <h4 className="mapear-etapa-nome">{e.name}</h4>
                <span className="mapear-exec">{execLabel(e.execution)}</span>
              </div>
              {e.description && <p className="mapear-etapa-desc">{e.description}</p>}
              <div className="mapear-campos">
                <EtapaCampo label="Entrada">{docChips(e.docsEntrada)}</EtapaCampo>
                <EtapaCampo label="Saída">{docChips(e.docsSaida)}</EtapaCampo>
                <EtapaCampo label="Equipe">{pessoaChips(e.executadoPor)}</EtapaCampo>
                <EtapaCampo label="Sistemas">{sistemaChips(e.sistemas)}</EtapaCampo>
              </div>
              <GargalosDaEtapa ids={e.gargalos} gargaloNomeById={gargaloNomeById} />
              <div className="mapear-metrics">
                <Metric label="Horas/projeto" value={formatDecimal(sumHorasEtapa(e), 'h')} />
                <Metric label="Volume" value={formatDecimal(e.volume_per_process || 0)} />
                <Metric label="Erros" value={`${fmtPct(e.error_rate ?? 0)}%`} />
                <Metric label="Retrabalho" value={`${fmtPct(e.rework_rate)}%`} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

interface ComoFicouProps {
  etapas: Etapa[];
  fmtPct: (v: number) => string;
  sumHorasEtapa: (e: Etapa, ficou?: boolean) => number;
  onEditar: () => void;
}
function ComoFicouView({ etapas, fmtPct, sumHorasEtapa, onEditar }: ComoFicouProps) {
  return (
    <div className="mapear-tab-content">
      <MapearTabHead titulo="Como ficou" subtitulo="O cenário projetado depois das melhorias." onEditar={onEditar} />

      {etapas.length === 0 ? (
        <EmptyStateCadastro
          icone={<Layers size={32} strokeWidth={1.8} />}
          titulo="Nada para projetar ainda"
          texto="Mapeie o 'Como era' primeiro. Depois, projete aqui como cada etapa fica após as melhorias."
          ctaLabel="Editar etapas"
          onCta={onEditar}
        />
      ) : (
        <ol className="mapear-fluxo list-stagger">
            {etapas.map((e, i) => {
              // Resolve campos do cenário ficou — usa etapa.ficou.* quando há
              // projeção salva, senão faz fallback para os valores da era.
              const f = e.ficou;
              const descricao  = f?.description        ?? e.description;
              const execution  = f?.execution          ?? e.execution;
              const volProjeto = f?.volume_per_process  ?? e.volume_per_process;
              const taxaRetrab = f?.rework_rate         ?? e.rework_rate;
              const execArr    = f?.executadoPor        ?? e.executadoPor;
              const sistArr    = f?.sistemas            ?? e.sistemas;
              const docsEnt    = f?.docsEntrada         ?? e.docsEntrada;
              const docsSai    = f?.docsSaida           ?? e.docsSaida;
              const horasFuturas = sumHorasEtapa(e, true);
              return (
                <li key={e.id} className="mapear-etapa">
                  <div className="mapear-etapa-top">
                    <span className="mapear-etapa-num">{i + 1}</span>
                    <h4 className="mapear-etapa-nome">{e.name}</h4>
                    <span className="mapear-exec">{execLabel(execution)}</span>
                  </div>
                  {descricao && <p className="mapear-etapa-desc">{descricao}</p>}
                  <div className="mapear-campos">
                    <EtapaCampo label="Entrada">{docChips(docsEnt)}</EtapaCampo>
                    <EtapaCampo label="Saída">{docChips(docsSai)}</EtapaCampo>
                    <EtapaCampo label="Equipe">{pessoaChips(execArr)}</EtapaCampo>
                    <EtapaCampo label="Sistemas">{sistemaChips(sistArr)}</EtapaCampo>
                  </div>
                  <div className="mapear-metrics">
                    <Metric label="Horas/projeto" value={horasFuturas > 0 ? formatDecimal(horasFuturas, 'h') : 'Não definido'} />
                    <Metric label="Volume" value={formatDecimal(volProjeto || 0)} />
                    <Metric label="Retrabalho" value={taxaRetrab != null ? `${fmtPct(taxaRetrab)}%` : 'Não definido'} />
                  </div>
                </li>
              );
            })}
        </ol>
      )}
    </div>
  );
}
