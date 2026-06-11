// Linha genérica da lista de cadastro: título + descrição truncada + badge
// categórico + indicadores discretos de vínculo + ações reveladas no hover.
// Clique/Enter na linha abre o item (edição); a11y via clickOpenGuard.

import type { ReactNode } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { openOnActivationKey, shouldIgnoreOpenClick } from '@/utils/clickOpenGuard';

export interface CadastroItemMeta {
  icone: ReactNode;
  valor: number;
  /** Texto do title nativo explicando o indicador. */
  hint: string;
}

interface Props {
  titulo: string;
  descricao?: string;
  badge?: { label: string; cor?: string };
  /** Indicadores de vínculo; só renderizam quando valor > 0. */
  metas?: CadastroItemMeta[];
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CadastroItem({ titulo, descricao, badge, metas, onOpen, onEdit, onDelete }: Props) {
  const metasVisiveis = (metas || []).filter((m) => m.valor > 0);
  return (
    <div
      className="cadastro-item"
      role="button"
      tabIndex={0}
      onClick={(e) => { if (!shouldIgnoreOpenClick(e)) onOpen(); }}
      onKeyDown={(e) => openOnActivationKey(e, onOpen)}
    >
      <div className="cadastro-item-main">
        <div className="cadastro-item-linha1">
          <span className="cadastro-item-titulo">{titulo}</span>
          {badge && (
            <span className="cadastro-item-badge">
              {badge.cor && <span className="cadastro-item-badge-dot" style={{ background: badge.cor }} />}
              {badge.label}
            </span>
          )}
        </div>
        {descricao && <p className="cadastro-item-descricao">{descricao}</p>}
      </div>
      {metasVisiveis.length > 0 && (
        <div className="cadastro-item-metas">
          {metasVisiveis.map((m) => (
            <span key={m.hint} className="cadastro-item-meta" title={m.hint}>
              {m.icone}
              {m.valor}
            </span>
          ))}
        </div>
      )}
      <div className="cadastro-item-acoes">
        <button
          type="button"
          className="cadastro-item-acao"
          title="Editar"
          aria-label={`Editar ${titulo}`}
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
        >
          <Pencil size={14} />
        </button>
        <button
          type="button"
          className="cadastro-item-acao cadastro-item-acao-danger"
          title="Excluir"
          aria-label={`Excluir ${titulo}`}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
