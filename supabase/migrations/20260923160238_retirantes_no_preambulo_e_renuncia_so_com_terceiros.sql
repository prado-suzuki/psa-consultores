-- A cessão total (todos os sócios cedem tudo à controladora) saía com duas
-- afirmações erradas no mesmo instrumento:
--
-- - o preâmbulo qualificava só o quadro resultante, "Única sócia", e os
--   cedentes que se retiram não compareciam como partes; e
-- - "Os demais sócios (...) renunciam ao direito de preferência" saía sem haver
--   sócio nenhum fora da cessão.
--
-- O preâmbulo passa a qualificar os retirantes "na qualidade de sócios
-- retirantes", e o fecho dele conta todas as partes (`vocabularioDaRetirada`).
-- A renúncia concorda com quem de fato renuncia e some quando não há ninguém
-- além de cedentes e cessionários (`vocabularioDaPreferencia`). Sem retirante,
-- o preâmbulo sai exatamente como antes.
--
-- Só dados. Nova versão sobre a vigente, e apenas quando a vigente é o texto
-- que esta migration conhece; reaplicar não empilha nada.

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
          'ac000002-0000-4000-8000-000000000001'::uuid,
          $txt${{#socios sep=";\n\n" fim="; e\n\n"}}{{ socio.qualificacao }}{{/socios}}.

  {{ sociedade.tituloColetivoSocios }} da sociedade limitada *{{ sociedade.razaoSocial }}*, inscrita no CNPJ sob o nº {{ sociedade.cnpj }}, registrada na Junta Comercial do Estado de {{ sociedade.juntaUfExtenso }} sob o NIRE nº {{ sociedade.nire }}, com sede estabelecida na {{ sociedade.sede }}, resolvem neste ato, alterar e consolidar o seu contrato social, de acordo com as cláusulas e condições seguintes:$txt$,
          $txt${{#socios sep=";\n\n" fim="; e\n\n"}}{{ socio.qualificacao }}{{/socios}}{{#retirada.haRetirantes}}; e, na qualidade de {{ retirada.qualidade }},

{{#retirantes sep=";\n\n" fim="; e\n\n"}}{{ retirante.qualificacao }}{{/retirantes}}{{/retirada.haRetirantes}}.

  {{#retirada.semRetirantes}}{{ sociedade.tituloColetivoSocios }}{{/retirada.semRetirantes}}{{#retirada.haRetirantes}}{{ retirada.tituloColetivoDasPartes }}{{/retirada.haRetirantes}} da sociedade limitada *{{ sociedade.razaoSocial }}*, inscrita no CNPJ sob o nº {{ sociedade.cnpj }}, registrada na Junta Comercial do Estado de {{ sociedade.juntaUfExtenso }} sob o NIRE nº {{ sociedade.nire }}, com sede estabelecida na {{ sociedade.sede }}, resolvem neste ato, alterar e consolidar o seu contrato social, de acordo com as cláusulas e condições seguintes:$txt$
        ),
        (
          'ac000003-0000-4000-8000-000000000001'::uuid,
          $txt$Os demais sócios, cientes da cessão de quotas formalizada neste instrumento, renunciam expressamente ao direito de preferência previsto no contrato social.$txt$,
          $txt${{ preferencia.sujeito }}, {{ preferencia.ciente }} da cessão de quotas formalizada neste instrumento, {{ preferencia.verbo }} expressamente ao direito de preferência previsto no contrato social.$txt$
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
    values (r.bloco_id, v_proxima, true, r.novo, 'Retirantes qualificados no preâmbulo e renúncia à preferência só com sócio fora da cessão.');
  end loop;
end $$;
