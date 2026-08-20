# 09 — Hover-highlight no preview: o que existe de verdade na Oficina de Contratos e o que foi reaproveitado

Pedido: analisar todo o código da Oficina de Contratos real (biblioteca de cláusulas,
montagem de modelo, geração de documento) e reaproveitar o máximo possível no preview do
mockup da ALE-3 — em especial a funcionalidade de passar o mouse sobre o texto gerado e
ver, destacado, de qual campo do cadastro ele veio. Sem tocar em nenhum arquivo da OSG
Work — só leitura/import.

## Achado antes de tudo: o hover-com-nome-de-campo não existe em produção

Levantamento completo de `src/components/equipe/osg/gerar/` (Gerar Documento) e
`src/components/equipe/osg/montagem/` (Montagem de modelo) mostrou que a tela real tem
**duas** interações, nenhuma delas "hover mostra o nome do campo":

1. **Hover no BLOCO inteiro** (`FolhaDocumento.tsx`) — CSS puro (`group-hover`), destaca o
   parágrafo/cláusula inteiro e mostra um chip com o **nome do bloco** ("Qualificação do
   sócio"), não o nome do campo.
2. **Clique num VALOR** (não hover) — só quando aquele trecho tem `origem` de cadastro real
   (setada via `comOrigem()` ao montar o contexto) — abre o modal do registro de origem
   (`PessoaModal`/`BemModal`/`MatriculaModal`). O hover nesse span é só sublinhado + `title`
   nativo genérico ("Abrir o cadastro deste dado"), não o nome do campo.

Ou seja: a peça de dados que permite isso (`Pedaco.caminho`, o caminho do placeholder por
trecho) já existe no motor e é genérica — mas a **UI de hover-tooltip-com-nome-do-campo**
precisou ser construída aqui, não existia pronta pra importar.

## O que foi reaproveitado por IMPORT direto (zero cópia, zero arquivo da OSG Work tocado)

- `segmentarComProveniencia` / `Pedaco` / `SegmentoProveniencia` (`src/lib/templates/
  proveniencia.ts`, via barrel `@/lib/templates`) — função pura que cruza os segmentos do
  render (`SegmentoRender[]`) com as marcas inline (`*negrito*`/`_itálico_`/`~sublinhado~`)
  e com tabelas, produzindo trechos atômicos com proveniência. É a MESMA peça que
  `TextoFormatado.tsx` (o renderer real) usa por dentro — sem essa função eu teria que
  reimplementar o cruzamento de marcas com fronteiras de placeholder, que já é
  cuidadosamente testado (`proveniencia.test.ts`).
- `apararSegmentos` — o `.trim()` que preserva segmentos, evitando perder um valor colado
  na borda do bloco.
- `gerarComposicao`/`BlocoGerado` — já em uso desde a versão anterior deste preview; a
  diferença é que agora o preview PARA de descartar `.segmentos` (antes só usava
  `.conteudo.trim()`, texto plano).

## O que foi MIRADO, não copiado

- **`TextoFormatado.tsx`** (o componente real): não dá pra importar e "ligar o hover" —
  ele só expõe `onClickOrigem`/`origemClicavel` (clique, não hover; exige `origem` real).
  `src/components/equipe/osg/oficina-de-contratos/exploracao-rural/
  TextoComProveniencia.tsx` (novo, deste mockup) replica a MESMA estrutura de render
  (marcas + tabela, mesmas classes visuais `border-slate-300`, `text-sm`, alinhamento) mas
  troca o `<span onClick>` de origem por um `<Tooltip>` (Radix, já usado em `SeloCampo.tsx`)
  acionado por hover em qualquer `Pedaco` com `caminho`.
- **O chip de nome de bloco de `FolhaDocumento.tsx`** (`hover:bg-osg-moss/[0.06]` no bloco
  inteiro): mirado na escala do highlight — usei o token de cor da marca (`osg-highlighter`)
  só que por TRECHO em vez de por bloco, e um popover de rótulo em vez de destaque com
  texto fixo.
- **Clique-abre-cadastro** (`useGerarDocumentoController`'s `abrirCadastroOrigem` + os 3
  `useState` de registro-em-edição): **deliberadamente não implementado**. Reproduzir isso
  aqui abriria os modais reais de Qualificação das Partes/Diagnóstico Patrimonial — que
  gravam no banco — a partir de uma tela exploratória isolada, sem sentido para o
  propósito do mockup (mostrar POSSIBILIDADE de tela, não editar cadastro de verdade).

## Peça nova, própria deste mockup: `contratoRuralRotuloCaminho.ts`

O vocabulário real do motor (`classificarCaminho`, `src/lib/templates/campos.ts` +
`binding.ts`) só resolve papéis já cadastrados (`outorgante`, `imovel`, `socio`,
`administrador`...) — os papéis dos contratos rurais (`explorador`, `compossuidor`,
`testemunha`, `admin` nomeado, `origem.outorgante`) não estão nesse vocabulário, e
estendê-lo seria editar arquivo real da OSG Work. `contratoRuralRotuloCaminho.ts` é o
equivalente próprio — um mapa caminho→rótulo, no mesmo espírito de
`contratoRuralCampoOrigem.ts` (que já existia, fazendo o caminho inverso: campo→trecho).
Testado contra os 86 caminhos distintos que de fato aparecem no texto gerado (fixtures de
Parceria + Composse) — todos resolvidos, nenhum caiu no fallback (caminho cru).

## Limite conhecido

`Pedaco.caminho` só existe em segmentos de VALOR (`{{ campo }}`) — uma seção
(`{{#flag}}…{{/flag}}`) não marca o conteúdo com o caminho da própria flag (ver
`render.ts`). Então o hover aparece nos dados propriamente ditos (nomes, percentuais,
datas, matrículas, NIRE...), não nas flags que só ligam/desligam trechos inteiros
(`permitePenhor`, `vigenciaProrrogavel`, `regraMaioria`...) — que continuam sem hover
próprio, porque não haveria um "trecho" delas pra apontar.
