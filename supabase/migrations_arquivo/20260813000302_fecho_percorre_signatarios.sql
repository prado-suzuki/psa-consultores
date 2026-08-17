-- B12 e B13 — o fecho passa a percorrer SIGNATÁRIOS, não sócios.
--
-- O QUE ESTAVA ERRADO
-- O bloco "Fecho e assinaturas" (versão de 20260810180000) itera {{#socios}} e
-- monta o papel de cada linha ali dentro, inclusive o sufixo
-- "{{#socio.exigeOutorgaConjugal}} e Outorga Conjugal{{/socio.exigeOutorgaConjugal}}".
-- Duas consequências no documento gerado:
--   B12. Sai "JOSE EDUARDO … Sócio administrador e Outorga Conjugal". Quem outorga
--        é o CÔNJUGE, e o cônjuge não tem onde assinar: o rótulo diz que houve
--        outorga sem que exista linha de assinatura de quem a dá.
--   B13. Administrador que não é sócio é qualificado na cláusula de administração
--        e não assina, porque não está na lista `socios`.
--
-- A REDAÇÃO CANÔNICA (docs/osg/contrato-l2-l3-motor-e-blocos.md, item 3)
--   {{#signatarios sep="\n\n"}}_______________________________________
--   *{{ signatario.nomeMaiusculo }}*
--   {{ signatario.papel }}{{#signatario.qualificacao}}
--   {{ signatario.qualificacao }}{{/signatario.qualificacao}}{{/signatarios}}
--
-- `signatarios` é entrega do motor (raia L2): lista ordenada, uma entrada por
-- LINHA DE ASSINATURA, com o papel já pronto e concordado em gênero ("Sócia",
-- "Sócio administrador", "Cônjuge outorgante"). O bloco imprime, não monta. A
-- ordem (cada sócio seguido do seu cônjuge outorgante, depois os administradores
-- não sócios, depois advogado e testemunhas) e a deduplicação de quem é sócio E
-- administrador (uma linha só) são garantias do motor, e é por isso que o fecho
-- NÃO ganha um segundo laço {{#administradores}}: ele duplicaria quem acumula os
-- dois papéis.
--
-- A FLAG DE OUTORGA CONTINUA VIVA
-- `socio.exigeOutorgaConjugal` (derivada do regime de bens, dispensada só na
-- separação absoluta) continua existindo e continua correta — o teste de
-- regressão "solteiro não gera outorga" é sobre ela. O que muda é o papel dela:
-- deixa de ser sufixo de rótulo e passa a ser o que faz o cônjuge ENTRAR na lista
-- de signatários, do lado do motor. Por isso a migration remove o sufixo apenas
-- dentro do laço de assinaturas que está reescrevendo, e não varre a flag pelos
-- demais blocos: onde ela condiciona outro texto, ela segue valendo.
--
-- O RESTO DO BLOCO NÃO É TOCADO
-- Data/foro, visto do advogado e testemunhas ficam como estão. A pontuação
-- quebrada de "Lucas do Rio Verde/MT, ." (B19) é campo manual vazio, resolvido no
-- motor com lacuna assinalável — não é problema de texto do bloco.
--
-- ⚠️ AVISO A QUEM FOR FIAR A LISTA (tela Gerar)
-- Advogado e testemunhas continuam como LINHAS FIXAS deste bloco, com os seus
-- placeholders de texto livre ({{ advogadoNome }}, {{ testemunha1Nome }}…). A
-- entrada de `signatarios` do motor aceita `advogado` e `testemunhas`, e quem
-- montar a lista NÃO pode preenchê-los para este bloco: o laço passaria a
-- imprimir uma linha de advogado que já existe logo abaixo, e o contrato sairia
-- com o mesmo advogado assinando duas vezes. O laço aqui é de sócios,
-- administradores e cônjuges outorgantes. Se um dia advogado e testemunhas
-- entrarem pela lista, é o texto FIXO que sai daqui, na mesma migration.
--
-- POR QUE EMENDA TEXTUAL, E NÃO REESCRITA DO BLOCO INTEIRO
-- O bloco é editável pela Biblioteca: o conteúdo atual em produção pode ter
-- ajustes que nenhuma migration conhece (nome do advogado fixo, uma terceira
-- testemunha…). A migration troca só o LAÇO DE ASSINATURAS, identificado pela
-- forma (uma seção de sócios que começa com a régua de assinatura), e preserva
-- todo o resto do texto.
--
-- OVERRIDE DE CLIENTE É PRESERVADO (item 7 do contrato): a varredura só toca
-- blocos com `bloco_origem_id is null`; o derivado de um override fica como está
-- e o motivo do override recebe uma nota.
--
-- Idempotente: depois da troca não há mais laço de sócios com régua, então
-- reaplicar não casa nada e não cria versão.
--
-- Reversão: para cada bloco tocado, apagar a versão criada aqui e devolver
-- atual=true à imediatamente anterior.

BEGIN;

do $mig$
declare
  b record;
  novo text;
  proxima integer;
  tocados uuid[] := array[]::uuid[];
  marcador constant text := '@@LINHAS_DE_ASSINATURA@@';
  -- Uma linha por signatário: régua, nome em caixa alta e papel. A qualificação
  -- (ex.: "neste ato representada por …" da sócia PJ) só ocupa linha quando existe.
  assinaturas constant text :=
$assin${{#signatarios sep="\n\n"}}_______________________________________
*{{ signatario.nomeMaiusculo }}*
{{ signatario.papel }}{{#signatario.qualificacao}}
{{ signatario.qualificacao }}{{/signatario.qualificacao}}{{/signatarios}}$assin$;
begin
  for b in
    select bl.id, bl.nome, v.conteudo
      from public.tmpl_bloco bl
      join public.tmpl_bloco_versao v on v.bloco_id = bl.id and v.atual
     where bl.bloco_origem_id is null
       and v.conteudo is not null
     order by bl.nome
  loop
    -- O laço de assinaturas é a seção de sócios que abre com a régua. Marcador
    -- primeiro, texto depois: o conteúdo novo tem "\n" literal (escape que o
    -- parser do engine desfaz), e "\" no lado direito de regexp_replace teria
    -- outro significado.
    novo := regexp_replace(
      b.conteudo,
      $re$\{\{#socios[^}]*?\}\}_{5,}.*?\{\{/socios\}\}$re$,
      marcador,
      'g'
    );

    if novo is distinct from b.conteudo then
      novo := replace(novo, marcador, assinaturas);

      select coalesce(max(numero_versao), 0) + 1 into proxima
        from public.tmpl_bloco_versao where bloco_id = b.id;

      update public.tmpl_bloco_versao set atual = false
       where bloco_id = b.id and atual;

      insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
      values (
        b.id, proxima, true, novo,
        'B12/B13: o fecho percorre {{#signatarios}} em vez de {{#socios}}. Cônjuge outorgante e administrador não sócio ganham linha de assinatura própria, com o papel pronto vindo do motor, e o sufixo " e Outorga Conjugal" sai do rótulo do sócio.'
      );

      tocados := tocados || b.id;
      raise notice 'B12/B13: bloco "%" versionado (v%).', b.nome, proxima;
    end if;
  end loop;

  if cardinality(tocados) = 0 then
    raise notice 'B12/B13: nenhum bloco com laço de assinatura sobre sócios — nada a fazer.';
    return;
  end if;

  update public.documento_override o
     set observacao = trim(coalesce(o.observacao, '') ||
       ' [Biblioteca 13/08/2026: o bloco de origem foi corrigido (B12/B13, assinaturas por signatário). Este ajuste do documento foi PRESERVADO como está e NÃO recebeu a correção — revise o texto do ajuste.]')
   where o.bloco_alvo_id = any(tocados)
     and coalesce(o.observacao, '') not like '%[Biblioteca 13/08/2026:%';
end
$mig$;

COMMIT;
