import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  MEDIDAS_TRILHO_SIDEBAR,
  classeLarguraBarra,
  classeRecuoCabecalho,
  classesGavetaBarra,
  larguraBarraCss,
} from './sidebarMedidas';

const ler = (caminhoRelativo: string) =>
  readFileSync(fileURLToPath(new URL(caminhoRelativo, import.meta.url)), 'utf8');

/** As barras laterais que seguem o padrão de trilho de 80px. */
const LAYOUTS_DO_PADRAO = {
  Administração: '../components/administracao/AdminLayout.tsx',
  Tax: '../components/equipe/fiscal/FiscalSidebar.tsx',
  Fixos: '../components/equipe/fixos/FixosLayout.tsx',
  OSG: '../components/equipe/osg/OsgLayout.tsx',
  Gestão: '../components/gestao/GestaoLayout.tsx',
  // A Rotina e o Dev entraram depois, e pelo mesmo motivo: as duas recolhiam
  // para `w-0` — a barra sumia inteira em vez de virar trilho — e montavam o
  // cartão do usuário em markup próprio.
  Rotina: '../components/equipe/EquipeLayout.tsx',
  Dev: '../components/equipe/dev/DevLayout.tsx',
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
describe('as barras do padrão não têm cópia própria da medida', () => {
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

  // O Board ainda não monta o `SidebarCartaoUsuario` (ele entra numa fase
  // seguinte), então não cabe no laço acima — mas a largura dele já saiu do
  // literal. Era a última barra fora da régua: 68px recolhida e 240px aberta.
  // Os 68px são o número que o cartão não perdoa — ver a conta no topo deste
  // arquivo —, então travar isso agora é o que impede o cartão de chegar numa
  // barra que o corta.
  it('o Board recebe a largura da constante, sem 68px nem 240px soltos', () => {
    const fonte = ler('../components/equipe/board/BoardLayout.tsx');

    expect(fonte).toContain('classeLarguraBarra(');
    expect(fonte).not.toMatch(/w-\[68px\]|w-\[240px\]/);
    // A margem do <main> reserva a coluna da barra `fixed`: se ela ficar para
    // trás, o conteúdo passa por baixo da barra ou sobra uma faixa vazia.
    expect(fonte).toMatch(/md:ml-20/);
    expect(fonte).toMatch(/md:ml-64/);
    expect(fonte).not.toMatch(/md:ml-\[68px\]|md:ml-\[240px\]/);
  });

  // A usuária viu isto navegando entre áreas: a linha divisória sob o cabeçalho
  // "pulava" de lugar. Cada barra tinha a sua própria altura de cabeçalho —
  // Board fechava 68px (recuo próprio mais selo de 32), a OSG 88px mesmo
  // recolhida (`py-6` fixo) e o Dev 92px aberta (cabeçalho só de texto, sem
  // selo), contra os 88/72 das outras cinco. Como todas as telas de uma área
  // compartilham o layout, o desalinhamento só aparece na TROCA de área.
  it('as oito barras Tailwind tiram o recuo do cabeçalho da mesma função', () => {
    const BARRAS = {
      ...LAYOUTS_DO_PADRAO,
      Board: '../components/equipe/board/BoardLayout.tsx',
    };

    for (const [area, caminho] of Object.entries(BARRAS)) {
      expect(ler(caminho), `${area} escreve o recuo do cabeçalho à mão`).toContain(
        'classeRecuoCabecalho(',
      );
    }
  });

  it('o Mapeamento recebe a largura da constante, sem 72px solto no CSS', () => {
    expect(ler('../components/equipe/mapa/Layout.tsx')).toContain(
      'MEDIDAS_TRILHO_SIDEBAR.larguraRecolhidaPx',
    );
    expect(ler('../pages/equipe/mapa/mapa.css')).not.toMatch(
      /--sidebar-width-collapsed:\s*\d/,
    );
  });
});

describe('a barra vira gaveta em tela estreita', () => {
  it('só toca no celular: toda classe é prefixada com max-md', () => {
    for (const recolhida of [true, false]) {
      for (const classe of classesGavetaBarra(recolhida).split(/\s+/)) {
        // Uma classe sem prefixo aqui vazaria para o desktop, onde a barra é
        // coluna: `fixed` no desktop tiraria a barra do fluxo e o conteúdo
        // passaria por baixo dela.
        expect(classe.startsWith('max-md:')).toBe(true);
      }
    }
  });

  it('fechada desliza para fora da tela; aberta volta ao lugar', () => {
    expect(classesGavetaBarra(true)).toContain('max-md:-translate-x-full');
    expect(classesGavetaBarra(false)).toContain('max-md:translate-x-0');
    expect(classesGavetaBarra(true)).not.toContain('max-md:translate-x-0');
  });

  it('sai do fluxo, senão a largura dela é largura que o conteúdo perde', () => {
    // O `<main>` é irmão da barra num flex e tem `overflow-hidden`: em 390px de
    // tela, o que não caber é cortado, não rola. `fixed` é o que resolve.
    expect(classesGavetaBarra(false)).toContain('max-md:fixed');
  });
});

/**
 * O bug do celular era o MESMO nas nove áreas, e chegou lá porque cada layout
 * tem a sua própria linha de classes na barra. Este teste lê o fonte: é o que
 * impede uma área de ficar para trás na próxima vez que alguém mexer numa só.
 */
describe('todas as barras laterais viram gaveta no celular', () => {
  const BARRAS = {
    Administração: '../components/administracao/AdminLayout.tsx',
    Tax: '../components/equipe/fiscal/FiscalSidebar.tsx',
    Fixos: '../components/equipe/fixos/FixosLayout.tsx',
    OSG: '../components/equipe/osg/OsgLayout.tsx',
    Gestão: '../components/gestao/GestaoLayout.tsx',
    'Digital Rotina': '../components/equipe/EquipeLayout.tsx',
    'Digital Dev': '../components/equipe/dev/DevLayout.tsx',
  } as const;

  for (const [area, caminho] of Object.entries(BARRAS)) {
    it(`${area}: a barra usa classesGavetaBarra e o trilho não vale na gaveta`, () => {
      const fonte = ler(caminho);

      expect(fonte).toContain('classesGavetaBarra(');
      // `collapsed` na gaveta quer dizer "fechada", não "trilho de 80px": a
      // gaveta abre inteira, com os rótulos.
      expect(fonte).toMatch(/const trilho = \w+ && !emGaveta;/);
    });
  }

  it('Mapeamento: tem gaveta própria no CSS legado, e o trilho não a alcança', () => {
    const fonte = ler('../components/equipe/mapa/Layout.tsx');

    // `.sidebar.collapsed` (duas classes) vence o `width: 260px` que a media
    // query dá à gaveta — sem esta linha a gaveta abriria como trilho de 80px.
    expect(fonte).toMatch(/const trilho = sidebarCollapsed && !emGaveta;/);
    expect(ler('../pages/equipe/mapa/mapa.css')).toContain('.sidebar.open');
  });

  it('Board: a gaveta dele é o <Sheet>, e por isso não usa as classes', () => {
    const fonte = ler('../components/equipe/board/BoardLayout.tsx');

    expect(fonte).toContain('<Sheet ');
    // A barra-coluna do Board não existe no celular, então não há o que deslocar.
    expect(fonte).toContain('hidden md:flex');
  });
});
