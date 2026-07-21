// "Modal da Paz" do Projeto — cabeçalho fixo premium + abas animadas
// (Informações / Processos / Backlog). Reusa a casca do ProcessoDetalheModal
// e o estilo de abas do Mapeamento; o conteúdo das abas reaproveita as classes
// `projeto-detail-*` existentes.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, FileArchive, FolderKanban, Network, Pencil, Plus } from 'lucide-react';
import Modal from '@/components/equipe/mapa/Modal';
import ProcessoFormModal from '@/components/equipe/mapa/cadastro/ProcessoFormModal';
import StatusBadge from '@/components/equipe/mapa/StatusBadge';
import DiagramViewer from '@/components/equipe/mapa/DiagramViewer';
import ComoEraLista from '@/components/equipe/mapa/ComoEraLista';
import type { Documento, Etapa, Gargalo, Melhoria, Processo, Projeto, Responsavel, Sistema } from '@/types';
import { processoIdsDaMelhoria } from '@/utils/gargaloMelhorias';
import { processoCalculavel } from '@/utils/processoCalculavel';
import { buildProcessComparison, buildProjectComparison } from '@/utils/processDiagram';
import { slugFilename } from '@/utils/slugify';
import { useMapaExports } from '@/hooks/useMapaExports';

const formatarData = (iso?: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

// Veredito binário do doutor por processo (cores institucionais; sem CSS novo).
function DoctorBadge({ ok, n }: { ok: boolean; n: number }) {
  const cor = ok ? '#0d9488' : '#dc2626';
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem',
      fontWeight: 700, color: cor, background: `${cor}14`, borderRadius: 6, padding: '2px 8px',
    }}>
      {ok ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
      {ok ? 'ROI completo' : `Pendente · ${n}`}
    </span>
  );
}

type Aba = 'info' | 'processos' | 'as-is' | 'to-be' | 'diagramas' | 'backlog';

interface Props {
  aberto: boolean;
  projeto: Projeto | null;
  processos: Processo[];
  /** Etapas AS-IS por processo (já enriquecidas: sistemas = nomes). */
  etapasPorProcesso: Map<string, Etapa[]>;
  /** Etapas TO-BE por processo — linhas próprias por cenário (comparativo). */
  tobeEtapasPorProcesso: Map<string, Etapa[]>;
  backlog: Melhoria[];
  processoNomeById: Map<string, string>;
  gargalos: Gargalo[];
  /** Catálogo de responsáveis — necessário para o veredito do doutor por processo. */
  responsaveis: Responsavel[];
  /** Catálogos ainda recebidos do pai (documentos/sistemas) — mantidos na interface. */
  documentos: Documento[];
  sistemas: Sistema[];
  melhorias: Melhoria[];
  onClose: () => void;
  onEditar: () => void;
}

export default function ProjetoDetalheModal({
  aberto, projeto, processos, etapasPorProcesso, tobeEtapasPorProcesso, backlog, processoNomeById, gargalos, responsaveis, melhorias, onClose, onEditar,
}: Props) {
  const [aba, setAba] = useState<Aba>('info');
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [diagramaProc, setDiagramaProc] = useState<Processo | null>(null);
  const [verConsolidadoGM, setVerConsolidadoGM] = useState(false);
  // Diagrama de coluna única (mesmo comparativo, sem os chips): 'as' na aba AS-IS,
  // 'to' na aba TO-BE. `proc: null` = consolidado (todos os processos lado a lado);
  // `proc` preenchido = só aquele processo.
  const [diagramaCol, setDiagramaCol] = useState<{ modo: 'as' | 'to'; proc: Processo | null } | null>(null);
  const [addProcOpen, setAddProcOpen] = useState(false);
  const exports = useMapaExports();
  const toggle = (id: string) => setExpandidos(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  if (!projeto) return <Modal isOpen={aberto} onClose={onClose}><div /></Modal>;

  const ABAS: { id: Aba; label: string }[] = [
    { id: 'info', label: 'Informações' },
    { id: 'processos', label: `Processos mapeados · ${processos.length}` },
    { id: 'as-is', label: 'AS-IS' },
    { id: 'to-be', label: 'TO-BE' },
    { id: 'diagramas', label: 'Diagramas comparativos' },
    { id: 'backlog', label: `Backlog · ${backlog.length}` },
  ];

  // Doutor: veredito binário de calculabilidade do ROI por processo. É o que
  // define se o processo entra no consolidado (completo) ou fica "em mapeamento".
  const veredito = new Map(
    processos.map(p => [p.id, processoCalculavel(p, etapasPorProcesso.get(p.id) || [], responsaveis)]),
  );
  const completos = [...veredito.values()].filter(v => v.ok).length;
  const emMapeamento = processos.length - completos;

  return (
    <Modal isOpen={aberto} onClose={onClose} tourId="modal-projeto-detalhe">
      <div className="modal modal-wide processo-det projeto-det">
        <header className="processo-det-head">
          <div className="processo-det-head-main">
            <div className="processo-det-topo">
              <span className="projeto-det-icone" aria-hidden="true"><FolderKanban size={20} /></span>
              <h2>{projeto.name}</h2>
            </div>
            <div className="processo-det-badges">
              <StatusBadge status={projeto.status || 'Mapeamento'} />
              {(projeto.justificativas || []).map(j => <StatusBadge key={j} variant="neutral">{j}</StatusBadge>)}
              {projeto.clusterName && <span className="processo-det-projeto">{projeto.clusterName}</span>}
            </div>
          </div>
          <div className="processo-det-acoes">
            <button className="btn-cancel" onClick={() => exports.exportProjetoZip(projeto.id)} title="Exportar .zip por processo: como-era e como-ficou (SOP em PDF + Markdown + Diagrama .mmd) e comparativo (PDF + Markdown)">
              <FileArchive size={15} strokeWidth={2.2} />
              <span>Exportar projeto (.zip)</span>
            </button>
            <button className="cadastro-cta" onClick={onEditar} data-tour="modal-acao">
              <Pencil size={15} strokeWidth={2.2} />
              <span>Editar projeto</span>
            </button>
          </div>
        </header>

        <div className="projeto-det-tabs" role="tablist" data-tour="modal-tabs">
          {ABAS.map(a => {
            const ativa = aba === a.id;
            return (
              <button key={a.id} role="tab" aria-selected={ativa} className={`mapear-tab${ativa ? ' ativa' : ''}`} onClick={() => setAba(a.id)}>
                {a.label}
                {ativa && <motion.span layoutId="projetoTabInd" className="mapear-tab-ind" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              </button>
            );
          })}
        </div>

        <div className="processo-det-body">
          {aba === 'info' && (
            <>
              <p className="processo-det-descricao" style={{ marginBottom: 16 }}>
                {projeto.description || 'Sem descrição.'}
              </p>
              <div className="projeto-detail-info-grid" style={{ margin: '0 0 16px' }}>
                <div><span>Cluster</span><strong>{projeto.clusterName || 'Não definido'}</strong></div>
                <div><span>Status</span><strong>{projeto.status || 'Mapeamento'}</strong></div>
                <div><span>Início</span><strong>{formatarData(projeto.start_date)}</strong></div>
                <div><span>Fim</span><strong>{formatarData(projeto.end_date)}</strong></div>
              </div>
              <div className="cadastro-form-secao" style={{ marginTop: 0 }}>Justificativas</div>
              {(projeto.justificativas || []).length > 0 ? (
                <div className="justif-chips">
                  {(projeto.justificativas || []).map(j => <span key={j} className="projeto-justif-tag">{j}</span>)}
                </div>
              ) : (
                <p className="processo-det-vazio">Nenhuma justificativa cadastrada.</p>
              )}
            </>
          )}

          {aba === 'processos' && (
            processos.length === 0 ? (
              <div className="processo-det-vazio">
                Nenhum processo vinculado a este projeto.
                <div style={{ marginTop: 10 }}>
                  <button type="button" className="cadastro-cta" onClick={() => setAddProcOpen(true)}>
                    <Plus size={15} strokeWidth={2.2} /><span>Adicionar processo</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Gate de status: projeto em Mapeamento não entra no Dashboard ROI,
                    mesmo com processos de ROI completo (critério = doutor + status). */}
                {(projeto.status || 'Mapeamento') === 'Mapeamento' && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 12, padding: '8px 12px', borderRadius: 8, background: '#d9770614', color: '#9a3412', fontSize: '0.82rem' }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
                    <span>Projeto em <strong>Mapeamento</strong> — os processos só entram no Dashboard ROI quando o status mudar (mesmo os com ROI completo). Altere em <strong>Editar projeto</strong>.</span>
                  </div>
                )}
                {/* Resumo do doutor — quantos processos entram no ROI consolidado */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: '0.85rem', color: '#475569', flexWrap: 'wrap' }}>
                  <strong style={{ color: '#0f172a' }}>{completos}</strong> de
                  <strong style={{ color: '#0f172a' }}>{processos.length}</strong> processos com ROI completo
                  {emMapeamento > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: '#dc2626', fontWeight: 600 }}>
                      <AlertTriangle size={13} /> {emMapeamento} em mapeamento (fora do consolidado)
                    </span>
                  )}
                </div>
                <div className="projeto-detail-row-list">
                  {processos.map((processo, index) => {
                    const ets = etapasPorProcesso.get(processo.id) || [];
                    const expanded = expandidos.has(processo.id);
                    const vd = veredito.get(processo.id) ?? { ok: false, faltando: [] };
                    return (
                      <div key={processo.id} className={`projeto-process-row${expanded ? ' expanded' : ''}`}>
                        <button type="button" className="projeto-process-summary" onClick={() => toggle(processo.id)} aria-expanded={expanded}>
                          <span className="projeto-process-index">{String(index + 1).padStart(2, '0')}</span>
                          <span className="projeto-process-name">{processo.name}</span>
                          <span className="projeto-process-status"><DoctorBadge ok={vd.ok} n={vd.faltando.length} /></span>
                          <span className="projeto-process-count">{ets.length} etapa{ets.length === 1 ? '' : 's'}</span>
                          <span className="projeto-process-chevron" aria-hidden="true">⌄</span>
                        </button>
                        {expanded && (
                          <div className="projeto-process-details">
                            <p>{processo.description || 'Sem descrição.'}</p>
                            {!vd.ok && (
                              <div style={{ margin: '0 0 10px' }}>
                                <strong style={{ fontSize: '0.8rem', color: '#dc2626' }}>Falta para o ROI contar:</strong>
                                <ul style={{ margin: '4px 0 0', paddingLeft: 18, fontSize: '0.8rem', color: '#475569' }}>
                                  {vd.faltando.map((f, i) => <li key={i}>{f}</li>)}
                                </ul>
                              </div>
                            )}
                            <div className="projeto-process-etapas">
                              {ets.length > 0
                                ? ets.map(et => <span key={et.id}>{et.stage_order ?? '•'}. {et.name}</span>)
                                : <em>Nenhuma etapa mapeada.</em>}
                            </div>
                            <Link to={`/equipe/digital/mapa/processos/${encodeURIComponent(processo.id)}/mapear`}>Abrir mapeamento</Link>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )
          )}

          {aba === 'as-is' && (
            processos.length === 0 ? (
              <div className="processo-det-vazio">
                Nenhum processo vinculado a este projeto.
                <div style={{ marginTop: 10 }}>
                  <button type="button" className="cadastro-cta" onClick={() => setAddProcOpen(true)}>
                    <Plus size={15} strokeWidth={2.2} /><span>Adicionar processo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="projeto-asis">
                <p className="processo-det-descricao" style={{ marginBottom: 12 }}>
                  Retrato do estado atual — cada processo do projeto, etapa por etapa.
                </p>
                {processos.some(p => (etapasPorProcesso.get(p.id) || []).length > 0) && (
                  <button
                    type="button"
                    className="cadastro-cta"
                    style={{ marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onClick={() => setDiagramaCol({ modo: 'as', proc: null })}
                  >
                    <Network size={15} strokeWidth={2.2} />
                    Ver diagrama Como Era (consolidado)
                  </button>
                )}
                <div className="projeto-detail-row-list">
                  {processos.map((p, i) => {
                    const ets = etapasPorProcesso.get(p.id) || [];
                    const temEtapas = ets.length > 0;
                    const chave = `as:${p.id}`;
                    const expanded = expandidos.has(chave);
                    return (
                      <div key={p.id} className={`projeto-process-row${expanded ? ' expanded' : ''}`}>
                        <div className="projeto-process-row-head">
                          <button
                            type="button"
                            className="projeto-process-summary"
                            style={{ gridTemplateColumns: '42px minmax(180px, 1fr) auto 26px' }}
                            onClick={() => toggle(chave)}
                            aria-expanded={expanded}
                          >
                            <span className="projeto-process-index">{String(i + 1).padStart(2, '0')}</span>
                            <span className="projeto-process-name">{p.name}</span>
                            <span className="projeto-process-count">{ets.length} etapa{ets.length === 1 ? '' : 's'}</span>
                            <span className="projeto-process-chevron" aria-hidden="true">⌄</span>
                          </button>
                          {temEtapas && (
                            <button
                              type="button"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'center', marginRight: 10, fontSize: '0.78rem', fontWeight: 700, color: '#0d9488', background: '#f0fdfa', border: '1px solid #0d9488', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                              onClick={() => setDiagramaCol({ modo: 'as', proc: p })}
                            >
                              <Network size={14} strokeWidth={2.2} /> Ver diagrama
                            </button>
                          )}
                        </div>
                        {expanded && (
                          <div className="projeto-process-details" style={{ padding: '4px 12px 14px' }}>
                            <ComoEraLista etapas={ets} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {aba === 'to-be' && (
            processos.length === 0 ? (
              <div className="processo-det-vazio">
                Nenhum processo vinculado a este projeto.
                <div style={{ marginTop: 10 }}>
                  <button type="button" className="cadastro-cta" onClick={() => setAddProcOpen(true)}>
                    <Plus size={15} strokeWidth={2.2} /><span>Adicionar processo</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="projeto-asis">
                <p className="processo-det-descricao" style={{ marginBottom: 12 }}>
                  Retrato do estado futuro — cada processo do projeto, etapa por etapa, após as melhorias.
                </p>
                {processos.some(p => (tobeEtapasPorProcesso.get(p.id) || []).length > 0) && (
                  <button
                    type="button"
                    className="cadastro-cta"
                    style={{ marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onClick={() => setDiagramaCol({ modo: 'to', proc: null })}
                  >
                    <Network size={15} strokeWidth={2.2} />
                    Ver diagrama Como Ficou (consolidado)
                  </button>
                )}
                <div className="projeto-detail-row-list">
                  {processos.map((p, i) => {
                    const ets = tobeEtapasPorProcesso.get(p.id) || [];
                    const temEtapas = ets.length > 0;
                    const chave = `to:${p.id}`;
                    const expanded = expandidos.has(chave);
                    return (
                      <div key={p.id} className={`projeto-process-row${expanded ? ' expanded' : ''}`}>
                        <div className="projeto-process-row-head">
                          <button
                            type="button"
                            className="projeto-process-summary"
                            style={{ gridTemplateColumns: '42px minmax(180px, 1fr) auto 26px' }}
                            onClick={() => toggle(chave)}
                            aria-expanded={expanded}
                          >
                            <span className="projeto-process-index">{String(i + 1).padStart(2, '0')}</span>
                            <span className="projeto-process-name">{p.name}</span>
                            <span className="projeto-process-count">{ets.length} etapa{ets.length === 1 ? '' : 's'}</span>
                            <span className="projeto-process-chevron" aria-hidden="true">⌄</span>
                          </button>
                          {temEtapas && (
                            <button
                              type="button"
                              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, alignSelf: 'center', marginRight: 10, fontSize: '0.78rem', fontWeight: 700, color: '#0d9488', background: '#f0fdfa', border: '1px solid #0d9488', borderRadius: 8, padding: '6px 12px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
                              onClick={() => setDiagramaCol({ modo: 'to', proc: p })}
                            >
                              <Network size={14} strokeWidth={2.2} /> Ver diagrama
                            </button>
                          )}
                        </div>
                        {expanded && (
                          // ComoEraLista é um renderizador puro de Etapa[] — reusado p/ o TO-BE.
                          <div className="projeto-process-details" style={{ padding: '4px 12px 14px' }}>
                            <ComoEraLista etapas={ets} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {aba === 'diagramas' && (
            processos.length === 0 ? (
              <div className="processo-det-vazio">
                Nenhum processo vinculado a este projeto.
                <div style={{ marginTop: 10 }}>
                  <button type="button" className="cadastro-cta" onClick={() => setAddProcOpen(true)}>
                    <Plus size={15} strokeWidth={2.2} /><span>Adicionar processo</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="processo-det-descricao" style={{ marginBottom: 12 }}>
                  Comparativo Como Era × Como Ficou. Abra cada processo para ver as etapas (etapa · execução · sistemas) em duas colunas; ou o diagrama consolidado do projeto (Gargalo × Melhoria).
                </p>
                <button
                  type="button"
                  className="cadastro-cta"
                  style={{ marginBottom: 14, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  onClick={() => setVerConsolidadoGM(true)}
                >
                  <Network size={15} strokeWidth={2.2} />
                  Diagrama consolidado do projeto
                </button>
                <div className="projeto-detail-row-list">
                  {processos.map((p, i) => {
                    const nAs = (etapasPorProcesso.get(p.id) || []).length;
                    const nTo = (tobeEtapasPorProcesso.get(p.id) || []).length;
                    const temEtapas = nAs + nTo > 0;
                    return (
                      <div key={p.id} className="projeto-process-row">
                        <button
                          type="button"
                          className="projeto-process-summary"
                          onClick={() => temEtapas && setDiagramaProc(p)}
                          disabled={!temEtapas}
                          aria-disabled={!temEtapas}
                        >
                          <span className="projeto-process-index">{String(i + 1).padStart(2, '0')}</span>
                          <span className="projeto-process-name">{p.name}</span>
                          <span className="projeto-process-count">{nAs} → {nTo} etapa{nTo === 1 ? '' : 's'}</span>
                          <span className="projeto-process-status">
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.72rem', fontWeight: 700, color: temEtapas ? '#4f46e5' : '#94a3b8' }}>
                              <Network size={13} /> {temEtapas ? 'Ver comparativo' : 'Sem etapas'}
                            </span>
                          </span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          )}

          {aba === 'backlog' && (
            backlog.length === 0 ? (
              <p className="processo-det-vazio">Nenhuma melhoria em Backlog vinculada a este projeto.</p>
            ) : (
              <>
                <div className="projeto-detail-list-header projeto-backlog-header">
                  <span>Melhoria</span><span>Processos</span><span>Esforço</span><span>Status</span>
                </div>
                <div className="projeto-detail-row-list">
                  {backlog.map(melhoria => {
                    const procs = processoIdsDaMelhoria(melhoria).map(pid => processoNomeById.get(pid)).filter((n): n is string => Boolean(n));
                    const horas = (melhoria.training_hours || 0) + (melhoria.executadoPor || []).reduce((s, r) => s + (r.horas || 0), 0);
                    return (
                      <div key={melhoria.id} className="projeto-backlog-row">
                        <div className="projeto-backlog-main">
                          <strong>{melhoria.improvement_description}</strong>
                          <p>{melhoria.acoesTd?.length ? melhoria.acoesTd.join(' · ') : 'Sem ações TD cadastradas.'}</p>
                        </div>
                        <div className="projeto-backlog-processes">{procs.length > 0 ? procs.join(', ') : 'Projeto'}</div>
                        <div className="projeto-backlog-effort">{horas > 0 ? `${horas.toLocaleString('pt-BR')}h` : '—'}</div>
                        <div><StatusBadge variant="neutral">Backlog</StatusBadge></div>
                      </div>
                    );
                  })}
                </div>
              </>
            )
          )}
        </div>
      </div>
      {diagramaProc && (
        <DiagramViewer
          isOpen={!!diagramaProc}
          onClose={() => setDiagramaProc(null)}
          code={buildProcessComparison({
            processos: [diagramaProc],
            asisPorProcesso: etapasPorProcesso,
            tobePorProcesso: tobeEtapasPorProcesso,
          })}
          filename={`Comparativo_Etapas_${slugFilename(diagramaProc.name, diagramaProc.id)}`}
          title={`${diagramaProc.name} · Como Era × Como Ficou`}
        />
      )}
      {verConsolidadoGM && (
        <DiagramViewer
          isOpen={verConsolidadoGM}
          onClose={() => setVerConsolidadoGM(false)}
          code={buildProjectComparison({
            projetoNome: projeto.name,
            processos,
            gargalos,
            melhorias,
            asisPorProcesso: etapasPorProcesso,
            tobePorProcesso: tobeEtapasPorProcesso,
          })}
          filename={`Comparativo_GargaloMelhoria_${slugFilename(projeto.name, projeto.id)}`}
          title={`${projeto.name} · Gargalos e Melhorias`}
        />
      )}
      {diagramaCol && (
        <DiagramViewer
          isOpen={!!diagramaCol}
          onClose={() => setDiagramaCol(null)}
          code={diagramaCol.proc
            // Por processo: diagrama de ETAPAS (coluna única, sem os chips).
            ? buildProcessComparison({
                processos: [diagramaCol.proc],
                asisPorProcesso: etapasPorProcesso,
                tobePorProcesso: tobeEtapasPorProcesso,
                coluna: diagramaCol.modo,
              })
            // Consolidado: o MESMO diagrama do projeto, só com a coluna do cenário.
            : buildProjectComparison({
                projetoNome: projeto.name,
                processos,
                gargalos,
                melhorias,
                asisPorProcesso: etapasPorProcesso,
                tobePorProcesso: tobeEtapasPorProcesso,
                coluna: diagramaCol.modo,
              })}
          filename={`Diagrama_${diagramaCol.modo === 'as' ? 'ComoEra' : 'ComoFicou'}_${slugFilename((diagramaCol.proc ?? projeto).name, (diagramaCol.proc ?? projeto).id)}`}
          title={
            diagramaCol.proc
              // Por processo (etapas): nome do processo + o cenário.
              ? `${diagramaCol.proc.name} · ${diagramaCol.modo === 'as' ? 'Como Era' : 'Como Ficou'}`
              // Consolidado: nome do projeto + o que está sendo usado.
              : `${projeto.name} · ${diagramaCol.modo === 'as' ? 'Gargalos' : 'Melhorias'}`
          }
        />
      )}
      {/* Adicionar processo sem sair do painel — já vinculado a este projeto. */}
      <ProcessoFormModal
        aberto={addProcOpen}
        processo={null}
        projetoIdInicial={projeto.id}
        onClose={() => setAddProcOpen(false)}
      />
    </Modal>
  );
}
