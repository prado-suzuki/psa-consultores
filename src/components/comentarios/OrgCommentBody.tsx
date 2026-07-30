import { Fragment, type ReactNode } from 'react';
import type { JSONContent } from '@tiptap/core';

import { MENCAO_CLASS } from '@/components/comentarios/extensions/MencaoUsuario';
import { lerCorpo, NO_DE_MENCAO } from '@/lib/orgCommentRichText';

/**
 * Leitura do comentário na thread.
 *
 * Renderiza as três formas de corpo que existem hoje (ver `orgCommentRichText`):
 * documento do editor, documento de revisão e texto plano legado. O documento
 * vira elemento React nó por nó — nada de `dangerouslySetInnerHTML`, mesmo
 * padrão dos outros renderers do sistema.
 */

const TOKEN_DE_MENCAO = /(@\[[^\]]+\]\([^)]+\))/g;
const TOKEN_COMPLETO = /^@\[([^\]]+)\]\([^)]+\)$/;

function Mencao({ children }: { children: ReactNode }) {
  return <span className={MENCAO_CLASS}>{children}</span>;
}

function renderNode(node: JSONContent, key: string): ReactNode {
  const filhos = node.content?.map((filho, index) => renderNode(filho, `${key}-${index}`));

  if (node.type === 'text') {
    let conteudo: ReactNode = node.text || '';
    for (const marca of node.marks || []) {
      if (marca.type === 'bold') conteudo = <strong>{conteudo}</strong>;
      if (marca.type === 'italic') conteudo = <em>{conteudo}</em>;
      if (marca.type === 'underline') conteudo = <u>{conteudo}</u>;
    }
    return <Fragment key={key}>{conteudo}</Fragment>;
  }
  if (node.type === NO_DE_MENCAO) {
    return <Mencao key={key}>@{node.attrs?.label ?? ''}</Mencao>;
  }
  if (node.type === 'paragraph') {
    return <p key={key}>{filhos?.length ? filhos : <br />}</p>;
  }
  if (node.type === 'bulletList') {
    return (
      <ul key={key} className="my-1 list-disc pl-5">
        {filhos}
      </ul>
    );
  }
  if (node.type === 'orderedList') {
    const start = typeof node.attrs?.start === 'number' ? node.attrs.start : undefined;
    return (
      <ol key={key} start={start} className="my-1 list-decimal pl-5">
        {filhos}
      </ol>
    );
  }
  if (node.type === 'listItem') return <li key={key}>{filhos}</li>;
  if (node.type === 'hardBreak') return <br key={key} />;
  if (node.type === 'doc') return <Fragment key={key}>{filhos}</Fragment>;
  return null;
}

/** Comentário em texto plano: a menção ainda é o token `@[Nome](uuid)`. */
function TextoLegado({ texto }: { texto: string }) {
  return (
    <p className="whitespace-pre-wrap break-words">
      {texto.split(TOKEN_DE_MENCAO).map((parte, index) => {
        const mencao = parte.match(TOKEN_COMPLETO);
        return mencao ? (
          <Mencao key={`${parte}-${index}`}>@{mencao[1]}</Mencao>
        ) : (
          <Fragment key={`texto-${index}`}>{parte}</Fragment>
        );
      })}
    </p>
  );
}

export function OrgCommentBody({ body }: { body: string }) {
  const corpo = lerCorpo(body);

  return (
    <div className="space-y-1 break-words text-sm leading-6 text-foreground/90">
      {corpo.formato === 'rich' ? (
        renderNode(corpo.doc, 'doc')
      ) : (
        <TextoLegado texto={corpo.texto} />
      )}
    </div>
  );
}
