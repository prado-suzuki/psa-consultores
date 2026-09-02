-- O memorial descritivo do georreferenciamento (SIGEF) deixa de pender de UM
-- imóvel escolhido a dedo e passa a sair por imóvel DO DOCUMENTO que tem
-- certificação.
--
-- O bloco era um trecho de topo guardado por {{#imovel.georefArea}}. Condicional
-- sobre campo de entidade REGISTRA o binding unitário `imovel` (ver
-- detectarBindingsDeConteudo), e binding sem registro escolhido trava o passo de
-- seleções da tela Gerar — era por isso que o Contrato Social (Agro) exigia
-- escolher uma matrícula antes de mostrar a prévia, para um trecho que nem
-- sairia no documento.
--
-- Como bloco REPETIDOR sobre {{#memoriais}}, quem manda é o documento: uma
-- instância por matrícula que entra nele (integralizações, {{#imoveis}} e
-- binding unitário) e tem georref no SIGEF; nenhuma matrícula certificada ⇒
-- coleção vazia ⇒ o bloco sai da composição, calado, como sempre foi a regra de
-- coleção vazia. O CONTEÚDO do bloco não muda: {{ imovel.* }} e {{#vertices}}
-- passam a resolver do escopo do item.
update tmpl_bloco
set repete_colecao = 'memoriais',
    updated_at = now()
where nome = 'Memorial descritivo do georreferenciamento (SIGEF)'
  and repete_colecao is null;