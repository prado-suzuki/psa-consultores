import { readFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

import { PASTAS_DE_TELA, arquivosDeCodigo, medirCorCrua } from '@/lib/medirCorCrua';

/**
 * Catraca do texto que explica a tela.
 *
 * O contrato está em `docs/geral/texto-explicativo-na-tela.md`, em vigor desde
 * 17/09/2026. Esta catraca não repete o contrato: ela trava as três coisas dele que
 * voltariam em silêncio, e **nenhuma das três é sobre redação**. Redação se confere
 * lendo; o que um teste consegue provar é mecanismo, teto e forma canônica.
 *
 * POR QUE ELA VEM DEPOIS DO DOCUMENTO, e não antes. Catraca escrita antes do padrão
 * congela o estado de hoje como se fosse o desejado — foi por isso que ela ficou
 * explicitamente em fase 2 na tarefa 14. Primeiro se decide o estado desejado olhando
 * caso real; depois se automatiza o que ficou decidido.
 *
 * E POR QUE ELA EXISTE, já que o documento está escrito: todo padrão só de documento
 * nesta casa voltou a divergir. Aconteceu com a palavra de status, com o cartão tingido
 * e com o branco literal, e nos três quem segurou foi o teste, não o texto.
 *
 * ⚠️ **O QUE ESTA CATRACA NÃO PERSEGUE**, e não é esquecimento:
 *
 * - **`title` em `<iframe>`** (8 hoje). É título de quadro, outro papel, e o documento
 *   o mantém. A lista de tags abaixo não o inclui.
 * - **`title` em componente nosso** (`<Card title=…>`, `<Secao title=…>`). Ali `title` é
 *   prop de dado, não tooltip do navegador — são 264 no repositório, e persegui-los seria
 *   confundir dois `title` que só têm o nome em comum.
 * - **o texto em si.** Nenhuma asserção lê se a frase começa pela informação que faz
 *   agir, se tem uma ideia só ou se repete o rótulo. Isso é revisão humana, e está no
 *   checklist da §6 do documento.
 * - **prosa e comentário.** A varredura é sobre JSX; comentário que cite `title=` para
 *   contar esta história é para ficar.
 */

const RAIZ = resolve(__dirname, '../..');

/**
 * As tags HTML nativas onde `title=` vira tooltip do navegador — sem `iframe`, que é o
 * caso permitido.
 *
 * A regex é de linha única, e isso foi **medido antes de escolher**: contra um parser de
 * tags que atravessa props multilinha, as duas contam exatamente as mesmas 143
 * ocorrências. Nenhum `title=` do repositório está separado da sua tag por uma quebra de
 * linha, então o parser seria complexidade sem resultado.
 */
const TAGS_NATIVAS =
  'div|span|button|a|p|td|th|tr|li|img|svg|section|label|input|textarea|select|option|h1|h2|h3|h4|strong|em';

const RE_TITLE_NATIVO = new RegExp(String.raw`<(?:${TAGS_NATIVAS})\b[^<>]*\stitle=`, 'g');

/**
 * A dívida do `title=`, congelada em 17/09/2026: **143 ocorrências em 80 arquivos** das
 * pastas de tela.
 *
 * O documento **não manda converter as 143** — ele existe para impedir a 144ª. Essa
 * separação é deliberada: decidir o padrão é uma tarefa, pagar a dívida é outra, e
 * misturá-las foi o que fez o padrão não existir até agora.
 *
 * Quando a conversão acontecer, este número desce junto com ela, no mesmo commit. O teste
 * reprovando por queda é feature, não atrito: o número aqui é o retrato de uma dívida, e
 * retrato desatualizado é como o índice passou meses dizendo "142".
 */
const TITLE_NATIVO_LEGADO = 143;

/**
 * Placeholder de escolha ou de busca fora das quatro formas canônicas (§3 do documento):
 * `Selecione…`, `Buscar…`, `Ex: …`, vazio.
 *
 * Fora do recorte, de propósito: `Todos os clientes`, `Todas as OS` e afins. Aquilo **não
 * é placeholder** — é o rótulo da opção "todos" do filtro, que existe como `SelectItem`
 * em 58 lugares, e tem de casar com ele. Um campo com recorte já valendo não tem nada
 * a selecionar.
 */
const RE_PLACEHOLDER_FORA_DO_CANONE =
  /placeholder="(?!Selecione…"|Buscar…"|Ex: )(?:Selecion|Buscar|Busque|Pesquis|Digite|Procur)[^"]*"/g;

/** Congelado em 17/09/2026: 226 em 140 arquivos. */
const PLACEHOLDER_LEGADO = 226;

/** O teto de caracteres da explicação contextual (§3). Acima disso é nota de leitura. */
const TETO_DO_TOOLTIP = 140;

/**
 * O texto que a pessoa realmente lê dentro de um `<TooltipContent>`: sem as tags do JSX
 * e sem as interpolações.
 *
 * **Medir o bruto não serve, e o número prova:** o conteúdo cru acusa 52 tooltips acima
 * do teto, em 35 arquivos; o texto lido são **3**. A diferença de 17× é markup — um
 * tooltip de dez palavras embrulhado em `<div className="…">` e `<strong>` passaria a
 * reprovar por causa das classes. Catraca que mede o invólucro reprova o inocente, e
 * quem paga é quem escreveu certo.
 *
 * Mora aqui, e não no `medirCorCrua`, porque aquele módulo é de COR e esta é a primeira
 * consumidora desta leitura. Se nascer a segunda, sai daqui para um módulo próprio — foi
 * exatamente assim que o `medirEmCaixaArredondada` saiu da `cartaoTingido`.
 */
function tooltipsAcimaDoTeto(): Record<string, number> {
  const medido: Record<string, number> = {};
  for (const pasta of PASTAS_DE_TELA) {
    for (const caminho of arquivosDeCodigo(resolve(RAIZ, pasta))) {
      const fonte = readFileSync(caminho, 'utf8');
      let acima = 0;
      for (const achado of fonte.matchAll(/<TooltipContent[^>]*>([\s\S]*?)<\/TooltipContent>/g)) {
        const lido = achado[1]
          .replace(/<[^>]+>/g, ' ')
          .replace(/\{[^}]*\}/g, '')
          .replace(/\s+/g, ' ')
          .trim();
        if (lido.length > TETO_DO_TOOLTIP) acima++;
      }
      if (acima) medido[relative(RAIZ, caminho).split(sep).join('/')] = acima;
    }
  }
  return medido;
}

const total = (medido: Record<string, number>) =>
  Object.values(medido).reduce((soma, quantos) => soma + quantos, 0);

/**
 * Como achar a ocorrência que mudou.
 *
 * A asserção é sobre o TOTAL, então a falha sabe que o número mexeu e não sabe onde —
 * listar os arquivos mais carregados seria pior que inútil, porque aponta a dívida
 * antiga em vez do que acabou de entrar. O caminho curto é o próprio diff.
 */
const comoAchar = (padrao: string) =>
  'Para achar:\n'
  + `  bunx rg -n '${padrao}' $(git diff --name-only --diff-filter=d HEAD -- 'src/**/*.tsx')\n`
  + '  (sem nada no diff, troque por `src/components src/pages`)';

describe('o texto que explica a tela', () => {
  it('não nasce `title=` novo em tag nativa — explicação é `<Tooltip>`', () => {
    const medido = medirCorCrua(RE_TITLE_NATIVO);

    expect(
      total(medido),
      'A dívida do `title=` mudou de tamanho.\n\n'
        + `Congelada em 17/09/2026: ${TITLE_NATIVO_LEGADO} em 80 arquivos.\n`
        + `Agora: ${total(medido)} em ${Object.keys(medido).length}.\n\n`
        + 'SUBIU: `title=` não é mecanismo de explicação (o do navegador não aparece no\n'
        + 'toque, não tem tema e demora a abrir). Use `<Tooltip>` para explicar, e\n'
        + '`aria-label` para dar nome a botão só de ícone — os dois em\n'
        + 'docs/geral/texto-explicativo-na-tela.md §3.\n\n'
        + 'DESCEU: a dívida foi paga, e este número desce no mesmo commit.\n\n'
        + comoAchar(String.raw`<(span|button|div|p|a|td|th|li|label)[^<>]*\stitle=`),
    ).toBe(TITLE_NATIVO_LEGADO);
  });

  it('nenhum tooltip passa do teto sem ser um dos três já inventariados', () => {
    const medido = tooltipsAcimaDoTeto();

    expect(
      medido,
      `Tooltip acima de ${TETO_DO_TOOLTIP} caracteres de TEXTO LIDO.\n\n`
        + 'Acima do teto não é tooltip: é nota de leitura da tela, e mora visível —\n'
        + 'ninguém descobre por hover o que precisa ler uma vez.\n\n'
        + 'Os três de 17/09/2026 são dívida conhecida: as duas abas da calculadora\n'
        + 'IBS/CBS (uma delas com 521 caracteres, começando por "Como ler esta tabela")\n'
        + 'e o histórico de versão do DocumentoCentroRail (158, com conteúdo certo e\n'
        + 'tamanho errado).',
    ).toEqual({
      'src/components/equipe/dev/calculadora-ibs-cbs/AbaPorAnexo.tsx': 1,
      'src/components/equipe/dev/calculadora-ibs-cbs/AbaPorProduto.tsx': 1,
      'src/components/equipe/osg/gerar/DocumentoCentroRail.tsx': 1,
    });
  });

  it('não nasce placeholder de escolha ou busca fora das formas canônicas', () => {
    const medido = medirCorCrua(RE_PLACEHOLDER_FORA_DO_CANONE);

    expect(
      total(medido),
      'A fila do placeholder fora do cânone mudou de tamanho.\n\n'
        + `Congelada em 17/09/2026: ${PLACEHOLDER_LEGADO} em 140 arquivos.\n`
        + `Agora: ${total(medido)} em ${Object.keys(medido).length}.\n\n`
        + 'As quatro formas são `Selecione…`, `Buscar…`, `Ex: …` e vazio. Texto sob\n'
        + 'medida no placeholder compete com o rótulo em vez de ajudar: quem lê o print\n'
        + 'precisa conferir o rótulo acima para saber em que campo está.\n'
        + '`Todos os clientes` e afins NÃO entram nesta conta — aquilo é o rótulo da\n'
        + 'opção do filtro, não placeholder.\n\n'
        + comoAchar('placeholder="(Selecion|Buscar|Busque|Pesquis|Digite|Procur)'),
    ).toBe(PLACEHOLDER_LEGADO);
  });
});
