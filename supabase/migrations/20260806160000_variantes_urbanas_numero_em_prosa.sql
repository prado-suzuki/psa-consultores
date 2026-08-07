-- Correção do texto das duas variantes urbanas: número do imóvel em prosa.
--
-- O QUE ESTAVA ERRADO
-- O seed (20260806140000) escreveu "nº {{ imovel.enderecoNumero }}", com o "nº"
-- literal no texto e o campo saindo cru. Imóvel sem número, que no cadastro é
-- gravado como "s/n", produziria "nº s/n" no contrato.
--
-- A CORREÇÃO
-- O engine passou a publicar `imovel.enderecoNumeroProsa`, que aplica o
-- `numeroProsa` já usado na qualificação das partes: número normal ganha "nº"
-- ("nº 119") e as variações de sem número saem na forma canônica da casa
-- ("s/nº"). O "nº" sai do texto do bloco e passa a vir do campo.
--
-- POR QUE CORRIGE A v1 NO LUGAR DE CRIAR UMA v2
-- Versionar existe para preservar a redação que já produziu documento. Esta não
-- produziu: as variantes nasceram hoje, a família não está anexada a nenhum
-- modelo e nenhum `documento_gerado.snapshot_versoes_blocos` referencia essas
-- versões. Criar v2 aqui deixaria na Biblioteca um histórico que conta a história
-- de um erro de digitação do mesmo dia, não da evolução da cláusula.
--
-- Idempotente: o replace não encontra nada se já tiver sido aplicado.
--
-- Reversão:
--   update public.tmpl_bloco_versao set conteudo = replace(conteudo,
--     '{{ imovel.enderecoNumeroProsa }}', 'nº {{ imovel.enderecoNumero }}')
--    where conteudo like '%{{ imovel.enderecoNumeroProsa }}%';

BEGIN;

update public.tmpl_bloco_versao
   set conteudo = replace(
         conteudo,
         'nº {{ imovel.enderecoNumero }}',
         '{{ imovel.enderecoNumeroProsa }}'
       )
 where conteudo like '%nº {{ imovel.enderecoNumero }}%';

COMMIT;
