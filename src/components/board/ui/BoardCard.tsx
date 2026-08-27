import React from 'react';

interface BoardCardProps {
  /** Título do bloco. Omitir só em card sem cabeçalho (gráfico solto). */
  title?: React.ReactNode;
  /** Uma linha de contexto embaixo do título: janela, fonte, unidade. */
  subtitle?: React.ReactNode;
  /**
   * Controle do próprio card — seletor de período, filtro local, chip de
   * status. Fica na MESMA linha do título, à direita, como na referência:
   * o controle vive junto do dado que ele governa, não numa barra distante.
   */
  actions?: React.ReactNode;
  /** Rodapé de ressalva (fonte incompleta, rateio, escopo de acesso). */
  note?: React.ReactNode;
  /** Fundo tingido no acento — para o card de destaque de uma grade. */
  tint?: boolean;
  /** Sem padding interno: para tabela/gráfico que sangram até a borda. */
  flush?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

/**
 * O card do Board.
 *
 * Existe porque o mesmo cabeçalho — flex, `justify-content: space-between`,
 * título + subtítulo + controle à direita, com as mesmas quatro medidas — era
 * reescrito inline em oito componentes, e por isso divergia: uns tinham
 * `marginBottom: 4`, outros `12`; uns punham o subtítulo dentro do título,
 * outros num `div` solto depois. A regra de "não criar wrapper passa-tudo"
 * (AGENTS.md) não vale aqui: este componente TEM responsabilidade — ele é
 * quem define a anatomia do bloco (cabeçalho, corpo, ressalva) e o único
 * lugar onde ela pode mudar.
 *
 * `data-reveal` sai daqui: todo card do Board entra na animação de revelação
 * (ver `useBoardReveal`), e lembrar disso em cada uso era a fonte de cards que
 * apareciam sem transição.
 */
export const BoardCard: React.FC<BoardCardProps> = ({
  title, subtitle, actions, note, tint, flush, className = '', style, children,
}) => (
  <div
    className={`v4-card${tint ? ' v4-card-tint' : ''}${flush ? ' v4-card-flush' : ''} ${className}`}
    style={style}
    data-reveal
  >
    {(title || actions) && (
      <div className="v4-card-head" style={flush ? { padding: '18px 20px 0' } : undefined}>
        <div className="v4-card-head-txt">
          {title && <div className="v4-card-title">{title}</div>}
          {subtitle && <div className="v4-card-sub">{subtitle}</div>}
        </div>
        {actions && <div className="v4-card-act">{actions}</div>}
      </div>
    )}
    {children}
    {note && <div className="v4-card-note">{note}</div>}
  </div>
);

/** Vazio padrão de dentro de um card — texto centrado, sem ícone decorativo. */
export const BoardCardEmpty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="v4-card-empty">{children}</div>
);
