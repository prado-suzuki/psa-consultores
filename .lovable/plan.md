# Tabelas de Grupos de Tributo e Códigos de Receita (RFB)

Criar duas tabelas de catálogo para alimentar campos em cascata (Grupo de Tributo → Código de Receita) em formulários fiscais, populando-as a partir do CSV oficial da RFB anexado.

## Escopo

- Schema das tabelas + índices + constraint de unicidade composta
- RLS com leitura para qualquer usuário autenticado, escrita só admin
- Importação dos 975 registros (após dedup de 1 linha idêntica em MULTA/JUROS 3738-01) cobrindo 23 grupos
- Sem UI nesta etapa

## Schema

### `public.grupo_tributo`
- `id` uuid PK
- `sigla` text NOT NULL UNIQUE — ex.: `COFINS`, `CPRB`, `CP PATRONAL`
- `denominacao` text NOT NULL — nome completo do grupo
- `created_at`, `updated_at` timestamptz

### `public.codigo_receita`
- `id` uuid PK
- `grupo_tributo_id` uuid NOT NULL FK → `grupo_tributo(id)` ON DELETE RESTRICT
- `codigo` text NOT NULL — formato `XXXX-YY` preservado como texto (hífen e zeros à esquerda mantidos)
- `denominacao_receita` text NOT NULL
- `created_at`, `updated_at` timestamptz
- UNIQUE `(grupo_tributo_id, codigo)` — permite mesmo código em grupos diferentes (ex.: `2985-01` em CP PATRONAL e CPRB)
- Índice em `grupo_tributo_id` para o lookup em cascata

Trigger `update_updated_at_column()` (já existente) em ambas as tabelas.

## RLS

Ambas com RLS habilitado:
- SELECT: qualquer usuário autenticado (`auth.uid() IS NOT NULL`) — catálogo de leitura geral
- INSERT/UPDATE/DELETE: apenas `has_role(auth.uid(), 'admin')`

## Importação dos dados

1. Inserir os 23 grupos distintos em `grupo_tributo` a partir das colunas `Grupo de Tributo` (sigla) e `Denominacao do Grupo de Tributo` (denominação).
2. Deduplicar o CSV pelo trio `(grupo, codigo, denominacao)` — confirmado: 976 → 975 linhas (1 duplicata exata em `MULTA/JUROS 3738-01`).
3. Inserir as 975 linhas em `codigo_receita` resolvendo `grupo_tributo_id` via lookup pela sigla.
4. UTF-8 preservado (acentuação validada no parse).

Execução: usar `supabase--migration` para o schema/RLS, e `supabase--insert` para os dados (gerados a partir do CSV em massa, em INSERTs com múltiplos VALUES).

## Validações pós-import

- `SELECT count(*) FROM grupo_tributo` = 23
- `SELECT count(*) FROM codigo_receita` = 975
- `SELECT codigo, count(*) FROM codigo_receita GROUP BY codigo HAVING count(*) > 1` deve retornar exatamente `2985-01`, `2985-04`, `2985-06`, `2991-01` (compartilhados entre CP PATRONAL e CPRB)
