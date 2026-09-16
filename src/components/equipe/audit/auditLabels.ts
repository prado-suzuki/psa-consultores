// Rótulos compartilhados entre as abas de Auditoria (Histórico, Produtividade,
// Atividade e Pessoas).
//
// As janelas do seletor de período moraram aqui até virarem cálculo de datas:
// agora são `periodosAuditoria` / `janelaDoPeriodo`, em `@/lib/auditPeriodos`.

/**
 * A ação de uma linha de `audit_logs`, nos papéis de status da área.
 *
 * ## Por que o mapa mora aqui, e não em cada tela
 *
 * Ele estava escrito em TRÊS arquivos sobre a mesma coluna `audit_logs.action`:
 * este, o `client-form/HistoricoTab` e o `osg/HistoricoFlutuante`. Em 03/09/2026
 * as três foram convertidas para os mesmos tokens **e nenhuma foi extraída** —
 * então em 11/09 elas estavam byte a byte iguais, por sorte, e a próxima rodada
 * de cor as reencontraria como achado novo. Foi exatamente o que aconteceu três
 * vezes com o botão "Sair" (`DevLayout`, `OsgLayout`, `FixosLayout`).
 *
 * Consolidar custou um `import` e **zero pixel**.
 *
 * ## O que a conversão de 03/09 decidiu, e vale como histórico
 *
 * As três entradas falavam três línguas: `created` e `updated` em esmeralda e
 * azul do estoque do Tailwind, que não acompanham tema nenhum, e `deleted` em
 * `osg-red`, que é a ÂNCORA da OSG e não pinta papel de status. Como é um mapa,
 * as três andam juntas — converter só a vermelha deixaria escada meio crua.
 *
 * E duas regras que a mesma rodada fixou, para quem for pintar contagem de
 * auditoria: **selo veste papel; contagem não** (as colunas numéricas de
 * Criações/Edições/Exclusões perderam a cor, porque vermelho em "Exclusões"
 * afirmava problema sobre atividade normal), e **ausência de dado não é falha**
 * (`sem_registro` foi para `neutro`, não `ajuste`).
 */
export const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: 'Criação', color: 'bg-status-feito-soft text-status-feito' },
  updated: { label: 'Edição', color: 'bg-status-andamento-soft text-status-andamento' },
  deleted: { label: 'Exclusão', color: 'bg-status-ajuste-soft text-status-ajuste' },
};

export const ENTITY_LABELS: Record<string, string> = {
  project: 'Projeto',
  task: 'Tarefa',
  subtask: 'Subtarefa',
  solicitacao_item_nao_aplicavel: 'Documento não aplicável',
};
