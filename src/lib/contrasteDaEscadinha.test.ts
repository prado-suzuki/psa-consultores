import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * O contraste do cotovelo e do fio da escadinha da Lista, medido.
 *
 * Existe porque este defeito já apareceu quatro vezes neste repositório, sempre
 * do mesmo jeito: alguém pinta uma linha estrutural com o token `--border`,
 * ninguém confere o contraste, e o elemento fica invisível sem que nada falhe.
 * Em 09/09/2026 o cotovelo que liga a subtarefa à mãe dava **1,25:1** sobre a
 * superfície branca da tarefa — "esse cantinho tá muito claro, não consigo
 * enxergar".
 *
 * O piso é 3:1, que é o que a WCAG pede para elemento gráfico que CARREGA
 * informação, e o cotovelo carrega: é ele que diz de que linha esta desce. O fio
 * vertical é contexto e só precisa ser perceptível — mas tem de ficar abaixo do
 * cotovelo, senão os dois competem e nenhum informa.
 *
 * Por que o teste lê o fonte: a opacidade mora numa classe do Tailwind, então
 * não há função para chamar. Ler a classe é o que trava o número.
 */

const ler = (caminhoRelativo: string) =>
  readFileSync(fileURLToPath(new URL(caminhoRelativo, import.meta.url)), 'utf8');

/** `--muted-foreground` da área Tax, de `index.css`. */
const TINTA = { h: 185, s: 8, l: 40.5 };
const BRANCO = { r: 255, g: 255, b: 255 };

function hslParaRgb({ h, s, l }: { h: number; s: number; l: number }) {
  const sn = s / 100;
  const ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = ln - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0]
    : h < 120 ? [x, c, 0]
    : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c]
    : h < 300 ? [x, 0, c]
    : [c, 0, x];
  return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
}

/** A cor com `alpha` composta sobre a superfície branca do cartão de tarefa. */
function sobreBranco(cor: { r: number; g: number; b: number }, alpha: number) {
  return {
    r: cor.r * alpha + 255 * (1 - alpha),
    g: cor.g * alpha + 255 * (1 - alpha),
    b: cor.b * alpha + 255 * (1 - alpha),
  };
}

function luminancia({ r, g, b }: { r: number; g: number; b: number }) {
  const canal = (v: number) => {
    const n = v / 255;
    return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

function contraste(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  const [alto, baixo] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (alto + 0.05) / (baixo + 0.05);
}

const contrasteDaTinta = (alpha: number) =>
  contraste(sobreBranco(hslParaRgb(TINTA), alpha), BRANCO);

/** A opacidade que a classe `border-muted-foreground/NN` declara no fonte. */
function opacidadeNoFonte(fonte: string, depoisDe: string): number {
  const trecho = fonte.slice(fonte.indexOf(depoisDe));
  const achado = trecho.match(/border-muted-foreground\/(\d+)/);
  if (!achado) throw new Error(`não achei a opacidade depois de "${depoisDe}"`);
  return Number(achado[1]) / 100;
}

describe('a escadinha da Lista se enxerga', () => {
  const fonte = ler('../components/equipe/tarefas/ProjetosTarefasList.tsx');

  it('o cotovelo carrega informação, então passa dos 3:1 da WCAG', () => {
    const alpha = opacidadeNoFonte(fonte, 'function CotoveloDaFilha');
    const medido = contrasteDaTinta(alpha);

    // A 70% dá 2,90:1 e NÃO passa — foi a primeira tentativa deste conserto, e
    // é por isso que o número está travado e não a intenção.
    expect(medido).toBeGreaterThanOrEqual(3);
  });

  it('o fio é contexto: perceptível, e abaixo do cotovelo', () => {
    const fio = contrasteDaTinta(opacidadeNoFonte(fonte, 'function LevelGuide'));
    const cotovelo = contrasteDaTinta(opacidadeNoFonte(fonte, 'function CotoveloDaFilha'));

    // `border/60` sobre o `--border` de 89% de luminosidade dava 1,14:1, que não
    // é linha, é nada.
    expect(fio).toBeGreaterThanOrEqual(1.6);
    // Se os dois pesarem igual, nenhum informa: o olho não sabe qual seguir.
    expect(cotovelo).toBeGreaterThan(fio * 2);
  });

  // Não há um terceiro teste cobrando "não use `border-border`": o
  // `opacidadeNoFonte` acima já não encontra opacidade nenhuma se a classe
  // deixar de ser `border-muted-foreground/NN`, e falha com o motivo escrito.
});
