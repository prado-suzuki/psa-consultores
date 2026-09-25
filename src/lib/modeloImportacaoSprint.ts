import * as XLSX from 'xlsx';
import type { ExcelRow } from '@/lib/excelImporter';

export const NOME_DO_MODELO_DE_SPRINT = 'modelo-importacao-sprint.xlsx';
export const ABA_DE_DADOS = 'Sprint';
export const ABA_DE_INSTRUCOES = 'Como preencher';

/**
 * Linhas de exemplo do modelo. Os cabeçalhos precisam bater exatamente com as chaves
 * de `ExcelRow`: `processExcelData` lê a célula pelo nome da coluna, e um acento ou
 * um "(h)" fora do lugar entra como coluna desconhecida e a tarefa chega vazia.
 *
 * São três tarefas pai, cada uma com suas subtarefas, para mostrar as duas regras que
 * não cabem num cabeçalho: o agrupamento é feito pelo `Título` repetido, e a
 * `Descrição da Tarefa Pai` é escrita só na primeira linha do grupo — a importação lê
 * a primeira célula preenchida e ignora as demais.
 */
export function linhasDoModeloDeSprint(): ExcelRow[] {
  return [
    {
      Sprint: 'Sprint 1 - Outubro',
      ID: 'EDU-01',
      Título: 'Cadastro e vínculo de clientes',
      'Descrição da Tarefa Pai':
        '## O QUE É\n\nDeixar o cadastro de cliente ligado ao vínculo de contribuinte.\n\n## POR QUE\n\nHoje o vínculo é refeito na mão a cada proposta nova.',
      Subtarefa: 'Mapear os campos obrigatórios',
      Responsável: 'Eduardo',
      Descrição: 'Levantar os campos que o cadastro exige hoje.',
      'Estimativa (h)': 4,
      'Data de Entrega': '06/10/2026',
      Projeto: 'Digital Rotina',
      Processo: 'Cadastro',
    },
    {
      Sprint: 'Sprint 1 - Outubro',
      ID: 'EDU-02',
      Título: 'Cadastro e vínculo de clientes',
      'Descrição da Tarefa Pai': '',
      Subtarefa: 'Ajustar a tela de vínculo',
      Responsável: 'Eduardo',
      Descrição: '- primeiro ponto\n- segundo ponto',
      'Estimativa (h)': 6,
      'Data de Entrega': '08/10/2026',
      Projeto: 'Digital Rotina',
      Processo: 'Cadastro',
    },
    {
      Sprint: 'Sprint 1 - Outubro',
      ID: 'EDU-03',
      Título: 'Cadastro e vínculo de clientes',
      'Descrição da Tarefa Pai': '',
      Subtarefa: 'Testar o cadastro com dados reais',
      Responsável: 'Eduardo',
      Descrição: 'Rodar com três clientes já cadastrados.',
      'Estimativa (h)': 2,
      'Data de Entrega': '09/10/2026',
      Projeto: 'Digital Rotina',
      Processo: 'Cadastro',
    },
    {
      Sprint: 'Sprint 1 - Outubro',
      ID: 'BER-01',
      Título: 'Importação da sprint pela planilha',
      'Descrição da Tarefa Pai':
        '## O QUE É\n\nSubir a sprint inteira de uma vez, sem cadastrar tarefa por tarefa.',
      Subtarefa: 'Conferir o modelo com o time',
      Responsável: 'Bernardo',
      Descrição: 'Validar as colunas com quem preenche a planilha.',
      'Estimativa (h)': 3,
      'Data de Entrega': '07/10/2026',
      Projeto: 'Digital Rotina',
      Processo: 'Sprint',
    },
    {
      Sprint: 'Sprint 1 - Outubro',
      ID: 'BER-02',
      Título: 'Importação da sprint pela planilha',
      'Descrição da Tarefa Pai': '',
      Subtarefa: 'Importar a sprint de teste',
      Responsável: 'Bernardo',
      Descrição: 'Importar e conferir tarefa pai, subtarefas e horas.',
      'Estimativa (h)': 5,
      'Data de Entrega': '09/10/2026',
      Projeto: 'Digital Rotina',
      Processo: 'Sprint',
    },
    {
      Sprint: 'Sprint 1 - Outubro',
      ID: 'ALE-01',
      Título: 'Relatório de retrospectiva',
      'Descrição da Tarefa Pai':
        '## O QUE É\n\nFechar a sprint com o comparativo de horas estimadas e apontadas.',
      Subtarefa: 'Definir os indicadores do relatório',
      Responsável: 'Alexandre',
      Descrição: 'Horas por pessoa, entregas concluídas e o que ficou para a próxima.',
      'Estimativa (h)': 4,
      'Data de Entrega': '10/10/2026',
      Projeto: 'Digital Rotina',
      Processo: 'Sprint',
    },
    {
      Sprint: 'Sprint 1 - Outubro',
      ID: 'ALE-02',
      Título: 'Relatório de retrospectiva',
      'Descrição da Tarefa Pai': '',
      Subtarefa: 'Revisar o relatório com a gestão',
      Responsável: 'Alexandre',
      Descrição: 'Rodada de ajuste antes de publicar.',
      'Estimativa (h)': 2,
      'Data de Entrega': '13/10/2026',
      Projeto: 'Digital Rotina',
      Processo: 'Sprint',
    },
  ];
}

/** Coluna, se é obrigatória, o que escrever e um exemplo — uma linha por coluna. */
const COLUNAS_EXPLICADAS: [string, string, string, string][] = [
  ['Sprint', 'Sim', 'Nome da sprint. O mesmo em todas as linhas.', 'Sprint 1 - Outubro'],
  ['ID', 'Não', 'Seu código da subtarefa. Texto livre, não é usado para agrupar.', 'EDU-01'],
  [
    'Título',
    'Sim',
    'Nome da TAREFA PAI. Repita igual nas linhas de todas as subtarefas dela — é por ele que a importação agrupa.',
    'Cadastro e vínculo de clientes',
  ],
  [
    'Descrição da Tarefa Pai',
    'Não',
    'Descrição da tarefa pai. Escreva SÓ na primeira linha do grupo e deixe vazio nas demais. Vazia no grupo inteiro, a tarefa pai recebe um resumo automático ("3 subtarefas • 12h total").',
    '## O QUE É — Deixar o cadastro ligado ao vínculo.',
  ],
  [
    'Subtarefa',
    'Sim',
    'Nome da subtarefa. Uma linha = uma subtarefa.',
    'Mapear os campos obrigatórios',
  ],
  [
    'Responsável',
    'Não',
    'Primeiro nome de quem executa, como está cadastrado no sistema. Nome que não existir é apontado na tela de importação, para você escolher a pessoa.',
    'Eduardo',
  ],
  [
    'Descrição',
    'Não',
    'Descrição da SUBTAREFA daquela linha.',
    'Levantar os campos que o cadastro exige hoje.',
  ],
  [
    'Estimativa (h)',
    'Não',
    'Horas da subtarefa, em número (1,5 = uma hora e meia). Vazia entra como 0h. A tarefa pai recebe a soma das subtarefas.',
    '4',
  ],
  [
    'Data de Entrega',
    'Sim',
    'Prazo da subtarefa, em dd/mm/aaaa. Vazia herda as datas da sprint. A tarefa pai vai da menor até a maior data das subtarefas.',
    '06/10/2026',
  ],
  [
    'Projeto',
    'Não',
    'Nome do projeto cadastrado no sistema. Em branco, a tarefa entra sem projeto.',
    'Digital Rotina',
  ],
  [
    'Processo',
    'Não',
    'Nome do processo cadastrado no sistema. Em branco, a tarefa entra sem processo.',
    'Cadastro',
  ],
];

const REGRAS = [
  'Uma linha = uma subtarefa. Não crie linha separada para a tarefa pai: ela nasce do "Título" repetido.',
  'Linhas com o mesmo "Título" viram UMA tarefa pai, com essas linhas como subtarefas dela.',
  '"Descrição da Tarefa Pai" vai só na primeira linha de cada grupo. A importação usa a primeira célula preenchida e ignora as outras.',
  'As duas colunas de descrição aceitam markdown: "## Seção", "- item", "**negrito**". Para quebrar linha dentro da célula, Alt+Enter.',
  'Datas em dd/mm/aaaa. Horas em número, sem a letra "h".',
  'Apague as sete linhas de exemplo antes de subir a sua sprint.',
  'Não renomeie as colunas nem mude a ordem das abas: a importação lê a PRIMEIRA aba e casa cada coluna pelo nome exato do cabeçalho.',
];

/**
 * Texto pronto para colar num chat de IA junto com a lista de tarefas. Mora dentro da
 * planilha, e não só na tela, porque o caso de uso é anexar o arquivo à conversa.
 */
const INSTRUCAO_PARA_IA = [
  'Monte uma tabela para importação de sprint com exatamente estas colunas, nesta ordem:',
  'Sprint | ID | Título | Descrição da Tarefa Pai | Subtarefa | Responsável | Descrição | Estimativa (h) | Data de Entrega | Projeto | Processo.',
  'Regras: uma linha por subtarefa; as linhas da mesma tarefa pai repetem o mesmo "Título";',
  '"Descrição da Tarefa Pai" é preenchida só na primeira linha de cada tarefa pai e fica vazia nas demais;',
  '"Descrição" é a da subtarefa daquela linha; as descrições podem usar markdown (## seção, - item, **negrito**);',
  'datas em dd/mm/aaaa; "Estimativa (h)" em número; "Responsável" é só o primeiro nome.',
  'Não crie linha separada para a tarefa pai e não invente colunas. Responda apenas com a tabela.',
];

export function linhasDeInstrucoesDoModelo(): string[][] {
  return [
    ['COMO PREENCHER ESTA PLANILHA'],
    [`Preencha a aba "${ABA_DE_DADOS}", que é a que o sistema lê. Esta aba aqui é só referência.`],
    [],
    ['REGRAS'],
    // Cada bloco de texto ocupa só a coluna A: com as vizinhas vazias, o Excel deixa a
    // frase transbordar e ela é lida inteira sem quebrar o layout da tabela de colunas.
    ...REGRAS.map((regra, indice) => [`${indice + 1}. ${regra}`]),
    [],
    ['COLUNAS'],
    ['Coluna', 'Obrigatória?', 'O que escrever', 'Exemplo'],
    ...COLUNAS_EXPLICADAS.map((coluna) => [...coluna]),
    [],
    ['PARA PEDIR A UMA IA QUE MONTE SUAS TAREFAS NESTE FORMATO'],
    ['Anexe este arquivo, cole o texto abaixo e liste as suas tarefas em seguida:'],
    ...INSTRUCAO_PARA_IA.map((linha) => [linha]),
  ];
}

export function montarPastaDoModelo(): XLSX.WorkBook {
  const dados = XLSX.utils.json_to_sheet(linhasDoModeloDeSprint());
  dados['!cols'] = [
    { wch: 22 }, { wch: 10 }, { wch: 34 }, { wch: 48 }, { wch: 34 },
    { wch: 16 }, { wch: 48 }, { wch: 14 }, { wch: 16 }, { wch: 20 },
    { wch: 20 },
  ];

  const instrucoes = XLSX.utils.aoa_to_sheet(linhasDeInstrucoesDoModelo());
  instrucoes['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 92 }, { wch: 40 }];

  const pasta = XLSX.utils.book_new();
  // A aba de dados vem primeiro porque `parseExcelFile` lê `SheetNames[0]`.
  XLSX.utils.book_append_sheet(pasta, dados, ABA_DE_DADOS);
  XLSX.utils.book_append_sheet(pasta, instrucoes, ABA_DE_INSTRUCOES);
  return pasta;
}

export function baixarModeloDeSprint(nomeArquivo = NOME_DO_MODELO_DE_SPRINT) {
  XLSX.writeFile(montarPastaDoModelo(), nomeArquivo);
}
