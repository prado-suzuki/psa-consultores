-- 20260908134451_modelo_policies_do_bucket_e_caminho_dos_dois_modelos.sql
-- Sprint 13 / card 4: quem pode ler o modelo, e onde os dois primeiros modelos estão.
--
-- Complemento da 20260908113717, que criou as três colunas e ensinou as duas RPCs do
-- portal a devolver a chave "modelo". Aqui vem o que faltava para o botão funcionar de
-- verdade: a permissão de leitura no balde e o endereço dos dois arquivos.
--
-- O BUCKET NÃO NASCE AQUI. `osg-modelos` (privado) foi criado pelo painel do Lovable, que
-- é o padrão desta casa: nenhuma migration do repositório cria bucket. Policy de
-- `storage.objects`, por outro lado, é policy comum e mora em migration — o precedente é
-- `20260904210000_pt03_leitura_das_apresentacoes.sql`.
--
-- POR QUE A LEITURA É PARA QUALQUER LOGADO, inclusive o papel `client`: o modelo é o
-- MESMO para todos os clientes e não tem dado de ninguém dentro. Quem precisa baixá-lo é
-- justamente o cliente, pelo portal. O balde é privado só para o link não ser público na
-- internet; o acesso sai por URL assinada (`createSignedUrl`).
--
-- POR QUE A ESCRITA É SÓ DE ADMIN: trocar o arquivo vale para todo mundo no mesmo
-- instante. Analista não troca nem apaga modelo.

drop policy if exists "logado baixa o modelo do documento" on storage.objects;
create policy "logado baixa o modelo do documento"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'osg-modelos');

drop policy if exists "admin escreve o modelo do documento" on storage.objects;
create policy "admin escreve o modelo do documento"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'osg-modelos'
              and public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "admin troca o modelo do documento" on storage.objects;
create policy "admin troca o modelo do documento"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'osg-modelos'
         and public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (bucket_id = 'osg-modelos'
              and public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists "admin apaga o modelo do documento" on storage.objects;
create policy "admin apaga o modelo do documento"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'osg-modelos'
         and public.has_role(auth.uid(), 'admin'::public.app_role));

-- O endereço dos dois primeiros modelos.
--
-- Caminho por `codigo` do tipo, que é a chave natural do catálogo: o endereço já diz qual
-- linha de `documento_tipo` o arquivo serve, e trocar a versão do modelo não corre risco
-- de colisão de nome. Conferido em `storage.objects` em 08/09/2026: os dois objetos estão
-- nesses caminhos exatos, com 30,3 KB e 13,9 KB.
--
-- `modelo_nome` é o que a tela escreve e o que o navegador salva — não precisa ser igual
-- ao nome do objeto no balde, e de propósito não é: o cliente lê o nome do documento, não
-- o nome de arquivo interno.
--
-- Idempotente: são dois UPDATE por id, e rodar de novo grava o mesmo valor.

update public.documento_tipo
   set modelo_bucket = 'osg-modelos',
       modelo_path   = 'documento-tipo/bem--relacao-de-areas-exploradas-por-imovel/'
                       || 'Modelo_Relacao_de_areas_exploradas_por_imovel.xlsx',
       modelo_nome   = 'Relação de áreas exploradas por imóvel (modelo).xlsx'
 where id = 'b5df44cf-6bed-41e4-bcd8-60d657fe1d73';

update public.documento_tipo
   set modelo_bucket = 'osg-modelos',
       modelo_path   = 'documento-tipo/bem--planilha-de-resultado-projetado-pf-e-pj/'
                       || 'Modelo_DRE_Projetada.xlsx',
       modelo_nome   = 'DRE Projetada (modelo).xlsx'
 where id = '3917ed83-79e5-48f5-8f4c-fb2b928587cd';
