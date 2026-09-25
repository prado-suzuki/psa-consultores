# As duas cores de área: a da tela e a do pontinho

> Redação da Patrícia, 20/08/2026. Trazida para o repositório em 24/09/2026, depois de uma
> troca de âncora que a regra daqui teria evitado — ela existia só como comentário no
> `paletaDeArea.ts`, e saiu junto com a mudança que devia ter impedido.

## Primeiro: a palavra "área" significa DUAS coisas

Isso é a origem de toda confusão possível aqui, então vale começar por ela.

**1. Área como ambiente de trabalho** — Tax, OSG, Auditoria, Jurídico, e as telas de
sistema. É o que define a cara da TELA INTEIRA. Responde: *"em que ambiente eu estou?"*

**2. Área como unidade da estrutura organizacional** — as linhas de `estrutura_areas`.
É o que aparece como um PONTINHO ao lado do nome numa lista. Responde: *"qual linha é qual?"*

São conjuntos diferentes, e só coincidem no nome de alguns deles.

## As duas paletas, lado a lado

|  | Tema de ambiente | Cor de unidade |
|---|---|---|
| Onde aparece | fundo, botões, a tela toda | um ponto de 12px ao lado do nome |
| Quantas | 5 âncoras (`ANCORAS`) | 8 tons (`--area-1..8`) |
| Quem escolhe | fonte de identidade da área | o sistema, por `proximoIndiceDeCor` |
| Responde | "onde estou trabalhando?" | "qual linha é qual?" |

## De onde vem a cor da tela

**Toda âncora tem fonte externa nomeável.** Não existe âncora escolhida no olho, e é isso
que impede que a próxima pessoa ache um valor feio e o "melhore":

| âncora | fonte |
|---|---|
| `casa` | teal institucional, medido nos pixels da logo e conferido no manual da marca |
| `tax` | a cor do porquinho do `TaxLoader.tsx` |
| `osg` | `--osg-moss`, primitiva do verde musgo já no `index.css` |
| `auditoria` | o documento de identidade da área — que traz também uma segunda cor, mais clara, para preenchimento e gráfico |
| `juridico` | o marinho do branding book do Prado Advogados |

> **Em 24/09/2026 duas âncoras estão fora da própria fonte.** `auditoria` e `juridico`
> receberam `--area-4` e `--area-8` no commit `a43a3b4e`. A correção é do Eduardo e não
> chegou em produção. Os dois testes de `ancorasDeArea.test.ts` reprovam até ela entrar.

## A regra que este documento existe para fixar

**Os `--area-*` nunca são fonte de âncora.** Os oito tons servem ao ponto de 12px ao lado de
um nome escrito: a faixa de luminosidade deles é estreita de propósito (32–42%), eles se
separam só pela matiz, e funcionam *porque o nome está sempre do lado*. Cor que preenche uma
tela inteira responde outra pergunta e não pode sair dali.

Prender o ponto à cor da tela também piora a lista: sobrariam menos tons livres para as
demais unidades, e dois deles ficariam parecidos entre si — porque teal e musgo são vizinhos.
A lista fica pior justamente para ajudar poucos casos.

## O que o teste trava

`src/lib/ancorasDeArea.test.ts`, contra `ANCORAS` e o `index.css` de verdade:

1. **Nenhuma âncora é um `--area-*`.** Comparação exata, sem limiar. É a regra acima.
2. **Duas âncoras não caem a menos de ΔE 10** uma da outra.

O segundo não usa o critério de `SEPARACAO` (20° de matiz **ou** 8 pontos de luminosidade)
porque ele não enxerga croma: `casa × auditoria` reprova nele com as duas âncoras, a certa e
a trocada, e o que separa uma da outra é justamente a saturação. O piso de 10 tem folga curta
— o par mais apertado do conjunto de referência está em 11,6 — e subir dele exigiria mexer
numa âncora que tem fonte externa.

## Como explicar isso em uma frase

> **A cor da tela diz onde você está. O pontinho diz qual linha é qual. São coisas
> diferentes e não precisam combinar.**

## O que a equipe precisa fazer na prática

**Ao criar uma unidade nova no cadastro:** nome e cluster. A cor vem sozinha, pelo primeiro
slot livre. Não crave `color_index` em migration — a escolha manual já foi medida e falhou:
das 10 áreas com cor escolhida a dedo, **sete** ficaram no mesmo verde, o terceiro preset do
seletor.

**Ao ver um pontinho "estranho":** não é bug. Antes de reportar, pergunte se essa cor está ao
lado de um nome. Se sim, ela está fazendo o trabalho dela — ajudar a varrer a lista, não
representar a identidade da unidade.

**Se alguém disser que "a cor do OSG está errada":** provavelmente está olhando o pontinho e
esperando o verde da tela. Vale mostrar as duas coisas lado a lado uma vez.

## Vocabulário sugerido

Como "área" significa duas coisas, vale a equipe usar dois nomes no dia a dia:

- **ambiente** ou **módulo** → Tax, OSG, Auditoria, Jurídico, Sistema (a cara da tela)
- **unidade** ou **área organizacional** → as linhas do cadastro (o pontinho)
