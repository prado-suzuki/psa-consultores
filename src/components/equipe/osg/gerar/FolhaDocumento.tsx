import { AlertTriangle, Check, Copy, Download, FileSignature, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TextoFormatado } from '@/components/equipe/osg/TextoFormatado';

// Tipografia da prévia: serifada, como o contrato impresso — a "folha" branca
// sobre o canvas bege é o artefato final da oficina.
const FONTE_DOCUMENTO = "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif";

export type EstadoFolha = 'pendente' | 'carregando' | 'erro' | 'pronto';

interface FolhaDocumentoProps {
  titulo: string;
  estado: EstadoFolha;
  /** O que falta para gerar (estado 'pendente'), em linguagem de usuário. */
  mensagemPendente?: string;
  erro?: string | null;
  texto?: string | null;
  /** Linha de status sob as ações (ex.: "12 blocos · preenchido do cadastro"). */
  info?: string;
  onCopiar: () => void;
  copiado: boolean;
  onBaixar: () => void;
  baixando: boolean;
}

/**
 * A folha do documento gerado: papel branco com sombra e tipografia serifada,
 * cabeçalho timbrado com o nome do modelo e ações de copiar/baixar acima.
 */
export const FolhaDocumento = ({
  titulo,
  estado,
  mensagemPendente,
  erro,
  texto,
  info,
  onCopiar,
  copiado,
  onBaixar,
  baixando,
}: FolhaDocumentoProps) => {
  const pronto = estado === 'pronto';

  return (
    <div className="min-w-0 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-slate-500">{pronto ? info : ' '}</p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onCopiar} disabled={!pronto}>
            {copiado ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
            {copiado ? 'Copiado' : 'Copiar texto'}
          </Button>
          <Button size="sm" onClick={onBaixar} disabled={!pronto || baixando}>
            {baixando ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-4 w-4" />
            )}
            Baixar .docx
          </Button>
        </div>
      </div>

      {estado === 'pendente' && (
        <div className="rounded-md border-2 border-dashed border-osg-200 bg-card/60 px-8 py-16 text-center">
          <FileSignature className="mx-auto h-8 w-8 text-osg-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">{mensagemPendente}</p>
          <p className="mt-1 text-xs text-slate-400">
            O documento aparece aqui assim que os passos acima estiverem completos.
          </p>
        </div>
      )}

      {estado === 'carregando' && (
        <div className="rounded-md border-2 border-dashed border-osg-200 bg-card/60 px-8 py-16 text-center">
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

      {pronto && (
        <article
          className="rounded-sm border border-osg-200/70 bg-white px-7 py-9 shadow-[0_1px_2px_rgba(28,25,23,0.06),0_16px_40px_-20px_rgba(68,52,40,0.35)] animate-osg-card-in motion-reduce:animate-none sm:px-12 sm:py-12"
        >
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
};
