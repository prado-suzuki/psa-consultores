# Comparações de cor — as que decidiram, renderizadas

Decisões de cor tomadas **olhando**, não por número. Estes são os arquivos que foram olhados —
as duas primeiras de 20–21/08/2026 e a do branco em 26/08; a do escuro segue em aberto.
Abra no navegador (são autocontidos, sem dependência externa além da fonte do Google).

| arquivo | a pergunta | o que foi decidido |
|---|---|---|
| `cinza-de-desligado.html` | o cinza de "desligado" acompanha o tema ou fica neutro em todos? | **acompanha** — com `--status-neutro`, que já existia. Nenhum token novo. |
| `vermelho-de-excluir.html` | o par `destructive` dá 3,62:1; quais saídas passam em 4,5:1? | **opção A**: `--destructive` a `0 84% 48%`. Aplicado em base, tax e rotina. |
| `branco-escrito-a-mao.html` | os 304 tokens sobrescritos à mão: o que muda na tela ao apagar a classe crua? | **os 164 `bg-white` saíram** (commit `1ad341a9`, regra em 304 → 140), porque a página mostrou que não muda nada hoje. Seguem em aberto: 39 de texto, 35 de borda, 20 de estado e 33 de superfície escura. |
| `escuro-que-nao-separa.html` | o `.dark` tem fundo, card e popover no mesmo valor; qual escala substitui? | **candidata B** (grafite quente), aplicada no `.dark` em `6901a384`. As três candidatas seguem registradas; HSL em `escuro-candidatas-hsl.txt`. |
| `porta-de-entrada.html` | as 7 telas de entrada na escala B: liso ou gradiente, e qual acento? | **em aberto.** Mostra que o teal da marca reprova como acento no escuro (4,03:1) já hoje, e que `--teal-400` resolve em 8,28:1. Recomendada: fundo liso. |
| `superficie-de-estado.html` | os 22 avisos que sobraram: token de estado por área, ou neutro com o significado no ícone? | **em aberto.** Mostra que os 22 não são um caso só, e sim sete — só 2 deles são estado de tarefa. O `.dark` não declara nenhum `--status-*`, então o token de estado ainda não existe no escuro. Recomendada: token semântico com alfa (`/12` no painel, `/40` na borda, texto em `foreground`). |

## Por que estão no repositório

Nasceram como página publicada, fora do git. Um link que deixa de resolver leva embora a
evidência de uma decisão — e a decisão continuaria escrita em
`docs/geral/decisoes-tema-e-cor.md` sem o que a sustentou. Os valores medidos estão nos dois
lugares; a comparação lado a lado só estava num.

**Os valores dentro deles são de 20/08/2026 e não se atualizam.** Se `--status-neutro` ou
`--destructive` mudarem no `index.css`, estes arquivos passam a mostrar o estado antigo — que é
útil como registro do que foi comparado, e enganoso como referência do que é hoje. A fonte
corrente é sempre o `index.css`.
