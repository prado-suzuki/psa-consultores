import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { renderSimpleBoldMarkdown } from './safeBoldMarkdown';

/**
 * Regressão do PR #6: o BoardAIBox antes renderizava a resposta da IA com
 * `dangerouslySetInnerHTML` + regex de `**bold**`, o que permitia XSS se a
 * IA retornasse HTML/script. Esses testes garantem que o replacement é
 * seguro (via React, sem dangerouslySetInnerHTML).
 */

describe('renderSimpleBoldMarkdown', () => {
  it('retorna null para string vazia', () => {
    expect(renderSimpleBoldMarkdown('')).toBeNull();
  });

  it('renderiza texto puro sem mudanças', () => {
    const { container } = render(<>{renderSimpleBoldMarkdown('texto puro')}</>);
    expect(container.textContent).toBe('texto puro');
    expect(container.querySelector('strong')).toBeNull();
  });

  it('converte **bold** em <strong>', () => {
    const { container } = render(<>{renderSimpleBoldMarkdown('antes **destaque** depois')}</>);
    expect(container.textContent).toBe('antes destaque depois');
    expect(container.querySelector('strong')?.textContent).toBe('destaque');
  });

  it('escapa HTML/script vindo do input (proteção XSS)', () => {
    const malicious = 'olá <script>alert(1)</script> mundo';
    const { container } = render(<>{renderSimpleBoldMarkdown(malicious)}</>);
    expect(container.querySelector('script')).toBeNull();
    expect(container.textContent).toContain('<script>alert(1)</script>');
  });

  it('escapa HTML também dentro de **...**', () => {
    const malicious = '**<img src=x onerror=alert(1)>**';
    const { container } = render(<>{renderSimpleBoldMarkdown(malicious)}</>);
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('strong')?.textContent).toBe('<img src=x onerror=alert(1)>');
  });

  it('suporta múltiplos bolds na mesma string', () => {
    const { container } = render(<>{renderSimpleBoldMarkdown('**A** texto **B** fim')}</>);
    const strongs = container.querySelectorAll('strong');
    expect(strongs).toHaveLength(2);
    expect(strongs[0].textContent).toBe('A');
    expect(strongs[1].textContent).toBe('B');
  });
});
