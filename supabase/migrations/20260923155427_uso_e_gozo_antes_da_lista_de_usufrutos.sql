-- A lista de usufrutos colava direto na frase de abertura: a reserva saía
-- "todos os direitos de uso e gozoi) sobre 184.716 quotas" e a instituição,
-- "a mesma titularidadei) LUCAS NOGUEIRA". Falta o anúncio da lista, que os
-- gravames já têm ("ficam gravadas as quotas abaixo descritas: i) ...").
--
-- Só dados. Nova versão sobre a vigente, e apenas quando a vigente é o texto
-- corrompido: reaplicar não empilha nada, e redação já corrigida à mão fica.

do $$
declare
  r record;
  v_versao_id uuid;
  v_proxima integer;
begin
  for r in
    select *
      from (values
        (
          '10445d6c-973e-47cb-b7fc-9d8d100f4d8a'::uuid,
          $txt$*Da reserva de usufruto.* Sobre as quotas abaixo indicadas reserva-se o usufruto vitalício, permanecendo com as pessoas usufrutuárias todos os direitos de uso e gozo{{#usufrutos sep="; " fim="; e "}}{{ usufruto.ordemRomana }}) sobre {{ usufruto.quotas }} ({{ usufruto.quotasExtenso }}) quotas de titularidade de *{{ nuProprietario.nomeMaiusculo }}*, em favor de *{{ usufruto.usufrutuarioNomes }}*{{#comVoto}}, inclusive com o direito de voto, nos termos do artigo 114 da Lei nº 6.404/76, aplicado supletivamente por força do artigo 1.053, parágrafo único, do Código Civil{{/comVoto}}{{#semVoto}}, sem extensão ao direito de voto{{/semVoto}}{{/usufrutos}}.

Havendo usufrutuários em conjunto, no falecimento de um deles o respectivo quinhão acrescerá ao sobrevivente, nos termos do artigo 1.411 do Código Civil.$txt$,
          $txt$*Da reserva de usufruto.* Sobre as quotas abaixo indicadas reserva-se o usufruto vitalício, permanecendo com as pessoas usufrutuárias todos os direitos de uso e gozo, nos seguintes termos: {{#usufrutos sep="; " fim="; e "}}{{ usufruto.ordemRomana }}) sobre {{ usufruto.quotas }} ({{ usufruto.quotasExtenso }}) quotas de titularidade de *{{ nuProprietario.nomeMaiusculo }}*, em favor de *{{ usufruto.usufrutuarioNomes }}*{{#comVoto}}, inclusive com o direito de voto, nos termos do artigo 114 da Lei nº 6.404/76, aplicado supletivamente por força do artigo 1.053, parágrafo único, do Código Civil{{/comVoto}}{{#semVoto}}, sem extensão ao direito de voto{{/semVoto}}{{/usufrutos}}.

Havendo usufrutuários em conjunto, no falecimento de um deles o respectivo quinhão acrescerá ao sobrevivente, nos termos do artigo 1.411 do Código Civil.$txt$
        ),
        (
          'bbaeb5b3-810d-49a7-822a-917873a4d671'::uuid,
          $txt$*Da instituição de usufruto.* Os sócios adiante nomeados instituem, sobre as quotas de sua propriedade, o usufruto vitalício em favor das pessoas indicadas, permanecendo eles como nus proprietários e conservando as quotas a mesma titularidade{{#usufrutosInstituidos sep="; " fim="; e "}}{{ usufruto.ordemRomana }}) *{{ nuProprietario.nomeMaiusculo }}*, {{ nuProprietario.qualificacao }}, institui o usufruto de {{ usufruto.quotas }} ({{ usufruto.quotasExtenso }}) quotas de sua titularidade em favor de *{{ usufruto.usufrutuarioNomes }}*{{#comVoto}}, inclusive com o direito de voto, nos termos do artigo 114 da Lei nº 6.404/76, aplicado supletivamente por força do artigo 1.053, parágrafo único, do Código Civil{{/comVoto}}{{#semVoto}}, sem extensão ao direito de voto, cabendo à pessoa usufrutuária apenas o uso e o gozo{{/semVoto}}{{/usufrutosInstituidos}}.

Havendo pessoas usufrutuárias em conjunto, no falecimento de uma delas o respectivo quinhão acrescerá à sobrevivente, nos termos do artigo 1.411 do Código Civil.$txt$,
          $txt$*Da instituição de usufruto.* Os sócios adiante nomeados instituem, sobre as quotas de sua propriedade, o usufruto vitalício em favor das pessoas indicadas, permanecendo eles como nus proprietários e conservando as quotas a mesma titularidade, nos seguintes termos: {{#usufrutosInstituidos sep="; " fim="; e "}}{{ usufruto.ordemRomana }}) *{{ nuProprietario.nomeMaiusculo }}*, {{ nuProprietario.qualificacao }}, institui o usufruto de {{ usufruto.quotas }} ({{ usufruto.quotasExtenso }}) quotas de sua titularidade em favor de *{{ usufruto.usufrutuarioNomes }}*{{#comVoto}}, inclusive com o direito de voto, nos termos do artigo 114 da Lei nº 6.404/76, aplicado supletivamente por força do artigo 1.053, parágrafo único, do Código Civil{{/comVoto}}{{#semVoto}}, sem extensão ao direito de voto, cabendo à pessoa usufrutuária apenas o uso e o gozo{{/semVoto}}{{/usufrutosInstituidos}}.

Havendo pessoas usufrutuárias em conjunto, no falecimento de uma delas o respectivo quinhão acrescerá à sobrevivente, nos termos do artigo 1.411 do Código Civil.$txt$
        )
      ) as t(bloco_id, antigo, novo)
  loop
    select id into v_versao_id
      from public.tmpl_bloco_versao
     where bloco_id = r.bloco_id
       and atual
       and conteudo = r.antigo;

    if v_versao_id is null then
      continue;
    end if;

    select coalesce(max(numero_versao), 0) + 1 into v_proxima
      from public.tmpl_bloco_versao
     where bloco_id = r.bloco_id;

    update public.tmpl_bloco_versao set atual = false where id = v_versao_id;

    insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
    values (r.bloco_id, v_proxima, true, r.novo, 'A lista de usufrutos passa a ser anunciada, e não mais colada à frase de abertura.');
  end loop;
end $$;
