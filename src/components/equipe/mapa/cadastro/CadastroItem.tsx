// Linha da lista de cadastro (padrão "Cadastro Puro", redesign premium):
// um cartão flutuante com orb de identidade à esquerda, título + descrição,
// um selo categórico discreto e ações reveladas no hover. Clique/Enter na
// linha abre o item (edição); a11y via clickOpenGuard. Sem números/KPIs —
// a análise quantitativa vive no Dashboard ROI.

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
  /** Ícone de identidade exibido no orb à esquerda (cinza em repouso, verde no hover). */
  leading?: ReactNode;
  /** Indicadores de vínculo; só renderizam quando valor > 0 (uso opcional). */
  metas?: CadastroItemMeta[];
  onOpen: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function CadastroItem({ titulo, descricao, badge, leading, metas, onOpen, onEdit, onDelete }: Props) {
  const metasVisiveis = (metas || []).filter((m) => m.valor > 0);
  const temTrailing = Boolean(badge) || metasVisiveis.length > 0;
  return (
    <div
      className="cadastro-item"
      role="button"
      tabIndex={0}
      onClick={(e) => { if (!shouldIgnoreOpenClick(e)) onOpen(); }}
      onKeyDown={(e) => openOnActivationKey(e, onOpen)}
    >
      {leading && (
        <span className="cadastro-item-orb" aria-hidden="true">
          {leading}
        </span>
      )}
      <div className="cadastro-item-main">
        <span className="cadastro-item-titulo">{titulo}</span>
        {descricao && <p className="cadastro-item-descricao">{descricao}</p>}
      </div>
      {temTrailing && (
        <div className="cadastro-item-trailing">
          {badge && (
            <span className="cadastro-item-badge">
              {badge.cor && <span className="cadastro-item-badge-dot" style={{ background: badge.cor }} />}
              {badge.label}
            </span>
          )}
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
