## Bug

No modal de Sprint (criar/editar entregável) em `/equipe/sprints`, ao escolher um projeto do cluster **OSG**, o select de **Processo** fica vazio. No cluster **PSA Consultores** funciona.

## Causa

`EquipeSprintDetalhes.tsx` filtra processos olhando **apenas** a tabela de junção `project_processes` (linhas 2343-2345 e 2594-2596):

```ts
processes.filter(proc =>
  projectProcesses.some(pp => pp.process_id === proc.id && pp.project_id === form.project_id)
)
```

Confirmado no banco:

| Cluster | projects | processes | linhas em `project_processes` |
|---|---|---|---|
| PSA Consultores | 10 | 17 | **4.420** |
| OSG | 6 | 34 | **0** |

Os 34 processos do OSG têm vínculo direto via `processes.project_id` (todos preenchidos), e nunca foram populados em `project_processes`. Logo, o filtro do modal retorna vazio para qualquer projeto OSG.

## Correção proposta

Aceitar os dois modelos de vínculo no filtro — junção `project_processes` **OU** FK direta `processes.project_id`. Mudança somente no frontend, nos dois selects de Processo do `EquipeSprintDetalhes.tsx`:

```ts
processes.filter(proc =>
  proc.project_id === form.project_id ||
  projectProcesses.some(pp => pp.process_id === proc.id && pp.project_id === form.project_id)
)
```

Requer também incluir `project_id` no SELECT de `processes` (linha ~310) e no tipo `Process` local.

Nenhuma alteração de schema, hook ou backend. Comportamento do PSA Consultores permanece idêntico (continua casando pela junção).

## Validação

Abrir Nova Sprint → cluster OSG → selecionar projeto → os 5–6 processos daquele projeto aparecem. Repetir com PSA Consultores: lista segue igual à atual.