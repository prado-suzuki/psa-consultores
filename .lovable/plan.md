## Objetivo
Corrigir dropdown "Equipe" vazio no modal "Novo Projeto" do OSG, adicionando `'osg'` ao `page_categories` da área OSG (id `b0814bc8-1959-4755-8bb1-a44560083791`) via **migração versionada** (não via insert avulso).

## Pré-voo (somente leitura, via `supabase--read_query`)
1. `select id, name, is_active, page_categories from public.estrutura_areas where id = 'b0814bc8-1959-4755-8bb1-a44560083791';`
   — esperado: `is_active = true` e `page_categories` **não** contém `'osg'`.
2. `select id, name, is_active from public.estrutura_equipes where area_id = 'b0814bc8-1959-4755-8bb1-a44560083791' and is_active = true;`
   — esperado: pelo menos uma equipe ativa. Se vazio, **parar e avisar** (o fix sozinho não resolve).

## Correção (migração versionada, via `supabase--migration`)
SQL idempotente:

```sql
update public.estrutura_areas
   set page_categories = array_append(page_categories, 'osg')
 where id = 'b0814bc8-1959-4755-8bb1-a44560083791'
   and not ('osg' = any(page_categories));
```

## Fora de escopo
- Nenhuma RLS, trigger, função ou view.
- Nenhuma outra área além da OSG; não mexer em Tax nem inativas.
- Não alterar `is_active`, nomes ou clusters.
- Não alterar código do hook `useEstruturaEquipes.ts` nem componentes de frontend.
- Não tocar em clientes, projetos, membros ou equipes.

## GATE (pós-execução, via `supabase--read_query`)
1. `select id, name, page_categories from public.estrutura_areas where id = 'b0814bc8-1959-4755-8bb1-a44560083791';` — `page_categories` deve conter `'osg'` e preservar valores anteriores.
2. `select id, name from public.estrutura_areas where is_active = true and page_categories @> array['osg'];` — deve retornar a área OSG (reproduz passo 1 do hook).
3. `select id, name from public.estrutura_equipes where is_active = true and area_id = 'b0814bc8-1959-4755-8bb1-a44560083791' order by name;` — deve listar "Equipe OSG".
4. App: abrir OSG Projects → Novo Projeto e confirmar que "Equipe OSG" aparece no dropdown; conferir que Tax continua normal.
