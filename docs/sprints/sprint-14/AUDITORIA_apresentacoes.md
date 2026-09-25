# Auditoria de texto — Apresentações (OSG Work)

**Rota:** `/equipe/osg/work/apresentacoes` · **Data:** 21/09/2026 · **Norma:** `docs/geral/texto-explicativo-na-tela.md`

**O teto de 48 linhas da `criar-anexo` não se aplica.** Esta ficha é especificação: uma linha por
controle é o entregável, e cortar linha é cortar escopo.

## Por que esta auditoria saiu diferente

O normal é auditar rota que envelheceu. Esta rota **mudou hoje**: a apresentação passou a ser
gravada e versionada (Fase 3, 21/09/2026), e a mudança fez duas coisas ao texto.

**Criou um texto que engana.** O rodapé dizia que só o planejamento tributário tem histórico. Desde
hoje é falso, e é o achado de maior peso da ficha — quem lê entende o oposto do que o sistema faz.

**Expôs 18 mensagens sem acento.** Elas foram escritas hoje, junto com o `problemas[]`, e nasceram
sem acento porque os arquivos de Edge Function têm comentário sem acento — o texto herdou a
convenção do comentário. Quem lê a tela vê, **no mesmo aviso**, a seção acentuada ao lado da frase
sem acento:

> **Quadro Societário** · *"SAPO HOLDING SEM QUADRO SA" e constituida (CN) e ainda nao tem quadro
> societario gravado*

Fonte do achado: os **13 textos distintos** gravados em `osg_apresentacao.problemas` nas 16 linhas
de 21/09/2026, lidos do banco — não de grep. A dívida é de horas, não de meses.

**Proporção: 28 com intervenção, 12 sem.** Fora do saudável (um terço), e o motivo é este: 18 das
28 são o mesmo defeito de acento, num código de hoje.

## 1 · Aviso de cadastro — as 18 mensagens sem acento

Todas chegam ao consultor no toast depois de gerar, e ficam **congeladas** em
`osg_apresentacao.problemas`. Texto citado por inteiro; `{empresa}` e `{n}` são os valores que
entram na hora. **Célula acima de 120 caracteres nestas linhas, de propósito** — transcrição
truncada trava o item, e foi o que parou dois placeholders na TIP-03.

| # | Texto atual | Ajustar para |
|---|---|---|
| 1 | `"{empresa}" nao entra no quadro societario: esta marcada como socia (SC), nao como sociedade do cliente.` | `"{empresa}" não entra no quadro societário: está marcada como sócia (SC), não como sociedade do cliente.` |
| 2 | `"{empresa}" ficou fora do quadro societario: o campo "tipo de empresa" esta vazio no cadastro (esperado CN ou PR).` | `"{empresa}" ficou fora do quadro societário: o campo "tipo de empresa" está vazio no cadastro (esperado CN ou PR).` |
| 3 | `"{empresa}" ficou fora do quadro societario: "tipo de empresa" tem valor que o gerador nao reconhece (esperado CN ou PR).` | `…do quadro societário: "tipo de empresa" tem valor que o gerador não reconhece (esperado CN ou PR).` |
| 4 | `"{empresa}" e constituida (CN) e o quadro saiu vazio: ha movimentacao de quotas lancada, mas os saldos se anulam.` | `"{empresa}" é constituída (CN) e o quadro saiu vazio: há movimentação de quotas lançada, mas os saldos se anulam.` |
| 5 | `"{empresa}" e constituida (CN) e ainda nao tem quadro societario gravado — nenhuma movimentacao de quotas lancada.` | `"{empresa}" é constituída (CN) e ainda não tem quadro societário gravado — nenhuma movimentação de quotas lançada.` |
| 6 | `"{empresa}" e a integralizar (PR) e o quadro gravado ficou sem linhas apos a apuracao.` | `"{empresa}" é a integralizar (PR) e o quadro gravado ficou sem linhas após a apuração.` |
| 7 | `"{empresa}" e a integralizar (PR) e nao foi possivel derivar o quadro dos bens dela.` | `"{empresa}" é a integralizar (PR) e não foi possível derivar o quadro dos bens dela.` |
| 8 | `"{empresa}" nao aparece no organograma: sem "tipo de empresa" (CN ou PR) nao ha faixa onde posiciona-la.` | `"{empresa}" não aparece no organograma: sem "tipo de empresa" (CN ou PR) não há faixa onde posicioná-la.` |
| 9 | `{n} matricula ficou / matriculas ficaram fora do quadro de "{empresa}": impedimento ativo.` | `{n} matrícula ficou / matrículas ficaram fora do quadro de "{empresa}": impedimento ativo.` |
| 10 | `{n} matricula(s) … fora do quadro de "{empresa}": sem valor contabil na matricula nem no bem.` | `{n} matrícula(s) … fora do quadro de "{empresa}": sem valor contábil na matrícula nem no bem.` |
| 11 | `{n} matricula(s) … fora do quadro de "{empresa}": nenhum titular vinculado.` | `{n} matrícula(s) … fora do quadro de "{empresa}": nenhum titular vinculado.` |
| 12 | `O quadro de "{empresa}" sai com todos os percentuais em "—": o total de quotas apurado e zero.` | `O quadro de "{empresa}" sai com todos os percentuais em "—": o total de quotas apurado é zero.` |
| 13 | `{n} bem esta / bens estao fora da estruturacao e nao entrou/entraram no deck.` | `{n} bem está / bens estão fora da estruturação e não entrou/entraram na apresentação.` |
| 14 | `{n} bem sai / bens saem com matricula "Nao se aplica" — nenhuma matricula vinculada.` | `{n} bem sai / bens saem com matrícula "Não se aplica" — nenhuma matrícula vinculada.` |
| 15 | `{n} bem nao entrou / bens nao entraram no quadro de "{empresa}": status de integralizacao diferente de "Aprovado".` | `{n} bem não entrou / bens não entraram no quadro de "{empresa}": status de integralização diferente de "Aprovado".` |
| 16 | `O titular sai como "[titular da composse — a definir]" — nao ha composse com explorador cadastrado.` | `O titular sai como "[titular da composse — a definir]" — não há composse com explorador cadastrado.` |
| 17 | `{n} empresa foi ignorada / empresas foram ignoradas: sem denominacao no cadastro.` | `{n} empresa foi ignorada / empresas foram ignoradas: sem denominação no cadastro.` |
| 18 | `{n} linha(s) do quadro de "{empresa}" nao aponta para uma pessoa e ficou de fora.` | `{n} linha(s) do quadro de "{empresa}" não aponta para uma pessoa e ficou de fora.` |

**Motivo (vale para as 18):** o mesmo aviso mistura seção acentuada com frase sem acento, e o texto
é do consultor — não é comentário de código, que pode ficar sem acento.

**Como implementar:** string literal em `_shared/apresentacao-osg/regras.ts` (1 a 12),
`_shared/apresentacao-osg/conteudo.ts` (13 a 15) e `gerar-apresentacao/data.ts` (16 a 18). Sem marcação
adicional. **Os testes prendem estas frases** — atualizar junto, no mesmo commit.

**As duas últimas só apareceram na varredura de fechamento**, depois de eu ter dado a lista por
completa: elas moram no `data.ts`, e eu tinha varrido só os dois arquivos de `_shared`. Registrado
porque é o modo de errar desta frente — varredura por arquivo que se julga conhecer, em vez de por
padrão de texto.

**Duas coisas a mais nestas linhas, além do acento:**

- **Item 13 dizia "deck".** O glossário fechou em 18/09/2026: na tela é **Apresentações**, não
  slides nem deck — *"você não está gerando slides, está gerando apresentação"*. Jargão interno
  vazando para o texto do consultor.
- **Item 14 citava a grafia errada do placeholder.** O que vai impresso no `.pptx` é
  `"Não se aplica"` (acentuado, constante `MATRICULA_NAO_SE_APLICA`); o aviso escrevia
  `"Nao se aplica"`. Quem procurasse a expressão no arquivo não acharia. Agora o aviso **interpola
  a constante**, então as duas grafias não podem divergir de novo.

## 2 · A tela e as mensagens de falha

| # | Local · Campo | Texto atual | Ajustar para | Motivo | Como implementar |
|---|---|---|---|---|---|
| 19 | Apresentações → rodapé da tela | `Cada peça marcada baixa o .pptx dela. O histórico dos arquivos do planejamento tributário fica no Gerador de Slides, no Digital Dev.` | `Cada peça marcada baixa o .pptx dela, e a apresentação fica guardada com número de versão. As versões do planejamento tributário se consultam no Gerador de Slides, no Digital Dev.` | **engana desde hoje:** dizia que só o tributário tem histórico, e a apresentação da OSG passou a ser gravada e versionada | `<p className="text-xs text-muted-foreground">` que já existe. Não promete tela de versões da OSG, que ainda não existe |
| 20 | Aviso de falha total → título | `Não consegui gerar as apresentações` | `Não foi possível gerar as apresentações` | primeira pessoa do sistema; a forma canônica de falha é `Não foi possível {ação} {item}` (§4) | `toast({ title })` |
| 21 | Aviso de falha parcial → título | `{x} de {y} apresentações foram geradas` | `{x} de {y} apresentações geradas` | voz passiva; a norma pede voz ativa e ordem direta (regra 2) | idem |
| 22 | Aviso → descrição, 2 ocorrências | `Baixou: {arquivos}.` | `Baixados: {arquivos}.` | verbo em 3ª pessoa sem sujeito — quem baixou? Particípio concorda com os arquivos e não inventa sujeito | idem |
| 23 | Aviso de falha → descrição | `Não veio — {falhas}.` | `Não geradas: {falhas}.` | coloquial, e singular para uma lista | idem |
| 24 | Aviso do tributário → descrição | `{n} ponto(s) para ajustar no PowerPoint.` | `{n} ponto / pontos para ajustar no PowerPoint.` | plural entre parênteses; a própria tela já concorda de verdade em `{n} slide/slides` | idem |
| 25 | Falha do download | `a apresentação ficou guardada, mas o link não foi assinado` | `a apresentação ficou guardada, mas o link para baixar não veio` | "link assinado" é vocabulário de Storage; quem lê não sabe o que é URL assinada, e não precisa saber para agir | `useGerarApresentacao.ts`, fragmento de `errosPorDeck` |
| 26 | Falha: molde ausente (**os dois geradores**) | `O molde "{arquivo}" não está no bucket "{bucket}". Ele não viaja no código: alguém precisa subir o arquivo neste ambiente.` | `O modelo "{arquivo}" não está disponível neste ambiente.` | "bucket" é nome de serviço e "não viaja no código" é explicação de implementação; a instrução de falha de borda é uma só, e a tela já acrescenta "Entre em contato com o suporte da PSA Digital." | `_shared/apresentacao/registrar.ts`. **Muda o texto do gerador tributário também** — é a casca compartilhada, e um vocabulário só é o ponto |
| 27 | Falha: colisão de versão (**os dois**) | `Outra geração desta mesma apresentação estava em andamento e a versão não pôde ser reservada. Tente de novo.` | `Outra geração desta apresentação estava em andamento. Tente de novo.` | "reserva de versão" é mecânica interna; o que a pessoa precisa saber é que houve concorrência e que basta repetir | idem |
| 28 | Aviso de cadastro → abertura | `Confira no cadastro: {dois primeiros pontos}` | mantém | — | ver item 33 |

## 3 · Intervenção: nenhuma — e por quê

Doze controles conferidos contra a árvore (§2) e o padrão por recurso (§3) sem nada a mudar. É
resultado, não omissão.

| # | Local · Campo | Texto | Por que fica |
|---|---|---|---|
| 29 | Estado sem cliente | `Selecione um cliente na barra acima para abrir as apresentações deste cliente.` | forma canônica dos estados vazios do OSG Work; mudar aqui desalinha das telas vizinhas |
| 30 | Checkbox do cabeçalho | `Marcar todas as apresentações` | degrau 0 — controle só de ícone, e o texto **é** o nome. `aria-label` presente |
| 31 | Checkbox de cada peça | o nome da peça | idem; o rótulo já está visível ao lado e o nome acessível repete de propósito (§2) |
| 32 | Cabeçalhos da tabela | `Apresentação` · `Slides` | rótulo de coluna: expressão nominal, sem ponto, abaixo de 30 caracteres |
| 33 | Aviso de cadastro → abertura | `Confira no cadastro: …` | **achado meu, e era falso:** suspeitei de ponto final faltando num dos dois ramos. Cada `detalhe` já termina em ponto, então os dois ramos saem pontuados. Cheguei a aplicar um `.trim()` inútil e desfiz |
| 34 | Rodapé da tabela | `Nada marcado.` | mensagem contextual de estado: frase curta, com ponto |
| 35 | Botão de gerar | `Gerar apresentações` · `Gerando…` | rótulo exposto sem ponto; reticências é `…`. Plural porque cada peça marcada é um arquivo |
| 36 | Coluna Slides, peça sem dado | `sem dados` | é valor de célula, não rótulo. "Zero é informação": some a contagem, não a linha |
| 37 | Subtítulo de cada peça | `Bens, titularidades e matrículas do cadastro patrimonial.` (e as outras duas) | descreve a **origem do dado**, que é o melhor uso do recurso em tabela; as três linhas têm a mesma forma |
| 38 | Placeholders impressos no `.pptx` | `Não se aplica` · `Sociedade a definir` · `[titular da composse — a definir]` | já acentuados, e são texto de **documento do cliente** — régua diferente, fora desta ficha |
| 39 | Falha genérica da conferência | `o servidor não devolveu o arquivo desta apresentação` | fragmento composto pela tela; "servidor" não é nome de tabela, coluna nem código de erro |
| 40 | Título e subtítulo da rota | vêm de `TELAS_OSG_WORK.bibliotecaApresentacoes` | são de outra ficha: o nome da tela é o mesmo no menu, no H1 e no Controle de Acessos, e mudar aqui exige `page_name` junto |

## O que esta ficha NÃO cobre

| Fora | Por quê |
|---|---|
| A lista "já geradas" da OSG | funcionalidade, não texto. Os 16 registros existem e nenhum aparece na tela; é a segunda fatia da Fase 3 |
| O aviso de defasagem | idem. Sem ele, o consultor não sabe que o cadastro andou desde a versão que ele tem na mão |
| A catraca de placeholder (215 → 216) | não é desta rota. Falha idêntica no `develop` sem estes commits, conferido em 21/09/2026 |
| Comentário de código sem acento | o comentário pode ficar; o texto não. Separados na varredura, como manda o glossário |

## Fechamento

**706 testes passando** (159 nos arquivos compartilhados alterados), typecheck 0, ESLint 0 erro, `deno check` limpo nos três arquivos
compartilhados alterados. Os testes que prendiam as 18 frases foram atualizados no mesmo commit —
sem isso, a catraca de string reprovaria a própria correção.

**Relacionado:** [norma](../../geral/texto-explicativo-na-tela.md) ·
[glossário do fluxo OSG](../../../.claude/skills/texto-na-tela/referencias/glossario-osg.md) ·
[AUDITORIA_TIP-02](../sprint-13/AUDITORIA_TIP-02_documentos-do-cliente.md)
