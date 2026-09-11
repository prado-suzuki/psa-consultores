import { describe, expect, it } from 'vitest';

import { familiaCrua, medirCorCrua } from '@/lib/medirCorCrua';

/**
 * Catraca da fila do `blue`.
 *
 * A 3ª família em volume — 100 ocorrências em 39 arquivos quando foi medida, em
 * 11/09/2026 — e a única das grandes que **não aparecia em lista nenhuma**: sem
 * catraca, sem aviso de ESLint (diferente do `teal`), sem linha no contrato. Foi
 * a que mais pôde crescer calada, e esta catraca existe para encerrar isso.
 *
 * POR QUE O AZUL É DIFERENTE DAS OUTRAS FAMÍLIAS, e por que varrer seria errado:
 * ele é o único com **três casas legítimas** no contrato, e nenhuma das três é
 * óbvia olhando a classe —
 *
 * · o papel `fila` JÁ É AZUL (`212 59% 36%` na base). "A Fazer" e "prioridade
 *   Média" são dele, e acompanham a área;
 * · `--tag-b` é o frio da área — ardósia 211 na base, azul 223 na Tax, azul 218
 *   na OSG. É o tom de CATEGORIA, não de estado;
 * · `--info` é azul e **não** acompanha a área: nenhuma declara, todas herdam.
 *
 * Daí a regra de leitura, e ela é o que faz esta lista servir para a próxima
 * conversão: antes de escolher o destino, pergunte o que a cor está dizendo —
 * *em que pé está* (papel), *que coisa é* (tag) ou *nada* (superfície, hover,
 * moldura de bloco, que perdem a cor ou vestem a âncora quando são controle).
 *
 * O QUE FECHOU NESTA PASSADA, e os dois são a mesma alavanca — procurar o MAPA
 * do domínio antes de escrever classe:
 *
 * · `EquipeKanban` pegava o RÓTULO do `entregavelStatusColors` e escrevia a COR
 *   à mão, num `switch` logo abaixo. É ao pé da letra o defeito que o contrato
 *   descreve: enquanto rótulo e cor moram em lugares diferentes, uma tela pega
 *   um e esquece o outro;
 * · `projectPresentation.getStatusBadge` era a ÚLTIMA CÓPIA VIVA da divergência
 *   que o docstring do `sprintStatusColors` denuncia desde 10/09 — "Concluído"
 *   em azul de fábrica ali e em verde em todas as outras telas, sobre a mesma
 *   coluna `status`. O `getAreaBadge` do mesmo arquivo foi junto, para os tons
 *   categóricos, e levou duas armadilhas que não davam erro: um `hover:`
 *   montado por interpolação (classe dinâmica, que o Tailwind nunca gera) e o
 *   `hover:bg-primary/80` de fábrica do `Badge`, que `className` não neutraliza.
 *
 * SEIS SAÍRAM DE CARONA, e vale registrar porque confirma a regra do mapa: o
 * `ACTION_LABELS` das duas cópias (`audit/auditLabels` e `client-form/HistoricoTab`)
 * e a escada do `StageEditCard` foram convertidos pela frente do `red`/`emerald`,
 * em 11/09, sem passar por aqui. Mapa anda inteiro; quem chega primeiro leva.
 *
 * A FILA NÃO ZERA, e não devia. O que sobra está agrupado pelo MOTIVO de ter
 * ficado — é o motivo, e não o número, que faz a lista servir para a conversão
 * seguinte em vez de só contar.
 *
 * A asserção é de igualdade EXATA, então ela cai NOS DOIS SENTIDOS: reprova se
 * aparecer azul novo, e reprova também quando um grupo for convertido e os
 * números descerem — dizendo, na mensagem, o que fazer.
 */
const FILA_DO_BLUE = {
  /**
   * DECIDIDO EM 11/09/2026, aguardando execução — as quatro decisões da página
   * `docs/geral/comparacoes-de-cor/o-azul-de-tres-empregos.html`.
   *
   * · o selo Original/Retificadora das quatro Consultas: a linha passa a ser a
   *   COMPETÊNCIA, com as versões dentro dela, porque a retificação é feita por
   *   período. Some o selo solto;
   * · os números dos cartões de KPI: tom categórico (`tag-a`…`tag-d`), conferido
   *   com o validador da skill `dataviz` nos três temas;
   * · o cartão da Lista de Processos: chip para categoria, faixa de números para
   *   medida;
   * · a barra do Controle de Balancetes: a ação mora na linha, a barra do topo
   *   só aparece com seleção — e o `FileDown` vira `FileSpreadsheet`, porque os
   *   dois ícones de hoje são a mesma seta desenhada duas vezes.
   */
  decididoAguardandoExecucao: {
    // O `ControleBalancetes` saiu em 11/09/2026, e era a maior concentração numa
    // tela só: 7 das 100, todas dizendo "Excel". Decisão dela, opção F — a ação
    // de um balancete mora na LINHA dele, e a barra de lote só aparece quando há
    // seleção, dizendo quantos. O azul não era estado nem categoria: era
    // hierarquia de ação escrita com cor de estoque, inventando um terceiro
    // nível que o vocabulário do `ui/button` não tem.
    'src/components/equipe/ImpactDashboard.tsx': 4,
    'src/components/equipe/dev/consulta-efd-icms/EfdResultsTable.tsx': 3,
    'src/components/equipe/dev/pis-cofins/BalanceteTreeTable.tsx': 3,
    'src/components/equipe/processos/ProcessList.tsx': 3,
    'src/pages/equipe/dev/ConsultaECD.tsx': 3,
    'src/pages/equipe/dev/ConsultaECF.tsx': 3,
    'src/pages/equipe/dev/ConsultaEFD.tsx': 3,
    'src/pages/equipe/EquipeBacklog.tsx': 3,
    // Saiu em 11/09/2026 pela frente do VERMELHO E VERDE: a fileira de KPI tem as
    // duas famílias na mesma linha (atraso em vermelho, scope creep em azul), e ela
    // decidiu que scope creep é problema como os outros. Converter metade da
    // fileira era o defeito; foi inteira, e o azul veio junto.
    'src/components/equipe/dev/perdcomp/controle/ControlePerdcompResults.tsx': 2,
    'src/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteAnalysis.tsx': 1,
    'src/components/equipe/dev/perdcomp/dcomp/DcompFields.tsx': 1,
    'src/components/equipe/dev/perdcomp/per-detail/PerDetailHeader.tsx': 1,
    'src/pages/equipe/EquipeSprints.tsx': 1,
  },

  /**
   * SEM DECISÃO DENTRO — a resposta já está escrita em outro arquivo do
   * repositório, e o que falta é entregar.
   *
   * O trio do cenário (`KIND_COLOR`) está copiado em TRÊS arquivos, e cada cópia
   * tem três línguas na mesma chave: dois tons crus do Tailwind ao lado de um
   * token de acento. O `PROCESS_STAGES` é lido por três telas. E o azul do
   * `SavingsSections` e do `ImprovementHistoryModal` emoldura um bloco de
   * formulário — o caso que a página `superficie-de-estado.html` já leu em 27/08
   * e respondeu com uma palavra: *nada*. Como o cabeçalho é CONTROLE (abre e
   * fecha), ele veste a âncora e passa a informar o estado aberto.
   */
  semDecisao: {
    'src/components/equipe/mapeamento/ScenarioList.tsx': 5,
    'src/components/equipe/process-improvement/SavingsSections.tsx': 5,
    'src/components/equipe/ImprovementHistoryModal.tsx': 4,
    'src/components/acessos/pageCategoryStyles.ts': 3,
    'src/components/equipe/mapeamento/ScenarioComparator.tsx': 3,
    'src/components/equipe/mapeamento/ScenarioCreateModal.tsx': 3,
    // Caiu de 4 para 2 em 11/09/2026, pela frente do `red`/`emerald` (commit
    // `f0538b86`): o selo `team_member` foi junto quando os sete papéis viraram
    // o `ui/PapelBadge`. As 2 que sobram são o cartão de contagem "Membros" —
    // ícone e fundo —, que é KPI e não papel, e entra com a decisão 2.
    'src/components/acessos/UsersRolesView.tsx': 2,
    'src/components/equipe/projetos/constants.ts': 2,
    'src/components/equipe/sprint-detalhes/AgendaTab.tsx': 2,
    'src/pages/equipe/EquipeRelatorios.tsx': 2,
    'src/components/equipe/dev/consulta-xmls/ConsultaXmlFilters.tsx': 1,
    'src/components/equipe/dev/EFDFiscalTable.tsx': 1,
    'src/pages/equipe/DigitalAreaSelector.tsx': 1,
    'src/pages/equipe/EquipeBiblioteca.tsx': 1,
  },

  /**
   * FICA, COM O MOTIVO ESCRITO — mapa de 16 situações em 9 famílias do Tailwind,
   * das quais o azul são duas ("Análise preliminar disponibilizada" e
   * "Analisado").
   *
   * Converter só as duas azuis não melhora nada: troca escada crua por escada
   * meio crua, que o contrato diz ser pior. Duas das 16 já saíram na rodada do
   * cinza ("Não admitido" e "Pedido de cancelamento deferido"), e é justamente
   * isso que deixa o defeito visível — há três verdes diferentes dizendo três
   * coisas, e âmbar convivendo com amarelo.
   *
   * Decidir o vocabulário de situação do PER/DCOMP é uma rodada inteira, e é
   * decisão de produto, não de cor.
   */
  vocabularioDeDominioNaoDecidido: {
    'src/components/equipe/dev/perdcomp/PerDetailModal.tsx': 4,
  },

  /**
   * CÓDIGO QUE NINGUÉM CONSEGUE ABRIR — medido em 11/09/2026 percorrendo os
   * `import` até as páginas montadas no `App.tsx`: nenhuma rota monta estes três
   * arquivos (`AdminUsuarios`, `AdminPerformance`, e o `DemandList` via
   * `EquipeDemandas`).
   *
   * Converter aqui não muda um pixel para ninguém, e por isso não entra em
   * nenhuma das rodadas — mas fica MEDIDO, e não silenciosamente ignorado: se um
   * dia alguém registrar a rota, o azul aparece na tela e esta linha é o aviso
   * de que ele precisa ser convertido antes.
   *
   * É a mesma situação dos "componentes órfãos" que sobraram na fila do `gray`.
   */
  semRotaQueOsMonte: {
    'src/components/equipe/demandas/DemandList.tsx': 2,
    'src/pages/administracao/AdminUsuarios.tsx': 2,
    'src/pages/administracao/AdminPerformance.tsx': 1,
  },

  /**
   * UMA LINHA, DOZE ROTAS — a ocorrência mais espalhada de todas as 100.
   *
   * O ícone de documento Word do `docMeta` chega a doze telas: nove da OSG, mais
   * `/cliente`, `/equipe/acessos` e `/equipe/tax/projetos/clientes`. Está
   * separado das outras categorias porque o raio de revert é outro: mexer nele é
   * mexer em doze rotas de uma vez, e isso pede olhar próprio.
   */
  umaLinhaComAlcanceDeDozeRotas: {
    'src/components/equipe/osg/documentos/docMeta.ts': 1,
  },
} as const;

describe('fila do blue', () => {
  it('o azul de fábrica só existe onde esta lista diz, e na contagem que ela diz', () => {
    const medido = medirCorCrua(familiaCrua('blue'));
    const esperado = Object.assign({}, ...Object.values(FILA_DO_BLUE)) as Record<string, number>;

    expect(
      medido,
      'a fila do `blue` mudou.\n' +
        'Se APARECEU azul novo: pergunte o que a cor está dizendo antes de escolher o\n' +
        'destino — *em que pé está* é papel (`fila` já é azul e acompanha a área),\n' +
        '*que coisa é* é categoria (`--tag-b`, o frio da área), e *nada* é superfície\n' +
        'ou moldura, que perde a cor — ou veste a âncora, quando o elemento é controle.\n' +
        '`--info` existe, mas NÃO acompanha a área: use só onde isso for desejado.\n' +
        'Se você CONVERTEU um sítio: baixe a contagem do arquivo aqui, ou tire o\n' +
        'arquivo se zerou — e tire o grupo inteiro se ele esvaziou.',
    ).toEqual(esperado);
  });

  it('nenhum arquivo está em dois grupos, porque aí a contagem mentiria', () => {
    // O `Object.assign` do teste acima faz o último grupo VENCER em silêncio se o
    // mesmo arquivo aparecer duas vezes — e a soma passaria a ignorar uma das
    // entradas. Esta linha impede que a fila cresça com duplicata.
    const todos = Object.values(FILA_DO_BLUE).flatMap(grupo => Object.keys(grupo));
    expect(todos, 'arquivo repetido entre dois grupos da fila').toEqual([...new Set(todos)]);
  });
});
