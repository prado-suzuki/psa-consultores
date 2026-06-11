// Esqueleto padrão das páginas de cadastro do MAPA (padrão "Cadastro Puro"):
// card + header enxuto (título, uma frase de contexto, CTA primário) + slot.
// Sem KPIs, sem estatísticas — análise vive no Dashboard ROI.

import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';

interface Props {
  titulo: string;
  subtitulo: string;
  ctaLabel: string;
  onCta: () => void;
  carregando?: boolean;
  children: ReactNode;
}

export default function CadastroPageShell({ titulo, subtitulo, ctaLabel, onCta, carregando, children }: Props) {
  if (carregando) {
    return (
      <div className="loading-container"><div className="spinner" /></div>
    );
  }
  return (
    <div className="card">
      <div className="page-header-v2">
        <div className="page-header-titles">
          <h1>{titulo}</h1>
          <p>{subtitulo}</p>
        </div>
        <button className="btn-add" onClick={onCta}>
          <Plus size={16} strokeWidth={2.5} />
          {ctaLabel}
        </button>
      </div>
      {children}
    </div>
  );
}
