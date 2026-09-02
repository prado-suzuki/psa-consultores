# Ampliar INSERT de contribuinte, representante e ordem_servico para sublíder+ sem condição de cluster

## Objetivo

Remover a restrição de cluster das policies de INSERT de `public.contribuinte`, `public.representante` e `public.ordem_servico`. O piso de papel continua `sublider` ou superior; a única mudança é que quem já tem o papel passa a inserir em qualquer cliente, não apenas nos do seu cluster.

## Estado atual confirmado

Cada tabela tem hoje duas policies de INSERT:
- `admin_full_<tabela>_insert`: requer `admin`.
- `rls_<tabela>_insert`: requer `sublider`+ **e** visibilidade de cluster/cliente.

A mudança recria a segunda policy de cada tabela sem a cláusula de cluster.

## O que muda

### Banco (apenas RLS)

Arquivo: `supabase/migrations/20260902190500_ampliar_insert_contribuinte_representante_os.sql`

```sql
DROP POLICY IF EXISTS rls_contribuinte_insert ON public.contribuinte;
CREATE POLICY rls_contribuinte_insert ON public.contribuinte
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_representante_insert ON public.representante;
CREATE POLICY rls_representante_insert ON public.representante
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_ordem_servico_insert ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_insert ON public.ordem_servico
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));
```

### Frontend (obrigatório — sem ele o erro continua idêntico)

Ampliar só a policy de INSERT não resolve. Dois inserts do salvamento pedem a linha de volta (`.select("id").single()`), o que liga o `RETURNING`; com `RETURNING` o Postgres avalia a policy de **SELECT** sobre a linha nova e recusa o comando inteiro com o mesmo `42501 new row violates row-level security policy`. A leitura de `contribuinte` é `(excluido = false) AND (has_role(admin) OR cliente_visivel_para(cliente_id))` — falsa quando o cliente é de outro cluster; a da OS é equivalente.

Arquivo: `src/hooks/useSaveClientTransaction.ts`

- Linha 494 (`contribuinte`): incluir `id: crypto.randomUUID()` no payload e remover `.select("id").single()`; `contribId` passa a ser o id gerado.
- Linhas 717-721 (`ordem_servico`): mesma mudança; `osId` passa a ser o id gerado.

Sem `.select()`, o supabase-js envia `Prefer: return=minimal`, não há `RETURNING` e a policy de leitura não é consultada. `crypto.randomUUID()` já é padrão no repo (ex.: `useDomainOrgComments.ts:392`).

Os outros cinco inserts do salvamento (`inscricao_contribuinte`, `representante`, `distribuicao_receita`, `os_produtos_contratados`, `cliente_clusters`) não pedem retorno e ficam como estão. O cliente é criado por `criar_cliente_com_clusters`, que é `SECURITY DEFINER` e devolve a linha de dentro da função, fora do alcance da policy.

Migration e mudança de front vão juntas: aplicar só a migration e testar parece "não funcionou", porque o texto do erro é literalmente o mesmo.

Nenhum ajuste de UI/permissão é necessário — as telas já refletem o piso `sublider`+.


## O que não muda

- `admin_full_*_insert` permanecem inalteradas.
- Policies de SELECT, UPDATE e DELETE das três tabelas não são tocadas.
- `org_tasks`, `projects` e demais tabelas fora do escopo.
- Requisitos de preenchimento de campos, triggers e validações de negócio permanecem os mesmos.

## Passos de execução

1. Criar o arquivo de migration no repo com o SQL acima.
2. Aplicar a migration no sandbox via `supabase db push`.
3. Ajustar os dois inserts em `useSaveClientTransaction.ts` (id no cliente, sem `.select()`), no mesmo lote.
4. Rodar `supabase gen types typescript` contra o sandbox e commitar `src/integrations/supabase/types.ts` sozinho.
5. Verificar `bunx eslint src/hooks/useSaveClientTransaction.ts` e `bun run typecheck`.
6. Na merge para `main`, o humano solicita ao Lovable a aplicação do mesmo SQL em produção; o bot regenera `types.ts` de produção.

## Verificação

- `supabase--linter` após aplicação para confirmar que não introduziu policies faltantes ou tabelas sem RLS.
- Testes existentes de cliente/OS continuam passando (`FiscalProjetosCadastro.test.tsx`, `EquipeProjetos.test.tsx` e similares) — os que checam o payload do insert precisam aceitar o novo campo `id`.
- Salvar um cliente de outro cluster como sublíder: contribuinte e OS gravam sem `42501`, e os registros filhos (IEs, rateio, produtos) ficam ligados aos ids gerados.
- Spot-check via `supabase--read_query` confirmando que as novas policies têm `with_check = has_role_or_higher(...)` sem cláusula de cluster.


## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Sublíder de um cluster inserir dados em cliente de outro cluster | É o comportamento pretendido; a restrição de cluster era o problema. |
| Quebra de testes que simulavam recusa por cluster | Não há testes conhecidos que dependam dessa recusa específica; a suite será rodada. |
| Divergência entre sandbox e produção | Aplicar o mesmo SQL nos dois ambientes e regenerar `types.ts` em cada branch. |
