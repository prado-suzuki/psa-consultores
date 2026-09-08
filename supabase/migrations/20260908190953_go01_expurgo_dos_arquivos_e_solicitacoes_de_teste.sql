-- 20260908190953_go01_expurgo_dos_arquivos_e_solicitacoes_de_teste.sql
-- Sprint 13 / GO-01: os arquivos de teste saem de documento_arquivo de vez, e as
-- solicitações de teste saem junto.
--
-- O card pede "nenhum arquivo de teste aparece em documento_arquivo nem no balde". O BALDE
-- JÁ ESTÁ LIMPO: os binários dos sete de produção foram apagados em 08/09/2026 pelo endpoint
-- /api/v1/osg/documentos/delete do psa-backend-api, e a ausência foi conferida pedindo URL
-- assinada e recebendo 404 em cada um (com controle: um objeto que não foi apagado devolveu
-- 200 no mesmo teste). O que faltava é a LINHA: o endpoint, por desenho, só marca
-- `excluido = true` — é ela que torna utilizável a janela de sete dias do bucket, e está
-- escrito assim no docstring dele. Marcado não é apagado, e o card diz "não aparece".
--
-- BIGQUERY: nada a fazer, medido e não suposto. O único vestígio de documento em BQ é o
-- georref (psa_osg.georef_cabecalho + georef_detalhe), e só para categoria
-- 'georreferenciamento' — o robô psa-etl-georef extrai as coordenadas do memorial e as grava
-- em tabela NATIVA; não há tabela externa lendo o GCS em projeto nenhum, então os dois
-- armazenamentos são independentes. Nenhum dos sete era georref, e psa-digital-prod.psa_osg
-- está com numRows = 0. Os três cabeçalhos e 123 vértices que existem estão no projeto de
-- desenvolvimento e FICAM ONDE ESTÃO, por decisão do tech lead em 08/09/2026.
--
-- ⚠️ PRÉ-CONDIÇÃO DO BLOCO 2: os dez arquivos precisam estar com `excluido = true`, o que só
-- acontece depois de o endpoint apagar o binário deles no GCS de desenvolvimento. Apagar a
-- linha antes perde a `gcs_uri`, e com ela o endereço do objeto — o binário viraria órfão
-- sem ninguém para achá-lo. O bloco `do $$` recusa a migration inteira se isso não tiver
-- sido feito, em vez de apagar pela metade e ficar calado.
--
-- SATISFEITA EM 08/09/2026, e o caminho não é óbvio: esses dez apontam para
-- `gs://psa-osg-documentos-dev/`, e a API de PRODUÇÃO os recusa com 422 INVALID_GCS_URI —
-- ela só assina e apaga dentro do balde do próprio projeto GCP, que é como a segregação de
-- ambiente é feita (ver o comentário do `_KEY_RE` em osg_documentos.py: "a segregação de
-- ambiente é por projeto GCP, não entra na chave"). Quem apagou foi a API de
-- DESENVOLVIMENTO (psa-backend-api-456879351254), que enxerga o balde dev e valida o mesmo
-- JWT, porque o preview do Lovable aponta para o mesmo Supabase de produção. Os dez
-- voltaram `deleted=true`, e três amostras foram conferidas com `gcloud storage ls`.
--
-- ORDEM DOS BLOCOS, e ela importa: `documento_arquivo.solicitacao_id` é ON DELETE SET NULL.
-- Apagar a solicitação primeiro deixaria os dez arquivos para trás apontando para nada —
-- exatamente o mecanismo que produziu as cinco órfãs da GO-08. Arquivo primeiro, pedido
-- depois.
--
-- O QUE CAI EM CASCATA no bloco 3, conferido em pg_constraint: `solicitacao_item` (340
-- linhas), os `documento_tipo` avulsos presos a esses itens e `solicitacao_item_nao_aplicavel`.
-- `documento_download` também é CASCADE a partir de documento_arquivo, mas a tabela está
-- vazia (0 linhas), então não há rastro de download a perder.
--
-- Idempotente: apagar por id que já não existe é no-op.

-- ---------------------------------------------------------------------------
-- Bloco 0 — a trava da pré-condição.
-- ---------------------------------------------------------------------------
do $$
declare
  pendentes int;
begin
  select count(*) into pendentes
    from public.documento_arquivo
   where id in ('c97bcaa8-3e39-4261-8c3e-d38f6184ba67',
                'e84ad862-b5bb-4e1a-a35a-9a342f22a0bd',
                '943ab332-cdcd-4f19-9992-16a365c56037',
                'fb0bb896-02ce-4864-9eca-e69a48da64ca',
                'e5c47e05-728c-4104-a093-34b60bacac10',
                '925a88af-96ec-4071-82c8-35e25ce1d403',
                'ec4def2f-693c-4a25-8bb1-3c8a485dbc46',
                '0f2575b5-fd48-4bf1-adb8-3d8fc5e74ebe',
                '7c13f49a-85d0-450c-b624-cf5785c09de8',
                '2abf03d2-984c-45bd-a4da-175f364f81a9')
     and not excluido;

  if pendentes > 0 then
    raise exception
      'GO-01: % arquivo(s) do bloco 2 ainda com excluido = false. Rode o endpoint '
      '/api/v1/osg/documentos/delete neles ANTES desta migration, senão o binário no GCS '
      'de desenvolvimento fica órfão sem endereço.', pendentes;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Bloco 1 — as sete fichas de produção. Binários já apagados do GCS em 08/09/2026.
-- ---------------------------------------------------------------------------
delete from public.documento_arquivo
 where id in ('7ad6e876-b6c4-412e-b264-5fbdc60747b5',   -- Foo Fighter.jpg · [TESTE] Alessio Sansão
              'd9ddcf25-0f62-4343-a804-d9e7ae8c7123',   -- image(1).png agrarios · Ÿ Osg - Teste 1
              'c1583920-d7f0-4c5a-bf3a-1c8ead44b061',   -- image(1).png bens_direitos · Ÿ Osg - Teste 1
              '82316df1-931f-40c1-9028-c9b5269782b2',   -- image(1).png bens_direitos · Ÿ Osg - Teste 1
              '81e04f5a-ab7e-4301-b838-bbcadbce4497',   -- CNH · Mms Agro, solicitação de exemplo já encerrada
              'c0966474-5458-4455-ac31-00bb578f24a4',   -- teste.pdf · [TESTE] Adilton Sachetti
              '4a5f094c-e4d8-40b0-980c-11f5b32ab42f');  -- unknow.jpg · Mms Agro

-- ---------------------------------------------------------------------------
-- Bloco 2 — os dez arquivos presos às solicitações de teste (ambiente dev).
-- Nomes de pessoas reais dentro de cliente [TESTE]: declarações de IRPF usadas em QA.
-- ---------------------------------------------------------------------------
delete from public.documento_arquivo
 where id in ('c97bcaa8-3e39-4261-8c3e-d38f6184ba67',   -- WP-Diagnóstico Preliminar.docx
              'e84ad862-b5bb-4e1a-a35a-9a342f22a0bd',   -- Contrato Social_ MMS Agro Ltda-4.pdf
              '943ab332-cdcd-4f19-9992-16a365c56037',   -- Ícone - PSA 1.png
              'fb0bb896-02ce-4864-9eca-e69a48da64ca',   -- José Eduardo · 2022 · Declaração
              'e5c47e05-728c-4104-a093-34b60bacac10',   -- José Eduardo · 2022 · Recibo
              '925a88af-96ec-4071-82c8-35e25ce1d403',   -- José Eduardo · 2023 · Declaração
              'ec4def2f-693c-4a25-8bb1-3c8a485dbc46',   -- José Eduardo · 2023 · Recibo
              '0f2575b5-fd48-4bf1-adb8-3d8fc5e74ebe',   -- Camila · 2021 · Declaração
              '7c13f49a-85d0-450c-b624-cf5785c09de8',   -- Camila · 2021 · Recibo
              '2abf03d2-984c-45bd-a4da-175f364f81a9');  -- José Eduardo · 2022 · Declaração (2ª via)

-- ---------------------------------------------------------------------------
-- Bloco 3 — as seis solicitações de teste. A sétima, da Família Lunardi, FICA:
-- é rascunho real, criado pela Anne Strini (lider, cluster OSG) em 03/09/2026.
-- ---------------------------------------------------------------------------
delete from public.solicitacao
 where id in ('adb3d901-3ce3-4a97-995f-62885707e9b2',   -- [Teste E2e] Grupo Mms · em_checklist · 58 itens
              '5e77a0ba-7f22-4d9e-9a94-bc4952499883',   -- [TESTE] Alessio Sansão · encerrada · 47 itens
              'd138566a-a49d-495e-8952-04ddf38e3fb0',   -- [TESTE] Alessio Sansão · enviada · 46 itens
              '32a097d2-1d75-4d6a-a802-83a509836289',   -- [TESTE] Qa-0729 Horizonte Áureo · encerrada · 62 itens
              '6168bad0-36c8-4682-9f41-02b381ffd977',   -- [TESTE] Qa-0729 Horizonte Áureo · enviada · 60 itens
              '0518b5e8-9467-457c-bcde-59ac203028e6');  -- Família Krampe · rascunho · 67 itens · cliente real,
                                                        -- rascunho de teste do Alexandre em 07/08, nunca enviado,
                                                        -- confirmado como descartável em 08/09/2026
