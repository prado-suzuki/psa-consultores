# Apresentação da OSG — o gerador

Regras em vigor do gerador da apresentação da OSG: o que cada capítulo mostra, de onde vem cada dado e
quando o gerador avisa. O código traz só a restrição local; o porquê está aqui.

## O que gera e como grava

A Edge Function `gerar-apresentacao` monta três capítulos, cada um num arquivo `.pptx`:

| Capítulo | Deck | Molde no `osg-templates` |
|---|---|---|
| 01 · Organização patrimonial | `patrimonial` | `TEMPLATE_CAP01_PATRIMONIAL.pptx` (abre com capa e sumário) |
| 02 · Organização societária | `societaria` | `TEMPLATE_CAP02_SOCIETARIA.pptx` |
| 04 · Organização sucessória | `sucessoria` | `TEMPLATE_CAP04_SUCESSORIA.pptx` |

O capítulo 03, o planejamento tributário, sai por outra função (`gerar-slides-tributarios`).

Cada deck gerado vira um arquivo em `osg-apresentacoes` e uma linha em `osg_apresentacao`, com versão,
checksum do arquivo e do molde, versão do gerador, os avisos congelados e o snapshot do conteúdo. A
sequência de gravar (validar, versionar, subir, registrar, assinar) é a casca
`_shared/apresentacao/registrar.ts`, compartilhada com o gerador tributário. A apresentação não entra
em `documento_gerado`: aquela tabela alimenta o checklist do cliente.

### Contrato

- Autorização: JWT, papel `team_member` para cima e isolamento por cluster.
- `POST { clienteId, tipos: DeckTipo[], simulacaoIds? }`. O contrato antigo `tipo: 'ambas' | DeckTipo`
  continua aceito, e `ambas` quer dizer só patrimonial e societária.
- `simulacaoIds` só vale para o capítulo 04: o último ato de cada cenário, na ordem dos cenários.
- Resposta: `{ arquivos: [{ tipo, nome, url, apresentacaoId, versao }], erros?, problemas? }`.
  - `erros`: exceção num deck (molde ausente, PPTX inválido, erro de consulta). Aquele deck não vem.
  - `problemas`: o arquivo sai, mas faltando algo. Ver "Avisos".
- Quando nenhum deck sai: `500 { error, detalhes: [{ tipo, message }] }`. O `supabase-js` descarta esse
  corpo, e o hook da tela o lê à parte para mostrar o motivo.
- O capítulo 04 lê com o token de quem pediu: a RLS das tabelas `itcd_*` decide quais simulações a
  pessoa vê. Do navegador vêm só os ids.

## Moldes

- Cada ambiente tem o seu `osg-templates`, e o molde não viaja com o código. Mudar o desenho é dar ao
  molde um nome novo: a função antiga, no outro ambiente, leria o desenho novo.
- O molde com nome novo sobe antes da função que o pede. O código tolera molde sem as páginas novas e
  avisa o que não saiu.
- O gerador acha cada página pelo campo (`{{TOKEN}}`) que só ela tem (`slideDoToken`), e não pela
  posição. O capítulo 04 também confere o número de campos de cada página, para saber se o molde do
  bucket é o certo.
- O `duplicateSlide` põe toda cópia no fim quando não acha a página de origem (a relação traz o `Type`
  antes do `Target`); por isso a página que tem de ficar por último é levada ao fim depois das cópias.
- Os moldes são montados pelos scripts de `docs/OSG modelo/ferramenta/` (fora do git):
  `montar-replica.ts` (CAP01 e CAP02) e `montar-cap04.ts` (CAP04). O contrato dos campos do 04 está em
  `docs/OSG modelo/CONTRATO_molde-cap04.md`.

## Capítulo 01 · Diagnóstico patrimonial

- **Imóveis integralizados**, uma página por sociedade de destino, partida quando passa de 9 linhas
  visuais. Só imóvel rural e urbano, os tipos que podem ter matrícula (`matricula_tipo_bem_check`).
  Colunas:
  - MOM.: 1º momento o que já foi levado a peça registrada, 2º o aprovado que ainda não foi. Sai de
    `status_integralizacao`, porque `movimentacao_quotas.ato_id` e `.sequencia` estão nulos em produção.
  - Titular na matrícula (direito) e de fato, separados pela espécie da titularidade.
  - Área em hectare, venha o cadastro na unidade que vier.
  - Registro: Regular, Pendente (impedimento que trava a transferência ou georreferenciamento que a
    prejudica) ou Sem matrícula.
  - Valor contábil. O TOTAL da sociedade soma a mesma coluna e sai só na última página dela.
- **Outros bens integralizados** (moeda, quotas, arrendamento e "Outros"): uma tabela só, com a
  coluna da sociedade e o TOTAL de valor, 9 bens por página. Sai do arquivo quando não há nenhum. O
  modelo da consultoria não tem esta página; na tabela de imóveis esses bens sairiam sem matrícula,
  município nem área.
- **Imóveis que não integram a estrutura**, com o motivo (`participa_estruturacao = false`). Sai do
  arquivo quando não há nenhum.
- Bem sem sociedade de destino sai em "Sociedade a definir", com aviso.

## Capítulo 02 · Organização societária

- **Organograma** em quatro faixas: sócios (pessoa física e empresa marcada como sócia, SC),
  controladoras (CN), controladas (PR) e atividade rural. Faixa sem ninguém sai sem caixa.
- **Faixa rural e titular da composse** vêm do cadastro de Exploração Rural, porque o organograma é a
  estrutura almejada:
  - na faixa entram o explorador (parceria, arrendamento, comodato) e o compossuidor (composse); o
    administrador nomeado só entra se também for compossuidor;
  - o titular da frase "A composse será titulada de 'X e outros'" é o compossuidor de maior fração; no
    empate, o que também é administrador nomeado; depois, a ordem alfabética;
  - sem cadastro, a faixa sai vazia e o titular sai como "[titular a definir]", com aviso.
- **Quadro societário**: uma tabela por empresa, paginada pela `paginasDoQuadro`, que parte a empresa
  que não cabe.

## Capítulo 04 · Organização sucessória

- **Entrada**: as simulações aprovadas escolhidas na tela. Cada cenário é uma cadeia de atos
  (`origem_simulacao_id`); escolhe-se o último, e os anteriores vêm junto. A tela mostra só a ponta de
  cada cadeia; se a continuação não foi aprovada, a anterior aprovada vale sozinha.
- **Travas** (na tela e repetidas no servidor): simulação e cadeia inteira aprovadas, com nome, uma
  sociedade, até três cenários (as vagas do Resumo dos cenários) e a mesma UPF.
- **UPF**: valor diferente entre os cenários não gera, porque a página Tributação atual tem uma tabela
  da lei só. É erro de preenchimento: a tela trava a peça e pede uma simulação nova na mesma UPF. Meses
  diferentes com a mesma UPF passam.
- **Nome do cenário**: o nome dado à simulação, sem numeral fixo na frente.
- **Nenhum número é recalculado**: base e imposto vêm gravados. A única conta é abrir o imposto
  gravado pelas faixas da lei, em centavos, com o centavo que sobra na faixa de maior resto. Se a soma
  não fechar com o gravado, sai aviso de sistema.
- **A regra do deck validado** (Agro Aliança):
  - a doação sai em 100%, com a nota "base de cálculo em 100%";
  - a página da instituição de usufruto mostra as duas bases lado a lado;
  - o total do Resumo dos cenários soma a instituição em 70% (Cenário I contábil: 225.998,26 de doação
    + 4.298,66 de instituição = 230.296,92).
- **Simulação antiga**, gravada com uma base só: o capítulo usa a que existe e avisa.
- **Gênero vazio**: o texto sai neutro, sem "Sr./Sra." e sem parentesco, e o capítulo avisa quem
  falta. Adivinhar pelo nome erraria calado na frente do cliente.
- **Snapshot**: guarda as simulações de cada cenário com o nome e a versão da época, porque o nome muda
  e líder pode apagar simulação aprovada.
- **Cópias**: a tabela da lei (`_shared/apresentacao-osg/itcmd.ts`) e o extenso, o romano e o nome curto
  (`texto.ts`) são cópias da calculadora e do motor de documentos, porque a Edge Function não alcança o
  `src/`. `src/lib/osg/cenariosDoCapitulo04.test.ts` falha se uma cópia divergir do original.

## Avisos

Cada aviso tem `onde` (a parte do deck) e `tipo`:

| Tipo | Quando | Onde se corrige |
|---|---|---|
| `origem` | falta dado que o cadastro (ou a planilha, no tributário) resolve | no cadastro, antes de gerar de novo |
| `formatacao` | o dado existe e não coube no molde | no PowerPoint |
| `sistema` | falha nossa: molde desatualizado, página que o gerador não montou, conta que não fecha | avisar o suporte da PSA Digital |

- Aviso de dado faltando só existe se o cadastro resolve. O estado real do imóvel (matrícula Pendente,
  impedimento ativo, bem ainda não Aprovado) sai no slide e não vira aviso.
- A tela de Apresentações lista todos os avisos da última geração no quadro "Pontos para conferir",
  agrupados por parte do arquivo; o toast só conta.
- Há registros antigos em `wp_apresentacao.problemas` com `tipo = 'tipo_inesperado'`: quem lê tolera.

## Tela de Apresentações

- A contagem de slides ao lado de cada peça conta slide de conteúdo (capa e divisor não entram) pelas
  regras do gerador: o front importa `_shared/apresentacao-osg/paginacao.ts`, que por isso não pode ter
  import nenhum.
- A paginação do rodapé é o número automático do PowerPoint: cada arquivo numera a si mesmo.
