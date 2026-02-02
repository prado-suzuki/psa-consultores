

# Plano: Adicionar Coluna `id_contribuinte` NOT NULL na Tabela `per`

## Objetivo

Adicionar uma nova coluna `id_contribuinte` na tabela `per` como chave estrangeira (FK) referenciando `contribuinte(id)`, com constraint NOT NULL.

## Consideração Importante

Como a coluna será NOT NULL, precisamos considerar se existem dados na tabela `per`:
- Se houver registros existentes, a migração falhará sem um valor padrão
- A solução é primeiro limpar os dados existentes (se houver) ou adicionar em etapas

## Migração SQL

```sql
-- Primeiro, deletar registros existentes na tabela per (se houver)
-- pois não podemos adicionar NOT NULL sem valor padrão
DELETE FROM public.per;

-- Adicionar coluna id_contribuinte como NOT NULL
ALTER TABLE public.per
ADD COLUMN id_contribuinte UUID NOT NULL REFERENCES public.contribuinte(id);

-- Criar índice para performance em consultas
CREATE INDEX idx_per_id_contribuinte ON public.per(id_contribuinte);
```

## Detalhes Técnicos

| Item | Valor |
|------|-------|
| Tipo da coluna | UUID |
| Nullable | NÃO (NOT NULL) |
| Referência | `contribuinte(id)` |
| Índice | `idx_per_id_contribuinte` |

## Resultado Esperado

1. A tabela `per` terá a nova coluna `id_contribuinte` obrigatória
2. Todos os novos registros de PER deverão ter um contribuinte associado
3. O relacionamento será refletido automaticamente no arquivo `types.ts`

