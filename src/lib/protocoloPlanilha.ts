import type { BeneficiarioDoProtocolo, SecaoDaGrade } from '@/lib/protocoloRemuneracao';

/**
 * O Protocolo de Remuneração virado planilha (GOV-F).
 *
 * **Por que planilha e não documento do motor.** O protocolo é entregue como
 * planilha, e o motor documental do OSG só sabe emitir `.docx` e `.md`. Além
 * disso a `gradeDaMatriz`, que seria o caminho análogo, não tem nenhum bloco que
 * a consuma: a Matriz de Alçadas vira cláusula dentro do contrato social, e a
 * grade dela nunca foi gerada como documento próprio. Ou seja, o caminho pelo
 * motor seria inédito, e este aqui usa o `xlsx` que o projeto já tem.
 *
 * **Esta função é pura de propósito.** Ela devolve a matriz de células e a
 * largura das colunas; quem chama o `XLSX.writeFile` é a tela. Assim o layout,
 * que é a parte que erra, se confere em milissegundos e sem navegador.
 *
 * **O LAYOUT É O DO MODELO DA CASA**, medido célula a célula em
 * `00_MODELO_da_casa.xlsx`: o TEMA numa coluna, o ITEM na seguinte, e uma coluna
 * por beneficiário. O tema aparece só na PRIMEIRA linha do grupo e fica em
 * branco nas demais, que é a célula mesclada da planilha original.
 *
 * O que NÃO se reproduz são as colunas e linhas em branco de espaçamento que o
 * arquivo original tem (no modelo, o tema está na coluna C e o item na E, com B,
 * D, F e G vazias). Aquilo é resíduo de formatação de quem montou a planilha à
 * mão, não estrutura: quem lê vê tema, item e as colunas. Reproduzir os vazios
 * deixaria o arquivo gerado desconfortável de editar, que é o uso seguinte dele.
 */

/** Largura de coluna em caracteres, que é a unidade que o `xlsx` usa em `!cols`. */
export interface LarguraDeColuna {
  wch: number;
}

export interface PlanilhaDoProtocolo {
  /** A matriz de células, linha por linha, pronta para `XLSX.utils.aoa_to_sheet`. */
  celulas: string[][];
  larguras: LarguraDeColuna[];
}

/**
 * O nome do arquivo.
 *
 * Leva o cliente e a versão porque o protocolo é versionado e as versões
 * circulam juntas: no acervo, o Toqueto tem a V1 e a VF lado a lado na mesma
 * pasta. Sem a versão no nome, a segunda baixada sobrescreve a primeira ou vira
 * "(1)", e ninguém sabe qual é qual.
 *
 * Tudo o que não é letra, número ou hífen vira hífen: o nome do cliente no
 * cadastro tem ponto, barra e colchete ("[TESTE 1 · ENVIAR] Abacaxi Elétrico
 * Mineração e Balé S.A."), e barra em nome de arquivo é caminho.
 */
export function nomeDoArquivo(cliente: string, versao: number): string {
  const limpo = cliente
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `Protocolo-de-Remuneracao-${limpo || 'cliente'}-v${versao}.xlsx`;
}

/**
 * Monta a planilha inteira.
 *
 * As três primeiras linhas são o cabeçalho do documento, e existem porque estão
 * no original: o título, o texto de abertura quando há, e a linha de rótulos.
 * A linha de rótulos começa com "Critérios", que é a palavra que o modelo da
 * casa usa em cima da coluna dos temas.
 */
export function planilhaDoProtocolo(
  secoes: SecaoDaGrade[],
  colunas: BeneficiarioDoProtocolo[],
  preambulo: string | null,
): PlanilhaDoProtocolo {
  const vazias = colunas.map(() => '');
  const celulas: string[][] = [['Protocolo de Remuneração', '', ...vazias]];

  /* Sem texto de abertura não entra linha em branco no lugar: o modelo da casa
     não tem preâmbulo e começa direto, e uma linha fantasma desalinharia a
     conferência contra ele. */
  if (preambulo?.trim()) celulas.push([preambulo.trim(), '', ...vazias]);

  celulas.push(['', '', ...vazias]);
  celulas.push(['Critérios', '', ...colunas.map((c) => c.nome)]);

  for (const secao of secoes) {
    secao.linhas.forEach((linha, i) => {
      celulas.push([
        i === 0 ? secao.tema : '',
        linha.item,
        ...linha.celulas.map((c) => c.texto ?? ''),
      ]);
    });
  }

  /*
   * A largura é fixa e generosa na coluna da regra porque ali mora parágrafo:
   * no Potrich, "Modelo do Veículo" tem 160 caracteres numa célula só. Com a
   * largura padrão do Excel o arquivo abre com tudo cortado, e quem recebe
   * conclui que a geração falhou.
   */
  const larguras: LarguraDeColuna[] = [
    { wch: 34 },
    { wch: 44 },
    ...colunas.map(() => ({ wch: 52 })),
  ];

  return { celulas, larguras };
}
