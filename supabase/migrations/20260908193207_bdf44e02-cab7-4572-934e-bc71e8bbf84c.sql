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

delete from public.documento_arquivo
 where id in ('7ad6e876-b6c4-412e-b264-5fbdc60747b5',
              'd9ddcf25-0f62-4343-a804-d9e7ae8c7123',
              'c1583920-d7f0-4c5a-bf3a-1c8ead44b061',
              '82316df1-931f-40c1-9028-c9b5269782b2',
              '81e04f5a-ab7e-4301-b838-bbcadbce4497',
              'c0966474-5458-4455-ac31-00bb578f24a4',
              '4a5f094c-e4d8-40b0-980c-11f5b32ab42f');

delete from public.documento_arquivo
 where id in ('c97bcaa8-3e39-4261-8c3e-d38f6184ba67',
              'e84ad862-b5bb-4e1a-a35a-9a342f22a0bd',
              '943ab332-cdcd-4f19-9992-16a365c56037',
              'fb0bb896-02ce-4864-9eca-e69a48da64ca',
              'e5c47e05-728c-4104-a093-34b60bacac10',
              '925a88af-96ec-4071-82c8-35e25ce1d403',
              'ec4def2f-693c-4a25-8bb1-3c8a485dbc46',
              '0f2575b5-fd48-4bf1-adb8-3d8fc5e74ebe',
              '7c13f49a-85d0-450c-b624-cf5785c09de8',
              '2abf03d2-984c-45bd-a4da-175f364f81a9');

delete from public.solicitacao
 where id in ('adb3d901-3ce3-4a97-995f-62885707e9b2',
              '5e77a0ba-7f22-4d9e-9a94-bc4952499883',
              'd138566a-a49d-495e-8952-04ddf38e3fb0',
              '32a097d2-1d75-4d6a-a802-83a509836289',
              '6168bad0-36c8-4682-9f41-02b381ffd977',
              '0518b5e8-9467-457c-bcde-59ac203028e6');