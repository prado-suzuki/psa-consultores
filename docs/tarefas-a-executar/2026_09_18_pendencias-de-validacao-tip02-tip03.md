# Execução TIP-02 e TIP-03 — pendências para validação

Em 18/09/2026, foram executados os ajustes dos anexos
`Ajustes_Solicitacao_e_Checklist_para_Tarefas.md` e
`Ajustes_Demais_Rotas_OSG_Work_para_Tarefas.md` que correspondiam ao código atual.
Esta lista guarda os pontos em que o anexo e a implementação divergiam. Nenhuma
das decisões abaixo foi tomada por inferência.

## TODO de validação

- [ ] **TIP-02, rail de produtos:** decidir se o rail deve passar a mostrar só
  produtos com projeto criado. Hoje ele mostra produtos da área, sem consultar
  `org_projects`. A frase proposta no bloco D.2 afirmaria um recorte que não
  existe. Requer tarefa de comportamento e, depois, nova conferência do texto.
- [ ] **TIP-02, “Trazer para o checklist”:** o balão atual também informa que
  arquivos já recebidos não serão reclassificados. O bloco B manda substituí-lo
  por um texto que omite essa consequência. O mecanismo foi convertido para
  `ButtonTooltip`, preservando a informação. Validar o texto final e o lugar
  dessa consequência antes de encurtá-lo.
- [ ] **TIP-03, placeholders divergentes:** o anexo registra “Selecione o
  i…...” em `FichaFormularios.tsx`, mas o código diz “Selecione o imóvel...”.
  Também registra “Cartório de…...” em `CartorioSelect.tsx`, mas o código diz
  “Cartório de Registro de Imóveis de...”. Ambos ficaram intactos para conferir
  se devem perder a referência específica ao objeto.
- [ ] **TIP-03, nome fiscal em documento:** o catálogo contém
  “GIA / DAR de ITCMD/ITCD” em `documentos/checklistPadrao.ts`. O anexo pede
  ITCMD nos textos da calculadora; este é nome de documento do catálogo, fora
  dela. Confirmar com a área fiscal antes de retirar “ITCD”. Termos internos
  ligados à GIA-ITCD de Mato Grosso também ficaram intactos.
- [ ] **TIP-03, `DiagnosticoPatrimonial.tsx`:** “Diagnóstico Patrimonial” foi
  encontrado apenas em comentário sobre o relatório que manteve esse nome.
  A conferência visual pedida na seção 8 do anexo ainda é necessária antes de
  considerar a rota inteiramente validada.

## Verificação

- `tsc --build --noEmit`, ESLint dirigido e `git diff --check` passaram.
- A catraca de placeholders passou com 216 ocorrências, após nove correções
  medidas neste recorte (antes: 225). A nova catraca para `<Button title>` nos
  sete arquivos da TIP-02 passou com zero.
- A catraca global de `title` nativo estava vermelha por uma ocorrência em
  `governanca/GradeDoProtocolo.tsx:96`. **Consertado em 18/09/2026 (continuação
  da auditoria):** a célula com `line-clamp-3` que usava `title=` nativo foi
  convertida para `ElementTooltip`, e o teste que conferia o atributo `title`
  foi atualizado para a nova realidade. A catraca está verde.
- O teste de `SimulacaoAberta` passou com os rótulos ITCMD.
- A suíte `ChecklistPendentes.test.tsx` antes falhava integralmente pela falta de
  `TooltipProvider` no teste isolado. O provider foi acrescentado e 7 dos 11
  casos passaram. Os quatro restantes procuram nomes acessíveis antigos
  (`Aprovar`, `Recusar`, `Desfazer revisão` e o chip `Aprovado 1`); a tela já
  atribui outros `aria-label` a esses controles. Esta divergência entre teste
  e interface é anterior aos ajustes destes anexos e ficou para revisão própria.

O trabalho local preexistente, inclusive o de Relatórios e Apresentações, foi
preservado. Nada desta execução foi colocado no stage nem commitado.

## Auditoria de 18/09/2026 — o que a medição mostrou

Conferência independente, com a suíte inteira rodada nesta árvore e no HEAD
(`4f512671`) em worktree separada, para separar regressão de estado herdado.

- **Nenhuma regressão de teste.** HEAD: **298 falhas**. Árvore atual: 304. As 17
  que apareciam como novas e as 11 como corrigidas são ruído de execução: os
  nove arquivos delas, rodados em recorte, dão **exatamente 10 falhas nos dois
  lados**. São testes que estouram tempo sob carga paralela (vários acima de
  5.000 ms) e passam em escopo menor — `PessoaModal.test.tsx` passa inteiro
  quando roda sozinho.
- **A suíte já estava vermelha antes desta execução**, com ~42 arquivos
  falhando. Isso é anterior aos dois anexos e maior que eles; a linha acima
  sobre "quatro casos restantes" vale só para `ChecklistPendentes.test.tsx`,
  onde a correção do `TooltipProvider` de fato tirou 8 dos 12 do vermelho.
- **A catraca de `title` nativo foi resolvida.** `GradeDoProtocolo.tsx:96`
  era a última ocorrência — convertido para `ElementTooltip`, e o teste
  ajustado. A catraca está verde.
- **O `button-tooltip.tsx` traz agora o próprio `TooltipProvider`.** A conversão
  dos 126 botões de ícone (tarefa 14) quebrou 235 testes com "`Tooltip` must be
  used within `TooltipProvider`" — testes de unidade montam o componente sem o
  `App`, e o `TooltipProvider` só existia na raiz dele. A CI não acusou porque
  só roda em PR/push para `main` e a conversão viveu na `develop`. Com o provedor
  no próprio componente, as 235 falhas sumiram. A suíte agora tem ~98 falhas,
  todas pré-existentes (timeouts sob carga paralela), zero regressão destes
  anexos.
- **`tsc --build --noEmit`, ESLint dirigido, `git diff --check` e
  `bun run build` (1m 25s) passam.**

### Corrigido na auditoria

- `ex.tmp.ts` — script de varredura descartável ficou na raiz do repositório.
  Removido.
- `ProdutoRail.tsx` — sobrou indentação quebrada onde o balão saiu. A remoção
  do balão está certa e ganhou o comentário que diz por quê: o nome do produto
  está escrito no botão e quebra em linha, não trunca.
- `QualificacaoDasPartes.tsx` — o `aria-describedby` foi pendurado na `div` que
  contém o próprio parágrafo. O padrão (§3) pede o par id + `aria-describedby`
  **no campo** que o texto descreve; em prosa de página não há campo, e na
  `div` o atributo não é anunciado por tecnologia assistiva nenhuma. O
  parágrafo visível ficou; o atributo saiu.
- `itcmdFmt.ts` — cabeçalho ainda dizia "Calculadora de ITCD".
- `GradeDoProtocolo.tsx` — o último `title=` nativo do repositório foi
  convertido para `ElementTooltip`. O teste que conferia o atributo `title`
  foi ajustado para verificar a presença do texto na célula.
- `button-tooltip.tsx` — `ButtonTooltip` e `ElementTooltip` agora trazem o
  próprio `TooltipProvider`, eliminando 235 falhas de teste em ~50 arquivos.
- `GradeDoProtocolo.test.tsx` — atualizado para refletir a remoção do
  `title` nativo.
