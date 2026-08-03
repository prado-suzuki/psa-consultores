import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Layers3, PackageOpen, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  buildDocumentsByProduct,
  consolidateDocuments,
  SOLICITACAO_BUCKET,
  type ConsolidatedOnboardingDocument,
  type DocumentsByProduct,
  type OnboardingDocument,
} from '@/lib/onboarding';
import type { OnboardingCatalogData } from '@/hooks/useOnboarding';
import {
  DocumentEditorDialog,
  type DocumentEditorValue,
} from './DocumentEditorDialog';
import { DocumentGroups, type DisplayDocument } from './DocumentGroups';
import { OnboardingEmptyState } from './OnboardingEmptyState';
import {
  counterPillCls,
  microLabelMutedCls,
  panelContainerCls,
  railContainerCls,
  railItemCls,
  riseCls,
  riseDelay,
} from './onboardingKit';

interface OnboardingWorkspaceProps {
  data: OnboardingCatalogData;
  onDraftChange: (draft: OnboardingDraft) => void;
}

export interface OnboardingDraft {
  documents: ConsolidatedOnboardingDocument[];
  selectedProductIds: string[];
}

interface EditorState {
  open: boolean;
  mode: 'add' | 'edit';
  document?: DisplayDocument;
}

function isConsolidated(
  document: DisplayDocument,
): document is ConsolidatedOnboardingDocument {
  return 'productIds' in document;
}

export function OnboardingWorkspace({ data, onDraftChange }: OnboardingWorkspaceProps) {
  const contractedProducts = useMemo(
    () => data.products.filter((product) => product.contracted),
    [data.products],
  );
  const contractedProductIds = useMemo(
    () => contractedProducts.map((product) => product.id),
    [contractedProducts],
  );
  const [documentsByProduct, setDocumentsByProduct] = useState<DocumentsByProduct>(() => ({
    ...buildDocumentsByProduct(data.products.filter((product) => product.contracted)),
    [SOLICITACAO_BUCKET]: [],
  }));
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [editor, setEditor] = useState<EditorState>({ open: false, mode: 'add' });

  const consolidatedDocuments = useMemo(
    () => consolidateDocuments(documentsByProduct, [
      ...contractedProductIds,
      SOLICITACAO_BUCKET,
    ]),
    [documentsByProduct, contractedProductIds],
  );
  const activeProduct = contractedProducts.find((product) => product.id === activeProductId);
  const activeDocuments: DisplayDocument[] = activeProductId
    ? documentsByProduct[activeProductId] ?? []
    : consolidatedDocuments;

  useEffect(() => {
    onDraftChange({
      documents: consolidatedDocuments,
      selectedProductIds: contractedProductIds,
    });
  }, [consolidatedDocuments, onDraftChange, contractedProductIds]);

  const pushDocument = (targetKey: string, document: OnboardingDocument) => {
    setDocumentsByProduct((current) => ({
      ...current,
      [targetKey]: [...(current[targetKey] ?? []), document],
    }));
  };

  const addDocument = (value: DocumentEditorValue) => {
    if (!value.targetProductId) return;
    const targetDocuments = documentsByProduct[value.targetProductId] ?? [];
    if (
      value.catalogId
      && targetDocuments.some((document) => document.catalogId === value.catalogId)
    ) {
      toast.info('Este documento já está incluído no produto selecionado');
      return;
    }

    pushDocument(value.targetProductId, {
      id: crypto.randomUUID(),
      catalogId: value.catalogId,
      code: value.code,
      title: value.title,
      entity: value.entity,
      module: value.module,
      note: value.note,
      required: value.required,
      category: value.category,
      docboxCategory: value.docboxCategory,
      confidential: value.confidential,
      productId: value.targetProductId,
    });
    toast.success('Documento adicionado à solicitação');
  };

  /** Inclusão em um clique a partir da lista de opcionais do grupo. */
  const addOptionalDocument = (catalogDocument: OnboardingDocument) => {
    const targetKey = activeProductId ?? SOLICITACAO_BUCKET;
    pushDocument(targetKey, {
      ...catalogDocument,
      id: crypto.randomUUID(),
      required: false,
      productId: targetKey,
    });
    toast.success(`"${catalogDocument.title}" incluído na solicitação`);
  };

  const editDocument = (source: DisplayDocument, value: DocumentEditorValue) => {
    setDocumentsByProduct((current) => {
      const next = { ...current };
      const productIds = isConsolidated(source) ? source.productIds : [source.productId];
      const sourceIds = isConsolidated(source) ? source.sourceDocumentIds : [source.id];

      productIds.forEach((productId, index) => {
        next[productId] = (current[productId] ?? []).map((document) =>
          document.id === sourceIds[index]
            ? {
              ...document,
              catalogId: value.catalogId,
              code: value.code,
              title: value.title,
              entity: value.entity,
              module: value.module,
              note: value.note,
              required: value.required,
              category: value.category,
              docboxCategory: value.docboxCategory,
              confidential: value.confidential,
            }
            : document);
      });
      return next;
    });
    toast.success('Documento atualizado na solicitação');
  };

  const removeDocument = (source: DisplayDocument) => {
    setDocumentsByProduct((current) => {
      const next = { ...current };
      const productIds = isConsolidated(source) ? source.productIds : [source.productId];
      const sourceIds = isConsolidated(source) ? source.sourceDocumentIds : [source.id];

      productIds.forEach((productId, index) => {
        next[productId] = (current[productId] ?? []).filter(
          (document) => document.id !== sourceIds[index],
        );
      });
      return next;
    });
    toast.success('Documento removido da solicitação');
  };

  const saveEditor = (value: DocumentEditorValue) => {
    if (editor.mode === 'add') addDocument(value);
    else if (editor.document) editDocument(editor.document, value);
  };

  if (contractedProducts.length === 0) {
    return (
      <OnboardingEmptyState icon={PackageOpen} title="Nenhum produto OSG contratado">
        Este cliente não possui produtos da OSG contratados. Contrate os produtos para que a
        solicitação inicial seja montada automaticamente.
      </OnboardingEmptyState>
    );
  }

  return (
    <>
      <div className="grid items-start gap-4 xl:grid-cols-[290px_minmax(0,1fr)]">
        <aside
          className={`${railContainerCls} ${riseCls} p-2.5 xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto`}
          style={riseDelay(0)}
        >
          <button
            type="button"
            onClick={() => setActiveProductId(null)}
            className={railItemCls(activeProductId === null, true)}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-osg-700">
                <Layers3 className="h-4 w-4 shrink-0 text-osg-moss" />
                <span className="truncate">Solicitação consolidada</span>
              </span>
              <span className={counterPillCls}>{consolidatedDocuments.length}</span>
            </span>
            <span className="mt-1 block pl-6 text-xs leading-relaxed text-slate-500">
              Lista geral de documentos
            </span>
          </button>

          <p className={`px-2.5 pb-1 pt-4 ${microLabelMutedCls}`}>Produtos contratados</p>

          <div className="space-y-0.5">
            {contractedProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => setActiveProductId(product.id)}
                className={`${railItemCls(activeProductId === product.id)} flex items-center justify-between gap-2`}
              >
                <span className="min-w-0 text-sm font-medium leading-snug text-slate-700">
                  {product.name}
                </span>
                <span className={counterPillCls}>
                  {(documentsByProduct[product.id] ?? []).length}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section
          className={`${panelContainerCls} ${riseCls} min-h-[570px] min-w-0 p-3 sm:p-4`}
          style={riseDelay(1)}
        >
          <div className="mb-3 flex flex-col justify-between gap-3 px-1 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold text-osg-700">
                {activeProduct ? activeProduct.name : 'Solicitação consolidada'}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {activeDocuments.length} {activeDocuments.length === 1 ? 'documento' : 'documentos'}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => setEditor({ open: true, mode: 'add' })}
            >
              <Plus className="h-4 w-4" />
              Adicionar documento
            </Button>
          </div>

          <p className="mb-3 flex items-start gap-2 px-1 text-xs leading-relaxed text-slate-500">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-osg-500/60" />
            <span>
              Alterações aqui valem <strong className="font-semibold text-osg-700">apenas
              para esta solicitação</strong> — o catálogo de documentos não muda. Nada é salvo
              até você enviar.
            </span>
          </p>

          <DocumentGroups
            documents={activeDocuments}
            catalogDocuments={data.catalogDocuments}
            onEdit={(document) => setEditor({ open: true, mode: 'edit', document })}
            onRemove={removeDocument}
            onAddOptional={addOptionalDocument}
          />
        </section>
      </div>

      <DocumentEditorDialog
        open={editor.open}
        onOpenChange={(open) => setEditor((current) => ({ ...current, open }))}
        mode={editor.mode}
        document={editor.document}
        catalogDocuments={data.catalogDocuments}
        selectedProducts={contractedProducts}
        defaultProductId={activeProductId ?? undefined}
        onSave={saveEditor}
      />
    </>
  );
}
