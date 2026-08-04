import { useMemo, useState } from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { OnboardingDocument } from '@/lib/onboarding';
import type { OnboardingProdutoContratado } from '@/hooks/useOnboarding';
import {
  grupoSugeridoParaGranularidade,
  type CatalogoDocumento,
  type EdicaoItem,
  type ItemSolicitacao,
  type NovoItemManual,
} from '@/lib/solicitacao';
import {
  DocumentEditorDialog,
  type DocumentEditorValue,
} from './DocumentEditorDialog';
import { DocumentGroups, type DisplayDocument } from './DocumentGroups';
import {
  panelContainerCls,
  riseCls,
  riseDelay,
} from './onboardingKit';

interface OnboardingWorkspaceProps {
  /** Itens ATIVOS da solicitação, já resolvidos e ordenados pelo hook. */
  itens: ItemSolicitacao[];
  /** Quantos foram dispensados — o rastro que não aparece na lista. */
  dispensados: number;
  /** Catálogo em forma de exibição, para a lista de opcionais de cada grupo. */
  catalogDocuments: OnboardingDocument[];
  /** Catálogo em forma de gravação, indexado por id. */
  catalogoPorId: Map<string, CatalogoDocumento>;
  produtosContratados: OnboardingProdutoContratado[];
  onAdicionarDoCatalogo: (catalogo: CatalogoDocumento) => void;
  onAdicionarManual: (entrada: NovoItemManual) => void;
  onEditar: (id: string, edicao: EdicaoItem) => void;
  onDispensar: (id: string) => void;
}

interface EditorState {
  open: boolean;
  mode: 'add' | 'edit';
  item?: ItemSolicitacao;
}

/**
 * Adapta o item da solicitação para o formato que o accordion ainda consome.
 *
 * Cola temporária e de vida curta: a ALE-29 reescreve `DocumentGroups` para
 * agrupar pela coluna `grupo`, com os nomes de `GRUPOS_DOCUMENTO` (depois que a
 * EDU-26 fechar a grafia da terceira chave). Até lá o accordion segue agrupando
 * pelo texto de `entidade`, que é o comportamento que já estava no ar — nenhum
 * vocabulário novo de grupo nasce aqui.
 */
function paraExibicao(item: ItemSolicitacao): DisplayDocument {
  return {
    id: item.id,
    catalogId: item.itemPadraoId ?? undefined,
    code: item.codigo ?? undefined,
    title: item.documento,
    entity: item.entidade,
    module: '',
    note: item.nota ?? '',
    required: false,
    category: null,
    docboxCategory: null,
    confidential: item.confidencial,
    productId: '',
  };
}

export function OnboardingWorkspace({
  itens,
  dispensados,
  catalogDocuments,
  catalogoPorId,
  produtosContratados,
  onAdicionarDoCatalogo,
  onAdicionarManual,
  onEditar,
  onDispensar,
}: OnboardingWorkspaceProps) {
  const [editor, setEditor] = useState<EditorState>({ open: false, mode: 'add' });

  const porId = useMemo(() => new Map(itens.map((item) => [item.id, item])), [itens]);
  const exibidos = useMemo(() => itens.map(paraExibicao), [itens]);
  const idsJaPedidos = useMemo(
    () => new Set(itens.flatMap((item) => (item.itemPadraoId ? [item.itemPadraoId] : []))),
    [itens],
  );
  const catalogo = useMemo(() => [...catalogoPorId.values()], [catalogoPorId]);

  const salvarEditor = (value: DocumentEditorValue) => {
    if (editor.mode === 'edit') {
      if (!editor.item) return;
      onEditar(editor.item.id, { documento: value.documento, nota: value.nota });
      return;
    }

    if (value.catalogId) {
      const doCatalogo = catalogoPorId.get(value.catalogId);
      if (doCatalogo) onAdicionarDoCatalogo(doCatalogo);
      return;
    }

    onAdicionarManual({
      documento: value.documento,
      granularidade: value.granularidade,
      // A gaveta vem da sugestão do grão. Torná-la editável é a ALE-29, que é
      // onde os 4 grupos ganham nome (EDU-26).
      grupo: grupoSugeridoParaGranularidade(value.granularidade),
      nota: value.nota,
    });
  };

  const incluirOpcional = (documento: OnboardingDocument) => {
    const doCatalogo = documento.catalogId
      ? catalogoPorId.get(documento.catalogId)
      : undefined;
    if (doCatalogo) onAdicionarDoCatalogo(doCatalogo);
  };

  const abrirEdicao = (documento: DisplayDocument) => {
    const item = porId.get(documento.id);
    if (item) setEditor({ open: true, mode: 'edit', item });
  };

  return (
    <>
      <section
        className={`${panelContainerCls} ${riseCls} min-h-[570px] min-w-0 p-3 sm:p-4`}
        style={riseDelay(0)}
      >
        <div className="mb-3 flex flex-col justify-between gap-3 px-1 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-osg-700">
              Documentos solicitados
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>{itens.length} {itens.length === 1 ? 'documento' : 'documentos'}</span>
              {dispensados > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span>{dispensados} dispensado{dispensados === 1 ? '' : 's'}</span>
                </>
              )}
              {produtosContratados.length > 0 && (
                <>
                  <span aria-hidden>·</span>
                  <span className="truncate">
                    {produtosContratados.map((produto) => produto.code).join(', ')}
                  </span>
                </>
              )}
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
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-osg-moss/70" />
          <span>
            Cada alteração é <strong className="font-semibold text-osg-700">salva na
            hora</strong> e vale apenas para esta solicitação — o catálogo de documentos
            não muda. O cliente só vê a lista depois que ela for enviada.
          </span>
        </p>

        {itens.length === 0 && (
          <p className="mb-2 rounded-lg bg-osg-50/60 px-3 py-2.5 text-xs leading-relaxed text-slate-600">
            A solicitação está vazia. Gere a lista a partir da OS pelo botão no topo, ou
            inclua documentos um a um.
          </p>
        )}

        <DocumentGroups
          documents={exibidos}
          catalogDocuments={catalogDocuments}
          onEdit={abrirEdicao}
          onRemove={(documento) => onDispensar(documento.id)}
          onAddOptional={incluirOpcional}
        />
      </section>

      <DocumentEditorDialog
        open={editor.open}
        onOpenChange={(open) => setEditor((atual) => ({ ...atual, open }))}
        mode={editor.mode}
        item={editor.item}
        catalogo={catalogo}
        idsJaPedidos={idsJaPedidos}
        onSave={salvarEditor}
      />
    </>
  );
}
