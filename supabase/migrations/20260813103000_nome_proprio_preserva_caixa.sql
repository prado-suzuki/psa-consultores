-- B20 · Nome de cliente e razão social param de perder a caixa original.
--
-- SINTOMA. "[TESTE E2E] Grupo MMS" aparece na lista como "[Teste E2e] Grupo Mms".
--
-- CAUSA. Não é renderização: a lista mostra `cliente.nome` cru
-- (src/pages/equipe/fiscal/GestaoClientes.tsx). Quem descaracteriza é o gatilho
-- `normalize_name_title_case`, criado em 20260319152802, que roda `initcap()` em
-- `cliente.nome`, `contribuinte.nome_razao_social` e `contribuinte.nome_fantasia`
-- ANTES de gravar. O valor "correto" que o teste viu era o texto digitado no
-- filtro `nome=eq.`, não a linha do banco.
--
-- `initcap()` baixa a caixa de tudo e sobe só a primeira letra de cada palavra,
-- então ele destrói exatamente o que é significado num nome próprio ou numa
-- razão social: sigla ("MMS" → "Mms", "E2E" → "E2e"), abreviatura com ponto
-- ("J.E." → "J.e."), tipo societário ("S/A" → "S/a", "LTDA" → "Ltda") e
-- marcador entre colchetes. Duas migrations de carga (20260731170000 e
-- 20260731200000) já tiveram de escrever id fixo por não poderem casar pelo nome
-- depois de gravar — o gatilho era um estorvo, não uma regra de negócio.
--
-- CORREÇÃO. O banco guarda o que foi digitado. Uniformizar entrada bagunçada é
-- decisão de escrita, feita no formulário, com o usuário vendo o que ficou
-- gravado (ver `normalizarNomeDigitado` em src/lib/nomeProprio.ts, aplicada no
-- blur do campo: ela apara espaços e não mexe em caixa).
--
-- ⚠️ MIGRAÇÃO — aplicada pelo Lovable. Não altera dado existente: nomes já
-- achatados por `initcap()` continuam achatados até alguém reeditá-los. Corrigir
-- o passado exigiria a grafia original, que o gatilho apagou; um `UPPER`/`UPDATE`
-- em massa inventaria uma caixa que ninguém digitou.
--
-- REVERSÃO: recriar a função de 20260319152802 e os gatilhos
-- BEFORE INSERT OR UPDATE em public.cliente e public.contribuinte.

-- Os gatilhos foram criados fora do repositório (console/Lovable), então os nomes
-- não são conhecidos aqui. Derruba pelo que é certo: a função que eles executam.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tabela, n.nspname AS esquema, t.tgname AS gatilho
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE NOT t.tgisinternal
      AND t.tgfoid = 'public.normalize_name_title_case()'::regprocedure
  LOOP
    EXECUTE format('DROP TRIGGER %I ON %I.%I', r.gatilho, r.esquema, r.tabela);
    RAISE NOTICE 'Gatilho de initcap removido: %.% / %', r.esquema, r.tabela, r.gatilho;
  END LOOP;
EXCEPTION
  WHEN undefined_function THEN
    RAISE NOTICE 'normalize_name_title_case() não existe — nada a remover.';
END $$;

DROP FUNCTION IF EXISTS public.normalize_name_title_case();
