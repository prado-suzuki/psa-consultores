/**
 * As categorias de projeto da carteira do Digital.
 *
 * O QUE A COLUNA `projects.status` GUARDA, e não é o que o nome dela promete.
 * Medido em produção em 10/09/2026: as 17 linhas trazem `Melhorias` (10) e
 * `Diagnóstico` (7), e mais nada. Isso é CATEGORIA de trabalho, não situação —
 * nenhuma das duas palavras diz se o projeto está andando, parado ou entregue.
 *
 * A tela `/equipe/projetos` é a carteira do Digital: o que a área executa PARA
 * as outras. Confirma no dado — `projects.area` traz Tax (8), OSG (7), Área
 * Digital (1) e uma sem área. Os "Diagnóstico" são as frentes de consultoria
 * societária (P1 Gestão, P2 Contratos, P3 Sucessão…) e os "Melhorias" são as
 * automações (Automação SPED, DIFAL Inteligente, Dashboard PERDCOMP…).
 *
 * ⚠️ NÃO CONFUNDIR COM `org_projects`, e o erro já custou três mapas de código.
 * Aquela é outra tabela, com 140 linhas, onde vivem as 954 tarefas e onde o
 * `status` É ciclo de vida de verdade (`active` 133, `completed` 3, `planned` 3,
 * `on_hold` 1). É ela que as telas de "Projetos e tarefas" da Tax e da OSG usam.
 * Três lugares do código escreveram mapas de CICLO DE VIDA apontando para a
 * coluna de CATEGORIA — `ClienteDashboard`, `ProjectFilters` e o
 * `statusProjetoLabel` das agregações —, e por isso o filtro da equipe oferecia
 * Ativo / Concluído / Bloqueado / Arquivado e as quatro opções devolviam zero
 * linhas, sempre.
 *
 * REGISTRADO E NÃO RESOLVIDO: hoje a categoria não carrega informação que a
 * `area` já não carregue — a correlação é perfeita, `Diagnóstico` é OSG nas 7 e
 * `Melhorias` é o resto nas 10. Isso pode ser coincidência de carteira pequena
 * (nada impede uma frente de Diagnóstico na Tax amanhã) ou redundância de
 * verdade. É decisão de produto, e a dona da tela quer melhorá-la; este arquivo
 * só para de mentir sobre o que a coluna guarda.
 */
export interface CategoriaDeProjeto {
  /** Como aparece na tela. */
  rotulo: string;
  /**
   * O papel de status que pinta a pílula.
   *
   * Papel e não cor: quem resolve o tom é a área, no `<html>`. Ver
   * `docs/geral/paleta-por-area.md`. `fila` é "entrou, ainda não virou
   * execução", que é o que um diagnóstico é; `andamento` é o trabalho correndo.
   */
  papel: 'fila' | 'andamento';
}

export const CATEGORIAS_DE_PROJETO = {
  Melhorias: { rotulo: 'Melhorias', papel: 'andamento' },
  Diagnóstico: { rotulo: 'Diagnóstico', papel: 'fila' },
} as const satisfies Record<string, CategoriaDeProjeto>;

export type ChaveDeCategoria = keyof typeof CATEGORIAS_DE_PROJETO;

/** As chaves na ordem em que aparecem num seletor. */
export const CATEGORIAS_EM_ORDEM = Object.keys(CATEGORIAS_DE_PROJETO) as ChaveDeCategoria[];

/** As classes da pílula de uma categoria, no papel dela. */
export function classesDaCategoria(chave: string): string {
  const categoria = (CATEGORIAS_DE_PROJETO as Record<string, CategoriaDeProjeto>)[chave];
  if (!categoria) return 'bg-status-neutro-soft text-status-neutro';
  const { papel } = categoria;
  return `bg-status-${papel}-soft text-status-${papel} hover:bg-status-${papel}-soft`;
}

/** O rótulo de uma categoria; valor desconhecido volta como veio. */
export function rotuloDaCategoria(chave: string | null | undefined): string {
  if (!chave) return 'Sem categoria';
  return (CATEGORIAS_DE_PROJETO as Record<string, CategoriaDeProjeto>)[chave]?.rotulo ?? chave;
}
