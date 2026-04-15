import { Fragment, type ReactNode, createElement } from 'react';

/**
 * Renderiza texto convertendo `**bold**` em `<strong>` SEM usar
 * `dangerouslySetInnerHTML`. O React escapa o conteúdo automaticamente,
 * então qualquer HTML/script vindo da IA aparece como texto literal —
 * imune a XSS.
 *
 * Não suporta nesting ou markdown completo (italico, links etc) por design:
 * o intuito é cobrir o único formato que a IA da Lovable produz hoje.
 *
 * Para markdown completo no futuro, considerar `react-markdown` com
 * sanitização explícita.
 */
export function renderSimpleBoldMarkdown(text: string): ReactNode {
  if (!text) return null;

  // Quebra o texto em segmentos alternados: fora do bold / dentro do bold.
  // Regex captura `**...**` minimamente.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return createElement(
    Fragment,
    null,
    ...parts.map((part, i) => {
      const match = part.match(/^\*\*([^*]+)\*\*$/);
      if (match) {
        return createElement('strong', { key: i }, match[1]);
      }
      return createElement(Fragment, { key: i }, part);
    })
  );
}
