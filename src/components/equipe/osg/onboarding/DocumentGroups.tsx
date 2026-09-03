import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { GRUPOS_DOCUMENTO } from '@/lib/agrupadorDocumentos';
import {
  findAvailableCatalogDocuments,
  groupOnboardingDocuments,
  type OnboardingDocument,
} from '@/lib/onboarding';
import {
  counterPillCls,
  documentRowCls,
  groupCardCls,
  GROUP_ICONS,
  iconTileCls,
  microLabelMutedCls,
  riseCls,
  riseDelay,
  rowActionsCls,
} from './onboardingKit';

/**
 * A linha que o accordion mostra.
 *
 * Deixou de ser união com o tipo consolidado na ALE-28: não existe mais
 * consolidação por produto — a lista vem de `solicitacao_item`, uma linha por
 * documento pedido.
 */
export type DisplayDocument = OnboardingDocument;

interface DocumentGroupsProps {
  documents: DisplayDocument[];
  catalogDocuments: OnboardingDocument[];
  /** Solicitação encerrada: some com as ações de linha e com os opcionais. */
  somenteLeitura?: boolean;
  /** A gaveta aberta — string vazia quando todas estão fechadas. */
  grupoAberto: string;
  onGrupoAberto: (grupo: string) => void;
  onEdit: (document: DisplayDocument) => void;
  onRemove: (document: DisplayDocument) => void;
  onAddOptional: (document: OnboardingDocument) => void;
}

export function DocumentGroups({
  documents,
  catalogDocuments,
  somenteLeitura = false,
  grupoAberto,
  onGrupoAberto,
  onEdit,
  onRemove,
  onAddOptional,
}: DocumentGroupsProps) {
  const groupedDocuments = groupOnboardingDocuments(documents);
  const groupedOptional = groupOnboardingDocuments(
    somenteLeitura ? [] : findAvailableCatalogDocuments(catalogDocuments, documents),
  );

  return (
    /**
     * Uma gaveta por vez, e a aberta é estado de quem chama.
     *
     * `single` porque com as quatro abertas a lista passava de 60 linhas e o
     * analista perdia de vista em que gaveta estava — e é essa gaveta que o
     * "Adicionar documento" usa para abrir o modal já no lugar certo.
     *
     * `collapsible` mantém o clique na gaveta aberta fechando ela, em vez de
     * travar sempre uma aberta.
     */
    <Accordion
      type="single"
      collapsible
      value={grupoAberto}
      onValueChange={onGrupoAberto}
      className="space-y-2.5"
    >
      {GRUPOS_DOCUMENTO.map((grupo, index) => {
        const Icon = GROUP_ICONS[grupo.key];
        const groupDocuments = groupedDocuments[grupo.key];
        const optionalDocuments = groupedOptional[grupo.key];

        return (
          <AccordionItem
            key={grupo.key}
            value={grupo.key}
            className={`${groupCardCls} ${riseCls}`}
            style={riseDelay(index)}
          >
            <AccordionTrigger className="gap-3 px-4 py-3 text-osg-500/70 hover:no-underline">
              <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
                <span className={iconTileCls}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-osg-700">
                    {grupo.titulo}
                  </span>
                  <span className="block text-xs font-normal text-muted-foreground">
                    {groupDocuments.length === 0
                      ? 'nenhum documento'
                      : `${groupDocuments.length} ${groupDocuments.length === 1 ? 'documento' : 'documentos'}`}
                  </span>
                </span>
              </span>
            </AccordionTrigger>

            <AccordionContent className="px-3 pb-3 pt-0">
              {groupDocuments.length === 0 && optionalDocuments.length === 0 ? (
                <p className="px-1 py-3 text-xs text-muted-foreground">
                  Nenhum documento mapeado neste grupo.
                </p>
              ) : (
                <>
                  {groupDocuments.length > 0 && (
                    <>
                      <p className={`px-1 pb-1.5 ${microLabelMutedCls}`}>Solicitados</p>
                      <div className="space-y-0.5">
                        {groupDocuments.map((document) => (
                          <div key={document.id} className={documentRowCls}>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-foreground">
                                {document.title}
                              </p>
                              <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                                {document.note || 'Sem orientação adicional.'}
                              </p>
                            </div>
                            {!somenteLeitura && (
                              <div className={rowActionsCls}>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-osg-500/70 hover:bg-white hover:text-osg-moss"
                                  onClick={() => onEdit(document)}
                                  title="Editar nesta solicitação"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-osg-500/70 hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() => onRemove(document)}
                                  title="Remover desta solicitação"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {optionalDocuments.length > 0 && (
                    <Collapsible className="mt-2 overflow-hidden rounded-lg border border-osg-100 bg-osg-50/50">
                      <CollapsibleTrigger className="group/opt flex w-full items-center gap-2 px-2 py-2.5 text-left transition-colors hover:bg-osg-50">
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-osg-500/70 transition-transform duration-200 group-data-[state=open]/opt:rotate-180" />
                        <span className={microLabelMutedCls}>Opcionais</span>
                        <span className={counterPillCls}>{optionalDocuments.length}</span>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="space-y-0.5 border-t border-osg-100 px-1.5 py-1.5">
                          {optionalDocuments.map((document) => (
                            <div
                              key={document.id}
                              className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-white"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-foreground">{document.title}</p>
                                {document.note && (
                                  <p className="mt-0.5 line-clamp-2 max-w-3xl text-xs leading-relaxed text-muted-foreground">
                                    {document.note}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 shrink-0 gap-1 border-osg-200/80 bg-white px-2 text-xs text-osg-700 hover:border-osg-moss/40 hover:bg-osg-moss/[0.07] hover:text-osg-moss"
                                onClick={() => onAddOptional(document)}
                                title="Incluir nesta solicitação"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                Incluir
                              </Button>
                            </div>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </>
              )}
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
