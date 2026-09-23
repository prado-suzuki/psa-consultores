# Dois geradores de .pptx: o que se compartilha e o que se repete

**Status:** Aceita
**Data:** 2026-09-21

## Contexto

A casa tem dois geradores de apresentação. O tributário (`gerar-slides-tributarios`)
nasce de uma planilha importada; o da OSG (`gerar-apresentacao`) nasce do cadastro
digitado nas telas. A tarefa de migração dos slides pedia "um único jeito de gerar
slide na base", tratando os dois como o mesmo problema.

Ao abrir o código, a diferença não estava onde parecia. **No momento da geração os
dois leem TABELA** — o xlsx é uma camada acima, que só existe de um lado. O que
varia de verdade é se a fonte fica parada depois de o deck sair.

## Decisão

Três camadas, com destino diferente cada uma.

| Camada | Destino |
|---|---|
| Ingestão do xlsx (parser, RPC `importar_wp`, `wp_valor`) | **não se compartilha** — só existe no tributário, e não é geração de slide |
| Conteúdo do deck | **replicar**: mesmo arranjo (função pura testada + montagem à parte), código próprio |
| Montagem do XML | **de cada um**: molde fixo de 5 slides contra contagem variável com posicionamento em EMU |
| Primitivas OOXML (`_shared/ooxml/`) | **compartilhado**, e já era |
| Publicação (`_shared/apresentacao/registrar.ts`) | **compartilhado**, extraído em 21/09 |
| Vocabulário de avisos (`_shared/apresentacao/problema.ts`) | **compartilhado** |
| Registro e versionamento | **replicar**: mesmo desenho, duas tabelas |

**Reusar** é um código chamado pelos dois. **Replicar** é o mesmo desenho em código
próprio. A distinção não é estilística: reusar acopla, e só vale onde a regra é
idêntica e vai continuar sendo.

## Justificativa

**Por que a publicação é compartilhada.** Baixar o molde, validar o pacote,
versionar, subir, registrar e assinar URL são a mesma sequência nos dois, e a
ORDEM carrega as decisões — validar antes de escrever, gravar a linha antes do
arquivo (a `UNIQUE` decide quem fica com a versão antes de qualquer byte), desfazer
a linha se o upload falhar. Duplicar isso significa duplicar também os erros: o
gerador tributário tinha uma corrida de versão e um erro de tipo no checksum, e os
dois só apareceram quando o trecho saiu do lugar.

**Por que o conteúdo não é compartilhado.** Os moldes são estruturalmente
diferentes. Unificar `montaDeck`/`montaPptx` com os geradores da OSG significaria
reescrever um dos dois para caber no outro.

**Por que duas tabelas de registro, e não uma.** Treze das catorze colunas de
`wp_apresentacao` descrevem o ARQUIVO — molde, checksum, versão do gerador,
problemas — e valem igual dos dois lados. As três diferenças vêm da fonte:

- âncora `cliente_id` em vez de `importacao_id`;
- `tipo` (`patrimonial` | `societaria`), porque um cliente tem dois decks e cada um
  tem a sua contagem;
- `snapshot_dados`, **que o tributário não precisa**. Lá a FK aponta para uma
  revisão imutável, então o ponteiro já é um retrato, de graça. Aqui aponta para
  cadastro vivo: sem o retrato, um mês depois ninguém explica o que o deck dizia.
  É o mesmo motivo pelo qual `documento_gerado` (minutas, também de cadastro vivo)
  guarda `snapshot_dados` em 41 dos 41 documentos.

Pendurar FK anulável e discriminador numa tabela só poluiria o domínio do papel de
trabalho e quebraria o `ON DELETE CASCADE` dele.

**Por que não `documento_arquivo`.** Aquela é a esteira de documento do cliente, com
`checklist_item_id`, `categoria`, `solicitacao_id` e `triado_em`. Uma apresentação
gravada lá apareceria no checklist do cliente como documento que ele precisa
entregar. A `gerar-apresentacao` já declarava essa fronteira no cabeçalho desde a
primeira versão.

## Consequência

Quem escrever o terceiro gerador chama `registrarApresentacao` e ganha versionamento,
checksum, validação e registro sem reimplementar nada — mas escreve o próprio
conteúdo, a própria montagem e a própria tabela de registro.

A corrida de versão é resolvida por concorrência otimista (insert primeiro, repete
na colisão), não por trava. Para o volume real — alguém clica "gerar" — isso basta
e é mais simples que uma RPC com `for update`. Se a contenção deixar de ser rara,
a RPC volta à mesa.

**A conferência dos decks vive fora do repositório**, por decisão de 21/09: são
24 MB de `.pptx` que a própria ferramenta regera. Ela compara texto e geometria de
cada slide contra um baseline e falha se algo divergir — foi o que permitiu mexer
no gerador tributário com segurança. Para reconstruí-la:

1. gerar os decks de alguns clientes do sandbox chamando as duas edge functions;
2. extrair de cada `.pptx` os runs de texto e as posições de shape, normalizando a
   data de geração (ela muda a cada rodada);
3. gravar isso como baseline e comparar a cada alteração.

Sem ela, mudança em `_shared/ooxml/` ou em `_shared/apresentacao/` vaza de um gerador para
o outro sem ninguém notar.

**O deck do vizinho sai da conferência quando ele estiver em obra.** O baseline do
tributário provou, no dia da extração, que a casca não mudou a saída dele — e parou
de servir no dia seguinte, quando o Eduardo começou a trocar o molde e o código que
escreve o slide. A partir dali o deck muda todo dia, de propósito, e comparar deck
inteiro acusaria o trabalho dele como regressão nossa. Pior: gerar o deck dele
GRAVA, e em um dia a conferência empilhou 18 versões na revisão de teste que ele
usa. O código compartilhado passou a ser guardado pelo hash dos módulos OOXML e
pelos testes de unidade da casca — mais precisos, e sem escrever no domínio alheio.

**Um aviso sobre o que o baseline NÃO prova.** Ele pega regressão — "o deck mudou" —
e não correção. Em 21/09 o baseline do quadro societário foi gravado sobre uma saída
que já estava truncada: a paginação não sabia partir uma empresa entre páginas, então
uma holding com 42 sócios era adiada indefinidamente e caía fora, e o teto de 20
voltas do laço escondia isso produzindo slides vazios. Eram 17 de 41 sócios no deck.
Ao gravar um baseline, confira o conteúdo contra a fonte pelo menos uma vez; depois
disso ele defende sozinho.
