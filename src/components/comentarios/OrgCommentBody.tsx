import { Fragment, type ReactNode } from 'react';
import type { JSONContent } from '@tiptap/core';
import { ExternalLink } from 'lucide-react';

import { MENCAO_CLASS } from '@/components/comentarios/extensions/MencaoUsuario';
import { partesDoTexto } from '@/lib/linksNoTexto';
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

/**
 * O clique no link não pode chegar ao item do feed, que abre a thread: quem
 * clicou queria o endereço.
 */
function Link({ href, rotulo, original }: { href: string; rotulo: string; original: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title={original}
      onClick={(evento) => evento.stopPropagation()}
      className="break-all rounded-sm bg-primary/5 px-1 font-medium text-primary underline decoration-primary/30 underline-offset-2 transition-colors hover:bg-primary/10 hover:decoration-primary"
    >
      {rotulo}
      <ExternalLink aria-hidden className="ml-0.5 inline h-3 w-3 align-[-0.1em]" />
    </a>
  );
}

function ComLinks({ texto }: { texto: string }) {
  return (
    <>
      {partesDoTexto(texto).map((parte, index) =>
        parte.tipo === 'link' ? (
          <Link key={index} href={parte.href} rotulo={parte.rotulo} original={parte.original} />
        ) : (
          <Fragment key={index}>{parte.texto}</Fragment>
        ),
      )}
    </>
  );
}

function renderNode(node: JSONContent, key: string): ReactNode {
  const filhos = node.content?.map((filho, index) => renderNode(filho, `${key}-${index}`));

  if (node.type === 'text') {
    let conteudo: ReactNode = <ComLinks texto={node.text || ''} />;
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
          <ComLinks key={`texto-${index}`} texto={parte} />
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
