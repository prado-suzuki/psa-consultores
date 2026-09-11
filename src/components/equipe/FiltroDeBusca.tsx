import type { ReactNode } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * A caixa de filtro padrão das ferramentas da equipe.
 *
 * **A forma vem de `DevFilterFormPattern`**, que é a referência escrita do filtro
 * da Digital e que nenhuma tela chegou a usar: um `Card`, o título "Filtros de
 * Busca", uma grade de campos e os botões encostados à direita. A Patricia pediu
 * em 08/09/2026 que essa mesma caixa apareça em todas as ferramentas, e é isto.
 *
 * **O que ela NÃO traz são os campos.** O padrão original fixava cliente,
 * contribuinte e um intervalo de datas, e nem toda ferramenta tem os quatro: o
 * gerador de slides trabalha com ordem de serviço e revisão, e datas ali não
 * filtram nada. Cada tela põe os seus campos dentro; o que se repete é a
 * moldura, que é o que faz a pessoa reconhecer a tela.
 *
 * **Sem `acoes`, a barra de botões não existe.** Vale para a tela de importar o
 * papel de trabalho, onde escolher cliente e OS não é buscar, é dizer a que
 * planejamento o arquivo pertence. Pôr um "Buscar" ali deixaria a tela parecida
 * com as outras e mais confusa de usar.
 */
export function FiltroDeBusca({
  titulo = 'Filtros de Busca',
  descricao,
  colunas = 4,
  acoes,
  children,
}: {
  titulo?: string;
  /** Uma linha abaixo do título, quando a tela precisa explicar a escolha. */
  descricao?: string;
  /** Quantas colunas a grade tem na tela larga. Sempre uma no celular. */
  colunas?: 2 | 3 | 4;
  /** Botões da direita. Ausente quando a tela não é de busca. */
  acoes?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader className={cn(descricao ? 'pb-3' : 'pb-4')}>
        <CardTitle className="text-base">{titulo}</CardTitle>
        {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'grid grid-cols-1 gap-4 md:grid-cols-2',
            colunas === 3 && 'lg:grid-cols-3',
            colunas === 4 && 'lg:grid-cols-4',
          )}
        >
          {children}
        </div>
        {acoes && <div className="flex flex-wrap items-center justify-end gap-2 pt-4">{acoes}</div>}
      </CardContent>
    </Card>
  );
}
