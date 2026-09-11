-- 20260908134451_modelo_policies_do_bucket_e_caminho_dos_dois_modelos.sql
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