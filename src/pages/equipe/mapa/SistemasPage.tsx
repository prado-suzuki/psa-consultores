import { useState, useEffect, useMemo } from 'react';
import { useStoredData } from '@/hooks/useStoredData';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import FiltrosBar from '@/components/equipe/mapa/FiltrosBar';
import GrupoAccordion from '@/components/equipe/mapa/GrupoAccordion';
import PageStats from '@/components/equipe/mapa/PageStats';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';
import { agrupar } from '@/utils/agrupar';
import { formatarMoeda, parseMoeda } from '@/utils/format';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { useFocusParam } from '@/utils/useFocusParam';
import { CLUSTER_OPCOES } from '@/utils/clusters';
import type { Sistema } from '@/types';
import { useEtapasLista, useDocumentosLista, useSistemasLista, useProcessosLista, useMelhoriasLista } from '@/hooks/useDominioListas';

const CLUSTERS_DISPONIVEIS = CLUSTER_OPCOES.filter(o => o.value !== '').map(o => o.value);

const ORIGEM_OPCOES = [
  { value: 'Interno', label: 'Interno' },
  { value: 'Externo', label: 'Externo' },
];
const ORIGEM_FILTRO_OPCOES = [{ value: '', label: 'Todas as origens' }, ...ORIGEM_OPCOES];

const ORGANIZAR_OPCOES = [
  { value: 'origem', label: 'Por origem' },
];

export default function SistemasPage() {
  const { items, loaded, addItem, setItems, removeItem } = useStoredData<Sistema>('sistemasAdicionados', '/sistemas_processo.json');
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Sistema | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [origem, setOrigem] = useState('Interno');
  const [variavel, setVariavel] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const { data: rawEtapas = [] } = useEtapasLista();
  const { data: docs = [] } = useDocumentosLista();
  const { data: sis = [] } = useSistemasLista();
  const { data: processos = [] } = useProcessosLista();
  const { data: melhorias = [] } = useMelhoriasLista();
  const etapas = useMemo(
    () => enrichEtapas(rawEtapas, docs, sis, []),
    [rawEtapas, docs, sis],
  );

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Sistema | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editNome, setEditNome] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editOrigem, setEditOrigem] = useState('Interno');
  const [editVariavel, setEditVariavel] = useState('');
  const [editClustersRateio, setEditClustersRateio] = useState<Record<string, number>>({});
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const procMap = new Map(processos.map(p => [p.id, p.nome]));

  const getVinculos = (sistemaNome: string) => {
    const vinculos: { procId: string; procName: string; etapas: string[] }[] = [];
    const etapasRel = etapas.filter(e => (e.sistemas || []).includes(sistemaNome));
    const grouped = new Map<string, string[]>();
    etapasRel.forEach(e => {
      const list = grouped.get(e.processoId) || [];
      list.push(e.nome);
      grouped.set(e.processoId, list);
    });
    grouped.forEach((etapasList, procId) => {
      vinculos.push({ procId, procName: procMap.get(procId) || procId, etapas: etapasList });
    });
    return vinculos;
  };

  const handleSave = () => {
    if (!nome.trim()) { setError('Preencha o nome do sistema.'); return; }
    setError('');
    setIsSaving(true);
    addItem({
      nome: nome.trim(),
      descricao: descricao.trim(),
      origem,
      custoLicencaMensal: 0,
      custoVariavelPorUso: parseMoeda(variavel),
    });
    setTimeout(() => {
      setNome(''); setDescricao(''); setOrigem('Interno'); setVariavel('');
      setIsSaving(false); setModalOpen(false);
    }, 300);
  };

  const openDetail = (s: Sistema) => {
    setDetailItem(s);
    setDetailOpen(true);
  };

  const openNew = () => {
    setNome(''); setDescricao(''); setOrigem('Interno'); setVariavel('');
    setError(''); setModalOpen(true);
  };
  const openEdit = (s: Sistema) => {
    setDetailItem(s);
    setEditId(s.id);
    setEditNome(s.nome);
    setEditDescricao(s.descricao);
    setEditOrigem(s.origem || 'Interno');
    setEditVariavel(formatarMoeda(s.custoVariavelPorUso));
    setEditClustersRateio(Object.fromEntries((s.clustersRateio || []).map(c => [c.cluster, c.rateio])));
    setEditError('');
    setEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editNome.trim()) { setEditError('Preencha o nome do sistema.'); return; }
    setEditError('');
    setEditSaving(true);
    const clustersRateio = Object.entries(editClustersRateio)
      .filter(([, r]) => r != null && r !== 100)
      .map(([cluster, rateio]) => ({ cluster, rateio }));
    const updated = items.map(s =>
      s.id === editId
        ? {
            ...s,
            nome: editNome.trim(),
            descricao: editDescricao.trim(),
            origem: editOrigem,
            custoVariavelPorUso: parseMoeda(editVariavel),
            clustersRateio,
          }
        : s
    );
    setItems(updated);
    setTimeout(() => { setEditSaving(false); setEditOpen(false); }, 300);
  };

  const [fOrigem, setFOrigem] = useState('');
  const filtrosAtivos = !!fOrigem;
  const limparFiltros = () => { setFOrigem(''); };
  const itensFiltrados = useMemo(() => items.filter(s =>
    (!fOrigem || s.origem === fOrigem)
  ), [items, fOrigem]);

  // Organizador (primeiro filtro): agrupa em cards expansíveis.
  const [organizar, setOrganizar] = useState('origem');
  const grupos = useMemo(() => (
    agrupar(itensFiltrados, (s) => [s.origem || ''], ORIGEM_OPCOES, 'Sem origem')
  ), [itensFiltrados]);

  const focusId = useFocusParam();
  useEffect(() => {
    if (!loaded || !focusId) return;
    const it = items.find(s => s.id === focusId);
    if (it) openDetail(it);
  }, [loaded, focusId, items]);

  if (!loaded) return (
    <div className="loading-container"><div className="spinner" /></div>
  );

  const vinculos = detailItem ? getVinculos(detailItem.nome) : [];

  return (
    <div className="card">
      <div className="card-header">
        <h1>Sistemas</h1>
        <button className="btn-add" onClick={openNew}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar Sistema
        </button>
      </div>
      <p>Gerencie os sistemas integrados ao projeto de mapeamento.</p>
      <PageStats stats={[
        { label: 'Sistemas', value: String(items.length), tooltip: 'Total de sistemas cadastrados.' },
        {
          label: 'Custo mensal total',
          value: formatarMoeda(items.reduce((acc, s) => acc + (s.custoVariavelPorUso || 0), 0)),
          tooltip: 'Soma dos custos mensais de todos os sistemas.',
        },
        {
          label: 'Custo anual total',
          value: formatarMoeda(items.reduce((acc, s) => acc + (s.custoVariavelPorUso || 0), 0) * 12),
          tooltip: 'Projeção anual dos custos mensais (× 12).',
        },
      ]} />
      <FiltrosBar
        ativo={filtrosAtivos}
        onLimpar={limparFiltros}
        filtros={[
          { id: 'fs-organizar', label: 'Organizar por', value: organizar, onChange: setOrganizar, options: ORGANIZAR_OPCOES, tooltip: dica('comum.filtro.organizar') },
          { id: 'fs-origem', label: 'Origem', value: fOrigem, onChange: setFOrigem, options: ORIGEM_FILTRO_OPCOES, tooltip: dica('sistemas.filtro.origem') },
        ]}
      />
      <GrupoAccordion
        grupos={grupos}
        substantivo={['sistema', 'sistemas']}
        emptyMessage="Nenhum sistema encontrado para os filtros selecionados."
        renderGrupo={(itens) => (
          <div className="system-list">
            {itens.map((s) => (
              <div
                key={s.id}
                className="system-card"
                style={{ position: 'relative', cursor: 'pointer' }}
                role="button"
                tabIndex={0}
                onClick={() => openDetail(s)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(s); } }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <h3><Tooltip text={dica('sistemas.card.titulo')}>{s.nome}</Tooltip></h3>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn-edit"
                      onClick={(e) => { e.stopPropagation(); openEdit(s); }}
                      title="Editar sistema"
                      style={{ padding: '4px 6px' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button
                      className="btn-edit"
                      onClick={(e) => { e.stopPropagation(); setConfirmDel(s); }}
                      title="Excluir sistema"
                      style={{ padding: '4px 6px', color: '#b91c1c' }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
                    </button>
                  </div>
                </div>
                <p>{s.descricao || 'Sem descrição.'}</p>
                {s.origem && (
                  <div className="cost">Origem: <span>{s.origem}</span></div>
                )}
                <div className="cost">Custo mensal: <span>{formatarMoeda(s.custoVariavelPorUso)}</span> / mês</div>
                <div className="card-actions">
                  <button className="btn-action" onClick={(e) => { e.stopPropagation(); openEdit(s); }}>Editar</button>
                  <button className="btn-action" style={{ color: '#b91c1c' }} onClick={(e) => { e.stopPropagation(); setConfirmDel(s); }}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        )}
      />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="modal">
          <h2>Novo Sistema</h2>
          <FormField label="Nome do Sistema" error={error} required tooltip={dica('sistemas.form.nome')}>
            <input type="text" value={nome} onChange={(e) => { setNome(e.target.value); if (error) setError(''); }} placeholder="Digite o nome do sistema" />
          </FormField>
          <FormField label="Descrição" tooltip={dica('sistemas.form.descricao')}>
            <textarea value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Digite a descrição do sistema" />
          </FormField>
          <FormField label="Origem" tooltip={dica('sistemas.form.origem')}>
            <Select value={origem} onChange={setOrigem} options={ORIGEM_OPCOES} />
          </FormField>
          <FormField label="Custo mensal" tooltip={dica('sistemas.form.custoVariavel')}>
            <input type="text" value={variavel} onChange={(e) => setVariavel(e.target.value)} placeholder="Ex: R$ 500,00 / mês" />
          </FormField>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setModalOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)}>
        <div className="modal">
          <h2>Editar Sistema</h2>
          <FormField label="Nome do Sistema" error={editError} required tooltip={dica('sistemas.form.nome')}>
            <input type="text" value={editNome} onChange={(e) => { setEditNome(e.target.value); if (editError) setEditError(''); }} />
          </FormField>
          <FormField label="Descrição" tooltip={dica('sistemas.form.descricao')}>
            <textarea value={editDescricao} onChange={(e) => setEditDescricao(e.target.value)} />
          </FormField>
          <FormField label="Origem" tooltip={dica('sistemas.form.origem')}>
            <Select value={editOrigem} onChange={setEditOrigem} options={ORIGEM_OPCOES} />
          </FormField>
          <FormField label="Custo mensal" tooltip={dica('sistemas.form.custoVariavel')}>
            <input type="text" value={editVariavel} onChange={(e) => setEditVariavel(e.target.value)} placeholder="Ex: R$ 500,00 / mês" />
          </FormField>
          <div style={{ marginTop: 16, marginBottom: 12 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: 4 }}>
              <Tooltip text="Quanto do custo deste sistema é atribuído a cada cluster (0–100%). Não definido = 100%.">Rateio por cluster</Tooltip>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 6 }}>
              Multiplicador aplicado no ROI: custo recorrente × rateio% do cluster do projeto.
            </div>
            {CLUSTERS_DISPONIVEIS.map(c => {
              const r = editClustersRateio[c] ?? 100;
              return (
                <div key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ flex: '0 0 30%', fontSize: '0.8rem' }}>{c}</span>
                  <input type="range" min={0} max={100} step={5} value={r}
                    onChange={(ev) => setEditClustersRateio(prev => ({ ...prev, [c]: Number(ev.target.value) }))}
                    style={{ flex: 1 }} aria-label={`Rateio de ${c}`} />
                  <span style={{ flex: '0 0 44px', textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontSize: '0.8rem', fontWeight: 600 }}>{r}%</span>
                </div>
              );
            })}
          </div>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setEditOpen(false)}>Cancelar</button>
            <button className="btn-save" onClick={handleUpdate} disabled={editSaving}>{editSaving ? 'Salvando...' : 'Salvar'}</button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)}>
        <div className="modal">
          <h2>Detalhes do Sistema</h2>
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
              <div className="form-row">
                <div className="form-group compact">
                  <label>Origem</label>
                  <div>{detailItem.origem || '—'}</div>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group compact">
                  <label>Custo mensal</label>
                  <div>{formatarMoeda(detailItem.custoVariavelPorUso)} / mês</div>
                </div>
                <div className="form-group compact">
                  <label>Custo anual (× 12)</label>
                  <div>{formatarMoeda((detailItem.custoVariavelPorUso || 0) * 12)} / ano</div>
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>Vinculado a</div>
                {vinculos.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Este sistema não está vinculado a nenhuma etapa.</p>
                ) : (
                  vinculos.map((v) => (
                    <div key={v.procId} style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 600, color: 'var(--primary-color)', fontSize: '0.92rem' }}>{v.procName}</div>
                      <div className="tags" style={{ marginTop: 4 }}>
                        {v.etapas.map((et) => <span key={et} className="tag">{et}</span>)}
                      </div>
                    </div>
                  ))
                )}
              </div>
              {(() => {
                const melhoriasDoSistema = melhorias.filter(m =>
                  (m.sistemas || []).includes(detailItem.id) || (m.sistemas || []).includes(detailItem.nome)
                );
                return (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>Adotado/usado em melhorias</div>
                    {melhoriasDoSistema.length === 0 ? (
                      <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Nenhuma melhoria utiliza este sistema.</p>
                    ) : (
                      <div className="tags">
                        {melhoriasDoSistema.map((m) => <span key={m.id} className="tag tag-sistema">{m.nome}</span>)}
                      </div>
                    )}
                  </div>
                );
              })()}
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
          <h2>Excluir sistema</h2>
          <p>
            Tem certeza que deseja excluir <strong>{confirmDel?.nome}</strong>? Ele será
            removido das etapas e melhorias que o utilizam. Esta ação não pode ser desfeita.
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
