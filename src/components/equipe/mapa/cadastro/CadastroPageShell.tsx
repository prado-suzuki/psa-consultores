// Esqueleto premium das páginas de cadastro do MAPA (padrão "Cadastro Puro"):
// canvas sereno com aurora ambiente + cabeçalho editorial (eyebrow, título,
// uma frase de contexto, CTA primário) + slot. Sem KPIs, sem estatísticas —
// a página existe só para cadastrar; a análise vive no Dashboard ROI.

import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';

interface Props {
  titulo: string;
  subtitulo: string;
  /** Kicker discreto acima do título (ex.: "Mapa · Digital"). */
  eyebrow?: string;
  ctaLabel: string;
  onCta: () => void;
  carregando?: boolean;
  children: ReactNode;
}

export default function CadastroPageShell({ titulo, subtitulo, eyebrow, ctaLabel, onCta, carregando, children }: Props) {
  if (carregando) {
    return (
      <div className="card cadastro-shell">
        <div className="cadastro-loading" role="status" aria-label="Carregando">
          <span className="cadastro-loading-orb" />
        </div>
      </div>
    );
  }
  return (
    <div className="card cadastro-shell">
      <header className="cadastro-header">
        <div className="cadastro-header-titles">
          {eyebrow && (
            <span className="cadastro-eyebrow">
              <span className="cadastro-eyebrow-dot" aria-hidden="true" />
              {eyebrow}
            </span>
          )}
          <h1 className="cadastro-title">{titulo}</h1>
          <p className="cadastro-sub">{subtitulo}</p>
        </div>
        <button type="button" className="cadastro-cta" onClick={onCta}>
          <Plus size={16} strokeWidth={2.5} />
          <span>{ctaLabel}</span>
        </button>
      </header>
      {children}
    </div>
  );
}
