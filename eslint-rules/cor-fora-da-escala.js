/**
 * Classe de cor que a escala do `tailwind.config.ts` não tem.
 *
 * O DEFEITO QUE ISTO PEGA, e por que ele passou por todas as revisões.
 *
 * As cores deste projeto moram em `theme.extend.colors`. "Extend" quer dizer que
 * elas SOMAM com a paleta do Tailwind em vez de substituí-la, e daí saem dois
 * comportamentos opostos para o mesmo erro de digitar um tom que não existe:
 *
 * · Nome que só existe aqui (`osg`, `base`, `status`, `area`, `tag`…): não há
 *   Tailwind de estoque para cair, então a regra NÃO É GERADA. `text-osg-800`
 *   não pinta nada — o elemento fica com a cor que herdou, sem erro e sem
 *   aviso. Foi assim que os títulos de seção dos relatórios da OSG passaram
 *   meses sem cor própria. É a regra `cor-inexistente`, e ela é `error`.
 *
 * · Nome que existe nos DOIS (`teal`, `lime`, `gray`): o tom que falta na escala
 *   daqui é servido pelo Tailwind. `bg-teal-600` é o teal institucional;
 *   `bg-teal-100` é o teal de estoque vestindo o nome da marca. Pinta, e pinta
 *   errado — e quem lê o código vê "teal" e conclui que está no token. É a
 *   regra `cor-de-estoque`, e ela é `warn`.
 *
 * POR QUE A ESCALA É LIDA DO ARQUIVO, e não escrita aqui. Lista de tons copiada
 * à mão descreve o config do dia em que foi escrita e mente na mudança seguinte
 * — que é exatamente o defeito que esta regra existe para pegar. O parser abaixo
 * lê o `tailwind.config.ts`, e `cor-fora-da-escala.test.ts` compara o que ele
 * extrai com o config REALMENTE IMPORTADO. Se os dois discordarem, o teste
 * quebra em vez de a regra ficar cega em silêncio.
 *
 * O QUE ESTA REGRA NÃO COBRE, e é de propósito: cor crua de estoque
 * (`text-slate-500`) e hex cravado. São milhares de ocorrências, e ligá-las
 * agora seria apagão em vez de migração — a mesma razão que deixou o aviso do
 * `teal-*` em `warn` no `eslint.config.js`. Entram quando a fase delas começar;
 * o `classificar()` abaixo já tem o lugar.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));

/** Nomes que o Tailwind também tem — nestes, o tom que falta cai no de estoque. */
export const TAMBEM_NO_TAILWIND = new Set(['teal', 'lime', 'gray']);

/**
 * Os nomes e tons de `theme.extend.colors`, lidos do arquivo.
 *
 * Anda por profundidade em vez de casar um bloco por regex: `status` tem três
 * níveis (`status.feito.soft`) e um regex por nome já falhou aqui antes,
 * engolindo `osg-red` e `osg-highlighter` porque a linha deles tem comentário.
 */
export function extrairEscalas(txt) {
  const semComentario = txt.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const i = semComentario.indexOf('colors: {');
  if (i < 0) throw new Error('nao achei `colors: {` no tailwind.config.ts');
  let d = 0;
  const abre = semComentario.indexOf('{', i);
  let fim = abre;
  for (; fim < semComentario.length; fim += 1) {
    const c = semComentario[fim];
    if (c === '{') d += 1;
    else if (c === '}') { d -= 1; if (d === 0) break; }
  }
  const corpo = semComentario.slice(abre + 1, fim);

  const escalas = {};
  let prof = 0;
  let atual = null;
  for (const linha of corpo.split('\n')) {
    const chave = linha.match(/^\s*'?([A-Za-z0-9_-]+)'?\s*:/);
    const antes = prof;
    for (const c of linha) {
      if (c === '{') prof += 1;
      else if (c === '}') prof -= 1;
    }
    if (chave && antes === 0) {
      atual = chave[1];
      escalas[atual] = [];
    } else if (chave && antes === 1 && atual) {
      escalas[atual].push(chave[1]);
    }
    if (prof === 0) atual = null;
  }
  return escalas;
}

export const ESCALAS = extrairEscalas(
  readFileSync(join(AQUI, '..', 'tailwind.config.ts'), 'utf8'),
);

/** Do nome mais longo para o mais curto: `surface-escura-2` antes de `surface`. */
const NOMES = Object.keys(ESCALAS).sort((a, b) => b.length - a.length);

const UTILITARIOS = 'bg|text|border|ring|from|to|via|fill|stroke|divide|outline|placeholder|caret|decoration|shadow';
const CLASSE = new RegExp(`^(?:${UTILITARIOS})-([a-z0-9][a-z0-9-]*)$`);
/** `hover:`, `md:`, `dark:`, `data-[x]:` — não mudam a cor, só quando ela vale. */
const VARIANTE = /^[a-z][a-z0-9-]*(?:\[[^\]]*\])?:/;

/**
 * `null` se a classe está certa (ou não é classe de cor); senão o tipo do erro.
 *
 * O `-soft` do status e o `-foreground` do sidebar não são tons: são chaves
 * aninhadas. Por isso o teste do prefixo — `status-feito-soft` casa `feito`.
 */
export function classificar(bruta) {
  let classe = bruta;
  while (VARIANTE.test(classe)) classe = classe.slice(classe.indexOf(':') + 1);
  classe = classe.replace(/\/[0-9.]+$/, '');
  const m = CLASSE.exec(classe);
  if (!m) return null;
  const resto = m[1];

  for (const nome of NOMES) {
    if (resto === nome) return null;
    if (!resto.startsWith(`${nome}-`)) continue;
    const tom = resto.slice(nome.length + 1);
    /*
     * Tom vazio é PEDAÇO de classe, não classe: vem de um template com
     * interpolação — `` `bg-status-${nome}-soft` `` chega aqui como
     * `bg-status-`, porque o nó guarda só a parte estática.
     *
     * REGISTRADO, e é outro problema: o Tailwind gera o que LÊ INTEIRO no
     * fonte, então classe montada em tempo de execução não seria gerada. Hoje
     * as do `chamadoStatusColors.ts` existem no CSS porque `taskStatusColors.ts`
     * e `TaskCard.tsx` escrevem as mesmas classes por extenso — ou seja, elas
     * funcionam de carona. Se esses arquivos passarem a compor também, somem
     * juntas e em silêncio, igual às classes fora de escala. Não é o que esta
     * regra mede, e acusar o fragmento aqui só daria ruído em cima de código
     * que hoje funciona.
     */
    if (tom === '') return null;
    const tons = ESCALAS[nome];
    if (tom === 'DEFAULT' || tons.includes(tom)) return null;
    if (tons.some((t) => tom.startsWith(`${t}-`))) return null;
    return TAMBEM_NO_TAILWIND.has(nome) ? 'estoque' : 'inexistente';
  }
  // Nome que não é nosso: cor crua de estoque. Fase própria, ver o topo.
  return null;
}

/** Toda palavra de toda string literal do arquivo, com o nó onde ela apareceu. */
function visitante(context, tipoProcurado, messageId) {
  function olhar(no, texto) {
    if (!texto || !texto.includes('-')) return;
    const vistas = new Set();
    for (const bruta of texto.split(/\s+/)) {
      if (!bruta || vistas.has(bruta)) continue;
      if (classificar(bruta) !== tipoProcurado) continue;
      vistas.add(bruta);
      context.report({ node: no, messageId, data: { classe: bruta } });
    }
  }
  return {
    Literal(no) { if (typeof no.value === 'string') olhar(no, no.value); },
    TemplateElement(no) { olhar(no, no.value.cooked ?? no.value.raw ?? ''); },
  };
}

export const corInexistente = {
  meta: {
    type: 'problem',
    docs: { description: 'Classe de cor cujo tom a escala deste projeto não tem — não gera CSS' },
    schema: [],
    messages: {
      sumiu:
        'A classe `{{classe}}` NAO PINTA NADA: esse tom não existe na escala do '
        + '`tailwind.config.ts`, e o nome não é do Tailwind, então nenhuma regra é gerada e o '
        + 'elemento fica com a cor que herdou — sem erro e sem aviso. Use um tom que a escala '
        + 'tenha, ou o token semântico (`text-foreground`, `text-muted-foreground`).',
    },
  },
  create(context) { return visitante(context, 'inexistente', 'sumiu'); },
};

export const corDeEstoque = {
  meta: {
    type: 'problem',
    docs: { description: 'Tom que só o Tailwind tem, sob um nome de cor deste projeto' },
    schema: [],
    messages: {
      estoque:
        'A classe `{{classe}}` parece token da marca e não é: esse tom não está na escala daqui, '
        + 'então quem pinta é a paleta de estoque do Tailwind. As cores deste projeto ficam em '
        + '`theme.extend`, e "extend" SOMA com a do Tailwind em vez de substituir. Use um tom da '
        + 'escala (`teal-500/600/700`, `gray-50/400..900`) ou o token semântico.',
    },
  },
  create(context) { return visitante(context, 'estoque', 'estoque'); },
};

export default {
  rules: {
    'cor-inexistente': corInexistente,
    'cor-de-estoque': corDeEstoque,
  },
};
