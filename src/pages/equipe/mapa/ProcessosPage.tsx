// Listagem de processos. Mapeamento e edição de etapas/ROI ficam em /processos/:id/mapear.

import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import FiltrosBar from '@/components/equipe/mapa/FiltrosBar';
import GrupoAccordion from '@/components/equipe/mapa/GrupoAccordion';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';
import { agrupar } from '@/utils/agrupar';
import { melhoriaIdsDoGargalo } from '@/utils/gargaloMelhorias';
import PageStats from '@/components/equipe/mapa/PageStats';
import StatusBadge from '@/components/equipe/mapa/StatusBadge';
import { useFocusParam } from '@/utils/useFocusParam';
import { openOnActivationKey, shouldIgnoreOpenClick } from '@/utils/clickOpenGuard';
import type {
  Processo, FrequenciaProcesso, StatusAvaliacao, Complexidade,
  Etapa,
} from '@/types';
import {
  useEtapasLista, useGargalosLista, useMelhoriasLista, useProjetosLista,
} from '@/hooks/useDominioListas';
import { useProcessos, useCreateProcesso, useUpdateProcesso, useDeleteProcesso } from '@/hooks/useProcessos';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';

const STATUS_AVAL_FILTRO_OPCOES = [
  { value: '', label: 'Todos os status' },
  { value: 'Não avaliado', label: 'Não avaliado' },
  { value: 'Em avaliação', label: 'Em avaliação' },
  { value: 'Avaliado', label: 'Avaliado' },
];

const FREQUENCIA_OPCOES = [
  { value: '',           label: '— Não definido' },
  { value: 'Diária',     label: 'Diária (252 exec./ano)' },
  { value: 'Semanal',    label: 'Semanal (52 exec./ano)' },
  { value: 'Quinzenal',  label: 'Quinzenal (26 exec./ano)' },
  { value: 'Mensal',     label: 'Mensal (12 exec./ano)' },
  { value: 'Trimestral', label: 'Trimestral (4 exec./ano)' },
  { value: 'Anual',      label: 'Anual (1 exec./ano)' },
];

const STATUS_AVALIACAO_OPCOES = [
  { value: 'Não avaliado', label: 'Não avaliado' },
  { value: 'Em avaliação', label: 'Em avaliação' },
  { value: 'Avaliado',     label: 'Avaliado' },
];

const COMPLEXIDADE_OPCOES = [
  { value: '',      label: '— Não definido' },
  { value: 'Baixa', label: 'Baixa' },
  { value: 'Média', label: 'Média' },
  { value: 'Alta',  label: 'Alta' },
];

const COMPLEXIDADE_MAP: Record<string, Complexidade> = {
  baixa: 'Baixa',
  low: 'Baixa',
  media: 'Média',
  medium: 'Média',
  alta: 'Alta',
  high: 'Alta',
};

function normalizarComplexidade(value?: string | null): Complexidade | '' {
  if (!value) return '';
  const key = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  return COMPLEXIDADE_MAP[key] || '';
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Horas por execução de uma etapa (somente executadoPor — revisado foi extraído para etapas próprias). */
function horasEtapaPorExec(e: Etapa): number {
  const soma = (arr: { horas?: number }[]) => arr.reduce((s, r) => s + (r.horas || 0), 0);
  return soma(e.executadoPor || []);
}

/** Carga mensal da etapa = horas/exec × volume mensal (já agrega todos os projetos ativos). */
function cargaMensalEtapa(e: Etapa): number {
  return horasEtapaPorExec(e) * (e.volumeMensal || 0);
}

function fmtH(h: number): string {
  return h.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + 'h';
}

function getProjectCode(projectName?: string): string | null {
  const match = projectName?.trim().match(/^(P\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

export default function ProcessosPage() {
  const { data: items = [], isLoading: processosLoading } = useProcessos();
  const loaded = !processosLoading;
  const createProcesso = useCreateProcesso();
  const updateProcesso = useUpdateProcesso();
  const deleteProcesso = useDeleteProcesso();
  const { data: projetos = [] } = useProjetosLista();

  // ── Supporting data via hooks (Hook-First) ──────────────────────────────
  const { data: etapas = [] } = useEtapasLista();
  const { data: gargalos = [] } = useGargalosLista();
  const { data: melhorias = [] } = useMelhoriasLista();

  // ── Per-process helpers ───────────────────────────────────────────────────────
  const etapasDoProcesso = (pid: string) =>
    etapas
      .filter(e => e.process_id === pid)
      .sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0));

  const gargalosDoProcesso = (pid: string) =>
    gargalos.filter(g => (g.processos || []).includes(pid));

  const melhoriasDoProcesso = (pid: string) => {
    const garsDoProc = gargalosDoProcesso(pid);
    const melhoriaIdsViaGargalos = new Set(
      garsDoProc.flatMap(g => melhoriaIdsDoGargalo(g))
    );
    return melhorias.filter(m =>
      (m.processos || []).includes(pid) ||
      melhoriaIdsViaGargalos.has(m.id),
    );
  };

  // ── Cluster do processo derivado do seu projeto (UUID pra filter/group) ─
  const clusterIdPorProjeto = useMemo(
    () => new Map(projetos.map(p => [p.id, p.cluster_id || ''])),
    [projetos],
  );
  const projetoNomePorId = useMemo(
    () => new Map(projetos.map(p => [p.id, p.name])),
    [projetos],
  );

  // ── Filtros (cluster vem do seletor global no header) ─────────────────────────
  const { cluster: fCluster } = useClusterGlobal();
  const [fProjeto, setFProjeto] = useState('');
  const [fStatus, setFStatus] = useState('');
  const filtrosAtivos = !!(fProjeto || fStatus);
  const limparFiltros = () => { setFProjeto(''); setFStatus(''); };
  const itensFiltrados = useMemo(() => items.filter(p =>
    (!fCluster || (p.project_id ? clusterIdPorProjeto.get(p.project_id) || '' : '') === fCluster) &&
    (!fProjeto || p.project_id === fProjeto) &&
    (!fStatus || (p.evaluation_status || 'Não avaliado') === fStatus)
  ), [items, fCluster, fProjeto, fStatus, clusterIdPorProjeto]);

  const grupos = useMemo(() =>
    agrupar(
      itensFiltrados,
      (p) => [p.project_id || ''],
      projetos.map((p) => ({ value: p.id, label: p.name })),
      'Sem projeto',
    ), [itensFiltrados, projetos]);

  const processoIdsFiltrados = useMemo(
    () => new Set(itensFiltrados.map(p => p.id)),
    [itensFiltrados],
  );
  const etapasFiltradas = useMemo(
    () => etapas.filter(e => processoIdsFiltrados.has(e.process_id)),
    [etapas, processoIdsFiltrados],
  );
  const gargalosFiltrados = useMemo(
    () => gargalos.filter(g => (g.processos || []).some(pid => processoIdsFiltrados.has(pid))),
    [gargalos, processoIdsFiltrados],
  );
  const melhoriasFiltradas = useMemo(() => {
    const melhoriaIdsViaGargalos = new Set(gargalosFiltrados.flatMap(g => melhoriaIdsDoGargalo(g)));
    return melhorias.filter(m =>
      (m.processos || []).some(pid => processoIdsFiltrados.has(pid)) ||
      melhoriaIdsViaGargalos.has(m.id),
    );
  }, [melhorias, processoIdsFiltrados, gargalosFiltrados]);

  const ordemVisualPorProcesso = useMemo(() => {
    const porProjeto = new Map<string, Processo[]>();
    const semProjeto: Processo[] = [];
    for (const processoItem of itensFiltrados) {
      if (!processoItem.project_id) {
        semProjeto.push(processoItem);
        continue;
      }
      const lista = porProjeto.get(processoItem.project_id) ?? [];
      lista.push(processoItem);
      porProjeto.set(processoItem.project_id, lista);
    }

    const ordem = new Map<string, number>();
    porProjeto.forEach((lista) => {
      lista
        .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.name.localeCompare(b.name))
        .forEach((processoItem, index) => ordem.set(processoItem.id, index + 1));
    });
    semProjeto
      .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.name.localeCompare(b.name))
      .forEach((processoItem, index) => ordem.set(processoItem.id, index + 1));
    return ordem;
  }, [itensFiltrados]);

  const codigoVisualProcesso = (p: Processo, fallbackIndex: number): string => {
    const ordem = ordemVisualPorProcesso.get(p.id) ?? fallbackIndex + 1;
    const ordemFormatada = String(ordem).padStart(2, '0');
    const projetoCodigo = getProjectCode(p.project_id ? projetoNomePorId.get(p.project_id) : undefined);
    return projetoCodigo ? `${projetoCodigo}.${ordemFormatada}` : `#${ordemFormatada}`;
  };

  // ── Global KPI strip ─────────────────────────────────────────────────────────
  const totalHoras = useMemo(() =>
    etapasFiltradas.reduce((s, e) => s + cargaMensalEtapa(e), 0),
  [etapasFiltradas]);

  // ── Detail modal ──────────────────────────────────────────────────────────────
  const [detailItem, setDetailItem] = useState<Processo | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const openDetail = (p: Processo) => {
    setDetailItem(p);
    setDetailOpen(true);
  };

  // ── Focus-navigation ─────────────────────────────────────────────────────────
  const focusId = useFocusParam();
  useEffect(() => {
    if (loaded && focusId) {
      const found = items.find(p => p.id === focusId);
      if (found) openDetail(found);
    }
  }, [loaded, focusId, items]);

  // ── Novo processo ─────────────────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [projetoId, setProjetoId] = useState<string>('');
  const [frequencia, setFrequencia] = useState<string>('');
  const [statusAvaliacao, setStatusAvaliacao] = useState<StatusAvaliacao>('Não avaliado');
  const [complexidade, setComplexidade] = useState<string>('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // ── Edit metadados ────────────────────────────────────────────────────────────
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editNome, setEditNome] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editProjetoId, setEditProjetoId] = useState<string>('');
  const [editFrequencia, setEditFrequencia] = useState<string>('');
  const [editStatusAvaliacao, setEditStatusAvaliacao] = useState<StatusAvaliacao>('Não avaliado');
  const [editComplexidade, setEditComplexidade] = useState<string>('');
  const [editSaving, setEditSaving] = useState(false);

  // ── Exclusão ──────────────────────────────────────────────────────────────────
  const [confirmDel, setConfirmDel] = useState<Processo | null>(null);
  const [deleting, setDeleting] = useState(false);
  const handleConfirmDelete = async () => {
    if (!confirmDel) return;
    setDeleting(true);
    try {
      await deleteProcesso.mutateAsync({ id: confirmDel.id, old: confirmDel });
      toast.success('Processo excluído');
      setConfirmDel(null);
    } catch (err) {
      toast.error('Erro ao excluir processo', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setDeleting(false);
    }
  };

  const resetNovo = () => {
    setNome(''); setDescricao('');
    setProjetoId('');
    setFrequencia('');
    setStatusAvaliacao('Não avaliado'); setComplexidade('');
    setError('');
  };

  const handleSaveProcesso = async () => {
    if (!nome.trim()) { setError('Preencha o nome do processo.'); return; }
    if (!projetoId) { setError('Vincule o processo a um projeto.'); return; }
    setError('');
    setIsSaving(true);
    try {
      await createProcesso.mutateAsync({
        name: nome.trim(),
        description: descricao.trim(),
        project_id: projetoId,
        frequency: (frequencia || undefined) as FrequenciaProcesso | undefined,
        evaluation_status: statusAvaliacao,
        complexity_level: normalizarComplexidade(complexidade) || undefined,
      });
      toast.success('Processo criado');
      resetNovo();
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (p: Processo) => {
    setEditId(p.id);
    setEditNome(p.name);
    setEditDescricao(p.description);
    setEditProjetoId(p.project_id || '');
    setEditFrequencia(p.frequency || '');
    setEditStatusAvaliacao(p.evaluation_status || 'Não avaliado');
    setEditComplexidade(normalizarComplexidade(p.complexity_level));
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editNome.trim()) return;
    if (!editProjetoId) return;
    const old = items.find(p => p.id === editId);
    if (!old) return;
    setEditSaving(true);
    try {
      await updateProcesso.mutateAsync({
        id: editId,
        old,
        patch: {
          name: editNome.trim(),
          description: editDescricao.trim(),
          project_id: editProjetoId,
          frequency: (editFrequencia || undefined) as FrequenciaProcesso | undefined,
          evaluation_status: editStatusAvaliacao,
          complexity_level: normalizarComplexidade(editComplexidade) || undefined,
        },
      });
      toast.success('Processo atualizado');
      setEditOpen(false);
    } catch (err) {
      toast.error('Erro ao atualizar processo', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setEditSaving(false);
    }
  };

  // ── Card render ───────────────────────────────────────────────────────────────
  const renderCard = (p: Processo, index: number) => (
    <div
      key={p.id}
      className="processo-card"
      role="button"
      tabIndex={0}
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        if (shouldIgnoreOpenClick(e)) return;
        openDetail(p);
      }}
      onKeyDown={(e) => openOnActivationKey(e, () => openDetail(p))}
    >
      <div className="processo-card-header">
        <div className="processo-card-title-wrap">
          <span
            className="processo-card-order"
            title="Ordem visual do processo dentro do projeto"
            aria-label={`Ordem ${codigoVisualProcesso(p, index)}`}
          >
            {codigoVisualProcesso(p, index)}
          </span>
          <h3><Tooltip text={dica('processos.card.titulo')}>{p.name}</Tooltip></h3>
        </div>
        <div className="processo-card-actions-top">
          <button
            className="btn-edit"
            onClick={(e) => { e.stopPropagation(); openEdit(p); }}
            title="Editar metadados do processo"
            style={{ padding: '4px 6px' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button
            className="btn-edit"
            onClick={(e) => { e.stopPropagation(); setConfirmDel(p); }}
            title="Excluir processo"
            style={{ padding: '4px 6px', color: '#b91c1c' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      </div>
      {(p.evaluation_status || normalizarComplexidade(p.complexity_level)) && (
        <div style={{ display: 'flex', gap: 6, marginTop: 4, marginBottom: 6, flexWrap: 'wrap' }}>
          {normalizarComplexidade(p.complexity_level) && (
            <StatusBadge variant="roi">{normalizarComplexidade(p.complexity_level)}</StatusBadge>
          )}
          {p.evaluation_status && p.evaluation_status !== 'Não avaliado' && (
            <StatusBadge variant="diagnostic">{p.evaluation_status}</StatusBadge>
          )}
        </div>
      )}
      {(() => {
        const etapasProc = etapasDoProcesso(p.id);
        if (etapasProc.length === 0) {
          return <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Nenhuma etapa mapeada.</p>;
        }
        return (
          <div className="processo-card-etapas">
            {etapasProc.map((e, i) => (
              <div key={e.id} className="processo-card-etapa" title={e.name}>
                <span className="processo-card-etapa-num">{i + 1}</span>
                <span className="processo-card-etapa-nome">{e.name}</span>
              </div>
            ))}
          </div>
        );
      })()}
      {p.frequency && (
        <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
          <strong>Frequência:</strong> {p.frequency}
        </div>
      )}
      <div className="processo-card-actions">
        <Link
          to={`/equipe/digital/mapa/processos/${encodeURIComponent(p.id)}/mapear`}
          className="btn-era"
          style={{ background: 'var(--accent-color)', color: 'white', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          title="Abrir tela de detalhes do processo"
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6l9-3 9 3v15l-9 3-9-3z"/>
            <line x1="3" y1="6" x2="12" y2="9"/>
            <line x1="21" y1="6" x2="12" y2="9"/>
            <line x1="12" y1="9" x2="12" y2="24"/>
          </svg>
          Detalhes
        </Link>
      </div>
    </div>
  );

  if (!loaded) return <div className="loading-container"><div className="spinner" /></div>;

  // ── Computed detail-modal values (when detailItem set) ────────────────────────
  const detailEtapas = detailItem ? etapasDoProcesso(detailItem.id) : [];
  const detailGargalos = detailItem ? gargalosDoProcesso(detailItem.id) : [];
  const detailMelhorias = detailItem ? melhoriasDoProcesso(detailItem.id) : [];
  const detailHoras = detailEtapas.reduce((s, e) => s + cargaMensalEtapa(e), 0);
  const detailResponsaveis = detailItem
    ? new Set(
        detailEtapas.flatMap(e => (e.executadoPor || []).map(r => r.nome)).filter(Boolean),
      ).size
    : 0;

  return (
    <div className="card">
      <div className="page-header-v2">
        <div className="page-header-titles">
          <h1>Processos</h1>
          <p>Cada processo agrupa o mapeamento, o cenário projetado e a configuração de ROI. Use <strong>"Detalhes"</strong> para abrir a tela única com todas as abas do processo.</p>
        </div>
        <button className="btn-add" onClick={() => { resetNovo(); setModalOpen(true); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar Processo
        </button>
      </div>

      <PageStats stats={[
        { label: 'Processos', value: String(itensFiltrados.length), tooltip: 'Processos no escopo atual dos filtros.' },
        { label: 'Etapas', value: String(etapasFiltradas.length), tooltip: 'Etapas mapeadas nos processos do escopo atual.' },
        { label: 'Carga mensal', value: fmtH(totalHoras), tooltip: 'Carga mensal do escopo atual: Σ (horas/exec × volume mensal).' },
        { label: 'Gargalos', value: String(gargalosFiltrados.length), tooltip: 'Gargalos vinculados aos processos do escopo atual.' },
        { label: 'Melhorias', value: String(melhoriasFiltradas.length), tooltip: 'Melhorias vinculadas aos processos e gargalos do escopo atual.' },
      ]} />

      <FiltrosBar
        ativo={filtrosAtivos}
        onLimpar={limparFiltros}
        filtros={[
          { id: 'fp-projeto', label: 'Projeto', value: fProjeto, onChange: setFProjeto, options: [{ value: '', label: 'Todos os projetos' }, ...projetos.map(p => ({ value: p.id, label: p.name }))], tooltip: dica('processos.filtro.projeto') },
          { id: 'fp-status', label: 'Status de avaliação', value: fStatus, onChange: setFStatus, options: STATUS_AVAL_FILTRO_OPCOES, tooltip: dica('processos.filtro.status') },
        ]}
      />
      <GrupoAccordion
        grupos={grupos}
        substantivo={['processo', 'processos']}
        emptyMessage="Nenhum processo encontrado para os filtros selecionados."
        renderGrupo={(itens) => <div className="processo-list list-stagger">{itens.map((p, index) => renderCard(p, index))}</div>}
      />

      {/* Modal Detalhes do Processo */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)}>
        <div className="modal">
          {detailItem && (
            <>
              <h2>{detailItem.name}</h2>

              {/* Badges */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                {normalizarComplexidade(detailItem.complexity_level) && (
                  <StatusBadge variant="roi">{normalizarComplexidade(detailItem.complexity_level)}</StatusBadge>
                )}
                {detailItem.evaluation_status && detailItem.evaluation_status !== 'Não avaliado' && (
                  <StatusBadge variant="diagnostic">{detailItem.evaluation_status}</StatusBadge>
                )}
                {detailItem.frequency && <StatusBadge variant="accent">{detailItem.frequency}</StatusBadge>}
              </div>

              {/* Projeto vinculado */}
              <div className="form-row">
                <div className="form-group compact">
                  <label>Projeto vinculado</label>
                  <div>{detailItem.project_id ? (projetos.find(p => p.id === detailItem.project_id)?.name || detailItem.project_id) : '—'}</div>
                </div>
              </div>

              {/* Descrição */}
              {detailItem.description && (
                <div className="form-group compact">
                  <label>Descrição</label>
                  <div style={{ whiteSpace: 'pre-line', color: '#374151' }}>{detailItem.description}</div>
                </div>
              )}

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 8, margin: '12px 0' }}>
                {[
                  { label: 'Etapas', value: String(detailEtapas.length) },
                  { label: 'Carga mensal', value: fmtH(detailHoras) },
                  { label: 'Responsáveis', value: String(detailResponsaveis) },
                  { label: 'Gargalos', value: String(detailGargalos.length) },
                  { label: 'Melhorias', value: String(detailMelhorias.length) },
                ].map(s => (
                  <div key={s.label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>{s.label}</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-color)', fontVariantNumeric: 'tabular-nums' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Etapas */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>
                  Etapas ({detailEtapas.length})
                </div>
                {detailEtapas.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Nenhuma etapa mapeada.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {detailEtapas.map(e => (
                      <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', padding: '4px 0', borderBottom: '1px solid #f8fafc' }}>
                        <span style={{ color: '#374151' }}>{e.name}</span>
                        <span style={{ color: '#64748b', fontVariantNumeric: 'tabular-nums', marginLeft: 12 }}>{fmtH(cargaMensalEtapa(e))}/mês</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Gargalos */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>
                  Gargalos ({detailGargalos.length})
                </div>
                {detailGargalos.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Nenhum gargalo identificado.</p>
                ) : (
                  <div className="tags">
                    {detailGargalos.map(g => (
                      <span key={g.id} className="tag tag-processo">{g.nome}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Melhorias */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>
                  Melhorias ({detailMelhorias.length})
                </div>
                {detailMelhorias.length === 0 ? (
                  <p style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Nenhuma melhoria planejada.</p>
                ) : (
                  <div className="tags">
                    {detailMelhorias.map(m => (
                      <span key={m.id} className="tag tag-processo">{m.improvement_description}</span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setDetailOpen(false)}>Fechar</button>
            {detailItem && (
              <Link
                to={`/equipe/digital/mapa/processos/${encodeURIComponent(detailItem.id)}/mapear`}
                className="btn-save"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                onClick={() => setDetailOpen(false)}
              >
                Abrir detalhes
              </Link>
            )}
            {detailItem && (
              <button
                className="btn-save"
                onClick={() => { setDetailOpen(false); openEdit(detailItem); }}
              >
                Editar
              </button>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal Novo Processo */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="modal">
          <h2>Novo Processo</h2>
          <FormField label="Nome" error={error} required tooltip={dica('processos.form.nome')}>
            <input type="text" value={nome} onChange={(e) => { setNome(e.target.value); if (error) setError(''); }} placeholder="Digite o nome do processo" />
          </FormField>
          <FormField label="Descrição" tooltip={dica('processos.form.descricao')}>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Digite a descrição detalhada" />
          </FormField>

          <FormField label="Projeto" required tooltip={dica('processos.form.projeto')}>
            <Select
              value={projetoId}
              onChange={setProjetoId}
              options={projetos.map(p => ({ value: p.id, label: p.name }))}
              placeholder="Selecione o projeto..."
            />
          </FormField>

          <div style={{ display: 'flex', gap: 12 }}>
            <FormField label="Frequência" tooltip={dica('processos.form.frequency')}>
              <Select value={frequencia} onChange={setFrequencia} options={FREQUENCIA_OPCOES} />
            </FormField>
            <FormField label="Complexidade" tooltip={dica('processos.form.complexity_level')}>
              <Select
                value={normalizarComplexidade(complexidade)}
                onChange={(value) => setComplexidade(normalizarComplexidade(value))}
                options={COMPLEXIDADE_OPCOES}
              />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <FormField label="Status de avaliação" tooltip={dica('processos.form.evaluation_status')}>
              <Select value={statusAvaliacao} onChange={(v) => setStatusAvaliacao(v as StatusAvaliacao)} options={STATUS_AVALIACAO_OPCOES} />
            </FormField>
          </div>

          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleSaveProcesso} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Processo */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)}>
        <div className="modal">
          <h2>Editar Processo</h2>
          <FormField label="Nome" required tooltip={dica('processos.form.nome')}>
            <input type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)} placeholder="Digite o nome do processo" />
          </FormField>
          <FormField label="Descrição" tooltip={dica('processos.form.descricao')}>
            <textarea value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} placeholder="Digite a descrição detalhada" />
          </FormField>

          <FormField label="Projeto" required tooltip={dica('processos.form.projeto')}>
            <Select
              value={editProjetoId}
              onChange={setEditProjetoId}
              options={projetos.map(p => ({ value: p.id, label: p.name }))}
              placeholder="Selecione o projeto..."
            />
          </FormField>

          <div style={{ display: 'flex', gap: 12 }}>
            <FormField label="Frequência" tooltip={dica('processos.form.frequency')}>
              <Select value={editFrequencia} onChange={setEditFrequencia} options={FREQUENCIA_OPCOES} />
            </FormField>
            <FormField label="Complexidade" tooltip={dica('processos.form.complexity_level')}>
              <Select
                value={normalizarComplexidade(editComplexidade)}
                onChange={(value) => setEditComplexidade(normalizarComplexidade(value))}
                options={COMPLEXIDADE_OPCOES}
              />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <FormField label="Status de avaliação" tooltip={dica('processos.form.evaluation_status')}>
              <Select value={editStatusAvaliacao} onChange={(v) => setEditStatusAvaliacao(v as StatusAvaliacao)} options={STATUS_AVALIACAO_OPCOES} />
            </FormField>
          </div>

          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setEditOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleSaveEdit} disabled={editSaving}>{editSaving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal isOpen={!!confirmDel} onClose={() => setConfirmDel(null)}>
        <div className="modal">
          <h2>Excluir processo</h2>
          <p>
            Tem certeza que deseja excluir <strong>{confirmDel?.name}</strong>? Todas as
            etapas e mapeamentos (Como Era e Como Ficou) deste processo serão removidos.
            Esta ação não pode ser desfeita.
          </p>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setConfirmDel(null)} disabled={deleting}>Cancelar</button>
            <button
              className="btn-save"
              style={{ background: '#b91c1c' }}
              onClick={handleConfirmDelete}
              disabled={deleting}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
