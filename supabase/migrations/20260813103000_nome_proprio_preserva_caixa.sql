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
-- O QUE O GATILHO SUSTENTAVA SEM DIZER, E QUE PRECISA DE OUTRO DONO.
--
-- Achatar todo mundo para a mesma grafia fazia, de lambuja, com que comparar
-- `nome` por igualdade exata funcionasse. Duas coisas vivas dependem disso:
--
--   1. `get_ordens_by_client_name` (definida treze linhas acima da função que
--      esta migração derruba, no mesmo arquivo de 20260319152802), consumida por
--      `useClienteOrdens` em src/hooks/useTaxReferenceData.ts. Ela é o
--      pareamento dev/prod do mesmo cliente: expande o id para TODOS os clientes
--      de mesmo nome, em qualquer ambiente. Sem o initcap(), bastaria alguém
--      reeditar o nome num ambiente para o par quebrar e a lista de OS do
--      cliente esvaziar em silêncio.
--   2. A checagem de cliente duplicado no cadastro, que comparava por igualdade
--      exata: "AGRO MMS" e "Agro Mms" passariam a ser clientes distintos e o
--      aviso não dispararia. Essa metade é resolvida no front (a comparação
--      passou a usar `chaveDeNomeCliente`, gêmea em TypeScript da função
--      `nome_cliente_normalizado` criada aqui), porque o front precisa continuar
--      funcionando no intervalo entre subir o código e o Lovable aplicar isto.
--
-- A invariante, então, muda de lugar em vez de sumir: quem passa a dizer que
-- dois nomes são o mesmo é `nome_cliente_normalizado(text)` (minúsculas, espaço
-- de borda aparado, espaço interno colapsado), e não mais o dado achatado na
-- gravação. O índice funcional sobre ela evita que a comparação normalizada
-- custe uma varredura: sem o índice, `lower(...)` no WHERE mataria o uso do
-- índice de igualdade que existisse sobre `nome`.
--
-- ⚠️ MIGRAÇÃO — aplicada pelo Lovable. Não altera dado existente: nomes já
-- achatados por `initcap()` continuam achatados até alguém reeditá-los. Corrigir
-- o passado exigiria a grafia original, que o gatilho apagou; um `UPPER`/`UPDATE`
-- em massa inventaria uma caixa que ninguém digitou.
--
-- REVERSÃO: recriar a função de 20260319152802 e os gatilhos
-- BEFORE INSERT OR UPDATE em public.cliente e public.contribuinte; restaurar
-- `get_ordens_by_client_name` na forma antiga; e derrubar o índice e a função
-- `nome_cliente_normalizado` criados abaixo.

-- ── 1. Quem passa a dizer que dois nomes são o mesmo ────────────────────────
-- IMMUTABLE porque é condição para o índice funcional: lower/btrim/regexp_replace
-- são todas imutáveis, então a composição também é.
--
-- O `SET search_path` fica de propósito, embora a função não seja SECURITY
-- DEFINER: ele impede o inlining, e assim a expressão indexada e a do WHERE
-- continuam sendo literalmente a mesma chamada, que é o que garante o uso do
-- índice. O corpo só usa built-ins de pg_catalog, então não há o que quebrar.
CREATE OR REPLACE FUNCTION public.nome_cliente_normalizado(p_nome text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT lower(btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g')));
$$;

COMMENT ON FUNCTION public.nome_cliente_normalizado(text) IS
  'Forma canônica de um nome de cliente para comparação (minúsculas, espaço aparado e colapsado). Gêmea de chaveDeNomeCliente em src/lib/nomeProprio.ts: mudou uma, muda a outra.';

-- Sem CONCURRENTLY: `cliente` tem poucas centenas de linhas (166 em prod na
-- carga de 31/07), então o lock é de milissegundos, e CONCURRENTLY não roda
-- dentro do bloco transacional em que a migração é aplicada.
CREATE INDEX IF NOT EXISTS idx_cliente_nome_normalizado
  ON public.cliente (public.nome_cliente_normalizado(nome));

-- ── 2. O pareamento dev/prod passa a comparar pela forma canônica ───────────
-- O corpo é o mesmo de 20260319152802, com a igualdade trocada. Escrito com a
-- chamada de função dos dois lados (e não com lower() solto no WHERE) justamente
-- para casar com a expressão do índice acima.
CREATE OR REPLACE FUNCTION public.get_ordens_by_client_name(p_client_id uuid)
 RETURNS SETOF ordem_servico LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT os.* FROM ordem_servico os
  WHERE os.id_cliente IN (
    SELECT c2.id FROM cliente c2
    WHERE public.nome_cliente_normalizado(c2.nome)
        = public.nome_cliente_normalizado((SELECT nome FROM cliente WHERE id = p_client_id LIMIT 1))
      AND c2.excluido = false
  )
    AND os.excluido = false
  ORDER BY os.created_at DESC;
$function$;

-- ── 3. Só então o gatilho pode cair ─────────────────────────────────────────
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
