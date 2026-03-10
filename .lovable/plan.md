

## Plano: Conectar tax_areas com estrutura_areas (Etapas 1 e 2)

Escopo restrito conforme solicitado — apenas duas operações, nenhuma alteração em RLS, permissões ou outras tabelas.

### Etapa 1 — Migration: adicionar coluna

Criar uma migration com:

```sql
ALTER TABLE public.tax_areas
ADD COLUMN estrutura_area_id uuid REFERENCES public.estrutura_areas(id) ON DELETE SET NULL;
```

### Etapa 2 — Data update: popular mapeamentos

Usar a ferramenta de inserção/update (não migration) para executar:

| tax_areas.id | estrutura_area_id |
|---|---|
| `7089d134-5874-4061-a860-05376aa8e02a` | `fd2eab19-e37e-4ddb-9570-5e839d3bfe5e` |
| `161b52a9-2986-4f56-82cc-9c831f28aa1d` | `5c71affa-59d5-4dfe-bb78-50764a27f1f1` |
| `55448e04-d9ea-4fd7-bde8-7396fdb01376` | `201bb999-85c8-437b-bd44-201720833cda` |

As demais áreas (Societário, Estudos e Pesquisas) ficam com `NULL`.

### O que NÃO será feito

- Nenhuma alteração de RLS ou policies
- Nenhuma alteração em `tax_projects.area_id` (continua apontando para `tax_areas`)
- Nenhuma alteração no frontend
- Nenhuma alteração em outras tabelas

