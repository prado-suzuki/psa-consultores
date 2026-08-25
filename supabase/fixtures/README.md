# Fixtures de sandbox

SQL que monta **cenário de teste**, aplicado **a mão** e **só na réplica de
desenvolvimento**.

## Por que não fica em `supabase/migrations/`

Porque `migrations/` é aplicado em **produção** — pelo `supabase db push` no sandbox e
pelo Lovable em produção. Fixture que cria dado falso, ou que aponta contato de
cliente para o e-mail de alguém do time, não pode estar nesse caminho.

Um fixture desta pasta já nasceu em `migrations/` por engano, guardado por
`ambiente = 'dev'` mais o nome do cliente. A proteção era fina: medido em
25/08/2026, **produção tem 112 clientes com `ambiente = 'dev'`** (de 327) — a coluna
não separa banco, separa cadastro dentro do banco. O que segurava era só o nome não
existir lá.

## A guarda que todo arquivo daqui deve ter

Depender de uma propriedade que **só a cópia anonimizada tem**, e abortar com
`raise exception` — nunca com `return` silencioso, porque rodar no banco errado tem
de doer na hora em vez de parecer que não fez nada.

A propriedade em uso hoje é o e-mail anonimizado do representante. Medido em
25/08/2026 — dev: 69 de 76; produção: **zero**.

```sql
if not exists (select 1 from public.representante where email ilike '%@exemplo.dev%') then
  raise exception 'FIXTURE DE SANDBOX rodando no banco errado. Abortado sem escrever nada.';
end if;
```

## Como aplicar

Pelo MCP do Supabase (`execute_sql`) apontando para o sandbox, ou pelo SQL editor do
projeto de dev. Todo arquivo daqui deve ser idempotente: rodar duas vezes deixa o
banco igual.

## O que existe

| Arquivo | Monta |
|---|---|
| `cenario4_solicitacao_vencida.sql` | Cenário 4 (VENCER) da GES-04: solicitação vencida há 10 dias, sem nenhum documento, com o contato do Alexandre. Os cenários 1 a 3 (ENVIAR, AVISAR, ENCERRAR) são anteriores e não têm arquivo. |
