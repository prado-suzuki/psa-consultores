
## Diagnóstico do "12 vs 22"

Não há bug. O hook `useRepresentantesSemUsuario` filtra por `currentAmbiente`, que é detectado via hostname:

- Preview (`id-preview--*.lovable.app`) → `ambiente = 'dev'` → **12 representantes pendentes** ✅
- Produção (`psaconsultores.com.br`) → `ambiente = 'prod'` → **22 representantes pendentes** ✅

Os 22 que listei na consulta SQL anterior estavam todos em `ambiente='prod'`. Quando você publicar/abrir em produção, o modal mostrará os 22. No preview ele mostra (corretamente) apenas os 12 de dev.

## Auditoria do email placeholder (Rafael Castro)

- **Representante:** Rafael Castro (`52e1b819-45d5-4b0e-97e9-6a4b25c82afc`)
- **Cliente:** Álvaro De Oliveira Castro
- **Email atual:** `xxxxxxx@xxxxx.xxx.xx`
- **Criado em:** 09/04/2026 18:42:09
- **Autor identificado:** **Monica Matunaga** (`monica.matunaga@psaconsultores.com.br`)
  - Não há log direto na tabela `audit_logs` para o representante (criação de representante via NewClientModal não estava sendo logada na época), mas o cliente associado foi criado pela Monica 2 segundos depois (18:42:11), no mesmo fluxo do NewClientModal — autoria por correlação temporal e funcional.

## Mudanças propostas

### 1. Endurecer o filtro do hook `useRepresentantesSemUsuario`

Hoje aceita qualquer email com `@`. Ajustar para excluir emails claramente inválidos/placeholder, garantindo que após a limpeza o Rafael Castro (e futuros casos) não apareçam mesmo se houver `@`:

- Rejeitar emails sem `.` após o `@`
- Rejeitar emails contendo sequências `xxxx`, `xxxxx`, `placeholder`, `teste@teste`, etc.
- Rejeitar emails cujo domínio não tenha TLD válido (regex simples `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i`)
- Adicionar normalização (trim + lowercase) já existente

A filtragem fina é feita client-side após o fetch (Postgres não suporta regex tão facilmente via PostgREST; mantemos `LIKE '%@%'` no servidor + validação robusta no client).

### 2. Migration: limpar o email placeholder

Atualizar o representante Rafael Castro para `email = NULL`. Com isso, ele deixa de satisfazer o filtro `.not('email', 'is', null)` e não aparece mais no modal — independente do hook.

Nenhum outro campo é alterado. Soft-delete não é aplicado (o representante continua válido, apenas sem email).

### 3. Registrar no audit_logs a limpeza

Criar uma entrada manual em `audit_logs` documentando:
- Ação: `updated`
- Campo alterado: `email` (de `xxxxxxx@xxxxx.xxx.xx` → `NULL`)
- `details`: justificativa + autor original identificado (Monica Matunaga) + autor da limpeza (sistema/migration)

### 4. Verificação de outros placeholders

A migration faz uma busca preventiva por outros emails com padrão claramente placeholder (`xxxx@`, `@xxxx`, sem TLD) **somente para reportar via NOTICE no log da migration** — não altera nenhum outro registro automaticamente, para não causar efeitos colaterais.

## Detalhes técnicos

**Arquivo afetado (código):**
- `src/hooks/useRepresentantesSemUsuario.ts` — adicionar função `isValidEmail()` e filtrar no `.map`/`.filter` final

**Migration SQL (resumo):**
```sql
-- 1. Auditar a mudança
INSERT INTO audit_logs (area, entity_type, entity_id, entity_name, action, performed_by, changed_fields, details)
VALUES ('client-management', 'representante', '52e1b819-...', 'Rafael Castro', 'updated', NULL,
        '{"email":{"old":"xxxxxxx@xxxxx.xxx.xx","new":null}}'::jsonb,
        '{"reason":"Limpeza de email placeholder","original_author":"monica.matunaga@psaconsultores.com.br","cleaned_by":"migration"}'::jsonb);

-- 2. Limpar
UPDATE representante SET email = NULL, updated_at = now()
WHERE id_representante = '52e1b819-45d5-4b0e-97e9-6a4b25c82afc'
  AND email = 'xxxxxxx@xxxxx.xxx.xx';

-- 3. NOTICE com outros placeholders (somente log)
DO $$ ... RAISE NOTICE ... $$;
```

## Resultado esperado

- Modal continua mostrando 12 em dev e passará a mostrar 21 em prod (22 menos o Rafael Castro).
- Rafael Castro permanece cadastrado como representante, apenas sem email.
- Histórico da limpeza fica registrado em `audit_logs` com referência ao autor original.
- Hook fica resiliente a futuros placeholders mesmo se o banco tiver lixo.
