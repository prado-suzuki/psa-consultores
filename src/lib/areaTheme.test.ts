import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  CLASSE_BASE,
  CLASSES_DE_TEMA,
  ESPELHO,
  MAPA_DE_ROTAS,
  PARAM_DE_ESPELHO,
  ROTAS_ESPELHADAS,
  TEMA_DA_AREA,
  areaDaRota,
  chaveDeEspelho,
  resolverTemaDaRota,
} from '@/lib/areaTheme';
import { PROTECTED_PAGES } from '@/config/protectedPages';

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

  it('o contrato tem as 46 variáveis', () => {
    // 41 na origem
    // +2 o par `--surface-escura`/`-2`, quando o cartão escuro do Painel Dev
    //    precisou de um fundo por área
    // +3 os `-foreground` de estado (`--success-`, `--warning-`,
    //    `--destructive-foreground`). Eles existiam só no `:root`, fora do
    //    contrato: um tema podia redefinir `--destructive` e o texto por cima
    //    continuava vindo de um lugar que nenhum tema controlava. A OSG faz
    //    exatamente isso, e o par sobrevivia por sorte. Os valores declarados
    //    são os mesmos do `:root` — nenhum pixel mudou; o que mudou foi quem
    //    manda neles.
    expect(contrato.size).toBe(46);
  });

  /*
   * Cor de estado e o texto que vai por cima dela andam JUNTOS.
   *
   * É a mesma regra do `--ring`/`--primary`: um tema que redefine o fundo sem o
   * primeiro plano cria um par que ninguém escolheu. A OSG redefine os três
   * (`--osg-moss`, `--osg-highlighter`, `--osg-red`) e é o caso que prova.
   */
  it('todo tema que declara cor de estado declara o primeiro plano dela', () => {
    for (const classe of [CLASSE_BASE, ...CONGELADOS]) {
      const declaradas = declaradasEm(css, `.${classe}`);
      for (const papel of ['success', 'warning', 'destructive']) {
        if (!declaradas.has(`--${papel}`)) continue;
        expect(
          declaradas.has(`--${papel}-foreground`),
          `.${classe} declara --${papel} sem --${papel}-foreground: o texto viria do :root, `
          + 'que nenhum tema controla',
        ).toBe(true);
      }
    }
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

/*
 * ESPELHAMENTO — a regra "cor e conteúdo andam juntos", cobrada pelo build.
 *
 * A regra não pode viver em comentário: é exatamente o tipo de coisa que se
 * perde. Estes testes existem para que quebre no CI, não na tela.
 *
 * O que os torna possíveis é o desenho: a chave do parâmetro é uma CATEGORIA DE
 * PÁGINA, e a mesma categoria resolve o tema (aqui) e o cluster da lista
 * (`useDomainClusterPorCategoria`). Uma chave que pinta mas não filtra não é um
 * descuido a lembrar — é uma linha que não existe.
 */
describe('espelhamento: cor e conteúdo saem da mesma chave', () => {
  it('toda chave de espelho é uma categoria de página REAL', () => {
    // Chave que não é categoria não tem como resolver cluster, logo pintaria
    // sem filtrar. `PROTECTED_PAGES` é a fonte de quais categorias existem.
    const categoriasReais = new Set(PROTECTED_PAGES.map((p) => p.category as string));
    for (const chave of Object.keys(ESPELHO)) {
      expect(categoriasReais.has(chave), `"${chave}" não é categoria de nenhuma página`).toBe(true);
    }
  });

  it('toda chave de espelho resolve para um tema declarado', () => {
    for (const [chave, area] of Object.entries(ESPELHO)) {
      expect(TEMA_DA_AREA, `chave "${chave}"`).toHaveProperty(area);
      expect(TEMA_DA_AREA[area], `chave "${chave}" cairia no piso — pintar sem mudar nada`).not.toBeNull();
    }
  });

  it('toda rota espelhável existe no App.tsx', () => {
    const rotas = new Set(rotasDoApp().map((r) => r.replace(/\/\*$/, '')));
    for (const rota of ROTAS_ESPELHADAS) {
      expect(rotas.has(rota), `${rota} não é rota declarada`).toBe(true);
    }
  });

  /*
   * O TRAVAMENTO PRINCIPAL: não se pinta sem filtrar.
   *
   * Se alguém puser uma rota em `ROTAS_ESPELHADAS` e não fizer a tela ler o
   * parâmetro, a rota passa a mudar de COR sem mudar de CONTEÚDO — que é
   * precisamente o defeito que o espelhamento existe para não ter. Aqui a
   * varredura procura o uso do parâmetro no código da tela.
   */
  it('toda rota espelhável tem tela que LÊ o parâmetro', () => {
    const app = readFileSync('src/App.tsx', 'utf8');
    const linhas = app.split('\n');
    for (const rota of ROTAS_ESPELHADAS) {
      const linha = linhas.find((l) => l.includes(`<Route path="${rota}"`));
      expect(linha, `rota ${rota} não encontrada no App.tsx`).toBeTruthy();
      const comp = [...(linha as string).matchAll(/<([A-Z][A-Za-z0-9]*)\s*\/>/g)].pop()?.[1];
      expect(comp, `sem componente em ${rota}`).toBeTruthy();
      const linhaImport = linhas.find((l) => l.startsWith('import') && l.includes(` ${comp} `));
      expect(linhaImport, `import de ${comp} não encontrado`).toBeTruthy();
      const caminho = (linhaImport as string).match(/from\s+"([^"]+)"/)?.[1];
      expect(caminho, `caminho do import de ${comp} não lido`).toBeTruthy();
      const arquivo = `${(caminho as string).replace('@/', 'src/').replace('./', 'src/')}.tsx`;
      const fonte = readFileSync(arquivo, 'utf8');
      expect(
        fonte.includes('PARAM_DE_ESPELHO'),
        `${arquivo} está em ROTAS_ESPELHADAS mas não lê PARAM_DE_ESPELHO: a rota mudaria de cor sem mudar de conteúdo`,
      ).toBe(true);
    }
  });

  it('rota que não espelha IGNORA o parâmetro', () => {
    // Sem isto, `?area=osg` pintaria OSG em qualquer tela do sistema.
    expect(resolverTemaDaRota('/equipe/tax/dashboard', '?area=osg'))
      .toEqual(resolverTemaDaRota('/equipe/tax/dashboard'));
    expect(chaveDeEspelho('/equipe/tax/dashboard', '?area=osg')).toBeNull();
  });

  it('chave desconhecida cai no tema da própria rota, sem quebrar', () => {
    expect(resolverTemaDaRota('/equipe/chamados', '?area=inventada'))
      .toEqual(resolverTemaDaRota('/equipe/chamados'));
  });

  it('sem parâmetro, a rota espelhável mantém o tema dela', () => {
    expect(resolverTemaDaRota('/equipe/chamados', '')).toEqual(resolverTemaDaRota('/equipe/chamados'));
    expect(resolverTemaDaRota('/equipe/chamados', '?ordenar=data'))
      .toEqual(resolverTemaDaRota('/equipe/chamados'));
  });

  it('cada chave leva ao tema do seu ambiente', () => {
    const tema = (chave: string) => resolverTemaDaRota('/equipe/chamados', `?${PARAM_DE_ESPELHO}=${chave}`);
    expect(tema('tax')).toEqual([CLASSE_BASE, 'tax-theme']);
    expect(tema('osg')).toEqual([CLASSE_BASE, 'osg-theme']);
  });

  /*
   * O CRITÉRIO: espelha quem tem CLIENTES.
   *
   * O espelho recorta por `tickets.cluster_id`, e esse cluster vem do cliente que
   * abriu o chamado. Então o espelho responde "chamados dos CLIENTES desta área",
   * e só faz sentido para área que tem clientes: Tax (123) e OSG (166).
   *
   * `rotina` e `dev` já estiveram aqui por passarem no critério ERRADO — eram
   * categorias válidas com cluster resolvível. Mas o Digital não tem clientes (os
   * dois vínculos são `[TESTE]`), e a Rotina é o chão comum. O sintoma foi uma
   * tela teal com "0 de 0" onde deviam estar os 354.
   *
   * Este teste é o que impede a volta. Inclui `dev` de propósito: quando vier o
   * canal de chamados INTERNOS, ele é outra tela e outro recorte — quem tentar
   * resolver acrescentando `dev` aqui quebra e lê o porquê.
   */
  it('só espelha quem tem clientes — chão comum e infraestrutura ficam fora', () => {
    for (const fora of ['rotina', 'dev', 'geral', 'mapa', 'board', 'gestao']) {
      expect(Object.keys(ESPELHO), `"${fora}" não é recorte de clientes`).not.toContain(fora);
      expect(resolverTemaDaRota('/equipe/chamados', `?${PARAM_DE_ESPELHO}=${fora}`))
        .toEqual(resolverTemaDaRota('/equipe/chamados'));
    }
  });

  it('não há duas chaves para o mesmo conteúdo', () => {
    // Era a única brecha aceita do modelo: `dev` e `rotina` apontavam para o
    // cluster Digital com temas diferentes. Saiu junto com a causa.
    const temas = Object.values(ESPELHO);
    expect(new Set(temas).size).toBe(temas.length);
  });

  /*
   * O detalhe de UM chamado não espelha, e isto é a regra outra vez.
   *
   * `/equipe/chamados/:id` mostra um chamado só — não tem escopo para filtrar,
   * logo não pode ter cor de escopo. Se o espelho vazasse para lá, a tela
   * ficaria musgo mostrando um chamado que pode ser do TAX: cor afirmando o que
   * o conteúdo não cumpre, que é exatamente o defeito que o espelhamento existe
   * para não ter. Por isso o casamento de `ROTAS_ESPELHADAS` é EXATO.
   */
  it('o espelho não vaza para o detalhe do chamado', () => {
    expect(chaveDeEspelho('/equipe/chamados/abc-123', '?area=osg')).toBeNull();
    expect(chaveDeEspelho('/equipe/chamadosX', '?area=osg')).toBeNull();
    expect(resolverTemaDaRota('/equipe/chamados/abc-123', '?area=osg'))
      .toEqual([CLASSE_BASE, 'rotina-theme']);
  });

  it('barra final não engana o casamento exato', () => {
    expect(chaveDeEspelho('/equipe/chamados/', '?area=osg')).toBe('osg');
  });
});

/*
 * A FIAÇÃO DOS MENUS, cobrada pelo build.
 *
 * O mecanismo pode estar perfeito e a tela nunca ser alcançada espelhada: basta
 * um menu apontar para a rota crua. Aí a pessoa sai da OSG, clica em Chamados e
 * cai numa tela teal com tudo — a divergência de novo, agora pela navegação.
 *
 * Esta varredura acha toda NAVEGAÇÃO para uma rota espelhável e exige que ela
 * carregue a chave. Link novo sem chave reprova.
 */
describe('espelhamento: os menus levam a chave', () => {
  /**
   * Navegações que de propósito NÃO espelham — o motivo mora JUNTO da entrada.
   *
   * É de propósito que seja um mapa e não uma lista: entrada sem motivo escrito
   * reprova no teste abaixo. Lista de exceções sem motivo é onde se esconde o
   * caso que ninguém quis resolver.
   */
  const SEM_ESPELHO_DE_PROPOSITO: Record<string, string> = {
    'src/components/equipe/EquipeLayout.tsx':
      'A Rotina é o CHÃO COMUM, não um recorte: "os chamados dos clientes da Rotina" não quer '
      + 'dizer nada, porque a Rotina não tem clientes. Daqui o link vai sem parâmetro — piso, '
      + 'lista completa, Cluster livre. Ela já esteve no ESPELHO por erro de critério (era '
      + 'categoria válida, não recorte) e o sintoma foi uma tela teal com "0 de 0" '
      + 'no lugar dos 354. Ver o bloco ESPELHO em areaTheme.ts.',
    'src/components/equipe/dev/DevLayout.tsx':
      'O espelho responde "chamados dos CLIENTES desta área", e o Digital não tem clientes: '
      + 'os dois vínculos que existem no cluster Digital são [TESTE] Pantanal Sementes e '
      + '[TESTE] Zebra de Óculos, dados de semente. Não é lacuna de dado — é recorte que não '
      + 'se aplica. O canal de chamados para clientes INTERNOS, quando vier, é outra tela e '
      + 'outro recorte, não uma chave nova nesta lista.',
  };

  function arquivosTsx(dir: string): string[] {
    const achados: string[] = [];
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const c = `${dir}/${e.name}`;
      if (e.isDirectory()) achados.push(...arquivosTsx(c));
      else if (/\.tsx$/.test(e.name) && !/\.test\.tsx$/.test(e.name)) achados.push(c);
    }
    return achados;
  }

  it('toda navegação para rota espelhável carrega a chave', () => {
    const faltando: string[] = [];
    for (const arquivo of arquivosTsx('src')) {
      if (arquivo in SEM_ESPELHO_DE_PROPOSITO) continue;
      const linhas = readFileSync(arquivo, 'utf8').split('\n');
      const fonte = linhas.join('\n');
      linhas.forEach((linha, i) => {
        const aponta = ROTAS_ESPELHADAS.some(
          (r) => linha.includes(`'${r}'`) || linha.includes(`"${r}"`),
        );
        if (!aponta) return;

        // NAVEGAÇÃO no próprio lugar: a chave tem de estar por perto. A janela
        // existe porque JSX multilinha põe a prop `espelho` numa linha vizinha.
        if (linha.includes('navigate(') || linha.includes('navigateTo=')) {
          const janela = linhas.slice(Math.max(0, i - 3), i + 4).join('\n');
          if (!janela.includes('linkEspelhado') && !janela.includes('espelho')) {
            faltando.push(`${arquivo}:${i + 1}  ${linha.trim()}`);
          }
          return;
        }

        // DADO de configuração (`path:` num array de itens de menu) não navega:
        // quem navega é o `goTo` do mesmo arquivo, e ali o `path` cru também é a
        // chave de casamento do item ativo — pôr a query nele apagaria o realce
        // do menu. Então a exigência é de ARQUIVO: alguém aqui aplica a chave.
        if (linha.includes('path:') && !fonte.includes('linkEspelhado')) {
          faltando.push(`${arquivo}:${i + 1}  ${linha.trim()}`);
        }
      });
    }
    expect(
      faltando,
      `Navegação para rota espelhável sem a chave — a tela abriria com a cor do
       ambiente ANTERIOR e a lista completa:\n${faltando.join('\n')}`,
    ).toEqual([]);
  });

  it('toda exceção carrega motivo escrito, e o arquivo existe', () => {
    // O que impede a lista de virar depósito não é um teto de tamanho — é a
    // obrigação de escrever POR QUE. Motivo curto não passa.
    for (const [arquivo, motivo] of Object.entries(SEM_ESPELHO_DE_PROPOSITO)) {
      expect(() => readFileSync(arquivo, 'utf8'), `${arquivo} não existe mais`).not.toThrow();
      expect(motivo.length, `motivo raso em ${arquivo}`).toBeGreaterThan(120);
    }
  });
});

/*
 * A GESTÃO DE CHAMADOS por área — mesma regra, outra tela.
 *
 * `ChamadosGestaoContent` vive em três rotas (Tax, OSG, Board) e cada uma pega a
 * cor da sua área pelo resolvedor. O recorte do conteúdo, porém, vinha só da RLS
 * de `tickets`, que filtra pelos clusters DA PESSOA — coincidia com a área da rota
 * para quem tem um cluster só, e não coincidia para os cinco admins, que a RLS não
 * recorta: a tela da OSG mostrava os 335 chamados do TAX em musgo.
 *
 * Correção que vale por coincidência quebra sozinha. A prop `escopo` é o que
 * amarra, e esta varredura é o que garante que um invólucro novo não nasça sem ela.
 *
 * O QUE ESTE TESTE NÃO COBRE, declarado: o comportamento em si — lista recortada,
 * cartões no escopo, select travado, vazio nomeado. `GestaoChamados.tsx` não tem
 * arquivo de teste (são 780 linhas e uma dezena de hooks a dublar), e criar esse
 * arnês é trabalho próprio. O que está coberto por teste de comportamento é a
 * mesma lógica na `EquipeChamados`, que é onde ela nasceu.
 */
describe('gestão de chamados: todo invólucro de área declara o escopo', () => {
  /** O Board é o consolidado, e o subtítulo dele diz "Chamados de todas as áreas". */
  const SEM_ESCOPO_DE_PROPOSITO: Record<string, string> = {
    'src/pages/equipe/board/BoardChamados.tsx':
      'O Board é o consolidado da empresa: mostrar todas as áreas é o que ele existe para '
      + 'fazer, e o subtítulo já diz "Chamados de todas as áreas". Cor de infraestrutura sobre '
      + 'lista de todas as áreas é par coerente — não há recorte prometido e não cumprido.',
    'src/pages/gestao/GestaoChamados.tsx':
      'O export default deste arquivo (a tela em /gestao/chamados) é CÓDIGO MORTO: App.tsx o '
      + 'importa mas nunca o monta, porque a rota /gestao/chamados é um <Navigate> para '
      + '/equipe/tax/gerencial/chamados (App.tsx:266). O que vive é o export nomeado '
      + '`ChamadosGestaoContent`, usado pelos três invólucros. Registrado como achado a decidir '
      + '(apagar ou rotear), não corrigido junto com a mudança de escopo.',
  };

  function arquivosQueMontam(): string[] {
    const achados: string[] = [];
    const varrer = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const c = `${dir}/${e.name}`;
        if (e.isDirectory()) { varrer(c); continue; }
        if (!/\.tsx$/.test(e.name) || /\.test\.tsx$/.test(e.name)) continue;
        if (readFileSync(c, 'utf8').includes('<ChamadosGestaoContent')) achados.push(c);
      }
    };
    varrer('src');
    return achados;
  }

  it('quem monta o miolo numa rota de área passa `escopo`', () => {
    const faltando: string[] = [];
    for (const arquivo of arquivosQueMontam()) {
      if (arquivo in SEM_ESCOPO_DE_PROPOSITO) continue;
      const fonte = readFileSync(arquivo, 'utf8');
      if (!/escopo=/.test(fonte)) faltando.push(arquivo);
    }
    expect(
      faltando,
      `Invólucro sem \`escopo\`: a tela pega a cor da área e mostra os chamados de TODAS —\n`
        + `o defeito que a prop existe para fechar.\n${faltando.join('\n')}`,
    ).toEqual([]);
  });

  it('todo escopo declarado é uma chave de espelho válida', () => {
    // Mesma chave, mesma disciplina: se pinta por área, filtra pela mesma chave.
    for (const arquivo of arquivosQueMontam()) {
      for (const m of readFileSync(arquivo, 'utf8').matchAll(/escopo="([^"]+)"/g)) {
        expect(Object.keys(ESPELHO), `${arquivo}: escopo "${m[1]}"`).toContain(m[1]);
      }
    }
  });

  it('a exceção do Board carrega motivo escrito', () => {
    for (const [arquivo, motivo] of Object.entries(SEM_ESCOPO_DE_PROPOSITO)) {
      expect(() => readFileSync(arquivo, 'utf8'), `${arquivo} não existe`).not.toThrow();
      expect(motivo.length, `motivo raso em ${arquivo}`).toBeGreaterThan(120);
    }
  });
});
