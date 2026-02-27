

# Criar View para resolver JOIN entre PER e Contribuinte

## Problema

A FK `per_id_contribuinte_fkey` foi removida anteriormente e substituida por um trigger de validacao. Isso quebrou o join automatico do PostgREST (`contribuinte:id_contribuinte(nome_razao_social)`), causando erro 400 na busca de PERs.

## Solucao

Criar uma **database view** que faz o JOIN explicito em SQL puro. O PostgREST expoe views como se fossem tabelas, permitindo consultas normais via `.from('per_with_contribuinte')`.

## Passo 1: Migration - Criar a view

```sql
CREATE OR REPLACE VIEW public.per_with_contribuinte AS
SELECT
  p.*,
  COALESCE(c.nome_razao_social, cd.nome_razao_social) AS contribuinte_nome
FROM public.per p
LEFT JOIN public.contribuinte c ON c.id = p.id_contribuinte
LEFT JOIN public.contribuinte_dev cd ON cd.id = p.id_contribuinte;
```

A view faz LEFT JOIN em ambas as tabelas (`contribuinte` e `contribuinte_dev`) porque o trigger de validacao aceita IDs de qualquer uma delas.

## Passo 2: Atualizar query no frontend

No arquivo `src/pages/equipe/dev/ControlePerdcomp.tsx` (linhas 139-146):

**De:**
```typescript
const { data, error } = await supabase
  .from("per")
  .select(`*, contribuinte:id_contribuinte (nome_razao_social)`)
  .eq("id_contribuinte", contribuinteId)
  .order("exercicio", { ascending: false });
```

**Para:**
```typescript
const { data, error } = await supabase
  .from("per_with_contribuinte")
  .select("*")
  .eq("id_contribuinte", contribuinteId)
  .order("exercicio", { ascending: false });
```

O campo `contribuinte_nome` ja vira embutido no resultado, sem necessidade de join do PostgREST.

## Passo 3: Verificar uso de `item.contribuinte`

Checar se algum componente acessa `item.contribuinte.nome_razao_social` e atualizar para `item.contribuinte_nome`.

## Resumo

| O que | Arquivo/Local |
|---|---|
| Criar view `per_with_contribuinte` | Migration SQL |
| Atualizar query `.from("per")` | `src/pages/equipe/dev/ControlePerdcomp.tsx` |
| Ajustar referencias a `item.contribuinte` | Componentes que renderizam dados de PER |

