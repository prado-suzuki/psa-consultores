import { fireEvent, render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';

import { AreaThemeProvider } from '@/components/AreaThemeProvider';

function montar(rota: string) {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <AreaThemeProvider>
        <Routes>
          <Route path="*" element={<p>conteúdo</p>} />
        </Routes>
      </AreaThemeProvider>
    </MemoryRouter>,
  );
}

describe('AreaThemeProvider', () => {
  beforeEach(() => {
    document.documentElement.className = '';
  });

  it('aplica base + tema da área no <html>', () => {
    montar('/equipe/osg/work/documentos');
    expect(document.documentElement.classList.contains('base-theme')).toBe(true);
    expect(document.documentElement.classList.contains('osg-theme')).toBe(true);
  });

  it('aplica só a base onde a área não tem tema próprio', () => {
    montar('/equipe/acessos');
    expect(document.documentElement.classList.contains('base-theme')).toBe(true);
    expect(document.documentElement.classList.contains('osg-theme')).toBe(false);
    expect(document.documentElement.classList.contains('tax-theme')).toBe(false);
  });

  it('nenhuma rota fica sem classe de tema', () => {
    for (const rota of ['/equipe/board/dashboard', '/equipe/dev/consulta-xmls', '/', '/nao-existe']) {
      document.documentElement.className = '';
      montar(rota);
      expect(document.documentElement.classList.contains('base-theme'), rota).toBe(true);
    }
  });

  it('troca o tema ao navegar entre áreas, sem deixar o anterior para trás', () => {
    function Ir({ para }: { para: string }) {
      const navigate = useNavigate();
      return <button onClick={() => navigate(para)}>ir</button>;
    }
    const { getByText } = render(
      <MemoryRouter initialEntries={['/equipe/osg/dashboard']}>
        <AreaThemeProvider>
          <Routes>
            <Route path="*" element={<Ir para="/equipe/tax/dashboard" />} />
          </Routes>
        </AreaThemeProvider>
      </MemoryRouter>,
    );
    expect(document.documentElement.classList.contains('osg-theme')).toBe(true);
    fireEvent.click(getByText('ir'));
    expect(document.documentElement.classList.contains('osg-theme')).toBe(false);
    expect(document.documentElement.classList.contains('tax-theme')).toBe(true);
    expect(document.documentElement.classList.contains('base-theme')).toBe(true);
  });

  /*
   * O modo de falha mais caro que sobra neste desenho: classe VELHA que não é
   * removida ao navegar. Duas classes de área empilhadas não dão erro nenhum —
   * as duas são válidas —, só que aí quem decide a cor é a ordem dos blocos no
   * index.css, e não a rota. A tela pinta com a área errada, em silêncio.
   *
   * O caminho é de ida E DE VOLTA de propósito: Tax → OSG → Tax pega a classe
   * órfã que um teste só de ida deixaria passar, e o passo final para uma rota
   * SEM tema de área garante que a última classe seja de fato retirada.
   *
   * Esse passo final só passou a provar isso em 31/08/2026. Até ali
   * `/equipe/acessos` vestia `sistema-theme`, e o teste só dava certo porque a
   * lista abaixo não incluía essa classe — a última classe podia ficar no
   * <html> sem ninguém ver. Com o Digital na casa, a rota ficou de fato sem
   * tema, e a lista virou o conjunto COMPLETO das classes de área que o
   * resolvedor sabe aplicar. Se nascer uma quinta, ela entra aqui.
   */
  it('navegando Tax → OSG → Tax → acessos, nunca empilha classe de área', () => {
    const CLASSES_DE_AREA = ['tax-theme', 'osg-theme', 'board-theme', 'sistema-theme'];
    const areasNoHtml = () =>
      CLASSES_DE_AREA.filter((c) => document.documentElement.classList.contains(c));

    function Navegador() {
      const navigate = useNavigate();
      return (
        <>
          <button onClick={() => navigate('/equipe/tax/dashboard')}>ir-tax</button>
          <button onClick={() => navigate('/equipe/osg/dashboard')}>ir-osg</button>
          <button onClick={() => navigate('/equipe/acessos')}>ir-acessos</button>
        </>
      );
    }

    const { getByText } = render(
      <MemoryRouter initialEntries={['/equipe/tax/dashboard']}>
        <AreaThemeProvider>
          <Routes>
            <Route path="*" element={<Navegador />} />
          </Routes>
        </AreaThemeProvider>
      </MemoryRouter>,
    );

    const passos: { clicar: string | null; esperado: string[] }[] = [
      { clicar: null, esperado: ['tax-theme'] },
      { clicar: 'ir-osg', esperado: ['osg-theme'] },
      { clicar: 'ir-tax', esperado: ['tax-theme'] },
      { clicar: 'ir-acessos', esperado: [] },
    ];

    for (const passo of passos) {
      if (passo.clicar) fireEvent.click(getByText(passo.clicar));
      const onde = passo.clicar ?? '(início)';
      // Exatamente uma classe de área — nem duas empilhadas, nem nenhuma.
      expect(areasNoHtml(), `depois de ${onde}`).toEqual(passo.esperado);
      expect(
        document.documentElement.classList.contains('base-theme'),
        `base-theme sumiu depois de ${onde}`,
      ).toBe(true);
    }
  });

  it('não derruba classe de terceiro no <html> (ex.: dark)', () => {
    document.documentElement.classList.add('dark');
    montar('/equipe/tax/dashboard');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.classList.contains('tax-theme')).toBe(true);
  });
});
