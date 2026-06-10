import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import ChipSelector from '@/components/equipe/mapa/ChipSelector';
import FiltrosBar from '@/components/equipe/mapa/FiltrosBar';
import GrupoAccordion from '@/components/equipe/mapa/GrupoAccordion';
import PageStats from '@/components/equipe/mapa/PageStats';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';
import { agrupar } from '@/utils/agrupar';
import { formatDecimal } from '@/utils/format';
import { useFocusParam } from '@/utils/useFocusParam';
import { openOnActivationKey, shouldIgnoreOpenClick } from '@/utils/clickOpenGuard';
import type { Gargalo, GargaloEtapaRef } from '@/types';
import { useProcessosLista, useMelhoriasLista } from '@/hooks/useDominioListas';
import { useEtapas } from '@/hooks/useEtapas';
import { useGargalos, useCreateGargalo, useUpdateGargalo, useDeleteGargalo } from '@/hooks/useGargalos';
import { useClusterCadastroOpcoes } from '@/hooks/useClusters';
import { useClusterGlobal } from '@/contexts/MapaClusterContext';
import SeletorEtapasOrigem from '@/components/equipe/mapa/SeletorEtapasOrigem';

const ORIGEM_OPCOES = [
  { value: 'Processo', label: 'Processo' },
  { value: 'Sistema', label: 'Sistema' },
  { value: 'Pessoas', label: 'Pessoas' },
  { value: 'Cliente', label: 'Cliente' },
  { value: 'Externo', label: 'Externo (regulatório / terceiros)' },
];
const ORIGEM_FILTRO_OPCOES = [{ value: '', label: 'Todas as origens' }, ...ORIGEM_OPCOES];

const ORGANIZAR_OPCOES = [
  { value: 'origem', label: 'Por origem' },
  { value: 'processo', label: 'Por processo afetado' },
];

export default function GargalosPage() {
  const { data: items = [], isLoading: gargalosLoading } = useGargalos();
  const loaded = !gargalosLoading;
  const createGargalo = useCreateGargalo();
  const updateGargalo = useUpdateGargalo();
  const deleteGargalo = useDeleteGargalo();
  const CLUSTER_OPCOES = useClusterCadastroOpcoes();

  const { data: processos = [] } = useProcessosLista();
  const { data: melhoriasList = [] } = useMelhoriasLista();
  const { data: etapasAll = [] } = useEtapas();

  const procNomeById = useMemo(
    () => new Map(processos.map(p => [p.id, p.name])),
    [processos]
  );
  const procIdByNome = useMemo(
    () => new Map(processos.map(p => [p.name, p.id])),
    [processos]
  );
  const procOptionsOrdenado = useMemo(
    () => [...processos].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)),
    [processos]
  );
  // Rótulo curto da melhoria = título antes de " — " (descrições renomeadas).
  const melhoriaLabel = (desc: string): string => {
    const i = desc.indexOf(' — ');
    if (i > 0) return desc.slice(0, i).trim();
    return desc.length > 50 ? `${desc.slice(0, 50)}…` : desc;
  };
  const melhoriaNomeById = useMemo(
    () => new Map(melhoriasList.map(m => [m.id, melhoriaLabel(m.improvement_description)])),
    [melhoriasList]
  );
  const melhoriaIdByLabel = useMemo(
    () => new Map(melhoriasList.map(m => [melhoriaLabel(m.improvement_description), m.id])),
    [melhoriasList]
  );
  const melhoriaLabelOptions = useMemo(
    () => melhoriasList.map(m => melhoriaLabel(m.improvement_description)),
    [melhoriasList]
  );
  const idsToNames = (ids: string[]) =>
    ids.map(id => procNomeById.get(id)).filter((n): n is string => Boolean(n));
  const namesToIds = (names: string[]) =>
    names.map(n => procIdByNome.get(n)).filter((id): id is string => Boolean(id));
  const melhoriaIdsToLabels = (ids: string[]) =>
    ids.map(id => melhoriaNomeById.get(id)).filter((n): n is string => Boolean(n));
  const melhoriaLabelsToIds = (labels: string[]) =>
    labels.map(l => melhoriaIdByLabel.get(l)).filter((id): id is string => Boolean(id));

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Gargalo | null>(null);

  // Delete confirm
  const [confirmDel, setConfirmDel] = useState<Gargalo | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filtros (cluster vem do seletor global no header)
  const { cluster: fCluster } = useClusterGlobal();
  const [fOrigem, setFOrigem] = useState('');
  const [fProcesso, setFProcesso] = useState('');
  const filtrosAtivos = !!(fOrigem || fProcesso);
  const limparFiltros = () => { setFOrigem(''); setFProcesso(''); };

  // Criação
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [origem, setOrigem] = useState('');
  const [clusterId, setClusterId] = useState('');
  const [processosNomes, setProcessosNomes] = useState<string[]>([]);
  const [etapasOrigem, setEtapasOrigem] = useState<GargaloEtapaRef[]>([]);
  const [melhoriaNomes, setMelhoriaNomes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Edição
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editNome, setEditNome] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editOrigem, setEditOrigem] = useState('');
  const [editClusterId, setEditClusterId] = useState('');
  const [editProcessosNomes, setEditProcessosNomes] = useState<string[]>([]);
  const [editEtapasOrigem, setEditEtapasOrigem] = useState<GargaloEtapaRef[]>([]);
  const [editMelhoriaNomes, setEditMelhoriaNomes] = useState<string[]>([]);
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const handleSave = async () => {
    if (!nome.trim()) { setError('Preencha o nome do gargalo.'); return; }
    setError('');
    setIsSaving(true);
    try {
      await createGargalo.mutateAsync({
        nome: nome.trim(),
        descricao: descricao.trim(),
        origem: origem.trim(),
        cluster_id: clusterId || undefined,
        processos: namesToIds(processosNomes),
        etapasOrigem,
        melhorias: melhoriaLabelsToIds(melhoriaNomes),
      });
      toast.success('Gargalo criado');
      setNome(''); setDescricao(''); setOrigem(''); setClusterId('');
      setProcessosNomes([]); setEtapasOrigem([]); setMelhoriaNomes([]);
      setModalOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = (g: Gargalo) => {
    setEditId(g.id);
    setEditNome(g.nome);
    setEditDescricao(g.descricao || '');
    setEditOrigem(g.origem || '');
    setEditClusterId(g.cluster_id || '');
    setEditProcessosNomes(idsToNames(g.processos || []));
    setEditEtapasOrigem(g.etapasOrigem || []);
    setEditMelhoriaNomes(melhoriaIdsToLabels(g.melhorias || []));
    setEditError('');
    setEditOpen(true);
  };

  const openDetail = (g: Gargalo) => { setDetailItem(g); setDetailOpen(true); };

  const handleUpdate = async () => {
    if (!editNome.trim()) { setEditError('Preencha o nome do gargalo.'); return; }
    const old = items.find(g => g.id === editId);
    if (!old) return;
    setEditError('');
    setEditSaving(true);
    try {
      await updateGargalo.mutateAsync({
        id: editId,
        old,
        patch: {
          nome: editNome.trim(),
          descricao: editDescricao.trim(),
          origem: editOrigem.trim(),
          cluster_id: editClusterId || undefined,
          processos: namesToIds(editProcessosNomes),
          etapasOrigem: editEtapasOrigem,
          melhorias: melhoriaLabelsToIds(editMelhoriaNomes),
        },
      });
      toast.success('Gargalo atualizado');
      setEditOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err));
    } finally {
      setEditSaving(false);
    }
  };

  const itensFiltrados = useMemo(() => items.filter(g =>
    (!fCluster || g.cluster_id === fCluster) &&
    (!fOrigem || g.origem === fOrigem) &&
    (!fProcesso || (g.processos || []).includes(fProcesso))
  ), [items, fCluster, fOrigem, fProcesso]);

  // Organizador (primeiro filtro): agrupa em cards expansíveis.
  const [organizar, setOrganizar] = useState('origem');
  const grupos = useMemo(() => {
    if (organizar === 'processo') return agrupar(itensFiltrados, (g) => g.processos || [], procOptionsOrdenado.map((p) => ({ value: p.id, label: p.name })), 'Sem processo');
    return agrupar(itensFiltrados, (g) => [g.origem || ''], ORIGEM_OPCOES, 'Sem origem');
  }, [organizar, itensFiltrados, procOptionsOrdenado]);

  // KPI computations
  const totalHoras = useMemo(
    () => itensFiltrados.reduce((acc, g) => acc + (g.horas_gastas || 0), 0),
    [itensFiltrados]
  );
  const processosDistintos = useMemo(
    () => new Set(itensFiltrados.flatMap(g => g.processos || [])).size,
    [itensFiltrados]
  );
  const gargalosResolvidos = useMemo(
    () => itensFiltrados.filter(g => (g.melhorias ?? []).length > 0).length,
    [itensFiltrados]
  );
  const gargalosComCascata = useMemo(
    () => itensFiltrados.filter(g => (g.etapasOrigem ?? []).length > 0).length,
    [itensFiltrados]
  );

  // Focus param
  const focusId = useFocusParam();
  useEffect(() => {
    if (loaded && focusId) {
      const g = items.find(x => x.id === focusId);
      if (g) openDetail(g);
    }
  }, [loaded, focusId, items]);

  if (!loaded) return (
    <div className="loading-container"><div className="spinner" /></div>
  );

  return (
    <div className="card">
      <div className="page-header-v2">
        <div className="page-header-titles">
          <h1>Gargalos</h1>
          <p>Gargalos afetam um ou mais processos. Cadastre-os de forma generalista para mapear o ROI corretamente em todos os processos impactados.</p>
        </div>
        <button className="btn-add" onClick={() => {
          setNome(''); setDescricao(''); setOrigem(''); setClusterId(''); setProcessosNomes([]); setEtapasOrigem([]); setMelhoriaNomes([]);
          setError(''); setModalOpen(true);
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar Gargalo
        </button>
      </div>
      <PageStats stats={[
        { label: 'Gargalos', value: String(itensFiltrados.length), tooltip: 'Gargalos no escopo atual dos filtros.' },
        { label: 'Horas/mês', value: formatDecimal(totalHoras, 'h'), tooltip: 'Soma das horas gastas por mês no escopo atual.' },
        { label: 'Processos afetados', value: String(processosDistintos), tooltip: 'Processos distintos impactados por gargalos no escopo atual.' },
        { label: 'Com cascata', value: String(gargalosComCascata), tooltip: 'Gargalos do escopo atual que afetam ao menos uma etapa-origem.' },
        { label: 'Com melhoria', value: String(gargalosResolvidos), tooltip: 'Gargalos do escopo atual que possuem ao menos uma melhoria vinculada.' },
      ]} />
      <FiltrosBar
        ativo={filtrosAtivos}
        onLimpar={limparFiltros}
        filtros={[
          { id: 'fg-organizar', label: 'Organizar por', value: organizar, onChange: setOrganizar, options: ORGANIZAR_OPCOES, tooltip: dica('comum.filtro.organizar') },
          { id: 'fg-origem', label: 'Origem', value: fOrigem, onChange: setFOrigem, options: ORIGEM_FILTRO_OPCOES, tooltip: dica('gargalos.filtro.origem') },
          { id: 'fg-processo', label: 'Processo afetado', value: fProcesso, onChange: setFProcesso, options: [{ value: '', label: 'Todos os processos' }, ...procOptionsOrdenado.map(p => ({ value: p.id, label: p.name }))], tooltip: dica('gargalos.filtro.processo') },
        ]}
      />
      <GrupoAccordion
        grupos={grupos}
        substantivo={['gargalo', 'gargalos']}
        emptyMessage="Nenhum gargalo encontrado para os filtros selecionados."
        renderGrupo={(itens) => (
          <div className="gargalo-list list-stagger">
            {itens.map((g) => (
              <div
                key={g.id}
                className="gargalo-card"
                style={{ position: 'relative', cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  if (shouldIgnoreOpenClick(e)) return;
                  openDetail(g);
                }}
                onKeyDown={(e) => openOnActivationKey(e, () => openDetail(g))}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <h3><Tooltip text={dica('gargalos.detalhe.processos')}>{g.nome}</Tooltip></h3>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn-edit"
                      onClick={(e) => { e.stopPropagation(); openEdit(g); }}
                      title="Editar gargalo"
                      style={{ padding: '4px 6px' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                      className="btn-edit"
                      onClick={(e) => { e.stopPropagation(); setConfirmDel(g); }}
                      title="Excluir gargalo"
                      style={{ padding: '4px 6px', color: '#b91c1c' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                    </button>
                  </div>
                </div>
                <p>{g.descricao || 'Sem descrição.'}</p>
                {(g.origem || g.clusterName) && (
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 6 }}>
                    {g.origem && <><strong>Origem:</strong> {g.origem}</>}
                    {g.origem && g.clusterName && ' · '}
                    {g.clusterName && <><strong>Cluster:</strong> {g.clusterName}</>}
                  </div>
                )}
                {g.processos && g.processos.length > 0 && (
                  <div className="tags">
                    {g.processos.map((pid) => (
                      <span key={pid} className="tag tag-processo">
                        {procNomeById.get(pid) || pid}
                      </span>
                    ))}
                  </div>
                )}
                {g.etapasOrigem && g.etapasOrigem.length > 0 && (
                  <div style={{ marginTop: 6, fontSize: '0.72rem', color: '#b91c1c', fontWeight: 600 }}>
                    📡 Cascata · {g.etapasOrigem.length} {g.etapasOrigem.length === 1 ? 'etapa-origem' : 'etapas-origem'}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="modal">
          <h2>Novo Gargalo</h2>
          <FormField label="Nome" error={error} required tooltip={dica('gargalos.form.nome')}>
            <input type="text" value={nome} onChange={(e) => { setNome(e.target.value); if (error) setError(''); }} placeholder="Digite o nome do gargalo" />
          </FormField>
          <FormField label="Descrição" tooltip={dica('gargalos.form.descricao')}>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Descreva o gargalo" />
          </FormField>
          <FormField label="Origem" tooltip={dica('gargalos.form.origem')}>
            <Select value={origem} onChange={setOrigem} options={ORIGEM_OPCOES} placeholder="Selecione..." />
          </FormField>
          <FormField label="Cluster" tooltip={dica('gargalos.form.cluster')}>
            <Select value={clusterId} onChange={setClusterId} options={CLUSTER_OPCOES} />
          </FormField>
          <FormField label="Processos afetados" tooltip={dica('gargalos.form.processos')}>
            <ChipSelector
              options={procOptionsOrdenado.map((p) => p.name)}
              value={processosNomes}
              onChange={(v) => setProcessosNomes(v as string[])}
              addLabel="Adicionar processo"
            />
          </FormField>
          <FormField label="Etapas-origem" tooltip="Etapas onde o gargalo se manifesta. Restritas aos processos afetados marcados acima. A cascata jusante é derivada em tempo real a partir dos docs de saída dessas etapas.">
            <SeletorEtapasOrigem
              etapas={etapasAll}
              processos={processos}
              clusterId={clusterId || null}
              processoIds={namesToIds(processosNomes)}
              value={etapasOrigem}
              onChange={setEtapasOrigem}
            />
          </FormField>
          <FormField label="Melhorias vinculadas" tooltip={dica('gargalos.form.melhoria')}>
            <ChipSelector
              options={melhoriaLabelOptions}
              value={melhoriaNomes}
              onChange={(v) => setMelhoriaNomes(v as string[])}
              addLabel="Adicionar melhoria"
            />
          </FormField>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)}>
        <div className="modal">
          <h2>Editar Gargalo</h2>
          <FormField label="Nome" error={editError} required tooltip={dica('gargalos.form.nome')}>
            <input type="text" value={editNome} onChange={(e) => { setEditNome(e.target.value); if (editError) setEditError(''); }} />
          </FormField>
          <FormField label="Descrição" tooltip={dica('gargalos.form.descricao')}>
            <textarea value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} />
          </FormField>
          <FormField label="Origem" tooltip={dica('gargalos.form.origem')}>
            <Select value={editOrigem} onChange={setEditOrigem} options={ORIGEM_OPCOES} placeholder="Selecione..." />
          </FormField>
          <FormField label="Cluster" tooltip={dica('gargalos.form.cluster')}>
            <Select value={editClusterId} onChange={setEditClusterId} options={CLUSTER_OPCOES} />
          </FormField>
          <FormField label="Processos afetados" tooltip={dica('gargalos.form.processos')}>
            <ChipSelector
              options={procOptionsOrdenado.map((p) => p.name)}
              value={editProcessosNomes}
              onChange={(v) => setEditProcessosNomes(v as string[])}
              addLabel="Adicionar processo"
            />
          </FormField>
          <FormField label="Etapas-origem" tooltip="Etapas onde o gargalo se manifesta. Restritas aos processos afetados marcados acima.">
            <SeletorEtapasOrigem
              etapas={etapasAll}
              processos={processos}
              clusterId={editClusterId || null}
              processoIds={namesToIds(editProcessosNomes)}
              value={editEtapasOrigem}
              onChange={setEditEtapasOrigem}
            />
          </FormField>
          <FormField label="Melhorias vinculadas" tooltip={dica('gargalos.form.melhoria')}>
            <ChipSelector
              options={melhoriaLabelOptions}
              value={editMelhoriaNomes}
              onChange={(v) => setEditMelhoriaNomes(v as string[])}
              addLabel="Adicionar melhoria"
            />
          </FormField>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setEditOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleUpdate} disabled={editSaving}>{editSaving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)}>
        <div className="modal">
          <h2>Detalhes do Gargalo</h2>
          {detailItem && (
            <>
              <div className="form-group compact">
                <label>Nome</label>
                <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{detailItem.nome}</div>
              </div>
              <div className="form-group compact">
                <label>Descrição</label>
                <div>{detailItem.descricao || '—'}</div>
              </div>
              {detailItem.origem && (
                <div className="form-group compact">
                  <label><Tooltip text={dica('gargalos.detalhe.origem')}>Origem</Tooltip></label>
                  <div>{detailItem.origem}</div>
                </div>
              )}
              {detailItem.clusterName && (
                <div className="form-group compact">
                  <label><Tooltip text={dica('gargalos.detalhe.cluster')}>Cluster</Tooltip></label>
                  <div>{detailItem.clusterName}</div>
                </div>
              )}
              <div className="form-group compact">
                <label><Tooltip text={dica('gargalos.detalhe.processos')}>Processos afetados</Tooltip></label>
                {detailItem.processos && detailItem.processos.length > 0 ? (
                  <div className="tags">
                    {detailItem.processos.map((pid) => (
                      <span key={pid} className="tag tag-processo">
                        {procNomeById.get(pid) || pid}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div>—</div>
                )}
              </div>
              <div className="form-group compact">
                <label>Etapas-origem (geram cascata)</label>
                {detailItem.etapasOrigem && detailItem.etapasOrigem.length > 0 ? (
                  <div className="tags">
                    {detailItem.etapasOrigem.map((ref) => (
                      <span key={`${ref.etapaId}-${ref.scenario}`} className="tag" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
                        {ref.processoNome ? `${ref.processoNome} · ` : ''}{ref.etapaNome || ref.etapaId}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: '#94a3b8', fontSize: '0.88rem' }}>Nenhuma etapa-origem — este gargalo não aparece na aba Cascata.</div>
                )}
              </div>
              <div className="form-group compact">
                <label>Horas estimadas/mês</label>
                <div>
                  {detailItem.horas_gastas
                    ? formatDecimal(detailItem.horas_gastas, 'h')
                    : '— não estimado'}
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>
                  Melhorias vinculadas
                </div>
                {detailItem.melhorias && detailItem.melhorias.length > 0 ? (
                  <div className="tags">
                    {detailItem.melhorias.map((mid) => (
                      <span key={mid} className="tag">{melhoriaNomeById.get(mid) || mid}</span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Nenhuma melhoria vinculada.</p>
                )}
              </div>
            </>
          )}
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setDetailOpen(false)}>Fechar</button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal isOpen={!!confirmDel} onClose={() => setConfirmDel(null)}>
        <div className="modal">
          <h2>Excluir gargalo</h2>
          <p>
            Tem certeza que deseja excluir <strong>{confirmDel?.nome}</strong>? Esta ação não pode ser desfeita.
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
                  await deleteGargalo.mutateAsync({ id: confirmDel.id, old: confirmDel });
                  toast.success('Gargalo excluído');
                  setConfirmDel(null);
                } catch (err) {
                  toast.error('Erro ao excluir', { description: err instanceof Error ? err.message : String(err) });
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
