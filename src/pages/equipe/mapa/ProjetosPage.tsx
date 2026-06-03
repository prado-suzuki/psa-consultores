import { useEffect, useId, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStoredData } from '@/hooks/useStoredData';
import { useProjetos, useCreateProjeto, useUpdateProjeto, useDeleteProjeto, type ProjetoInput } from '@/hooks/useProjetos';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import FiltrosBar from '@/components/equipe/mapa/FiltrosBar';
import PageStats from '@/components/equipe/mapa/PageStats';
import { Tooltip, Popover } from '@/components/equipe/mapa/Tooltip';
import { useHoverPopover } from '@/components/equipe/mapa/useHoverPopover';
import { dica } from '@/utils/tooltips';
import { useFocusParam } from '@/utils/useFocusParam';
import { CLUSTER_OPCOES, CLUSTER_FILTRO_OPCOES } from '@/utils/clusters';
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
  cluster: string;
  descricao: string;
  dataInicio: string;
  dataFim: string;
  status: ProjetoStatus;
  justificativas: JustificativaProjeto[];
}

const EMPTY_FORM: ProjetoFormState = {
  nome: '',
  cluster: '',
  descricao: '',
  dataInicio: '',
  dataFim: '',
  status: 'Mapeamento',
  justificativas: EMPTY_JUSTIFICATIVAS,
};

function projetoToForm(p: Projeto): ProjetoFormState {
  return {
    nome: p.nome,
    cluster: p.cluster || '',
    descricao: p.descricao || '',
    dataInicio: p.dataInicio || '',
    dataFim: p.dataFim || '',
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
  // Migração para hooks de domínio (preparação integração PSA Lovable).
  // - `useStoredData` continua sendo usado nas outras 11 páginas (deprecated mas válido).
  // - Projetos passa a usar a fachada Supabase-like + React Query.
  const { data: items = [], isLoading: projetosLoading } = useProjetos();
  const loaded = !projetosLoading;
  const createMut = useCreateProjeto();
  const updateMut = useUpdateProjeto();
  const deleteMut = useDeleteProjeto();
  const { items: processos, loaded: processosLoaded } = useStoredData<Processo>('processosAdicionados', '/processes.json');

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
    (!fCluster || p.cluster === fCluster) &&
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
      const pid = p.projetoId;
      if (!pid) continue;
      const arr = map.get(pid) || [];
      arr.push(p);
      map.set(pid, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || a.nome.localeCompare(b.nome));
    }
    return map;
  }, [processos]);

  const processosDoModal = processosProjetoId ? processosPorProjeto.get(processosProjetoId) || [] : [];

  const validate = (f: ProjetoFormState): string => {
    if (!f.nome.trim()) return 'Preencha o nome do projeto.';
    if (f.dataInicio && f.dataFim && f.dataFim < f.dataInicio) return 'Data fim deve ser posterior à data início.';
    return '';
  };

  const toPayload = (f: ProjetoFormState): ProjetoInput => ({
    nome: f.nome.trim(),
    cluster: f.cluster.trim() || undefined,
    descricao: f.descricao.trim(),
    dataInicio: f.dataInicio || undefined,
    dataFim: f.dataFim || undefined,
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
      toast.success('Projeto criado', { description: created.nome });
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
      toast.success('Projeto atualizado', { description: saved.nome });
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
      <div className="card-header">
        <h1>Projetos</h1>
        <button className="btn-add" onClick={openNew}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar Projeto
        </button>
      </div>
      <p>Acompanhe os projetos vinculados ao mapeamento de processos.</p>
      <PageStats stats={[
        { label: 'Projetos', value: String(items.length), tooltip: 'Total de projetos cadastrados.' },
        { label: 'Clusters', value: String(new Set(items.map(p => p.cluster).filter(Boolean)).size), tooltip: 'Clusters distintos representados nos projetos (ex.: OSG agrupa P1..P6).' },
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
      <div className="project-list">
        {itensFiltrados.map((p) => {
          const qtdProcessos = processosPorProjeto.get(p.id)?.length ?? 0;
          return (
            <div
              key={p.id}
              className="project-card"
              style={{ position: 'relative', cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              onClick={() => setViewId(p.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViewId(p.id); } }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <h3><Tooltip text={dica('projetos.card.titulo')}>{p.nome}</Tooltip></h3>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="btn-edit"
                    onClick={(e) => { e.stopPropagation(); setViewId(p.id); }}
                    title="Ver detalhes do projeto"
                    style={{ padding: '4px 6px' }}
                    aria-label="Ver detalhes"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  </button>
                  <button
                    className="btn-edit"
                    onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                    title="Editar projeto"
                    style={{ padding: '4px 6px' }}
                    aria-label="Editar projeto"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                  <button
                    className="btn-edit"
                    onClick={(e) => { e.stopPropagation(); setConfirmDel(p); }}
                    title="Excluir projeto"
                    style={{ padding: '4px 6px', color: '#b91c1c' }}
                    aria-label="Excluir projeto"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                  </button>
                </div>
              </div>
              {p.cluster && (
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--primary-color)', fontWeight: 700, marginTop: 4, marginBottom: 6 }}>
                  Cluster: {p.cluster}
                </div>
              )}
              {p.justificativas && p.justificativas.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {p.justificativas.map(j => (
                    <span key={j} className="status-badge" style={{ background: '#ecfeff', color: '#155e75', fontSize: '0.7rem' }}>
                      {j}
                    </span>
                  ))}
                </div>
              )}
              <p style={{ whiteSpace: 'pre-line' }}>{p.descricao || 'Sem descrição.'}</p>
              <div style={{ marginTop: 8 }}>
                <span className={`status-badge status-${(p.status || 'Mapeamento').toLowerCase().replace('ó', 'o')}`}>{p.status || 'Mapeamento'}</span>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: 'var(--text-secondary, #666)', marginTop: 8 }}>
                <span><strong>Início:</strong> {formatarData(p.dataInicio)}</span>
                <span><strong>Fim:</strong> {formatarData(p.dataFim)}</span>
              </div>
              <div className="card-actions">
                <button
                  className="btn-action"
                  onClick={(e) => { e.stopPropagation(); setProcessosProjetoId(p.id); }}
                  disabled={!processosLoaded}
                  title="Ver processos vinculados"
                >
                  Processos
                  <span style={{
                    marginLeft: 6,
                    background: qtdProcessos > 0 ? '#0d9488' : '#cbd5e1',
                    color: '#fff',
                    borderRadius: 10,
                    padding: '1px 8px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}>{qtdProcessos}</span>
                </button>
              </div>
            </div>
          );
        })}
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
              value={form.cluster}
              onChange={(v) => setForm({ ...form, cluster: v })}
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
            <FormField label="Data início" tooltip={dica('projetos.form.dataInicio')}>
              <input type="date" value={form.dataInicio} onChange={(e) => { setForm({ ...form, dataInicio: e.target.value }); if (error) setError(''); }} />
            </FormField>
            <FormField label="Data fim" tooltip={dica('projetos.form.dataFim')}>
              <input type="date" value={form.dataFim} onChange={(e) => { setForm({ ...form, dataFim: e.target.value }); if (error) setError(''); }} />
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
              value={editForm.cluster}
              onChange={(v) => setEditForm({ ...editForm, cluster: v })}
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
            <FormField label="Data início" tooltip={dica('projetos.form.dataInicio')}>
              <input type="date" value={editForm.dataInicio} onChange={(e) => { setEditForm({ ...editForm, dataInicio: e.target.value }); if (editError) setEditError(''); }} />
            </FormField>
            <FormField label="Data fim" tooltip={dica('projetos.form.dataFim')}>
              <input type="date" value={editForm.dataFim} onChange={(e) => { setEditForm({ ...editForm, dataFim: e.target.value }); if (editError) setEditError(''); }} />
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
              <h2 style={{ marginBottom: 4 }}>{projetoEmFoco.nome}</h2>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
                <span className={`status-badge status-${(projetoEmFoco.status || 'Mapeamento').toLowerCase().replace('ó', 'o')}`}>{projetoEmFoco.status || 'Mapeamento'}</span>
              </div>

              {projetoEmFoco.cluster && (
                <div style={{ fontSize: '0.85rem', marginBottom: 10 }}>
                  <strong style={{ color: 'var(--primary-color)' }}>Cluster:</strong> {projetoEmFoco.cluster}
                </div>
              )}

              {projetoEmFoco.justificativas && projetoEmFoco.justificativas.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: 700, marginBottom: 4 }}>
                    Justificativas
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {projetoEmFoco.justificativas.map(j => (
                      <span key={j} className="status-badge" style={{ background: '#ecfeff', color: '#155e75', fontSize: '0.72rem' }}>{j}</span>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: 700, marginBottom: 4 }}>
                  Descrição
                </div>
                <div style={{ whiteSpace: 'pre-line', fontSize: '0.9rem', lineHeight: 1.5, color: '#334155' }}>
                  {projetoEmFoco.descricao || 'Sem descrição.'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 24, fontSize: '0.85rem', color: '#475569', marginBottom: 16 }}>
                <span><strong>Início:</strong> {formatarData(projetoEmFoco.dataInicio)}</span>
                <span><strong>Fim:</strong> {formatarData(projetoEmFoco.dataFim)}</span>
              </div>

              <div>
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#64748b', fontWeight: 700, marginBottom: 6 }}>
                  Processos vinculados ({processosPorProjeto.get(projetoEmFoco.id)?.length ?? 0})
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, maxHeight: 180, overflowY: 'auto' }}>
                  {(processosPorProjeto.get(projetoEmFoco.id) || []).map(pr => (
                    <li key={pr.id} style={{ padding: '6px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.86rem' }}>
                      <Link to={`/equipe/digital/mapa/processos/${encodeURIComponent(pr.id)}/mapear`} style={{ color: 'var(--accent-color)', textDecoration: 'none' }}>
                        {pr.nome}
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
            Tem certeza que deseja excluir <strong>{confirmDel?.nome}</strong>? O projeto será
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
                  toast.success('Projeto excluído', { description: confirmDel.nome });
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
              <h2 style={{ marginBottom: 4 }}>Processos — {projetoProcessos.nome}</h2>
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
                      {pr.nome}
                    </Link>
                    {pr.descricao && (
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2, lineHeight: 1.4 }}>
                        {pr.descricao}
                      </div>
                    )}
                    {(pr.frequencia || pr.complexidade) && (
                      <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                        {pr.frequencia && (
                          <span className="status-badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: '0.68rem' }}>{pr.frequencia}</span>
                        )}
                        {pr.complexidade && (
                          <span className="status-badge" style={{ background: '#fce7f3', color: '#9d174d', fontSize: '0.68rem' }}>{pr.complexidade}</span>
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

