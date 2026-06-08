import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProjetos, useCreateProjeto, useUpdateProjeto, useDeleteProjeto, type ProjetoInput } from '@/hooks/useProjetos';
import { useProcessos } from '@/hooks/useProcessos';
import { useClusterFiltroOpcoes, useClusterCadastroOpcoes } from '@/hooks/useClusters';
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

const EMPTY_JUSTIFICATIVAS: JustificativaProjeto[] = [];

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
  const CLUSTER_OPCOES = useClusterCadastroOpcoes();
  const CLUSTER_FILTRO_OPCOES = useClusterFiltroOpcoes();

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
  const [processosProjetoId, setProcessosProjetoId] = useState<string | null>(null);

  // Filtros
  const [fCluster, setFCluster] = useState('');
  const [fStatus, setFStatus] = useState('');
  const filtrosAtivos = !!(fCluster || fStatus);
  const limparFiltros = () => { setFCluster(''); setFStatus(''); };
  const itensFiltrados = useMemo(() => items.filter(p =>
    (!fCluster || p.cluster_id === fCluster) &&
    (!fStatus || (p.status || 'Mapeamento') === fStatus)
  ), [items, fCluster, fStatus]);

  const projetoEmFoco = useMemo(
    () => items.find(p => p.id === viewId) || null,
    [items, viewId],
  );
  const projetoProcessos = useMemo(
    () => processos.find(p => p.id === processosProjetoId) || null,
    [processos, processosProjetoId],
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

  const processosDoModal = processosProjetoId ? processosPorProjeto.get(processosProjetoId) || [] : [];

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
    if (p) setViewId(p.id);
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
        { label: 'Projetos', value: String(items.length), tooltip: 'Total de projetos cadastrados.' },
        { label: 'Clusters', value: String(new Set(items.map(p => p.clusterName).filter(Boolean)).size), tooltip: 'Clusters distintos representados nos projetos (ex.: OSG agrupa P1..P6).' },
        { label: 'Processos', value: String(processos.length), tooltip: 'Total de processos cadastrados e vinculáveis a projetos.' },
      ]} />
      <FiltrosBar
        ativo={filtrosAtivos}
        onLimpar={limparFiltros}
        filtros={[
          { id: 'f-cluster', label: 'Cluster', value: fCluster, onChange: setFCluster, options: CLUSTER_FILTRO_OPCOES, tooltip: dica('comum.filtro.cluster') },
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
            onView={() => setViewId(p.id)}
            onEdit={() => openEdit(p)}
            onDelete={() => setConfirmDel(p)}
            onShowProcessos={() => setProcessosProjetoId(p.id)}
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
      <Modal isOpen={!!projetoEmFoco} onClose={() => setViewId(null)}>
        <div className="modal">
          {projetoEmFoco && (
            <>
              <h2 style={{ marginBottom: 4 }}>{projetoEmFoco.name}</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                <StatusBadge status={projetoEmFoco.status || 'Mapeamento'} />
              </div>

              {projetoEmFoco.clusterName && (
                <div style={{ fontSize: '0.85rem', marginBottom: 10 }}>
                  <strong style={{ color: 'var(--primary-color)' }}>Cluster:</strong> {projetoEmFoco.clusterName}
                </div>
              )}

              {projetoEmFoco.justificativas && projetoEmFoco.justificativas.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: 700, marginBottom: 4 }}>
                    Justificativas
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {projetoEmFoco.justificativas.map(j => (
                      <StatusBadge key={j} variant="neutral">{j}</StatusBadge>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: 700, marginBottom: 4 }}>
                  Descrição
                </div>
                <div style={{ whiteSpace: 'pre-line', fontSize: '0.9rem', lineHeight: 1.5, color: '#334155' }}>
                  {projetoEmFoco.description || 'Sem descrição.'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24, fontSize: '0.85rem', color: '#475569', marginBottom: 16 }}>
                <span><strong>Início:</strong> {formatarData(projetoEmFoco.start_date)}</span>
                <span><strong>Fim:</strong> {formatarData(projetoEmFoco.end_date)}</span>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: 700, marginBottom: 6 }}>
                  Processos vinculados ({processosPorProjeto.get(projetoEmFoco.id)?.length ?? 0})
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 180, overflowY: 'auto' }}>
                  {(processosPorProjeto.get(projetoEmFoco.id) || []).map(pr => (
                    <li key={pr.id} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.86rem' }}>
                      <Link to={`/equipe/digital/mapa/processos/${encodeURIComponent(pr.id)}/mapear`} style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>
                        {pr.name}
                      </Link>
                    </li>
                  ))}
                  {(processosPorProjeto.get(projetoEmFoco.id) || []).length === 0 && (
                    <li style={{ padding: '6px 0', fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic' }}>
                      Nenhum processo vinculado.
                    </li>
                  )}
                </ul>
              </div>

              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setViewId(null)}>Fechar</button>
                <button
                  className="btn-save"
                  onClick={() => {
                    const target = projetoEmFoco;
                    setViewId(null);
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

      {/* === Lista de Processos do projeto (acionada pelo botão "Processos") === */}
      <Modal isOpen={!!projetoProcessos} onClose={() => setProcessosProjetoId(null)}>
        <div className="modal">
          {projetoProcessos && (
            <>
              <h2 style={{ marginBottom: 4 }}>Processos — {projetoProcessos.name}</h2>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: 12 }}>
                {processosDoModal.length} processo(s) vinculado(s). Clique em um deles para abrir o mapeamento.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 360, overflowY: 'auto' }}>
                {processosDoModal.map(pr => (
                  <li key={pr.id} style={{ padding: '10px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <Link
                      to={`/equipe/digital/mapa/processos/${encodeURIComponent(pr.id)}/mapear`}
                      style={{ color: 'var(--primary-color)', textDecoration: 'none', fontWeight: 600 }}
                    >
                      {pr.name}
                    </Link>
                    {pr.description && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>
                        {pr.description}
                      </div>
                    )}
                    {(pr.frequency || pr.complexity_level) && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        {pr.frequency && (
                          <span className="status-badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.68rem' }}>{pr.frequency}</span>
                        )}
                        {pr.complexity_level && (
                          <span className="status-badge" style={{ background: '#fce7f3', color: '#9d174d', fontSize: '0.68rem' }}>{pr.complexity_level}</span>
                        )}
                      </div>
                    )}
                  </li>
                ))}
                {processosDoModal.length === 0 && (
                  <li style={{ padding: '14px 0', fontSize: '0.88rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>
                    Nenhum processo vinculado a este projeto.
                  </li>
                )}
              </ul>
              <div className="modal-actions">
                <button className="btn-cancel" onClick={() => setProcessosProjetoId(null)}>Fechar</button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}

