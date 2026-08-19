import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  CLASSE_BASE,
  CLASSES_DE_TEMA,
  MAPA_DE_ROTAS,
  TEMA_DA_AREA,
  areaDaRota,
  resolverTemaDaRota,
} from '@/lib/areaTheme';

/** As rotas `/equipe` como o App.tsx as declara — fonte da verdade, não cópia. */
function rotasDoApp(): string[] {
  const app = readFileSync('src/App.tsx', 'utf8');
  return [...app.matchAll(/<Route\s+path="(\/equipe[^"]*)"/g)].map((m) => m[1]);
}

describe('os três casos em que o segundo segmento mente', () => {
  /*
   * São estes que um refactor para `pathname.split('/')[2]` reintroduz, porque
   * o parsing ingênuo passa em todo o resto. O teste é o que impede.
   */
  it('/equipe/acessos é Digital, apesar do caminho dizer "acessos"', () => {
    expect(areaDaRota('/equipe/acessos')).toBe('digital');
    // Digital ainda não tem paleta própria: veste a de infraestrutura.
    expect(resolverTemaDaRota('/equipe/acessos')).toEqual([CLASSE_BASE, 'sistema-theme']);
  });

  it('/equipe/chamados é Rotina, não uma área chamada "chamados"', () => {
    expect(areaDaRota('/equipe/chamados')).toBe('rotina');
    expect(areaDaRota('/equipe/chamados/123')).toBe('rotina');
    expect(resolverTemaDaRota('/equipe/chamados')).toEqual([CLASSE_BASE, 'rotina-theme']);
  });

  it('/equipe/kanban é Rotina — a palavra "rotina" não aparece na URL', () => {
    expect(areaDaRota('/equipe/kanban')).toBe('rotina');
    expect(resolverTemaDaRota('/equipe/kanban')).toEqual([CLASSE_BASE, 'rotina-theme']);
    // E o inverso: nenhuma rota da área traz o segmento que a nomeia. Note que
    // `/equipe/rotinas` (plural, a tela de rotinas) não conta — o segmento dela
    // é "rotinas", e é coincidência de vocabulário, não o nome da área.
    const comSegmentoRotina = MAPA_DE_ROTAS
      .filter((r) => r.area === 'rotina')
      .filter((r) => r.prefixo.split('/')[2] === 'rotina');
    expect(comSegmentoRotina).toEqual([]);
  });
});

describe('cobertura das rotas reais do App.tsx', () => {
  it('toda rota /equipe recebe pelo menos a classe base', () => {
    const rotas = rotasDoApp();
    expect(rotas.length).toBeGreaterThan(100);
    for (const rota of rotas) {
      const classes = resolverTemaDaRota(rota.replace('/*', ''));
      expect(classes, `rota sem tema: ${rota}`).toContain(CLASSE_BASE);
      expect(classes.length).toBeLessThanOrEqual(2);
    }
  });

  it('as rotas /equipe/tax e /equipe/osg pegam o tema da área', () => {
    for (const rota of rotasDoApp()) {
      if (rota.startsWith('/equipe/tax')) {
        expect(resolverTemaDaRota(rota)).toEqual([CLASSE_BASE, 'tax-theme']);
      }
      if (rota.startsWith('/equipe/osg')) {
        expect(resolverTemaDaRota(rota)).toEqual([CLASSE_BASE, 'osg-theme']);
      }
    }
  });

  it('Board e Dev são infraestrutura: grafite, não a cor da marca', () => {
    for (const rota of rotasDoApp()) {
      if (rota.startsWith('/equipe/board') || rota.startsWith('/equipe/dev')) {
        expect(areaDaRota(rota)).toBe('sistema');
        expect(resolverTemaDaRota(rota)).toEqual([CLASSE_BASE, 'sistema-theme']);
      }
    }
  });

  /*
   * O piso carrega a MARCA, e é isso que protege o que não está no mapa.
   *
   * A primeira versão desta etapa pintou o grafite no `.base-theme`. Como ele é
   * aplicado em toda rota, o site institucional, o portal do cliente e a Gestão
   * foram junto — o botão principal de psaconsultores.com.br virou grafite, e
   * nenhuma variável fora das 7 previstas havia mudado: o defeito era de
   * alcance, não de valor. Este teste é o que impede a inversão de voltar.
   */
  it('site público, portal do cliente e Gestão ficam com a cor da marca', () => {
    for (const rota of ['/', '/missao', '/novidades', '/novidades/abc', '/ajuda',
      '/cliente', '/cliente/chamados', '/gestao', '/gestao/chamados', '/auth']) {
      expect(resolverTemaDaRota(rota), rota).toEqual([CLASSE_BASE]);
      expect(areaDaRota(rota), rota).toBe('base');
    }
  });
});

describe('casamento por segmento', () => {
  it('não casa prefixo no meio de uma palavra', () => {
    expect(areaDaRota('/equipe/taxonomia')).toBe('base');
    expect(areaDaRota('/equipe/osgood')).toBe('base');
  });

  it('/equipe/dashboard e /equipe/dashboards são rotas distintas, ambas Rotina', () => {
    expect(areaDaRota('/equipe/dashboard')).toBe('rotina');
    expect(areaDaRota('/equipe/dashboards/analise-inteligente')).toBe('rotina');
  });

  it('o prefixo mais longo vence', () => {
    // `/equipe/digital/mapa/*` precisa cair em digital, não no fallback.
    expect(areaDaRota('/equipe/digital/mapa/processos')).toBe('digital');
  });

  it('barra final não muda a área', () => {
    expect(areaDaRota('/equipe/tax/')).toBe(areaDaRota('/equipe/tax'));
    expect(areaDaRota('/equipe/kanban/')).toBe('rotina');
  });
});

describe('invariantes do resolvedor', () => {
  it('nenhuma rota fica sem tema, nem as de fora de /equipe', () => {
    for (const rota of ['/', '/gestao', '/cliente', '/auth', '/equipe', '/rota/que/nao/existe']) {
      expect(resolverTemaDaRota(rota)).toContain(CLASSE_BASE);
    }
  });

  it('CLASSES_DE_TEMA cobre tudo que o resolvedor pode aplicar', () => {
    const aplicaveis = new Set(
      [...rotasDoApp(), '/', '/gestao'].flatMap((r) => resolverTemaDaRota(r.replace('/*', ''))),
    );
    for (const classe of aplicaveis) expect(CLASSES_DE_TEMA).toContain(classe);
  });

  it('toda classe declarada existe como bloco no index.css', () => {
    const css = readFileSync('src/index.css', 'utf8');
    for (const classe of CLASSES_DE_TEMA) {
      expect(css, `.${classe} não existe no index.css`).toContain(`.${classe} {`);
    }
  });

  it('a base vem ANTES das áreas no index.css, senão ela sobrescreve todas', () => {
    const css = readFileSync('src/index.css', 'utf8');
    const posBase = css.indexOf(`.${CLASSE_BASE} {`);
    for (const classe of Object.values(TEMA_DA_AREA)) {
      if (!classe) continue;
      expect(posBase, `.${classe} precisa vir depois de .${CLASSE_BASE}`)
        .toBeLessThan(css.indexOf(`.${classe} {`));
    }
  });
});

/**
 * Resolve uma variável como o navegador resolveria, dadas as classes no <html>.
 *
 * Todas as classes de tema e o `:root` têm a MESMA especificidade (0-1-0), então
 * quem vence é quem aparece por último no arquivo — é isso que a função imita.
 * Resolve também um nível de `var()`, que é o que o `index.css` usa.
 */
function valorComputado(classes: string[], variavel: string): string | null {
  const css = readFileSync('src/index.css', 'utf8');
  const seletores = [':root', ...classes.map((c) => `.${c}`)];
  const blocos = seletores
    .map((sel) => {
      const ini = css.indexOf(`${sel} {`);
      if (ini === -1) return null;
      const fim = css.indexOf('\n  }', ini);
      return { sel, ini, corpo: css.slice(ini, fim === -1 ? undefined : fim) };
    })
    .filter((b): b is { sel: string; ini: number; corpo: string } => b !== null)
    // Ordem do ARQUIVO — o último a declarar vence.
    .sort((a, b) => a.ini - b.ini);

  let valor: string | null = null;
  for (const bloco of blocos) {
    for (const linha of bloco.corpo.split('\n')) {
      const limpa = linha.trim();
      if (!limpa.startsWith(`${variavel}:`)) continue;
      valor = limpa.slice(variavel.length + 1).replace(/;.*$/, '').trim();
    }
  }
  if (valor?.startsWith('var(')) {
    return valorComputado(classes, valor.slice(4, -1).trim());
  }
  return valor;
}

describe('validação das rotas (a cascata que o navegador vai aplicar)', () => {
  const ROTAS = [
    { rota: '/equipe/osg/work/documentos', nome: 'OSG' },
    { rota: '/equipe/tax/gerencial/chamados', nome: 'Tax' },
    { rota: '/equipe/acessos', nome: 'acessos (Digital)' },
    { rota: '/equipe/board/dashboard', nome: 'Board' },
    { rota: '/equipe/kanban', nome: 'Rotina' },
  ];

  it.each(ROTAS)('$nome: tem classe de tema no DOM', ({ rota }) => {
    const classes = resolverTemaDaRota(rota);
    expect(classes.length).toBeGreaterThan(0);
    expect(classes).toContain(CLASSE_BASE);
  });

  it.each(ROTAS)('$nome: --ring é igual a --primary', ({ rota }) => {
    const classes = resolverTemaDaRota(rota);
    const ring = valorComputado(classes, '--ring');
    const primary = valorComputado(classes, '--primary');
    expect(ring).not.toBeNull();
    expect(ring).toBe(primary);
  });

  it('sem nenhuma classe, o :root ainda traz o lime — é o que a base corrige', () => {
    // Documenta o defeito de origem: enquanto a página rodava sem classe de
    // tema, `--ring` vinha do `:root` e não batia com `--primary`.
    expect(valorComputado([], '--ring')).toBe('85 85% 37%');
    expect(valorComputado([], '--primary')).toBe('175 82% 29%');
  });
});

/** Variáveis declaradas literalmente dentro de um bloco `seletor { … }`. */
function declaradasEm(css: string, seletor: string): Set<string> {
  const ini = css.indexOf(`${seletor} {`);
  if (ini === -1) return new Set();
  const fim = css.indexOf('\n  }', ini);
  const corpo = css.slice(ini, fim === -1 ? undefined : fim);
  const nomes = new Set<string>();
  for (const linha of corpo.split('\n')) {
    const t = linha.trim();
    const sep = t.indexOf(':');
    if (sep > 1 && t.startsWith('--')) nomes.add(t.slice(0, sep));
  }
  return nomes;
}

describe('contrato de tema: toda área declara tudo, ninguém herda', () => {
  /*
   * A herança implícita é o defeito que este sistema inteiro existe para
   * eliminar: variável não declarada não quebra nada visível — a área
   * simplesmente pega o valor da base e a tela fica com duas identidades
   * misturadas. Foi assim que a Tax passou a herdar 15 variáveis e a Rotina 40.
   *
   * O contrato é o conjunto declarado pelo `.base-theme`. Acrescentar uma
   * variável a ele passa a EXIGIR que toda área a declare — que é exatamente o
   * comportamento desejado.
   */
  const css = readFileSync('src/index.css', 'utf8');
  const contrato = declaradasEm(css, `.${CLASSE_BASE}`);

  it('o contrato tem as 43 variáveis', () => {
    // 41 na origem + o par `--surface-escura`/`-2`, acrescentado quando o
    // cartão escuro do Painel Dev precisou de um fundo por área.
    expect(contrato.size).toBe(43);
  });

  it('o par de superfície escura está em TODOS os temas, não só em quem usa', () => {
    // É o teste que cobra o preço de acrescentar ao contrato: uma variável nova
    // no piso obriga cada área a declarar a sua. Sem isso, a área que não
    // declarasse herdaria o fundo escuro de outra identidade.
    for (const classe of [CLASSE_BASE, ...CONGELADOS]) {
      const declaradas = declaradasEm(css, `.${classe}`);
      expect(declaradas.has('--surface-escura'), `.${classe}`).toBe(true);
      expect(declaradas.has('--surface-escura-2'), `.${classe}`).toBe(true);
    }
  });

  /*
   * Há DOIS tipos de tema, e a diferença não é descuido:
   *
   * · CONGELADO — declara as 41. São os que existiam quando o piso ainda ia
   *   mudar de identidade: a Tax herdava 15 e a Rotina 40, e uma mudança no
   *   base as repintaria em silêncio. Congelar cortou esse fio.
   *
   * · DELTA — declara só o que difere. Nasce DEPOIS do piso estar estável, e o
   *   que ele herda (superfícies, texto, papéis de status, tags) ele quer
   *   herdar mesmo. Copiar 34 valores só para mantê-los iguais seria ruído, e
   *   ruído que sai de sincronia na primeira mudança do piso.
   *
   * O que o teste cobra de cada um é diferente, e é o ponto deste bloco.
   */
  const CONGELADOS = ['tax-theme', 'osg-theme', 'rotina-theme'];
  const DELTAS = ['sistema-theme'];

  it('todo tema conhecido está classificado como congelado ou delta', () => {
    const declarados = Object.values(TEMA_DA_AREA).filter((c): c is string => c !== null);
    for (const classe of new Set(declarados)) {
      expect(
        [...CONGELADOS, ...DELTAS],
        `.${classe} não está classificado — decida se é congelado ou delta`,
      ).toContain(classe);
    }
  });

  it.each(CONGELADOS)('.%s (congelado) declara o contrato inteiro', (classe) => {
    const declaradas = declaradasEm(css, `.${classe}`);
    const faltando = [...contrato].filter((v) => !declaradas.has(v));
    expect(faltando, `.${classe} herdaria da base: ${faltando.join(', ')}`).toEqual([]);
  });

  it.each(DELTAS)('.%s (delta) declara um subconjunto do contrato', (classe) => {
    const declaradas = [...declaradasEm(css, `.${classe}`)];
    // Não se cobra completude — cobra-se que não invente variável. Um
    // `--primry` com erro de digitação não quebraria nada visível: a regra
    // simplesmente não valeria, e a tela ficaria com a cor do piso.
    const forasteiras = declaradas.filter((v) => !contrato.has(v));
    expect(forasteiras, `.${classe} declara fora do contrato: ${forasteiras.join(', ')}`).toEqual([]);
    expect(declaradas.length).toBeGreaterThan(0);
    expect(declaradas.length).toBeLessThan(contrato.size);
  });

  it('--tool-icon segue o acento local, em vez de ser congelado', () => {
    // Congelar o valor aqui quebraria o ícone de ferramenta: ele DEVE andar
    // junto com o `--primary` da área que o hospeda. Congela-se o alvo.
    for (const classe of [CLASSE_BASE, 'tax-theme', 'rotina-theme']) {
      const ini = css.indexOf(`.${classe} {`);
      const corpo = css.slice(ini, css.indexOf('\n  }', ini));
      expect(corpo, `.${classe}`).toContain('--tool-icon: var(--primary);');
    }
  });
});
