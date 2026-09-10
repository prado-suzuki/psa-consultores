import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CATEGORIAS_EM_ORDEM } from './categoriaDoProjeto';

/**
 * Catraca da categoria de projeto: quem lê `projects` não usa ciclo de vida.
 *
 * O DEFEITO QUE ISTO FECHA. Existem duas tabelas de projeto, e elas guardam
 * coisas diferentes numa coluna com o mesmo nome:
 *
 *   projects       17 linhas, `status` = Melhorias | Diagnóstico   -> CATEGORIA
 *   org_projects  140 linhas, `status` = active | completed |
 *                             planned | on_hold                    -> CICLO DE VIDA
 *
 * Dois lugares escreveram mapas de ciclo de vida apontados para a coluna de
 * categoria. O `ProjectFilters` oferecia Ativo / Concluído / Bloqueado /
 * Arquivado e comparava `project.status === statusFilter` direto: as quatro
 * devolviam zero linhas desde sempre, e ninguém tinha reparado porque a tela
 * abre com "Todos" e quase ninguém filtra. O `ClienteDashboard` mostrava
 * "Em Planejamento" e 0% para tudo, pelo mesmo motivo.
 *
 * O erro é fácil de repetir: as duas colunas se chamam `status`, as duas são
 * texto livre no banco, e o autocompletar não distingue. É por isso que isto é
 * teste e não comentário.
 *
 * O QUE FICA DE FORA, e é importante para não "consertar" o que está certo:
 * `lib/dashboardClientesOs/aggregations.ts` também traduz `active`,
 * `completed`, `on_hold` e `planned` — e está CORRETO, porque ele recebe
 * `RawOrgProject`, de `org_projects`. Ciclo de vida ali é o vocabulário certo
 * da tabela certa.
 */

const RAIZ = resolve(__dirname, '..');

/** As chaves de ciclo de vida, que pertencem a `org_projects` e não a `projects`. */
const CICLO_DE_VIDA = ['planning', 'active', 'on_hold', 'completed', 'blocked', 'archived'];

/** Os arquivos que leem `projects` e mostram a coluna `status` na tela. */
const LEEM_A_CARTEIRA = [
  'pages/cliente/ClienteDashboard.tsx',
  'components/equipe/projetos/ProjectFilters.tsx',
];

describe('categoria de projeto: `projects` não guarda ciclo de vida', () => {
  it.each(LEEM_A_CARTEIRA)('%s não usa vocabulário de ciclo de vida', arquivo => {
    const fonte = readFileSync(resolve(RAIZ, arquivo), 'utf8');
    // Só o que é VALOR de código conta: `"active"` ou `'active'`. Prosa de
    // comentário que conte esta história é para ficar — e conta.
    const encontrados = CICLO_DE_VIDA.filter(chave =>
      new RegExp(`["']${chave}["']`).test(fonte),
    );
    expect(
      encontrados,
      `${arquivo} usa chave de ciclo de vida contra \`projects\`, que guarda CATEGORIA\n` +
        `(Melhorias | Diagnóstico). Foi assim que o filtro da equipe devolveu zero\n` +
        `linhas em todas as opções. Use \`@/lib/categoriaDoProjeto\`.\n` +
        `Encontradas: ${encontrados.join(', ')}`,
    ).toEqual([]);
  });

  it('a carteira tem exatamente as duas categorias que a coluna guarda', () => {
    // Medido em produção em 10/09/2026 pelo MCP do Lovable:
    //   SELECT status, count(*) FROM projects GROUP BY status
    //   -> Melhorias 10, Diagnóstico 7
    // Se a coluna ganhar uma terceira categoria, esta linha cai e alguém tem que
    // decidir o rótulo e o papel de cor dela em vez de a tela mostrar o valor cru.
    expect(CATEGORIAS_EM_ORDEM).toEqual(['Melhorias', 'Diagnóstico']);
  });
});
