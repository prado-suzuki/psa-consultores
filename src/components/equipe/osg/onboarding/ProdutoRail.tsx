import { Layers3, PenLine } from 'lucide-react';
import type { OnboardingProdutoContratado } from '@/hooks/useOnboarding';
import { FILTRO_MANUAIS, FILTRO_TODOS } from '@/lib/solicitacao';
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
 * "Incluídos à mão" existe porque documento criado pelo analista não pertence a
 * produto nenhum: sem essa entrada, ele sumiria ao filtrar e pareceria perdido.
 */
interface ProdutoRailProps {
  produtos: OnboardingProdutoContratado[];
  selecionado: string;
  total: number;
  manuais: number;
  contagemPorProduto: Map<string, number>;
  onSelecionar: (filtro: string) => void;
}

export function ProdutoRail({
  produtos,
  selecionado,
  total,
  manuais,
  contagemPorProduto,
  onSelecionar,
}: ProdutoRailProps) {
  const umDocumentoEmMaisDeUmProduto = [...contagemPorProduto.values()]
    .reduce((soma, quantidade) => soma + quantidade, 0) > total - manuais;

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
            <span className="truncate">Todos os documentos</span>
          </span>
          <span className={counterPillCls}>{total}</span>
        </span>
        <span className="mt-1 block pl-6 text-xs leading-relaxed text-slate-500">
          A solicitação inteira
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
                <span className="min-w-0 text-sm font-medium leading-snug text-slate-700">
                  {produto.name}
                </span>
                <span className={counterPillCls}>{contagemPorProduto.get(produto.id) ?? 0}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {manuais > 0 && (
        <>
          <p className={`px-2.5 pb-1 pt-4 ${microLabelMutedCls}`}>Fora dos produtos</p>
          <button
            type="button"
            onClick={() => onSelecionar(FILTRO_MANUAIS)}
            className={`${railItemCls(selecionado === FILTRO_MANUAIS)} flex items-center justify-between gap-2`}
          >
            <span className="flex min-w-0 items-center gap-2 text-sm font-medium leading-snug text-slate-700">
              <PenLine className="h-3.5 w-3.5 shrink-0 text-osg-500/70" />
              Incluídos à mão
            </span>
            <span className={counterPillCls}>{manuais}</span>
          </button>
        </>
      )}

      {umDocumentoEmMaisDeUmProduto && (
        <p className="mt-3 border-t border-osg-100 px-2.5 pt-2.5 text-[11px] leading-relaxed text-slate-500">
          Um documento pode ser pedido por mais de um produto — por isso a soma dos
          contadores passa do total.
        </p>
      )}
    </aside>
  );
}
