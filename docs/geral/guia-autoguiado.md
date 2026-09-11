# Guia autoguiado (tour) das telas

**Em vigor desde 08/09/2026.** Quem for criar guia para outra área lê isto antes:
as armadilhas abaixo custaram três rodadas de correção na Tax, e nenhuma delas dá
erro no console.

## Onde mora o quê

| Peça | Arquivo |
|---|---|
| Mecânica (provider, espera, filtro de passos) | `src/components/tour/TourProvider.tsx` |
| Contexto e API (`startTour`, `startTourOnce`, `emAndamento`) | `src/components/tour/useTour.ts` |
| Botão `?` | `src/components/tour/TourTrigger.tsx` |
| Tema (cores do tooltip) | `src/components/tour/tourTheme.ts` |
| "Já viu este guia", por módulo | `src/components/tour/tourStorage.ts` |
| Passos da Tax | `src/components/equipe/fiscal/tour/tours.ts` |
| Passos do Digital MAPA | `src/components/equipe/mapa/tour/tours.ts` |

A biblioteca é o `react-joyride` v3, já no `package.json`.

## Para dar guia a uma área nova

1. Escreva os passos num `tours.ts` da área e exporte um `RegistroDeTour`:
   `chave` (prefixo do localStorage, um por módulo), `tours`, `resolve`
   (rota → id) e, se quiser, `opcoes`.
2. Embrulhe o layout da área com `<TourProvider registro={...}>`.
3. Ponha o `<TourTrigger dataTour="help" />` no header, e no de cada modal com
   `dataTour="modal-help"`.
4. Espalhe as âncoras `data-tour="..."` nas telas.
5. Copie o teste de âncoras (`fiscal/tour/tours.test.ts`), que prova que todo
   alvo citado existe.

## As armadilhas, todas medidas no app rodando

**O guia abre antes de a tela existir.** Passo sem âncora é descartado, então
numa tela que demora (o cadastro de cliente leva ~5s carregando) sobra só o
passo final, que aponta o `?`: o guia estreia no último passo e o "Voltar" não
tem para onde ir. O provider hoje espera a âncora do primeiro passo aparecer,
até 10s, e **não gasta a marca de "já viu" enquanto espera**.

**Dentro de `Dialog` do Radix, nenhum botão do guia clica.** O Radix põe
`pointer-events: none` no `body` enquanto o dialog está aberto, e o tooltip vive
num portal fora dele. A regra que devolve o ponteiro só ao tooltip está no fim
do `src/index.css`. O overlay fica inerte de propósito: com ponteiro, um clique
fora do balão fecharia o guia.

**`elemento.click()` não troca aba do Radix,** que ativa no `mousedown`. Guia que
navega sozinho precisa mandar `mousedown` + `mouseup` + `click`, e depois esperar
o alvo do passo aparecer (ver `abrirAbaPara` na Tax) em vez de apostar num tempo
fixo.

**O primeiro passo abre como beacon.** Por padrão o Joyride mostra um ponto
pulsante que só vira tooltip no clique. Para guia que abre sozinho, use
`opcoes: { skipBeacon: true }` no registro.

**Passo que depende de aba fechada precisa de `exige`.** O filtro do provider
olha `exige ?? target`: assim o passo entra pela existência da ABA (sempre na
fita) e não pela do campo, que só monta depois da troca. É também o que faz o
guia sumir inteiro para quem não tem aquela aba, como o sublíder na aba de OS.

**O guia serve leitura e edição.** As âncoras do detalhe devem morar no que
existe nos dois modos (a casca de lista, a linha de leitura), e não no botão de
adicionar. Guia que só funciona editando vira "três passos iguais em todas as
abas" para quem está só consultando.

## Régua da escrita

Uma ideia por passo, no máximo duas linhas. Passo a mais é barato, é um clique
em "Próximo"; passo comprido faz fechar o guia. O porquê de cada regra vive nos
manuais em PDF (`G:\Drives compartilhados\PSA Digital\Manuais`): **o guia aponta,
o manual explica.**

Ao mudar a tela de forma relevante, bumpe a versão da chave em
`tourStorage.ts` para o guia reaparecer para quem já o viu.
