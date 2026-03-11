

## Plano: Soft delete na tabela `distribuicao_receita`

### Passo 1 — Migration SQL

```sql
ALTER TABLE public.distribuicao_receita
  ADD COLUMN IF NOT EXISTS excluido boolean NOT NULL DEFAULT false;
```

---

### Passo 2 — Queries de leitura

| Arquivo | Linha aprox. | Query |
|---|---|---|
| `NewClientModal.tsx` | ~818 | Carrega distribuições ao abrir para edição (`.in("id_ordem_servico", osIds)`) |

Adicionar `.eq("excluido", false)`.

---

### Passo 3 — Ação de excluir

O padrão atual em `NewClientModal.tsx` (~linha 1481) é **delete-all + insert** para sincronizar distribuições ao salvar uma OS. Com soft delete, a lógica será:

1. Soft-delete todos os registros existentes da OS: `.update({ excluido: true }).eq("id_ordem_servico", osId)`
2. Inserir os novos registros normalmente (como já faz)

Isso preserva o histórico dos registros antigos.

| Arquivo | Linha aprox. | Alteração |
|---|---|---|
| `NewClientModal.tsx` | ~1481 | `.delete().eq("id_ordem_servico", osId)` → `.update({ excluido: true }).eq("id_ordem_servico", osId)` |

---

### Passo 4 — RLS

Sem alteração — filtro aplicado no lado da aplicação, seguindo o padrão das demais tabelas.

---

### Resumo

| Item | Alteração |
|---|---|
| Migration SQL | Adicionar coluna `excluido` em `distribuicao_receita` |
| `NewClientModal.tsx` (~818) | `.eq("excluido", false)` na query de carregamento |
| `NewClientModal.tsx` (~1481) | `.delete()` → `.update({ excluido: true })` |

