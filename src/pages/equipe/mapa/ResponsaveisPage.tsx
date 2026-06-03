import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useStoredData } from '@/hooks/useStoredData';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import FiltrosBar from '@/components/equipe/mapa/FiltrosBar';
import GrupoAccordion from '@/components/equipe/mapa/GrupoAccordion';
import PageStats from '@/components/equipe/mapa/PageStats';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';
import { CLUSTER_OPCOES, CLUSTER_FILTRO_OPCOES } from '@/utils/clusters';
import { agrupar } from '@/utils/agrupar';
import { formatarMoeda, parseMoeda } from '@/utils/format';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { useFocusParam } from '@/utils/useFocusParam';
import type { Responsavel } from '@/types';
import { useEtapasLista, useDocumentosLista, useSistemasLista, useResponsaveisLista, useProcessosLista } from '@/hooks/useDominioListas';

const TIPO_OPCOES = [
  { value: 'Interno', label: 'Interno' },
  { value: 'Externo', label: 'Externo' },
];
const TIPO_FILTRO_OPCOES = [{ value: '', label: 'Todos os tipos' }, ...TIPO_OPCOES];

const ORGANIZAR_OPCOES = [
  { value: 'cluster', label: 'Por cluster' },
  { value: 'tipo', label: 'Por tipo' },
  { value: 'cargo', label: 'Por cargo' },
];

/**
 * Capacidade mensal-padrão do responsável (8h × 22 dias úteis).
 * Usado para calcular "Horas Faltantes" = 176 − Σ rateio mapeado.
 */
const HORAS_MES_PADRAO = 176;

/** Grid das colunas — 8 colunas (icon · nome · cargo · custo · vínculos · mapeadas · faltantes · ações) */
const RESP_GRID = '44px minmax(180px, 1.6fr) minmax(120px, 1fr) 100px 90px 110px 110px 80px';

export default function ResponsaveisPage() {
  const { items, loaded, addItem, setItems, removeItem } = useStoredData<Responsavel>('responsaveisAdicionados', '/job_roles.json');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Responsavel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [nome, setNome] = useState('');
  const [cargo, setCargo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [custoHora, setCustoHora] = useState('');
  const [tipo, setTipo] = useState('Interno');
  const [cluster, setCluster] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filtros
  const [fCluster, setFCluster] = useState('');
  const [fTipo, setFTipo] = useState('');
  const [fCargo, setFCargo] = useState('');

  const { data: rawEtapas = [] } = useEtapasLista();
  const { data: docs = [] } = useDocumentosLista();
  const { data: sis = [] } = useSistemasLista();
  const { data: resps = [] } = useResponsaveisLista();
  const { data: processos = [] } = useProcessosLista();
  const etapas = useMemo(
    () => enrichEtapas(rawEtapas, docs, sis, resps),
    [rawEtapas, docs, sis, resps],
  );

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Responsavel | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState<string>('');
  const [editNome, setEditNome] = useState('');
  const [editCargo, setEditCargo] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editCustoHora, setEditCustoHora] = useState('');
  const [editTipo, setEditTipo] = useState('Interno');
  const [editCluster, setEditCluster] = useState('');
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const procMap = new Map(processos.map(p => [p.id, p.nome]));

  /**
   * Soma do rateio de horas mapeadas para este responsável nas etapas
   * (executadoPor + revisadoPor) × volumeMensal de cada etapa.
   * volumeMensal já agrega o volume de TODOS os projetos ativos (se houver
   * mais de um no futuro), então o total reflete a carga real mensal.
   */
  const getHorasMapeadas = (respNome: string): number => {
    let total = 0;
    for (const e of etapas) {
      const vol = e.volumeMensal || 0;
      if (vol === 0) continue;
      for (const r of (e.executadoPor || [])) {
        if (r.nome === respNome) total += (r.horas || 0) * vol;
      }
    }
    return total;
  };

  const fmtHoras = (h: number): string =>
    `${h.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`;

  /** Cor semântica das horas faltantes: verde quando bem ajustado, âmbar
      quando ainda há capacidade, vermelho quando estourou a capacidade. */
  const corHorasFaltantes = (faltantes: number): string => {
    if (faltantes < 0) return '#ef4444';          // over-allocated
    if (faltantes === 0) return '#10b981';        // exato
    if (faltantes <= 20) return '#10b981';        // praticamente cheio
    if (faltantes <= 80) return '#f59e0b';        // ainda tem folga
    return '#64748b';                              // muita folga
  };

  const getVinculos = (respNome: string) => {
    const isResp = (r: { nome: string }) => r.nome === respNome;
    const vinculos: { procId: string; procName: string; etapas: { nome: string; papel: string }[] }[] = [];
    const etapasRel = etapas.filter(e => (e.executadoPor || []).some(isResp));
    const grouped = new Map<string, { nome: string; papel: string }[]>();
    etapasRel.forEach(e => {
      const list = grouped.get(e.processoId) || [];
      list.push({ nome: e.nome, papel: 'Executa' });
      grouped.set(e.processoId, list);
    });
    grouped.forEach((etapasList, procId) => {
      vinculos.push({ procId, procName: procMap.get(procId) || procId, etapas: etapasList });
    });
    return vinculos;
  };

  const handleSave = () => {
    if (!nome.trim()) { setError('Preencha o nome do responsável.'); return; }
    setError('');
    setIsSaving(true);
    addItem({ nome: nome.trim(), cargo: cargo.trim(), categoria: categoria.trim() || undefined, custoHora: parseMoeda(custoHora), tipo, cluster: cluster || undefined });
    setTimeout(() => {
      setNome(''); setCargo(''); setCategoria(''); setCustoHora(''); setTipo('Interno'); setCluster(''); setIsSaving(false); setModalOpen(false);
    }, 300);
  };

  const handleUpdate = () => {
    if (!editNome.trim()) { setEditError('Preencha o nome do responsável.'); return; }
    setEditError('');
    setEditSaving(true);
    setItems((prev) =>
      prev.map((item) =>
        item.id === editId
          ? {
              ...item,
              nome: editNome.trim(),
              cargo: editCargo.trim(),
              categoria: editCategoria.trim() || undefined,
              custoHora: parseMoeda(editCustoHora),
              tipo: editTipo,
              cluster: editCluster || undefined,
            }
          : item
      )
    );
    setTimeout(() => {
      setEditSaving(false);
      setEditOpen(false);
      setEditId('');
      setEditNome('');
      setEditCargo('');
      setEditCategoria('');
      setEditCustoHora('');
    }, 300);
  };

  const openNew = () => { setNome(''); setCargo(''); setCategoria(''); setCustoHora(''); setTipo('Interno'); setCluster(''); setError(''); setModalOpen(true); };
  const openDetail = (r: Responsavel) => {
    setDetailItem(r);
    setDetailOpen(true);
  };
  const openEdit = (r: Responsavel) => {
    setDetailItem(r);
    setEditId(r.id);
    setEditNome(r.nome);
    setEditCargo(r.cargo || '');
    setEditCategoria(r.categoria || '');
    setEditCustoHora(r.custoHora ? String(r.custoHora).replace('.', ',') : '');
    setEditTipo(r.tipo === 'Externo' ? 'Externo' : 'Interno');
    setEditCluster(r.cluster || '');
    setEditError('');
    setEditOpen(true);
  };
  const editFromDetail = () => {
    if (!detailItem) return;
    setDetailOpen(false);
    openEdit(detailItem);
  };

  const cargoFiltroOpcoes = useMemo(() => {
    const set = Array.from(new Set(items.map(r => r.cargo).filter(Boolean))).sort();
    return [{ value: '', label: 'Todos os cargos' }, ...set.map(c => ({ value: c as string, label: c as string }))];
  }, [items]);
  const filtrosAtivos = !!(fCluster || fTipo || fCargo);
  const limparFiltros = () => { setFCluster(''); setFTipo(''); setFCargo(''); };
  const itensFiltrados = useMemo(() => items.filter(r =>
    (!fCluster || r.cluster === fCluster) &&
    (!fTipo || r.tipo === fTipo) &&
    (!fCargo || r.cargo === fCargo)
  ), [items, fCluster, fTipo, fCargo]);

  // Organizador (primeiro filtro): agrupa em cards expansíveis.
  const [organizar, setOrganizar] = useState('cluster');
  const grupos = useMemo(() => {
    if (organizar === 'tipo') return agrupar(itensFiltrados, (r) => [r.tipo || ''], TIPO_OPCOES, 'Sem tipo');
    if (organizar === 'cargo') return agrupar(itensFiltrados, (r) => [r.cargo || ''], cargoFiltroOpcoes, 'Sem cargo');
    return agrupar(itensFiltrados, (r) => [r.cluster || ''], CLUSTER_OPCOES, 'Sem cluster');
  }, [organizar, itensFiltrados, cargoFiltroOpcoes]);

  const focusId = useFocusParam();
  useEffect(() => {
    if (!loaded || !focusId) return;
    const r = items.find(x => x.id === focusId);
    if (r) openDetail(r);
  }, [loaded, focusId, items]);

  if (!loaded) return (
    <div className="loading-container"><div className="spinner" /></div>
  );

  const vinculos = detailItem ? getVinculos(detailItem.nome) : [];

  // KPI strip calculations
  const totalHorasMapeadas = items.reduce((sum, r) => sum + getHorasMapeadas(r.nome), 0);
  const internos = items.filter(r => r.tipo !== 'Externo').length;
  const itemsComCusto = items.filter(r => (r.custoHora || 0) > 0);
  const custoMedio = itemsComCusto.length > 0
    ? itemsComCusto.reduce((sum, r) => sum + (r.custoHora || 0), 0) / itemsComCusto.length
    : 0;

  return (
    <div className="card">
      <div className="card-header">
        <h1>Responsáveis</h1>
        <button className="btn-add" onClick={openNew}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar Responsável
        </button>
      </div>
      <p>Consulte os responsáveis por cada área e processo.</p>
      <PageStats stats={[
        {
          label: 'Responsáveis',
          value: String(items.length),
          tooltip: 'Total de responsáveis cadastrados.',
        },
        {
          label: 'Internos',
          value: String(internos),
          tooltip: 'Responsáveis com tipo diferente de Externo.',
        },
        {
          label: 'Custo/hora médio',
          value: formatarMoeda(custoMedio),
          tooltip: 'Média do custo por hora entre os responsáveis com custo cadastrado.',
        },
        {
          label: 'Horas mapeadas',
          value: fmtHoras(totalHorasMapeadas),
          tooltip: 'Carga mensal total (horas × volume) somada entre todos os responsáveis e projetos.',
        },
      ]} />
      <FiltrosBar
        ativo={filtrosAtivos}
        onLimpar={limparFiltros}
        filtros={[
          { id: 'fr-organizar', label: 'Organizar por', value: organizar, onChange: setOrganizar, options: ORGANIZAR_OPCOES, tooltip: dica('comum.filtro.organizar') },
          { id: 'fr-cluster', label: 'Cluster', value: fCluster, onChange: setFCluster, options: CLUSTER_FILTRO_OPCOES, tooltip: dica('comum.filtro.cluster') },
          { id: 'fr-tipo', label: 'Tipo', value: fTipo, onChange: setFTipo, options: TIPO_FILTRO_OPCOES, tooltip: dica('responsaveis.filtro.tipo') },
          { id: 'fr-cargo', label: 'Cargo', value: fCargo, onChange: setFCargo, options: cargoFiltroOpcoes, tooltip: dica('responsaveis.filtro.cargo') },
        ]}
      />
      <GrupoAccordion
        grupos={grupos}
        substantivo={['responsável', 'responsáveis']}
        emptyMessage="Nenhum responsável encontrado para os filtros selecionados."
        renderGrupo={(itens) => (
      <div className="doc-table-container">
        <div className="doc-table-header" style={{ gridTemplateColumns: RESP_GRID }}>
          <div className="doc-col-icon"></div>
          <div className="doc-col-nome"><Tooltip text={dica('responsaveis.col.responsavel')}>Responsável</Tooltip></div>
          <div className="doc-col-tipo"><Tooltip text={dica('responsaveis.col.cargo')}>Cargo</Tooltip></div>
          <div className="doc-col-formato"><Tooltip text={dica('responsaveis.col.custoHora')}>Custo/Hora</Tooltip></div>
          <div><Tooltip text={dica('responsaveis.col.vinculos')}>Vínculos</Tooltip></div>
          <div><Tooltip text={dica('responsaveis.col.mapeadas')}>Horas Mapeadas</Tooltip></div>
          <div><Tooltip text={dica('responsaveis.col.faltantes')}>Horas Faltantes</Tooltip></div>
          <div className="doc-col-acoes"></div>
        </div>
        {itens.map((r) => {
          const respVinculos = getVinculos(r.nome);
          const totalVinculos = respVinculos.reduce((sum, v) => sum + v.etapas.length, 0);
          const horasMapeadas = getHorasMapeadas(r.nome);
          const horasFaltantes = HORAS_MES_PADRAO - horasMapeadas;
          return (
            <div
              key={r.id}
              className="doc-table-row clickable"
              role="button"
              tabIndex={0}
              onClick={() => openDetail(r)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(r); } }}
              style={{ gridTemplateColumns: RESP_GRID }}
            >
              <div className="doc-col-icon">
                <span className="doc-format-icon" title="Responsável">👤</span>
              </div>
              <div className="doc-col-nome">
                <div className="doc-nome">{r.nome}</div>
              </div>
              <div className="doc-col-tipo">
                {r.cargo || '—'}
                {r.categoria && <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{r.categoria}</div>}
              </div>
              <div className="doc-col-formato">{formatarMoeda(r.custoHora)}</div>
              <div>
                <span className="doc-format-badge">
                  {totalVinculos > 0 ? `${totalVinculos} etapa${totalVinculos > 1 ? 's' : ''}` : 'Nenhum'}
                </span>
              </div>
              <div style={{ fontWeight: 600, color: horasMapeadas > 0 ? 'var(--accent-color)' : '#94a3b8', fontVariantNumeric: 'tabular-nums' }}>
                {fmtHoras(horasMapeadas)}
              </div>
              <div style={{ fontWeight: 600, color: corHorasFaltantes(horasFaltantes), fontVariantNumeric: 'tabular-nums' }}>
                {fmtHoras(horasFaltantes)}
              </div>
              <div className="doc-col-acoes" style={{ display: 'flex', gap: 4 }}>
                <button
                  className="btn-action-sm"
                  onClick={(e) => { e.stopPropagation(); openEdit(r); }}
                >
                  Editar
                </button>
                <button
                  className="btn-action-sm"
                  title="Excluir responsável"
                  style={{ color: '#b91c1c', padding: '2px 5px' }}
                  onClick={(e) => { e.stopPropagation(); setConfirmDel(r); }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="modal">
          <h2>Novo Responsável</h2>
          <FormField label="Nome" error={error} required tooltip={dica('responsaveis.form.nome')}>
            <input type="text" value={nome} onChange={(e) => { setNome(e.target.value); if (error) setError(''); }} placeholder="Digite o nome do responsável" />
          </FormField>
          <FormField label="Cargo" tooltip={dica('responsaveis.form.cargo')}>
            <input type="text" value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Digite o cargo" />
          </FormField>
          <FormField label="Categoria" tooltip="Senioridade do cargo (ex.: Pleno, Júnior, Sênior).">
            <input type="text" value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ex: Pleno, Júnior, Sênior" />
          </FormField>
          <FormField label="Tipo" tooltip={dica('responsaveis.form.tipo')}>
            <Select value={tipo} onChange={setTipo} options={TIPO_OPCOES} />
          </FormField>
          <FormField label="Cluster" tooltip={dica('responsaveis.form.cluster')}>
            <Select value={cluster} onChange={setCluster} options={CLUSTER_OPCOES} />
          </FormField>
          <FormField label="Custo por Hora Trabalhada (R$)" tooltip={dica('responsaveis.form.custoHora')}>
            <input type="text" value={custoHora} onChange={(e) => setCustoHora(e.target.value)} placeholder="Ex: 90,00" />
          </FormField>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)}>
        <div className="modal">
          <h2>Editar Responsável</h2>
          <FormField label="Nome" error={editError} required tooltip={dica('responsaveis.form.nome')}>
            <input type="text" value={editNome} onChange={(e) => { setEditNome(e.target.value); if (editError) setEditError(''); }} placeholder="Digite o nome do responsável" />
          </FormField>
          <FormField label="Cargo" tooltip={dica('responsaveis.form.cargo')}>
            <input type="text" value={editCargo} onChange={(e) => setEditCargo(e.target.value)} placeholder="Digite o cargo" />
          </FormField>
          <FormField label="Categoria" tooltip="Senioridade do cargo (ex.: Pleno, Júnior, Sênior).">
            <input type="text" value={editCategoria} onChange={(e) => setEditCategoria(e.target.value)} placeholder="Ex: Pleno, Júnior, Sênior" />
          </FormField>
          <FormField label="Tipo" tooltip={dica('responsaveis.form.tipo')}>
            <Select value={editTipo} onChange={setEditTipo} options={TIPO_OPCOES} />
          </FormField>
          <FormField label="Cluster" tooltip={dica('responsaveis.form.cluster')}>
            <Select value={editCluster} onChange={setEditCluster} options={CLUSTER_OPCOES} />
          </FormField>
          <FormField label="Custo por Hora Trabalhada (R$)" tooltip={dica('responsaveis.form.custoHora')}>
            <input type="text" value={editCustoHora} onChange={(e) => setEditCustoHora(e.target.value)} placeholder="Ex: 90,00" />
          </FormField>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setEditOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleUpdate} disabled={editSaving}>{editSaving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)}>
        <div className="modal">
          <h2>Detalhes do Responsável</h2>
          {detailItem && (
            <>
              <div className="form-group compact">
                <label>Nome</label>
                <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{detailItem.nome}</div>
              </div>
              <div className="form-row">
                <div className="form-group compact">
                  <label>Cargo</label>
                  <div>{detailItem.cargo || '—'}</div>
                </div>
                <div className="form-group compact">
                  <label>Categoria</label>
                  <div>{detailItem.categoria || '—'}</div>
                </div>
                <div className="form-group compact">
                  <label>Custo/Hora</label>
                  <div>{formatarMoeda(detailItem.custoHora)}</div>
                </div>
              </div>
              {(() => {
                const horasMapeadas = getHorasMapeadas(detailItem.nome);
                const horasFaltantes = HORAS_MES_PADRAO - horasMapeadas;
                const pct = Math.min(100, Math.max(0, (horasMapeadas / HORAS_MES_PADRAO) * 100));
                return (
                  <div style={{ marginTop: 12, padding: 12, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Horas Mapeadas</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-color)', fontVariantNumeric: 'tabular-nums' }}>{fmtHoras(horasMapeadas)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.68rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Horas Faltantes (de {HORAS_MES_PADRAO}h)</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: corHorasFaltantes(horasFaltantes), fontVariantNumeric: 'tabular-nums' }}>{fmtHoras(horasFaltantes)}</div>
                      </div>
                    </div>
                    <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                      <div
                        style={{
                          width: `${pct}%`,
                          height: '100%',
                          background: horasFaltantes < 0 ? '#ef4444' : 'var(--accent-color)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: 4, textAlign: 'right' }}>
                      {pct.toFixed(0)}% da capacidade mensal
                    </div>
                  </div>
                );
              })()}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>Vinculado a</div>
                {vinculos.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Este responsável não está vinculado a nenhuma etapa.</p>
                ) : (
                  vinculos.map((v) => (
                    <div key={v.procId} style={{ marginBottom: 10 }}>
                      <Link
                        to={`/equipe/digital/mapa/processos/${encodeURIComponent(v.procId)}/mapear`}
                        style={{ fontWeight: 600, color: 'var(--accent-color)', textDecoration: 'none', fontSize: '0.92rem' }}
                        onClick={() => setDetailOpen(false)}
                      >
                        {v.procName}
                      </Link>
                      <div className="tags" style={{ marginTop: 4 }}>
                        {v.etapas.map((et) => (
                          <span key={et.nome + et.papel} className="tag">
                            {et.nome} <span style={{ opacity: 0.7 }}>({et.papel})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setDetailOpen(false)}>Fechar</button>
            <button className="btn-save" onClick={editFromDetail}>Editar</button>
          </div>
        </div>
      </Modal>

      {/* Modal Confirmar Exclusão */}
      <Modal isOpen={!!confirmDel} onClose={() => setConfirmDel(null)}>
        <div className="modal">
          <h2>Excluir responsável</h2>
          <p>
            Tem certeza que deseja excluir <strong>{confirmDel?.nome}</strong>? Ele será
            removido das etapas e melhorias que o referenciam. Esta ação não pode ser desfeita.
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
    </div>
  );
}
