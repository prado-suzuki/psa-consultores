import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import Modal from '@/components/equipe/mapa/Modal';
import FormField from '@/components/equipe/mapa/FormField';
import Select from '@/components/equipe/mapa/Select';
import FiltrosBar from '@/components/equipe/mapa/FiltrosBar';
import GrupoAccordion from '@/components/equipe/mapa/GrupoAccordion';
import PageStats from '@/components/equipe/mapa/PageStats';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';
import { agrupar } from '@/utils/agrupar';
import { formatDecimal } from '@/utils/format';
import { enrichEtapas } from '@/utils/enrichEtapas';
import { useFocusParam } from '@/utils/useFocusParam';
import { openOnActivationKey, shouldIgnoreOpenClick } from '@/utils/clickOpenGuard';
import type { Documento, EstruturacaoDoc } from '@/types';
import { useEtapasLista, useSistemasLista, useResponsaveisLista, useProcessosLista, useProjetosLista } from '@/hooks/useDominioListas';
import { useDocumentos, useUpdateDocumento, useDeleteDocumento } from '@/hooks/useDocumentos';
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import NovoDocumentoModal from '@/components/equipe/mapa/cadastros/NovoDocumentoModal';
import {
  TIPO_OPCOES, ORIGEM_OPCOES, ESTRUTURADO_SELECT_OPCOES, FORMATO_SELECT_OPCOES, deriveEstruturado,
} from '@/components/equipe/mapa/cadastros/documentoOpcoes';

// Opções de filtro (com "Todos")
const ORIGEM_FILTRO_OPCOES = [{ value: '', label: 'Todas as origens' }, ...ORIGEM_OPCOES];
const FORMATO_FILTRO_OPCOES = [{ value: '', label: 'Todos os formatos' }, ...FORMATO_SELECT_OPCOES];
const ESTRUTURADO_FILTRO_OPCOES = [{ value: '', label: 'Todas as estruturas' }, ...ESTRUTURADO_SELECT_OPCOES];
const TIPO_FILTRO_OPCOES = [{ value: '', label: 'Todos os tipos' }, ...TIPO_OPCOES];

const ORGANIZAR_OPCOES = [
  { value: 'tipo', label: 'Por tipo' },
  { value: 'origem', label: 'Por origem' },
  { value: 'formato', label: 'Por formato' },
];

export default function DocumentosPage() {
  const { data: items = [], isLoading: docsLoading } = useDocumentos();
  const loaded = !docsLoading;
  const updateDoc = useUpdateDocumento();
  const deleteDoc = useDeleteDocumento();
  const [modalOpen, setModalOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState<Documento | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Filtros
  const [fOrigem, setFOrigem] = useState('');
  const [fFormato, setFFormato] = useState('');
  const [fEstruturado, setFEstruturado] = useState('');
  const [fTipo, setFTipo] = useState('');
  const { cluster: fCluster } = useClusterGlobal();

  const { data: rawEtapas = [] } = useEtapasLista();
  const { data: sis = [] } = useSistemasLista();
  const { data: resps = [] } = useResponsaveisLista();
  const { data: processos = [] } = useProcessosLista();
  const { data: projetos = [] } = useProjetosLista();
  const etapas = useMemo(
    () => enrichEtapas(rawEtapas, items, sis, resps),
    [rawEtapas, items, sis, resps],
  );
  const clusterIdPorProjeto = useMemo(
    () => new Map(projetos.map(p => [p.id, p.cluster_id || ''])),
    [projetos],
  );
  const processoIdsDoEscopo = useMemo(
    () => new Set(
      processos
        .filter(p => !fCluster || (p.project_id ? clusterIdPorProjeto.get(p.project_id) || '' : '') === fCluster)
        .map(p => p.id),
    ),
    [processos, fCluster, clusterIdPorProjeto],
  );
  const etapasDoEscopo = useMemo(
    () => etapas.filter(e => !fCluster || processoIdsDoEscopo.has(e.process_id)),
    [etapas, fCluster, processoIdsDoEscopo],
  );
  const nomesDocumentosDoEscopo = useMemo(() => {
    if (!fCluster) return null;
    const nomes = new Set<string>();
    const addRefs = (refs?: ({ nome?: string } | string)[]) => {
      for (const ref of refs || []) {
        if (typeof ref === 'string') nomes.add(ref);
        else if (ref?.nome) nomes.add(ref.nome);
      }
    };
    for (const etapa of etapasDoEscopo) {
      addRefs(etapa.docsEntrada);
      addRefs(etapa.docsSaida);
      addRefs(etapa.ficou?.docsEntrada);
      addRefs(etapa.ficou?.docsSaida);
    }
    return nomes;
  }, [fCluster, etapasDoEscopo]);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState<Documento | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState('');
  const [editNome, setEditNome] = useState('');
  const [editTipo, setEditTipo] = useState('');
  const [editFormato, setEditFormato] = useState('');
  const [editOrigem, setEditOrigem] = useState('Interno');
  const [editEstrutura, setEditEstrutura] = useState('');
  const [editEstruturado, setEditEstruturado] = useState<EstruturacaoDoc | ''>('');
  const [editError, setEditError] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const focusId = useFocusParam();

  const procMap = new Map(processos.map(p => [p.id, p.name]));

  const getVinculos = (docNome: string) => {
    const vinculos: { procId: string; procName: string; etapas: { nome: string; tipo: 'entrada' | 'saída' }[] }[] = [];
    const etapasRel = etapas.filter(e =>
      (e.docsEntrada || []).some((d) => (typeof d === 'string' ? d : d.nome) === docNome) ||
      (e.docsSaida || []).some((d) => (typeof d === 'string' ? d : d.nome) === docNome)
    );
    const grouped = new Map<string, { nome: string; tipo: 'entrada' | 'saída' }[]>();
    etapasRel.forEach(e => {
      const list = grouped.get(e.process_id) || [];
      const hasEntrada = (e.docsEntrada || []).some((d) => (typeof d === 'string' ? d : d.nome) === docNome);
      const hasSaida = (e.docsSaida || []).some((d) => (typeof d === 'string' ? d : d.nome) === docNome);
      if (hasEntrada) list.push({ nome: e.name, tipo: 'entrada' });
      if (hasSaida && !hasEntrada) list.push({ nome: e.name, tipo: 'saída' });
      if (hasSaida && hasEntrada) {
        const idx = list.findIndex((x) => x.nome === e.name && x.tipo === 'entrada');
        if (idx !== -1) list[idx] = { nome: e.name, tipo: 'entrada' };
      }
      grouped.set(e.process_id, list);
    });
    grouped.forEach((etapasList, procId) => {
      vinculos.push({ procId, procName: procMap.get(procId) || procId, etapas: etapasList });
    });
    return vinculos;
  };

  // Tempo de elaboração mensal = Σ (horas exec + revisão) × volume mensal das
  // etapas em que o documento aparece como SAÍDA. volumeMensal já agrega o
  // volume de todos os projetos ativos. Calculado por cenário.
  const tempoElaboracao = (docNome: string, ficou: boolean): number => {
    let total = 0;
    for (const e of etapasDoEscopo) {
      const docsSaida = (ficou ? (e.ficou?.docsSaida ?? e.docsSaida) : e.docsSaida) || [];
      const ehSaida = docsSaida.some((d) => (typeof d === 'string' ? d : d.nome) === docNome);
      if (!ehSaida) continue;
      const vol = e.volumeMensal || 0;
      if (vol === 0) continue;
      const exec = (ficou ? (e.ficou?.executadoPor ?? e.executadoPor) : e.executadoPor) || [];
      const horasPorExec = exec.reduce((s, r) => s + (r.horas || 0), 0);
      total += horasPorExec * vol;
    }
    return total;
  };

  const openNew = () => setModalOpen(true);
  const openDetail = (d: Documento) => {
    setDetailItem(d);
    setDetailOpen(true);
  };
  // Focus-navigation: abre o detalhe ao chegar de outra página com focusId.
  useEffect(() => {
    if (!loaded || !focusId) return;
    const d = items.find(x => x.id === focusId);
    if (d) openDetail(d);
  }, [loaded, focusId, items]);
  const openEdit = (d: Documento) => {
    setDetailItem(d);
    setEditId(d.id || '');
    setEditNome(d.nome);
    setEditTipo(d.tipo || '');
    setEditFormato(d.formato || '');
    setEditOrigem(d.origem || 'Interno');
    setEditEstrutura(d.estrutura_entrada || '');
    setEditEstruturado(d.estruturado || '');
    setEditError('');
    setEditOpen(true);
  };
  const editFromDetail = () => {
    if (!detailItem) return;
    setDetailOpen(false);
    openEdit(detailItem);
  };

  const handleUpdate = async () => {
    if (!editNome.trim()) { setEditError('Preencha o nome do documento.'); return; }
    const old = items.find(d => d.id === editId);
    if (!old) return;
    setEditError('');
    setEditSaving(true);
    try {
      await updateDoc.mutateAsync({
        id: editId,
        old,
        patch: {
          nome: editNome.trim(),
          tipo: editTipo.trim(),
          formato: editFormato,
          origem: editOrigem,
          estrutura_entrada: (editEstrutura || undefined) as Documento['estrutura_entrada'],
          estruturado: (editEstruturado || undefined) as EstruturacaoDoc | undefined,
        },
      });
      toast.success('Documento atualizado');
      setEditOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : String(err));
    } finally {
      setEditSaving(false);
    }
  };

  const filtrosAtivos = !!(fOrigem || fFormato || fEstruturado || fTipo);
  const limparFiltros = () => { setFOrigem(''); setFFormato(''); setFEstruturado(''); setFTipo(''); };
  const filtered = useMemo(() => items.filter((d) =>
    (!fCluster || nomesDocumentosDoEscopo?.has(d.nome)) &&
    (!fOrigem || d.origem === fOrigem) &&
    (!fFormato || d.formato === fFormato) &&
    (!fEstruturado || d.estruturado === fEstruturado) &&
    (!fTipo || d.tipo === fTipo)
  ), [items, fCluster, nomesDocumentosDoEscopo, fOrigem, fFormato, fEstruturado, fTipo]);

  // Organizador (primeiro filtro): agrupa em cards expansíveis.
  const [organizar, setOrganizar] = useState('tipo');
  const grupos = useMemo(() => {
    if (organizar === 'origem') return agrupar(filtered, (d) => [d.origem || ''], ORIGEM_OPCOES, 'Sem origem');
    if (organizar === 'formato') return agrupar(filtered, (d) => [d.formato || ''], FORMATO_SELECT_OPCOES, 'Sem formato');
    return agrupar(filtered, (d) => [d.tipo || ''], TIPO_OPCOES, 'Sem tipo');
  }, [organizar, filtered]);

  if (!loaded) return (
    <div className="loading-container"><div className="spinner" /></div>
  );

  const vinculos = detailItem ? getVinculos(detailItem.nome) : [];

  return (
    <div className="card">
      <div className="page-header-v2">
        <div className="page-header-titles">
          <h1>Documentos</h1>
          <p>Visualize e organize a documentação do projeto.</p>
        </div>
        <button className="btn-add" onClick={openNew}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Adicionar Documento
        </button>
      </div>
      <PageStats stats={[
        {
          label: 'Documentos',
          value: String(filtered.length),
          tooltip: 'Documentos no escopo atual dos filtros.',
        },
        {
          label: 'Internos',
          value: String(filtered.filter(d => d.origem === 'Interno').length),
          tooltip: 'Documentos internos no escopo atual.',
        },
        {
          label: 'Do cliente',
          value: String(filtered.filter(d => d.origem === 'Cliente').length),
          tooltip: 'Documentos do cliente no escopo atual.',
        },
        {
          label: 'Tempo elab./mês',
          value: formatDecimal(filtered.reduce((sum, d) => sum + tempoElaboracao(d.nome, false), 0), 'h'),
          tooltip: 'Carga mensal de elaboração dos documentos no escopo atual.',
        },
      ]} />
      <FiltrosBar
        ativo={filtrosAtivos}
        onLimpar={limparFiltros}
        filtros={[
          { id: 'fd-organizar', label: 'Organizar por', value: organizar, onChange: setOrganizar, options: ORGANIZAR_OPCOES, tooltip: dica('comum.filtro.organizar') },
          { id: 'fd-origem', label: 'Origem', value: fOrigem, onChange: setFOrigem, options: ORIGEM_FILTRO_OPCOES, tooltip: dica('documentos.filtro.origem') },
          { id: 'fd-formato', label: 'Formato', value: fFormato, onChange: setFFormato, options: FORMATO_FILTRO_OPCOES, tooltip: dica('documentos.filtro.formato') },
          { id: 'fd-estruturado', label: 'Estruturado', value: fEstruturado, onChange: setFEstruturado, options: ESTRUTURADO_FILTRO_OPCOES, tooltip: dica('documentos.filtro.estruturado') },
          { id: 'fd-tipo', label: 'Tipo', value: fTipo, onChange: setFTipo, options: TIPO_FILTRO_OPCOES, tooltip: dica('documentos.filtro.tipo') },
        ]}
      />
      <GrupoAccordion
        grupos={grupos}
        substantivo={['documento', 'documentos']}
        emptyMessage="Nenhum documento encontrado para os filtros selecionados."
        renderGrupo={(itens) => (
      <div className="doc-table-container docs-grid">
        <div className="doc-table-header">
          <div className="doc-col-icon"></div>
          <div className="doc-col-nome"><Tooltip text={dica('documentos.col.documento')}>Documento</Tooltip></div>
          <div className="doc-col-tipo"><Tooltip text={dica('documentos.col.tipo')}>Tipo</Tooltip></div>
          <div className="doc-col-formato"><Tooltip text={dica('documentos.col.formato')}>Formato</Tooltip></div>
          <div className="doc-col-tempo"><Tooltip text={dica('documentos.col.tempo')}>Tempo elab./mês</Tooltip></div>
          <div className="doc-col-origem"><Tooltip text={dica('documentos.col.origem')}>Origem</Tooltip></div>
          <div className="doc-col-descricao"><Tooltip text={dica('documentos.col.descricao')}>Descrição</Tooltip></div>
          <div className="doc-col-acoes"></div>
        </div>
        {itens.map((d) => {
          return (
            <div
              key={d.id}
              className="doc-table-row clickable"
              role="button"
              tabIndex={0}
              onClick={(e) => {
                if (shouldIgnoreOpenClick(e)) return;
                openDetail(d);
              }}
              onKeyDown={(e) => openOnActivationKey(e, () => openDetail(d))}
            >
              <div className="doc-col-icon">
                <span className="doc-format-icon" title={d.formato || ''}>DOC</span>
              </div>
              <div className="doc-col-nome">
                <div className="doc-nome">{d.nome}</div>
              </div>
              <div className="doc-col-tipo">{d.tipo || '—'}</div>
              <div className="doc-col-formato">
                {d.formato ? <span className="doc-format-badge">{d.formato}</span> : '—'}
              </div>
              <div className="doc-col-tempo">{formatDecimal(tempoElaboracao(d.nome, false), 'h')}</div>
              <div className="doc-col-origem">
                <span className={`badge-origem${d.origem === 'Cliente' ? ' cliente' : ''}`}>{d.origem}</span>
              </div>
              <div className="doc-col-descricao" title={d.estrutura_entrada || ''}>
                {d.estrutura_entrada || '—'}
              </div>
              <div className="doc-col-acoes" style={{ display: 'flex', gap: 4 }}>
                <button
                  className="btn-action-sm"
                  onClick={(e) => { e.stopPropagation(); openEdit(d); }}
                >
                  Editar
                </button>
                <button
                  className="btn-action-sm"
                  title="Excluir documento"
                  style={{ color: '#b91c1c', padding: '2px 5px' }}
                  onClick={(e) => { e.stopPropagation(); setConfirmDel(d); }}
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

      <NovoDocumentoModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />

      <Modal isOpen={editOpen} onClose={() => setEditOpen(false)}>
        <div className="modal">
          <h2>Editar Documento</h2>
          <FormField label="Nome do Documento" error={editError} required tooltip={dica('documentos.form.nome')}>
            <input type="text" value={editNome} onChange={(e) => { setEditNome(e.target.value); if (editError) setEditError(''); }} placeholder="Digite o nome" />
          </FormField>
          <FormField label="Tipo" tooltip={dica('documentos.form.tipo')}>
            <Select value={editTipo} onChange={setEditTipo} options={TIPO_OPCOES} placeholder="Selecione..." />
          </FormField>
          <FormField label="Formato" tooltip={dica('documentos.form.formato')}>
            <Select
              value={editFormato}
              onChange={(v) => { setEditFormato(v); const derivado = deriveEstruturado(v); if (derivado) setEditEstruturado(derivado); }}
              options={FORMATO_SELECT_OPCOES}
              placeholder="Selecione..."
            />
          </FormField>
          <FormField label="Origem" tooltip={dica('documentos.form.origem')}>
            <Select value={editOrigem} onChange={setEditOrigem} options={ORIGEM_OPCOES} />
          </FormField>
          <FormField label="Estruturado" tooltip={dica('documentos.form.estruturado')}>
            <Select
              value={editEstruturado}
              onChange={(v) => setEditEstruturado(v as EstruturacaoDoc | '')}
              options={ESTRUTURADO_SELECT_OPCOES}
              placeholder="Selecione..."
            />
          </FormField>
          <FormField label="Descrição" tooltip={dica('documentos.form.descricao')}>
            <textarea
              value={editEstrutura}
              onChange={(e) => setEditEstrutura(e.target.value)}
              placeholder="Descrição do documento e como é usado no processo"
              rows={3}
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
          <h2>Detalhes do Documento</h2>
          {detailItem && (
            <>
              <div className="form-group compact">
                <label>Nome</label>
                <div style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{detailItem.nome}</div>
              </div>
              <div className="form-row">
                <div className="form-group compact">
                  <label>Tipo</label>
                  <div>{detailItem.tipo || '—'}</div>
                </div>
                <div className="form-group compact">
                  <label>Formato</label>
                  <div>
                    {detailItem.formato ? <span className="doc-format-badge">{detailItem.formato}</span> : '—'}
                  </div>
                </div>
              </div>
              <div className="form-group compact">
                <label>Origem</label>
                <div>{detailItem.origem}</div>
              </div>
              <div className="form-row">
                <div className="form-group compact">
                  <label>Tempo de elaboração/mês (como era)</label>
                  <div>{formatDecimal(tempoElaboracao(detailItem.nome, false), 'h')}</div>
                </div>
                <div className="form-group compact">
                  <label>Tempo de elaboração/mês (como ficou)</label>
                  <div>{formatDecimal(tempoElaboracao(detailItem.nome, true), 'h')}</div>
                </div>
              </div>
              <div className="form-group compact">
                <label>Estruturado</label>
                <div>{detailItem.estruturado || '—'}</div>
              </div>
              <div className="form-group compact">
                <label>Descrição</label>
                <div>{detailItem.estrutura_entrada || '—'}</div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#94a3b8', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #f1f5f9' }}>Vinculado a</div>
                {vinculos.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Este documento não está vinculado a nenhuma etapa.</p>
                ) : (
                  vinculos.map((v) => (
                    <div key={v.procId} style={{ marginBottom: 10 }}>
                      <div style={{ fontWeight: 600, color: 'var(--primary-color)', fontSize: '0.92rem' }}>{v.procName}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 4 }}>
                        {v.etapas.map((et) => (
                          <div key={et.nome + et.tipo} style={{ fontSize: '0.85rem' }}>
                            {et.nome} <span style={{ opacity: 0.7 }}>({et.tipo})</span>
                          </div>
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
          <h2>Excluir documento</h2>
          <p>
            Tem certeza que deseja excluir <strong>{confirmDel?.nome}</strong>? Ele será
            removido das etapas que o referenciam. Esta ação não pode ser desfeita.
          </p>
          <div className="modal-actions">
            <button className="btn-cancel" onClick={() => setConfirmDel(null)} disabled={deleting}>Cancelar</button>
            <button
              className="btn-save"
              style={{ background: '#b91c1c' }}
              disabled={deleting}
              onClick={async () => {
                if (!confirmDel?.id) return;
                setDeleting(true);
                try {
                  await deleteDoc.mutateAsync({ id: confirmDel.id, old: confirmDel });
                  toast.success('Documento excluído');
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
