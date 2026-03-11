

## Plano: Soft delete na tabela `participante` e `participante_dev`

### Escopo

Apenas o arquivo `NewClientModal.tsx` faz queries à tabela `participante`/`participante_dev`. Não há outros componentes afetados.

---

### Passo 1 — Migration SQL

Adicionar coluna `excluido boolean NOT NULL DEFAULT false` em ambas as tabelas:

```sql
ALTER TABLE public.participante
  ADD COLUMN IF NOT EXISTS excluido boolean NOT NULL DEFAULT false;

ALTER TABLE public.participante_dev
  ADD COLUMN IF NOT EXISTS excluido boolean NOT NULL DEFAULT false;
```

Não é necessário UPDATE explícito — o `DEFAULT false` cobre registros existentes.

---

### Passo 2 — Queries de leitura (`NewClientModal.tsx`)

**Linha ~790** — query que carrega participantes ao abrir para edição:
```js
.select("*").eq("id_cliente", editingClienteId)
```
Adicionar `.eq("excluido", false)`.

**Linha ~1338** — query que detecta participantes removidos durante o save:
```js
.select(partIdField).eq("id_cliente", clienteId)
```
Adicionar `.eq("excluido", false)` para não considerar já-excluídos.

---

### Passo 3 — Substituir `.delete()` por `.update({ excluido: true })`

**Linha ~1341**:
```js
// De:
await (supabase.from(participanteTable) as any).delete().in(partIdField, removedPartIds);
// Para:
await (supabase.from(participanteTable) as any).update({ excluido: true }).in(partIdField, removedPartIds);
```

---

### Passo 4 — RLS

As policies de SELECT existentes (`"Team members can view participante"` e `"Admins can manage participante"`) não filtram por `excluido`. Como o filtro já é aplicado no lado da aplicação (passo 2) e adicionar condição na policy `FOR ALL` do admin poderia impedir o próprio update de `excluido`, **não será necessário alterar RLS** — seguindo o mesmo padrão já usado em `cliente` e `contribuinte`.

---

### Resumo de alterações

| Arquivo | Alteração |
|---|---|
| Migration SQL | Adicionar coluna `excluido` em `participante` e `participante_dev` |
| `NewClientModal.tsx` (~linha 791) | Adicionar `.eq("excluido", false)` na query de carregamento |
| `NewClientModal.tsx` (~linha 1338) | Adicionar `.eq("excluido", false)` na query de detecção de removidos |
| `NewClientModal.tsx` (~linha 1341) | Trocar `.delete()` por `.update({ excluido: true })` |

