import { Layers3 } from 'lucide-react';
import type { OnboardingProdutoContratado } from '@/hooks/useOnboarding';
import { FILTRO_TODOS } from '@/lib/solicitacao';
import {
  counterPillCls,
  microLabelMutedCls,
  railContainerCls,
  railItemCls,
  riseCls,
  riseDelay,
} from './onboardingKit';

/**
 * O rail que recorta a lista por produto contratado.
 *
 * É LENTE, não gaveta. A solicitação continua sendo uma lista só, organizada
 * pelas 4 gavetas do cliente; o produto entra por cima, calculado pelo vínculo do
 * catálogo. Por isso um documento aparece sob todos os produtos que o pedem, e a
 * soma dos contadores passa do total — o rodapé avisa, porque a conta parece
 * errada sem explicação.
 *
 * Documento criado à mão não pertence a produto nenhum, e por isso aparece apenas
 * na lista consolidada — não há entrada própria para ele no rail.
 */
interface ProdutoRailProps {
  produtos: OnboardingProdutoContratado[];
  selecionado: string;
  total: number;
  /** Quantos itens vêm do catálogo — a base de comparação do rodapé. */
  doCatalogo: number;
  contagemPorProduto: Map<string, number>;
  onSelecionar: (filtro: string) => void;
}

export function ProdutoRail({
  produtos,
  selecionado,
  total,
  doCatalogo,
  contagemPorProduto,
  onSelecionar,
}: ProdutoRailProps) {
  const umDocumentoEmMaisDeUmProduto = [...contagemPorProduto.values()]
    .reduce((soma, quantidade) => soma + quantidade, 0) > doCatalogo;

  return (
    <aside
      className={`${railContainerCls} ${riseCls} p-2.5 xl:sticky xl:top-4 xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto`}
      style={riseDelay(0)}
    >
      <button
        type="button"
        onClick={() => onSelecionar(FILTRO_TODOS)}
        className={railItemCls(selecionado === FILTRO_TODOS, true)}
      >
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-osg-700">
            <Layers3 className="h-4 w-4 shrink-0 text-osg-moss" />
            <span className="truncate">Lista de solicitação consolidada</span>
          </span>
          <span className={counterPillCls}>{total}</span>
        </span>
        <span className="mt-1 block pl-6 text-xs leading-relaxed text-muted-foreground">
          Tudo que foi pedido, incluindo o que foi criado à mão
        </span>
      </button>

      {produtos.length > 0 && (
        <>
          <p className={`px-2.5 pb-1 pt-4 ${microLabelMutedCls}`}>Produtos contratados</p>
          <div className="space-y-0.5">
            {produtos.map((produto) => (
              <button
                key={produto.id}
                type="button"
                onClick={() => onSelecionar(produto.id)}
                className={`${railItemCls(selecionado === produto.id)} flex items-center justify-between gap-2`}
                title={produto.name}
              >
                <span className="min-w-0 text-sm font-medium leading-snug text-foreground">
                  {produto.name}
                </span>
                <span className={counterPillCls}>{contagemPorProduto.get(produto.id) ?? 0}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {umDocumentoEmMaisDeUmProduto && (
        <p className="mt-3 border-t border-osg-100 px-2.5 pt-2.5 text-[11px] leading-relaxed text-muted-foreground">
          Um documento pode ser pedido por mais de um produto — por isso a soma dos
          contadores passa do total.
        </p>
      )}
    </aside>
  );
}
