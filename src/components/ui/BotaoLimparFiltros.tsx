import { Eraser } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * O botão "Limpar filtros" das telas do dev, em um lugar só.
 *
 * O DEFEITO QUE ISTO DESFAZ. A receita existia **nove vezes**, uma por tela de
 * consulta, e em sete recortes diferentes de classe — todas pintando o vermelho de
 * estoque (o `red-600` no texto, o `red-50` no hover). Nove cópias não são nove decisões:
 * são uma decisão e nove lugares onde ela envelhece separado.
 *
 * O QUE A COR QUER DIZER, e por que a âncora: limpar filtro **não destrói dado**.
 * Pela regra já escrita no `classesDeBotao.ts`, ação veste a ÂNCORA da área e
 * `destructive` fica para o que destrói. Como efeito, o botão passa a acompanhar a
 * área sozinho — teal na base e na Tax, musgo na OSG.
 *
 * POR QUE ELE CARREGA A CONTAGEM. Decisão dela em 11/09/2026, olhando a página
 * `comparacoes-de-cor/vermelho-e-verde-o-que-cada-um-diz.html`: "a pessoa tem que
 * ver fácil onde limpar o filtro e saber que tem filtro aplicado". Um botão de
 * contorno apagado no meio de uma barra de campos não faz nem uma coisa nem outra.
 * Preenchido e com o número, ele diz as três: **que** tem filtro, **quantos** e
 * **onde** se desfaz.
 *
 * O par de estados é o que faz o aviso existir, então o botão **não some** quando
 * não há filtro: ele fica apagado e desabilitado, e é o salto entre os dois que se
 * lê. Antes, em cinco das nove telas ele sumia — e sumir não avisa nada, porque
 * quem não viu o botão também não viu a falta dele.
 *
 * A pílula da contagem é a mesma do `FeedFiltros` (`h-5 min-w-5 px-1.5`), que já
 * fazia isso no feed de comentários.
 */
interface BotaoLimparFiltrosProps {
  /** Quantos filtros estão preenchidos. Zero desabilita e apaga o botão. */
  quantidade: number;
  onClick: () => void;
  /** Para o caso raro em que a tela chama a ação de outro nome. */
  rotulo?: string;
  className?: string;
}

export function BotaoLimparFiltros({
  quantidade,
  onClick,
  rotulo = 'Limpar filtros',
  className,
}: BotaoLimparFiltrosProps) {
  const ativo = quantidade > 0;

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={!ativo}
      aria-label={ativo ? `${rotulo} (${quantidade} ativos)` : rotulo}
      className={cn(
        'gap-2',
        ativo
          ? 'border-primary/40 bg-primary/10 font-medium text-primary hover:bg-primary/20 hover:text-primary'
          : 'text-muted-foreground opacity-60',
        className,
      )}
    >
      <Eraser aria-hidden className="h-4 w-4" />
      {rotulo}
      {ativo && (
        <Badge
          variant="secondary"
          className="h-5 min-w-5 justify-center bg-primary px-1.5 text-primary-foreground hover:bg-primary"
        >
          {quantidade}
        </Badge>
      )}
    </Button>
  );
}
