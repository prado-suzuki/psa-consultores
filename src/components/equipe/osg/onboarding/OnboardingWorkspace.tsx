import { useMemo, useState } from 'react';
import { CheckCircle2, EyeOff, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { OnboardingDocument } from '@/lib/onboarding';
import type { OnboardingProdutoContratado } from '@/hooks/useOnboarding';
import {
  contarPorProduto,
  filtrarPorProduto,
  FILTRO_MANUAIS,
  FILTRO_TODOS,
  type CatalogoDocumento,
  type EdicaoItem,
  type EstruturaDoItem,
  type ItemSolicitacao,
  type NovoItemManual,
  type ProdutosPorDocumento,
} from '@/lib/solicitacao';
import { ProdutoRail } from './ProdutoRail';
import {
  DocumentEditorDialog,
  type DocumentEditorValue,
} from './DocumentEditorDialog';
import { DocumentGroups, type DisplayDocument } from './DocumentGroups';
import {
  chipCls,
  panelContainerCls,
  riseCls,
  riseDelay,
} from './onboardingKit';

interface OnboardingWorkspaceProps {
  /** Itens ATIVOS da solicitação, já resolvidos e ordenados pelo hook. */
  itens: ItemSolicitacao[];
  /** Os dispensados: fora da lista, mas alcançáveis pelo chip do resumo. */
  dispensados: ItemSolicitacao[];
  /** Catálogo em forma de exibição, para a lista de opcionais de cada grupo. */
  catalogDocuments: OnboardingDocument[];
  /** Catálogo em forma de gravação, indexado por id. */
  catalogoPorId: Map<string, CatalogoDocumento>;
  produtosContratados: OnboardingProdutoContratado[];
  /** Documento do catálogo → produtos da OS que o pedem, para o recorte do rail. */
  produtosPorDocumento: ProdutosPorDocumento;
  /**
   * Solicitação encerrada: a lista fica só para consulta.
   *
   * Esconde as ações em vez de desabilitá-las — com dezenas de documentos, dois
   * controles cinzas por linha viram ruído. Quem explica o porquê é a faixa no
   * topo da página.
   */
  somenteLeitura?: boolean;
  onAdicionarDoCatalogo: (catalogo: CatalogoDocumento, estrutura?: EstruturaDoItem) => void;
  onAdicionarManual: (entrada: NovoItemManual) => void;
  onEditar: (id: string, edicao: EdicaoItem) => void;
  onDispensar: (id: string) => void;
}

interface EditorState {
  open: boolean;
  mode: 'add' | 'edit';
  item?: ItemSolicitacao;
}

/** Quantos dispensados a dica lista antes de resumir o resto. */
const LIMITE_DISPENSADOS_NA_DICA = 10;

/**
 * O item da solicitação na forma que o accordion mostra.
 *
 * É conversão de vista, não remendo: o accordion agrupa pela coluna `grupo`, a
 * mesma que a área do cliente usa, e nenhum campo é inventado para preencher
 * formato — o adaptador com `entity` e campos de enfeite morreu com a ALE-29.
 */
function paraExibicao(item: ItemSolicitacao): DisplayDocument {
  return {
    id: item.id,
    catalogId: item.itemPadraoId ?? undefined,
    code: item.codigo ?? undefined,
    title: item.documento,
    note: item.nota ?? '',
    grupo: item.grupo,
    granularidade: item.granularidade,
  };
}

export function OnboardingWorkspace({
  itens,
  dispensados,
  catalogDocuments,
  catalogoPorId,
  produtosContratados,
  produtosPorDocumento,
  somenteLeitura = false,
  onAdicionarDoCatalogo,
  onAdicionarManual,
  onEditar,
  onDispensar,
}: OnboardingWorkspaceProps) {
  const [editor, setEditor] = useState<EditorState>({ open: false, mode: 'add' });
  const [filtro, setFiltro] = useState<string>(FILTRO_TODOS);

  const porId = useMemo(() => new Map(itens.map((item) => [item.id, item])), [itens]);
  const idsJaPedidos = useMemo(
    () => new Set(itens.flatMap((item) => (item.itemPadraoId ? [item.itemPadraoId] : []))),
    [itens],
  );
  const catalogo = useMemo(() => [...catalogoPorId.values()], [catalogoPorId]);

  const itensFiltrados = useMemo(
    () => filtrarPorProduto(itens, filtro, produtosPorDocumento),
    [itens, filtro, produtosPorDocumento],
  );
  const exibidos = useMemo(() => itensFiltrados.map(paraExibicao), [itensFiltrados]);
  const contagemPorProduto = useMemo(
    () => contarPorProduto(itens, produtosPorDocumento),
    [itens, produtosPorDocumento],
  );
  const manuais = useMemo(
    () => itens.filter((item) => !item.doCatalogo).length,
    [itens],
  );

  /**
   * Com um produto selecionado, o modal oferece só o catálogo daquele produto.
   *
   * A seleção influencia o que é OFERECIDO, nunca o que é gravado — é essa
   * distinção que dispensa coluna de produto na tabela.
   */
  const documentosDoProduto = useMemo(() => {
    if (filtro === FILTRO_TODOS || filtro === FILTRO_MANUAIS) return undefined;
    const ids = new Set<string>();
    produtosPorDocumento.forEach((produtos, documentoId) => {
      if (produtos.includes(filtro)) ids.add(documentoId);
    });
    return ids;
  }, [filtro, produtosPorDocumento]);

  const comRail = produtosContratados.length > 0 || manuais > 0;

  const salvarEditor = (value: DocumentEditorValue) => {
    const estrutura = { grupo: value.grupo, granularidade: value.granularidade };

    if (editor.mode === 'edit') {
      if (!editor.item) return;
      onEditar(editor.item.id, { documento: value.documento, nota: value.nota, ...estrutura });
      return;
    }

    if (value.catalogId) {
      const doCatalogo = catalogoPorId.get(value.catalogId);
      // A estrutura vai junto: se o analista trocou a gaveta sugerida, é a dele
      // que valeu, não a do catálogo.
      if (doCatalogo) onAdicionarDoCatalogo(doCatalogo, estrutura);
      return;
    }

    onAdicionarManual({ documento: value.documento, nota: value.nota, ...estrutura });
    // Documento criado à mão não pertence a produto: com um filtro de produto
    // ligado, ele cairia fora da vista e pareceria perdido. A seleção volta para
    // "Todos" para o analista ver onde ele entrou.
    setFiltro(FILTRO_TODOS);
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
      <div className={comRail ? 'grid items-start gap-4 xl:grid-cols-[290px_minmax(0,1fr)]' : ''}>
        {comRail && (
          <ProdutoRail
            produtos={produtosContratados}
            selecionado={filtro}
            total={itens.length}
            manuais={manuais}
            contagemPorProduto={contagemPorProduto}
            onSelecionar={setFiltro}
          />
        )}

        <section
          className={`${panelContainerCls} ${riseCls} min-h-[570px] min-w-0 p-3 sm:p-4`}
          style={riseDelay(1)}
        >
        <div className="mb-3 flex flex-col justify-between gap-3 px-1 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-osg-700">
              Documentos solicitados
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              <span>
                {itensFiltrados.length}
                {' '}
                {itensFiltrados.length === 1 ? 'documento' : 'documentos'}
                {itensFiltrados.length !== itens.length && ` de ${itens.length}`}
              </span>

              {dispensados.length > 0 && (
                <Tooltip>
                  <TooltipTrigger className={chipCls}>
                    <EyeOff className="h-3 w-3" />
                    {dispensados.length} dispensado{dispensados.length === 1 ? '' : 's'}
                  </TooltipTrigger>
                  {/* Só leitura: serve para o analista saber o que ficou de fora. */}
                  <TooltipContent align="start" className="max-w-xs">
                    <p className="mb-1 font-semibold">Fora desta solicitação</p>
                    <ul className="space-y-0.5">
                      {dispensados.slice(0, LIMITE_DISPENSADOS_NA_DICA).map((item) => (
                        <li key={item.id}>{item.documento}</li>
                      ))}
                    </ul>
                    {dispensados.length > LIMITE_DISPENSADOS_NA_DICA && (
                      <p className="mt-1 opacity-80">
                        e mais {dispensados.length - LIMITE_DISPENSADOS_NA_DICA}
                      </p>
                    )}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Os chips de produto saíram: viraram o rail, que além de nomear
                  também filtra e conta. */}
            </div>
          </div>
          {!somenteLeitura && (
            <Button
              size="sm"
              variant="outline"
              className="shrink-0"
              onClick={() => setEditor({ open: true, mode: 'add' })}
            >
              <Plus className="h-4 w-4" />
              Adicionar documento
            </Button>
          )}
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
            somenteLeitura={somenteLeitura}
            onEdit={abrirEdicao}
            onRemove={(documento) => onDispensar(documento.id)}
            onAddOptional={incluirOpcional}
          />
        </section>
      </div>

      <DocumentEditorDialog
        open={editor.open}
        onOpenChange={(open) => setEditor((atual) => ({ ...atual, open }))}
        mode={editor.mode}
        item={editor.item}
        catalogo={catalogo}
        idsJaPedidos={idsJaPedidos}
        documentosDoProduto={documentosDoProduto}
        onSave={salvarEditor}
      />
    </>
  );
}
