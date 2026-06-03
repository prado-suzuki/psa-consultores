// Lista de grupos expansíveis (organizador das páginas de cadastro).
// Cada grupo é um card horizontal com cabeçalho clicável; o corpo é renderizado
// pela página via `renderGrupo` (lista de cards, tabela etc.). Todos os grupos
// começam expandidos.

import { useState, type ReactNode } from 'react';
import type { Grupo } from '@/utils/agrupar';

interface Props<T> {
  grupos: Grupo<T>[];
  /** Renderiza o corpo de um grupo (a lista/tabela específica da página). */
  renderGrupo: (itens: T[]) => ReactNode;
  /** Substantivo [singular, plural] para a contagem no cabeçalho. */
  substantivo: [string, string];
  emptyMessage?: string;
}

export default function GrupoAccordion<T>({ grupos, renderGrupo, substantivo, emptyMessage }: Props<T>) {
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());
  const toggle = (key: string) => setColapsados((prev) => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  if (grupos.length === 0) {
    return (
      <p style={{ marginTop: 20, color: '#94a3b8' }}>
        {emptyMessage || 'Nenhum registro encontrado para os filtros selecionados.'}
      </p>
    );
  }

  return (
    <div className="grupo-list">
      {grupos.map((g) => {
        const aberto = !colapsados.has(g.key);
        const n = g.itens.length;
        return (
          <div key={g.key} className="grupo-card">
            <button
              type="button"
              className={`grupo-header${aberto ? ' aberto' : ''}`}
              onClick={() => toggle(g.key)}
              aria-expanded={aberto}
            >
              <svg className="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              <span className="grupo-titulo">{g.titulo}</span>
              <span className="grupo-count">{n} {n === 1 ? substantivo[0] : substantivo[1]}</span>
            </button>
            {aberto && <div className="grupo-body">{renderGrupo(g.itens)}</div>}
          </div>
        );
      })}
    </div>
  );
}
