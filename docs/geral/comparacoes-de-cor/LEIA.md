# Comparações de cor — as que decidiram, renderizadas

Decisões de cor tomadas **olhando**, não por número. Estes são os arquivos que foram olhados —
as duas primeiras de 20–21/08/2026, já decididas; a terceira de 26/08/2026, ainda em aberto.
Abra no navegador (são autocontidos, sem dependência externa além da fonte do Google).

| arquivo | a pergunta | o que foi decidido |
|---|---|---|
| `cinza-de-desligado.html` | o cinza de "desligado" acompanha o tema ou fica neutro em todos? | **acompanha** — com `--status-neutro`, que já existia. Nenhum token novo. |
| `vermelho-de-excluir.html` | o par `destructive` dá 3,62:1; quais saídas passam em 4,5:1? | **opção A**: `--destructive` a `0 84% 48%`. Aplicado em base, tax e rotina. |
| `branco-escrito-a-mao.html` | os 304 tokens sobrescritos à mão: o que muda na tela ao apagar a classe crua? | **em aberto.** Mostra que os 199 de fundo/borda são invisíveis hoje e os 39 de texto são os únicos que aparecem. Duas decisões pendentes: superfície de estado (20) e telas escuras (33). |

## Por que estão no repositório

Nasceram como página publicada, fora do git. Um link que deixa de resolver leva embora a
evidência de uma decisão — e a decisão continuaria escrita em
`docs/geral/decisoes-tema-e-cor.md` sem o que a sustentou. Os valores medidos estão nos dois
lugares; a comparação lado a lado só estava num.

**Os valores dentro deles são de 20/08/2026 e não se atualizam.** Se `--status-neutro` ou
`--destructive` mudarem no `index.css`, estes arquivos passam a mostrar o estado antigo — que é
útil como registro do que foi comparado, e enganoso como referência do que é hoje. A fonte
corrente é sempre o `index.css`.
