import { Download, FileText, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { categoriaLabel, isImagem, isPreviavel } from '@/components/equipe/osg/documentos/docMeta';
import type { DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';

interface Props {
  doc: DocumentoArquivoRow | null;
  /** Signed URL já resolvida (mesmo mecanismo do preview do hub); null enquanto carrega. */
  url: string | null;
  carregando: boolean;
  erro: string | null;
  onRecarregar: () => void;
  onBaixar: () => void;
}

/**
 * Coluna central: o documento aberto do balde. É a coluna que fica com o espaço
 * sobrante, porque o que alimenta a ficha é contrato social e matrícula — e
 * esses precisam ser lidos.
 */
export function DocumentoVisualizador({ doc, url, carregando, erro, onRecarregar, onBaixar }: Props) {
  const previavel = doc ? isPreviavel(doc.nome_original, doc.mime) : false;
  const imagem = doc ? isImagem(doc.nome_original, doc.mime) : false;

  return (
    <section
      aria-label="Documento aberto"
      className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-osg-300/60 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-14px_hsl(var(--osg-700)/0.20)]"
    >
      <div className="flex items-center gap-2 border-b border-osg-100 px-3.5 py-2.5">
        <FileText className="h-4 w-4 shrink-0 text-osg-600" aria-hidden />
        <h3 className="min-w-0 truncate text-[13px] font-semibold text-osg-700">
          {doc?.nome_original ?? 'Nenhum arquivo aberto'}
        </h3>
        {doc && (
          <span className="shrink-0 rounded-md bg-osg-50 px-2 py-0.5 text-[10.5px] font-semibold text-osg-700">
            {categoriaLabel(doc.categoria)}
          </span>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onBaixar}
          disabled={!doc}
          className="ml-auto shrink-0 gap-1.5 text-[11.5px]"
        >
          <Download className="h-3.5 w-3.5" aria-hidden /> Baixar
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-osg-50/60 p-4">
        {!doc ? (
          <p className="text-sm text-muted-foreground">Escolha um arquivo no balde para lê-lo aqui.</p>
        ) : !previavel ? (
          <div className="text-center">
            <p className="text-sm text-slate-700">Este formato não abre no navegador.</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Baixe o arquivo para ler e volte para preencher a ficha.
            </p>
          </div>
        ) : erro ? (
          <div className="text-center">
            <p className="text-sm text-slate-700">{erro}</p>
            <Button type="button" variant="outline" size="sm" onClick={onRecarregar} className="mt-3 gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Tentar de novo
            </Button>
          </div>
        ) : carregando || !url ? (
          <span className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-osg-moss" aria-hidden />
            Abrindo o documento…
          </span>
        ) : imagem ? (
          <img src={url} alt={doc.nome_original} className="max-h-full max-w-full object-contain" />
        ) : (
          <iframe src={url} title={doc.nome_original} className="h-full w-full rounded-md bg-white" />
        )}
      </div>
    </section>
  );
}
