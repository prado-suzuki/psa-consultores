# Auditar o acesso por papel na área de Projetos

> **O sintoma que gerou a tarefa:** para uma pessoa enxergar um projeto do qual ela é
> responsável, hoje é preciso promovê-la a **Líder Geral**. Isso vem acontecendo com várias
> pessoas, e o resultado é uma base de usuários em que "líder" não quer mais dizer líder.
>
> **Banco: não nesta tarefa.** Ela mede e propõe. A correção das policies é tarefa seguinte,
> e toca RLS de produção.

## O que foi medido, e onde

Varredura na `develop` em 24/09/2026, sobre `supabase/migrations/00000000000000_baseline.sql`.

| onde procurei | o que achei |
|---|---|
| hierarquia de papéis | `team_member`(1) < `sublider`(2) < `lider`(3) < `admin`(4), em `has_role_or_higher` (`:2681`) |
| papéis fora da hierarquia | `client`, `timecliente`, `marketing` — não abrem nada sozinhos (`roleOptions.ts`) |
| quem vê um projeto | `rls_projects_select` (`:18105`) |
| a coluna do responsável | `projects.leader_id` existe e **não aparece em policy nenhuma** de `projects` |
| a mesma ideia feita certo | `rls_org_projects_select` (`:17662`) |
| envio da solicitação de documentos | `sublider_na_os()` (`:3777`) |

### O achado central: o vínculo não concede nada

`rls_projects_select` abre o projeto para três casos, e **ser responsável não é nenhum deles**:

1. `has_role_or_higher(uid, 'lider')`
2. `has_role_or_higher(uid, 'team_member')` **e** `created_by = auth.uid()`
3. o cliente, via `client_visible_projects`

Quem é `team_member` e não criou o projeto não o enxerga, por mais que seja o responsável
registrado em `leader_id`. A única saída pela interface é promover a `lider` — que é
exatamente o que vem sendo feito.

### O padrão correto já existe na casa

`rls_org_projects_select` lê o vínculo direto:

```
has_role(admin) OR created_by = uid OR responsible_id = uid OR leader_id = uid
  OR can_view_org_project(uid, id)
```

Então a proposta desta tarefa não inventa modelo novo: ela alinha `projects` ao que
`org_projects` já faz.

### A solicitação de documentos é outro mecanismo

Escrita em `solicitacao` e `solicitacao_item` passa por `sublider_na_os(ordem_servico_id)`,
que exige **duas coisas ao mesmo tempo**: papel `sublider` ou acima **e** ser membro de
algum projeto daquela OS (`org_project_members`).

Consequência prática, e ela muda a recomendação: **`sublider` já bastaria** para enviar a
solicitação. Quem obriga a subir até `lider` é a policy de `projects`, não esta. Boa parte
das promoções a Líder Geral pode ser desnecessária mesmo antes de qualquer correção.

## Subtarefas

### T0 — Fotografar o estado em produção

Por SELECT no MCP do Lovable: quantas pessoas têm cada papel em `user_roles`; quantos
projetos têm `leader_id` preenchido; e, cruzando os dois, **quantos líderes existem hoje
apenas porque são responsáveis por algum projeto**. Esse número é o tamanho do problema e
deve abrir o relatório.

### T1 — Mapear a área inteira, papel a papel

Uma tabela de dupla entrada: papel nas colunas, operação nas linhas, para `projects`,
`org_projects`, `project_processes`, `project_servicos`, `project_documents`, `solicitacao` e
`solicitacao_item`. Cada célula cita a policy que a justifica. É o entregável que falta hoje:
ninguém consegue responder "o que um Membro vê" sem ler o baseline.

### T2 — Comparar com `org_projects` e nomear a divergência

As duas tabelas de projeto tratam o mesmo conceito de formas diferentes. Registrar onde
divergem e qual das duas é a referência.

### T3 — Propor o modelo ⚠️ **decisão dela**

A pergunta a responder não é técnica: **o que deve conceder acesso a um projeto** — o papel,
o vínculo (responsável, membro, criador), ou os dois? E qual piso de papel fica para escrita.
A proposta sai daqui; a migration, não.

### T4 — Listar quem pode ser rebaixado

Com o modelo decidido, dizer nominalmente quem hoje é `lider` só para contornar a policy e
poderia voltar a `sublider` ou `team_member`. É o que devolve significado ao papel.

## O que esta tarefa não entrega

- **Não altera policy.** Nenhuma migration, nenhum `UPDATE` em produção. Só medição,
  tabela e proposta.
- **Não trata a inversão do UPDATE.** `rls_projects_update` (`:18114`) libera UPDATE para
  qualquer `team_member`, sem dono — existe quem não enxerga um projeto e mesmo assim pode
  alterá-lo. Achado de lambuja desta varredura, separado em tarefa própria por ser problema
  de segurança, não de organização de papéis.
- **Não varre o resto do banco.** As outras 130 tabelas com policy por papel estão na
  varredura geral, que depende do método definido aqui.

## Aceite

- [ ] O número da T0 está escrito: quantos líderes existem só por causa da policy.
- [ ] A tabela papel × operação cobre as sete tabelas da área, cada célula com a policy.
- [ ] A divergência entre `projects` e `org_projects` está nomeada.
- [ ] O modelo da T3 está decidido por ela, por escrito.
- [ ] A lista da T4 existe, com nomes.
- [ ] Nenhuma policy foi alterada por esta tarefa.

## Referências

| arquivo | o que é |
|---|---|
| `supabase/migrations/00000000000000_baseline.sql:18105` | `rls_projects_select` — a policy que gera o sintoma |
| `supabase/migrations/00000000000000_baseline.sql:17662` | `rls_org_projects_select` — o padrão que lê vínculo |
| `supabase/migrations/00000000000000_baseline.sql:3777` | `sublider_na_os` — a porta da solicitação de documentos |
| `supabase/migrations/00000000000000_baseline.sql:2681` | a hierarquia de `has_role_or_higher` |
| `src/components/acessos/roleOptions.ts` | os sete papéis como aparecem na tela |
| `docs/rls/mapa-do-banco.md` | colunas de `projects`, incluindo `leader_id` |
