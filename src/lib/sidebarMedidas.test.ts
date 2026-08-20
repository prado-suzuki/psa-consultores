import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  MEDIDAS_TRILHO_SIDEBAR,
  classeLarguraBarra,
  classeRecuoCabecalho,
  larguraBarraCss,
} from './sidebarMedidas';

const ler = (caminhoRelativo: string) =>
  readFileSync(fileURLToPath(new URL(caminhoRelativo, import.meta.url)), 'utf8');

/** As cinco barras laterais que seguem o padrão de trilho de 80px. */
const LAYOUTS_DO_PADRAO = {
  Administração: '../components/administracao/AdminLayout.tsx',
  Tax: '../components/equipe/fiscal/FiscalSidebar.tsx',
  Fixos: '../components/equipe/fixos/FixosLayout.tsx',
  OSG: '../components/equipe/osg/OsgLayout.tsx',
  Gestão: '../components/gestao/GestaoLayout.tsx',
} as const;

describe('medidas do trilho recolhido', () => {
  // A conta que o trilho de 64px não fechava. Alargar sem encolher os recuos (ou
  // encolher os recuos sem alargar) traz o corte de volta, então o teste mede o
  // que sobra, não as medidas isoladas.
  it('o avatar de 32px cabe no chip do usuário dentro do trilho recolhido', () => {
    const {
      larguraRecolhidaPx,
      recuoRodapePx,
      recuoChipRecolhidoPx,
      avatarPx,
    } = MEDIDAS_TRILHO_SIDEBAR;

    const larguraDoChip = larguraRecolhidaPx - recuoRodapePx * 2;
    const larguraUtilDoChip = larguraDoChip - recuoChipRecolhidoPx * 2;

    expect(larguraUtilDoChip).toBeGreaterThanOrEqual(avatarPx);
  });

  it('o selo de 40px da área cabe no cabeçalho recolhido', () => {
    const { larguraRecolhidaPx, recuoRodapePx, seloCabecalhoPx } = MEDIDAS_TRILHO_SIDEBAR;

    // O recuo do cabeçalho recolhido é o mesmo `p-4` do rodapé — com `p-6`
    // (24px) sobrariam 32px para um selo de 40px.
    expect(larguraRecolhidaPx - recuoRodapePx * 2).toBeGreaterThanOrEqual(seloCabecalhoPx);
  });

  it('as classes e o CSS descrevem a mesma largura', () => {
    expect(classeLarguraBarra(true)).toBe('w-20'); // 5rem = 80px
    expect(classeLarguraBarra(false)).toBe('w-64'); // 16rem = 256px
    expect(larguraBarraCss(true)).toBe(`${MEDIDAS_TRILHO_SIDEBAR.larguraRecolhidaPx}px`);
    expect(larguraBarraCss(false)).toBe(`${MEDIDAS_TRILHO_SIDEBAR.larguraAbertaPx}px`);
    expect(classeRecuoCabecalho(true)).toBe('p-4');
    expect(classeRecuoCabecalho(false)).toBe('p-6');
  });
});

// O bug sobreviveu num layout porque o cartão do usuário estava copiado em cinco
// arquivos. Estes testes leem o fonte: é a única forma de travar "não volte por
// cópia" sem montar as cinco telas inteiras (cada uma com contexto, rotas e
// dados próprios).
describe('as cinco barras do padrão não têm cópia própria da medida', () => {
  for (const [area, caminho] of Object.entries(LAYOUTS_DO_PADRAO)) {
    it(`${area}: largura vem de classeLarguraBarra e o cartão é o compartilhado`, () => {
      const fonte = ler(caminho);

      expect(fonte).toContain('classeLarguraBarra(');
      expect(fonte).toContain('<SidebarCartaoUsuario');
      // Largura escrita à mão é exatamente o que fez as barras divergirem.
      expect(fonte).not.toMatch(/'w-(16|20|64)'/);
      // Nem cartão remontado à mão: o avatar mora no componente compartilhado.
      expect(fonte).not.toContain('rounded-full bg-');
    });
  }

  it('o Mapeamento recebe a largura da constante, sem 72px solto no CSS', () => {
    expect(ler('../components/equipe/mapa/Layout.tsx')).toContain(
      'MEDIDAS_TRILHO_SIDEBAR.larguraRecolhidaPx',
    );
    expect(ler('../pages/equipe/mapa/mapa.css')).not.toMatch(
      /--sidebar-width-collapsed:\s*\d/,
    );
  });
});
