import { AlertTriangle, FileSignature, Loader2 } from 'lucide-react';
import { TextoFormatado } from '@/components/equipe/osg/TextoFormatado';

// Tipografia da prévia: serifada, como o contrato impresso — a "folha" branca
// sobre o canvas bege é o artefato final da oficina e o centro da tela.
const FONTE_DOCUMENTO = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif";

export type EstadoFolha = 'pendente' | 'carregando' | 'erro' | 'pronto';

interface FolhaDocumentoProps {
  titulo: string;
  estado: EstadoFolha;
  /** O que falta para gerar (estado 'pendente'), em linguagem de usuário. */
  mensagemPendente?: string;
  erro?: string | null;
  texto?: string | null;
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
  texto,
}: FolhaDocumentoProps) => (
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
      <article className="rounded-sm border border-osg-200/70 bg-white px-7 py-9 shadow-[0_1px_2px_rgba(28,25,23,0.06),0_16px_40px_-20px_rgba(68,52,40,0.35)] animate-osg-card-in motion-reduce:animate-none sm:px-12 sm:py-12">
        <header className="mb-8 text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-osg-500">
            Prévia do documento
          </p>
          <h3
            className="mt-1.5 text-lg font-semibold text-slate-900"
            style={{ fontFamily: FONTE_DOCUMENTO }}
          >
            {titulo}
          </h3>
          <span aria-hidden className="mx-auto mt-3 block h-[3px] w-12 rounded-full bg-osg-moss" />
        </header>
        <div
          className="whitespace-pre-wrap text-justify text-[15px] leading-[1.9] text-stone-800"
          style={{ fontFamily: FONTE_DOCUMENTO }}
        >
          <TextoFormatado texto={texto ?? ''} />
        </div>
      </article>
    )}
  </div>
);
