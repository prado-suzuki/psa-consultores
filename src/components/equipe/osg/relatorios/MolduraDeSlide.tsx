import type { ReactNode } from 'react';
import { Presentation } from 'lucide-react';

/**
 * A moldura que diz "isto é um slide", e não mais uma tabela.
 *
 * A BIBLIOTECA PROMETIA SLIDE E ENTREGAVA TABELA. As peças que alimentam o deck
 * e as que são só relatório de tela desenhavam exatamente igual — mesma tabela,
 * mesmo cabeçalho —, então a aba "Slides da apresentação" não se sustentava: o
 * usuário via a mesma coisa dos dois lados e concluía, com razão, que tudo ali
 * era relatório.
 *
 * O dado para desfazer isso já existia no código, em comentário: "uma tabela por
 * sociedade de integralização (= 1 slide no deck)" e "= slides 17-18". A moldura
 * só traz para a tela o que o componente já sabia.
 *
 * NÃO É PRÉVIA FIEL, e o rodapé diz isso. O conteúdo aqui é a tabela da tela; o
 * .pptx sai do template PSA, com a diagramação dele. Prometer prévia exigiria
 * renderizar o template, que é outra tarefa — a mesma que a noção de "slide como
 * unidade escolhível" exigiria.
 */
export function MolduraDeSlide({
  numero,
  total,
  titulo,
  meta,
  children,
}: {
  numero: number;
  total: number;
  titulo: string;
  meta?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-osg-300/60 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-osg-100 bg-osg-50/60 px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 rounded-md bg-osg-100 px-2 py-0.5 text-[11px] font-semibold text-osg-700">
          <Presentation className="h-3 w-3" />
          Slide {numero} de {total}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground" title={titulo}>
          {titulo}
        </span>
        {meta && <span className="text-xs text-muted-foreground">{meta}</span>}
      </header>

      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

/**
 * NÃO EXISTE UMA "MolduraDeTela" AQUI, e isso é decisão, não falta.
 *
 * Houve uma, por um passo: os "imóveis não integralizados" do Diagnóstico
 * ficavam na peça marcados como "Só na tela". Mas a Biblioteca é prévia de
 * slide, e um bloco que não vira slide não pertence a ela por mais honesto que
 * seja o selo. Aquela tabela foi para o Cadastro Patrimonial, que ganhou o
 * filtro "Não integralizados" no mesmo passo. Se aparecer aqui um bloco que não
 * vira slide, o lugar dele é outra tela — não uma moldura diferente.
 */

/** O rodapé do conjunto: o que a moldura é, e o que ela não é. */
export function NotaDaPrevia({ deck }: { deck: string }) {
  return (
    <p className="text-xs text-muted-foreground">
      Cada bloco acima vira um slide de <b className="font-semibold text-muted-foreground">{deck}</b>.
      O conteúdo é o mesmo; a diagramação final vem do modelo PSA, no .pptx gerado.
    </p>
  );
}
