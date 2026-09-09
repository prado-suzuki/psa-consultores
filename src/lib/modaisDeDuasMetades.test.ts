import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Os modais de duas metades — formulário à esquerda, Atividade à direita — e a
 * armadilha que os dois tinham em tela baixa.
 *
 * A anatomia é essa: `DialogContent` com altura FIXA (`h-[min(94vh,54rem)]`) e
 * `overflow-hidden`, duas colunas só de `lg` para cima. Abaixo de `lg` sobra o
 * `grid` de uma coluna da primitiva, e as duas metades viram linhas `auto`.
 *
 * O que dava errado, e deu duas vezes: a metade da Atividade declarava um piso
 * de altura (`min-h-[32rem]`) porque o `OrgCommentsPanel` é `h-full` e colapsa
 * sem altura definida. Num modal de 601px, esse piso levava 512 e o formulário
 * ficava com ~89px — e o formulário é quem carrega o Salvar e o fechar. Em tela
 * mais baixa ainda, ele era empurrado inteiro para fora e recortado pelo
 * `overflow-hidden`: **não sobrava saída do modal**. A Patrícia, em 09/09:
 * "quando a tela fica muito pequena eu não consigo sair de atividade", "só se eu
 * clicar bem no cantinho" — o cantinho era o overlay, fora do modal.
 *
 * O remédio: abaixo de `lg` a caixa vira coluna flexível, mostra UMA metade por
 * vez com o modal inteiro, e a moldura (Salvar, fechar, seletor) fica sempre
 * montada, fora da área que rola.
 *
 * Este teste DESCOBRE os modais pela altura fixa em vez de listar os dois que
 * existem hoje: o terceiro que copiar a anatomia nasce cobrado. É o que a régua
 * dos modais (`ui/dialog.regua.test.ts`) não alcança — aquela lê só o className
 * do próprio `DialogContent` e nunca olha filho.
 */

const RAIZ = fileURLToPath(new URL('../components', import.meta.url));

/** A assinatura da anatomia: altura fixa de modal grande. */
const ALTURA_FIXA = 'h-[min(94vh,54rem)]';

/**
 * O fonte sem comentários.
 *
 * Necessário porque os comentários destes dois arquivos CITAM o defeito para
 * explicá-lo — "a Atividade levava os `min-h-[32rem]` que pedia" —, e sem tirar
 * comentário o teste acusaria a própria explicação do conserto.
 */
function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function modaisDeDuasMetades(): { caminho: string; fonte: string }[] {
  return readdirSync(RAIZ, { recursive: true, encoding: 'utf8' })
    .map((nome) => nome.split('\\').join('/'))
    .filter((nome) => nome.endsWith('.tsx') && !nome.includes('.test.'))
    .map((nome) => ({
      caminho: nome,
      fonte: semComentarios(readFileSync(`${RAIZ}/${nome}`, 'utf8')),
    }))
    .filter(({ fonte }) => fonte.includes(ALTURA_FIXA));
}

describe('modais de duas metades têm saída em tela baixa', () => {
  const modais = modaisDeDuasMetades();

  it('os dois que existem hoje foram encontrados — se não, o teste não está medindo nada', () => {
    // Sentinela: se a assinatura mudar e a busca voltar vazia, este teste passa
    // por vacuidade e a armadilha volta em silêncio. Já aconteceu com outra
    // config neste repositório (a contagem caiu de 4559 para 4537, calada).
    expect(modais.map((m) => m.caminho).sort()).toEqual([
      'equipe/fiscal/tasks/TaskModal.tsx',
      'equipe/projetos-cadastro/ProjetoDialog.tsx',
    ]);
  });

  for (const { caminho, fonte } of modais) {
    describe(caminho, () => {
      it('não põe piso de altura na metade da Atividade', () => {
        // O piso era o que estrangulava a outra metade. Quem dá altura agora é
        // o `flex-1` da metade escolhida.
        expect(fonte).not.toMatch(/min-h-\[\d+rem\]/);
      });

      it('abaixo de `lg` vira coluna flexível, e não grade de linhas `auto`', () => {
        expect(fonte).toContain('max-lg:flex');
        expect(fonte).toContain('max-lg:flex-col');
      });

      it('oferece um seletor para voltar da Atividade, só em tela estreita', () => {
        // Sem ele, entrar na Atividade é entrar num lugar sem porta.
        expect(fonte).toMatch(/role="group"[\s\S]{0,120}aria-label="O que mostrar d/);
        expect(fonte).toContain('lg:hidden');
      });

      it('esconde a metade que sai por CSS, e não a desmonta', () => {
        // Desmontar perderia o que estivesse digitado ao trocar de aba.
        expect(fonte).toContain('max-lg:hidden');
      });

      it('o `max-lg:hidden` fica na metade que sai, e não no bloco que guarda o seletor', () => {
        /*
          O defeito de 09/09, e o mais perigoso desta família: o seletor mora no
          mesmo bloco que a moldura do modal, e esse bloco recebeu
          `max-lg:hidden` ao trocar de metade. Trocar para a Atividade levava
          embora o próprio botão de voltar — "em projeto a barra superior para
          alternar funciona, agora dentro da tarefa não".

          A assinatura no fonte é a condição INVERTIDA: `!== 'metade'` com
          `max-lg:hidden` na mesma expressão é o que esconde o bloco de fora;
          o certo é o bloco de fora receber `max-lg:flex-1` quando ATIVO, e só o
          corpo interno se esconder.

          Isto é o que dá para ver lendo o fonte. Quem prova de verdade — que o
          seletor não tem nenhum ancestral escondido — é o teste de render de
          cada modal, porque exige subir a árvore.
        */
        const blocoDeFora = fonte.slice(0, fonte.indexOf('role="group"'));
        expect(blocoDeFora).toMatch(/abaEstreita === '\w+' && 'max-lg:flex-1'/);
        expect(blocoDeFora).not.toMatch(/abaEstreita !== '\w+' && 'max-lg:hidden'/);
      });
    });
  }
});
