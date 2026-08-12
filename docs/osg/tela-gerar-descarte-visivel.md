# Tela Gerar: o descarte de bloco se anuncia na tela

**Estado:** implementado.
**Origem:** emenda **9.2** de `contrato-l2-l3-motor-e-blocos.md` ("descarte se anuncia") e o defeito
observado depois dela: `gerarComposicao` devolvia `descartados`, e ninguém consumia.

## O que estava errado

Desde que "bloco sem dado não entra no documento" virou regra de composição, a tela ficou com dois
buracos:

- blocos sumiam da prévia **sem sinal nenhum** — indistinguível de uma cláusula que legitimamente não
  se aplica, e pior, indistinguível de um laço mal fiado (o fecho de assinaturas é um bloco cujo
  conteúdo inteiro é um laço: quando ele perde o dado, some inteiro);
- o rodapé contava `template.blocos.length`, os blocos **compostos**, não os que sobreviveram. Numa
  prova de verificação a folha estava vazia e o rodapé dizia "1 blocos · preenchido do cadastro". O
  texto não estava só desatualizado: estava **ativamente errado**.

## A decisão

**Contar o que saiu, e dar recibo do que não saiu.** Duas peças, ambas em
`src/components/equipe/osg/gerar/resumoDaComposicao.ts` (puras, com teste):

1. `resumoDaFolha` monta a linha de status a partir dos blocos **gerados** e dos **descartados**:
   - conta **posições do modelo**, não blocos gerados — um repetidor vira uma instância por item, e
     contá-las diria "7 de 2 blocos";
   - distingue as duas razões de um bloco faltar, porque elas não são a mesma notícia:
     `ajustado ao perfil da empresa` (as flags tiraram) e `N sem dado para preencher` (o descarte);
   - documento inteiro continua saindo com a frase de sempre, "N blocos · preenchido do cadastro".
2. `blocosForaDaFolha` transforma `descartados` numa lista nomeada, que o painel de conferência mostra
   (`BlocosSemDado.tsx`): **nome do bloco + o porquê** ("a lista que ele percorre não trouxe nenhum
   item", "a tabela dele saiu só com o cabeçalho", "nenhum campo dele veio preenchido", "ele saiu em
   branco"). Um repetidor que perdeu uma instância e manteve outras **não** entra na lista: a posição
   continua no documento e avisar sobre ela seria ruído.

## Por que no painel de conferência, e não como erro

Descartar é o comportamento **certo** — a alternativa é a frase órfã que o B5 descreve. Então isto não
é alerta de erro: é o recibo do descarte, no mesmo painel onde o consultor já confere o que veio do
cadastro, com a ação implícita ("preencha o cadastro correspondente para que ele volte"). Quem estiver
fiando um bloco novo e o vir sumir agora lê o nome dele e o motivo, em vez de procurar no escuro.

O aviso aparece com o documento em cena. Antes disso os passos ainda estão na tela e a folha nem é
renderizada — e, desde a correção da seleção múltipla (B15), a folha só assume depois que o consultor
conclui a seleção, o que remove o pior caso de "blocos que somem e voltam enquanto escolho".
