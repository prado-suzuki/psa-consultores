-- PT-03: quem enxerga o estudo pode baixar a apresentação dele.
--
-- O bucket `wp-apresentacoes` nasceu privado e sem policy nenhuma, e só a Edge
-- Function, que usa a chave de serviço, conseguia escrever nele. Na hora de
-- baixar pela tela a assinatura falhava, e o Storage responde falta de permissão
-- com **"Object not found"**: o arquivo estava lá, e a mensagem dizia que não.
--
-- A regra é a mesma das tabelas, e não uma nova: o caminho do arquivo começa
-- pelo id do estudo (`<estudo_id>/PSA_Tributario_....pptx`), então dá para
-- perguntar ao `wp_estudo_visivel` exatamente como as policies de `wp_valor` e
-- `wp_importacao` já fazem. Ninguém ganha acesso a nada que já não pudesse ver.
--
-- **Só leitura.** Escrever continua sendo da função, com chave de serviço: o
-- arquivo é gerado no servidor a partir do banco, e não enviado pela tela.

drop policy if exists "quem ve o estudo baixa a apresentacao" on storage.objects;
create policy "quem ve o estudo baixa a apresentacao"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'wp-apresentacoes'
    and array_length(storage.foldername(name), 1) >= 1
    -- A primeira pasta é o `estudo_id`. `is_uuid` não existe no Postgres, então
    -- o formato é conferido por regex antes do cast: um nome fora do padrão faz
    -- a policy negar, em vez de derrubar a consulta com erro de conversão.
    and (storage.foldername(name))[1] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    and public.wp_estudo_visivel(((storage.foldername(name))[1])::uuid)
  );

-- E quem gerou passa a ficar registrado.
--
-- A coluna existia e nascia nula nas onze primeiras gerações: a função insere
-- pelo PostgREST, e nada preenchia o campo. Sem isso a auditoria sabe que um
-- arquivo foi gerado e não sabe por quem, que é metade da rastreabilidade que a
-- tarefa pede. O default resolve na origem, para qualquer caminho de escrita.
alter table public.wp_apresentacao
  alter column gerado_por set default auth.uid();
