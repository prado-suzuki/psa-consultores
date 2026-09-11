import type { ReactNode } from 'react';

import { cn } from '@/lib/utils';

/**
 * O título da página, no cabeçalho de qualquer layout de área.
 *
 * POR QUE ISTO É UM COMPONENTE, e não duas linhas em cada layout. Porque eram
 * duas linhas em cada layout, sete vezes:
 *
 *     <h1 className="text-xl font-bold text-foreground">{title}</h1>
 *     {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
 *
 * Seis cópias idênticas (Fiscal, Osg, Equipe, Gestao, Admin, Fixos) e uma que
 * já tinha divergido — a do Dev, que ganhou `break-words` e o link do SOP sem
 * que as outras soubessem. É a mesma figura do fundo de página, que em 10/09
 * saiu dos oito layouts para o `body` depois de cinco deles pintarem com a
 * superfície errada: decisão repetida por arquivo diverge, e não avisa.
 *
 * O `break-words` do Dev vem junto para todas, de propósito. Ele nasceu lá para
 * um problema real de título longo, e não há motivo para as outras áreas
 * quebrarem o layout onde o Dev não quebra.
 *
 * O QUE MUDOU EM 10/09/2026, e é a razão de o componente nascer agora: o título
 * foi de `text-xl` (20px) para `text-3xl` (30px). O defeito era hierarquia
 * invertida — no `/equipe/dev` a caixa de abertura da tela tinha mais massa que
 * o nome da tela, e a Patricia leu a seção antes da página. Havia duas saídas,
 * tirar peso da seção ou dar peso à página, e ela pediu as duas: a caixa foi
 * para branca e leve, e o título subiu.
 *
 * Foi medido antes: o título mais longo de todo o `/equipe/dev` tem 28
 * caracteres ("Consulta EFD Contribuições"), nenhum passa de 30, e o mais longo
 * vindo do catálogo dinâmico tem 43. O comentário do `DevLayout` que dizia
 * "passam de 100 caracteres em CAIXA ALTA" estava errado, e era ele que fazia
 * um título maior parecer arriscado.
 *
 * ⚠️ O CABEÇALHO QUE USA ISTO NÃO PODE SER `h-16` FIXO. A 30px, título mais
 * subtítulo somam ~56px, que com respiro passa dos 64px. Os sete cabeçalhos
 * usam `min-h-16` com `py-2` — que é o que o `DevLayout` já fazia sozinho, pelo
 * mesmo motivo, antes de a régua subir. A catraca em `tituloDaPagina.test.ts`
 * cobra isso.
 */
export interface TituloDaPaginaProps {
  /** O nome da tela. */
  titulo: string;
  /** A linha de apoio, opcional. */
  subtitulo?: ReactNode;
  /**
   * Rótulo pequeno acima do título, em versalete.
   *
   * Nasce SEM consumidor de propósito. O sobretítulo faz parte da proposta que
   * a Patricia escolheu, mas o texto de cada área é decisão de nome dela, e
   * nome de área não se deriva de `AREA_CATEGORIES_MAP`: aquele mapa é a
   * taxonomia de PERMISSÃO, e o `areaTheme.ts` explica por que os dois não se
   * amarram — mudança de permissão não deve reescrever cabeçalho.
   */
  sobretitulo?: string;
  /**
   * Conteúdo que continua a linha do subtítulo, na mesma frase.
   *
   * Existe por um caso só, e ele é o motivo de o parâmetro não ser
   * `ReactNode` solto no fim: o `DevLayout` põe "Acessar SOP desta ferramenta"
   * depois do subtítulo, separado por uma barra. É apêndice do subtítulo, não
   * bloco novo — se virar bloco, some do lugar onde faz sentido.
   */
  apendiceDoSubtitulo?: ReactNode;
  className?: string;
}

export function TituloDaPagina({
  titulo,
  subtitulo,
  sobretitulo,
  apendiceDoSubtitulo,
  className,
}: TituloDaPaginaProps) {
  return (
    <div className={cn('min-w-0', className)}>
      {sobretitulo && (
        <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {sobretitulo}
        </p>
      )}
      <h1 className="break-words text-3xl font-bold tracking-tight text-foreground">{titulo}</h1>
      {subtitulo && (
        <p className="flex flex-wrap items-center gap-0 text-sm text-muted-foreground">
          {subtitulo}
          {apendiceDoSubtitulo}
        </p>
      )}
    </div>
  );
}

export default TituloDaPagina;
