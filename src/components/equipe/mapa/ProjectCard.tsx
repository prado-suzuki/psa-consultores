import { motion } from 'framer-motion';
import { Tooltip } from './Tooltip';
import StatusBadge from './StatusBadge';
import { dica } from '@/utils/tooltips';
import type { Projeto } from '@/types';

const formatarData = (iso?: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

interface ProjectCardProps {
  projeto: Projeto;
  qtdProcessos: number;
  processosLoaded?: boolean;
  /** Posição na lista — controla o delay do fade-in para efeito stagger. */
  index?: number;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShowProcessos: () => void;
}

/**
 * Card de projeto v2 — visual unificado:
 *  • Stripe lateral teal
 *  • Header com título + ações (ver/editar/excluir)
 *  • Linha cluster + contagem de processos
 *  • Tags (status + justificativas)
 *  • Descrição com line-clamp
 *  • Footer com datas
 *  • Hover lift via framer-motion
 */
export default function ProjectCard({
  projeto,
  qtdProcessos,
  processosLoaded = true,
  index = 0,
  onView,
  onEdit,
  onDelete,
  onShowProcessos,
}: ProjectCardProps) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const delay = Math.min(index, 8) * 0.04;

  return (
    <motion.article
      className="project-card-v2"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1], delay }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.99 }}
      onClick={onView}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onView();
        }
      }}
    >
      <div className="pcv2-header">
        <h3 className="pcv2-title">
          <Tooltip text={dica('projetos.card.titulo')}>{projeto.name}</Tooltip>
        </h3>
        <div className="pcv2-actions">
          <button
            type="button"
            onClick={(e) => { stop(e); onView(); }}
            title="Ver detalhes"
            aria-label="Ver detalhes"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
          <button
            type="button"
            onClick={(e) => { stop(e); onEdit(); }}
            title="Editar projeto"
            aria-label="Editar projeto"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          </button>
          <button
            type="button"
            className="danger"
            onClick={(e) => { stop(e); onDelete(); }}
            title="Excluir projeto"
            aria-label="Excluir projeto"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/></svg>
          </button>
        </div>
      </div>

      <div className="pcv2-meta-row">
        {projeto.clusterName ? (
          <span className="pcv2-cluster">Cluster: {projeto.clusterName}</span>
        ) : <span />}
        <button
          type="button"
          className="pcv2-processos"
          onClick={(e) => { stop(e); onShowProcessos(); }}
          disabled={!processosLoaded}
          title="Ver processos vinculados"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          {qtdProcessos} {qtdProcessos === 1 ? 'Processo' : 'Processos'}
        </button>
      </div>

      <div className="pcv2-tags">
        <StatusBadge status={projeto.status || 'Mapeamento'} />
        {(projeto.justificativas || []).map(j => (
          <StatusBadge key={j} variant="neutral">{j}</StatusBadge>
        ))}
      </div>

      <p className={`pcv2-desc${projeto.description ? '' : ' empty'}`}>
        {projeto.description || 'Sem descrição.'}
      </p>

      <div className="pcv2-footer">
        <span>Início: <strong>{formatarData(projeto.start_date)}</strong></span>
        <span>Fim: <strong>{formatarData(projeto.end_date)}</strong></span>
      </div>
    </motion.article>
  );
}
