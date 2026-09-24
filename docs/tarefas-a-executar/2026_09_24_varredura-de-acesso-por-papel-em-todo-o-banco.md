# Varrer o acesso por papel nas tabelas com policy de papel

> **Depende de** [`2026_09_24_acessos-por-papel-na-area-de-projetos.md`](2026_09_24_acessos-por-papel-na-area-de-projetos.md),
> que define o método e o modelo. Começar por aqui é refazer a discussão em 130 lugares.
>
> **Banco: não.** Esta tarefa lê e classifica. Correção é tarefa seguinte.

## O tamanho, medido

Varredura na `develop` em 24/09/2026, sobre o baseline:

| indicador | número |
|---|---|
| policies no baseline | 532 |
| tabelas com policy que chama `has_role_or_higher` | **130** |

## Não confundir com a dívida de RLS de julho

Existe uma auditoria de RLS aberta, [`2026_07_10_divida-tecnica-de-rls.md`](2026_07_10_divida-tecnica-de-rls.md),
dono Eduardo, com o P1 fechado em produção. Ela trata de **`USING (true)`** — tabelas sem
isolamento nenhum, em que qualquer autenticado lê e escreve.

**Esta tarefa é o problema inverso:** a policy restringe, mas pelo critério errado. Ela
pergunta só "que papel você tem", e ignora "você é responsável por isso". O resultado não é
dado exposto: é gente promovida a Líder Geral para conseguir trabalhar.

As duas se encontram em algumas tabelas. **Não reabrir o que o P1 fechou** — conferir a
lista de lá antes de tocar em qualquer tabela.

## Subtarefas

### T1 — Classificar as 130

Cada tabela cai em uma de três caixas, e a caixa é o entregável:

- **Papel basta** — catálogo, configuração, coisa sem dono. Está certo como está.
- **Tem vínculo e ignora** — existe coluna de responsável, membro ou dono que a policy não
  lê. É a caixa que importa, e é onde `projects` cai.
- **Já lê vínculo** — serve de referência, como `org_projects`.

### T2 — Achar as colunas de vínculo

Por `information_schema`, as colunas com FK para `profiles.id` em cada uma das 130
(`leader_id`, `responsible_id`, `assigned_to`, `created_by`, `owner_id`, e o que mais
aparecer). A existência da coluna sem uso na policy é a assinatura do problema.

### T3 — Priorizar pelo que dói

Ordenar a caixa "tem vínculo e ignora" por quantas pessoas hoje contornam a falta com papel
alto. Sem esse cruzamento a lista vira inventário e não fila.

### T4 — Entregar a fila, não a correção

O produto é a lista priorizada, cada linha com a policy, a coluna ignorada e o impacto. As
migrations saem depois, em tarefas por módulo, porque cada uma muda comportamento em
produção e precisa passar pelo chat do Lovable.

## O que esta tarefa não entrega

- **Nenhuma migration.** Nem no sandbox.
- **Não revisa `USING (true)`.** Isso é da tarefa de julho, e tem dono.
- **Não decide o modelo.** Ele vem da auditoria de Projetos.

## Aceite

- [ ] As 130 tabelas estão classificadas nas três caixas, sem sobra.
- [ ] Cada tabela da caixa do meio tem a policy e a coluna de vínculo ignorada citadas.
- [ ] A fila está ordenada por impacto medido, não por impressão.
- [ ] A conferência contra o P1 de julho está registrada, dizendo o que foi deixado de fora.
- [ ] Nenhuma policy foi alterada.
