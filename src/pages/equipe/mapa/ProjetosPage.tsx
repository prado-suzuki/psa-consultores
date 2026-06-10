import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjetos, useCreateProjeto, useUpdateProjeto, useDeleteProjeto, type ProjetoInput } from '@/hooks/useProjetos';
import { useProcessos } from '@/hooks/useProcessos';
import { useEtapasLista, useMelhoriasLista } from '@/hooks/useDominioListas';
import { useClusterCadastroOpcoes } from '@/hooks/useClusters';
import { useClusterGlobal } from '@/contexts/MapaClusterContext';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import FiltrosBar from '@/components/equipe/mapa/FiltrosBar';
import PageStats from '@/components/equipe/mapa/PageStats';
import ProjectCard from '@/components/equipe/mapa/ProjectCard';
import StatusBadge from '@/components/equipe/mapa/StatusBadge';
import { Popover } from '@/components/equipe/mapa/Tooltip';
import { useHoverPopover } from '@/components/equipe/mapa/useHoverPopover';
import { dica } from '@/utils/tooltips';
import { useFocusParam } from '@/utils/useFocusParam';
import {
  JUSTIFICATIVAS_PROJETO,
  type JustificativaProjeto,
  type Etapa,
  type Melhoria,
  type Processo,
  type Projeto,
  type ProjetoStatus,
} from '@/types';

const STATUS_OPCOES: ProjetoStatus[] = ['Mapeamento', 'Diagnóstico', 'Melhorias', 'ROI'];
const STATUS_SELECT_OPCOES = STATUS_OPCOES.map(s => ({ value: s, label: s }));

const STATUS_FILTRO_OPCOES = [{ value: '', label: 'Todos os status' }, ...STATUS_SELECT_OPCOES];

const formatarData = (iso?: string) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const getProjetoOrder = (name: string) => {
  const normalized = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  const match = normalized.match(/^p\s*(\d+)/i);

  return {
    prefix: match ? Number(match[1]) : Number.MAX_SAFE_INTEGER,
    normalized,
  };
};

const compareProjetosPorOrdem = (a: Projeto, b: Projeto) => {
  const ordemA = getProjetoOrder(a.name);
  const ordemB = getProjetoOrder(b.name);

  return ordemA.prefix - ordemB.prefix
    || ordemA.normalized.localeCompare(ordemB.normalized, 'pt-BR', {
      numeric: true,
      sensitivity: 'base',
    });
};

const EMPTY_JUSTIFICATIVAS: JustificativaProjeto[] = [];

type ProjetoDetailTab = 'info' | 'processos' | 'backlog';
type MelhoriaComProjeto = Melhoria & { project_id?: string | null };

interface ProjetoFormState {
  nome: string;
  /** UUID do cluster selecionado — bind do <select>. '' = sem cluster. */
  clusterId: string;
  descricao: string;
  start_date: string;
  end_date: string;
  status: ProjetoStatus;
  justificativas: JustificativaProjeto[];
}

const EMPTY_FORM: ProjetoFormState = {
  nome: '',
  clusterId: '',
  descricao: '',
  start_date: '',
  end_date: '',
  status: 'Mapeamento',
  justificativas: EMPTY_JUSTIFICATIVAS,
};

function projetoToForm(p: Projeto): ProjetoFormState {
  return {
    nome: p.name,
    clusterId: p.cluster_id || '',
    descricao: p.description || '',
    start_date: p.start_date || '',
    end_date: p.end_date || '',
    status: p.status || 'Mapeamento',
    justificativas: p.justificativas || EMPTY_JUSTIFICATIVAS,
  };
}

interface JustificativaChipProps {
  value: JustificativaProjeto;
  label: string;
  tooltip: string;
  selected: boolean;
  onToggle: () => void;
}

function JustificativaChip({ label, tooltip, selected, onToggle }: JustificativaChipProps) {
  const id = useId();
  const { open, setOpen, pos, ref } = useHoverPopover<HTMLButtonElement>();
  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={onToggle}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-describedby={open ? id : undefined}
        aria-pressed={selected}
        style={{
          padding: '6px 12px',
          borderRadius: 20,
          fontSize: '0.82rem',
          fontWeight: 600,
          cursor: 'pointer',
          border: selected ? '1px solid #0d9488' : '1px solid #e2e8f0',
          background: selected ? '#0d9488' : '#fff',
          color: selected ? '#fff' : '#475569',
          transition: 'all 0.15s ease',
        }}
      >
        {label}
      </button>
      {open && pos && <Popover id={id} text={tooltip} pos={pos} className="tooltip-pop--wide" />}
    </>
  );
}

interface JustificativaChipsProps {
  value: JustificativaProjeto[];
  onChange: (next: JustificativaProjeto[]) => void;
}

function JustificativaChips({ value, onChange }: JustificativaChipsProps) {
  const toggle = (j: JustificativaProjeto) => {
    onChange(value.includes(j) ? value.filter(v => v !== j) : [...value, j]);
  };
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {JUSTIFICATIVAS_PROJETO.map(opt => (
        <JustificativaChip
          key={opt.value}
          value={opt.value}
          label={opt.label}
          tooltip={opt.tooltip}
          selected={value.includes(opt.value)}
          onToggle={() => toggle(opt.value)}
        />
      ))}
    </div>
  );
}

export default function ProjetosPage() {
  const { data: items = [], isLoading: projetosLoading } = useProjetos();
  const loaded = !projetosLoading;
  const createMut = useCreateProjeto();
  const updateMut = useUpdateProjeto();
  const deleteMut = useDeleteProjeto();
  const { data: processos = [], isLoading: processosLoading } = useProcessos();
  const processosLoaded = !processosLoading;
  const { data: etapas = [] } = useEtapasLista();
  const { data: melhorias = [] } = useMelhoriasLista();
  const CLUSTER_OPCOES = useClusterCadastroOpcoes();

  const [confirmDel, setConfirmDel] = useState<Projeto | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ProjetoFormState>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editForm, setEditForm] = useState<ProjetoFormState>(EMPTY_FORM);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const [viewId, setViewId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<ProjetoDetailTab>('info');
  const [expandedProcessIds, setExpandedProcessIds] = useState<Set<string>>(new Set());

  // Filtros (cluster vem do seletor global no header)
  const { cluster: fCluster } = useClusterGlobal();
  const [fStatus, setFStatus] = useState('');
  const filtrosAtivos = !!fStatus;
  const limparFiltros = () => { setFStatus(''); };
  const itensFiltrados = useMemo(() => items
    .filter(p =>
      (!fCluster || p.cluster_id === fCluster) &&
      (!fStatus || (p.status || 'Mapeamento') === fStatus)
    )
    .sort(compareProjetosPorOrdem), [items, fCluster, fStatus]);

  const projetoIdsFiltrados = useMemo(
    () => new Set(itensFiltrados.map(p => p.id)),
    [itensFiltrados],
  );

  const processosFiltrados = useMemo(
    () => processos.filter(p => p.project_id && projetoIdsFiltrados.has(p.project_id)),
    [processos, projetoIdsFiltrados],
  );

  const projetoEmFoco = useMemo(
    () => items.find(p => p.id === viewId) || null,
    [items, viewId],
  );

  const processosPorProjeto = useMemo(() => {
    const map = new Map<string, Processo[]>();
    for (const p of processos) {
      const pid = p.project_id;
      if (!pid) continue;
      const arr = map.get(pid) || [];
      arr.push(p);
      map.set(pid, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0) || a.name.localeCompare(b.name));
    }
    return map;
  }, [processos]);

  const etapasPorProcesso = useMemo(() => {
    const map = new Map<string, Etapa[]>();
    for (const etapa of etapas) {
      const arr = map.get(etapa.process_id) || [];
      arr.push(etapa);
      map.set(etapa.process_id, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.stage_order ?? 0) - (b.stage_order ?? 0) || a.name.localeCompare(b.name));
    }
    return map;
  }, [etapas]);

  const processosDoProjetoEmFoco = useMemo(
    () => projetoEmFoco ? processosPorProjeto.get(projetoEmFoco.id) || [] : [],
    [projetoEmFoco, processosPorProjeto],
  );

  const melhoriasBacklogDoProjeto = useMemo(() => {
    if (!projetoEmFoco) return [] as Melhoria[];
    const processIds = new Set(processosDoProjetoEmFoco.map((p) => p.id));
    return melhorias
      .filter((melhoria) => {
        if ((melhoria.improvement_status || 'Não iniciado') !== 'Backlog') return false;
        const melhoriaProjectId = (melhoria as MelhoriaComProjeto).project_id;
        if (melhoriaProjectId === projetoEmFoco.id) return true;
        return (melhoria.processos || []).some((processoId) => processIds.has(processoId));
      })
      .sort((a, b) => a.improvement_description.localeCompare(b.improvement_description));
  }, [melhorias, processosDoProjetoEmFoco, projetoEmFoco]);

  const validate = (f: ProjetoFormState): string => {
    if (!f.nome.trim()) return 'Preencha o nome do projeto.';
    if (f.start_date && f.end_date && f.end_date < f.start_date) return 'Data fim deve ser posterior à data início.';
    return '';
  };

  const toPayload = (f: ProjetoFormState): ProjetoInput => ({
    name: f.nome.trim(),
    cluster_id: f.clusterId || undefined,
    description: f.descricao.trim(),
    start_date: f.start_date || undefined,
    end_date: f.end_date || undefined,
    status: f.status,
    justificativas: f.justificativas.length ? f.justificativas : [],
  });

  const handleSave = async () => {
    const msg = validate(form);
    if (msg) { setError(msg); return; }
    setError('');
    setIsSaving(true);
    try {
      const created = await createMut.mutateAsync(toPayload(form));
      toast.success('Projeto criado', { description: created.name });
      setForm(EMPTY_FORM);
      setModalOpen(false);
    } catch (err) {
      toast.error('Erro ao criar projeto', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openNew = () => {
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  };

  const openProjetoDetail = (projectId: string, tab: ProjetoDetailTab = 'info') => {
    setViewId(projectId);
    setDetailTab(tab);
    setExpandedProcessIds(new Set());
  };

  const closeProjetoDetail = () => {
    setViewId(null);
    setDetailTab('info');
    setExpandedProcessIds(new Set());
  };

  const toggleProcessoExpandido = (processoId: string) => {
    setExpandedProcessIds((prev) => {
      const next = new Set(prev);
      if (next.has(processoId)) next.delete(processoId);
      else next.add(processoId);
      return next;
    });
  };

  const openEdit = (p: Projeto) => {
    setEditId(p.id);
    setEditForm(projetoToForm(p));
    setEditError('');
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    const msg = validate(editForm);
    if (msg) { setEditError(msg); return; }
    setEditError('');
    setEditSaving(true);
    try {
      const old = items.find((p) => p.id === editId);
      if (!old) throw new Error('Projeto não encontrado no cache local.');
      const patch = toPayload(editForm);
      const saved = await updateMut.mutateAsync({ id: editId, patch, old });
      toast.success('Projeto atualizado', { description: saved.name });
      setEditOpen(false);
    } catch (err) {
      toast.error('Erro ao salvar projeto', {
        description: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setEditSaving(false);
    }
  };

  const focusId = useFocusParam();
  useEffect(() => {
    if (!loaded || !focusId) return;
    const p = items.find(x => x.id === focusId);
    if (p) {
      setViewId(p.id);
      setDetailTab('info');
      setExpandedProcessIds(new Set());
    }
  }, [loaded, focusId, items]);

  if (!loaded) return (
    <div className="loading-container"><div className="spinner" /></div>
  );

  return (
    <div className="card">
      <div className="page-header-v2">
        <div className="page-header-titles">
          <h1>Projetos</h1>
          <p>Acompanhe os projetos vinculados ao mapeamento de processos.</p>
        </div>
        <button className="btn-add" onClick={openNew}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar Projeto
        </button>
      </div>
      <PageStats stats={[
        { label: 'Projetos', value: String(itensFiltrados.length), tooltip: 'Projetos no escopo atual dos filtros.' },
        { label: 'Processos', value: String(processosFiltrados.length), tooltip: 'Processos vinculados aos projetos do escopo atual.' },
      ]} />
      <FiltrosBar
        ativo={filtrosAtivos}
        onLimpar={limparFiltros}
        filtros={[
          { id: 'f-status', label: 'Status', value: fStatus, onChange: setFStatus, options: STATUS_FILTRO_OPCOES, tooltip: dica('projetos.filtro.status') },
        ]}
      />
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 20,
          paddingBottom: 24,
        }}
      >
        {itensFiltrados.map((p, i) => (
          <ProjectCard
            key={p.id}
            projeto={p}
            index={i}
            qtdProcessos={processosPorProjeto.get(p.id)?.length ?? 0}
            processosLoaded={processosLoaded}
            onView={() => openProjetoDetail(p.id)}
            onEdit={() => openEdit(p)}
            onDelete={() => setConfirmDel(p)}
            onShowProcessos={() => openProjetoDetail(p.id, 'processos')}
          />
        ))}
      </div>

      {/* === Novo projeto === */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="modal">
          <h2>Novo Projeto</h2>
          <FormField label="Nome" error={error} required tooltip={dica('projetos.form.nome')}>
            <input type="text" value={form.nome} onChange={(e) => { setForm({ ...form, nome: e.target.value }); if (error) setError(''); }} placeholder="Digite o nome do projeto" />
          </FormField>
          <FormField label="Cluster" tooltip={dica('projetos.form.cluster')}>
            <Select
              value={form.clusterId}
              onChange={(v) => setForm({ ...form, clusterId: v })}
              options={CLUSTER_OPCOES}
            />
          </FormField>
          <FormField label="Justificativa do Projeto" tooltip={dica('projetos.form.justificativas')}>
            <JustificativaChips
              value={form.justificativas}
              onChange={(next) => setForm({ ...form, justificativas: next })}
            />
          </FormField>
          <FormField label="Descrição (inclua o objetivo do projeto)" tooltip={dica('projetos.form.descricao')}>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Padronizar a planilha-mestra do DP. Detalhar contexto, escopo e entregáveis."
              rows={5}
            />
          </FormField>
          <div style={{ display: 'flex', gap: 12 }}>
            <FormField label="Data início" tooltip={dica('projetos.form.start_date')}>
              <input type="date" value={form.start_date} onChange={(e) => { setForm({ ...form, start_date: e.target.value }); if (error) setError(''); }} />
            </FormField>
            <FormField label="Data fim" tooltip={dica('projetos.form.end_date')}>
              <input type="date" value={form.end_date} onChange={(e) => { setForm({ ...form, end_date: e.target.value }); if (error) setError(''); }} />
            </FormField>
          </div>
          <FormField label="Status (fase atual do projeto)" tooltip={dica('projetos.form.status')}>
            <Select
              value={form.status}
              onChange={(v) => setForm({ ...form, status: v as ProjetoStatus })}
              options={STATUS_SELECT_OPCOES}
            />
          </FormField>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>

      {/* === Edição === */}
      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)}>
        <div className="modal">
          <h2>Editar Projeto</h2>
          <FormField label="Nome" error={editError} required tooltip={dica('projetos.form.nome')}>
            <input type="text" value={editForm.nome} onChange={(e) => { setEditForm({ ...editForm, nome: e.target.value }); if (editError) setEditError(''); }} placeholder="Digite o nome do projeto" />
          </FormField>
          <FormField label="Cluster" tooltip={dica('projetos.form.cluster')}>
            <Select
              value={editForm.clusterId}
              onChange={(v) => setEditForm({ ...editForm, clusterId: v })}
              options={CLUSTER_OPCOES}
            />
          </FormField>
          <FormField label="Justificativa do Projeto" tooltip={dica('projetos.form.justificativas')}>
            <JustificativaChips
              value={editForm.justificativas}
              onChange={(next) => setEditForm({ ...editForm, justificativas: next })}
            />
          </FormField>
          <FormField label="Descrição (inclua o objetivo do projeto)" tooltip={dica('projetos.form.descricao')}>
            <textarea
              value={editForm.descricao}
              onChange={(e) => setEditForm({ ...editForm, descricao: e.target.value })}
              placeholder="Descrição detalhada do projeto, incluindo o objetivo."
              rows={5}
            />
          </FormField>
          <div style={{ display: 'flex', gap: 12 }}>
            <FormField label="Data início" tooltip={dica('projetos.form.start_date')}>
              <input type="date" value={editForm.start_date} onChange={(e) => { setEditForm({ ...editForm, start_date: e.target.value }); if (editError) setEditError(''); }} />
            </FormField>
            <FormField label="Data fim" tooltip={dica('projetos.form.end_date')}>
              <input type="date" value={editForm.end_date} onChange={(e) => { setEditForm({ ...editForm, end_date: e.target.value }); if (editError) setEditError(''); }} />
            </FormField>
          </div>
          <FormField label="Status (fase atual do projeto)" tooltip={dica('projetos.form.status')}>
            <Select
              value={editForm.status}
              onChange={(v) => setEditForm({ ...editForm, status: v as ProjetoStatus })}
              options={STATUS_SELECT_OPCOES}
            />
          </FormField>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setEditOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleUpdate} disabled={editSaving}>{editSaving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>

      {/* === Ver detalhes (read-only) === */}
      <Modal isOpen={!!projetoEmFoco} onClose={closeProjetoDetail}>
        <div className="modal projeto-detail-modal">
          {projetoEmFoco && (
            <>
              <div className="projeto-detail-header">
                <div className="projeto-detail-title">
                  <span className="projeto-detail-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 7h6l2 2h10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                      <path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h4" />
                    </svg>
                  </span>
                  <div>
                    <h2>{projetoEmFoco.name}</h2>
                    <p>{projetoEmFoco.clusterName || 'Sem cluster definido'}</p>
                  </div>
                </div>
                <div className="projeto-detail-badges">
                  <StatusBadge status={projetoEmFoco.status || 'Mapeamento'} />
                  {(projetoEmFoco.justificativas || []).map(j => (
                    <StatusBadge key={j} variant="neutral">{j}</StatusBadge>
                  ))}
                </div>
              </div>

              <div className="projeto-detail-metrics">
                <div>
                  <span>Processos</span>
                  <strong>{processosDoProjetoEmFoco.length}</strong>
                </div>
                <div>
                  <span>Etapas</span>
                  <strong>
                    {processosDoProjetoEmFoco.reduce((sum, processo) => sum + (etapasPorProcesso.get(processo.id)?.length || 0), 0)}
                  </strong>
                </div>
                <div>
                  <span>Backlog</span>
                  <strong>{melhoriasBacklogDoProjeto.length}</strong>
                </div>
              </div>

              <div className="projeto-detail-tabs" role="tablist" aria-label="Detalhes do projeto">
                {([
                  ['info', 'Informações'],
                  ['processos', `Processos (${processosDoProjetoEmFoco.length})`],
                  ['backlog', `Backlog (${melhoriasBacklogDoProjeto.length})`],
                ] as const).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    role="tab"
                    aria-selected={detailTab === tab}
                    className={detailTab === tab ? 'active' : ''}
                    onClick={() => setDetailTab(tab)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {detailTab === 'info' && (
                <div className="projeto-detail-panel">
                  <section className="projeto-detail-section">
                    <h3>Informações</h3>
                    <div className="projeto-detail-description">
                      {projetoEmFoco.description || 'Sem descrição.'}
                    </div>
                  </section>
                  <div className="projeto-detail-info-grid">
                    <div>
                      <span>Cluster</span>
                      <strong>{projetoEmFoco.clusterName || 'Não definido'}</strong>
                    </div>
                    <div>
                      <span>Status</span>
                      <strong>{projetoEmFoco.status || 'Mapeamento'}</strong>
                    </div>
                    <div>
                      <span>Início</span>
                      <strong>{formatarData(projetoEmFoco.start_date)}</strong>
                    </div>
                    <div>
                      <span>Fim</span>
                      <strong>{formatarData(projetoEmFoco.end_date)}</strong>
                    </div>
                  </div>
                  <section className="projeto-detail-section">
                    <h3>Justificativas</h3>
                    {(projetoEmFoco.justificativas || []).length > 0 ? (
                      <div className="projeto-detail-chip-row">
                        {(projetoEmFoco.justificativas || []).map(j => (
                          <StatusBadge key={j} variant="neutral">{j}</StatusBadge>
                        ))}
                      </div>
                    ) : (
                      <p className="projeto-detail-empty-inline">Nenhuma justificativa cadastrada.</p>
                    )}
                  </section>
                </div>
              )}

              {detailTab === 'processos' && (
                <div className="projeto-detail-panel">
                  <div className="projeto-detail-list-header">
                    <span>Processo</span>
                    <span>Status</span>
                    <span>Etapas</span>
                    <span>Ação</span>
                  </div>
                  <div className="projeto-detail-row-list">
                    {processosDoProjetoEmFoco.map((processo, index) => {
                      const etapasDoProcesso = etapasPorProcesso.get(processo.id) || [];
                      const expanded = expandedProcessIds.has(processo.id);
                      return (
                        <div key={processo.id} className={`projeto-process-row${expanded ? ' expanded' : ''}`}>
                          <button
                            type="button"
                            className="projeto-process-summary"
                            onClick={() => toggleProcessoExpandido(processo.id)}
                            aria-expanded={expanded}
                          >
                            <span className="projeto-process-index">{String(index + 1).padStart(2, '0')}</span>
                            <span className="projeto-process-name">{processo.name}</span>
                            <span className="projeto-process-status">
                              <StatusBadge variant="neutral">{processo.evaluation_status || 'Não avaliado'}</StatusBadge>
                            </span>
                            <span className="projeto-process-count">{etapasDoProcesso.length} etapa{etapasDoProcesso.length === 1 ? '' : 's'}</span>
                            <span className="projeto-process-chevron" aria-hidden="true">⌄</span>
                          </button>
                          {expanded && (
                            <div className="projeto-process-details">
                              <p>{processo.description || 'Sem descrição.'}</p>
                              <div className="projeto-process-etapas">
                                {etapasDoProcesso.length > 0 ? etapasDoProcesso.map((etapa) => (
                                  <span key={etapa.id}>
                                    {etapa.stage_order ?? '•'}. {etapa.name}
                                  </span>
                                )) : (
                                  <em>Nenhuma etapa mapeada.</em>
                                )}
                              </div>
                              <Link to={`/equipe/digital/mapa/processos/${encodeURIComponent(processo.id)}/mapear`}>
                                Abrir mapeamento
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {processosDoProjetoEmFoco.length === 0 && (
                      <div className="projeto-detail-empty">
                        Nenhum processo vinculado.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {detailTab === 'backlog' && (
                <div className="projeto-detail-panel">
                  <div className="projeto-detail-list-header projeto-backlog-header">
                    <span>Melhoria</span>
                    <span>Processos</span>
                    <span>Esforço</span>
                    <span>Status</span>
                  </div>
                  <div className="projeto-detail-row-list">
                    {melhoriasBacklogDoProjeto.map((melhoria) => {
                      const processosVinculados = (melhoria.processos || [])
                        .map((processoId) => processos.find((processo) => processo.id === processoId)?.name)
                        .filter((nome): nome is string => Boolean(nome));
                      const horas = (melhoria.training_hours || 0) +
                        (melhoria.executadoPor || []).reduce((sum, resp) => sum + (resp.horas || 0), 0);
                      return (
                        <div key={melhoria.id} className="projeto-backlog-row">
                          <div className="projeto-backlog-main">
                            <strong>{melhoria.improvement_description}</strong>
                            <p>{melhoria.acoesTd?.length ? melhoria.acoesTd.join(' · ') : 'Sem ações TD cadastradas.'}</p>
                          </div>
                          <div className="projeto-backlog-processes">
                            {processosVinculados.length > 0 ? processosVinculados.join(', ') : 'Projeto'}
                          </div>
                          <div className="projeto-backlog-effort">{horas > 0 ? `${horas.toLocaleString('pt-BR')}h` : '—'}</div>
                          <div><StatusBadge variant="neutral">Backlog</StatusBadge></div>
                        </div>
                      );
                    })}
                    {melhoriasBacklogDoProjeto.length === 0 && (
                      <div className="projeto-detail-empty">
                        Nenhuma melhoria em Backlog vinculada a este projeto.
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="modal-actions">
                <button className="btn-cancel" onClick={closeProjetoDetail}>Fechar</button>
                <button
                  className="btn-save"
                  onClick={() => {
                    const target = projetoEmFoco;
                    closeProjetoDetail();
                    if (target) openEdit(target);
                  }}
                >
                  Editar
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* === Confirmar Exclusão === */}
      <Modal isOpen={!!confirmDel} onClose={() => setConfirmDel(null)}>
        <div className="modal">
          <h2>Excluir projeto</h2>
          <p>
            Tem certeza que deseja excluir <strong>{confirmDel?.name}</strong>? O projeto será
            removido permanentemente. Os processos vinculados a ele ficarão sem projeto associado.
            Esta ação não pode ser desfeita.
          </p>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setConfirmDel(null)} disabled={deleting}>Cancelar</button>
            <button
              className="btn-save"
              style={{ background: '#b91c1c' }}
              disabled={deleting}
              onClick={async () => {
                if (!confirmDel) return;
                setDeleting(true);
                try {
                  await deleteMut.mutateAsync({ id: confirmDel.id, old: confirmDel });
                  toast.success('Projeto excluído', { description: confirmDel.name });
                  setConfirmDel(null);
                } catch (err) {
                  toast.error('Erro ao excluir projeto', {
                    description: err instanceof Error ? err.message : String(err),
                  });
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

