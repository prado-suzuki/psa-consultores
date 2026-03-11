

## Plano: Soft delete na tabela `ordem_servico`

### Passo 1 — Migration SQL

```sql
ALTER TABLE public.ordem_servico
  ADD COLUMN IF NOT EXISTS excluido boolean NOT NULL DEFAULT false;
```

Não é necessário UPDATE explícito — `DEFAULT false` cobre registros existentes.

---

### Passo 2 — Queries de leitura (adicionar `.eq("excluido", false)`)

| Arquivo | Linha aprox. | Query |
|---|---|---|
| `NewClientModal.tsx` | ~811 | Carrega OS ao abrir para edição |
| `NewClientModal.tsx` | ~1347 | Detecta OS removidas durante o save |
| `FiscalProjetosCadastro.tsx` | ~367 | Lista OS do cliente (query `cliente-os`) |
| `FiscalProjetosCadastro.tsx` | ~385 | Busca OS ativas para sugerir categorias |

---

### Passo 3 — Substituir `.delete()` por `.update({ excluido: true })`

| Arquivo | Linha aprox. | Alteração |
|---|---|---|
| `NewClientModal.tsx` | ~1350 | `.delete().in("id", removedOsIds)` → `.update({ excluido: true }).in("id", removedOsIds)` |

A tabela `distribuicao_receita` continua com delete físico (delete + re-insert), pois são registros filhos sem necessidade de histórico próprio.

---

### Passo 4 — RLS

Sem alteração — filtro aplicado no lado da aplicação, seguindo o padrão das demais tabelas.

