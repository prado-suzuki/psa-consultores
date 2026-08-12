# Memorial de georreferenciamento por imóvel — lacuna aberta (B15)

**Estado:** lacuna registrada, não corrigida. A metade que faltava é de **conteúdo de bloco**
(migration), fora da raia de quem escreveu isto (tela Gerar / controller).
**Origem:** `docs/sprints/sprint-11/TAREFA_correcoes-e2e-geracao-contrato.md`, B15 —
"O georref, que é por matrícula, precisa seguir a matrícula de cada item do laço, não um binding único".

## O sintoma

Um contrato de constituição que integraliza **sete** matrículas (caso MMS) sai com **um** memorial
descritivo: o da matrícula que o consultor escolheu no passo "Este modelo também precisa de: Imóvel".
As outras seis não têm memorial nenhum, e nada na tela diz que faltam.

## Por que, exatamente

O georref chega ao documento por dois caminhos, e só o primeiro está ligado ao texto vivo:

1. **Binding singular.** `useGerarDocumentoController` resolve o 1º binding de matrícula do modelo
   (`bindingMatricula`), busca o georref dele (`useGeorefByMatricula`), publica o cabeçalho nos campos
   `imovel.georef*` desse binding e os vértices na lista de topo `{{#vertices}}`. É o que o bloco
   "Memorial descritivo do georreferenciamento (SIGEF)" usa hoje — ele fala de `{{ imovel.georefArea }}`
   e itera `{{#vertices}}` no escopo de topo.
2. **Por item da lista `imoveis`.** O mesmo controller já monta `itensPorLista.imoveis` como
   `[{ imovel: {...campos + georef*}, vertices: [...] }]`, um item por matrícula selecionada, com o
   georref de **cada** uma (`useGeorefsByMatriculas`). **Nada consome esse caminho como lista de topo:**
   a única ocorrência de `{{#imoveis}}` nos blocos vivos está *dentro* do repetidor
   `{{#integralizacoes}}` (`supabase/migrations/20260810120000_paragrafo_integralizacao_delega_a_familia.sql`),
   onde ela descreve o imóvel em prosa e não escreve memorial.

Ou seja: o dado por item existe, montado e testado; o **texto** que o percorreria não.

## O que o motor já garante (verificado, não suposto)

Um bloco com `repete_colecao = 'imoveis'` recebe **um item por matrícula** no escopo, e dentro dele
`{{ imovel.* }}` e a lista aninhada `{{#vertices}}` resolvem do próprio item — cada instância imprime
os vértices da sua matrícula e de nenhuma outra. Isso foi confirmado contra `gerarComposicao` com dois
imóveis e conjuntos de vértices distintos. `binding.ts` já trata a lista aninhada na detecção
(`itemKeysExtras` / listas internas), então a tela Gerar não passa a pedir campo fantasma.

Também já vale: bloco cuja seção de repetição não produz item **é descartado** (contrato L2/L3, item 2),
então a instância de uma matrícula sem georref some sozinha, sem guarda escrita à mão — e agora o
descarte aparece nomeado no painel de conferência.

## O que falta, e é de quem escreve conteúdo

Uma migration de conteúdo que faça o memorial ser **por imóvel**:

1. o bloco "Memorial descritivo do georreferenciamento (SIGEF)" passa a ter
   `repete_colecao = 'imoveis'` na Biblioteca (`tmpl_bloco.repete_colecao`);
2. o texto continua igual: `{{#imovel.georefArea}}…{{ imovel.georefArea }}…{{#vertices}}…{{/vertices}}{{/imovel.georefArea}}`
   — dentro do repetidor, `imovel` e `vertices` passam a ser os do item, sem trocar uma variável;
3. o modelo "Contrato Social — Sociedade Limitada (Agro)" deixa de depender do binding singular
   `imovel` (o passo "Imóvel" some do fluxo quando nenhum outro bloco o citar), e o memorial passa a
   sair uma vez por matrícula **selecionada**, na ordem da seleção;
4. o modelo "Matrícula Digitada" **não muda**: lá o memorial descreve o único imóvel do instrumento e
   continua no binding singular. Este é o ponto que impede a saída preguiçosa de "usar sempre todos os
   imóveis aprovados da empresa" — o "Não faça" do B15.

## Enquanto (1) não for aplicada: a seleção múltipla existe e não acende

Correção de uma afirmação errada que estava aqui antes, apontada na revisão: **a seleção múltipla não
alimenta as alíneas de integralização.** As alíneas vêm de `{{#integralizacoes}}`, montadas por
`mapearIntegralizacoes(socios, integralizacoes)` sobre `useIntegralizacoesAprovadas(empresaId)`
(`src/hooks/useGeracaoDocumento.ts`), que não passa pela seleção do consultor.

O que decorre disso, e é a informação que faltava: **hoje nenhum modelo vivo expõe a lista de seleção.**
A única ocorrência de `{{#imoveis}}` nos blocos vivos está **dentro** do repetidor de integralizações, e
`conteudoParaDeteccao` (`src/lib/templates/binding.ts`) embrulha o conteúdo do repetidor na própria
coleção, então `imoveis` fica aninhada e não vira `listasDeSelecao`. Ou seja, a UI de seleção múltipla só
**acende** quando a migration do passo (1) for aplicada.

Isso responde ao aceite do B15 ("as sete matrículas entram?") com precisão: **entram pelo mecanismo**,
provado em teste com modelo sintético (`src/pages/equipe/osg/GerarDocumento.test.tsx`), e **ainda não por
conteúdo em produção**. O B15 fica **parcial e declarado**: seleção múltipla entregue, memorial por imóvel
pendente desta migration.

Até lá, o memorial continua sendo o do binding singular, e o contrato de constituição com várias
matrículas continua saindo com um memorial só.

## O que foi deliberadamente NÃO feito aqui

Fiar `itensPorLista.imoveis` a mais lugares do controller, ou sintetizar um memorial por imóvel do lado
da tela, seria escrever texto jurídico em TypeScript: o memorial é redação, e redação vive em bloco.
A escolha foi registrar a lacuna com o desenho fechado, em vez de entregar meia correção calada.
