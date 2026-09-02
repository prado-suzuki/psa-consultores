# TAREFA 6 — A redação dos avisos de prazo vai para produção

> **Urgente por causa do cron.** A GES-01A subiu a produção em 02/09/2026 — enum, as duas
> funções e o cron **ativo** — mas com o **texto de trabalho**, não com a redação que a
> Patricia fechou no mesmo dia. O job roda todo dia às 7h (11h UTC), então **a cada manhã a
> equipe recebe o texto errado**, com um defeito que se lê na própria linha do sino.
>
> Texto em vigor e decisões: [`docs/geral/avisos-prazo-tarefa.md`](../../geral/avisos-prazo-tarefa.md).
> A migração já está escrita: `supabase/migrations/20260902210245_ges01a_redacao_dos_avisos_de_prazo.sql`.
>
> **Nenhuma mudança de schema.** Duas funções reemitidas, mesma assinatura. Nem coluna, nem
> enum, nem policy, nem o cron.

## O que está no ar hoje

Conferido por SELECT em produção, 02/09/2026:

| | |
|---|---|
| `notificacao_tipo` | tem os dois valores novos (`tarefa_prazo_proximo`, `tarefa_atrasada`) |
| `tarefas_a_alertar(date, text)` · `alertar_tarefas_por_prazo(date, text)` | versão `20260901135620` — a do texto de trabalho |
| Cron `alertar-tarefas-prazo-diario` | **`active = true`**, `0 11 * * *`, chamando `alertar_tarefas_por_prazo(NULL, 'prod')` |
| Rótulo no sino | já existe no front |

E é isso que a equipe lê hoje:

| Defeito | O que a pessoa vê |
|---|---|
| **Título e corpo se contradizem** | `Tarefa atrasada: Apuração ICMS` com corpo `Aguardando sua revisao. Prazo em 05/09/2026.` — o corpo fala no futuro de um prazo que já venceu. Acontece em toda tarefa atrasada que esteja em revisão ou aguardando o cliente |
| **Corpo sem acento** | `Responsavel:` · `Aguardando sua revisao.` Os títulos têm acento; o corpo não |
| **Sino do gestor inflado** | o gestor recebe os três marcos de **todas** as tarefas da equipe, o que faz o aviso de atraso perder força no volume |

## T1 — ⚠️ MIGRAÇÃO · As duas funções na redação nova

Aplicar `supabase/migrations/20260902210245_ges01a_redacao_dos_avisos_de_prazo.sql` em
produção. Passo **humano**, pelo chat do Lovable, pedindo para aplicar o arquivo.

> **Não colar no editor SQL do Lovable.** Ele corta o statement em `;` e em `--`, e o corpo das
> duas funções é `plpgsql`/`sql` com dezenas de `;` dentro do bloco `$function$`. Pelo chat, o
> agente aplica o arquivo inteiro.

O que a migração muda, e só isso:

| | Antes | Depois |
|---|---|---|
| Ordem da decisão | contexto primeiro, marco por último | **marco primeiro**, contexto depois — o corpo passa a ser montado em duas partes independentes |
| Prazo vencido | `Prazo em 05/09/2026.` | `O prazo era 05/09/2026.` |
| Acentos | `Responsavel:` · `Aguardando sua revisao.` | `Responsável:` · `Aguardando sua revisão.` |
| Gestor | recebe os três marcos | **recebe só o atraso** |
| Títulos | `Vence em 3 dias:` · `Vence hoje:` · `Tarefa atrasada:` | **não mudam** |

Depois de aplicar, o `types.ts` **não precisa ser regenerado**: nada de schema mudou.

## T2 — Rótulo no sino ✅ CONCLUÍDO (02/09/2026)

`tarefa_prazo_proximo` passou de "Prazo próximo" para **"Prazo de tarefa"** — o mesmo tipo
cobre os dois avisos que vêm antes do vencimento, três dias antes e vence hoje. `tarefa_atrasada`
fica **"Tarefa atrasada"**. Em `src/lib/notificacoesInternas.ts`.

## T3 — Conferência

Depois de T1, em produção, por SELECT (nenhum destes escreve):

```sql
SELECT p.proname,
       strpos(pg_get_functiondef(p.oid), 'Aguardando sua revisão') AS tem_acento,
       strpos(pg_get_functiondef(p.oid), 'O prazo era ') AS tem_prazo_vencido
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
 WHERE n.nspname = 'public'
   AND p.proname IN ('tarefas_a_alertar', 'alertar_tarefas_por_prazo')
```

Os dois números têm de ser maiores que zero na função de escrita.

E a simulação, que devolve quem receberia sem gravar nada — trocar a data por uma em que exista
tarefa atrasada:

```sql
SELECT marco, papel, count(*)
  FROM public.tarefas_a_alertar('2026-09-05'::date, 'prod')
 GROUP BY marco, papel
 ORDER BY marco, papel
```

Não pode aparecer `gestor` em `prazo_3_dias` nem em `vence_hoje`. Só em `atrasada`.

No dia seguinte, no sino, conferir três coisas em cada aviso:

| | |
|---|---|
| **Título e corpo concordam** | atrasada nunca diz "Prazo em" |
| **Acentos** | `Responsável` e `revisão` |
| **Gestor** | só recebeu atraso |

## Enquanto T1 não for aplicada

O cron continua mandando o texto errado toda manhã. Se a aplicação não for hoje, cabe
**desligar o job até a redação subir** — também passo humano, pelo chat do Lovable:

```sql
SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'alertar-tarefas-prazo-diario'),
  active := false)
```

Decisão da Patricia. O aviso de prazo é novo: ninguém depende dele ainda, e um dia sem aviso
custa menos do que um aviso que se contradiz. Religar é a mesma chamada com `active := true`.

## Referências

| Arquivo | O que tem |
|---|---|
| [`docs/geral/avisos-prazo-tarefa.md`](../../geral/avisos-prazo-tarefa.md) | o texto em vigor, as 11 variantes e as decisões de 02/09 |
| `supabase/migrations/20260902210245_ges01a_redacao_dos_avisos_de_prazo.sql` | a migração desta tarefa |
| `supabase/migrations/20260901135620_ges01a_varredura_respeita_ambiente.sql` | a versão que está em produção hoje |
| `src/lib/notificacoesInternas.ts` | rótulo e tom por tipo no sino |
