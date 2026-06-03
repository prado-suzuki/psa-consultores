import { useState, useEffect, useMemo } from 'react';
import { useStoredData } from '@/hooks/useStoredData';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import ChipSelector from '@/components/equipe/mapa/ChipSelector';
import DecimalInput from '@/components/equipe/mapa/DecimalInput';
import Select from '@/components/equipe/mapa/Select';
import FiltrosBar from '@/components/equipe/mapa/FiltrosBar';
import GrupoAccordion from '@/components/equipe/mapa/GrupoAccordion';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';
import { CLUSTER_OPCOES, CLUSTER_FILTRO_OPCOES } from '@/utils/clusters';
import { agrupar } from '@/utils/agrupar';
import { parseDecimal, formatDecimal, formatarMoeda, parseMoeda } from '@/utils/format';
import type { Melhoria, Gargalo, Responsavel, MelhoriaStatus, AcaoTd } from '@/types';
import { MELHORIA_STATUSES, ACOES_TD } from '@/types';
import PageStats from '@/components/equipe/mapa/PageStats';
import { useFocusParam } from '@/utils/useFocusParam';
import { useGargalosLista, useSistemasLista, useResponsaveisLista, useProcessosLista } from '@/hooks/useDominioListas';

const STATUS_FILTRO_OPCOES = [{ value: '', label: 'Todos os status' }, ...MELHORIA_STATUSES.map(s => ({ value: s, label: s }))];

const ORGANIZAR_OPCOES = [
  { value: 'cluster', label: 'Por cluster' },
  { value: 'status', label: 'Por status' },
  { value: 'processo', label: 'Por processo' },
];

// Cor sutil por status — usa os mesmos tokens do Wizard ROI.
const STATUS_COLORS: Record<MelhoriaStatus, { bg: string; fg: string; bd: string }> = {
  'Não iniciado': { bg: '#f8fafc', fg: '#64748b', bd: '#e2e8f0' },
  'Em progresso': { bg: '#fffbeb', fg: '#92400e', bd: '#fde68a' },
  'Concluído':    { bg: '#f0fdfa', fg: '#0f766e', bd: '#99f6e4' },
  'Backlog':      { bg: '#f1f5f9', fg: '#475569', bd: '#cbd5e1' },
};

/**
 * Editor de rateio reutilizável: linhas de [responsável, horas, remover] +
 * botão "Adicionar". Mostra o total quando há entradas.
 */
function RateioEditor({
  arr,
  responsaveisList,
  handlers,
  addLabel = 'Adicionar',
}: {
  arr: { nome: string; horas: number }[];
  responsaveisList: Responsavel[];
  handlers: {
    add: () => void;
    changeNome: (index: number, nome: string) => void;
    changeHoras: (index: number, h: string) => void;
    remove: (index: number) => void;
  };
  addLabel?: string;
}) {
  const total = arr.reduce((s, r) => s + (Number(r.horas) || 0), 0);
  return (
    <>
      <div className="chip-list-editable">
        {arr.map((r, index) => {
          const otherNames = arr.filter((_, i) => i !== index).map(x => x.nome);
          return (
            <div key={index} className="chip-editable-row">
              <Select
                value={r.nome}
                onChange={(v) => handlers.changeNome(index, v)}
                options={responsaveisList.map((resp) => ({
                  value: resp.nome,
                  label: resp.nome,
                  disabled: otherNames.includes(resp.nome),
                }))}
                placeholder="Selecione..."
              />
              <DecimalInput
                className="chip-vol-input"
                placeholder="Horas"
                value={r.horas}
                onChange={(n) => handlers.changeHoras(index, String(n))}
                style={{ width: 90 }}
              />
              <button
                type="button"
                className="btn-chip-remove"
                onClick={() => handlers.remove(index)}
                aria-label={`Remover ${r.nome || 'item'}`}
              >
                &times;
              </button>
            </div>
          );
        })}
      </div>
      <div className="chip-selector-add" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button type="button" className="btn-chip-add" onClick={handlers.add}>{addLabel}</button>
        {arr.length > 0 && (
          <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
            Total: <strong style={{ color: 'var(--accent-color)' }}>{formatDecimal(total, 'h')}</strong>
          </span>
        )}
      </div>
    </>
  );
}

function StatusBadge({ status }: { status?: MelhoriaStatus | string }) {
  const s = (status || 'Não iniciado') as MelhoriaStatus;
  const c = STATUS_COLORS[s] ?? STATUS_COLORS['Não iniciado'];
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 10,
      fontSize: '0.7rem',
      fontWeight: 600,
      letterSpacing: 0.3,
      background: c.bg,
      color: c.fg,
      border: `1px solid ${c.bd}`,
      whiteSpace: 'nowrap',
    }}>
      {s}
    </span>
  );
}

export default function MelhoriasPage() {
  const { items, loaded, addItem, setItems, removeItem } = useStoredData<Melhoria>('melhoriasAdicionados', '/process_improvements.json');
  const focusId = useFocusParam();

  const { data: gargalosList = [] } = useGargalosLista();
  const { data: sistemasList = [] } = useSistemasLista();
  const { data: responsaveisList = [] } = useResponsaveisLista();
  const { data: processosList = [] } = useProcessosLista();

  const processoNomeById = useMemo(
    () => new Map(processosList.map(p => [p.id, p.nome])),
    [processosList]
  );
  const processoIdByNome = useMemo(
    () => new Map(processosList.map(p => [p.nome, p.id])),
    [processosList]
  );
  // Inverso da relação 1:N — para uma melhoria, lista os gargalos que ela resolve.
  const gargalosPorMelhoria = useMemo(() => {
    const m = new Map<string, Gargalo[]>();
    for (const g of gargalosList) {
      if (!g.melhoriaId) continue;
      const arr = m.get(g.melhoriaId) ?? [];
      arr.push(g);
      m.set(g.melhoriaId, arr);
    }
    return m;
  }, [gargalosList]);
  const sistemaNomeById = useMemo(
    () => new Map(sistemasList.map(s => [s.id, s.nome])),
    [sistemasList]
  );
  const sistemaIdByNome = useMemo(
    () => new Map(sistemasList.map(s => [s.nome, s.id])),
    [sistemasList]
  );
  const processoOptionsOrdenado = useMemo(
    () => [...processosList].sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)),
    [processosList]
  );
  const statusOptions = MELHORIA_STATUSES.map(s => ({ value: s, label: s }));

  const idsToNames = (ids: string[]) =>
    ids.map(id => processoNomeById.get(id)).filter((n): n is string => Boolean(n));
  const namesToIds = (names: string[]) =>
    names.map(n => processoIdByNome.get(n)).filter((id): id is string => Boolean(id));
  const sistemaIdsToNames = (ids: string[]) =>
    ids.map(id => sistemaNomeById.get(id)).filter((n): n is string => Boolean(n));
  const sistemaNamesToIds = (names: string[]) =>
    names.map(n => sistemaIdByNome.get(n)).filter((id): id is string => Boolean(id));
  // Estados — criação
  const [modalOpen, setModalOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [status, setStatus] = useState<MelhoriaStatus>('Não iniciado');
  const [cluster, setCluster] = useState('');
  const [processosNomes, setProcessosNomes] = useState<string[]>([]);
  const [sistemas, setSistemas] = useState<string[]>([]);
  const [executadoPor, setExecutadoPor] = useState<{ nome: string; horas: number }[]>([]);
  const [treinamentoPor, setTreinamentoPor] = useState<{ nome: string; horas: number }[]>([]);
  const [acoesTd, setAcoesTd] = useState<AcaoTd[]>([]);
  const [custoExternoUnico, setCustoExternoUnico] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Estados — edição
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string>('');
  const [editNome, setEditNome] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editStatus, setEditStatus] = useState<MelhoriaStatus>('Não iniciado');
  const [editCluster, setEditCluster] = useState('');
  const [editProcessosNomes, setEditProcessosNomes] = useState<string[]>([]);
  const [editSistemas, setEditSistemas] = useState<string[]>([]);
  const [editExecutadoPor, setEditExecutadoPor] = useState<{ nome: string; horas: number }[]>([]);
  const [editTreinamentoPor, setEditTreinamentoPor] = useState<{ nome: string; horas: number }[]>([]);
  const [editAcoesTd, setEditAcoesTd] = useState<AcaoTd[]>([]);
  const [editCustoExternoUnico, setEditCustoExternoUnico] = useState('');
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Estados — detalhe (read-only)
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Melhoria | null>(null);
  const openDetail = (m: Melhoria) => { setDetailItem(m); setDetailOpen(true); };

  // Estados — confirmação de exclusão
  const [confirmDel, setConfirmDel] = useState<Melhoria | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Focus-navigation: abre detalhe ao navegar de outra página com focusId
  useEffect(() => {
    if (!loaded || !focusId) return;
    const m = items.find((x) => x.id === focusId);
    if (m) openDetail(m);
  }, [loaded, focusId, items]);

  // Filtros
  const [fCluster, setFCluster] = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fProcesso, setFProcesso] = useState('');
  const [fGargalo, setFGargalo] = useState('');
  const filtrosAtivos = !!(fCluster || fStatus || fProcesso || fGargalo);
  const limparFiltros = () => { setFCluster(''); setFStatus(''); setFProcesso(''); setFGargalo(''); };
  // Filtro por gargalo: agora a fonte é a FK gargalos.melhoriaId.
  const melhoriaIdDoGargaloFiltro = useMemo(
    () => (fGargalo ? gargalosList.find(g => g.id === fGargalo)?.melhoriaId ?? null : null),
    [fGargalo, gargalosList]
  );
  const itensFiltrados = useMemo(() => items.filter(m =>
    (!fCluster || m.cluster === fCluster) &&
    (!fStatus || (m.status || 'Não iniciado') === fStatus) &&
    (!fProcesso || (m.processos || []).includes(fProcesso)) &&
    (!fGargalo || melhoriaIdDoGargaloFiltro === m.id)
  ), [items, fCluster, fStatus, fProcesso, fGargalo, melhoriaIdDoGargaloFiltro]);

  // Organizador (primeiro filtro): agrupa em cards expansíveis.
  const [organizar, setOrganizar] = useState('cluster');
  const grupos = useMemo(() => {
    if (organizar === 'status') return agrupar(itensFiltrados, (m) => [m.status || 'Não iniciado'], MELHORIA_STATUSES.map((s) => ({ value: s, label: s })), 'Sem status');
    if (organizar === 'processo') return agrupar(itensFiltrados, (m) => m.processos || [], processoOptionsOrdenado.map((p) => ({ value: p.id, label: p.nome })), 'Sem processo');
    return agrupar(itensFiltrados, (m) => [m.cluster || ''], CLUSTER_OPCOES, 'Sem cluster');
  }, [organizar, itensFiltrados, processoOptionsOrdenado]);

  // ----- helpers genéricos de rateio (DRY entre executadoPor / treinamentoPor) -----
  const makeRateioHandlers = (
    arr: { nome: string; horas: number }[],
    setArr: (v: { nome: string; horas: number }[]) => void
  ) => ({
    add: () => setArr([...arr, { nome: '', horas: 0 }]),
    changeNome: (index: number, nome: string) => {
      if (!nome) return;
      if (arr.filter((_, i) => i !== index).some(r => r.nome === nome)) return;
      const next = [...arr];
      next[index] = { ...next[index], nome };
      setArr(next);
    },
    changeHoras: (index: number, horasStr: string) => {
      const horas = parseDecimal(horasStr);
      const next = [...arr];
      next[index] = { ...next[index], horas };
      setArr(next);
    },
    remove: (index: number) => setArr(arr.filter((_, i) => i !== index)),
  });

  const rateioExec    = makeRateioHandlers(executadoPor,     setExecutadoPor);
  const rateioTreino  = makeRateioHandlers(treinamentoPor,   setTreinamentoPor);

  const sumHoras = (arr: { horas: number }[]) =>
    arr.reduce((s, r) => s + (Number(r.horas) || 0), 0);

  const openEdit = (m: Melhoria) => {
    setEditId(m.id);
    setEditNome(m.nome);
    setEditDescricao(m.descricao || '');
    setEditStatus((m.status as MelhoriaStatus) || 'Não iniciado');
    setEditCluster(m.cluster || '');
    setEditProcessosNomes(idsToNames(m.processos || []));
    setEditSistemas(sistemaIdsToNames(m.sistemas || []));
    setEditAcoesTd([...(m.acoesTd || [])]);
    setEditExecutadoPor(m.executadoPor.map((r) => ({ ...r })));
    // Migração: se a melhoria legada só tem o scalar horasTreinamento sem
    // rateio, cria UMA entrada órfã com o total — o usuário pode atribuir
    // o nome do responsável depois para "finalizar" o rateio.
    const treinoSeed: { nome: string; horas: number }[] =
      m.treinamentoPor && m.treinamentoPor.length > 0
        ? m.treinamentoPor.map((r) => ({ ...r }))
        : ((m.horasTreinamento ?? 0) > 0
          ? [{ nome: '', horas: m.horasTreinamento ?? 0 }]
          : []);
    setEditTreinamentoPor(treinoSeed);
    setEditCustoExternoUnico(m.custoExternoUnico ? formatarMoeda(m.custoExternoUnico) : '');
    setEditError('');
    setEditSaving(false);
    setEditOpen(true);
  };

  const rateioEditExec   = makeRateioHandlers(editExecutadoPor,   setEditExecutadoPor);
  const rateioEditTreino = makeRateioHandlers(editTreinamentoPor, setEditTreinamentoPor);

  const handleUpdate = () => {
    if (!editNome.trim()) { setEditError('Preencha o nome da melhoria.'); return; }
    setEditError('');
    setEditSaving(true);
    const treinoLimpo = editTreinamentoPor.filter(r => r.nome?.trim());
    const horasTotal  = sumHoras(treinoLimpo);
    setItems(items.map((it) =>
      it.id === editId
        ? {
            ...it,
            nome: editNome.trim(),
            descricao: editDescricao.trim(),
            status: editStatus,
            cluster: editCluster || undefined,
            processos: namesToIds(editProcessosNomes),
            sistemas: sistemaNamesToIds(editSistemas),
            acoesTd: editAcoesTd,
            executadoPor: editExecutadoPor.filter(r => r.nome?.trim()),
            treinamentoPor: treinoLimpo,
            // Σ rateio = total cacheado. Mantém ROI/SOP/dashboards funcionando.
            horasTreinamento: horasTotal,
            custoExternoUnico: parseMoeda(editCustoExternoUnico),
          }
        : it
    ));
    setTimeout(() => {
      setEditSaving(false);
      setEditOpen(false);
    }, 300);
  };

  const handleSave = () => {
    if (!nome.trim()) { setError('Preencha o nome da melhoria.'); return; }
    setError('');
    setIsSaving(true);
    const treinoLimpo = treinamentoPor.filter(r => r.nome?.trim());
    const horasTotal  = sumHoras(treinoLimpo);
    addItem({
      nome: nome.trim(),
      descricao: descricao.trim(),
      status,
      cluster: cluster || undefined,
      processos: namesToIds(processosNomes),
      sistemas: sistemaNamesToIds(sistemas),
      acoesTd,
      executadoPor: executadoPor.filter(r => r.nome?.trim()),
      treinamentoPor: treinoLimpo,
      horasTreinamento: horasTotal,
      custoExternoUnico: parseMoeda(custoExternoUnico),
    });
    setTimeout(() => {
      setNome('');
      setDescricao('');
      setStatus('Não iniciado');
      setCluster('');
      setProcessosNomes([]);
      setSistemas([]);
      setAcoesTd([]);
      setExecutadoPor([]);
      setTreinamentoPor([]);
      setCustoExternoUnico('');
      setIsSaving(false);
      setModalOpen(false);
    }, 300);
  };

  const openNew = () => {
    setNome('');
    setDescricao('');
    setStatus('Não iniciado');
    setCluster('');
    setProcessosNomes([]);
    setSistemas([]);
    setAcoesTd([]);
    setExecutadoPor([]);
    setTreinamentoPor([]);
    setCustoExternoUnico('');
    setError('');
    setModalOpen(true);
  };

  if (!loaded) return (
    <div className="loading-container"><div className="spinner" /></div>
  );

  return (
    <div className="card">
      <div className="card-header">
        <h1>Melhorias</h1>
        <button className="btn-add" onClick={openNew}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Avaliar Melhorias
        </button>
      </div>
      <p>Registre melhorias e os processos que cada uma atende (uma melhoria pode atender mais de um processo).</p>
      <PageStats stats={[
        { label: 'Melhorias', value: String(items.length), tooltip: 'Total de melhorias cadastradas.' },
        { label: 'Concluídas', value: String(items.filter(m => m.status === 'Concluído').length), tooltip: 'Melhorias com status Concluído.' },
        { label: 'Em progresso', value: String(items.filter(m => m.status === 'Em progresso').length), tooltip: 'Melhorias atualmente em execução.' },
        { label: 'Horas treino', value: formatDecimal(items.reduce((s, m) => s + (m.horasTreinamento || 0), 0), 'h'), tooltip: 'Soma das horas de treinamento estimadas.' },
        { label: 'Custo externo', value: formatarMoeda(items.reduce((s, m) => s + (m.custoExternoUnico || 0), 0)), tooltip: 'Soma dos custos externos únicos registrados.' },
      ]} />
      <FiltrosBar
        ativo={filtrosAtivos}
        onLimpar={limparFiltros}
        filtros={[
          { id: 'fm-organizar', label: 'Organizar por', value: organizar, onChange: setOrganizar, options: ORGANIZAR_OPCOES, tooltip: dica('comum.filtro.organizar') },
          { id: 'fm-cluster', label: 'Cluster', value: fCluster, onChange: setFCluster, options: CLUSTER_FILTRO_OPCOES, tooltip: dica('comum.filtro.cluster') },
          { id: 'fm-status', label: 'Status', value: fStatus, onChange: setFStatus, options: STATUS_FILTRO_OPCOES, tooltip: dica('melhorias.filtro.status') },
          { id: 'fm-processo', label: 'Processo', value: fProcesso, onChange: setFProcesso, options: [{ value: '', label: 'Todos os processos' }, ...processoOptionsOrdenado.map(p => ({ value: p.id, label: p.nome }))], tooltip: dica('melhorias.filtro.processo') },
          { id: 'fm-gargalo', label: 'Gargalo resolvido', value: fGargalo, onChange: setFGargalo, options: [{ value: '', label: 'Todos os gargalos' }, ...gargalosList.map(g => ({ value: g.id, label: g.nome }))], tooltip: dica('melhorias.filtro.gargalo') },
        ]}
      />
      <GrupoAccordion
        grupos={grupos}
        substantivo={['melhoria', 'melhorias']}
        emptyMessage="Nenhuma melhoria encontrada para os filtros selecionados."
        renderGrupo={(itens) => (
          <div className="melhoria-list">
            {itens.map((m) => (
              <div
                key={m.id}
                className="melhoria-card"
                style={{ position: 'relative', cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(m)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(m); } }}
                aria-label={`Ver detalhes de ${m.nome}`}
              >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
              <h3 style={{ flex: 1 }}><Tooltip text={dica('melhorias.form.nome')}>{m.nome}</Tooltip></h3>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
                <StatusBadge status={m.status as MelhoriaStatus | undefined} />
                <button
                  className="btn-edit"
                  title="Editar melhoria"
                  style={{ padding: '4px 6px' }}
                  onClick={(e) => { e.stopPropagation(); openEdit(m); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
                <button
                  className="btn-edit"
                  title="Excluir melhoria"
                  style={{ padding: '4px 6px', color: '#b91c1c' }}
                  onClick={(e) => { e.stopPropagation(); setConfirmDel(m); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                </button>
              </div>
            </div>
            {m.processos && m.processos.length > 0 && (
              <div className="tags" style={{ marginBottom: 6 }}>
                {m.processos.map((pid) => (
                  <span key={pid} className="tag tag-processo">
                    {processoNomeById.get(pid) || pid}
                  </span>
                ))}
              </div>
            )}
            <p>{m.descricao || 'Sem descrição.'}</p>
            {m.acoesTd && m.acoesTd.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  color: '#94a3b8',
                  marginBottom: 4,
                }}>Ações TD</div>
                <ul style={{
                  listStyle: 'disc',
                  paddingLeft: 18,
                  margin: 0,
                  fontSize: '0.85rem',
                  color: '#334155',
                }}>
                  {m.acoesTd.map((a) => (<li key={a}>{a}</li>))}
                </ul>
              </div>
            )}
            {m.treinamentoPor && m.treinamentoPor.length > 0 ? (
              <div style={{ marginTop: 10, fontSize: '0.82rem', color: '#475569' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600 }}>Treinamento (rateio):</span>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                    Total: <strong style={{ color: 'var(--accent-color)' }}>{formatDecimal(m.horasTreinamento || sumHoras(m.treinamentoPor), 'h')}</strong>
                  </span>
                </div>
                {m.treinamentoPor.map((r, idx) => (
                  <div key={`${r.nome}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>{r.nome || <em style={{ color: '#94a3b8' }}>— sem responsável atribuído</em>}</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{formatDecimal(r.horas, 'h')}</span>
                  </div>
                ))}
              </div>
            ) : m.horasTreinamento ? (
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 8 }}>
                <strong>Horas treinamento:</strong> {formatDecimal(m.horasTreinamento, 'h')}
                <span style={{ marginLeft: 6, color: '#94a3b8', fontStyle: 'italic' }}>(sem rateio)</span>
              </div>
            ) : null}
            {(gargalosPorMelhoria.get(m.id) ?? []).length > 0 && (
              <div className="tags" style={{ marginTop: 8 }}>
                {(gargalosPorMelhoria.get(m.id) ?? []).map((g) => (
                  <span key={g.id} className="tag tag-etapa">{g.nome}</span>
                ))}
              </div>
            )}
            {m.sistemas.length > 0 && (
              <div className="tags" style={{ marginTop: 6 }}>
                {m.sistemas.map((s) => (
                  <span key={s} className="tag tag-sistema">{sistemaNomeById.get(s) || s}</span>
                ))}
              </div>
            )}
            {m.executadoPor.length > 0 && (
              <div style={{ marginTop: 10, fontSize: '0.82rem', color: '#475569' }}>
                <div style={{ fontWeight: 600, marginBottom: 4 }}>Executado por:</div>
                {m.executadoPor.map((r) => (
                  <div key={r.nome} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span>{r.nome}</span>
                    <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{formatDecimal(r.horas, 'h')}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="card-actions">
              <button className="btn-action" onClick={(e) => { e.stopPropagation(); openEdit(m); }}>Editar</button>
            </div>
              </div>
            ))}
          </div>
        )}
      />

      {/* Modal Detalhe (read-only) */}
      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)}>
        <div className="modal">
          {detailItem && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <h2 style={{ flex: 1, margin: 0 }}>{detailItem.nome}</h2>
                <StatusBadge status={detailItem.status as MelhoriaStatus | undefined} />
              </div>
              {detailItem.cluster && (
                <div className="form-group compact">
                  <label>Cluster</label>
                  <div>{detailItem.cluster}</div>
                </div>
              )}
              {detailItem.processos && detailItem.processos.length > 0 && (
                <div className="form-group compact">
                  <label>Processos atendidos</label>
                  <div className="tags">
                    {detailItem.processos.map((pid) => (
                      <span key={pid} className="tag tag-processo">
                        {processoNomeById.get(pid) || pid}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {detailItem.descricao && (
                <div className="form-group compact">
                  <label>Descrição</label>
                  <div>{detailItem.descricao}</div>
                </div>
              )}
              {detailItem.acoesTd && detailItem.acoesTd.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>Ações TD</div>
                  <ul style={{ listStyle: 'disc', paddingLeft: 18, margin: 0, fontSize: '0.85rem', color: '#334155' }}>
                    {detailItem.acoesTd.map((a) => <li key={a}>{a}</li>)}
                  </ul>
                </div>
              )}
              {(gargalosPorMelhoria.get(detailItem.id) ?? []).length > 0 && (
                <div className="form-group compact">
                  <label>Gargalos resolvidos</label>
                  <div className="tags">
                    {(gargalosPorMelhoria.get(detailItem.id) ?? []).map((g) => (
                      <span key={g.id} className="tag tag-etapa">{g.nome}</span>
                    ))}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4 }}>
                    Para vincular ou desvincular um gargalo, edite-o em <strong>Gargalos</strong> e ajuste o campo "Melhoria vinculada".
                  </div>
                </div>
              )}
              {detailItem.sistemas && detailItem.sistemas.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>Sistemas</div>
                  {detailItem.sistemas.map((sid) => {
                    const sNome = sistemaNomeById.get(sid) || sid;
                    return (
                      <div key={sid} style={{ padding: '3px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                        <span className="tag tag-sistema" style={{ margin: 0 }}>{sNome}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              {detailItem.executadoPor && detailItem.executadoPor.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>Executado por</div>
                  {detailItem.executadoPor.map((r) => (
                    <div key={r.nome} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                      <span>{r.nome}</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{formatDecimal(r.horas, 'h')}</span>
                    </div>
                  ))}
                </div>
              )}
              {((detailItem.treinamentoPor && detailItem.treinamentoPor.length > 0) || (detailItem.horasTreinamento ?? 0) > 0) && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8' }}>Treinamento por</div>
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Total: <strong style={{ color: 'var(--accent-color)' }}>{formatDecimal(detailItem.horasTreinamento || 0, 'h')}</strong>
                    </span>
                  </div>
                  {(detailItem.treinamentoPor || []).map((r, idx) => (
                    <div key={`${r.nome}-${idx}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                      <span>{r.nome || <em style={{ color: '#94a3b8' }}>— sem responsável</em>}</span>
                      <span style={{ fontWeight: 600, color: 'var(--accent-color)' }}>{formatDecimal(r.horas, 'h')}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: 6, paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>Investimento estimado</div>
                <div className="form-row" style={{ display: 'flex', gap: 16 }}>
                  <div className="form-group compact" style={{ flex: 1 }}>
                    <label>Custo externo único</label>
                    <div style={{ fontWeight: 600 }}>{formatarMoeda(detailItem.custoExternoUnico || 0)}</div>
                  </div>
                  <div className="form-group compact" style={{ flex: 1 }}>
                    <label>Horas totais (exec + treino)</label>
                    <div style={{ fontWeight: 600, color: 'var(--accent-color)' }}>
                      {formatDecimal(
                        (detailItem.executadoPor || []).reduce((s, r) => s + (Number(r.horas) || 0), 0) +
                        (detailItem.horasTreinamento || 0),
                        'h'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setDetailOpen(false)}>Fechar</button>
            <button
              className="btn-save"
              onClick={() => {
                setDetailOpen(false);
                if (detailItem) openEdit(detailItem);
              }}
            >
              Editar
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal isOpen={!!confirmDel} onClose={() => setConfirmDel(null)}>
        <div className="modal">
          <h2>Excluir melhoria</h2>
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
                await removeItem(confirmDel.id);
                setDeleting(false);
                setConfirmDel(null);
              }}
            >
              {deleting ? 'Excluindo...' : 'Excluir'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="modal">
          <h2>Avaliar Melhorias</h2>
          <FormField label="Nome da Melhoria" error={error} required tooltip={dica('melhorias.form.nome')}>
            <input
              type="text"
              value={nome}
              onChange={(e) => { setNome(e.target.value); if (error) setError(''); }}
              placeholder="Digite o nome da melhoria"
            />
          </FormField>
          <FormField label="Status" tooltip={dica('melhorias.form.status')}>
            <Select
              value={status}
              onChange={(v) => setStatus(v as MelhoriaStatus)}
              options={statusOptions}
            />
          </FormField>
          <FormField label="Cluster" tooltip={dica('melhorias.form.cluster')}>
            <Select value={cluster} onChange={setCluster} options={CLUSTER_OPCOES} />
          </FormField>
          <FormField label="Processos atendidos" tooltip={dica('melhorias.form.processos')}>
            <ChipSelector
              options={processoOptionsOrdenado.map((p) => p.nome)}
              value={processosNomes}
              onChange={(v) => setProcessosNomes(v as string[])}
              addLabel="Adicionar processo"
            />
          </FormField>
          <FormField label="Descrição" tooltip={dica('melhorias.form.descricao')}>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva a melhoria implementada"
            />
          </FormField>
          <FormField label="Ações TD" tooltip={dica('melhorias.form.acoesTd')}>
            <ChipSelector
              options={ACOES_TD as unknown as string[]}
              value={acoesTd}
              onChange={(v) => setAcoesTd(v as AcaoTd[])}
              addLabel="Adicionar ação"
            />
          </FormField>
          <div style={{ marginBottom: 12, fontSize: '0.78rem', color: '#64748b' }}>
            <strong>Gargalos resolvidos</strong>: o vínculo agora é feito na página de <strong>Gargalos</strong> (cada gargalo aponta para no máximo uma melhoria). Esta melhoria aparecerá automaticamente nos gargalos que a referenciarem.
          </div>
          <FormField label="Sistemas Desenvolvidos/Utilizados" tooltip={dica('melhorias.form.sistemas')}>
            <ChipSelector
              options={sistemasList.map((s) => s.nome)}
              value={sistemas}
              onChange={(v) => setSistemas(v as string[])}
            />
          </FormField>
          {sistemas.filter(Boolean).length > 0 && (
            <div style={{ marginBottom: 12, fontSize: '0.78rem', color: '#64748b' }}>
              O rateio (%) do custo por cluster é configurado em <strong>Sistemas → editar sistema → Rateio por cluster</strong>.
            </div>
          )}
          <FormField label="Custo externo único (R$)" tooltip={dica('melhorias.form.custoExternoUnico')}>
            <input type="text" value={custoExternoUnico} onChange={(e) => setCustoExternoUnico(e.target.value)} placeholder="Ex: R$ 3.000,00" />
          </FormField>
          <FormField label="Executado por (rateio em horas)" tooltip={dica('melhorias.form.executadoPor')}>
            <RateioEditor arr={executadoPor} responsaveisList={responsaveisList} handlers={rateioExec} />
          </FormField>
          <FormField label="Horas de Treinamento (rateio por responsável)" tooltip={dica('melhorias.form.treinamentoPor')}>
            <RateioEditor arr={treinamentoPor} responsaveisList={responsaveisList} handlers={rateioTreino} />
          </FormField>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)}>
        <div className="modal">
          <h2>Editar Melhoria</h2>
          <FormField label="Nome da Melhoria" error={editError} required tooltip={dica('melhorias.form.nome')}>
            <input
              type="text"
              value={editNome}
              onChange={(e) => { setEditNome(e.target.value); if (editError) setEditError(''); }}
              placeholder="Digite o nome da melhoria"
            />
          </FormField>
          <FormField label="Status" tooltip={dica('melhorias.form.status')}>
            <Select
              value={editStatus}
              onChange={(v) => setEditStatus(v as MelhoriaStatus)}
              options={statusOptions}
            />
          </FormField>
          <FormField label="Cluster" tooltip={dica('melhorias.form.cluster')}>
            <Select value={editCluster} onChange={setEditCluster} options={CLUSTER_OPCOES} />
          </FormField>
          <FormField label="Processos atendidos" tooltip={dica('melhorias.form.processos')}>
            <ChipSelector
              options={processoOptionsOrdenado.map((p) => p.nome)}
              value={editProcessosNomes}
              onChange={(v) => setEditProcessosNomes(v as string[])}
              addLabel="Adicionar processo"
            />
          </FormField>
          <FormField label="Descrição" tooltip={dica('melhorias.form.descricao')}>
            <textarea
              value={editDescricao}
              onChange={(e) => setEditDescricao(e.target.value)}
              placeholder="Descreva a melhoria implementada"
            />
          </FormField>
          <FormField label="Ações TD" tooltip={dica('melhorias.form.acoesTd')}>
            <ChipSelector
              options={ACOES_TD as unknown as string[]}
              value={editAcoesTd}
              onChange={(v) => setEditAcoesTd(v as AcaoTd[])}
              addLabel="Adicionar ação"
            />
          </FormField>
          {(gargalosPorMelhoria.get(editId) ?? []).length > 0 ? (
            <div className="form-group compact">
              <label>Gargalos resolvidos (vinculam-se a partir da página de Gargalos)</label>
              <div className="tags">
                {(gargalosPorMelhoria.get(editId) ?? []).map(g => (
                  <span key={g.id} className="tag tag-etapa">{g.nome}</span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 12, fontSize: '0.78rem', color: '#64748b' }}>
              <strong>Gargalos resolvidos</strong>: o vínculo agora é feito na página de <strong>Gargalos</strong>. Nenhum gargalo aponta para esta melhoria no momento.
            </div>
          )}
          <FormField label="Sistemas Desenvolvidos/Utilizados" tooltip={dica('melhorias.form.sistemas')}>
            <ChipSelector
              options={sistemasList.map((s) => s.nome)}
              value={editSistemas}
              onChange={(v) => setEditSistemas(v as string[])}
            />
          </FormField>
          {editSistemas.filter(Boolean).length > 0 && (
            <div style={{ marginBottom: 12, fontSize: '0.78rem', color: '#64748b' }}>
              O rateio (%) do custo por cluster é configurado em <strong>Sistemas → editar sistema → Rateio por cluster</strong>.
            </div>
          )}
          <FormField label="Custo externo único (R$)" tooltip={dica('melhorias.form.custoExternoUnico')}>
            <input type="text" value={editCustoExternoUnico} onChange={(e) => setEditCustoExternoUnico(e.target.value)} placeholder="Ex: R$ 3.000,00" />
          </FormField>
          <FormField label="Executado por (rateio em horas)" tooltip={dica('melhorias.form.executadoPor')}>
            <RateioEditor arr={editExecutadoPor} responsaveisList={responsaveisList} handlers={rateioEditExec} />
          </FormField>
          <FormField label="Horas de Treinamento (rateio por responsável)" tooltip={dica('melhorias.form.treinamentoPor')}>
            <RateioEditor arr={editTreinamentoPor} responsaveisList={responsaveisList} handlers={rateioEditTreino} />
          </FormField>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setEditOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleUpdate} disabled={editSaving}>{editSaving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
