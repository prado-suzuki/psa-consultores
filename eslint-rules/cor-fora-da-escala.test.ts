import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';
import { describe, expect, it } from 'vitest';

import tailwind from '../tailwind.config';
import {
  ESCALAS, TAMBEM_NO_TAILWIND, classificar, corInexistente, corDeEstoque,
} from './cor-fora-da-escala.js';

/*
 * O PARSER CONTRA O CONFIG DE VERDADE.
 *
 * A regra roda dentro do ESLint, que não importa TypeScript — por isso ela LÊ o
 * `tailwind.config.ts` como texto. Um parser de texto é exatamente o tipo de
 * coisa que continua rodando depois de parar de funcionar: alguém reorganiza o
 * config, o parser devolve menos tons do que existem, e a regra passa a acusar
 * classe boa (ou, pior, a calar sobre classe morta).
 *
 * Este teste importa o config DE VERDADE — o vitest resolve TypeScript — e exige
 * que os dois digam a mesma coisa. Se discordarem, quebra aqui em vez de a regra
 * ficar cega em silêncio. É a mesma trava que o `token-nao-sobrescrito.test.ts`
 * usa contra o `ui/`.
 */
describe('a escala que a regra lê é a escala que existe', () => {
  const real = (tailwind as unknown as {
    theme: { extend: { colors: Record<string, unknown> } };
  }).theme.extend.colors;

  it('os nomes de cor são exatamente os mesmos', () => {
    expect(Object.keys(ESCALAS).sort()).toEqual(Object.keys(real).sort());
  });

  it('os tons de cada nome são exatamente os mesmos', () => {
    for (const [nome, valor] of Object.entries(real)) {
      const esperado = valor && typeof valor === 'object' ? Object.keys(valor).sort() : [];
      expect(ESCALAS[nome].slice().sort(), `escala \`${nome}\``).toEqual(esperado);
    }
  });

  /*
   * Sem isto, a distinção inteira da regra desaparece: `teal`, `lime` e `gray`
   * são os nomes que o Tailwind TAMBÉM tem, e é só por isso que o tom faltante
   * neles pinta (de estoque) em vez de sumir. Se o config passar a definir uma
   * cor com outro nome do Tailwind — `blue`, digamos —, a lista precisa saber,
   * senão a regra vai chamar de "não pinta nada" algo que pinta.
   */
  it('os nomes que colidem com a paleta do Tailwind estão declarados', () => {
    const DO_TAILWIND = ['slate', 'gray', 'zinc', 'neutral', 'stone', 'red', 'orange', 'amber',
      'yellow', 'lime', 'green', 'emerald', 'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet',
      'purple', 'fuchsia', 'pink', 'rose'];
    const colidem = Object.keys(real).filter((n) => DO_TAILWIND.includes(n));
    expect(colidem.sort()).toEqual([...TAMBEM_NO_TAILWIND].sort());
  });
});

describe('classificar', () => {
  it('tom que a escala tem passa', () => {
    for (const boa of ['text-osg-700', 'bg-osg-50', 'text-osg-moss', 'bg-teal-600',
      'bg-gray-400', 'text-primary', 'bg-status-feito', 'bg-status-feito-soft',
      'text-sidebar-primary-foreground', 'bg-tag-a', 'bg-area-3', 'border-border']) {
      expect(classificar(boa), boa).toBeNull();
    }
  });

  it('tom fora de escala só nossa não pinta nada', () => {
    for (const morta of ['text-osg-800', 'text-osg-400', 'shadow-osg-900',
      'border-osg-400', 'bg-base-400']) {
      expect(classificar(morta), morta).toBe('inexistente');
    }
  });

  it('tom que só o Tailwind tem é cor de estoque com nome nosso', () => {
    for (const imp of ['bg-teal-100', 'border-gray-200', 'bg-teal-50', 'text-gray-300']) {
      expect(classificar(imp), imp).toBe('estoque');
    }
  });

  it('variante e opacidade não escondem a classe', () => {
    expect(classificar('hover:text-osg-800')).toBe('inexistente');
    expect(classificar('md:hover:text-osg-800')).toBe('inexistente');
    expect(classificar('hover:shadow-osg-900/5')).toBe('inexistente');
    expect(classificar('data-[state=open]:bg-teal-100')).toBe('estoque');
  });

  it('cor crua de estoque fica fora — é a fase seguinte, não esta regra', () => {
    for (const crua of ['text-slate-500', 'bg-amber-50', 'border-red-200']) {
      expect(classificar(crua), crua).toBeNull();
    }
  });

  /*
   * O `chamadoStatusColors.ts` monta `` `bg-status-${nome}-soft` ``, e o nó do
   * template guarda só `bg-status-`. Sem esta exceção a regra acusava seis
   * "classes que não pintam nada" em código que funciona.
   *
   * Que ele funcione é meio acidental, e vale saber: o Tailwind gera o que lê
   * inteiro no fonte, e essas classes existem no CSS porque o
   * `taskStatusColors.ts` e o `TaskCard.tsx` as escrevem por extenso. É outro
   * problema, e não o que esta regra mede.
   */
  it('pedaço de classe montada em runtime não é classe', () => {
    for (const pedaco of ['bg-status-', 'hover:bg-status-', 'text-status-', 'bg-area-']) {
      expect(classificar(pedaco), pedaco).toBeNull();
    }
  });

  it('classe que não é de cor não vira falso positivo', () => {
    for (const n of ['text-sm', 'border-2', 'shadow-md', 'from-0%', 'text-osg', 'bg-osg-canvas']) {
      expect(classificar(n), n).toBeNull();
    }
  });
});

/*
 * A VARREDURA É POR STRING, e não só por `className` em JSX. Classe de cor
 * também mora em `.ts` — mapas de status para classe, por exemplo — e foi de um
 * arquivo assim que veio parte do passivo. Um literal solto que por acaso
 * contenha `text-osg-800` seria achado de verdade, não ruído.
 */
const tester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 2022, sourceType: 'module' },
  },
});

// `RuleTester.run` cria o próprio describe/it — tem de ficar no topo.
tester.run('cor-inexistente', corInexistente as never, {
  valid: [
    { code: 'const a = <div className="text-osg-700 bg-osg-50" />;' },
    { code: 'const a = "text-slate-500";' },
    { code: 'const a = "bg-teal-100";' },
  ],
  invalid: [
    {
      code: 'const a = <h3 className="text-sm text-osg-800">oi</h3>;',
      errors: [{ messageId: 'sumiu' }],
    },
    {
      code: 'const m = { feito: "text-osg-400", parado: "text-osg-700" };',
      errors: [{ messageId: 'sumiu' }],
    },
    {
      code: 'const a = `w-full hover:shadow-osg-900/5`;',
      errors: [{ messageId: 'sumiu' }],
    },
  ],
});

tester.run('cor-de-estoque', corDeEstoque as never, {
  valid: [
    { code: 'const a = <div className="bg-teal-600" />;' },
    { code: 'const a = "text-osg-800";' },
  ],
  invalid: [
    {
      code: 'const a = <div className="border-gray-200" />;',
      errors: [{ messageId: 'estoque' }],
    },
  ],
});

/*
 * A CONTAGEM NÃO FICA ESCRITA AQUI, e sim medida. Número em teste vira mentira
 * na primeira tela nova; o que importa é que a fase 0 zerou as inexistentes e
 * que elas não voltam. Para ver onde está o passivo de `cor-de-estoque`:
 *
 *   bunx eslint src --format=compact | grep -c cor-de-estoque
 */
describe('o passivo', () => {
  it('nao existe mais classe inexistente no src', async () => {
    const { readdirSync, readFileSync, statSync } = await import('node:fs');
    const achados: string[] = [];
    const varrer = (dir: string) => {
      for (const nome of readdirSync(dir)) {
        const p = `${dir}/${nome}`;
        if (statSync(p).isDirectory()) varrer(p);
        else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) {
          // Comentário fora: o `paletaDeArea.ts` explica os tons de tag escrevendo
          // `bg-tag-x` como marcador, e prosa não pinta tela. A regra de verdade
          // só olha string literal; aqui a varredura é grosseira de propósito
          // (pega `.ts` e `.tsx` inteiros), então o comentário precisa sair.
          const codigo = readFileSync(p, 'utf8')
            .replace(/\/\*[\s\S]*?\*\//g, ' ')
            .replace(/^\s*\/\/.*$/gm, ' ');
          for (const palavra of codigo.split(/[\s"'`]+/)) {
            if (classificar(palavra) === 'inexistente') achados.push(`${p}: ${palavra}`);
          }
        }
      }
    };
    varrer('src');
    expect(achados, 'classe que nao gera CSS voltou ao src').toEqual([]);
  });
});
