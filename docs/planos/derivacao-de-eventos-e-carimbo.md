# Plano: consertar a derivação de eventos e o carimbo

**Branch:** `feat/alteracao-contratual-caminho-b`
**Data:** 27/08/2026
**Origem:** a corrida assistida completa do ensaio da reorganização societária
(as duas empresas, na ordem do caso MMS), rodada no app contra o sandbox em
26/08/2026. Ela achou cinco defeitos e produziu as decisões da seção 3.
**Continua:** [`ledger-societario-e-alteracao-derivada.md`](./ledger-societario-e-alteracao-derivada.md),
cuja Frente 6 é o ensaio que achou tudo isto.
**Roteiro do ensaio:** [`../osg/ensaio-reorganizacao-societaria.md`](../osg/ensaio-reorganizacao-societaria.md).

---

## 1. O diagnóstico, em uma frase

A derivação de eventos pergunta ao **ledger** duas coisas que ele não sabe
responder: "qual era o estado antes desta peça" (isso é do snapshot da peça
anterior) e, por não ter o carimbo completo, "quais movimentos já foram
contados". Do primeiro erro nasce evento que não aconteceu; do segundo, evento
contado duas vezes.

---

## 2. Os cinco defeitos

Ordenados por gravidade, não pela ordem em que apareceram. O 1 já está corrigido.

### Defeito 1: a alteração do modelo (Agro) morre inteira. CORRIGIDO

**Sintoma:** `Placeholder não resolvido: {{refs.capital_social}}`, e a folha
inteira em erro. Valia para qualquer cenário, não só o cliente de teste.

**Causa:** as quatro resoluções semeadas citam `{{ refs.capital_social }}`, e a
migration `20260826143800` só pôs a âncora `capital_social` no PAR de blocos
"Capital social integralizado em moeda corrente", que é a redação do modelo
(Participações). O (Agro) usa `Capital Social - Agro` (integraliza imóveis), que
ficou sem âncora. Âncora que ninguém publica não existe no contexto, e
`render.ts` trata placeholder não resolvido como erro de composição.

**Auditoria feita antes de corrigir**, por modelo e por âncora, contando quem
cita e quem publica: no (Agro), `capital_social` tinha 4 citações e 0
publicações; `sede_social` e `administracao_social` publicavam duas cada, nos
dois modelos. Era o único caso.

**Correção:** migration `20260827093000_ancora_capital_social_no_modelo_agro.sql`,
um `UPDATE` com guarda `IS DISTINCT FROM`. Aplicada no sandbox por
`db query -f` (não registrada no ledger de migrations, ver a seção 5).

**Conferido no app rodando:** a folha compõe, `{{ refs.capital_social }}`
resolve para "Cláusula Quinta" nas três citações, nenhum placeholder cru sobra, e
a cessão saiu nomeando as partes.

**Pendente, e a migration não trata:** o bloco do (Agro) está no futuro ("o
capital social da empresa **será** de"), que é redação de constituição. Na
consolidação de uma alteração devia ser presente, como o par do (Participações)
faz desde a Frente C (`20260826143600`). Corrigir pede o gêmeo de consolidação
do bloco do (Agro).

### Defeito 2: a integralização da controladora rende vazia

**Sintoma:** na peça da controladora, "Integralizam-se as quotas subscritas, nos
termos e pelos valores abaixo:" e nenhuma alínea. A palavra "Farroupilha" não
aparece na peça inteira: sem qualificação da PJ de origem, sem citação de
tramitação conjunta.

**Causa:** `mapearIntegralizacoes` (`src/lib/templates/mapeadores.ts`) monta um
item por sócio, mas o laço abre perguntando de quais **matrículas** aquele sócio
é titular e faz `continue` quando não há nenhuma (linha ~929). Na controladora os
sócios não têm matrícula: o aporte deles foi pago com **quotas** da proprietária.
Os dois são pulados, a lista volta vazia, o bloco é descartado por falta de dado.
`montarAportesDoSocio` está logo abaixo do `continue` e nunca é alcançado.

A guarda é do tempo em que o único aporte possível era em imóvel. Quando a
Frente 2 acrescentou `{{#aportes}}`, cuidou-se do caminho "sem ledger, cai nos
imóveis" e não do inverso, **aporte sem imóvel**.

**Custo:** é metade do item 3 da Frente 6. A cláusula que qualifica a PJ de
origem existe, escrita e testada; ela só não recebe item.

**Piora com a decisão D6** (status do bem virando para 'Integralizado'): hoje só
a controladora sofre, depois disso a proprietária sofre também numa segunda AC,
porque os imóveis dela sairão da lista de aprovados. É por isso que este defeito
vem primeiro.

### Defeito 3: a derivação conta a partir de zero

**Sintomas, os três do mesmo defeito:**

- "aumento de capital de **R$ 0,00** para R$ 1.171.800,00", nas duas empresas;
- "**2 ingresso(s)**" numa empresa onde ninguém ingressou, e "1 ingresso(s)" na
  proprietária, sem as duas retiradas que de fato houve;
- "**6 aporte(s)**" quando a subida lançou 2 (os outros 4 são a constituição, que
  o contrato social já contou).

**Causa:** `derivarEventosDaAlteracao` (`src/lib/osg/eventosDaAlteracao.ts`)
divide os movimentos em `formalizados` (os que já têm `documento_gerado_id`) e
`pendentes`, e usa `formalizados` como o "antes". Mas **validar um contrato social
não carimba nada**: o carimbo só roda quando há alteração em curso. Então os
movimentos de constituição nunca entram em `formalizados`, e o "antes" de toda
primeira alteração é o conjunto vazio.

A cláusula na folha escapa porque usa outro caminho,
`calcularHistoricoCapital` (`src/lib/templates/historicoCapital.ts`), que lê o
capital do **snapshot** do documento substituído.

**Custo:** é o único defeito que fabrica evento que não aconteceu. Foi ele que
ligou "houve aumento do capital social" na proprietária, onde o capital não
mudou.

### Defeito 4: a UI valida e sela peça que não renderiza

**Sintoma:** com a folha em erro de composição, "Validar versão" gravou o
documento, congelou o snapshot e carimbou o ledger. O ato passou a "Formalizado
em documento" apontando um documento que não existe como texto.

**Causa:** não há porteiro. `documentoCompleto`
(`src/hooks/useGerarDocumentoController.ts`) guarda **só o download** (o diálogo
"Baixar documento incompleto?"). O `validar` não olha `resultado.erro`.

**Custo:** produz dano permanente a partir de um erro visível na tela. O carimbo
é irreversível pela UI: movimento com documento sai da lista de pendentes para
sempre.

### Defeito 5: não há como reabrir o assistente depois de validar

**Sintoma:** validada a alteração, "Rever os eventos" desaparece do rail. Sobram
"Atualizar versão", "Atualizar do cadastro", "Registrar na junta", "Baixar
.docx", "Copiar texto".

**Causa:** o botão vive dentro do ramo `alteracaoEmCurso` de
`DocumentoCentroRail.tsx` (linha ~131), e `alteracaoEmCurso` exige que a folha na
tela seja a de um documento **registrado** com respostas penduradas. Validada a
alteração, a head passa a ser ela, em rascunho: a condição cai.

**Custo:** o menor dos cinco. Não perde dado e não corrompe peça. Impede provar a
idempotência pelo caminho natural, e foi por isso que a demo passou a provar o
carimbo pelo cartão de atos.

### O que NÃO é defeito, e parecia

Na alteração da proprietária a resolução de aumento aparece no painel como
`Resolução: aumento do capital social: ele saiu em branco`. **Está certo.** O
bloco é condicional desde a migration `20260826154321`
(`{{#sociedade.houveAumentoCapital}}`, changelog "a resolução só entra quando
houve aumento de fato"), e o capital da proprietária não mudou: mudou de quem são
as quotas. O snapshot grava `capitalDelta: "0,00"`, e a cláusula se recusa a
dizer que o capital aumentou zero. Quem está errado é o interruptor que chegou
ligado, e isso é o defeito 3.

---

## 3. Decisões fechadas nesta conversa

### D1. A ordem do ensaio: contratos sociais ANTES do macro

O `capitalAnterior` da resolução de aumento sai do snapshot do documento que a
peça substitui (`calcularHistoricoCapital`), não do ledger. Contrato social
registrado **depois** do macro já traz no snapshot o capital de depois da subida,
e o delta sai zero. A ordem é: gravar o quadro de constituição, registrar o
contrato social das DUAS empresas, rodar o macro, gerar as duas alterações (a da
proprietária primeiro, porque é ela que a peça da controladora cita).

Já refletida na demo e no roteiro do ensaio.

### D2. Baseline de ESTADO: sai do snapshot da peça registrada, não do ledger

Capital anterior e quadro anterior passam a vir do snapshot do documento
registrado (`snapshot_dados.selecao.sociedade.capitalValor` e
`snapshot_dados.itensPorLista.socios`), e não da projeção dos movimentos
formalizados.

**Por quê:** o snapshot é o que a peça **publicou na junta**; o `formalizado` do
ledger é só um proxy de "já foi contado". Quando os dois divergem, quem produziu
efeito foi a peça.

**Resolve** dois dos três sintomas do defeito 3: o capital anterior e o
ingresso/retirada.

**Pedra conhecida:** o snapshot **não congela o `pessoa.id`**. `mapearPessoa`
(converte a linha de `pessoa` nos campos do vocabulário) emite nome, CPF/CNPJ,
quotas e o resto, nunca o id. Então o diff de quadro tem de casar por
`cpfCnpj`. Dentro de um mesmo quadro isso serve (ninguém é sócio duas vezes da
mesma empresa), mas quebra em linha de titular sem pessoa cadastrada, onde o CPF
vem vazio. Passar a congelar o id no snapshot é bom para o futuro e não ajuda os
documentos já selados, então o casamento por CPF/CNPJ vai ter de existir de
qualquer forma como caminho de compatibilidade.

### D3. Baseline de MOVIMENTO: continua sendo o carimbo, estendido ao contrato social

"Quais aportes e cessões são novos" não se responde por estado: dois aportes de
500 e um de 1.000 produzem o mesmo quadro, e a cláusula precisa enumerar
lançamentos. O snapshot congela o que foi **renderizado** (as alíneas prontas),
nunca os ids das linhas do livro, então casar snapshot com livro seria casar por
descrição de imóvel e nome de pessoa.

Logo: a informação mora no lado do movimento, e o instrumento é
`movimentacao_quotas.documento_gerado_id`, cuja descrição no banco já diz "o ato
que formalizou o movimento, quando existe". **O contrato social passa a carimbar
também**, porque ele conta os aportes de constituição na cláusula de capital.

**Rejeitado:** janela temporal `created_at > snapshot_validado_em`. Ela confunde
*quando o lançamento foi digitado* com *quando o fato aconteceu* (o livro tem
`data_movimento` justamente porque divergem), e só sabe "depois da última peça",
não "contado por qual peça", o que embaralha numa cadeia de três instrumentos.

### D4. O gatilho das duas marcas é "Registrar na junta", não "Validar versão"

Hoje o carimbo roda no validar (`useCarimbarMovimentosFormalizados`). Passa para
o registro, que é quando o ato produz efeito e é o único gesto irreversível de
propósito. Carimbo e status do bem disparam no **mesmo gesto**, para não poderem
divergir.

### D5. Ao registrar, o bem vai de 'Aprovado' para 'Integralizado'

Isso **responde a decisão pendente** documentada no topo de
`src/lib/osg/statusIntegralizacao.ts` (fonte única dos status do bem e de quais
levam o bem ao documento): `'Integralizado'` fica **FORA** de
`STATUS_ELEGIVEIS_PARA_INTEGRALIZACAO`, e a exclusão passa a ser automática
porque o flip acontece no registro. Nenhuma query precisa mudar: é a regra de
manutenção daquele arquivo.

### D6. A chave do flip é o `bem_id` dos movimentos carimbados

Não "todos os bens aprovados da empresa". Duas razões:

- **O caso da AC que acrescenta imóveis funciona sem caso especial.** Imóveis
  novos entram como aportes novos, a AC os descreve, registrar carimba esses
  aportes e vira o status só deles. Os antigos já estão 'Integralizado' e nem
  aparecem. Não existe "novo" nem "antigo" em lugar nenhum do código: a chave é o
  que a peça contou.
- **Evita um buraco real.** `calcularCapitalSociedade` permite gerar contrato de
  PR **sem** gravar o quadro, derivando o capital das integralizações. Nesse
  caminho não existe movimento nenhum, e um flip por "aprovados da empresa"
  deixaria a PR sem quadro e sem integralizações, com capital zero na próxima
  leitura. Com a chave no ledger, sem movimento nada vira.

### D7. Status do bem e carimbo são complementares, não redundantes

`mapearIntegralizacoes` recebe DUAS listas: as matrículas aprovadas (lado do
**cadastro**, controlado pelo status do bem) e os aportes do livro sem documento
(lado do **livro**, controlado pelo carimbo). Mexer só em um deixa o outro
repetindo. E o assistente lê exclusivamente o livro, então quem conserta o
"6 aporte(s)" é o carimbo, não o status.

### D8. Ordem de ataque

```
  Defeito 2  (a guarda do `continue` em mapearIntegralizacoes)
      │       devolve a cláusula que fecha o item 3 da Frente 6, e piora se ficar
      ▼       para depois de D5
  Defeito 4  (o porteiro do validar/registrar)
      │       para o sangramento antes de dobrarem as marcas irreversíveis
      ▼
  Defeito 3 + D2 + D3 + D4 + D5 + D6   uma frente só
      │       as duas marcas têm de nascer no mesmo gesto
      ▼
  Defeito 5  (entra em qualquer momento)
```

---

## 4. Onde estão as provas

| | |
| --- | --- |
| Relatório da corrida assistida, com os textos literais e a comparação cláusula por cláusula com os quatro instrumentos reais | `e2e/dados/ensaio-reorg-frente6.json` |
| Screenshots daquela corrida | `.playwright-mcp/reorg-p*.png` |
| Demo que se dirige sozinha, na ordem da D1 | `e2e/demos/ac-reorganizacao-societaria.mjs` |
| Roteiro dela, com o que é defeito e o que é esperado | `docs/osg/ensaio-reorganizacao-societaria.md` |

A demo já sabe acusar os defeitos em vez de morrer neles, e já sabe **não**
acusar o silêncio correto da cláusula de aumento (compara o capital publicado
pela alteração com o do contrato antes de reclamar).

---

## 5. Estado do sandbox e do ledger de migrations

**O cenário do ensaio está pós-carimbo.** Reaplicar só a migration de seed
`20260826215500` **não** devolve o cenário, porque ela apaga apenas movimento sem
`documento_gerado_id`. O caminho completo está na seção 7 do roteiro do ensaio:
soltar o carimbo, apagar `documento_gerado`, apagar `ato_societario`, e então
reaplicar o seed. É comando de operador.

**O `supabase db push` está quebrado**, com duas versões remotas sem arquivo
local: `20260827135312` e `20260827135718`, aplicadas em 27/08/2026 pelo lado do
Lovable. A migration `20260827093000` deste plano foi aplicada por
`db query --linked -f` e **não** foi registrada no ledger: registrar não
devolveria o push, e mexer no histórico de migrations é decisão a tomar, não
efeito colateral. Ver [[drift-sandbox-vs-lovable-25-08]].

---

## 6. Perguntas abertas

- ~~O gêmeo de consolidação do bloco de capital do (Agro)~~ **RESPONDIDA**: bloco
  novo com o par de flags, como o (Participações) faz. Feito na seção 7, etapa 5.
- Passar a congelar o `pessoa.id` no snapshot (ver a pedra da D2): vale a
  migration de formato de snapshot, ou o casamento por CPF/CNPJ basta para
  sempre?
- Na consolidação do (Agro), a cláusula de capital deve enumerar TODOS os bens do
  capital ou só os que esta peça está integralizando? A lista
  `{{#integralizacoes}}` monta o que a peça conta, e com a D5 os bens de atos
  anteriores saem dela. Nasceu na etapa 5 e é decisão de redação, do consultor.

---

## 7. Execução (27/08/2026)

Feita na ordem da D8, nesta branch. Cada etapa é um commit.

### Etapa 1 — defeito 2: o aporte sem imóvel rende alínea

`mapearIntegralizacoes` (`src/lib/templates/mapeadores.ts`) passa a aceitar o sócio
que entra pelo LIVRO, e não só por matrícula: a guarda virou
`doSocio.length === 0 && aportesDoSocio.length === 0`. O sócio sem matrícula sai
com `{{#imoveis}}` vazia e `{{#aportes}}` cheia, e `montarAportesDoSocio` já sabia
qualificar a PJ de origem. Testes novos em `mapeadores.test.ts`: o aporte pago em
quotas rende alínea com a origem qualificada, e o sócio sem imóvel não desloca a
ordem de quem tem.

### Etapa 2 — defeito 4: o porteiro

A guarda mora na função, porque `validarVersao` é o funil de `confirmarValidacao`,
`confirmarNovaVersao`, `confirmarValidacaoEAbrirBloco` e do re-congelamento:
`resultado.erro` faz `validarVersao` e `confirmarRegistro` devolverem cedo com
toast. `motivoDeBloqueio` sai do controller para o rail, que desabilita os dois
botões (os DOIS "Validar versão": o da alteração e o do documento comum) e explica
na tooltip. O download não mudou: pendência de placeholder continua com o diálogo
"Baixar documento incompleto?", e folha em erro não tem blocos para baixar.

Pendência de placeholder **não** bloqueia validar — rascunho incompleto é caminho
legítimo, e um teste trava isso para ninguém "endurecer" o porteiro por engano.

### Etapa 3 — defeito 3 + D2..D6

**Baseline de estado** (`src/lib/osg/baselineDaPeca.ts`, novo): lê do
`snapshot_dados` da peça registrada o capital (`selecao.sociedade.capitalValor`,
reusando `numeroDeValorBR` de `historicoCapital.ts`) e os sócios por CPF/CNPJ
(`itensPorLista.socios[].socio.cpfCnpj`). Quadro com QUALQUER linha sem documento
devolve `null`: baseline pela metade não é baseline.

`derivarEventosDaAlteracao` recebe `baseline` e `cpfCnpjPorPessoaId`. O capital
anterior vem do snapshot (caindo para a projeção dos formalizados só quando não há
snapshot); o diff de quadro casa por CPF/CNPJ e, sem poder casar, **não deriva** o
evento — o consultor liga na mão. Inventar ingresso é pior que calar.

**As duas marcas migraram para o registro.**
`useCarimbarMovimentosFormalizados` virou `useFormalizarMovimentos`: uma mutation
que carimba `documento_gerado_id` (agora com `.select('id, bem_id')`) e, pelos
`bem_id` das linhas efetivamente carimbadas, vira o status para 'Integralizado' —
só a partir de um status ainda elegível, para não sobrescrever um 'Recusado'
deliberado. Sai de `validarVersao` e entra em `confirmarRegistro`, escolhendo os
movimentos por qual peça é: alteração = eventos confirmados; contrato social =
todos os pendentes (a extensão da D3, que é o que conserta o "6 aporte(s)").

`statusIntegralizacao.ts` deixou de dizer "pendente de decisão do time" e registra
a D5. Nenhuma query mudou.

Testes: `baselineDaPeca.test.ts` (novo), quatro casos novos em
`eventosDaAlteracao.test.ts`, `useEventosDaAlteracao.formalizar.test.tsx` (novo,
trava o SQL das duas marcas) e três casos em `GerarDocumento.test.tsx` (validar
não carimba; registrar contrato social carimba todos os pendentes; registrar
alteração carimba só os confirmados). O livro de movimentos entrou no harness
daquela suíte por mock de módulo, porque o `useQuery` global dela devolve sempre as
flags manuais.

### Etapa 4 — defeito 5: reabrir o assistente

`podeReverEventos` = há respostas ancoradas numa base, existe `documentoBaseId`, e
a head não está registrada. `confirmarAlteracao` passou a usar `documentoBaseId` em
vez de exigir o registrado em cena. No rail, "Rever os eventos" virou um elemento
só, renderizado no ramo da alteração em curso E no da versão validada, com tooltip
dizendo o que a tela antes calava: com a versão validada, a folha renderiza do
snapshot, então mudar uma resposta só aparece no texto depois de "Atualizar do
cadastro".

### Etapa 5 — o gêmeo de consolidação do (Agro)

`supabase/migrations/20260827180000_gemeo_consolidacao_capital_agro.sql`, espelhando
a Frente C: bloco novo `Capital Social - Agro (consolidação)`
(`fc000002-0000-4000-8000-000000000001`) com `ancora = 'capital_social'`, redação no
presente ("é de", sem o "neste ato"), `e_constituicao` no original e `e_alteracao`
no gêmeo, e o gêmeo na posição seguinte à do original em todo modelo que o usa
(ordem 27 → 28 no Agro). Aplicada no sandbox por `db query --linked -f`, conferida
e reaplicada para provar a idempotência. **Não** registrada no ledger de migrations,
como a `20260827093000`.

**O check antes de aplicar achou um defeito que já existia.** Pôr `e_constituicao`
no original o torna condicional, e documento validado renderiza de `snapshot_flags`
congelado: no sandbox, **15 dos 19** documentos gerados têm snapshot sem nenhuma das
duas flags de peça (selados antes de 26/08/2026), 6 deles do modelo (Agro) e alguns
registrados. A Frente C já havia introduzido esse buraco para os seis blocos do
(Participações) — cláusula de capital, sede e objeto saindo de peças registradas sem
sinal nenhum.

Daí `comFlagDaPecaRetroativa` (`src/lib/templates/flags.ts`): snapshot que não traz
NENHUMA das duas é lido como constituição, porque é o que aqueles documentos são —
a alteração contratual como documento próprio não existia quando foram selados.
Snapshot que já traz uma delas é decisão selada e não se mexe. Aplicada nos dois
lugares que renderizam de flags congeladas: `flagsAtivas`
(`useGerarDocumentoController.ts`) e `renderizarVersao.ts` (o viewer de versão
antiga).

### O que NÃO foi feito

- Congelar o `pessoa.id` no snapshot: segue como pergunta aberta na §6, e o
  casamento por CPF/CNPJ vale como caminho de compatibilidade de qualquer forma.
- A redação da consolidação do (Agro) para além do tempo verbal (ver a pergunta
  nova na §6).
- O `supabase db push` continua quebrado pelas duas versões remotas sem arquivo
  local (§5). Nada aqui foi aplicado em produção.
