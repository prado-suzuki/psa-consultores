# Plano: alinhar a alteração contratual gerada ao formato real

**Branch:** `alteracao-contratual-caminho-b`
**Data:** 26/08/2026
**Origem:** comparação entre `Contrato_Social_Sociedade_Limitada_Participacoes_rascunho(8).docx`
(gerado pelo sistema) e sete alterações contratuais reais (Campos de Canaã 1ª e 2ª,
Aliança Participações 3ª, Agro Aliança 4ª, Agropecuária Zamo 1ª, MMS Agro 2ª,
MMS Participações 1ª), mais o contrato de constituição da Aliança Participações
como controle do tempo verbal.

---

## 1. O diagnóstico, em uma frase

O caminho B acertou o eixo (a alteração nasce do MESMO modelo do contrato social,
resoluções na frente e consolidado atrás) e acertou o mecanismo (uma flag de
evento por bloco de resolução). O que falta é a **moldura do instrumento**: a peça
real não é "resoluções soltas seguidas do contrato". Ela tem, nesta ordem:

```
  TÍTULO ("SEGUNDA ALTERAÇÃO E CONSOLIDAÇÃO DO CONTRATO SOCIAL")
  RAZÃO SOCIAL + CNPJ + NIRE
  qualificação dos sócios
  fecho de alteração ("Únicos sócios da sociedade limitada X, … resolvem
    neste ato, alterar e consolidar o seu contrato social…")
  ─────────── DAS ALTERAÇÕES CONTRATUAIS ───────────
  CLÁUSULA PRIMEIRA: <resolução do evento 1>
  CLÁUSULA SEGUNDA:  <resolução do evento 2>
  CLÁUSULA …:        as demais cláusulas … permanecem em vigor, ratificadas
  CLÁUSULA …:        os sócios resolvem consolidar o contrato social, que
                     passa a vigorar com a seguinte redação:
  ─────────── (reinício) ───────────
  RAZÃO SOCIAL + CNPJ + NIRE           ← repetido
  qualificação dos sócios              ← repetida
  fecho de consolidação
  CAPÍTULO I / CLÁUSULA PRIMEIRA: A sociedade **gira** sob o nome…
  … contrato inteiro no PRESENTE …
  fecho e assinaturas
```

Hoje o gerado emite: título correto, razão social, qualificação, **fecho de
constituição** ("Contrataram, entre si, a constituição de uma sociedade
limitada…"), resoluções sem cabeçalho de seção e sem numeração, e o contrato
consolidado **no futuro** ("A sociedade girará sob o nome…"), sem nada anunciando
que ali começa a consolidação.

Confirmado no controle: o contrato de **constituição** real usa mesmo futuro
("girará", "terá sede", "será de", "será administrada"); a **consolidação** dentro
de uma alteração usa presente ("gira", "tem sede", "é de", "é administrada").
As duas redações coexistem de verdade. Não é escolher uma; é ter as duas.

---

## 2. O que já existe e não precisa ser feito

Levantado no código antes de planejar, para ninguém refazer:

| Item | Situação |
| --- | --- |
| Título da peça por posição na sucessão | Pronto: `instrumento.ts` + campo derivado `sociedade.tituloInstrumento` (migration `20260825213000`) |
| `sociedade.cnpj`, `.nire`, `.juntaUf`, `.juntaUfExtenso`, `.dataConstituicao` | Já existem no vocabulário (`vocabulario.ts:407-486`) e são preenchidos por `mapearSociedade` (`mapeadores.ts:225`) |
| Rodapé "Página X de Y" no .docx | Pronto (`docx.ts:452-463`) |
| Uma flag de evento por bloco de resolução | Pronto (migration `20260825194340`) |
| Numeração que respeita blocos descartados | Pronto (`numeracao.ts`, roda depois da composição) |
| Mecanismo de variantes de bloco por seletor | Pronto (`familia.ts` + `render.ts:292-302`), hoje só usado em imóvel |

---

## 3. A decisão de arquitetura que destrava tudo

Três dos problemas (moldura, tempo verbal, numeração) esbarram no mesmo limite:
`comporBlocos` compõe com **AND simples, sem OR e sem negação**
(`composition.ts`). Um bloco de preâmbulo que só valha na alteração precisaria,
no espelho, que o preâmbulo de constituição *saísse*, e "sair" é negação.

**Decisão: sintetizar um par de flags mutuamente exclusivas na tela Gerar.**

```ts
// useGerarDocumentoController.ts, dentro de flagsAtivasLive
const daPeca = numeroAlteracao >= 1 ? ['e_alteracao'] : ['e_constituicao'];
return [...new Set([...derivadas, ...flagsManuaisLigadas, ...daPeca])];
```

Com isso, o AND passa a bastar: bloco de constituição carrega
`flagsRequeridas: ['e_constituicao']`, bloco de alteração carrega
`['e_alteracao']`, e exatamente um dos dois entra. Nenhuma mudança no motor de
composição, nenhuma negação inventada, e as flags entram no
`snapshot_flags` como todas as outras (documento já validado continua
renderizando do snapshot, intacto).

`numeroAlteracao` já é calculado em `useGerarDocumentoController.ts:170` a partir
de `useOrdemNaSucessao`. A síntese lê dele.

> **Alternativa considerada e rejeitada como principal:** transformar as seis
> cláusulas sensíveis a tempo verbal em *cabeças de família* com
> `{{familia nome="…"}}` e duas variantes cada, com seletor
> `{"sociedade.eAlteracao":"sim"}`. Funciona (o `resolver` de `render.ts` lê
> caminho de topo), preserva uma identidade de bloco só, e é o mecanismo
> desenhado exatamente para "uma redação por caso". Mas custa: campo derivado
> novo, reescrita das 6 cláusulas como hospedeiras, 12 linhas de variante, e o
> erro de "nenhuma variante atende" passa a poder derrubar a prévia de qualquer
> contrato. O par de flags entrega o mesmo resultado com máquina que já roda.
> Se a equipe preferir a família, a troca é local à Frente C e não afeta as demais.

---

## 4. As frentes

Seis frentes. **A** é pré-requisito de **B**, **C** e **D**. **E** e **F** são
independentes e podem correr em paralelo desde o início.

```
        ┌──────────────────────────────────────────┐
        │ A. Par de flags e_alteracao/e_constituicao│
        └───────────────┬──────────────────────────┘
            ┌───────────┼───────────┐
            ▼           ▼           ▼
     B. Moldura   C. Tempo     D. Numeração
     (5 blocos)   verbal       em duas séries
                  (6 blocos)
     ────────────────────────────────────────
     E. Redação das resoluções   (independente)
     F. Fecho e assinaturas      (independente)
```

---

### Frente A — o par de flags (pré-requisito)

**Objetivo:** a tela Gerar passa a informar ao motor se a peça é constituição ou
alteração, como flag.

1. Migration: inserir em `tmpl_flag` as flags `e_alteracao` e `e_constituicao`,
   escopo novo `derivada_peca` (ou o escopo que o catálogo já usa para flags que
   ninguém marca à mão: conferir `tmpl_flag.escopo` antes de inventar valor).
   Elas **não** podem aparecer no assistente de eventos nem no painel de flags
   manuais.
2. `useGerarDocumentoController.ts:565` (`flagsAtivasLive`): acrescentar a flag da
   peça, conforme o trecho da seção 3.
3. `useGerarDocumentoController.ts:~599` (`blocosExcluidosPorPerfil`): o painel de
   Escolhas hoje separa "excluído por perfil da empresa" de "excluído por evento
   não marcado". Blocos excluídos por `e_alteracao`/`e_constituicao` não são nem
   um nem outro: são o espelho da peça, e não devem aparecer como escolha do
   usuário em lugar nenhum. Filtrar.
4. Testes: `src/hooks/useGerarDocumentoController` (ou o teste de wiring
   equivalente) cobrindo os dois casos: `numeroAlteracao = 0` liga
   `e_constituicao`; `>= 1` liga `e_alteracao`; nunca as duas.

**Arquivos:** `supabase/migrations/<nova>.sql`, `src/hooks/useGerarDocumentoController.ts`.
**Prova de fim:** com a mesma empresa, alternar entre folha de constituição e
folha de alteração troca o conjunto de flags ativas em exatamente um nome.

---

### Frente B — a moldura do instrumento

**Objetivo:** o documento passa a ter fecho de alteração, cabeçalho de seção,
cláusulas de ratificação e de consolidação, e a repetição do cabeçalho +
qualificação na abertura do consolidado.

Cinco blocos novos e um bloco existente ganhando flag. Ordem no modelo
(as resoluções ocupam hoje 3..8; a migration `20260825194340` já abriu espaço até 12):

| Ordem | Bloco | Tipo | Flag | Conteúdo |
| --- | --- | --- | --- | --- |
| 1 | `Cabeçalho e razão social` (existe, `a63d92fd…`) | livre | — | acrescentar CNPJ e NIRE sob a razão social, condicionais (`{{#sociedade.cnpj}}`) porque a constituição ainda não tem CNPJ |
| 2 | `Preâmbulo — qualificação dos sócios` (existe, `855cef65…`) | livre | `e_constituicao` | inalterado; só ganha a flag |
| 2b | **novo** `Preâmbulo — qualificação e abertura da alteração` | livre | `e_alteracao` | mesma qualificação + fecho "Únicos sócios da sociedade limitada …, inscrita no CNPJ sob o nº …, registrada na Junta Comercial do Estado de … sob o NIRE nº …, com sede estabelecida …, resolvem neste ato, alterar e consolidar o seu contrato social, de acordo com as cláusulas e condições seguintes:" |
| 2c | **novo** `Seção — DAS ALTERAÇÕES CONTRATUAIS` | livre | `e_alteracao` | título centralizado |
| 3..8 | resoluções (existem) | **clausula** (ver Frente D) | `evento_*` | — |
| 9 | **novo** `Cláusula — Ratificação dos atos anteriores` | clausula | `e_alteracao` | "As demais cláusulas e condições estabelecidas nos atos anteriores, não alcançadas pela presente alteração permanecem em vigor, sendo integralmente ratificadas por este instrumento." |
| 10 | **novo** `Cláusula — Consolidação do contrato social` | clausula | `e_alteracao` | "Face às alterações ocorridas, os sócios resolvem consolidar o contrato social, que passa a vigorar com a seguinte redação:" |
| 11 | **novo** `Cabeçalho e qualificação da consolidação` | livre | `e_alteracao` | razão social + CNPJ + NIRE + qualificação dos sócios de novo + "Únicos sócios da sociedade limitada …, resolvem … consolidar o seu contrato social, de acordo com as cláusulas e condições seguintes:". **É este que reinicia a numeração** (Frente D) |

Notas de redação, extraídas dos reais:

- A concordância de "Únicos sócios" varia com o quadro (Zamo: "Único sócio";
  Aliança: "Únicas sócias"). Verificar se `concordancia.ts` já resolve; se não,
  é campo derivado do quadro societário, não literal.
- O fecho de alteração é o único lugar que precisa de `juntaUfExtenso`, e o campo
  já existe.
- A frase de abertura muda de escritório para escritório ("resolvem neste ato,
  alterar e consolidar" / "resolvem em comum acordo e sem qualquer tipo de vício,
  alterar e consolidar" / "resolve por este instrumento particular alterar e
  consolidar"). Escolher **uma** e deixar editável na prévia como qualquer bloco.

**Arquivos:** `supabase/migrations/<nova>.sql`.
**Prova de fim:** o .docx de uma alteração abre com título + CNPJ/NIRE, fecha a
qualificação anunciando alteração, tem "DAS ALTERAÇÕES CONTRATUAIS", e o
consolidado é anunciado por uma cláusula e reaberto por um cabeçalho.

---

### Frente C — o tempo verbal do consolidado

**Objetivo:** na alteração, o contrato consolidado descreve o que **já é**.

Seis blocos existentes ganham `flagsRequeridas: ['e_constituicao']` e ganham um
gêmeo no presente com `['e_alteracao']`, posicionado imediatamente depois no
modelo:

| Bloco existente | id | Futuro (constituição) | Presente (consolidação) |
| --- | --- | --- | --- |
| Cláusula — Denominação da sociedade | `1e8e17fe…` | "A sociedade **girará** sob o nome" | "A sociedade **gira** sob o nome" |
| Cláusula — Sede | `e8b3a472…` | "A sociedade **terá** sede estabelecida" | "A sociedade **tem** sede estabelecida" |
| Cláusula — Prazo de duração | `06c53014…` | "iniciando suas atividades **na data de registro do contrato social na Junta Comercial**" | "iniciando suas atividades em **{{ sociedade.dataConstituicao }}**" |
| Cláusula — Objeto social | `7c76709d…` | "A sociedade **terá** por objeto" | "A sociedade **tem** por objeto" |
| Cláusula — Capital social integralizado em moeda corrente | `579e688d…` | "O capital social **será** de … integralizadas **neste ato**" | "O capital social **é** de … (sem "neste ato")" |
| Cláusula — Administração e poderes | `4f869b8e…` | "A sociedade **será** administrada … a quem **competirá** representar" | "A sociedade **é** administrada … a quem **compete** representar" |

A cláusula de prazo de duração é a única que muda mais que o verbo: o consolidado
imprime a data real de início ("iniciando suas atividades em 19/10/2020"), que já
existe como `sociedade.dataConstituicao`. Se o cadastro não tiver a data, o
condicional `{{#sociedade.dataConstituicao}}` cai para a redação sem data em vez
de deixar buraco.

**Cuidado:** a Cláusula — Administração e poderes tem doze alíneas e dois
parágrafos. O gêmeo duplica isso. Duplicação é o custo consciente da decisão da
seção 3; se incomodar, é exatamente esse bloco que justifica migrar a Frente C
para família de variantes (alternativa da seção 3), porque as alíneas ficariam no
hospedeiro e só o caput variaria.

**Arquivos:** `supabase/migrations/<nova>.sql`.
**Prova de fim:** gerar constituição e alteração da mesma empresa; comparar as
seis cláusulas.

---

### Frente D — numeração em duas séries

**Objetivo:** as resoluções são `CLÁUSULA PRIMEIRA`, `SEGUNDA`, … e o contrato
consolidado **recomeça** em `CLÁUSULA PRIMEIRA`.

Este é o único ponto que mexe no motor. Hoje `estruturar()` em
`numeracao.ts:31-49` tem um contador contínuo por documento
(`let nClausula = 0`), e foi por isso que a migration `20260825194340` fez as
resoluções serem `tipo = 'livre'` com rubrica em negrito no lugar do número: uma
resolução numerada empurraria o contrato inteiro, e "CLÁUSULA PRIMEIRA" passaria a
ser a resolução em vez da denominação da sociedade. A observação está certa; a
saída é dar ao motor o conceito que falta.

1. **Tipo `Bloco`** (`types.ts`): novo campo
   `reiniciaNumeracao?: boolean`, que diz "a partir deste bloco, capítulo e cláusula
   recomeçam do zero". Documentar no comentário de tipo por que ele existe (a
   consolidação dentro de uma alteração é um documento embutido em outro).
2. **`numeracao.ts`**: em `estruturar()`, zerar `nCapitulo` e `nClausula` quando
   `bloco.reiniciaNumeracao`. Vale para as três saídas (`prefixosNumeracao`,
   `rotulosNumeracao`, `refsNumeracao`), que já compartilham a passada, então é uma
   mudança só.
   **Atenção às âncoras:** `refsNumeracao` alimenta `{{ refs.* }}`. Com duas
   séries, "Cláusula Oitava" passa a existir duas vezes no mesmo documento. As
   referências cruzadas do consolidado apontam para o consolidado (mesma série),
   então continuam corretas, mas isso precisa de teste explícito, não de fé.
3. **Banco**: coluna `tmpl_bloco.reinicia_numeracao boolean not null default false`,
   e regenerar `src/integrations/supabase/types.ts` **pelo CLI** (nunca à mão).
4. **`useGerarDocumentoController.ts:244-262` e `:265-282`**: propagar
   `reiniciaNumeracao: b.bloco!.reinicia_numeracao ?? undefined` nas **duas**
   montagens de `Template` (a com override e o espelho `templateOriginal`).
   Esquecer o espelho faz o realce de diff numerar diferente do documento.
5. **Migration de dados**: as seis resoluções passam de `tipo = 'livre'` para
   `tipo = 'clausula'` e perdem a rubrica em negrito do início do texto (`*Da
   alteração do endereço da sede.* `), que o prefixo automático substitui. As duas
   cláusulas novas da Frente B (ratificação e consolidação) entram como
   `clausula`. O bloco `Cabeçalho e qualificação da consolidação` (ordem 11) recebe
   `reinicia_numeracao = true`.
6. **Testes** em `numeracao.test.ts`: série reiniciada, capítulo reiniciado,
   `refs` apontando para a série certa dos dois lados do reinício, e o caso
   degenerado de nenhum bloco com a marca (comportamento de hoje, inalterado).

**Arquivos:** `src/lib/templates/types.ts`, `src/lib/templates/numeracao.ts`,
`src/lib/templates/numeracao.test.ts`, `src/hooks/useGerarDocumentoController.ts`,
`supabase/migrations/<nova>.sql`, `src/integrations/supabase/types.ts` (regenerado).
**Prova de fim:** no .docx da alteração, a última resolução é `CLÁUSULA QUARTA` (ou
o que for) e a denominação da sociedade volta a ser `CLÁUSULA PRIMEIRA`.

---

### Frente E — a redação das seis resoluções

**Objetivo:** as resoluções param de soar como ata e passam a soar como
alteração contratual.

Reescrita das seis versões da migration `20260825194340` (versão 2 de cada bloco,
com `atual` migrando, que é o padrão de versionamento da `20260825213000`).
Quatro mudanças transversais, todas extraídas dos sete reais:

1. **Voz.** Trocar "Os sócios resolvem, por unanimidade, X" pela forma reflexiva
   impessoal: "Altera-se a administração da sociedade…", "Aumenta-se o capital
   social em…", "Constitui-se neste ato a Filial 01…", "Atualiza-se a qualificação
   do sócio…".
2. **Apontar a cláusula atingida pelo número.** Real: "modificando
   consequentemente as disposições contidas na **Cláusula Sexta** do contrato
   social". Gerado hoje: "a cláusula que dispõe sobre o capital social". O número
   não pode ser literal: sai de `{{ refs.<ancora> }}` (`numeracao.ts:120-140`), com
   âncora posta na cláusula-alvo do consolidado. Com a Frente D em pé, a
   referência aponta para a série do consolidado, que é a certa.
3. **Matar a fórmula "cuja nova redação consta da consolidação adiante".** Ela
   não existe em nenhum dos sete. Onde o real precisa mostrar a nova redação, ele
   a **transcreve ali mesmo**, recuada (Canaã 1ª, Zamo 1ª). Decidir com o
   consultor: transcrever ou apenas apontar a cláusula. Transcrever é o formato
   mais comum nos reais.
4. **Bug literal:** `{{ socio.percentual }}%` produz `55,000%%`, porque
   `formatarPercentual` (`extenso.ts:269`) já devolve o `%`. Remover o `%` do
   bloco `ac000001-…-000000000006`. É a única ocorrência do erro no repositório.

Por resolução:

- **Aumento de capital.** O real enuncia o **delta** e o antes/depois: "Aumenta-se
  o capital social em R$ 4.746.705,00 …, de modo que o capital social atual de
  R$ 525.744,00 passará a ser de R$ 5.272.449,00". O gerado só sabe o depois. O
  comentário da migration `20260825194340` já registrou por quê: **o caminho B não
  guarda a história da sociedade**. Duas saídas, e a escolha é do consultor, não
  do implementador: (a) manter só o estado novo, assumindo a perda de forma; (b)
  ler o capital anterior do `snapshot_dados` do documento **registrado** que esta
  alteração substitui. O dado existe, é o snapshot congelado, e
  `documento_base_id` já aponta para ele. **(b) é factível e é o que casa com o
  real.** Levantar o custo antes de prometer.
- **Integralização.** O real descreve os bens **dentro da resolução** (matrícula,
  livro, cartório, área, CCIR, confrontações, valor), não remete adiante. O motor
  já sabe escrever isso: é a família de variantes de descrição de imóvel
  (`familia.ts`), hoje usada na cláusula de capital do consolidado. A resolução
  pode hospedar `{{familia nome="Descrição de imóvel"}}` dentro do laço de
  integralizações, do mesmo jeito.
- **Cessão de quotas.** Separar a **renúncia ao direito de preferência** em
  cláusula própria, como fazem MMS Agro e MMS Participações.
- **Entrada e retirada de sócio.** Nomear **quem entrou e quem saiu**, não só
  publicar o quadro resultante. Depende de o cadastro saber distinguir ingressante
  de remanescente: verificar contra `useDomainMovimentacaoQuotas` e o quadro
  societário antes de escrever a redação, e se o dado não existir, dizer isso em
  vez de inventar prosa genérica.

**Arquivos:** `supabase/migrations/<nova>.sql`; possivelmente
`src/lib/templates/mapeadores.ts` (se (b) do aumento de capital for aprovado).
**Prova de fim:** ler as seis resoluções geradas ao lado das reais e não achar
frase que não exista em nenhuma delas.

---

### Frente F — fecho e assinaturas

**Objetivo:** o fecho para de trazer campos que os reais não têm e ganha o que
eles têm.

Bloco `Fecho e assinaturas` (`f1ec14fc…`, versão 4):

1. **Bloco de advogado/OAB:** não aparece em nenhum dos sete. Confirmar com o
   consultor se é exigência de algum registro; se não for, remover ou pendurar em
   flag própria.
2. **Duas modalidades de fecho**, e os reais usam as duas:
   - com testemunhas: "…assinam o presente instrumento, na presença das
     testemunhas abaixo nomeadas." + dois blocos de testemunha (Canaã 2ª);
   - digital, sem testemunhas: "…assinando o presente instrumento em formato
     digital, o qual constitui título executivo extrajudicial, nos termos do
     Art. 784, §4º, do Código de Processo Civil, dispensada a presença de
     testemunhas." (Aliança 3ª).
   Isso é família de variantes ou par de flags manuais, mesma decisão da seção 3,
   e aqui a flag é escolha do consultor, não derivada da peça.
3. **Layout em duas colunas** nas assinaturas dos reais. Verificar em `docx.ts` se
   a tabela de assinaturas é viável sem quebrar a prévia HTML; se for caro,
   **deixar de fora e dizer que ficou de fora**: é cosmético e não bloqueia
   registro.

**Arquivos:** `supabase/migrations/<nova>.sql`, possivelmente `src/lib/templates/docx.ts`.
**Prova de fim:** fecho gerado sem campos órfãos, nas duas modalidades.

---

## 5. Ordem de execução

1. **A** sozinha, primeiro. Nada de B/C/D antes de as flags existirem e estarem
   testadas, porque todas as três dependem delas para funcionar.
2. **B**, **C** e **D** em paralelo depois de A. Elas tocam arquivos diferentes:
   B e C são só migration de catálogo; D é motor + hook + migration de tipo dos
   blocos. O único encontro é a migration da Frente D mexer no `tipo` das seis
   resoluções que a Frente B reposiciona: **combinar uma migration só para as duas**,
   ou garantir que a de B rode antes.
3. **E** e **F** podem começar já, em paralelo com tudo, com uma ressalva: a
   Frente E depende da Frente D para as referências `{{ refs.* }}` funcionarem
   como as reais. Escrever a redação primeiro e ligar as âncoras depois é ordem
   válida.

---

## 6. Regras inegociáveis desta frente

- **Migration nenhuma vai para produção por aqui.** Sandbox pelo CLI
  (`supabase db push`); produção é passo humano pelo chat do Lovable. Toda
  migration nova leva a linha "Nada aqui aplica em produção" no cabeçalho, como as
  três da frente já levam.
- **`src/integrations/supabase/types.ts` se regenera pelo CLI.** Não se edita à
  mão, não se costura em conflito, não vai para o `.gitignore`.
- **Idempotência.** As migrations desta frente rodam num banco onde as três
  anteriores já rodaram. Seguir o padrão delas: guarda por `EXISTS` antes de
  empilhar versão de bloco (ver `20260825213000`), `ON CONFLICT DO NOTHING` nos
  inserts de catálogo, `WHERE NOT EXISTS` nos inserts de versão.
- **Versão de bloco não se sobrescreve, se empilha.** `uq_tmpl_bloco_versao_atual`
  é único por bloco onde `atual`: a vigente sai antes de a nova entrar. Documento
  já validado renderiza do próprio `snapshot_versoes_blocos` e não muda.
- **Comentário de migration explica o porquê, não o quê.** É o padrão desta
  frente e é o que faz as três migrations existentes serem legíveis meses depois.
- **Sem travessão longo** em texto escrito para o Bernardo.

---

## 7. Como se prova que acabou

O ensaio já existe: `e2e/demos/ac-alteracao-contratual.mjs`, documentado em
`docs/osg/ensaio-fluxo-alteracao-contratual.md`. Ele mede e narra, não corrige.

Critério de aceite, a ser verificado **no app rodando** (sandbox, branch
`alteracao-contratual-caminho-b`), gerando o .docx e lendo o texto:

1. Título com o ordinal certo da alteração.
2. Razão social seguida de CNPJ e NIRE.
3. Qualificação fechando com "…resolvem neste ato, alterar e consolidar o seu
   contrato social…" e **não** com "Contrataram, entre si, a constituição…".
4. Cabeçalho de seção "DAS ALTERAÇÕES CONTRATUAIS".
5. Resoluções numeradas como CLÁUSULA PRIMEIRA, SEGUNDA, …
6. Cláusula de ratificação e cláusula de consolidação, nesta ordem, fechando a
   seção.
7. Razão social + CNPJ + NIRE + qualificação repetidas na abertura do consolidado.
8. `CAPÍTULO I` / `CLÁUSULA PRIMEIRA` recomeçando ali.
9. Consolidado inteiro no presente.
10. Nenhuma ocorrência de `%%`.
11. A mesma empresa, gerada como **constituição**, continua saindo exatamente como
    saía antes desta frente (futuro, preâmbulo de constituição, sem seção de
    alterações). Esta é a prova de não-regressão e vale tanto quanto as dez acima.
