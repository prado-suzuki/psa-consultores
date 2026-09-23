-- As três resoluções de governança da alteração contratual só remetiam à
-- consolidação ("passa a vigorar com a redação da consolidação deste
-- instrumento"). As alterações registradas da casa transcrevem o Capítulo IV
-- inteiro dentro da resolução (4ª AC da Bela Vista, 9ª AC do Perci).
--
-- A transcrição sai do motor: {{transcricao capitulo="capituloAdministracao"}}
-- escreve o capítulo como ele sai no consolidado da mesma peça, numerado, sem
-- duplicar o texto dos blocos. {{ refs.capituloAdministracaoClausulas }} é o
-- intervalo das cláusulas dele ("Cláusulas Sexta à Vigésima Primeira").
--
-- A mudança na administração só transcreve quando a instalação ou a alteração
-- não estão na mesma peça (`redacaoGovernanca.naMudanca`, em mapeadores.ts).
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
          '01a20156-0ae5-4011-9919-d50b3b9e852b'::uuid,
          $txt$Os sócios deliberam instituir {{ conselhoAdministracao.artigo }} {{ conselhoAdministracao.nome }} e {{ diretoria.artigo }} {{ diretoria.nome }}, com a composição, as competências e as alçadas adiante consolidadas, alterando-se o {{ refs.capituloAdministracao }} do contrato social, que passa a vigorar com a redação da consolidação deste instrumento.$txt$,
          $txt$Neste ato, a sociedade passa a ser administrada {{ conselhoAdministracao.pelo }} {{ conselhoAdministracao.nome }} e {{ diretoria.pelo }} {{ diretoria.nome }}, órgãos instituídos por meio do presente, alterando todo o regramento elencado junto ao {{ refs.capituloAdministracao }}, que trata da administração da sociedade, de modo que se alteram das {{ refs.capituloAdministracaoClausulas }} deste Contrato Social, de modo que vigorarão nos seguintes termos e forma:

{{transcricao capitulo="capituloAdministracao"}}$txt$
        ),
        (
          '22d227a0-0b64-4932-b2db-0388f893d587'::uuid,
          $txt$Os sócios deliberam alterar a composição, as competências e as alçadas dos órgãos de administração da sociedade, alterando-se o {{ refs.capituloAdministracao }} do contrato social, que passa a vigorar com a redação da consolidação deste instrumento.$txt$,
          $txt$Neste ato, alteram-se a composição, as competências e as alçadas {{ conselhoAdministracao.do }} {{ conselhoAdministracao.nome }} e {{ diretoria.do }} {{ diretoria.nome }}, órgãos já instituídos, alterando o regramento elencado junto ao {{ refs.capituloAdministracao }}, que trata da administração da sociedade, de modo que se alteram das {{ refs.capituloAdministracaoClausulas }} deste Contrato Social, de modo que vigorarão nos seguintes termos e forma:

{{transcricao capitulo="capituloAdministracao"}}$txt$
        ),
        (
          '40dd930b-701b-4c6d-821d-b4f6b6d5ae23'::uuid,
          $txt$Altera-se a administração da sociedade, modificando-se, consequentemente, as disposições contidas no {{ refs.capituloAdministracao }} do contrato social, que passa a vigorar com a redação da consolidação deste instrumento.$txt$,
          $txt${{#redacaoGovernanca.naMudanca}}Neste ato, altera-se a administração da sociedade, mantendo todo o regramento elencado junto ao {{ refs.capituloAdministracao }}, que trata da administração da sociedade, de modo que alteram-se as {{ refs.capituloAdministracaoClausulas }} deste Contrato Social, que vigorarão nos seguintes termos e forma:

{{transcricao capitulo="capituloAdministracao"}}{{/redacaoGovernanca.naMudanca}}$txt$
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
    values (r.bloco_id, v_proxima, true, r.novo, 'A resolução passa a transcrever o capítulo da administração, como as alterações registradas da casa.');
  end loop;
end $$;
