
# Plano de Mitigação — `mapa_integration_migration.sql` (revisão final para aprovação)

> Em Build Mode, **não** vou editar o script original. Vou criar **uma migration complementar** (`supabase/migrations/<timestamp>_mapa_integration_hardening.sql`) que roda logo após o script base e cobre R2 + R3. R1 fica homologado e documentado.

---

## R1 — Cenários (`process_stages.cenario`) ✅ Homologado

**Ação:** nenhuma alteração de schema. Apenas registro de decisão no cabeçalho da migration complementar:

```sql
-- R1 [HOMOLOGADO ENG]: process_stages.cenario NOT NULL DEFAULT 'AS-IS'.
-- Backfill semântico aceito: todas as linhas pré-existentes são AS-IS.
-- O novo frontend MAPA enviará 'cenario' explicitamente em todo INSERT.
```

---

## R2 — Segurança / RLS para as 18 tabelas novas

**Padrão aplicado a cada tabela** (justificativa: feature interna, somente usuários autenticados; sem acesso `anon`; `service_role` mantém acesso total para edge functions/admin):

```sql
-- Template aplicado a cada uma das 18 tabelas
ALTER TABLE public.<tabela> ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.<tabela> TO authenticated;
GRANT ALL ON public.<tabela> TO service_role;

CREATE POLICY "<tabela>_auth_select" ON public.<tabela>
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "<tabela>_auth_insert" ON public.<tabela>
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "<tabela>_auth_update" ON public.<tabela>
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- DELETE intencionalmente NÃO liberado a 'authenticated' nesta primeira onda
-- (CASCADE já cobre limpeza ao remover pai). Pode ser revisto depois.
```

**Loop idempotente real que será escrito** (evita 18 blocos repetidos e é seguro em reexecução):

```sql
DO $$
DECLARE
  t text;
  tabelas text[] := ARRAY[
    'projeto_justificativas','documentos_processo','sistemas_processo',
    'etapa_responsaveis','etapa_sistemas','etapa_documentos',
    'gargalos','gargalo_processos','gargalo_responsaveis',
    'documento_horas_historico','cascata_eventos','cascata_evento_etapas',
    'sistema_clusters','sistema_responsaveis','melhoria_processos',
    'melhoria_sistemas','melhoria_responsaveis','melhoria_acoes_td'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);

    -- SELECT
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND policyname=t||'_auth_select'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true);',
        t||'_auth_select', t
      );
    END IF;

    -- INSERT
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND policyname=t||'_auth_insert'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (true);',
        t||'_auth_insert', t
      );
    END IF;

    -- UPDATE
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND policyname=t||'_auth_update'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true);',
        t||'_auth_update', t
      );
    END IF;
  END LOOP;
END $$;
```

**Resultado:**
- 18 × `ENABLE RLS`
- 18 × `GRANT … TO authenticated` + `GRANT ALL TO service_role`
- 54 políticas (SELECT / INSERT / UPDATE por tabela), idempotentes
- DELETE permanece restrito ao `service_role` — CASCADE cobre os fluxos do MAPA; revisamos numa 2ª onda se a UI exigir delete direto.

---

## R3 — Eliminar `set_updated_at()` duplicada + hardening da cascade

### 3.1 Reapontar os 4 triggers de `updated_at` para a função nativa `public.update_updated_at_column()`

A função pré-existente (em `<db-functions>`) já faz exatamente `NEW.updated_at = NOW(); RETURN NEW;` e tem `SECURITY DEFINER SET search_path = public`. É a candidata canônica.

```sql
DO $$
DECLARE
  t text;
  tabelas_updated_at text[] := ARRAY[
    'documentos_processo','sistemas_processo','gargalos','cascata_eventos'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas_updated_at LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s;', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated_at
         BEFORE UPDATE ON public.%1$s
         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();',
      t
    );
  END LOOP;
END $$;

-- Função duplicada criada pelo script base deixa de ter referências → remover.
DROP FUNCTION IF EXISTS public.set_updated_at();
```

### 3.2 Hardening da função do trigger de cascade AS-IS → TO-BE

```sql
CREATE OR REPLACE FUNCTION public.process_stages_cascade_as_is_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.cenario = 'AS-IS' THEN
    DELETE FROM public.process_stages
     WHERE cenario = 'TO-BE'
       AND etapa_as_is_id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$;
```

> `CREATE OR REPLACE` preserva o trigger existente (`trg_process_stages_as_is_cascade`) sem precisar recriá-lo. Apenas adiciona `SET search_path = public` para silenciar o warning *"Function Search Path Mutable"* do `supabase--linter`.

---

## Ordem de execução em Build Mode

1. Criar `supabase/migrations/<timestamp>_mapa_integration_hardening.sql` envolvendo tudo acima em `BEGIN; … COMMIT;`.
2. Submeter via ferramenta de migration para aprovação do usuário.
3. Após execução, rodar `supabase--linter` para confirmar zero warnings nas novas estruturas.
4. Aguardar regeneração automática de `src/integrations/supabase/types.ts` (sem ação manual).
5. Nenhuma alteração no frontend é necessária nesta etapa — a feature MAPA será implementada em PRs subsequentes consumindo as tabelas já liberadas pelas políticas.

## Critérios de aceite

- [ ] 18 tabelas com `relrowsecurity = true` em `pg_class`.
- [ ] 54 policies presentes em `pg_policies` (3 por tabela).
- [ ] `pg_proc` não contém mais `public.set_updated_at()`.
- [ ] 4 triggers de `updated_at` apontam para `public.update_updated_at_column()` (verificável em `information_schema.triggers.action_statement`).
- [ ] `public.process_stages_cascade_as_is_delete` com `proconfig` contendo `search_path=public`.
- [ ] `supabase--linter` sem warnings novos.

Aprovação para entrar em Build Mode e gerar a migration?
