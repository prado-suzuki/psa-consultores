# Migração em 2 fases: `regiao`/`setor_cliente`/`setor_cliente_id` → `ordem_servico`

## Contexto verificado

- Modal já grava esses 3 campos em `ordem_servico` (`useSaveClientTransaction.ts:391–393`) e lê de OS (`useClientEditData.ts:208–210`).
- **Colunas ainda NÃO existem em `ordem_servico`** → cadastro/edição de cliente está quebrado até a Fase 1 rodar.
- Banco: 72 clientes com dados; **19 sem nenhuma OS ativa** (perda controlada no DROP).
- Nenhuma view/índice/policy em `cliente` referencia essas colunas. DROP é seguro.

---

## FASE 1 — Não destrutiva (desbloqueia o frontend)

### 1a. Adicionar colunas em `ordem_servico`

```sql
ALTER TABLE public.ordem_servico
  ADD COLUMN IF NOT EXISTS regiao           text,
  ADD COLUMN IF NOT EXISTS setor_cliente    text,
  ADD COLUMN IF NOT EXISTS setor_cliente_id uuid REFERENCES public.setor_cliente(id);

CREATE INDEX IF NOT EXISTS idx_ordem_servico_regiao           ON public.ordem_servico(regiao);
CREATE INDEX IF NOT EXISTS idx_ordem_servico_setor_cliente_id ON public.ordem_servico(setor_cliente_id);
```

### 1b. Backfill OS ← cliente (apenas OS ativas, sem sobrescrever)

```sql
UPDATE public.ordem_servico os
SET regiao           = COALESCE(os.regiao,           c.regiao),
    setor_cliente    = COALESCE(os.setor_cliente,    c.setor_cliente),
    setor_cliente_id = COALESCE(os.setor_cliente_id, c.setor_cliente_id)
FROM public.cliente c
WHERE os.id_cliente = c.id
  AND os.excluido = false
  AND (c.regiao IS NOT NULL OR c.setor_cliente IS NOT NULL OR c.setor_cliente_id IS NOT NULL);
```

### 1c. View `cliente_setor_regiao_atual` (valor da OS mais recente)

```sql
CREATE OR REPLACE VIEW public.cliente_setor_regiao_atual AS
SELECT DISTINCT ON (os.id_cliente)
  os.id_cliente,
  os.setor_cliente,
  os.setor_cliente_id,
  os.regiao,
  os.ambiente
FROM public.ordem_servico os
WHERE os.excluido = false
ORDER BY os.id_cliente, os.data_emissao DESC NULLS LAST, os.created_at DESC;
```

### 1d. Refatoração de código (após migration aprovada)

- `src/hooks/useDevClients.ts` — interface `ClienteListItem` (linhas 17–28) e selects (80, 86, 92): trocar leitura de `cliente.setor_cliente/regiao` por embed da view `cliente_setor_regiao_atual`.
- `src/hooks/useFiscalClients.ts` — `Cliente.setor_cliente` (linha 10).
- `src/hooks/useGestaoClientes.ts` — `ClienteFiltrado.setor_cliente` (linha 32) em `useClientesFiltrados`.
- `src/hooks/useTaxReferenceData.ts:119` — `.select('id, nome, setor_cliente')` → join com view.
- `src/pages/equipe/fiscal/GestaoClientes.tsx:356` e `src/components/equipe/fiscal/FiscalClients.tsx:92,94` — se os hooks mantiverem o mesmo shape (`setor_cliente` no objeto), o JSX não muda.
- `src/pages/equipe/dev/GerenciarDados.tsx` — remover `setor_cliente` do importador CSV em 3 pontos: linha 100 (parse), 251 (texto), 423 (template).
- `supabase/functions/sync-cadastros/index.ts` — remover `setor_cliente: string | null` da interface `Cliente` (~linha 19).
- `src/hooks/useSaveClientTransaction.ts:542` — adicionar `'setor_cliente_id'` ao array `osFields` (atualmente só tem `setor_cliente` e `regiao`) para o audit log capturar mudanças do UUID.

### Critérios de aceite Fase 1

- [ ] OS tem as 3 colunas + 2 índices + view criada.
- [ ] Backfill aplicado: 100% das OS ativas com cliente-pai populado herdaram valores.
- [ ] Cadastro/edição de cliente no modal grava e lê sem erro (smoke test em dev).
- [ ] Listagens em `GestaoClientes` e `FiscalClients` continuam exibindo Área do Negócio / Região (vindas da view).
- [ ] Importador CSV não menciona mais `setor_cliente`.
- [ ] `osFields` no audit inclui `setor_cliente_id`.
- [ ] Edge `sync-cadastros` não exporta mais `setor_cliente`.
- [ ] `types.ts` regenerado, typecheck verde.

---

## FASE 2 — Destrutiva (DROP em `cliente`)

Pré-requisito: Fase 1 estável em produção por pelo menos 1 ciclo de uso (cadastros validados).

### 2a. Log dos 19 clientes sem OS (perda explícita aceita)

Migration com bloco `DO $$ ... $$` para emitir `RAISE NOTICE` listando IDs/nomes afetados antes do DROP — fica registrado nos logs da migration.

```sql
DO $$
DECLARE
  r RECORD;
  total int := 0;
BEGIN
  FOR r IN
    SELECT c.id, c.nome, c.regiao, c.setor_cliente, c.setor_cliente_id
    FROM public.cliente c
    WHERE (c.regiao IS NOT NULL OR c.setor_cliente IS NOT NULL OR c.setor_cliente_id IS NOT NULL)
      AND NOT EXISTS (
        SELECT 1 FROM public.ordem_servico os
        WHERE os.id_cliente = c.id AND os.excluido = false
      )
  LOOP
    total := total + 1;
    RAISE NOTICE 'Cliente sem OS — perda no DROP: id=% nome=% regiao=% setor=% setor_id=%',
      r.id, r.nome, r.regiao, r.setor_cliente, r.setor_cliente_id;
  END LOOP;
  RAISE NOTICE 'Total de clientes com perda de dado: %', total;
END $$;
```

### 2b. DROP das colunas em `cliente`

```sql
ALTER TABLE public.cliente
  DROP COLUMN IF EXISTS regiao,
  DROP COLUMN IF EXISTS setor_cliente,
  DROP COLUMN IF EXISTS setor_cliente_id;
```

### Critérios de aceite Fase 2

- [ ] Lista dos 19 clientes registrada nos logs da migration.
- [ ] DROP executa sem erro.
- [ ] `types.ts` regenerado, typecheck verde, nenhuma referência residual a `cliente.setor_cliente|regiao|setor_cliente_id` (rodar `rg` no projeto).
- [ ] App segue funcional (modal, listagens, importador CSV, sync-cadastros).

---

## Fora de escopo (confirmado, não tocar)

- `src/integrations/supabase/types.ts` (autogerado)
- `src/pages/equipe/dev/CorrecoesSped.tsx:669` (usa `contribuinte.setor_cliente_id`)
- `supabase/functions/dw-query/index.ts:10` (`'setor_cliente'` é nome de tabela dimensão)
- `src/components/equipe/audit/auditFieldFormatter.ts` (labels seguem válidos)
- `src/hooks/useSetorCliente.ts` (lê tabela dimensão)
- Modal de cadastro (`NewClientModal`, `ClienteTab`, `ContratosTab`, `useSaveClientTransaction`, `useClientEditData`, `client-form/constants.ts`, `types/clientForm.ts`) — já adaptado.

---

## Status

### Fase 1 — CONCLUÍDA ✅

- [x] Migration 1a/1b/1c aplicada (colunas + índices + view com `security_invoker=true`).
- [x] Backfill aplicado (sem sobrescrever valores existentes em OS).
- [x] `useDevClients.ts` — `useClientesList` e `useExternalClients` enriquecidos via view.
- [x] `useFiscalClients.ts` — `useFiscalClientsList` enriquecido via view.
- [x] `useGestaoClientes.ts` — `useClientesFiltrados` enriquecido via view.
- [x] `useTaxReferenceData.ts` — `useExternalClients` enriquecido via view.
- [x] `GerenciarDados.tsx` — `setor_cliente` removido do importador CSV (parse, doc, template).
- [x] `sync-cadastros/index.ts` — `setor_cliente` removido da interface `Cliente`.
- [x] `useSaveClientTransaction.ts:542` — `setor_cliente_id` adicionado ao audit `osFields`.

### Fase 2 — PENDENTE

Aguardando validação em produção da Fase 1 antes do DROP.
