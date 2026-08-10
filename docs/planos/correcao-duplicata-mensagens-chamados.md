# Correção — mensagens duplicadas em Chamados

**Data:** 07/08/2026 · **Área:** Chamados (portal do cliente) · **Severidade:** alta

## O problema

Desde 09/07/2026, respostas de clientes são gravadas e o portal exibe "Erro ao enviar mensagem".
O cliente reenvia e a mensagem duplica. Pior: a equipe não é avisada da resposta.

Medido no banco de produção em 06/08/2026:

- **5 chamados** com mensagem duplicada, **6 linhas excedentes** — 100% de clientes, nenhuma da equipe
- **11 de 18** respostas de cliente pós-migração caíram no problema; antes eram **25 respostas, 0 duplicatas**
- **4 de 6** chamados com última resposta do cliente estão marcados como "respondido" — fila da equipe mentindo
- E-mail de notificação da resposta do cliente **não foi disparado** nesses casos

## Causa raiz

A migração `20260708135606` (08/07, 13:56) restringiu a leitura de `rls_precheck_allowed_tables`
a `team_member` ou superior. A função `can_perform` é SECURITY INVOKER: para a role `client` a
leitura volta vazia, a função lança exceção e o `assertCanPerform` derruba o fluxo **depois** que a
mensagem já foi gravada. Tudo o que vem a seguir — status do chamado e notificação — nunca roda.
A equipe não sofre porque quem responde é admin, sublíder ou o responsável atribuído.

## Plano

| # | Ação | Onde | Esforço | Risco |
|---|---|---|---|---|
| 1 | Remover o precheck de RLS que roda depois da gravação | `useTicketMutations.ts` | 15 min | baixo |
| 2 | Tratar status do chamado e notificação como efeito colateral: falha registra alerta, não derruba o envio | `useTicketMutations.ts` | 30 min | baixo |
| 3 | Limpar o editor ao gravar e bloquear reenvio idêntico consecutivo | `DetalhesChamado.tsx` + editor | 30 min | baixo |
| 4 | Migração: liberar a leitura da tabela de metadados do precheck (ou torná-la SECURITY DEFINER) | `supabase/migrations` | 20 min | médio — precisa aprovação |
| 5 | Corrigir os dados: apagar as 6 cópias e reacertar o status dos 4 chamados | script pontual | 20 min | médio — precisa aprovação |
| 6 | Teste automatizado do cenário "gravou mas o pós-processamento falhou" | `useTicketMutations.test.ts` | 40 min | baixo |

**Ordem:** 1-2-3 primeiro — param a sangria sem tocar no banco. Depois 4 (restaura o aviso à equipe),
5 (higieniza o histórico) e 6 (impede recaída).

**Validação:** responder um chamado pelo portal do cliente e confirmar três coisas — uma única
mensagem gravada, chamado volta para "aguardando resposta", e-mail disparado.

## Preciso da sua aprovação

- **Item 4** é migração de banco. Escrevo o arquivo e **não aplico** — aplicação é sua.
- **Item 5** é escrita em produção. Dry-run read-only de 07/08 confirma o alcance: **6 DELETE**
  (as 6 cópias excedentes, sempre preservando a primeira) e **1 UPDATE** de `activity_status`
  (só o chamado aberto). Outros 4 chamados com resposta de cliente sem tratativa já estão
  concluídos — a migração apenas os reporta, para você decidir sobre reabertura.
  Não executo sem seu OK.

Itens 1, 2, 3 e 6 são só frontend e teste — posso fazer agora.

---

## Execução (07/08/2026)

Itens 1, 2, 3 e 6 implementados; 4 e 5 escritos num único arquivo de migração, **não aplicados**.

| Arquivo | Papel |
|---|---|
| `supabase/migrations/20260807120000_precheck_client_e_duplicatas_chamados.sql` | RLS + trigger + backfill + backup + delete, numa migração só |
| `supabase/backups/20260807-ticket-messages-duplicadas.sql` | Backup extraído via MCP antes de qualquer escrita |
| `src/lib/ticketMessageOutcome.ts` (+ teste) | Contrato do resultado e textos de feedback |
| `src/hooks/useTicketMutations.ts` | `useSendTicketMessage` sem precheck pós-write; efeitos colaterais viram avisos |
| `src/hooks/useTicketMutations.test.ts` | Trava a regressão (inclui teste que falha se o precheck voltar) |
| `DetalhesChamado` / `EquipeDetalhesChamado` / `GestaoDetalhesChamado` | Limpam o editor sempre que a mensagem foi gravada |

Validação: 2342 testes passando, typecheck limpo, lint sem novos apontamentos.
