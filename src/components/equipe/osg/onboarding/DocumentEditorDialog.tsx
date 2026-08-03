import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { fieldCls, labelCls, textareaCls } from '@/components/equipe/osg/formKit';
import {
  getOnboardingGroup,
  getOnboardingGroupDefaults,
  ONBOARDING_GROUPS,
  type OnboardingGroup,
  type OnboardingDocument,
  type OnboardingDocumentCategory,
  type OnboardingProduct,
} from '@/lib/onboarding';

export interface DocumentEditorValue {
  catalogId?: string;
  code?: string;
  title: string;
  entity: string;
  module: string;
  note: string;
  required: boolean;
  category: OnboardingDocumentCategory | null;
  docboxCategory: string | null;
  confidential: boolean;
  targetProductId?: string;
}

interface DocumentEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  document?: OnboardingDocument;
  catalogDocuments: OnboardingDocument[];
  selectedProducts: OnboardingProduct[];
  defaultProductId?: string;
  onSave: (value: DocumentEditorValue) => void;
}

const NEW_DOCUMENT = '__new__';

const emptyValue = (
  group: OnboardingGroup,
  targetProductId?: string,
): DocumentEditorValue => {
  const defaults = getOnboardingGroupDefaults(group);
  return {
    title: '',
    entity: defaults.entity,
    module: defaults.module,
    note: '',
    required: false,
    category: null,
    docboxCategory: null,
    confidential: false,
    targetProductId,
  };
};

/** Campo no padrão dos modais OSG: rótulo miúdo + controle com foco verde-musgo. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className={labelCls}>{label}</Label>
      {children}
    </div>
  );
}

export function DocumentEditorDialog({
  open,
  onOpenChange,
  mode,
  document,
  catalogDocuments,
  selectedProducts,
  defaultProductId,
  onSave,
}: DocumentEditorDialogProps) {
  const [value, setValue] = useState<DocumentEditorValue>(
    () => emptyValue('Outros documentos', defaultProductId),
  );
  const [documentChoice, setDocumentChoice] = useState(NEW_DOCUMENT);

  useEffect(() => {
    if (!open) return;
    setDocumentChoice(NEW_DOCUMENT);
    setValue(document
      ? {
        catalogId: document.catalogId,
        code: document.code,
        title: document.title,
        entity: document.entity,
        module: document.module,
        note: document.note,
        required: document.required,
        category: document.category,
        docboxCategory: document.docboxCategory,
        confidential: document.confidential,
      }
      : emptyValue('Outros documentos', defaultProductId));
  }, [defaultProductId, document, open]);

  const group = getOnboardingGroup(value.entity);
  const groupCatalogDocuments = useMemo(
    () => catalogDocuments.filter((item) => getOnboardingGroup(item.entity) === group),
    [catalogDocuments, group],
  );

  const changeGroup = (nextGroup: OnboardingGroup) => {
    setDocumentChoice(NEW_DOCUMENT);
    setValue((current) => emptyValue(nextGroup, current.targetProductId));
  };

  const chooseDocument = (choice: string) => {
    setDocumentChoice(choice);
    if (choice === NEW_DOCUMENT) {
      setValue((current) => ({
        ...emptyValue(getOnboardingGroup(current.entity), current.targetProductId),
      }));
      return;
    }

    const catalogDocument = catalogDocuments.find((item) => item.catalogId === choice);
    if (!catalogDocument) return;
    setValue((current) => ({
      catalogId: catalogDocument.catalogId,
      code: catalogDocument.code,
      title: catalogDocument.title,
      entity: catalogDocument.entity,
      module: catalogDocument.module,
      note: catalogDocument.note,
      required: catalogDocument.required,
      category: catalogDocument.category,
      docboxCategory: catalogDocument.docboxCategory,
      confidential: catalogDocument.confidential,
      targetProductId: current.targetProductId,
    }));
  };

  const isNewDocument = documentChoice === NEW_DOCUMENT;
  const canSave = value.title.trim().length > 0
    && value.module.trim().length > 0
    && (mode === 'edit' || Boolean(value.targetProductId));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Adicionar documento' : 'Editar documento'}</DialogTitle>
          <DialogDescription>
            {mode === 'add'
              ? 'Escolha um documento do catálogo ou crie um novo. Vale apenas para esta solicitação.'
              : 'Ajuste o nome e a orientação ao cliente. Vale apenas para esta solicitação.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {mode === 'add' && (
            <>
              <Field label="Produto de destino">
                <Select
                  value={value.targetProductId ?? ''}
                  onValueChange={(targetProductId) => setValue((current) => ({
                    ...current,
                    targetProductId,
                  }))}
                >
                  <SelectTrigger className={fieldCls}>
                    <SelectValue placeholder="Selecione o produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProducts.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Grupo">
                <Select
                  value={group}
                  onValueChange={(nextGroup) => changeGroup(nextGroup as OnboardingGroup)}
                >
                  <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ONBOARDING_GROUPS.map((item) => (
                      <SelectItem key={item} value={item}>{item}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>

              <Field label="Documento">
                <Select value={documentChoice} onValueChange={chooseDocument}>
                  <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NEW_DOCUMENT}>Novo documento</SelectItem>
                    {groupCatalogDocuments.map((item) => (
                      <SelectItem key={item.catalogId ?? item.id} value={item.catalogId ?? item.id}>
                        {item.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}

          {(isNewDocument || mode === 'edit') && (
            <Field label="Nome do documento">
              <Input
                value={value.title}
                onChange={(event) => setValue((current) => ({
                  ...current,
                  title: event.target.value,
                }))}
                placeholder="Ex.: Certidão de casamento atualizada"
                className={fieldCls}
              />
            </Field>
          )}

          <Field label="Orientação ao cliente">
            <Textarea
              value={value.note}
              onChange={(event) => setValue((current) => ({
                ...current,
                note: event.target.value,
              }))}
              placeholder="Explique o que o cliente deve enviar"
              className={`min-h-[60px] ${textareaCls}`}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            disabled={!canSave}
            onClick={() => {
              onSave({ ...value, title: value.title.trim(), module: value.module.trim() });
              onOpenChange(false);
            }}
          >
            {mode === 'add' ? 'Adicionar' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
