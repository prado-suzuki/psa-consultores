import { Download, Link2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';
import { formatBytes, isPreviavel } from '@/components/equipe/osg/documentos/docMeta';
import { FileIcon } from '@/components/equipe/osg/documentos/organizar/pecasArvore';

/** Um bloco da lista: os documentos de uma categoria da pasta aberta. */
export interface GrupoDeCategoria {
  label: string;
  docs: DocumentoArquivoRow[];
}

interface Props {
  grupos: GrupoDeCategoria[];
  /** Ids marcados para o download em lote. */
  marcados: Set<string>;
  alternarDoc: (id: string) => void;
  /** Marca ou desmarca a categoria inteira, conforme ela já esteja toda marcada. */
  alternarGrupo: (docs: DocumentoArquivoRow[]) => void;
  rotuloDoVinculo: (d: DocumentoArquivoRow) => string;
  nomeDoUploader: (id: string | null) => string;
  acoes: {
    prever: (d: DocumentoArquivoRow) => void;
    renomear: (d: DocumentoArquivoRow) => void;
    vincular: (d: DocumentoArquivoRow) => void;
    baixar: (d: DocumentoArquivoRow) => void;
    excluir: (d: DocumentoArquivoRow) => void;
    excluindo: boolean;
  };
}

/**
 * A lista da pasta aberta, agrupada por categoria, com a caixa de seleção de
 * cada documento.
 *
 * Saiu da fachada `OrganizarDocumentos` quando as caixas chegaram: a fachada
 * estava a 60 linhas do teto de 600, e a lista é justamente a parte que cresce
 * a cada ação nova por documento.
 */
export function ListaDeDocumentos({
  grupos, marcados, alternarDoc, alternarGrupo, rotuloDoVinculo, nomeDoUploader, acoes,
}: Props) {
  return (
    <div className="space-y-3">
      {grupos.map((g) => {
        const noGrupo = g.docs.filter((d) => marcados.has(d.id)).length;
        return (
          <div key={g.label}>
            <div className="flex items-center gap-2 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-osg-700/80">
              <Checkbox
                className="ml-0.5"
                checked={noGrupo === 0 ? false : noGrupo === g.docs.length ? true : 'indeterminate'}
                onCheckedChange={() => alternarGrupo(g.docs)}
                aria-label={`Selecionar os documentos de ${g.label}`}
              />
              <span>{g.label}</span>
              <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-muted-foreground">
                {g.docs.length}
              </span>
            </div>
            <ul className="divide-y divide-osg-100/70">
              {g.docs.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center gap-3 px-2 py-2.5 text-sm data-[marcado=true]:bg-osg-50/60"
                  data-marcado={marcados.has(d.id)}
                >
                  <Checkbox
                    className="ml-0.5"
                    checked={marcados.has(d.id)}
                    onCheckedChange={() => alternarDoc(d.id)}
                    aria-label={`Selecionar ${d.nome_original}`}
                  />
                  <FileIcon nome={d.nome_original} mime={d.mime} />
                  <div className="min-w-0 flex-1">
                    {isPreviavel(d.nome_original, d.mime) ? (
                      <button
                        type="button"
                        onClick={() => acoes.prever(d)}
                        className="block w-full min-w-0 truncate text-left font-medium text-foreground hover:text-osg-700 hover:underline"
                        title="Pré-visualizar"
                      >
                        {d.nome_original}
                      </button>
                    ) : (
                      <p className="truncate font-medium text-foreground">{d.nome_original}</p>
                    )}
                    <p className="truncate text-xs text-muted-foreground">
                      {rotuloDoVinculo(d)} · {formatBytes(d.tamanho)} · enviado por{' '}
                      {nomeDoUploader(d.created_by)} em{' '}
                      {new Date(d.created_at).toLocaleDateString('pt-BR')}{' '}
                      {new Date(d.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => acoes.renomear(d)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Renomear o nome exibido</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => acoes.vincular(d)}>
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Vincular a pessoa, matrícula ou bem</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" onClick={() => acoes.baixar(d)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Baixar o arquivo</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => acoes.excluir(d)}
                        disabled={acoes.excluindo}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Excluir o documento e o arquivo</TooltipContent>
                  </Tooltip>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
