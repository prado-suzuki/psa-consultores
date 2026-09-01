import type { ReactNode } from 'react';

/**
 * Uma linha sob o topbar: identidade à esquerda, recorte à direita.
 * Título, data e alerta não empilham com cluster, filtro e subaba.
 */
export function BoardToolbar({
  title,
  meta,
  chips,
  children,
}: {
  title?: string;
  meta?: ReactNode;
  chips?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="bd-toolbar">
      {(title || meta || chips) && (
        <div className="bd-toolbar-id">
          {title ? <h1 className="bd-toolbar-title">{title}</h1> : null}
          {(meta || chips) && (
            <div className="bd-toolbar-meta">
              {meta}
              {chips}
            </div>
          )}
        </div>
      )}
      {children ? <div className="bd-toolbar-actions">{children}</div> : null}
    </div>
  );
}
