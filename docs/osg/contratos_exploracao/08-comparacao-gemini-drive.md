# 08 — Comparação com o mapeamento do Gemini (Drive → Projetos)

Origem: export de uma conversa no recurso "Projetos" do Google Drive (estilo NotebookLM),
rodada sobre uma pasta com todos os drives da OSG, pedindo um dicionário de variáveis +
os dois modelos (Parceria e Composse) com as variáveis aplicadas. Arquivo:
`Exportação do Gemini_ 20 de agosto de 2026 às 09_28_54 AMT.md`.

**Este documento NÃO é fonte da verdade.** `05-modelo-parceria-rural.md` e
`06-modelo-composse-rural.md` são — vieram dos `.docx` oficiais da banca, lidos linha a
linha, cruzados com 2 contratos assinados reais e confirmados em reunião de validação com
a OSG. O Gemini trabalhou só com busca semântica sobre os PDFs/docs da pasta, sem esse
cruzamento — o resultado é plausível mas, como o próprio pedido de análise antecipou,
tem confusões reais. Este arquivo registra a comparação, não substitui nada.

## 1. Diferenças que são só de nome (nenhum gap)

O dicionário do Gemini usa prefixo genérico `parte_*` (`parte_nome`, `parte_documento`,
`parte_rg_nire`, `parte_orgao_uf_junta`...) onde nós temos campos já derivados por papel
(`outorgante.nome`, `explorador.cpf_cnpj`, `mapearPessoa` com `nascido`/`portador`/
`inscrito`/`residente` concordados por gênero). Mesmo dado, nomenclatura diferente — o
Gemini não tinha acesso ao `mapeadores.ts` nem à convenção de `contratosExploracaoModel.ts`,
então generalizou. Sem ação necessária.

## 2. O que o Gemini omitiu ou simplificou (confirma que nosso modelo é mais completo)

O modelo de Parceria do Gemini tem **4 cláusulas** (Objeto, Vigência, Partilha, Foro). O
nosso, transcrito do `.docx` oficial, tem **20**. Isso não é um recorte deliberado do
Gemini — são cláusulas inteiras que não aparecem no resultado dele:

- **Penhor/anuência** (Cláusulas 14ª–17ª da Parceria, Capítulo IV da Composse) — garantia de
  financiamento bancário sobre a produção. Ausente por completo no dicionário e nos dois
  modelos do Gemini.
- **Testemunhas com CPF e RG** — o Gemini só tem "___ PARCEIRO-OUTORGANTE" / "___
  PARCEIROS-OUTORGADOS (BLOCO)", sem nenhuma testemunha. O bloco de assinatura real pede
  nome, CPF e RG de duas testemunhas.
- **Número de vias** — não existe no dicionário do Gemini. O real varia (4 na Parceria, 3
  na Composse) e está na cláusula de encerramento.
- **`imovel.proprietario`** — o Gemini não tem esse campo. É essencial porque o dono do
  imóvel pode ser diferente de quem cede (nosso `[BV-COM]` de referência tem 5 proprietários
  diferentes num único instrumento) — sem ele, o Anexo Único sairia errado.
- **Capital social e administradores da PJ outorgante** — o dicionário do Gemini, pra pessoa
  jurídica, só tem nome/CNPJ/NIRE/sede; a frase de qualificação nem cita representantes
  ("representada conforme seus atos constitutivos", genérico). O template oficial exige
  literalmente capital social integralizado + administradores nomeados.
- **Múltiplas origens distintas na Composse** — o Gemini trata a origem como *um único*
  parágrafo opcional pro instrumento inteiro. O Considerando V real agrupa os imóveis por
  origem em alíneas (a, b, c…), cada uma com seu próprio tipo/data/outorgante — o
  `[BV-COM]` de referência tem 6 origens diferentes para 15 imóveis. O dicionário do Gemini
  também não tem "Exploração própria" nem "Herança" como tipo de origem (só Parceria/
  Arrendamento/Outro) — essas duas vieram da reunião de validação com a OSG, não do texto
  do contrato, então o Gemini não tinha como saber.
- **Regime de administração (Composse)** — o Gemini assume sempre um administrador nomeado
  único, com CPF. O real tem dois regimes (maioria dos percentuais vs. administradores
  nomeados — inclusive mais de um) e nenhuma menção a CPF do administrador na cláusula.
- **Vigência prorrogável / passa a indeterminado** (Parágrafo Segundo da Cláusula Segunda da
  Parceria) — ausente do modelo do Gemini.

## 3. Um ponto em que o Gemini tropeçou em cima de um gap nosso real (ainda aberto)

`{{parceria_tipo_exploracao}}: Agrícola / Pecuária / Mista` não existe assim no template
oficial. Mas **existe uma variável parecida que hoje está fixa no nosso motor, sem campo na
tela**: o próprio `05-modelo-parceria-rural.md` documenta que o título, o caput da Cláusula
Segunda e o título do capítulo de atividades trocam entre "AGROPECUÁRIA" e "AGRÍCOLA"
conforme a exploração — é `naturezaExploracao`/`naturezaExploracaoPlural`, e a tabela de
mapeamento do próprio doc já marcava **"sem campo hoje — proposto"** em 19/08. Hoje
(`contratoRuralContexto.ts`, `montarContextoParceria`) esses dois campos estão
**hard-coded** como `'AGROPECUÁRIA'`/`'AGROPECUÁRIAS'` — nunca lidos do rascunho.

O Gemini errou os valores (não é um enum de 3 — é uma flag binária AGROPECUÁRIA/AGRÍCOLA,
repetida em 3 lugares do texto), mas bateu no mesmo buraco que já sabíamos existir. Vale
priorizar: falta um campo "Natureza da exploração" (2 opções) na aba Dados, ligado a esses
dois campos de contexto que o motor já sabe consumir — não é preciso escrever nenhum bloco
novo.

## 4. Ideias de validação (não de texto do contrato) que valem conferir com jurídico

Duas coisas do Gemini não são campo de variável, são regra de negócio que hoje não
validamos:

- **Vigência mínima de 3 anos.** Isso não é invenção do Gemini — o próprio
  `05-modelo-parceria-rural.md` (linha 119-120) já anota "o template oficial anota a regra
  legal: prazo final não inferior a 3 anos", mas nada no cadastro avisa se alguém digitar
  `dataEncerramento` menos de 3 anos após `dataAssinatura`. Candidato a aviso (mesmo padrão
  do `avisoParaMatricula`), não a mudança de texto.
- **Percentual máximo do outorgante (art. 35, Decreto 59.566/66).** Checado contra o
  contrato assinado real (`docs/notebooklm/exemplo-02-parceria-bela-vista.md`, Cláusula
  Quinta) — ele cita só o art. 96, VI, "a", da Lei 4.504/64 pro percentual (10%/90%), sem
  nenhuma menção a art. 35 ou a limite máximo. **Não aparece na fonte real — descartado,
  não implementado.** Confirma o padrão: o Gemini generaliza da lei sem cruzar com o
  contrato assinado; nem toda citação legal genericamente correta corresponde ao que a
  banca de fato usa.

Uma coisa que o Gemini tem e que é **pior** que o nosso desenho, vale registrar pra não
copiar: ele usa `{{DATA_ATUAL}}` (data de hoje, de quando o documento é gerado) na linha de
assinatura. O nosso usa `{{dataAssinatura}}` (a data que a própria tela captura como "quando
este instrumento é assinado"). Pra um contrato de verdade, a data impressa na assinatura
deveria ser a data de assinatura pretendida/real, não "quando alguém clicou em gerar" — o
nosso approach está certo, o do Gemini geraria a data errada se implementado literalmente.

## 5. Achado meu, não do Gemini — ao reler `06-` pra fazer esta comparação

O Considerando I do template oficial da Composse (linha 45 de `06-modelo-composse-rural.md`)
cita "descritos nas alíneas **'{{imoveis[0].ref}}' à '{{imoveis[-1].ref}}'**, do ANEXO ÚNICO"
— o intervalo de letras (ex.: "a" à "o"). A transcrição em `contratoRuralBlocos.ts`
(bloco `com-preambulo-i-iv`) ficou só com "...descritos no Anexo Único deste instrumento",
sem o intervalo — perdi essa parte ao converter pra `{{ }}` real nesta sessão. É barato
corrigir (precisa só da primeira e da última letra da lista `imoveis`, que o contexto já
tem em mãos) — posso ajustar se quiser.

## 6. Faxina — anotações desatualizadas em `05-`/`06-`

As tabelas "Mapa de variáveis → campos do cadastro" dentro dos dois documentos foram
escritas em 19/08, antes da sessão que fez o mockup completo da ALE-3. Hoje marcam como
"sem campo hoje — proposto" campos que **já existem** no cadastro atual:

- `testemunhas[].cpf`/`.rg` — já existem (`testemunha1Cpf/Rg`, `testemunha2Cpf/Rg`).
- `regraAdministracao`/`administradoresNomeados[]` — já existem.
- `liquidacao.periodicidade`/`.numeroParcelas` — já existem (`liquidacaoPeriodicidade`/
  `liquidacaoNumeroParcelas`).
- `origem.outorgante.nire`/`.capitalSocialNaAssinatura`/`.administradores` — já existem em
  `OrigemExternaDraft`.

Só `naturezaExploracao` (seção 3 acima) continua de fato pendente. Vale atualizar essas duas
tabelas pra não fazer o próximo leitor achar que ainda faltam campos que já foram feitos —
mas o achado de fundo sobre `regraAdministracao` (06-, linhas 295-303: não é um enum de 2
valores, o caso Franciosi tem os dois eixos ao mesmo tempo — quem administra x quem precisa
de maioria) **segue aberto de propósito**, combinado deixar pra conversa com a Aline sobre
governança. O Gemini não tinha como pegar esse ponto — não está no texto do template, só
aparece comparando com um contrato real fora do padrão.

## Conclusão

O documento do Gemini acerta a espinha dorsal (qualificação de partes, imóveis, percentuais,
foro, base legal) mas é uma reconstrução genérica — falta a maior parte das cláusulas reais
da Parceria e a estrutura multi-origem da Composse, que só aparecem lendo o `.docx` oficial
linha a linha (o que já fizemos). Não recomendo usar como insumo pro motor real; os únicos
itens que valem ação são os das seções 3, 4 e 5 acima — o resto é confirmação de que a
transcrição que já temos é mais completa.
