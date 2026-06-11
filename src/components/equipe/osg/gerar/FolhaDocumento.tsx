import { useState } from 'react';
import { AlertTriangle, Blocks, FileSignature, Loader2, Pencil } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { TextoFormatado } from '@/components/equipe/osg/TextoFormatado';
import type { TipoBloco } from '@/lib/templates';

// Tipografia da prévia: serifada, como o contrato impresso — a "folha" branca
// sobre o canvas bege é o artefato final da oficina e o centro da tela.
const FONTE_DOCUMENTO = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif";

export type EstadoFolha = 'pendente' | 'carregando' | 'erro' | 'pronto';

/** Bloco já composto/numerado/renderizado, com o nome de exibição do catálogo. */
export interface BlocoFolha {
  /** Id da posição no modelo (tmpl_documento_bloco). */
  id: string;
  /** Id do bloco na Biblioteca (tmpl_bloco) — abre a edição; null em bloco órfão. */
  blocoId: string | null;
  nome: string;
  tipo?: TipoBloco;
  conteudo: string;
}

interface FolhaDocumentoProps {
  titulo: string;
  estado: EstadoFolha;
  /** O que falta para gerar (estado 'pendente'), em linguagem de usuário. */
  mensagemPendente?: string;
  erro?: string | null;
  blocos?: BlocoFolha[] | null;
  /** Quando informado, clicar num trecho abre o popover com o atalho de edição do bloco. */
  onEditarBloco?: (bloco: BlocoFolha) => void;
}

/**
 * A folha do documento gerado: papel branco com sombra e tipografia serifada,
 * cabeçalho timbrado com o nome do modelo. As ações ficam no rail ao lado
 * (PainelAcoes) — aqui é só o documento.
 */
export const FolhaDocumento = ({
  titulo,
  estado,
  mensagemPendente,
  erro,
  blocos,
  onEditarBloco,
}: FolhaDocumentoProps) => {
  // Popover de edição aberto sobre um trecho (id da posição no modelo).
  const [popoverAberto, setPopoverAberto] = useState<string | null>(null);

  return (
  <div className="min-w-0">
    {estado === 'pendente' && (
      <div className="rounded-md border-2 border-dashed border-osg-200 bg-card/60 px-8 py-20 text-center">
        <FileSignature className="mx-auto h-8 w-8 text-osg-300" />
        <p className="mt-3 text-sm font-medium text-slate-600">{mensagemPendente}</p>
        <p className="mt-1 text-xs text-slate-400">
          O documento aparece aqui assim que os passos acima estiverem completos.
        </p>
      </div>
    )}

    {estado === 'carregando' && (
      <div className="rounded-md border-2 border-dashed border-osg-200 bg-card/60 px-8 py-20 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-osg-300" />
        <p className="mt-3 text-sm font-medium text-slate-600">
          Buscando os dados do cadastro…
        </p>
      </div>
    )}

    {estado === 'erro' && (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
        <AlertTriangle className="mx-auto h-7 w-7 text-destructive" />
        <p className="mt-3 text-sm font-semibold text-destructive">
          Algo impediu a geração do documento.
        </p>
        {erro && <code className="mt-2 block text-xs text-slate-600">{erro}</code>}
        <p className="mt-2 text-xs text-slate-500">
          Confira os dados em "Ajustar dados manualmente" ou o conteúdo do modelo na Montagem.
        </p>
      </div>
    )}

    {estado === 'pronto' && (
      <article className="rounded-sm border border-osg-200/70 bg-white px-7 pb-9 pt-2 shadow-[0_1px_2px_rgba(28,25,23,0.06),0_16px_40px_-20px_rgba(68,52,40,0.35)] animate-osg-card-in motion-reduce:animate-none sm:px-12 sm:pb-12">
        {/* <div>, não <header>: o mapa.css tem um `header{display:flex;...}`
            global que vazaria para cá e desfaria o empilhamento centrado. */}
        <div className="mb-8 text-center">
          {/* Etiqueta rente ao topo da folha; o traço musgo sublinha só "Prévia". */}
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-osg-500">
            <span className="inline-block border-b-2 border-osg-moss pb-1">Prévia</span> do
            documento
          </p>
          <h3
            className="mt-8 text-lg font-semibold text-slate-900"
            style={{ fontFamily: FONTE_DOCUMENTO }}
          >
            {titulo}
          </h3>
        </div>
        <div
          className="whitespace-pre-wrap text-justify text-[15px] leading-[1.9] text-stone-800"
          style={{ fontFamily: FONTE_DOCUMENTO }}
        >
          {/* Cada bloco é um trecho próprio: passar o mouse destaca o que ele
              renderiza e a etiqueta diz de qual bloco do modelo o trecho veio;
              clicar abre o popover com o atalho de edição do bloco na Biblioteca.
              O espaçamento reproduz o unirBlocos: parágrafo cola na cláusula
              (a própria quebra de bloco), os demais separam com linha em branco. */}
          {(blocos ?? []).map((bloco, i) => {
            const editavel = !!onEditarBloco && !!bloco.blocoId;
            const trecho = (
              <div
                key={bloco.id}
                className={cn(
                  'group/bloco relative -mx-3 rounded-md px-3 transition-colors duration-150',
                  'hover:bg-osg-moss/[0.06] hover:ring-1 hover:ring-inset hover:ring-osg-moss/30',
                  'data-[state=open]:bg-osg-moss/[0.06] data-[state=open]:ring-1 data-[state=open]:ring-inset data-[state=open]:ring-osg-moss/30',
                  editavel && 'cursor-pointer',
                  i > 0 && bloco.tipo !== 'paragrafo' && 'mt-[1.9em]',
                )}
              >
                {bloco.nome && (
                  <span className="pointer-events-none absolute -top-3 right-2 z-10 hidden items-center gap-1.5 whitespace-nowrap rounded-full bg-osg-moss px-2.5 py-1 font-sans text-[10px] font-semibold leading-none tracking-wide text-white shadow-md group-hover/bloco:inline-flex group-data-[state=open]/bloco:inline-flex">
                    <Blocks className="h-3 w-3" />
                    {bloco.nome}
                  </span>
                )}
                <TextoFormatado texto={bloco.conteudo.trim()} />
              </div>
            );
            if (!editavel) return trecho;
            return (
              <Popover
                key={bloco.id}
                open={popoverAberto === bloco.id}
                onOpenChange={(aberto) => setPopoverAberto(aberto ? bloco.id : null)}
              >
                <PopoverTrigger asChild>{trecho}</PopoverTrigger>
                <PopoverContent side="top" align="center" className="w-auto p-1.5">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 font-sans text-xs font-medium text-slate-700 transition-colors hover:bg-osg-50 hover:text-osg-700"
                    onClick={() => {
                      setPopoverAberto(null);
                      onEditarBloco?.(bloco);
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 text-osg-600" />
                    Editar bloco "{bloco.nome}"
                  </button>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      </article>
    )}
  </div>
  );
};
