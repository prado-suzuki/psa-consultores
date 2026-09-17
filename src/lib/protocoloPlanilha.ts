import type { BeneficiarioDoProtocolo, SecaoDaGrade } from '@/lib/protocoloRemuneracao';

/**
 * O Protocolo de Remuneração virado planilha (GOV-F).
 *
 * **Por que fora do motor documental.** O motor só emite `.docx` e `.md`, e a
 * `gradeDaMatriz` do `contextoGovernanca`, que seria o caminho análogo, não tem
 * nenhum bloco que a consuma: a Matriz vira cláusula dentro do contrato social e
 * a grade dela nunca foi gerada como documento. O caminho pelo motor seria
 * inédito e entregaria Word. Aqui se usa o `xlsx` que o projeto já tem.
 *
 * **Esta função é pura de propósito.** Devolve as células, as larguras e as
 * mesclagens; quem chama o `XLSX.writeFile` é a tela. Assim o layout, que é a
 * parte que erra, se confere em milissegundos e sem navegador.
 *
 * **A GEOMETRIA É A DO MODELO DA CASA**, medida no XML de
 * `00_MODELO_da_casa.xlsx`, e não uma aproximação:
 *
 *   A (1.5) e B (3.125)  ocultas
 *   C (8.625)            TEMA, mesclado verticalmente nas linhas do grupo
 *   D (0.625)            vão
 *   E (19.375)           ITEM
 *   F (0.625) e G        vão
 *   H (24), J (21.625), L (22.5)   beneficiários
 *   I (4.5) e K (4.5)    vão entre beneficiários
 *
 * E há LINHA EM BRANCO entre cada item: é por isso que o modelo tem 106 linhas
 * para 52 itens. As mesclagens do tema (C4:C14, C16:C22, ...) cobrem o item e o
 * branco seguinte.
 *
 * **O que esta geração NÃO reproduz: cor, negrito e borda.** O modelo tem 6
 * fontes, 6 preenchimentos e 2 bordas, e o `xlsx` community escreve mesclagem e
 * largura mas não estilo de célula. Para a fidelidade visual completa seria
 * preciso um escritor com suporte a estilo, que é dependência nova.
 */

export interface LarguraDeColuna {
  /** Largura em caracteres, a unidade que o `xlsx` usa em `!cols`. */
  wch: number;
  hidden?: boolean;
}

/** Uma faixa mesclada, no formato que o `xlsx` espera em `!merges`. */
export interface Mesclagem {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

export interface PlanilhaDoProtocolo {
  celulas: string[][];
  larguras: LarguraDeColuna[];
  mesclagens: Mesclagem[];
}

/* As posições do modelo, em índice de coluna começando em zero. */
const COL_TEMA = 2;
const COL_ITEM = 4;
const COL_PRIMEIRO_BENEFICIARIO = 7;
/** Beneficiário e vão se alternam: H, I, J, K, L. */
const PASSO_ENTRE_BENEFICIARIOS = 2;

const colunaDoBeneficiario = (i: number) =>
  COL_PRIMEIRO_BENEFICIARIO + i * PASSO_ENTRE_BENEFICIARIOS;

/**
 * O nome do arquivo.
 *
 * Leva o cliente e a versão porque o protocolo é versionado e as versões
 * circulam juntas: no acervo, o Toqueto tem a V1 e a VF lado a lado na mesma
 * pasta. Sem a versão no nome, a segunda baixada sobrescreve a primeira ou vira
 * "(1)", e ninguém sabe qual é qual.
 *
 * Tudo o que não é letra, número ou hífen vira hífen: o nome do cliente no
 * cadastro tem ponto, barra e colchete, e barra em nome de arquivo é caminho.
 */
export function nomeDoArquivo(cliente: string, versao: number): string {
  const limpo = cliente
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `Protocolo-de-Remuneracao-${limpo || 'cliente'}-v${versao}.xlsx`;
}

/** Uma linha vazia do tamanho da grade, para os vãos entre itens. */
const linhaVazia = (largura: number) => Array.from({ length: largura }, () => '');

export function planilhaDoProtocolo(
  secoes: SecaoDaGrade[],
  colunas: BeneficiarioDoProtocolo[],
  preambulo: string | null,
): PlanilhaDoProtocolo {
  const ultimaColuna = colunaDoBeneficiario(Math.max(colunas.length - 1, 0));
  const largura = ultimaColuna + 1;

  const celulas: string[][] = [];
  const mesclagens: Mesclagem[] = [];
  const nova = () => {
    celulas.push(linhaVazia(largura));
    return celulas.length - 1;
  };

  /* Título, mesclado de ponta a ponta da grade, como o C1:L1 do modelo. */
  const rTitulo = nova();
  celulas[rTitulo][COL_TEMA] = 'Protocolo de Remuneração';
  mesclagens.push({ s: { r: rTitulo, c: COL_TEMA }, e: { r: rTitulo, c: ultimaColuna } });

  /*
   * O texto de abertura só ocupa linha quando existe. O modelo da casa não tem
   * um e começa direto; uma linha fantasma desalinharia a conferência contra
   * ele. Quando existe, ocupa a faixa inteira, como no Potrich.
   */
  if (preambulo?.trim()) {
    const r = nova();
    celulas[r][COL_TEMA] = preambulo.trim();
    mesclagens.push({ s: { r, c: COL_TEMA }, e: { r, c: ultimaColuna } });
  }

  /* "Critérios" encima a coluna do tema e a do item, como o C2:E3 do modelo. */
  const rCriterios = nova();
  celulas[rCriterios][COL_TEMA] = 'Critérios';
  mesclagens.push({ s: { r: rCriterios, c: COL_TEMA }, e: { r: rCriterios, c: COL_ITEM } });

  /* Os nomes das colunas ficam na linha seguinte, cada um na sua posição. */
  const rColunas = nova();
  colunas.forEach((c, i) => {
    celulas[rColunas][colunaDoBeneficiario(i)] = c.nome;
  });

  for (const secao of secoes) {
    if (secao.linhas.length === 0) continue;
    const primeira = celulas.length;

    secao.linhas.forEach((linha, i) => {
      const r = nova();
      celulas[r][COL_ITEM] = linha.item;
      linha.celulas.forEach((c, j) => {
        celulas[r][colunaDoBeneficiario(j)] = c.texto ?? '';
      });
      /* O branco vai ENTRE itens, e não depois do último: assim a mesclagem do
         tema termina no item, como no modelo (C4:C14 acaba na linha 14, que é
         item, e não numa linha vazia). */
      if (i < secao.linhas.length - 1) nova();
    });

    const ultima = celulas.length - 1;
    celulas[primeira][COL_TEMA] = secao.tema;
    /* Tema de um item só não vira mesclagem: faixa de uma linha só é ruído no
       arquivo e o Excel reclama de merge degenerado. */
    if (ultima > primeira) {
      mesclagens.push({ s: { r: primeira, c: COL_TEMA }, e: { r: ultima, c: COL_TEMA } });
    }
  }

  /*
   * As larguras são as do modelo, não arredondadas. As duas primeiras nascem
   * ocultas porque no original são ocultas, e a coluna do beneficiário é larga
   * porque ali mora parágrafo: no Potrich, "Modelo do Veículo" tem 160
   * caracteres numa célula só, e com a largura padrão o arquivo abre cortado.
   */
  const larguras: LarguraDeColuna[] = [
    { wch: 1.5, hidden: true },
    { wch: 3.125, hidden: true },
    { wch: 8.625 },
    { wch: 0.625 },
    { wch: 19.375 },
    { wch: 0.625 },
    { wch: 0.625 },
  ];
  colunas.forEach((_, i) => {
    if (i > 0) larguras.push({ wch: 4.5 });
    larguras.push({ wch: 24 });
  });

  return { celulas, larguras, mesclagens };
}
