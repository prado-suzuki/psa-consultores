# Comparações de cor — as que decidiram, renderizadas

Decisões de cor tomadas **olhando**, não por número. Estes são os arquivos que foram olhados —
as duas primeiras de 20–21/08/2026, a do branco em 26/08 e a da linha e do cartão em 10/09;
a do escuro, a do vermelho e do verde e a do azul (11/09) seguem em aberto.
Abra no navegador (são autocontidos, sem dependência externa além da fonte do Google).

| arquivo | a pergunta | o que foi decidido |
|---|---|---|
| `cinza-de-desligado.html` | o cinza de "desligado" acompanha o tema ou fica neutro em todos? | **acompanha** — com `--status-neutro`, que já existia. Nenhum token novo. |
| `vermelho-de-excluir.html` | o par `destructive` dá 3,62:1; quais saídas passam em 4,5:1? | **opção A**: `--destructive` a `0 84% 48%`. Aplicado em base, tax e rotina. |
| `branco-escrito-a-mao.html` | os 304 tokens sobrescritos à mão: o que muda na tela ao apagar a classe crua? | **os 164 `bg-white` saíram** (commit `1ad341a9`, regra em 304 → 140), porque a página mostrou que não muda nada hoje. Seguem em aberto: 39 de texto, 35 de borda, 20 de estado e 33 de superfície escura. |
| `escuro-que-nao-separa.html` | o `.dark` tem fundo, card e popover no mesmo valor; qual escala substitui? | **candidata B** (grafite quente), aplicada no `.dark` em `6901a384`. As três candidatas seguem registradas; HSL em `escuro-candidatas-hsl.txt`. |
| `porta-de-entrada.html` | as 7 telas de entrada na escala B: liso ou gradiente, e qual acento? | **em aberto.** Mostra que o teal da marca reprova como acento no escuro (4,03:1) já hoje, e que `--teal-400` resolve em 8,28:1. Recomendada: fundo liso. |
| `superficie-de-estado.html` | os 22 avisos que sobraram: token de estado por área, ou neutro com o significado no ícone? | **em aberto.** Mostra que os 22 não são um caso só, e sim sete — só 2 deles são estado de tarefa. O `.dark` não declara nenhum `--status-*`, então o token de estado ainda não existe no escuro. Recomendada: token semântico com alfa (`/12` no painel, `/40` na borda, texto em `foreground`). |
| `texto-do-meio-da-escala.html` | os 191 `text-slate-700` que sobraram: `foreground` ou `muted-foreground`? | **`text-foreground`**, decidido olhando a página. A mecânica já eliminava o `muted-foreground`: 8 dos 191 são o *hover* de um `muted-foreground` e morreriam nessa direção, e não há nenhum caso do inverso. O olho confirmou que o quase-preto não pesa demais no parágrafo. |
| `linha-e-cartao.html` | as duas superfícies que sobraram à mão: quanta cor a LINHA carrega, e quanto o CARTÃO levanta da página | **opção D**, decidida em 10/09/2026. As três primeiras discutiam 2 pontos de saturação dentro de uma faixa de 4 pontos de luminosidade — por isso nenhuma mudava nada. D **abre a faixa**: a página desce para 93%, e aí o degrau cartão↔página (1,153–1,164:1) faz sozinho o que a linha de hoje faz (1,157–1,193:1). A linha se separa por TRABALHO — `--border` para tabela, `--border-control` a 3:1 para campo —, o que paga a dívida da WCAG 1.4.11 sem escurecer toda linha do produto. |
| `vermelho-e-verde-o-que-cada-um-diz.html` | as 248 cruas de `red` e `emerald`: qual delas é papel, e qual não é status nenhum | **170 decididas em 11/09/2026, 78 em aberto.** Saíram por olhada: ação destrutiva e erro em `destructive`, `feito`, marcador na âncora, o selo do monofásico em `--tag-a`, e o "Limpar filtros" virando um botão só que carrega a contagem. **A página foi reescrita e agora só tem o que falta decidir** — as renderizações do que já saiu ficam no histórico do arquivo (`git log -p`), e o porquê de cada uma na mensagem do commit. As quatro perguntas abertas: levar `green`/`rose` junto (20 sítios em escada meio crua), a escala de prioridade (que tem **verde valendo "Alta"** e dois rótulos "Alta" no mesmo arquivo), os quatro degraus sem papel (roxo, azul, violeta, e o mapa de nove línguas do PER) e o gradiente do Audit. |
| `o-azul-de-tres-empregos.html` | as 100 cruas de `blue`: qual delas é papel, qual é categoria, e qual não é cor nenhuma | **em aberto — quatro escolhas A/B, uma por tela.** Cada candidato aparece dentro da linha, da barra ou do cartão de verdade, e os que são estado aparecem nos dois estados. O que sustenta as quatro perguntas: o azul é a **única família com três casas legítimas no contrato** — `fila` (papel, já azul), `tag-b` (o frio da área) e `info` (semântico que **não** acompanha a área); "converter o azul" são seis decisões, não uma. As outras 57 ocorrências não têm decisão dentro (mapa com dono, bloco copiado, *hover*). Mede dois contrastes que ninguém tinha medido: `blue-600` sobre `blue-500/15` no selo do `BalanceteTreeTable` dá **4,35:1**, e — pior, porque é token e passa por certo em revisão — `info` sobre `info/10` no `taskPriorityColors.medium` dá **4,49:1**. Os dois reprovam AA. |

## Por que estão no repositório

Nasceram como página publicada, fora do git. Um link que deixa de resolver leva embora a
evidência de uma decisão — e a decisão continuaria escrita em
`docs/geral/decisoes-tema-e-cor.md` sem o que a sustentou. Os valores medidos estão nos dois
lugares; a comparação lado a lado só estava num.

**Os valores dentro deles são de 20/08/2026 e não se atualizam.** Se `--status-neutro` ou
`--destructive` mudarem no `index.css`, estes arquivos passam a mostrar o estado antigo — que é
útil como registro do que foi comparado, e enganoso como referência do que é hoje. A fonte
corrente é sempre o `index.css`.
