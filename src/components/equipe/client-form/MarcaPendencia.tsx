// A marca de campo obrigatório em falta: moldura vermelha e frase curta.
//
// Existe como peça própria porque a mesma marca aparece em quatro abas e em
// campos de tipos diferentes (texto, lista suspensa, seleção por diálogo). Se
// cada aba escrevesse a sua, o vermelho de uma não seria o vermelho da outra.
//
// A frase vem de `camposObrigatorios`, que é quem sabe onde está a falta. Aqui
// só se decide como ela aparece. Nada é exibido antes da primeira tentativa de
// salvar: marcar de vermelho um cadastro recém-começado é castigar quem começou.
import { AlertCircle } from 'lucide-react';

/** Aplicada ao campo (Input, SelectTrigger, área de seleção) que está em falta. */
export const CLASSE_CAMPO_PENDENTE = 'border-destructive focus-visible:ring-destructive';

/**
 * Acha na tela o campo marcado acima, para levar o cursor até ele.
 *
 * Mora aqui, colado na classe, porque os dois têm de mudar juntos: um seletor
 * escrito noutro arquivo envelheceria calado, e o sintoma seria o cursor parar
 * de andar sem nada quebrar.
 *
 * `border-destructive` é um token exato, então não colide com os botões de
 * remover, que usam `border-destructive/40` e `hover:border-destructive`.
 */
export const SELETOR_CAMPO_PENDENTE = '.border-destructive';

/**
 * Atributos de acessibilidade de um campo obrigatório.
 *
 * Antes daqui, a obrigatoriedade existia só como o asterisco do rótulo e a
 * moldura vermelha: nenhum controle do formulário tinha `aria-required`, e a
 * frase da falta era um parágrafo solto que ninguém anunciava. Quem usa leitor
 * de tela não sabia que o campo era obrigatório antes de tentar salvar, e nem
 * por que o salvamento tinha sido recusado.
 *
 * Vem de uma função só para os três atributos andarem juntos. Espalhados campo
 * a campo, eles se perdiam: o `aria-invalid` já estava assim, presente em sete
 * campos de Contribuintes, três de Representantes e nenhum de OS, enquanto a
 * moldura vermelha aparecia em oito, seis e quatro.
 *
 * @param id o mesmo id passado ao `MarcaPendencia` que exibe a frase.
 * @param falta a frase da falta, quando há; ausente quando o campo está em ordem.
 * @param obrigatorio `false` para campo que só é exigido em certas condições.
 */
export function acessibilidadeObrigatorio(id: string, falta?: string, obrigatorio = true) {
  return {
    'aria-required': obrigatorio || undefined,
    'aria-invalid': falta ? true : undefined,
    // Liga a frase ao campo: sem isto o erro é anunciado uma vez, quando surge,
    // e quem voltar ao campo depois não ouve mais o motivo.
    'aria-describedby': falta ? id : undefined,
  } as const;
}

export interface MarcaPendenciaProps {
  /** A frase da falta. Sem ela nada é renderizado, e o chamador não precisa de `&&`. */
  children?: string;
  /** Casa com o `aria-describedby` do campo. Ver `acessibilidadeObrigatorio`. */
  id?: string;
}

export default function MarcaPendencia({ children, id }: MarcaPendenciaProps) {
  if (!children) return null;
  return (
    <p
      id={id}
      // `alert` faz a frase ser anunciada no instante em que aparece, que é
      // quando a pessoa acabou de tentar salvar e está esperando resposta.
      role="alert"
      className="mt-1 flex items-start gap-1.5 text-xs text-destructive"
    >
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
