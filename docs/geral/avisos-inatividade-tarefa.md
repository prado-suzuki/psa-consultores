# Avisos de tarefa e projeto sem movimentação — textos do sino

**Redação da consultoria, fechada pela Patrícia em 21/09/2026.** É o irmão do
[aviso de prazo](avisos-prazo-tarefa.md) (GES-01A): lá o gatilho é a data final, aqui é o
silêncio. Não se reescreve sem ela.

---

## O critério, enxuto

Tarefa **sem movimentação** é tarefa de cliente que cumpre as quatro condições:

| | |
|---|---|
| **Está aberta** | status diferente de `done` e `backlog` |
| **Não está esperando o cliente** | status diferente de `waiting_client` |
| **Parou** | a última movimentação relevante tem 15 dias ou mais |
| **É do ambiente varrido** | o cliente dela casa com o ambiente da varredura |

**Projeto sem movimentação** é o agregado, aos 30 dias: **nenhuma** tarefa aberta dele se
moveu. Projeto sem tarefa aberta elegível não aparece, o que resolve sozinho o projeto já
encerrado.

## O que conta como movimentação

**Conta**, e é a mais recente entre estas sete:

| Movimentação | De onde sai |
|---|---|
| status alterado | `audit_logs`, `changed_fields ? 'status'` |
| responsável alterado | `audit_logs`, `changed_fields ? 'assigned_to'` |
| revisor alterado | `audit_logs`, `changed_fields ? 'reviewer_id'` |
| horas lançadas | `audit_logs`, `changed_fields ? 'actual_hours'` |
| tarefa criada | `audit_logs`, `action = 'created'` |
| comentário registrado | `org_comments` (`entity_type='org_task'`, não excluído) e `org_task_comments` (`is_system = false`) |
| etapa concluída | subtarefa cujo status foi para `done` |

**Não conta:** título, descrição, tag, prioridade, prazo, projeto, e os campos de cadastro
(cliente, contribuinte, categoria, serviço). São os que a consultoria chamou de "meramente
cadastrais", e a frase dela foi: *"Alterações meramente cadastrais não deveriam
necessariamente tirar a tarefa da condição de inativa."*

**Tarefa sem nenhuma linha de auditoria** usa `created_at` como movimento zero. São metade
das abertas em produção, 238 de 502 medidas em 21/09/2026, e para elas o corpo diz "desde
a criação" em vez de inventar um motivo.

## A escada

| Quem recebe | A partir de |
|---|---|
| responsável, ou o revisor quando em revisão | 15 dias |
| gestor da equipe | 22 dias, sete depois do responsável |
| gestor, para o projeto | 30 dias |

**O número que motivou a escada:** medido no sandbox antes de implementá-la, dos 171
avisos, 75 iam para 3 gestores — 25 de uma vez para cada um — contra 86 divididos entre 15
responsáveis. Quem entupia era o sino de quem precisa da exceção.

**Efeito que vem junto, e é desejado:** tarefa que se move no dia 16 e para de novo
reinicia a contagem, então o gestor nunca ouve falar de tarefa que oscila. Ele ouve falar
da que ficou fria 22 dias corridos.

## O que passa a sair

Cenário: tarefa **"Apuração ICMS — Frigobom"**, parada desde 31/08/2026, responsável
**Layara Souza**, gestor **Felipe Prado**.

| # | Quem recebe | Título | Corpo |
|---|---|---|---|
| 1 | responsável | `Sem movimentação há 18 dias: Apuração ICMS — Frigobom` | `Última movimentação em 31/08/2026: status alterado para "Revisão".` |
| 2 | gestor, aos 22 | `Sem movimentação há 22 dias: Apuração ICMS — Frigobom` | `Responsável: Layara Souza. Última movimentação em 31/08/2026: status alterado para "Revisão".` |
| 3 | responsável, sem auditoria | `Sem movimentação há 18 dias: Apuração ICMS — Frigobom` | `Sem movimentação desde a criação, em 31/08/2026.` |
| 4 | gestor, projeto | `Projeto sem movimentação há 35 dias: Implantação Frigobom` | `Nenhuma tarefa do projeto teve movimentação desde 27/08/2026.` |

O fecho do corpo é variável e nomeia a última movimentação: `status alterado para "X"`,
`responsável alterado`, `revisor alterado`, `horas lançadas`, `comentário registrado`,
`etapa concluída` ou `tarefa criada`.

### Duas diferenças da redação original, as duas de propósito

**O ano entra na data.** O exemplo da Patrícia escrevia "em 31/08"; sai "31/08/2026". As
paradas medidas chegam a 206 dias, então a data cruza o ano, e o aviso de prazo irmão já
escreve o ano ("O prazo era 05/09/2026"). Duas datas irmãs no mesmo sino têm de se ler
igual.

**O rótulo do status é o da tela.** Ela escreveu "Em revisão"; o rótulo que a tela mostra é
"Revisão" (`src/lib/taskStatusColors.ts`). Vale o da tela, senão o sino chama de um jeito o
que o quadro chama de outro.

## Por que "sem movimentação" e não "parada"

Palavra da consultoria, e o argumento dela: *"'parada' é mais interpretativo. Uma tarefa
pode estar legitimamente aguardando cliente, prazo ou dependência externa e, ainda assim,
aparecer como parada."*

Vale em todo lugar: no título, no corpo e no rótulo do sino. **A chave do enum segue
`tarefa_inativa` e `projeto_inativo`**, que são dado e não texto de tela.

## Rótulo na linha do sino

| Tipo | Rótulo | Tom | Ícone |
|---|---|---|---|
| `tarefa_inativa` | Sem movimentação | âmbar | ampulheta |
| `projeto_inativo` | Projeto sem movimentação | âmbar | ampulheta |

**Âmbar e não vermelho**, porque falta de movimento não é estouro: não venceu coisa
nenhuma, e o vermelho é do atraso, que é fato consumado. **Mesmo ícone nos dois**, porque o
gestor lê os dois como a mesma categoria; o que distingue é o rótulo.

O título do item do sino ocupa **duas linhas**. Com uma só, o prefixo consumia os 320px do
painel e o nome da tarefa se perdia nas reticências.

## Estado

| | |
|---|---|
| **Migrations** | `20260918212051`, `20260918213116`, `20260921103000`, `20260921110000`, `20260921110500` |
| **Sandbox** | aplicadas, com os dois crons ativos (07h e 07h05 de Cuiabá) |
| **Produção** | **nada aplicado.** Não tem as funções nem os dois valores do enum |
| **Front** | rótulo e ícone dos dois tipos no ar, e o `types.ts` regerado |
| **Prova de fronteira** | `supabase/tests/ges01b-fronteira-da-inatividade/`, 15 afirmações, **rodada e verde** em 21/09/2026 contra o Postgres 17.6 |

**Ao ligar em produção, medir a fila primeiro.** A regra conta desde a última movimentação,
sem data de largada, então no primeiro dia no ar todo o passivo dispara de uma vez. Rodar
`tarefas_inativas(NULL, 15, 'prod')` e `projetos_inativos(NULL, 30, 'prod')` à mão mostra o
tamanho antes de o cron escrever. A decisão do que fazer com esse passivo é do dono do
produto.

## Referências

- [Aviso de prazo de tarefa (GES-01A)](avisos-prazo-tarefa.md) — o irmão, mesma família de
  título e corpo
- [O texto que explica a tela](texto-explicativo-na-tela.md) — padrão de redação
- `src/lib/notificacoesInternas.ts` — rótulo e tom
- `src/components/notifications/ItensDoSino.tsx` — ícone e as duas linhas do título
