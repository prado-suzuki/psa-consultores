# A âncora da Auditoria e do Jurídico

`src/lib/ancorasDeArea.test.ts` está **vermelho na `develop`** desde o commit `03332a09`, de
24/09/2026, que transformou em catraca uma regra que vivia num comentário. A catraca nasceu
acusando desvios que já existiam: ela não quebrou nada, revelou.

São três reprovações, em duas asserções:

```
auditoria: âncora é o --area-4, um tom da paleta de pontinhos
juridico:  âncora é o --area-8, um tom da paleta de pontinhos
casa × auditoria: ΔE 8.7, abaixo do piso de 10
```

A âncora é o `--primary` da área, a cor grande que pinta cabeçalho, botão e a primeira série
de gráfico. A regra que a catraca cobra é que ela venha de uma **fonte de identidade da área**,
não de um tom sorteado da paleta categórica, e que duas áreas não caiam perto demais uma da
outra.

## T1 — Decidir a cor, e é decisão dela

Nenhum passo técnico começa antes disto, porque as duas áreas não têm cor de marca escrita em
lugar nenhum. As perguntas são:

1. A Auditoria e o Jurídico **têm** cor própria em alguma peça da PSA (apresentação, papel
   timbrado, site), ou a cor vai nascer aqui?
2. Se vai nascer aqui, ela é escolhida por proximidade com o verde institucional, como a OSG
   fez com o musgo, ou por contraste deliberado, como a Tax fez com o teal?

Sem essa resposta o resto é chute com aparência de método.

## T2 — Medir antes de trocar

O piso é ΔE ≥ 10 entre a âncora de qualquer par de áreas. Hoje a Casa está em `175 84% 25%` e
a Auditoria em `160 44% 32%`, e é esse par que dá 8,7. Ao propor cor nova, meça contra **todas**
as áreas, não só contra a que está reprovando: mexer na Auditoria pode aproximá-la do Jurídico.

O contraste da âncora contra as superfícies também tem piso, e ele já é cobrado por outras
catracas do mesmo arquivo de paleta. Rode a suíte inteira de `src/lib/`, não só este teste.

## T3 — Trocar, e ver o que vem junto

A âncora alimenta mais coisa do que parece. Em `src/index.css`, o `--primary` de área também
resolve `--ring` e `--accent`, e o `--tool-icon` de algumas áreas aponta para ele. Trocar o
valor repinta anel de foco, chip cheio e ícone de ferramenta na área inteira.

## Pronto quando

`bunx vitest run src/lib/ancorasDeArea.test.ts` passa, a suíte `src/lib/` continua verde, e as
duas áreas foram abertas no navegador para confirmar que a cor nova não estragou nada que a
medição não alcança.

## O que esta tarefa não é

Não é a frente dos tokens de superfície entregue em `73379b8a` (`--field` e
`--surface-elevada`). Aquela mexeu em cartão, campo e modal; esta mexe na cor grande. Foi
conferido que as três reprovações são anteriores: restaurando o `index.css` do `HEAD`, sem
nenhuma alteração daquela frente, o teste falha igual.
