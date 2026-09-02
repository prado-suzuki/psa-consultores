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

### Frontend

Nenhuma alteração. As telas já refletem o piso `sublider`+ para criação/edição de cliente, representante e OS. A remoção da condição de cluster só amplia quem consegue salvar; nenhum botão que hoje aparece para team_member passa a falhar.

## O que não muda

- `admin_full_*_insert` permanecem inalteradas.
- Policies de SELECT, UPDATE e DELETE das três tabelas não são tocadas.
- `org_tasks`, `projects` e demais tabelas fora do escopo.
- Requisitos de preenchimento de campos, triggers e validações de negócio permanecem os mesmos.

## Passos de execução

1. Criar o arquivo de migration no repo com o SQL acima.
2. Aplicar a migration no sandbox via `supabase db push`.
3. Rodar `supabase gen types typescript` contra o sandbox e commitar `src/integrations/supabase/types.ts` sozinho (embora a mudança seja só RLS, regenerar mantém o arquivo alinhado ao banco da branch).
4. Verificar `bunx eslint` nos arquivos potencialmente afetados e `bun run typecheck`.
5. Na merge para `main`, o humano solicita ao Lovable a aplicação do mesmo SQL em produção; o bot regenera `types.ts` de produção.

## Verificação

- `supabase--linter` após aplicação para confirmar que não introduziu policies faltantes ou tabelas sem RLS.
- Testes existentes de cliente/OS continuam passando (`FiscalProjetosCadastro.test.tsx`, `EquipeProjetos.test.tsx` e similares).
- Spot-check via `supabase--read_query` confirmando que as novas policies têm `with_check = has_role_or_higher(...)` sem cláusula de cluster.

## Riscos e mitigações

| Risco | Mitigação |
|-------|-----------|
| Sublíder de um cluster inserir dados em cliente de outro cluster | É o comportamento pretendido; a restrição de cluster era o problema. |
| Quebra de testes que simulavam recusa por cluster | Não há testes conhecidos que dependam dessa recusa específica; a suite será rodada. |
| Divergência entre sandbox e produção | Aplicar o mesmo SQL nos dois ambientes e regenerar `types.ts` em cada branch. |
