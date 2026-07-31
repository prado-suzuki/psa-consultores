import { ChevronDown, Pencil, Plus, Trash2 } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  findAvailableCatalogDocuments,
  groupOnboardingDocuments,
  ONBOARDING_GROUPS,
  type ConsolidatedOnboardingDocument,
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

export type DisplayDocument = OnboardingDocument | ConsolidatedOnboardingDocument;

interface DocumentGroupsProps {
  documents: DisplayDocument[];
  catalogDocuments: OnboardingDocument[];
  onEdit: (document: DisplayDocument) => void;
  onRemove: (document: DisplayDocument) => void;
  onAddOptional: (document: OnboardingDocument) => void;
}

export function DocumentGroups({
  documents,
  catalogDocuments,
  onEdit,
  onRemove,
  onAddOptional,
}: DocumentGroupsProps) {
  const groupedDocuments = groupOnboardingDocuments(documents);
  const groupedOptional = groupOnboardingDocuments(
    findAvailableCatalogDocuments(catalogDocuments, documents),
  );

  return (
    <Accordion type="multiple" className="space-y-2.5">
      {ONBOARDING_GROUPS.map((group, index) => {
        const Icon = GROUP_ICONS[group];
        const groupDocuments = groupedDocuments[group];
        const optionalDocuments = groupedOptional[group];

        return (
          <AccordionItem
            key={group}
            value={group}
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
                    {group}
                  </span>
                  <span className="block text-xs font-normal text-slate-500">
                    {groupDocuments.length === 0
                      ? 'nenhum documento'
                      : `${groupDocuments.length} ${groupDocuments.length === 1 ? 'documento' : 'documentos'}`}
                  </span>
                </span>
              </span>
            </AccordionTrigger>

            <AccordionContent className="px-3 pb-3 pt-0">
              {groupDocuments.length === 0 && optionalDocuments.length === 0 ? (
                <p className="px-1 py-3 text-xs text-slate-500">
                  Nenhum documento mapeado neste grupo.
                </p>
              ) : (
                <>
                  {groupDocuments.length > 0 && (
                    <>
                      <p className={`px-1 pb-1.5 ${microLabelMutedCls}`}>Obrigatórios</p>
                      <div className="space-y-0.5">
                        {groupDocuments.map((document) => (
                          <div key={document.id} className={documentRowCls}>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-slate-800">
                                {document.title}
                              </p>
                              <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-slate-500">
                                {document.note || document.module || 'Sem orientação adicional.'}
                              </p>
                            </div>
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
                                className="h-8 w-8 text-osg-500/70 hover:bg-osg-red/10 hover:text-osg-red"
                                onClick={() => onRemove(document)}
                                title="Remover desta solicitação"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
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
                                <p className="text-sm text-slate-700">{document.title}</p>
                                {document.note && (
                                  <p className="mt-0.5 line-clamp-2 max-w-3xl text-xs leading-relaxed text-slate-500">
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
