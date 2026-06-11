import { AlertTriangle, FileSignature, Loader2 } from 'lucide-react';
import { FolhaPaginada } from '@/components/equipe/osg/gerar/FolhaPaginada';

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

    {estado === 'pronto' && <FolhaPaginada titulo={titulo} texto={texto ?? ''} />}
  </div>
);
