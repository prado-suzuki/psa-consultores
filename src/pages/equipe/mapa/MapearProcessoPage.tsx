// Página única "Mapear processo" — substitui os múltiplos modais antes acessíveis pelo card.
// 4 abas (todas montadas, visibilidade alternada por CSS para carregamento instantâneo):
//   - Entradas / Saídas (visão agregada de documentos)
//   - Como era (view + Editar Etapas)
//   - Como ficou (view + Editar Etapas)
//   - Configurar ROI (wizard inline)
// Histórico de medições fica acessível via botão no header.

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import ChipSelector from '@/components/equipe/mapa/ChipSelector';
import DecimalInput from '@/components/equipe/mapa/DecimalInput';
import Select from '@/components/equipe/mapa/Select';
import WizardRoi from '@/components/equipe/mapa/WizardRoi';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';
import { toast } from 'sonner';
import type {
  Etapa, DocRef, Gargalo, Melhoria,
  ResponsavelEtapa, ProcessSnapshot,
} from '@/types';
import { generateSOP, generateSOPComparativo } from '@/utils/pdf/generators';
import { calcularRoi } from '@/utils/roiCalculator';
import { diagnosticarRoi } from '@/utils/diagnosticoRoi';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { formatDecimal, formatarMoeda } from '@/utils/format';
import { buildProcessDiagram } from '@/utils/processDiagram';
import DiagramViewer from '@/components/equipe/mapa/DiagramViewer';
import {
  useProcessoUnico, useEtapasLista, useDocumentosLista, useSistemasLista,
  useResponsaveisLista, useGargalosLista, useMelhoriasLista, useProjetosLista,
} from '@/hooks/useDominioListas';
import { useSnapshots } from '@/hooks/useSnapshots';
import { useCreateEtapa, useUpdateEtapa, useDeleteEtapa, useUpsertEtapaToBe } from '@/hooks/useEtapas';

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
const ordenarPorOrdem = (a: Etapa, b: Etapa) => (a.ordem ?? 0) - (b.ordem ?? 0);

export default function MapearProcessoPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [aba, setAba] = useState<Aba>('como-era');

  // ── Dados base via hooks (Hook-First) ──────────────────────────────────
  const processoQuery = useProcessoUnico(id);
  const { data: rawEtapas = [] } = useEtapasLista();
  const { data: documentos = [] } = useDocumentosLista();
  const { data: sistemas = [] } = useSistemasLista();
  const { data: responsaveis = [] } = useResponsaveisLista();
  const { data: gargalos = [] } = useGargalosLista();
  const { data: melhorias = [] } = useMelhoriasLista();
  const { data: snapshotsRaw = [] } = useSnapshots(id);
  const { data: projetos = [] } = useProjetosLista();
  const processo = processoQuery.data ?? null;
  const loading = processoQuery.isLoading;
  // Etapas hidratadas e filtradas para este processo.
  const etapas = useMemo(() => {
    if (!id) return [] as Etapa[];
    const filtered = rawEtapas.filter(e => e.processoId === id).sort(ordenarPorOrdem);
    return enrichEtapas(filtered, documentos, sistemas, responsaveis);
  }, [id, rawEtapas, documentos, sistemas, responsaveis]);
  // `snapshots` é local porque podemos querer apppendar otimisticamente
  // após `useCreateSnapshot` — quando uma nova mensuração é gerada pelo
  // WizardRoi, espelhamos no state local.
  const [snapshots, setSnapshots] = useState<ProcessSnapshot[]>([]);
  useEffect(() => { setSnapshots(snapshotsRaw); }, [snapshotsRaw]);

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

  // Histórico
  const [historicoOpen, setHistoricoOpen] = useState(false);

  // Diagrama
  const [diagramaOpen, setDiagramaOpen] = useState(false);

  const docNames = useMemo(() => documentos.map(d => d.nome), [documentos]);
  const sisNames = useMemo(() => sistemas.map(s => s.nome), [sistemas]);
  const respNames = useMemo(() => responsaveis.map(r => r.nome), [responsaveis]);

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
  //  Handlers — SOP
  // ============================================================
  const handleGenerateSOP = async (mode: 'era' | 'ficou') => {
    try {
      await generateSOP(processo, etapas, documentos, sistemas, responsaveis, gargalos, melhorias, mode);
    } catch (err) {
      toast.error('Erro ao gerar SOP', { description: err instanceof Error ? err.message : String(err) });
    }
  };

  const handleGenerateSOPComparativo = async () => {
    try {
      const gargalosDoProc = gargalos.filter(g => (g.processos || []).includes(processo.id));
      // calcularRoi recebe TODAS as melhorias do projeto e elege internamente as
      // relevantes (vínculo direto OU via gargalo). Passar só as filtradas aqui
      // poderia esconder melhorias que resolvem gargalos do processo.
      const roi = calcularRoi({
        processos: [processo],
        etapas,
        responsaveis,
        sistemas,
        gargalos,
        melhorias,
        projetos,
      });
      const diagnostico = diagnosticarRoi(processo, etapas, responsaveis, sistemas, gargalos, melhorias);
      const projetoDoProcesso = projetos.find(p => p.id === processo.projetoId) || null;
      await generateSOPComparativo({
        processo,
        etapas,
        sistemas,
        responsaveis,
        gargalos: gargalosDoProc,
        melhorias,
        projeto: projetoDoProcesso,
        roi,
        diagnostico,
        horizonteMeses: 24,
      });
    } catch (err) {
      toast.error('Erro ao gerar SOP Comparativo', { description: err instanceof Error ? err.message : String(err) });
    }
  };

  // ============================================================
  //  Diagrama (Mermaid) — Processo + 6 grupos de ligações
  // ============================================================
  const projetoDoProcesso = projetos.find(p => p.id === processo.projetoId) || null;
  const diagramaCode = buildProcessDiagram({
    processo,
    etapas,
    documentos,
    sistemas,
    responsaveis,
    gargalos,
    melhorias,
    projeto: projetoDoProcesso,
  });
  const diagramaFilename = `Diagrama_${processo.id}_${new Date().toISOString().slice(0, 10)}`;

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
  });

  const openEditEtapas = (mode: 'era' | 'ficou', focusEtapaId?: string) => {
    const snapshotsEtapas = etapas.map(e => cleanEtapa({ ...e, nome: cleanEtapaName(e.nome) }));
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
          descricao: f?.descricao ?? eraEtapa.descricao,
          execucao: f?.execucao ?? eraEtapa.execucao,
          leadTimeDias: f?.leadTimeDias ?? eraEtapa.leadTimeDias,
          volumePorProcesso: f?.volumePorProcesso ?? eraEtapa.volumePorProcesso,
          taxaErros: f?.taxaErros ?? eraEtapa.taxaErros,
          taxaRetrabalho: f?.taxaRetrabalho ?? eraEtapa.taxaRetrabalho ?? 0,
          custoErro: f?.custoErro ?? eraEtapa.custoErro,
          volumeErros: f?.volumeErros ?? eraEtapa.volumeErros,
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
  // de um processo, então processoId é automático).
  const addNovaEtapa = () => {
    const nova = {
      id: `etp-novo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      processoId: processo.id,
      nome: '',
      descricao: '',
      execucao: 'manual',
      docsEntrada: [],
      docsSaida: [],
      executadoPor: [],
      volumeMensal: 0,
      sistemas: [],
      estruturaEntrada: '',
      taxaRetrabalho: 0,
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

  const handleSaveEtapas = async () => {
    if (!processo) return;
    setEditEtapasSaving(true);
    const cleaned = editEtapasList.map(cleanEtapa);
    try {
      const existingIds = new Set(etapas.map(e => e.id));
      for (let i = 0; i < cleaned.length; i++) {
        const e = { ...cleaned[i], ordem: i + 1 };
        if (editEtapasMode === 'era') {
          if (existingIds.has(e.id)) {
            await updateEtapa.mutateAsync({ id: e.id, patch: e as Partial<Etapa>, old: e });
          } else {
            await createEtapa.mutateAsync({ ...e, cenario: 'AS-IS' } as Partial<Etapa> as never);
          }
        } else {
          // mode === 'ficou' — projeção TO-BE via hook (upsert id+cenario).
          if (!existingIds.has(e.id)) continue;
          await upsertEtapaToBe.mutateAsync({ etapa: e, processoId: processo.id });
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

  const handleSnapshotCriado = (snap: ProcessSnapshot) => {
    setSnapshots(prev => [...prev, snap]);
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

  const fmtDocs = (arr: DocRef[]) => {
    if (!arr?.length) return 'Nenhum';
    return arr.map(d => `${d.nome || ''} (${(d.volume || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })})`).join('; ');
  };

  const fmtPct = (v: number) => formatDecimal((v || 0) * 100);

  // ============================================================
  //  Render
  // ============================================================
  return (
    <div className="card">
      <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => navigate('/equipe/digital/mapa/processos')}
            className="btn-cancel"
            style={{ padding: '4px 10px' }}
            title="Voltar à listagem de processos"
          >
            ← Voltar
          </button>
          <h1 style={{ margin: 0 }}>{processo.nome}</h1>
          {processo.statusAvaliacao && processo.statusAvaliacao !== 'Não avaliado' && (
            <span className="status-badge" style={{ background: '#dcfce7', color: '#166534' }}>{processo.statusAvaliacao}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-sop-header" onClick={() => handleGenerateSOP('era')} title="Gerar SOP (Como Era)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            SOP (era)
          </button>
          <button className="btn-sop-header" onClick={() => handleGenerateSOP('ficou')} title="Gerar SOP (Como Ficou)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            SOP (ficou)
          </button>
          <button className="btn-sop-header" onClick={handleGenerateSOPComparativo} title="Gera PDF comparativo Como Era × Como Ficou, lado a lado, com ganhos por etapa e ROI consolidado.">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            SOP Comparativo
          </button>
          <button className="btn-sop-header" onClick={() => setDiagramaOpen(true)} title="Visualizar diagrama de ligações do processo">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/><circle cx="12" cy="12" r="2"/><line x1="12" y1="12" x2="6" y2="6"/><line x1="12" y1="12" x2="18" y2="6"/><line x1="12" y1="12" x2="6" y2="18"/><line x1="12" y1="12" x2="18" y2="18"/></svg>
            Diagrama
          </button>
          <button className="btn-sop-header" onClick={() => setHistoricoOpen(true)} title="Histórico de medições">
            Histórico ({snapshots.length})
          </button>
        </div>
      </div>

      {processo.descricao && (
        <p style={{ color: '#475569', marginTop: 6 }}>{processo.descricao}</p>
      )}

      {/* Navegação por abas */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '2px solid #e2e8f0', marginTop: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {ABAS.map(a => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            style={{
              padding: '10px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: aba === a.id ? 600 : 500,
              color: aba === a.id ? 'var(--accent-color)' : '#64748b',
              borderBottom: '2px solid ' + (aba === a.id ? 'var(--accent-color)' : 'transparent'),
              marginBottom: -2,
              transition: 'color 0.15s, border-color 0.15s',
            }}
          >
            <Tooltip text={dica(
              a.id === 'como-era' ? 'mapear.aba.comoEra'
              : a.id === 'como-ficou' ? 'mapear.aba.comoFicou'
              : 'mapear.aba.configurarRoi'
            )}>{a.label}</Tooltip>
          </button>
        ))}
      </div>

      {/* Conteúdo das abas — todas montadas, visibilidade alternada para troca instantânea */}
      <div style={{ display: aba === 'como-era' ? 'block' : 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn-sop-header" onClick={() => openEditEtapas('era')} title="Editar etapas (como era)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar etapas
          </button>
        </div>
        <ComoEraView
          etapas={etapas}
          fmtDocs={fmtDocs}
          fmtPct={fmtPct}
          sumHorasEtapa={sumHorasEtapa}
          gargalosDoProcesso={gargalos.filter(g => (g.processos || []).includes(processo.id))}
        />
      </div>

      <div style={{ display: aba === 'como-ficou' ? 'block' : 'none' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="btn-sop-header" onClick={() => openEditEtapas('ficou')} title="Editar etapas (como ficou)">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            Editar etapas
          </button>
        </div>
        <ComoFicouView
          etapas={etapas}
          melhoriasDoProcesso={melhorias.filter(m => (m.processos || []).includes(processo.id))}
          fmtDocs={fmtDocs}
          fmtPct={fmtPct}
          sumHorasEtapa={sumHorasEtapa}
        />
      </div>

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
                      const rotulo = cleanEtapaName(e.nome) || 'Nova etapa';
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
                    <input type="text" value={active.nome} onChange={(e) => handleUpdateEtapaField(editEtapasActiveIndex, 'nome', e.target.value)} />
                  </FormField>
                  <FormField label="Descrição" compact tooltip={dica('mapear.etapa.descricao')}>
                    <textarea value={active.descricao} onChange={(e) => handleUpdateEtapaField(editEtapasActiveIndex, 'descricao', e.target.value)} />
                  </FormField>
                </div>

                <div className="modal-section">
                  <div className="modal-section-title"><Tooltip text={dica('mapear.secao.operacao')}>Operação</Tooltip></div>
                  <div className="form-row">
                    <FormField label="Execução" compact tooltip={dica('mapear.etapa.execucao')}>
                      <Select
                        value={active.execucao || ''}
                        onChange={(v) => handleUpdateEtapaField(editEtapasActiveIndex, 'execucao', v)}
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
                      onChange={(v) => handleUpdateEtapaField(editEtapasActiveIndex, 'docsEntrada', v as DocRef[])} withVolume compact />
                  </FormField>
                  <FormField label="Docs Saída" compact tooltip={dica('mapear.etapa.docsSaida')}>
                    <ChipSelector options={docNames} value={active.docsSaida || []}
                      onChange={(v) => handleUpdateEtapaField(editEtapasActiveIndex, 'docsSaida', v as DocRef[])} withVolume compact />
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
                    />
                  </FormField>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                    Horas gasta por projeto: <strong>{formatDecimal(sumHorasEtapa(active, isFicou), 'h')}</strong>
                  </div>
                </div>

                <div className="modal-section">
                  <div className="modal-section-title"><Tooltip text={dica('mapear.secao.metricas')}>Métricas</Tooltip></div>
                  <div className="form-row">
                    <FormField label="Volume por processo" compact tooltip={dica('mapear.etapa.volumePorProcesso')}>
                      <DecimalInput value={active.volumePorProcesso || 0} onChange={(n) => handleUpdateEtapaField(editEtapasActiveIndex, 'volumePorProcesso', n)} min={0} />
                    </FormField>
                    <FormField label="Taxa Erros (%)" compact tooltip={dica('mapear.etapa.taxaErros')}>
                      <DecimalInput
                        value={(active.taxaErros ?? 0) * 100}
                        onChange={(n) => handleUpdateEtapaField(editEtapasActiveIndex, 'taxaErros', n / 100)}
                        min={0}
                        max={100}
                        placeholder="Ex: 5"
                      />
                    </FormField>
                  </div>
                  <FormField label="Taxa Retrabalho (%)" compact tooltip={dica('mapear.etapa.taxaRetrabalho')}>
                    <DecimalInput
                      value={(active.taxaRetrabalho || 0) * 100}
                      onChange={(n) => handleUpdateEtapaField(editEtapasActiveIndex, 'taxaRetrabalho', n / 100)}
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
                      onChange={(v) => handleUpdateEtapaField(editEtapasActiveIndex, 'sistemas', v as string[])} compact />
                  </FormField>
                  {(active.sistemas || []).filter(Boolean).length > 0 && (
                    <div style={{ marginTop: 6, fontSize: '0.78rem', color: '#64748b' }}>
                      O rateio (%) do custo por cluster é configurado em <strong>Sistemas → editar sistema → Rateio por cluster</strong>.
                    </div>
                  )}
                </div>

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

      {/* Modal Histórico */}
      <Modal isOpen={historicoOpen} onClose={() => setHistoricoOpen(false)}>
        <div className="modal-etapas">
          <div className="modal-header">
            <h2>Histórico de Medições: {processo.nome}</h2>
            <button
              className="btn-sop-header"
              onClick={() => { setHistoricoOpen(false); setAba('configurar-roi'); }}
              title="Abrir o wizard para nova medição"
            >
              Nova medição
            </button>
          </div>
          <div className="modal-body">
            {snapshots.length === 0 ? (
              <p style={{ color: '#64748b' }}>
                Nenhum snapshot salvo para este processo. Use a aba <strong>"Configurar ROI"</strong> e clique em <strong>"Salvar como baseline"</strong> ao final do wizard.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {snapshots.map((s, i) => {
                  const anterior = i > 0 ? snapshots[i - 1] : null;
                  const deltaCusto = anterior ? s.custoAnual - anterior.custoAnual : 0;
                  return (
                    <div key={s.id} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        <div>
                          <strong>Mensuração</strong>
                          <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#64748b' }}>
                            {new Date(s.snapshotEm).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        {anterior && (
                          <span style={{ fontSize: '0.8rem', color: deltaCusto < 0 ? '#16a34a' : '#dc2626' }}>
                            Δ custo: {formatarMoeda(deltaCusto)} ({deltaCusto < 0 ? 'redução' : 'aumento'})
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 8, marginTop: 8, fontSize: '0.8rem' }}>
                        <div><span style={{ color: '#64748b' }}>Custo / ano</span><br/><strong>{formatarMoeda(s.custoAnual)}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Horas / ano</span><br/><strong>{formatDecimal(s.horasAnual, ' h')}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Economia / ano</span><br/><strong>{formatarMoeda(s.economiaAnual)}</strong></div>
                        <div><span style={{ color: '#64748b' }}>ROI</span><br/><strong>{formatDecimal(s.roiPercentual, '%')}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Payback</span><br/><strong>{formatDecimal(s.paybackMeses, ' meses')}</strong></div>
                        <div><span style={{ color: '#64748b' }}>Horas liberadas</span><br/><strong>{formatDecimal(s.horasLiberadas, ' h')}</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button className="btn-cancel" onClick={() => setHistoricoOpen(false)}>Fechar</button>
          </div>
        </div>
      </Modal>

      <DiagramViewer
        isOpen={diagramaOpen}
        onClose={() => setDiagramaOpen(false)}
        code={diagramaCode}
        filename={diagramaFilename}
        title={`Diagrama: ${processo.nome}`}
      />
    </div>
  );
}

// ============================================================
//  Sub-views (puramente apresentacionais)
// ============================================================

interface ComoEraProps {
  etapas: Etapa[];
  fmtDocs: (arr: DocRef[]) => string;
  fmtPct: (v: number) => string;
  sumHorasEtapa: (e: Etapa, ficou?: boolean) => number;
  gargalosDoProcesso: Gargalo[];
}
function ComoEraView({ etapas, fmtDocs, fmtPct, sumHorasEtapa, gargalosDoProcesso }: ComoEraProps) {
  if (etapas.length === 0) return <p>Nenhuma etapa mapeada para este processo.</p>;
  return (
    <>
      {gargalosDoProcesso.length > 0 && (
        <div className="etapa-item" style={{ borderLeft: '3px solid #f59e0b' }}>
          <div className="etapa-section">
            <div className="etapa-section-title">Gargalos do processo</div>
            <div className="tags" style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
              {gargalosDoProcesso.map(g => (
                <span key={g.id} className="tag tag-etapa" title={g.descricao}>{g.nome}</span>
              ))}
            </div>
          </div>
        </div>
      )}
      {etapas.map((e) => (
        <div key={e.id} className="etapa-item">
          <div className="etapa-section">
            <div className="etapa-section-title">Identificação</div>
            <h4>{e.nome}</h4>
            <div className="campo" style={{ whiteSpace: 'pre-line' }}>{e.descricao}</div>
          </div>

          <div className="etapa-section">
            <div className="etapa-section-title">Operação</div>
            <div className="campo"><strong>Execução:</strong> {e.execucao || '—'}</div>
          </div>

          <div className="etapa-section">
            <div className="etapa-section-title">Documentos</div>
            <div className="campo"><strong>Entrada:</strong> {fmtDocs(e.docsEntrada)}</div>
            <div className="campo"><strong>Saída:</strong> {fmtDocs(e.docsSaida)}</div>
          </div>

          <div className="etapa-section">
            <div className="etapa-section-title">Equipe</div>
            <div className="tags">
              {(e.executadoPor || []).map(r => (
                <span key={`ex-${r.responsavelId || r.nome}`} className="tag tag-pessoa">
                  {r.nome} <span style={{ opacity: 0.7 }}>· {formatDecimal(r.horas || 0, 'h')}</span>
                </span>
              ))}
              {(e.sistemas || []).map(s => (
                <span key={`sis-${s}`} className="tag tag-sistema">{s}</span>
              ))}
            </div>
          </div>

          <div className="etapa-section">
            <div className="etapa-section-title">Métricas</div>
            <div className="meta">
              <div>Horas gasta por projeto: <span>{formatDecimal(sumHorasEtapa(e), 'h')}</span></div>
              <div>Volume por processo: <span>{formatDecimal(e.volumePorProcesso || 0)}</span></div>
              <div>Taxa Erros: <span>{fmtPct(e.taxaErros ?? 0)}%</span></div>
              <div>Retrabalho: <span>{fmtPct(e.taxaRetrabalho)}%</span></div>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

interface ComoFicouProps {
  etapas: Etapa[];
  melhoriasDoProcesso: Melhoria[];
  fmtDocs: (arr: DocRef[]) => string;
  fmtPct: (v: number) => string;
  sumHorasEtapa: (e: Etapa, ficou?: boolean) => number;
}
function ComoFicouView({ etapas, melhoriasDoProcesso, fmtDocs, fmtPct, sumHorasEtapa }: ComoFicouProps) {
  if (etapas.length === 0) return <p>Nenhuma etapa mapeada para este processo.</p>;
  return (
    <>
      {etapas.map((e) => {
        // Resolve campos do cenário ficou — usa etapa.ficou.* quando há
        // projeção salva, senão faz fallback para os valores da era.
        const f = e.ficou;
        const descricao  = f?.descricao        ?? e.descricao;
        const execucao   = f?.execucao        ?? e.execucao;
        const volProjeto = f?.volumePorProcesso ?? e.volumePorProcesso;
        const taxaRetrab = f?.taxaRetrabalho   ?? e.taxaRetrabalho;
        const execArr    = f?.executadoPor     ?? e.executadoPor;
        const sistArr    = f?.sistemas         ?? e.sistemas;
        const docsEnt    = f?.docsEntrada      ?? e.docsEntrada;
        const docsSai    = f?.docsSaida        ?? e.docsSaida;

        const horasFuturas = sumHorasEtapa(e, true);
        return (
          <div key={e.id} className="etapa-item">
            <div className="etapa-section">
              <div className="etapa-section-title">Identificação</div>
              <h4>{e.nome}</h4>
              <div className="campo" style={{ whiteSpace: 'pre-line' }}>{descricao}</div>
            </div>

            <div className="etapa-section">
              <div className="etapa-section-title">Operação</div>
              <div className="campo">
                <strong>Melhorias do processo:</strong>{' '}
                {melhoriasDoProcesso.length === 0 ? '—' : (
                  <span className="tags" style={{ display: 'inline-flex', flexWrap: 'wrap', gap: 4 }}>
                    {melhoriasDoProcesso.map(m => (
                      <span key={m.id} className="tag tag-etapa">{m.nome}</span>
                    ))}
                  </span>
                )}
              </div>
              <div className="campo"><strong>Execução:</strong> {execucao || '—'}</div>
            </div>

            <div className="etapa-section">
              <div className="etapa-section-title">Documentos</div>
              <div className="campo"><strong>Entrada:</strong> {fmtDocs(docsEnt || [])}</div>
              <div className="campo"><strong>Saída:</strong> {fmtDocs(docsSai || [])}</div>
            </div>

            <div className="etapa-section">
              <div className="etapa-section-title">Equipe</div>
              <div className="tags">
                {(execArr || []).map(r => (
                  <span key={`ex-${r.responsavelId || r.nome}`} className="tag tag-pessoa">
                    {r.nome} <span style={{ opacity: 0.7 }}>· {(r.horas != null) ? formatDecimal(r.horas, 'h') : '—'}</span>
                  </span>
                ))}
                {(sistArr || []).map(s => (
                  <span key={`sis-${s}`} className="tag tag-sistema">{s}</span>
                ))}
              </div>
            </div>

            <div className="etapa-section">
              <div className="etapa-section-title">Métricas</div>
              <div className="meta">
                <div>Horas gasta por projeto (futuro): <span>{horasFuturas > 0 ? formatDecimal(horasFuturas, 'h') : 'Não definido'}</span></div>
                <div>Volume por processo: <span>{formatDecimal(volProjeto || 0)}</span></div>
                <div>Retrabalho: <span>{taxaRetrab != null ? fmtPct(taxaRetrab) + '%' : 'Não definido'}</span></div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
