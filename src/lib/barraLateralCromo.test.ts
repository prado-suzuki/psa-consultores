import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { FACE_DA_BARRA, classesEyebrowDaBarra, classesItemDaBarra } from './barraLateralCromo';

const ler = (caminhoRelativo: string) =>
  readFileSync(fileURLToPath(new URL(caminhoRelativo, import.meta.url)), 'utf8');

describe('o item ativo é pílula cheia, não tinta de 10%', () => {
  it('ativo pinta o fundo com a âncora da área e a letra com o par dela', () => {
    // Por CLASSE, não por texto: em Tailwind o hífen é fronteira de palavra,
    // então `bg-primary` casa dentro de `bg-primary/10` e `text-primary`
    // dentro de `text-primary-foreground`. Os dois enganos aconteceram aqui.
    const classes = classesItemDaBarra({ ativo: true, trilho: false }).split(/\s+/);

    expect(classes).toContain('bg-primary');
    expect(classes).toContain('text-primary-foreground');
    // A tinta de 10% com letra colorida é o que as outras oito faziam, e é o
    // que esta frente substitui.
    expect(classes).not.toContain('bg-primary/10');
    expect(classes).not.toContain('text-primary');
  });

  it('inativo não pinta fundo nenhum e usa a letra do tema', () => {
    const inativo = classesItemDaBarra({ ativo: false, trilho: false });

    expect(inativo).toContain('text-foreground');
    expect(inativo).not.toContain('bg-primary');
  });
});

describe('só uma pílula acende por vez', () => {
  // Tax, OSG e Dev têm grupo com filho. Se o pai também virasse pílula cheia,
  // duas acenderiam na mesma coluna e nenhuma diria qual página está na tela.
  it('o pai de um filho ativo ganha peso, não preenchimento', () => {
    const pai = classesItemDaBarra({ ativo: false, ancestral: true, trilho: false }).split(/\s+/);

    expect(pai).toContain('font-semibold');
    expect(pai).not.toContain('bg-primary');
    expect(pai).not.toContain('text-primary-foreground');
  });

  it('o filho ativo continua sendo a pílula cheia', () => {
    const filho = classesItemDaBarra({ ativo: true, sub: true, trilho: false }).split(/\s+/);

    expect(filho).toContain('bg-primary');
    expect(filho).toContain('text-primary-foreground');
  });
});

describe('a cor sai do tema da rota, nunca do arquivo', () => {
  // A frente inteira existe para que a mesma caixa mude de cor sozinha ao
  // trocar de área. Uma cor literal aqui é uma barra que não acompanha.
  it('o módulo não escreve cor crua nem primitiva de escala', () => {
    const fonte = ler('./barraLateralCromo.ts');
    // Só o corpo: os comentários citam hex e HSL de propósito (a medição de
    // contraste que justifica `--primary`), e citar não é pintar.
    const corpo = fonte
      .replace(/\/\*\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '');

    expect(corpo).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(corpo).not.toMatch(/\bhsl\(/);
    // `teal-600`, `blue-500` e companhia: primitivas que nenhum tema
    // sobrescreve, então a cor não acompanha a área.
    expect(corpo).not.toMatch(/\b(?:bg|text|border)-(?:teal|blue|slate|gray|zinc|red|green)-\d{2,3}\b/);
  });
});

describe('recolhido, o ícone fica no centro', () => {
  it('o trilho centraliza e NÃO deixa gap sobrando', () => {
    const trilho = classesItemDaBarra({ ativo: false, trilho: true });

    expect(trilho).toContain('justify-center');
    // O `gap` continua ocupando espaço com o rótulo fora, e é ele que empurra
    // o ícone para fora do centro — o mesmo erro que o cartão do usuário teve.
    expect(trilho).not.toMatch(/\bgap-/);
  });

  it('aberto o gap volta, senão ícone e rótulo encostam', () => {
    expect(classesItemDaBarra({ ativo: false, trilho: false })).toMatch(/\bgap-/);
  });

  // A usuária viu isto no Board antes de qualquer outra barra adotar o módulo,
  // e só a pílula CHEIA denuncia: com tinta de 10% uma faixa larga não
  // incomoda, cheia ela vira a peça mais pesada do trilho.
  it('no trilho a pílula é QUADRADA, não uma barra deitada', () => {
    const classes = classesItemDaBarra({ ativo: true, trilho: true }).split(/\s+/);

    // 40px = `seloCabecalhoPx`, a mesma medida do selo da área nas outras
    // barras: o trilho tem que ser uma coluna de peças do mesmo tamanho.
    expect(classes).toContain('h-10');
    expect(classes).toContain('w-10');
    // `w-full` aqui dá 56px (80 menos o recuo do container) — mais largo que o
    // selo de 40 e que os ícones soltos de 15, e é o que lia torto.
    expect(classes).not.toContain('w-full');
  });

  it('aberta a linha ocupa a largura toda — lá o rótulo vem junto', () => {
    expect(classesItemDaBarra({ ativo: true, trilho: false }).split(/\s+/)).toContain('w-full');
  });

  // Este é o teste do bug que a usuária viu: a pílula aparecia com 34px de
  // largura em vez de 40, encostada na direita e cortada. A culpa não era da
  // pílula — era do eyebrow ao lado dela.
  //
  // "DIRETORIA" em caixa alta com `tracking` não quebra linha e mede 83px. O
  // `ScrollArea` do Radix embrulha os filhos num `display: table`, que estica
  // até o filho mais largo, então a caixa do menu ia de 56px para 83px; o
  // `mx-auto` centrava nela e o `overflow: hidden` cortava o resto. Medido no
  // navegador: item a 33,6px da esquerda, 5,6px cortados — os mesmos 33,6 que
  // a captura de tela dela mostrava.
  it('recolhido, o eyebrow não vota na largura da caixa do menu', () => {
    const classes = classesEyebrowDaBarra(true).split(/\s+/);

    expect(classes).toContain('w-0');
    // O recuo horizontal soma 20px à largura e reproduz o mesmo estouro.
    expect(classes).toContain('px-0');
    expect(classes).not.toContain('px-2.5');
  });

  it('aberto o eyebrow tem o recuo normal', () => {
    expect(classesEyebrowDaBarra(false).split(/\s+/)).toContain('px-2.5');
  });

  it('o eyebrow some da vista mas não colapsa o respiro entre blocos', () => {
    const recolhido = classesEyebrowDaBarra(true);

    expect(recolhido).toContain('invisible');
    // `hidden` colapsaria a altura e os blocos se encostariam. A comparação é
    // por CLASSE e não por texto: `overflow-hidden` contém "hidden" e é outra
    // coisa — foi assim que este teste falhou na primeira escrita.
    expect(recolhido.split(/\s+/)).not.toContain('hidden');
    expect(classesEyebrowDaBarra(false)).not.toContain('invisible');
  });
});

describe('a face do cromo tem nome de papel', () => {
  it('é a classe do Tailwind, e não a família escrita à mão', () => {
    expect(FACE_DA_BARRA).toBe('font-barra');
    expect(classesItemDaBarra({ ativo: false, trilho: false })).toContain('font-barra');
  });

  it('`font-barra` existe no Tailwind — sem isso a classe não gera nada', () => {
    // Classe que o config não declara sai do bundle em silêncio: nada quebra,
    // a barra só continua em Work Sans e ninguém percebe.
    expect(ler('../../tailwind.config.ts')).toMatch(/barra:\s*\[\s*'Instrument Sans'/);
  });
});

/**
 * A OSG é a única barra que NÃO desmonta o rótulo no trilho: ela o mantém
 * montado e desbota, para não dar corte seco. Isso a obriga a neutralizar a
 * largura por conta própria — e essa neutralização quebrou DUAS vezes, sempre
 * pelo mesmo mecanismo: uma classe escrita depois de `rotuloCls` no `cn()`,
 * que o `tailwind-merge` deixa vencer.
 *
 * 1ª: `w-4` na seta do grupo, depois do `w-0` — a seta voltou a medir 16px e o
 *     `ml-auto` empurrou o ícone. Medido: 12,5px fora do centro.
 * 2ª: `flex-1` em três rótulos de cabeçalho — `flex-grow: 1` estica um
 *     elemento de largura zero. Mesmos 12,5px, nos mesmos três itens.
 *
 * Por isso a regra é de ORDEM, e não de conteúdo: `rotuloCls` por último.
 */
describe('na OSG o rótulo montado não pode voltar a ocupar largura', () => {
  const fonte = ler('../components/equipe/osg/OsgLayout.tsx');

  it('o trilho zera largura E crescimento do rótulo', () => {
    const trecho = fonte.slice(fonte.indexOf('const rotuloCls'), fonte.indexOf('const rotuloCls') + 1400);

    expect(trecho).toContain('w-0');
    // Sem `flex-none`, um `flex-1` no ponto de uso estica o que tem largura 0.
    expect(trecho).toContain('flex-none');
    expect(trecho).toContain('overflow-hidden');
  });

  it('`rotuloCls` vem por último em todo `cn()` — senão o twMerge o derruba', () => {
    const antes = [...fonte.matchAll(/cn\(\s*rotuloCls\s*,/g)];

    expect(
      antes.map((m) => fonte.slice(Math.max(0, m.index - 60), m.index + 40)),
    ).toEqual([]);
  });
});
