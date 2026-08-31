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
    // O Digital é área de NEGÓCIO e veste a marca, como a Rotina — que é a maior
    // parte dele. As três rotas da área ficam no piso; o grafite sobrou para o
    // Dev, que serve o sistema.
    expect(resolverTemaDaRota('/equipe/acessos')).toEqual([CLASSE_BASE]);
    expect(resolverTemaDaRota('/equipe/digital')).toEqual([CLASSE_BASE]);
    expect(resolverTemaDaRota('/equipe/digital/mapa/processos')).toEqual([CLASSE_BASE]);
  });

  it('/equipe/chamados é Rotina, não uma área chamada "chamados"', () => {
    expect(areaDaRota('/equipe/chamados')).toBe('rotina');
    expect(areaDaRota('/equipe/chamados/123')).toBe('rotina');
    // A Rotina é a casa: responde 'rotina' e fica no piso, sem classe própria.
    expect(resolverTemaDaRota('/equipe/chamados')).toEqual([CLASSE_BASE]);
  });

  it('/equipe/kanban é Rotina — a palavra "rotina" não aparece na URL', () => {
    expect(areaDaRota('/equipe/kanban')).toBe('rotina');
    expect(resolverTemaDaRota('/equipe/kanban')).toEqual([CLASSE_BASE]);
    // E o inverso: nenhuma rota da área traz o segmento que a nomeia. Note que
    // `/equipe/rotinas` (plural, a tela de rotinas) não conta — o segmento dela
    // é "rotinas", e é coincidência de vocabulário, não o nome da área.
    const comSegmentoRotina = MAPA_DE_ROTAS
      .filter((r) => r.area === 'rotina')
      .filter((r) => r.prefixo.split('/')[2] === 'rotina');
    expect(comSegmentoRotina).toEqual([]);
  });

  /*
   * A Rotina é a CASA, e por isso NÃO tem classe própria.
   *
   * Até 29/08/2026 existia uma `.rotina-theme` no `index.css`. Ela declarava o
   * contrato inteiro com os valores exatos do `.base-theme` — um bloco cujo
   * conteúdo era "copie o piso". A âncora da Rotina é a da casa, o teal da
   * marca, e é o que o piso já pinta: a área não tem delta a declarar.
   *
   * Este teste é o que impede o bloco de voltar pela lateral. Se alguém puser
   * `rotina: 'rotina-theme'` de novo, o certo é que quebre aqui e a pessoa tenha
   * de responder qual cor a Rotina passou a ter que a casa não tem.
   */
  it('a Rotina não tem classe própria — a âncora dela é a do piso', () => {
    expect(TEMA_DA_AREA.rotina).toBeNull();
    for (const rota of MAPA_DE_ROTAS.filter((r) => r.area === 'rotina')) {
      expect(resolverTemaDaRota(rota.prefixo), rota.prefixo).toEqual([CLASSE_BASE]);
    }
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

  /*
   * O Dev é ÁREA, e desde 31/08/2026 fica no piso — as duas coisas ao mesmo
   * tempo, e é isso que este teste trava.
   *
   * A `.sistema-theme` vestiu as 27 rotas de `/equipe/dev` com um acento grafite
   * quente. Saiu por medição, não por gosto: o `/equipe/dev/uso-envio` usa os
   * tokens `--bd-*` do design system do Board, e dois deles (`--bd-accent-d`,
   * que pinta LETRA, e `--bd-accent-soft`) estão cravados em teal no `:root` —
   * não seguem o `--primary`. Com o grafite, a mesma tabela saía com link e chip
   * teal ao lado de hover e anel de foco grafite. É o defeito de 21/08 (Board) e
   * o de 31/08 (Digital) pela terceira vez.
   *
   * A REGRA "a quem a tela serve" continua de pé — ela só deixou de pintar. Por
   * isso `areaDaRota` ainda responde 'sistema': quem for dar cor ao Dev de novo
   * encontra a área já nomeada, e encontra no `TEMA_DA_AREA` o aviso de que o
   * acento sozinho não resolve.
   */
  it('o Dev é área ("sistema") e fica no piso — sem grafite', () => {
    expect(TEMA_DA_AREA.sistema).toBeNull();
    for (const rota of rotasDoApp()) {
      if (rota.startsWith('/equipe/dev')) {
        expect(areaDaRota(rota)).toBe('sistema');
        expect(resolverTemaDaRota(rota)).toEqual([CLASSE_BASE]);
      }
    }
  });

  /*
   * O Board SAIU da infraestrutura em 21/08/2026 e PERDEU a classe própria em
   * 31/08 — as duas mudanças vão na mesma direção, não em direções opostas.
   *
   * O grafite ali produzia quatro famílias na mesma tela: cartão, gráfico e
   * barra lateral no teal do design system próprio do Board (`--bd-*`), e todo
   * botão, select e anel de foco no grafite — mais os módulos compartilhados
   * que o Board hospeda (Capacidade, Clientes) inteiros em grafite sobre
   * superfície marfim. Quem viu foi a usuária, olhando a tela. A saída foi a
   * `.board-theme`, um delta de acento e superfície.
   *
   * Em 31/08 esse delta virou o piso: as superfícies dele foram MOVIDAS para o
   * `.base-theme` e a `.board-theme` saiu do `index.css`. A âncora do Board é a
   * da casa — diretoria olha a empresa, não uma área dela —, e área cuja âncora
   * é a do piso não tem delta a declarar. É a mesma regra que apagou a
   * `.rotina-theme` em 29/08, aplicada no outro sentido: lá a área desceu para o
   * piso, aqui o piso subiu para a área.
   *
   * O que este teste trava, e é o que importa: o Board segue sendo uma ÁREA
   * (`areaDaRota` responde 'board'), e não passa a vestir o grafite por ter
   * ficado sem classe. Se alguém recriar a `.board-theme`, quebra aqui e tem de
   * responder que cor o Board passou a ter que a casa não tem.
   */
  it('o Board é a casa: área de negócio, sem classe própria e sem grafite', () => {
    expect(TEMA_DA_AREA.board).toBeNull();
    for (const rota of rotasDoApp()) {
      if (rota.startsWith('/equipe/board')) {
        expect(areaDaRota(rota)).toBe('board');
        expect(resolverTemaDaRota(rota)).toEqual([CLASSE_BASE]);
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

  /*
   * O `/cliente` está no MAPA, e a linha não muda comportamento nenhum — sem
   * ela a rota cairia em `base` do mesmo jeito. Ela existe para separar "é a
   * casa por decisão" de "ninguém mapeou ainda", e sem este teste seria a
   * primeira coisa que uma limpeza apagaria por parecer redundante.
   *
   * O Portal do Cliente é a tela do cliente da PSA: veste o teal institucional
   * porque essa é a identidade dele. No dia em que ganhar cor própria, é a linha
   * do mapa que muda — e é lá que se procura.
   */
  it('o Portal do Cliente é a casa POR DECISÃO, não por falta de mapa', () => {
    const noMapa = MAPA_DE_ROTAS.find((r) => r.prefixo === '/cliente');
    expect(noMapa, 'a linha { prefixo: /cliente } sumiu do MAPA_DE_ROTAS').toBeDefined();
    expect(noMapa?.area).toBe('base');
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
    //
    // O lime é fixado porque É o defeito — some no dia em que o `:root` for
    // corrigido, e aí este teste tem que cair. O `--primary` NÃO é fixado: ele
    // já foi `175 82% 29%` e hoje é o `--teal-600`, e prender o valor aqui
    // fazia este teste quebrar a cada troca legítima do teal, dizendo "o lime
    // sumiu" quando nada disso tinha acontecido. O que ele precisa afirmar é
    // que os dois DIVERGEM, e é isso que ele afirma.
    const ring = valorComputado([], '--ring');
    const primary = valorComputado([], '--primary');
    expect(ring).toBe('85 85% 37%');
    expect(primary).not.toBeNull();
    expect(primary).not.toBe(ring);
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

  it('o contrato tem as 50 variáveis', () => {
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
    // +2 `--accent-d` e `--accent-soft` (31/08/2026). Os degraus do acento
    //    viviam cravados no bloco `--bd-*` do `:root`, com o valor da CASA, e a
    //    Tax e a OSG desviavam num bloco separado. Um tema novo herdava o teal
    //    da casa no token que pinta LETRA — e sem erro nenhum.
    // +2 `--border` e `--input` (31/08/2026), o pior dos casos: viviam SÓ no
    //    `:root`, em bege quente, e NENHUM tema os declarava. A borda dos
    //    controles saía bege em toda rota, inclusive sobre superfície fria, e o
    //    `--bd-line` do Board era frio na casa e bege na Tax e na OSG — mesmo
    //    token, duas temperaturas, dependendo da rota.
    //
    // O padrão dos quatro últimos é o mesmo, e é o que este número protege:
    // token que nenhum tema declara não quebra nada visível, só acumula
    // divergência em silêncio. Entrar no contrato é o que faz um tema novo ser
    // OBRIGADO a responder.
    expect(contrato.size).toBe(50);
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
   * · CONGELADO — declara o contrato inteiro. São os que existiam quando o piso
   *   ainda ia mudar de identidade: uma mudança no base os repintaria em
   *   silêncio, e congelar cortou esse fio. A `.rotina-theme` foi um deles até
   *   29/08/2026, quando se viu que o congelado dela era o piso inteiro sem uma
   *   diferença — aí o bloco saiu, e a Rotina passou a ficar no piso de fato.
   *
   * · DELTA — declara só o que difere. Nasce DEPOIS do piso estar estável, e o
   *   que ele herda (superfícies, texto, papéis de status, tags) ele quer
   *   herdar mesmo. Copiar 34 valores só para mantê-los iguais seria ruído, e
   *   ruído que sai de sincronia na primeira mudança do piso.
   *
   * O que o teste cobra de cada um é diferente, e é o ponto deste bloco.
   */
  const CONGELADOS = ['tax-theme', 'osg-theme'];
  /*
   * NÃO HÁ DELTA HOJE, e a lista fica vazia em vez de sumir: a categoria segue
   * válida e é o que a próxima área vai usar. Houve dois, e os dois saíram em
   * 31/08/2026:
   *
   * · `.board-theme` declarava acento e superfície e herdava papéis de status e
   *   tons de tag. Saiu porque as superfícies dela viraram as do PISO — a âncora
   *   do Board é a da casa. O acento nem chegou a se mover: os
   *   `--primary/--secondary/--accent/--ring` que ela declarava já eram, um a
   *   um, os mesmos do `.base-theme`.
   * · `.sistema-theme` declarava o acento grafite do Dev. Saiu por medição: o
   *   `/equipe/dev/uso-envio` usa os `--bd-*`, e dois deles estão cravados em
   *   teal no `:root` — a tela saía metade teal, metade grafite.
   *
   * O teste abaixo continua sendo o que importa: um tema classificado como delta
   * não pode inventar variável fora do contrato.
   */
  const DELTAS: string[] = [];

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

  // Laço em vez de `it.each`: a lista está VAZIA hoje, e `it.each([])` é erro de
  // coleta no vitest. Assim o caso continua escrito e volta a valer sozinho no
  // dia em que uma área nova entrar em `DELTAS`, sem ninguém lembrar disto.
  it('todo tema DELTA declara um subconjunto do contrato, sem inventar variável', () => {
    for (const classe of DELTAS) {
      const declaradas = [...declaradasEm(css, `.${classe}`)];
      // Não se cobra completude — cobra-se que não invente variável. Um
      // `--primry` com erro de digitação não quebraria nada visível: a regra
      // simplesmente não valeria, e a tela ficaria com a cor do piso.
      const forasteiras = declaradas.filter((v) => !contrato.has(v));
      expect(forasteiras, `.${classe} declara fora do contrato: ${forasteiras.join(', ')}`).toEqual([]);
      expect(declaradas.length, `.${classe}`).toBeGreaterThan(0);
      expect(declaradas.length, `.${classe}`).toBeLessThan(contrato.size);
    }
  });

  /*
   * As classes que o resolvedor aplica são EXATAMENTE as classificadas aqui.
   *
   * Sem isto, apagar um bloco do `index.css` e esquecer de tirar a linha de
   * `CONGELADOS`/`DELTAS` passaria batido — a lista viraria ficção. Foi o risco
   * real de 31/08, quando dois blocos saíram no mesmo dia.
   */
  it('a classificação cobre as classes aplicadas, e nada além delas', () => {
    const aplicadas = new Set(
      Object.values(TEMA_DA_AREA).filter((c): c is string => c !== null),
    );
    expect([...aplicadas].sort()).toEqual([...CONGELADOS, ...DELTAS].sort());
  });

  it('--tool-icon segue o acento local, em vez de ser congelado', () => {
    // Congelar o valor aqui quebraria o ícone de ferramenta: ele DEVE andar
    // junto com o `--primary` da área que o hospeda. Congela-se o alvo.
    for (const classe of [CLASSE_BASE, 'tax-theme']) {
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
    // Cai no tema próprio da rota, que é o da Rotina — ou seja, o piso.
    expect(resolverTemaDaRota('/equipe/chamados/abc-123', '?area=osg'))
      .toEqual([CLASSE_BASE]);
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
  };

  /*
   * POR QUE A DESCOBERTA É POR IMPORT, E NÃO PELO TEXTO DA TAG.
   *
   * A versão anterior procurava a string `<ChamadosGestaoContent` nos `.tsx`.
   * Isso tem um modo de falha silencioso: renomear o componente, envolvê-lo, ou
   * passá-lo por variável esvazia a varredura — e uma varredura vazia faz TODAS
   * as asserções abaixo passarem sem verificar nada. A guarda desapareceria
   * junto com o alvo, sem nenhum teste falhar.
   *
   * Agora o vínculo é o MÓDULO, que é o que uma refatoração de UI não muda por
   * acidente: quem importa de `pages/gestao/GestaoChamados` está montando aquela
   * tela. E três invariantes fecham o resto: o módulo tem que continuar
   * exportando o símbolo, a varredura não pode vir vazia, e todo arquivo citado
   * na exceção tem que ser encontrado por ela.
   */
  const MODULO_LISTA = 'src/pages/gestao/GestaoChamados.tsx';
  const SIMBOLO_LISTA = 'ChamadosGestaoContent';
  const MODULO_DETALHE = 'src/pages/gestao/GestaoDetalhesChamado.tsx';
  const SIMBOLO_DETALHE = 'ChamadoDetalheContent';

  function arquivosDoSrc(): string[] {
    const achados: string[] = [];
    const varrer = (dir: string) => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const c = `${dir}/${e.name}`;
        if (e.isDirectory()) { varrer(c); continue; }
        if (!/\.tsx$/.test(e.name) || /\.test\.tsx$/.test(e.name)) continue;
        achados.push(c);
      }
    };
    varrer('src');
    return achados;
  }

  /** Quem IMPORTA o símbolo — por caminho de módulo, não por texto de tag. */
  function arquivosQueMontam(modulo: string, simbolo: string): string[] {
    // `src/pages/gestao/GestaoChamados.tsx` -> `pages/gestao/GestaoChamados`
    const semExt = modulo.replace(/^src\//, '').replace(/\.tsx$/, '');
    const arquivo = semExt.split('/').pop()!;
    return arquivosDoSrc().filter((c) => {
      if (c === modulo) return false; // o próprio dono não se monta
      const fonte = readFileSync(c, 'utf8');
      // aceita alias (@/pages/...) e relativo (../gestao/..., ./...)
      const importa = new RegExp(
        String.raw`import\s*\{[^}]*\b${simbolo}\b[^}]*\}\s*from\s*['"](?:@/${semExt}|[^'"]*/${arquivo})['"]`,
      );
      return importa.test(fonte);
    });
  }

  it('o módulo da lista continua exportando o símbolo que a guarda persegue', () => {
    // Se este teste falhar, a guarda inteira ficou sem alvo. Renomear o símbolo
    // é legítimo — mas exige atualizar SIMBOLO_LISTA aqui, de propósito.
    const fonte = readFileSync(MODULO_LISTA, 'utf8');
    expect(
      new RegExp(String.raw`export\s+(?:function|const)\s+${SIMBOLO_LISTA}\b`).test(fonte),
      `${MODULO_LISTA} não exporta mais \`${SIMBOLO_LISTA}\`. Se foi renomeado de propósito, `
        + 'atualize SIMBOLO_LISTA neste teste — não deixe a varredura sem alvo.',
    ).toBe(true);
  });

  it('a varredura não vem vazia, e acha todo arquivo citado na exceção', () => {
    // As duas metades do modo de falha silencioso. Sem elas, uma varredura que
    // não acha nada faz os testes seguintes passarem sem verificar nada.
    const montam = arquivosQueMontam(MODULO_LISTA, SIMBOLO_LISTA);
    expect(
      montam.length,
      'Nenhum arquivo monta a lista de chamados. Ou o import mudou de forma, ou a '
        + 'varredura quebrou — nos dois casos as asserções abaixo passariam vazias.',
    ).toBeGreaterThan(0);

    for (const arquivo of Object.keys(SEM_ESCOPO_DE_PROPOSITO)) {
      expect(
        montam,
        `${arquivo} está na exceção mas a varredura não o encontra: a exceção virou `
          + 'letra morta e a tela saiu do radar sem nenhum teste falhar.',
      ).toContain(arquivo);
    }
  });

  it('quem monta o miolo numa rota de área passa `escopo`', () => {
    const faltando: string[] = [];
    for (const arquivo of arquivosQueMontam(MODULO_LISTA, SIMBOLO_LISTA)) {
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
    for (const arquivo of arquivosQueMontam(MODULO_LISTA, SIMBOLO_LISTA)) {
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

  /*
   * O DETALHE DO CHAMADO — `/equipe/board/chamados/:id` e as duas irmãs.
   *
   * Estava fora do alcance da varredura, e por um motivo real: o
   * `ChamadoDetalheContent` NÃO tem prop `escopo`, nem no Board nem na Tax nem na
   * OSG. Ele mostra UM registro, recortado pelo `:id` e pela RLS de `tickets` —
   * não existe lista para recortar errado, então exigir `escopo` dele seria
   * inventar uma regra que o componente não tem.
   *
   * O invariante que ELE tem é outro, e é o defeito que a rota existe para
   * fechar (está escrito nos três arquivos): o `listaPath` tem que apontar para a
   * lista DA MESMA ÁREA. Errar isso é o "Ver" jogar a pessoa para outra área no
   * meio do fluxo — foi assim que o detalhe caía em `/gestao/chamados/:id` e a
   * barra lateral trocava para a do Marketing.
   *
   * A checagem usa o próprio `areaDaRota`, então ela acompanha o mapa de rotas
   * sozinha em vez de repetir a lista de áreas aqui.
   */
  describe('detalhe do chamado: o caminho de volta não troca de área', () => {
    /** As rotas do App.tsx, sem as que estão dentro de comentário de bloco. */
    function rotasAtivasPorComponente(): Map<string, string[]> {
      const app = readFileSync('src/App.tsx', 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
      const mapa = new Map<string, string[]>();
      for (const m of app.matchAll(/<Route\s+path="([^"]+)"([\s\S]*?)\/>/g)) {
        for (const c of m[2].matchAll(/<(\w+)/g)) {
          const lista = mapa.get(c[1]) ?? [];
          lista.push(m[1]);
          mapa.set(c[1], lista);
        }
      }
      return mapa;
    }

    it('o módulo do detalhe continua exportando o símbolo', () => {
      const fonte = readFileSync(MODULO_DETALHE, 'utf8');
      expect(
        new RegExp(String.raw`export\s+(?:function|const)\s+${SIMBOLO_DETALHE}\b`).test(fonte),
        `${MODULO_DETALHE} não exporta mais \`${SIMBOLO_DETALHE}\` — atualize SIMBOLO_DETALHE.`,
      ).toBe(true);
    });

    it('a varredura do detalhe não vem vazia', () => {
      expect(
        arquivosQueMontam(MODULO_DETALHE, SIMBOLO_DETALHE).length,
        'Nenhum arquivo monta o detalhe do chamado — varredura sem alvo.',
      ).toBeGreaterThan(0);
    });

    it('todo invólucro passa `listaPath`, e ele é uma rota ativa do App.tsx', () => {
      const rotas = new Set(
        [...readFileSync('src/App.tsx', 'utf8')
          .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
          .matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]),
      );
      for (const arquivo of arquivosQueMontam(MODULO_DETALHE, SIMBOLO_DETALHE)) {
        const fonte = readFileSync(arquivo, 'utf8');
        const m = /listaPath="([^"]+)"/.exec(fonte);
        expect(m, `${arquivo} monta o detalhe sem \`listaPath\`: o "Voltar" cai fora da área.`)
          .not.toBeNull();
        expect(rotas, `${arquivo}: listaPath "${m![1]}" não é rota ativa do App.tsx`)
          .toContain(m![1]);
      }
    });

    it('o `listaPath` fica na MESMA área da rota que monta o detalhe', () => {
      const porComponente = rotasAtivasPorComponente();
      const divergentes: string[] = [];

      for (const arquivo of arquivosQueMontam(MODULO_DETALHE, SIMBOLO_DETALHE)) {
        const fonte = readFileSync(arquivo, 'utf8');
        const lista = /listaPath="([^"]+)"/.exec(fonte)?.[1];
        if (!lista) continue; // já reprovado no teste acima
        const componente = arquivo.split('/').pop()!.replace(/\.tsx$/, '');
        const rotasDele = porComponente.get(componente) ?? [];
        expect(
          rotasDele.length,
          `${componente} monta o detalhe mas não aparece em nenhuma rota ativa do App.tsx`,
        ).toBeGreaterThan(0);

        for (const rota of rotasDele) {
          const areaDaTela = areaDaRota(rota);
          const areaDaVolta = areaDaRota(lista);
          if (areaDaTela !== areaDaVolta) {
            divergentes.push(
              `${arquivo}: rota ${rota} é "${areaDaTela}", mas listaPath ${lista} é "${areaDaVolta}"`,
            );
          }
        }
      }

      expect(
        divergentes,
        'Detalhe do chamado apontando para a lista de OUTRA área — o "Voltar" troca a cor e a '
          + `barra lateral no meio do fluxo:\n${divergentes.join('\n')}`,
      ).toEqual([]);
    });
  });
});
