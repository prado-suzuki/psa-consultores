// "Modal da Paz" do Projeto — cabeçalho fixo premium + abas animadas
// (Informações / Processos / Backlog). Reusa a casca do ProcessoDetalheModal
// e o estilo de abas do Mapeamento; o conteúdo das abas reaproveita as classes
// `projeto-detail-*` existentes.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, FileArchive, FolderKanban, Pencil } from 'lucide-react';
import Modal from '@/components/equipe/mapa/Modal';
import StatusBadge from '@/components/equipe/mapa/StatusBadge';
import type { Etapa, Gargalo, Melhoria, Processo, Projeto, Responsavel } from '@/types';
import { processoIdsDaMelhoria } from '@/utils/gargaloMelhorias';
import { processoCalculavel } from '@/utils/processoCalculavel';
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

type Aba = 'info' | 'processos' | 'backlog';

interface Props {
  aberto: boolean;
  projeto: Projeto | null;
  processos: Processo[];
  etapasPorProcesso: Map<string, Etapa[]>;
  backlog: Melhoria[];
  processoNomeById: Map<string, string>;
  gargalos: Gargalo[];
  /** Catálogo de responsáveis — necessário para o veredito do doutor por processo. */
  responsaveis: Responsavel[];
  onClose: () => void;
  onEditar: () => void;
}

export default function ProjetoDetalheModal({
  aberto, projeto, processos, etapasPorProcesso, backlog, processoNomeById, gargalos, responsaveis, onClose, onEditar,
}: Props) {
  const [aba, setAba] = useState<Aba>('info');
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const exports = useMapaExports();
  const toggle = (id: string) => setExpandidos(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  if (!projeto) return <Modal isOpen={aberto} onClose={onClose}><div /></Modal>;

  const ABAS: { id: Aba; label: string }[] = [
    { id: 'info', label: 'Informações' },
    { id: 'processos', label: `Processos · ${processos.length}` },
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
            <button className="btn-cancel" onClick={() => exports.exportProjetoZip(projeto.id)} title="Exportar .zip com SOP (PDF + Markdown) e Diagrama (.mmd) de cada processo do projeto">
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
              <p className="processo-det-vazio">Nenhum processo vinculado a este projeto.</p>
            ) : (
              <>
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
    </Modal>
  );
}
