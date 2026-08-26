import { readFileSync, readdirSync } from 'node:fs';
import { RuleTester } from 'eslint';
import parser from '@typescript-eslint/parser';
import { describe, expect, it } from 'vitest';

import { TOKEN_DO_COMPONENTE, CRU, regra } from './token-nao-sobrescrito.js';

/*
 * O MAPA CONTRA A REALIDADE.
 *
 * A regra depende de saber que token cada componente do `ui/` traz. Se alguém
 * mudar o `ui/` e o mapa não acompanhar, a regra passa a descrever um estado que
 * não existe mais — que é exatamente o defeito que ela existe para pegar. Este
 * teste é o que impede a regra de cair na própria armadilha.
 *
 * A derivação aqui repete a do gerador de propósito: se as duas discordarem, uma
 * das duas está errada e o teste quebra em vez de escolher no escuro.
 */
const TOKENS = ['foreground', 'background', 'card', 'card-foreground', 'popover',
  'popover-foreground', 'primary', 'primary-foreground', 'secondary', 'secondary-foreground',
  'muted', 'muted-foreground', 'accent', 'accent-foreground', 'destructive',
  'destructive-foreground', 'border', 'input', 'ring', 'canvas', 'success', 'warning'];
const TOK = new RegExp(`^(text|bg|border|divide|ring|placeholder)-(?:${TOKENS.join('|')})(?:/[0-9.]+)?$`);

function derivarDoUi(): Record<string, Record<string, string>> {
  const mapa: Record<string, Record<string, string>> = {};
  for (const arquivo of readdirSync('src/components/ui')) {
    if (!arquivo.endsWith('.tsx')) continue;
    const txt = readFileSync(`src/components/ui/${arquivo}`, 'utf8');
    const decls: { nome: string; pos: number }[] = [];
    for (const m of txt.matchAll(/(?:^|\n)\s*(?:const|function)\s+([A-Z][A-Za-z0-9]*)\s*[=:(]/g)) {
      decls.push({ nome: m[1], pos: m.index as number });
    }
    decls.sort((a, b) => a.pos - b.pos);
    for (const m of txt.matchAll(/\b(?:cn|cva)\(\s*"([^"]+)"/g)) {
      const pos = m.index as number;
      let dono: string | null = null;
      for (const d of decls) { if (d.pos < pos) dono = d.nome; else break; }
      if (!dono) continue;
      for (const c of m[1].split(/\s+/)) {
        if (!TOK.test(c)) continue;
        mapa[dono] = mapa[dono] ?? {};
        mapa[dono][c.split('-')[0]] = c;
      }
    }
  }
  return mapa;
}

describe('o mapa acompanha o ui/', () => {
  it('declara exatamente os componentes que trazem token', () => {
    const real = derivarDoUi();
    const noMapa = Object.keys(TOKEN_DO_COMPONENTE).sort();
    const noUi = Object.keys(real).sort();
    expect(
      noMapa,
      'Componente do ui/ passou a trazer (ou deixou de trazer) token e o mapa da regra não '
      + 'acompanhou. Regenere o mapa em eslint-rules/token-nao-sobrescrito.js.',
    ).toEqual(noUi);
  });

  it('cada componente aponta o token certo em cada propriedade', () => {
    const real = derivarDoUi();
    for (const [nome, props] of Object.entries(real)) {
      expect(TOKEN_DO_COMPONENTE[nome as keyof typeof TOKEN_DO_COMPONENTE], nome).toEqual(props);
    }
  });

  /*
   * Guarda dos casos que motivaram a regra. Se um destes sair do mapa, o defeito
   * volta a passar sem aviso — e foram estes seis que a Etapa 2 encontrou.
   */
  it('os seis da Etapa 2 continuam cobertos', () => {
    expect(TOKEN_DO_COMPONENTE.Card.bg).toBe('bg-card');
    expect(TOKEN_DO_COMPONENTE.CardDescription.text).toBe('text-muted-foreground');
    expect(TOKEN_DO_COMPONENTE.TableHead.text).toBe('text-muted-foreground');
    expect(TOKEN_DO_COMPONENTE.DialogDescription.text).toBe('text-muted-foreground');
    expect(TOKEN_DO_COMPONENTE.Input.bg).toBe('bg-background');
    expect(TOKEN_DO_COMPONENTE.SelectTrigger.bg).toBe('bg-background');
  });
});

describe('o que conta como cor crua', () => {
  it('aceita as famílias do Tailwind, white e black', () => {
    for (const c of ['bg-white', 'text-slate-500', 'border-gray-300', 'bg-black',
      'text-red-600', 'bg-emerald-50', 'border-teal-500', 'bg-white/80']) {
      expect(CRU.test(c), c).toBe(true);
    }
  });

  it('não confunde token com cor crua', () => {
    for (const c of ['bg-card', 'text-muted-foreground', 'border-border', 'bg-muted/60',
      'text-foreground', 'bg-primary', 'border-input']) {
      expect(CRU.test(c), c).toBe(false);
    }
  });

  it('não casa classe que só CONTÉM o nome de uma família', () => {
    // `translate-y-1/2` contém "slate-". Foi falso positivo real numa conferência.
    for (const c of ['-translate-y-1/2', 'translate-x-full', 'text-sm', 'bg-[url(x)]']) {
      expect(CRU.test(c), c).toBe(false);
    }
  });
});

const tester = new RuleTester({
  languageOptions: {
    parser,
    parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 2022, sourceType: 'module' },
  },
});

// `RuleTester.run` cria o próprio describe/it — tem de ficar no topo.
tester.run('token-nao-sobrescrito', regra as never, {
  valid: [
    // propriedade diferente da que o componente traz: composição normal
    { code: '<Card className="border-2 p-4" />' },
    // sobrescrita para outro TOKEN: escolha de hierarquia
    { code: '<CardDescription className="text-foreground" />' },
    { code: '<Card className="bg-destructive/5" />' },
    // variante pinta outro ESTADO, não o base
    { code: '<Card className="hover:bg-slate-50" />' },
    { code: '<Card className="dark:bg-slate-800" />' },
    // componente que não traz token na propriedade
    { code: '<CardTitle className="text-slate-900" />' },
    // o ui/ é o dono do padrão; a config o exclui, e sem className não há caso
    { code: '<Card />' },
    // classe vinda de variável: a regra não lê, e não acusa no escuro
    { code: '<Card className={classes} />' },
  ],
  invalid: [
    // o caso dominante: 229 dos 416
    { code: '<Card className="bg-white shadow-sm" />', errors: 1 },
    // o que a Etapa 2 chamou de regressão, não redundância
    { code: '<CardDescription className="text-slate-500" />', errors: 1 },
    { code: '<TableHead className="text-slate-600 bg-muted" />', errors: 1 },
    // duas propriedades do mesmo componente, dois avisos
    { code: '<SelectTrigger className="bg-white border-slate-200" />', errors: 2 },
    // dentro de cn(), e dentro de ternário
    { code: '<Card className={cn("bg-white", x && "p-2")} />', errors: 1 },
    { code: '<Card className={a ? "bg-white" : "bg-gray-100"} />', errors: 2 },
    // template literal
    { code: '<Input className={`bg-white ${x}`} />', errors: 1 },
  ],
});
