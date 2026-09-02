/**
 * LER O ALINHAMENTO DECLARADO de uma tabela — usado pelos testes das duas telas.
 *
 * Vive fora do arquivo de teste porque a mesma conferência vale para o modal (onde se
 * MONTA a simulação) e para a simulação aberta (onde se LÊ), e as duas precisam de
 * mocks diferentes: uma roda o controlador inteiro, a outra lê uma linha gravada. Duas
 * cópias do comparador é como o cabeçalho e a célula se separaram em primeiro lugar.
 */

export type Lado = 'esquerda' | 'direita';

/**
 * O alinhamento EFETIVO de uma célula, lido da classe.
 *
 * Sem classe de alinhamento vale ESQUERDA, e não "indefinido": `td` sem `text-align`
 * herda do documento, que em português é da esquerda para a direita. Tratar a ausência
 * como incógnita mandaria metade das colunas de texto para uma lista de suspeitas que
 * ninguém leria — e esconderia a única ausência que importa, a da célula com campo
 * debaixo de um cabeçalho à direita.
 */
export const alinhamentoDe = (el: Element): Lado =>
  (el.className.includes('text-right') ? 'direita' : 'esquerda');

export type Coluna = {
  indice: number;
  rotulo: string;
  cabecalho: Lado;
  celula: Lado | 'sem-celula';
};

/**
 * Para cada coluna: o que o cabeçalho declara e o que a primeira linha de dado declara.
 */
export const colunasDe = (tabela: HTMLTableElement): Coluna[] => {
  const ths = [...tabela.querySelectorAll('thead th')];
  const primeira = tabela.querySelector('tbody tr');
  const tds = primeira ? [...primeira.querySelectorAll('td')] : [];
  return ths.map((th, i) => ({
    indice: i,
    rotulo: th.textContent?.trim() ?? '',
    cabecalho: alinhamentoDe(th),
    celula: tds[i] ? alinhamentoDe(tds[i]) : 'sem-celula',
  }));
};

/**
 * COLUNAS SEM EXPLICAÇÃO — os rótulos de cabeçalho que não abrem dica.
 *
 * O gatilho da dica é o `span` do `ComDica`, que se identifica pelo `cursor-help`. Toda
 * coluna com texto no cabeçalho precisa de um: os rótulos desta tela são jargão fiscal
 * (transmitido, legítima, disponível, nua propriedade, voz e voto) e nenhum deles se
 * explica sozinho para quem abre a tela pela primeira vez.
 *
 * Devolve os rótulos que ficaram sem, para a falha dizer QUAL coluna esquecer.
 */
export const colunasSemDica = (): string[] =>
  [...document.querySelectorAll('thead th')]
    .filter((th) => (th.textContent ?? '').trim() !== '')
    .filter((th) => th.querySelector('.cursor-help') == null)
    .map((th) => (th.textContent ?? '').trim());

/**
 * Confere TODA tabela que está na tela. Colunas sem cabeçalho de texto ficam de fora:
 * são as de controle (a lixeira), que não têm o que comparar.
 *
 * Devolve as divergências como texto legível, uma por linha — vazio quando está certo.
 */
export const colunasTortas = (): string[] => {
  const tabelas = [...document.querySelectorAll('table')] as HTMLTableElement[];
  const tortas: string[] = [];
  for (const tabela of tabelas) {
    for (const col of colunasDe(tabela)) {
      if (col.rotulo === '' || col.celula === 'sem-celula') continue;
      if (col.celula !== col.cabecalho) {
        tortas.push(
          `coluna "${col.rotulo}" (índice ${col.indice}): cabeçalho ${col.cabecalho}, `
          + `célula ${col.celula}`,
        );
      }
    }
  }
  return tortas;
};
