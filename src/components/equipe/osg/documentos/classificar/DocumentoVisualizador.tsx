import { useState } from 'react';
import { Download, FileText, Loader2, Maximize2, Minimize2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
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
 * esses precisam ser lidos. Quando não bastar, o botão de expandir joga o mesmo
 * preview num modal que ocupa quase a tela inteira.
 */
export function DocumentoVisualizador({ doc, url, carregando, erro, onRecarregar, onBaixar }: Props) {
  const previavel = doc ? isPreviavel(doc.nome_original, doc.mime) : false;
  const imagem = doc ? isImagem(doc.nome_original, doc.mime) : false;
  // Expandir é só mudar o preview de lugar: a URL assinada vem pronta do pai
  // (`usePreviewUrl`), então abrir em tela cheia não pede assinatura nova.
  const [expandido, setExpandido] = useState(false);

  const baixar = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={onBaixar}
      disabled={!doc}
      className="shrink-0 gap-1.5 text-[11.5px]"
    >
      <Download className="h-3.5 w-3.5" aria-hidden /> Baixar
    </Button>
  );

  /* O preview é montado UMA vez e vai para a coluna ou para o modal — nunca
     para os dois, senão seriam dois iframes puxando o mesmo arquivo. */
  const preview = (
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
  );

  return (
    <>
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
          <div className="ml-auto flex shrink-0 items-center gap-1">
            {baixar}
            {/* Some com o documento expandido: quem recolhe é o modal. */}
            {!expandido && (
              <button
                type="button"
                onClick={() => setExpandido(true)}
                disabled={!doc}
                aria-label="Expandir documento"
                title="Expandir documento"
                className="rounded-md p-1 text-osg-600 transition-colors hover:bg-osg-50 hover:text-osg-700 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss"
              >
                <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </div>
        </div>

        {expandido ? (
          <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
            <Maximize2 className="h-5 w-5 text-osg-600" aria-hidden />
            <p className="max-w-xs text-[12px] leading-relaxed text-muted-foreground">
              O documento está aberto em tela cheia. Feche para voltar a lê-lo ao lado da ficha.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => setExpandido(false)}>
              Trazer de volta
            </Button>
          </div>
        ) : (
          preview
        )}
      </section>

      {/* OsgDialog (e não ui/dialog) por causa da animação de entrada da área. */}
      <Dialog open={expandido} onOpenChange={setExpandido}>
        <DialogContent className="flex h-[92vh] w-[94vw] max-w-[1400px] flex-col gap-0 p-0">
          <div className="flex shrink-0 items-center gap-2 border-b border-osg-100 px-5 py-3">
            <FileText className="h-4 w-4 shrink-0 text-osg-600" aria-hidden />
            <DialogHeader className="min-w-0 flex-1 space-y-0 text-left">
              <DialogTitle className="min-w-0 truncate text-[14px] font-semibold text-osg-700">
                {doc?.nome_original ?? 'Nenhum arquivo aberto'}
              </DialogTitle>
            </DialogHeader>
            {doc && (
              <span className="shrink-0 rounded-md bg-osg-50 px-2 py-0.5 text-[10.5px] font-semibold text-osg-700">
                {categoriaLabel(doc.categoria)}
              </span>
            )}
            {baixar}
            <button
              type="button"
              onClick={() => setExpandido(false)}
              aria-label="Recolher documento"
              title="Recolher documento"
              className="mr-8 shrink-0 rounded-md p-1.5 text-osg-600 transition-colors hover:bg-osg-50 hover:text-osg-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss"
            >
              <Minimize2 className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {expandido && preview}
        </DialogContent>
      </Dialog>
    </>
  );
}
