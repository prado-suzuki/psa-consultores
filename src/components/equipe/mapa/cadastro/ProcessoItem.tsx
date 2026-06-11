// Linha de processo (padrão "Cadastro Puro", redesign premium).
// Em repouso é pristina: orb de status + código + nome + projeto. A ação
// primária "Mapear" fica sempre visível (discreta); editar/excluir são
// reveladas no hover — fim da sopa de botões. Clique na linha abre o modal
// de detalhe (a "Modal da Paz").

import { Link } from 'react-router-dom';
import { Eye, Pencil, Trash2, Waypoints, Workflow } from 'lucide-react';
import { openOnActivationKey, shouldIgnoreOpenClick } from '@/utils/clickOpenGuard';

interface Props {
  codigo: string;
  nome: string;
  /** Linha secundária: projeto (e frequência). */
  meta?: string;
  /** Cor do orb, derivada do status de avaliação. */
  accent: string;
  /** Selo categórico discreto (ex.: complexidade). */
  badge?: string;
  /** URL da tela de mapeamento/detalhe do processo. */
  mapearTo: string;
  /** Já mapeado (tem etapas) ⇒ ação vira "Ver detalhes"; senão, "Mapear". */
  mapeado?: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function tint(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ProcessoItem({ codigo, nome, meta, accent, badge, mapearTo, mapeado, onOpen, onEdit, onDelete }: Props) {
  return (
    <div
      className="cadastro-item processo-item"
      role="button"
      tabIndex={0}
      onClick={(e) => { if (!shouldIgnoreOpenClick(e)) onOpen(); }}
      onKeyDown={(e) => openOnActivationKey(e, onOpen)}
    >
      <span
        className="cadastro-item-orb"
        style={{ color: accent, background: tint(accent, 0.12) }}
        aria-hidden="true"
      >
        <Workflow size={20} strokeWidth={2} />
      </span>
      <div className="cadastro-item-main">
        <div className="processo-item-linha1">
          <span className="processo-code">{codigo}</span>
          <span className="cadastro-item-titulo">{nome}</span>
        </div>
        {meta && <p className="cadastro-item-descricao">{meta}</p>}
      </div>

      {badge && (
        <div className="cadastro-item-trailing">
          <span className="cadastro-item-badge">{badge}</span>
        </div>
      )}

      <div className="processo-item-acoes">
        <div className="cadastro-item-acoes">
          <button
            type="button"
            className="cadastro-item-acao"
            title="Editar"
            aria-label={`Editar ${nome}`}
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
          >
            <Pencil size={14} />
          </button>
          <button
            type="button"
            className="cadastro-item-acao cadastro-item-acao-danger"
            title="Excluir"
            aria-label={`Excluir ${nome}`}
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 size={14} />
          </button>
        </div>
        <Link
          to={mapearTo}
          className="processo-mapear"
          title={mapeado ? 'Ver detalhes do processo' : 'Mapear etapas do processo'}
          onClick={(e) => e.stopPropagation()}
        >
          {mapeado ? <Eye size={15} strokeWidth={2.2} /> : <Waypoints size={15} strokeWidth={2.2} />}
          <span>{mapeado ? 'Ver detalhes' : 'Mapear'}</span>
        </Link>
      </div>
    </div>
  );
}
