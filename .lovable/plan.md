

## Plano: Reverter alterações no banco

### Estado atual confirmado
- `produto_segmento.cluster_id` (UUID, FK) — **EXISTE**
- `contribuinte.inscricoes_estaduais` (JSONB) — **EXISTE**  
- `contribuinte_dev.inscricoes_estaduais` (JSONB) — **EXISTE**

### Etapa 1 — Migration de reversão

Remover ambas as colunas adicionadas:

```sql
-- Remover cluster_id de produto_segmento
ALTER TABLE public.produto_segmento
DROP COLUMN IF EXISTS cluster_id;

-- Remover inscricoes_estaduais de contribuinte
ALTER TABLE public.contribuinte
DROP COLUMN IF EXISTS inscricoes_estaduais;

-- Remover inscricoes_estaduais de contribuinte_dev  
ALTER TABLE public.contribuinte_dev
DROP COLUMN IF EXISTS inscricoes_estaduais;
```

**Impacto:** Perde-se o mapeamento de produtos para clusters e quaisquer dados de múltiplas IEs já inseridos no novo formato.

### Etapa 2 — Reversão do frontend

Para reverter o `NewClientModal.tsx` (remover filtro de empresa/cluster e campos de múltiplas IEs), use o **History tab** do projeto para restaurar a versão anterior do arquivo.

Aprovar para executar a migration de DROP COLUMN?

