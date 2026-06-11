// Empty state das páginas de cadastro. Modo cheio: convite pedagógico ao
// primeiro cadastro (único lugar da página com explicação longa). Modo
// compacto: busca sem resultado, com ação em texto ("Limpar busca").

import type { ReactNode } from 'react';

interface Props {
  icone: ReactNode;
  titulo: string;
  texto?: string;
  ctaLabel?: string;
  onCta?: () => void;
  compacto?: boolean;
}

export default function EmptyStateCadastro({ icone, titulo, texto, ctaLabel, onCta, compacto }: Props) {
  return (
    <div className={`cadastro-empty${compacto ? ' cadastro-empty-compacto' : ''}`}>
      <div className="cadastro-empty-icone">{icone}</div>
      <h3 className="cadastro-empty-titulo">{titulo}</h3>
      {texto && <p className="cadastro-empty-texto">{texto}</p>}
      {ctaLabel && onCta && (
        compacto ? (
          <button type="button" className="cadastro-empty-link" onClick={onCta}>{ctaLabel}</button>
        ) : (
          <button type="button" className="btn-add" onClick={onCta}>{ctaLabel}</button>
        )
      )}
    </div>
  );
}
