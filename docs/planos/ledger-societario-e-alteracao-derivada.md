# Plano: ledger societário e alteração contratual derivada

**Branch:** `feat/alteracao-contratual-caminho-b` (as duas frentes convivem aqui
desde a integração de 26/08/2026)
**Data:** 26/08/2026
**Origem:** leitura dos quatro instrumentos reais do grupo MMS (contrato social e 2ª
alteração da MMS Agro Ltda, contrato social e 1ª alteração da MMS Participações
Ltda), mais conversa com a OSG sobre como a reorganização acontece na prática.
**Complementa:** [`formato-real-da-alteracao-contratual.md`](./formato-real-da-alteracao-contratual.md),
que trata da moldura textual da peça. Este trata da origem dos dados.

---

## 1. O diagnóstico, em uma frase

A alteração contratual pergunta ao consultor **o que aconteceu**, e depois tenta
escrever a resolução lendo o **estado final** do cadastro. Os dois lados estão
errados: o que aconteceu é dedutível, e o estado final não basta, porque a peça
real publica estados intermediários e nomeia as partes de cada movimento.

A correção não é uma tela nova de perguntas. É colher o que a frente de
movimentação de quotas já construiu: `movimentacao_quotas` é um **livro de
movimentos**, e a coluna `documento_gerado_id` está documentada no banco como
"o ato que formalizou o movimento, quando existe". Movimento sem documento é
evento pendente. A alteração contratual é a peça que formaliza os pendentes.

---

## 2. A mecânica real, extraída dos quatro documentos

A reorganização é um **par de instrumentos registrados no mesmo dia**, com os
processos tramitando juntos na junta, e cada um citando o outro. No caso MMS,
registros nº 2984199 (Agro) e nº 2984200 (Participações), ambos em 28/12/2023.

### 2.1 Constituição (setembro de 2022): o quadro é digitado

| | MMS Agro (PR) | MMS Participações (CN) |
| --- | --- | --- |
| Capital | R$ 872.674,00 | R$ 1.000,00 |
| Divisão | 436.337 para cada fundador | 500 para cada fundador |
| Integralizado com | imóveis mais moeda corrente | moeda corrente |

### 2.2 O ato de reorganização (dezembro de 2023)

**Lado proprietária, 2ª alteração da Agro, dez resoluções em sequência:**

1. atualiza o CEP da sede;
2. aumenta o capital em R$ 3.362.148,00, de R$ 872.674,00 para R$ 4.234.822,00;
3. e 4. cada sócio subscreve 1.681.074 quotas e integraliza com imóveis mais um
   resto em moeda corrente (R$ 1,29 e R$ 1,30, para fechar o arredondamento),
   com outorga conjugal;
5. renúncia ao direito de preferência **do aumento**;
6. publica o quadro societário **intermediário**: 2.117.411 quotas para cada um;
7. os dois cedem a totalidade das quotas à MMS Participações, sócia ingressante,
   qualificada como PJ mais os administradores dela, com a razão explícita
   "uma vez que integralizaram referidas quotas junto ao capital social desta
   sócia";
8. retirada dos dois, por terem cedido tudo;
9. segunda renúncia de preferência, agora da cessão, do ingresso e da saída;
10. administração passa a ser exercida por **administradores não sócios** (as
    mesmas duas pessoas físicas).

Fecho: "alteram-se as Cláusulas Segunda, Quinta e Sexta, as demais ratificadas",
e consolidação com preâmbulo de **única sócia PJ**.

**Lado controladora, 1ª alteração da Participações, o espelho:**

1. altera o endereço **dos sócios** (não da sede);
2. aumenta o capital em R$ 4.234.822,00, de R$ 1.000,00 para R$ 4.235.822,00;
3. cada sócio subscreve 2.117.411 quotas e integraliza **com as quotas que tinha
   na MMS Agro**, com a Agro qualificada por inteiro (CNPJ, NIRE, sede,
   administradores) e a citação de que a 2ª alteração dela tramita no mesmo
   processo;
4. renúncia de preferência;
5. altera a Cláusula Quinta, ratifica as demais;
6. consolida. Quadro final: 2.117.911 para cada um, que é 500 mais 2.117.411.

### 2.3 As três regras de domínio que isso revela

1. **A subida é 1:1 em valor.** O sócio integraliza na controladora o valor das
   quotas que tinha na proprietária, e a quantidade de quotas emitidas é esse
   valor dividido pelo valor nominal da controladora. Os números coincidem no
   caso MMS porque as duas têm nominal de R$ 1,00.
2. **O aporte soma, não substitui.** O quadro da controladora depois da subida é
   o quadro dela mais o da proprietária, e é por isso que sobra o resíduo do
   capital de constituição (os 500). Se a proprietária estiver em 2/3 e 1/3 e a
   controladora tiver sido constituída 50/50, o resultado final não reproduz 2/3
   e 1/3, e daí nasce uma **terceira** alteração, só para arrumar a proporção.
3. **A alteração é uma sequência datada, não um retrato.** A cláusula sexta da
   2ª alteração da Agro publica o quadro depois do aumento e antes da cessão. Um
   motor que renderiza tudo a partir do estado final não tem como produzi-la.

> Nota de prática, confirmada com a OSG: o objeto social da Agro ganhou duas
> alíneas na consolidação (compra e venda e aluguel de imóveis próprios) sem
> cláusula de resolução que anuncie a mudança, e a cláusula de ratificação nomeia
> apenas Segunda, Quinta e Sexta. Isso é aceito: a consolidação vale como ato.
> Consequência para o desenho: a lista de cláusulas alteradas sai dos **eventos**,
> e não de um diff textual contra a peça anterior.

---

## 3. O desenho

### 3.1 Os dois regimes do quadro societário

```
  CONSTITUIÇÃO                          DEPOIS DA CONSTITUIÇÃO
  ─────────────                         ──────────────────────
  o quadro É o dado.                    ninguém digita quadro.
  você digita quem tem                   você lança EVENTOS, e o quadro
  quantas quotas, e o                    é a PROJEÇÃO deles.
  contrato social formaliza.
                                         ┌ derivados: subir quotas para a
                                         │  controladora (payload calculado,
                                         │  sem formulário)
                                         └ avulsos: cessão entre sócios, doação,
                                            redução (uma linha digitada cada)
```

Os dois regimes já estão meio construídos na frente de movimentação de quotas:
`proporAportesIniciais` (`src/lib/osg/aporteInicial.ts`, na branch
`feat/alteracao-contratual-caminho-b`) é exatamente o regime de constituição, e o
comentário do arquivo já enuncia a regra que este plano generaliza: "capital
registrado só muda por alteração contratual".

### 3.2 As três camadas, e o que é manual em cada uma

```
  ┌──────────────────────────────────────────────────────────────┐
  │ 1. LEDGER  movimentacao_quotas (+ audit_logs para o resto)    │
  │    MANUAL: o movimento. tipo, quem cede, para quem, quantas   │
  │    quotas, com o que foi pago, data.                          │
  └───────────────────────────┬──────────────────────────────────┘
                              │ derivação
  ┌───────────────────────────▼──────────────────────────────────┐
  │ 2. EVENTOS DA PEÇA  as seis flags evento_*                    │
  │    DERIVADO. o assistente PROPÕE a lista e o consultor        │
  │    confirma. deixa de ser pergunta, passa a ser conferência.  │
  └───────────────────────────┬──────────────────────────────────┘
                              │ composição (inalterada)
  ┌───────────────────────────▼──────────────────────────────────┐
  │ 3. TEXTO  blocos de resolução + consolidado                   │
  │    DERIVADO. cada resolução lê a projeção do quadro NO SEU    │
  │    ponto da sequência, e nomeia as partes do movimento.       │
  └──────────────────────────────────────────────────────────────┘

  Fora das três camadas, e aí sim manual de verdade:
  DECISÕES DE PROJETO. metodologia de haveres, acordo de quotistas,
  tipo de administração, poderes ampliados. Não são evento, não saem
  de cadastro nenhum, e é para elas que o painel manual deve existir.
```

### 3.3 Regras de derivação

| Evento | De onde sai |
| --- | --- |
| `evento_aumento_capital` | soma de `aporte` no ledger sem documento, na empresa |
| `evento_integralizacao` | os mesmos aportes, olhando com o que foram pagos |
| `evento_cessao_quotas` | linhas `cessao` (ou `doacao`) sem documento |
| `evento_mudanca_socios` | quem passa a ter zero (retirada) ou nasce no quadro (ingresso) |
| `evento_alteracao_endereco` | `audit_logs` sobre `pessoa` da PJ, campos `endereco_*` |
| `evento_mudanca_administracao` | `audit_logs` sobre `administracao` da PJ |
| unipessoalidade | contagem de sócios na projeção final igual a 1 |
| administrador não sócio | administrador que não está na projeção do quadro |
| cláusulas alteradas | união das vagas tocadas pelos eventos confirmados |

A janela temporal é a mesma que as notificações de mudança de variável já usam:
`performed_at > snapshot_validado_em` do documento registrado que a peça sucede
(`src/hooks/useNotificacoesDocumento.ts`). Não é máquina nova, é a mesma apontada
para outro fim.

### 3.4 O macro da subida, sem formulário

Entrada: a proprietária e a controladora. Nada mais. Ele grava o par espelhado:

```
  na PROPRIETÁRIA, por sócio:   cessao   origem=sócio  destino=CN  quotas=todas
  na CONTROLADORA, por sócio:   aporte   destino=sócio  pago_com=quotas da PR
                                quotas = (quotas na PR x nominal PR) / nominal CN
  ambos com a mesma data e o mesmo ato_id
```

Invariante checável antes de gravar: valor cedido na proprietária igual a valor
aportado na controladora, por sócio e no total. Se não fechar, a tela acusa antes
de existir documento nenhum.

Consequências que saem de graça, sem marcação manual: sócios da proprietária vão a
zero, logo retirada; a controladora vira única sócia, logo unipessoalidade e
preâmbulo no singular; a administração da proprietária passa a ser por não sócios.

Aviso que o macro deve dar: se o quadro resultante da controladora não reproduzir
a proporção da proprietária por causa do capital de constituição, dizer isso na
hora, com os números, para o consultor decidir se ajusta antes ou se aceita a
terceira alteração.

### 3.5 Onde o macro NÃO deve chegar

Ele não cria documento. Geração de peça já tem porteiros próprios (validar versão,
snapshot congelado, registro na junta, sucessão por `substitui_documento_id`), e um
macro que emitisse peças duplicaria essa máquina e teria de adivinhar modelo por
empresa. O macro enche o ledger; cada alteração nasce pelo fluxo normal, que já
sabe ler estado.

---

## 4. O que já existe, e o que está onde

### 4.1 A frente do ledger, integrada em 26/08/2026

Ela estava fechada em `feat/alteracao-contratual-caminho-b` e ausente de
`alteracao-contratual-caminho-b`, que seguiu 117 commits à frente sobre `develop`.
A integração foi feita mesclando a branch da alteração contratual **dentro** da
branch do ledger, para não devolver 117 commits a uma base de 20/08. Ver a Frente 0.

| Item | Onde |
| --- | --- |
| `capital_integralizacao` virou `movimentacao_quotas`, com tipo, origem, destino, quantidade, data, e a view `v_quadro_societario` como acumulado | migration `20260818192932`, commit `1473c47b` |
| Tela da proprietária propõe o quadro de constituição e grava | `src/lib/osg/aporteInicial.ts`, commit `500b63e6` |
| Gerador e relatório leem a view, fonte única | commit `0f3a06cc` |
| CRUD virou registro de movimento | `MovimentoModal.tsx`, `src/lib/osg/movimentoQuotas.ts`, `useMovimentacaoQuotas.ts`, commit `08068fd0` |
| Tabela velha derrubada e colunas legadas fora | commits `7c729733` e `3391fde4` |

No sandbox as duas coisas convivem hoje: existe a view `v_quadro_societario` e
existe a tabela `quadro_societario` com linhas, ainda que o código já não leia a
segunda. Conferir o estado do banco antes de concluir qualquer coisa sobre "o que o
app lê".

### 4.2 Pronto do lado da alteração contratual

| Item | Situação |
| --- | --- |
| Sócio PJ no preâmbulo | `mapearSocio` emite `sePJ` e `socio.administradores` ("neste ato representada por"), então o consolidado unipessoal com a holding como única sócia já sai |
| Título coletivo no singular | `tituloColetivoDosSocios` já produz "Único sócio" e "Única sócia" |
| Diff por janela temporal sobre `audit_logs` | Rodando na tela Gerar para as notificações de mudança de variável (`src/hooks/useNotificacoesDocumento.ts`) |
| Capital anterior e delta | `historicoCapital.ts` mais `sociedade.capitalAnterior` e `capitalDelta` no vocabulário, já usados na resolução de aumento (migration `20260826143800`) |
| Seis blocos de resolução, um por flag, mais a renúncia de preferência | Migrations `20260825194340` e `20260826143800` |
| Par de flags da peça | `e_constituicao` e `e_alteracao`, escopo `derivada_peca` (migration `20260826142819`) |
| Registro na junta e sucessão | `useRegistrarDocumento`, `useDocumentoSucessor`, `useOrdemNaSucessao` (`src/hooks/useDocumentoGerado.ts`) |
| Numeração que respeita blocos descartados | `numeracao.ts` |

---

## 5. As frentes

```
   ┌──────────────────────────────────────────┐
   │ F0. Integrar a frente do ledger  CONCLUÍDA │
   └───────────────┬──────────────────────────┘
                   ▼
   ┌──────────────────────────────────────────┐
   │ F1. O ledger fecha (schema)     CONCLUÍDA │
   └───────────────┬──────────────────────────┘
        ┌──────────┼──────────────┐
        ▼          ▼              ▼
   F2. Projeção  F3. Macro    F4. Assistente
   e aportes     da subida    propõe
   heterogêneos  CONCLUÍDA    CONCLUÍDA
   CONCLUÍDA         │             │
        └──────────┬─┴─────────────┘
                   ▼
             F6. Ensaio: cenário semeado, execução no app pendente

   F5. Decisões de projeto  CONCLUÍDA
```

> **Estado em 26/08/2026 (execução do plano).** F1 a F5 entregues e aplicadas no
> sandbox; F6 tem o cenário semeado e a execução no app rodando pendente (ela é
> humana por natureza: gerar, registrar e comparar com os quatro PDFs). Cada
> frente abaixo abre com o que ficou de fato, e onde.

### Frente 0: integrar a frente do ledger (CONCLUÍDA em 26/08/2026)

**Objetivo:** a branch que carrega a alteração contratual passa a ler o livro de
movimentos, não a tabela velha.

Feito: merge de `alteracao-contratual-caminho-b` dentro de
`feat/alteracao-contratual-caminho-b` (commit de merge `e44044d3`, sem `--ff`), na
direção que preserva os 117 commits de `develop` em vez de devolvê-los à base de
20/08. Resultado conferido:

- os onze commits do ledger e os três da alteração contratual estão na mesma
  branch, e o trabalho não commitado voltou por cima;
- único conflito: `src/integrations/supabase/types.ts`, resolvido pela **regeneração
  pelo CLI** contra o sandbox, como manda o AGENTS.md, nunca costurando o conflito;
- nenhuma referência pendente ao que o ledger apagou (`useQuadroSocietario`,
  `SocioModal`, leituras de `quadro_societario` e `capital_integralizacao`);
- os três arquivos que as duas frentes tocam (`mapeadores.ts`,
  `useGerarDocumentoController.ts`, `GerarDocumento.test.tsx`) trazem os dois lados;
- `bun run typecheck` limpo e suíte inteira verde (308 arquivos, 3672 testes).

Efeito colateral, já resolvido: a regeneração trouxe do sandbox dois valores novos
do enum `org_comment_kind` (`documentos_cobrados` e `documentos_conferidos`), sem
arquivo de migration no repositório. A migration foi **importada do ledger do
sandbox** para `supabase/migrations/20260826151559_org_comment_kind_osg_avisos.sql`,
com a versão e o nome exatos que o ledger registra, e os dois rótulos do mapa
exaustivo de `OrgCommentsPanel.tsx` saíram do texto dos avisos que o banco já
gravou. O resto do drift de ledger foi reconciliado no mesmo dia, e `supabase db push`
voltou a funcionar (`--dry-run` responde "Remote database is up to date"):

- **33 versões remotas sem arquivo** foram importadas do `statements` do próprio
  ledger para `supabase/migrations`, cada uma com a versão e o nome que o ledger
  registra, e cabeçalho dizendo que veio de lá;
- **12 arquivos locais sem registro** (as migrations da alteração contratual,
  aplicadas por `db query -f`) foram registrados com
  `supabase migration repair --status applied`, que grava sem executar. Antes disso
  ficou conferido que os efeitos estavam no banco, sondando os blocos que cada uma
  cria;
- o ledger e o diretório passaram a bater exatamente: 79 linhas, 79 arquivos.

Resíduo conhecido, não tratado: sete mudanças estão registradas **duas vezes** no
ledger, uma com o timestamp do repositório e outra com o carimbo do Lovable, e agora
cada uma tem o seu arquivo. O DDL é o mesmo nas duas, então uma reconstrução do zero
a partir das migrations quebraria na segunda. Limpar exige apagar linha do histórico
de migrations, o que é decisão a tomar, não efeito colateral.
Ver [[drift-sandbox-vs-lovable-25-08]].

Pendência de banco, não bloqueante: a tabela `quadro_societario` ainda existe no
sandbox com linhas, mesmo o código já não a lendo. Decidir entre reaplicar a
migration que a derruba (`20260820163000_limpeza_quadro_societario.sql`) ou conviver.

### Frente 1: o ledger fecha (CONCLUÍDA em 26/08/2026)

**Entregue:** migration `20260826210000_ledger_forma_de_pagamento_e_ato.sql`
(tabela `ato_societario` com as quatro policies e o trigger de `updated_at`; as
colunas `pago_com_empresa_pessoa_id`, `pago_com_quotas`, `pago_com_valor`,
`sequencia` e `ato_id` em `movimentacao_quotas`; três CHECKs, comentários em
todas as colunas novas). `types.ts` regenerado pelo CLI contra o sandbox e
`docs/rls/mapa-do-banco.md` regerado pelo script. No código: `FormaPagamento`,
`problemaDoPagamento`, `colunasDoPagamento` e `pagamentoDasColunas` em
`src/lib/osg/movimentoQuotas.ts`, e `useRegistrarMovimento` gravando as colunas
novas. `DELETE` do ato é de team_member (e não só de admin, como em
`movimentacao_quotas`): reverter o macro é gesto de consultor.

**Objetivo:** o ledger passa a saber com o que o aporte foi pago e em que ordem os
movimentos aconteceram dentro do mesmo ato.

1. Migration em `movimentacao_quotas`:
   - `pago_com_empresa_pessoa_id uuid REFERENCES pessoa(id)`: a PJ cujas quotas
     pagaram o aporte. Não inventa entidade: a empresa já é `pessoa`, e daí saem
     CNPJ, NIRE, sede e administradores para a cláusula.
   - `pago_com_quotas numeric` e `pago_com_valor numeric`: quanto veio de lá.
   - `sequencia integer`: ordem dentro do ato. Sem isso não existe estado
     intermediário.
   - `ato_id uuid`: amarra os lançamentos de um mesmo ato, nas duas empresas.
     Tabela `ato_societario` (id, cliente_id, data, descricao) se o ato precisar de
     identidade própria, o que a citação cruzada entre as peças sugere que sim.
   - CHECK: aporte tem exatamente uma forma de pagamento preenchida (bem, moeda
     corrente, ou quotas de outra PJ).
2. Comentários de coluna em todas elas, no mesmo tom das que já existem.
3. `v_quadro_societario` continua servindo o acumulado; nada nela muda nesta frente.

**Arquivos:** nova migration; `src/integrations/supabase/types.ts` regenerado pelo
CLI; `src/hooks/useMovimentacaoQuotas.ts`; `src/lib/osg/movimentoQuotas.ts`.

### Frente 2: projeção do quadro e aportes heterogêneos (CONCLUÍDA em 26/08/2026)

**Entregue:** `src/lib/osg/projecaoQuadro.ts` com `quadroEm(movimentos, empresa,
corte)` nos três cortes ('fim', 'antesDoAto', 'sequenciaDoAto'), mais
`ordenarMovimentos`, `movimentosDoAto`, `movimentosPendentes` e
`procedenciaDosMovimentos`; `useMovimentosDaEmpresa` lê o livro cru com o ato
embutido. A procedência de cada linha aparece nas DUAS telas do quadro (PR e CN),
como etiqueta ao lado do nome; abrir o histórico completo como painel próprio
segue sendo decisão do Bernardo. `{{#integralizacoes}}` ganhou a lista MISTA
`{{#aportes}}` (imóvel, moeda corrente, quotas de outra sociedade, com
`{{ origem.* }}` qualificando a PJ por inteiro), que reaproveita os MESMOS objetos
de `{{#imoveis}}` para não perder a referência cruzada; sem ledger ela cai nos
imóveis e as letras batem uma a uma. `{{#cessoes}}` é lista nova, com as duas
pontas qualificadas. Migration `20260826213000` reescreve as duas resoluções.

**Uma decisão diferente do plano, e o porquê:** o item 4 pedia um BLOCO NOVO para
a integralização com quotas de outra sociedade. Bloco novo exigiria flag nova, e
com a mesma `evento_integralizacao` os dois entrariam na composição juntos,
escrevendo a integralização duas vezes; uma flag própria seria mais uma pergunta
ao consultor, contra a direção da Frente 4. Ficou UMA cláusula com três ramos, e a
qualificação completa da PJ de origem mora no ramo `{{#seQuotas}}`.

**Objetivo:** o motor consegue renderizar o quadro em qualquer ponto da sequência,
e a lista de integralizações aceita mais de um tipo de aporte.

1. `quadroEm(empresa, ateEvento)`: a view dá o acumulado final; falta o acumulado
   **até um ponto**, para a cláusula que publica o quadro intermediário. Pode ser
   fold em TypeScript sobre os movimentos, ou parâmetro na leitura. Devolve o mesmo
   formato que `mapearQuadroSocietario` já consome.
2. A tela do quadro passa a mostrar a procedência de cada linha (constituição, ou
   qual ato). Fica pendente a decisão já registrada como aberta na frente anterior:
   mostrar só o saldo ou o saldo com o histórico ao lado.
3. `{{#integralizacoes}}` deixa de ser `MatriculaParaMapear[]`
   (`src/lib/templates/mapeadores.ts:179`) e passa a ser lista de **aportes**, cada
   um com o seu tipo: imóvel (com a família de descrição de imóvel que já existe),
   moeda corrente, quotas de outra PJ. O texto real mistura os três como alíneas
   dentro do mesmo sócio.
4. Bloco novo de resolução de integralização com quotas de outra sociedade, com a
   qualificação completa da PJ de origem e a citação do ato irmão.
5. A resolução de cessão passa a nomear cedente, cessionário e quantidade, em vez de
   só publicar o quadro resultante. É a pendência registrada na seção 6 do plano de
   formato real.

**Arquivos:** `src/lib/templates/mapeadores.ts`, `vocabulario.ts`, nova migration de
blocos, `src/hooks/useMovimentacaoQuotas.ts`.

### Frente 3: o macro da subida (CONCLUÍDA em 26/08/2026)

**Entregue:** `src/lib/osg/subidaDeQuotas.ts` (`planejarSubidaDeQuotas`: monta o
par espelhado, confere o invariante de valor por sócio, projeta o quadro
resultante somando ao capital de constituição e devolve o aviso de proporção com
os números). `SubirQuotasDialog.tsx` é o gesto na tela da PR, sem formulário além
da controladora e da data; `useSubirQuotas` grava o ato e os lançamentos e apaga o
ato se os lançamentos falharem. `AtosSocietarios.tsx` lista os atos das duas
empresas e desfaz o que nenhum documento formalizou (`useReverterAto`, com a
guarda lida do banco e não só da tela).

**Objetivo:** um movimento no quadro societário grava o par espelhado, com a
aritmética conferida.

1. Ação na tela do quadro societário da proprietária: "transferir quotas para a
   controladora". Sem formulário além da escolha da controladora e da data.
2. Cálculo e gravação conforme 3.4, num único ato.
3. Validação antes de gravar, e aviso de proporção conforme 3.4. A validação pura
   cabe em `src/lib/osg/movimentoQuotas.ts`, que já é o lugar do vocabulário e das
   regras com teste.
4. Reversão: apagar o ato inteiro enquanto nenhum documento o formalizou.

**Arquivos:** `src/components/equipe/osg/quadro-societario/*`,
`src/lib/osg/movimentoQuotas.ts`, `src/hooks/useMovimentacaoQuotas.ts`.

### Frente 4: o assistente propõe em vez de perguntar (CONCLUÍDA em 26/08/2026)

**Entregue:** `src/lib/osg/eventosDaAlteracao.ts` deriva as seis flags com a
evidência de cada uma, mais `ficaUnipessoal` e `administradoresNaoSocios` (as
consequências que saem de graça da projeção). `useEventosDerivados` junta o livro
com a janela de `audit_logs` desde o `snapshot_validado_em` do registrado. O modal
virou conferência: interruptor já ligado quando o cadastro sustenta o evento, com
a frase da prova embaixo; evento sem evidência continua na lista, desligado,
porque o consultor pode saber de algo que o cadastro ainda não sabe, e a resposta
JÁ GRAVADA vence a derivação (reabrir é edição, não recomeço). Validar a peça
carimba `documento_gerado_id` nos movimentos dos eventos confirmados
(`useCarimbarMovimentosFormalizados`), e é isso que dá a idempotência.

**Objetivo:** o modal de alteração contratual abre com a lista de eventos já
montada.

1. Derivar a lista conforme 3.3, do ledger mais a janela de `audit_logs`.
2. O modal vira conferência: cada item vem marcado, com a frase e a evidência
   ("aumento de capital de R$ 872.674,00 para R$ 4.234.822,00"), e o consultor
   desmarca o que não quer na peça.
3. A gravação continua em `projeto_flag_valor` escopo `documento`, como hoje: o
   registro passa a ser a **confirmação** do que foi derivado, o que mantém o
   snapshot auditável e o motor de composição intacto.
4. Ao validar a peça, estampar `documento_gerado_id` nos eventos formalizados. Isso
   dá idempotência: evento com documento não reaparece, evento sem documento entra
   na próxima peça.

**Arquivos:** `src/hooks/useGerarDocumentoController.ts`,
`src/components/equipe/osg/gerar/AlteracaoContratualDialog.tsx`,
`src/hooks/useDomainFlagsManuais.ts`.

### Frente 5: as decisões de projeto, que são o que sobra de manual (CONCLUÍDA em 26/08/2026)

**Entregue:** migration `20260826214500_flags_decisao_de_projeto.sql` com sete
flags manuais de escopo `pj`: `administracao_isolada`, `administracao_conjunta`,
`administracao_diretoria`, `administrador_poderes_ampliados`,
`haveres_fluxo_caixa_descontado`, `haveres_patrimonio_liquido` e
`tem_acordo_quotistas`. As categóricas entraram como N booleanos de nome explícito
(é o que o motor compõe hoje, e o seletor categórico segue como ponto de schema
aberto); as duas de haveres ligadas juntas SÃO o caso "ambas". A data do acordo de
quotistas não virou flag: flag é interruptor, data é valor, e ela entra como campo
de texto livre da tela Gerar. `docs/osg/catalogo-familias-e-flags.md` atualizado,
com dois pontos de schema marcados como resolvidos.

**Objetivo:** o painel manual passa a servir ao que realmente não sai de cadastro.

Flags novas, escopo de projeto por empresa, conforme o catálogo já previa:
metodologia de haveres, acordo de quotistas (com data), tipo de administração,
poderes ampliados ao administrador. Hoje `tmpl_flag` só tem as seis de evento, as
três derivadas de tipo de empresa e o par da peça.

**Arquivos:** nova migration, `docs/osg/catalogo-familias-e-flags.md`.

### Frente 6: ensaio com os quatro documentos reais (ITEM 1 CONCLUÍDO)

**Entregue:** migration `20260826215500_dev_ensaio_reorganizacao_estado_de_constituicao.sql`.
A controladora `Jatobá Sementes S.A.` sai do estado posterior (dois sócios de
4.770.898 quotas, com pessoas que nem são titulares dos imóveis da proprietária) e
passa ao capital de CONSTITUIÇÃO dela: 500 quotas para cada fundador, Lucas
Nogueira e Marina Salgado, que são justamente os titulares dos imóveis. Precisa ser
assim, senão o par não fecha: a subida transfere as quotas que eles têm na
proprietária, e essas quotas nascem dos imóveis que eles integralizam.

A proprietária ficou **de propósito sem quadro gravado**: ela já tem os bens
aprovados e a tela PROPÕE o quadro de constituição a partir deles, então apertar
"Gravar quadro societário" é o primeiro passo do ensaio. Reproduzir em SQL o
rateio por bem e o arredondamento de `proporAportesIniciais` duplicaria a regra em
duas linguagens, e a primeira divergência de centavo passaria despercebida
justamente no cenário que existe para achar divergências.

**Item 1 entregue; itens 2 a 4 EXECUTADOS em 26/08/2026**, numa corrida assistida
pelo navegador, e o roteiro virou script:
`e2e/demos/ac-reorganizacao-societaria.mjs`, documentado em
`docs/osg/ensaio-reorganizacao-societaria.md`.

A corrida achou **cinco defeitos** e produziu oito decisões de conserto, que
estão em [`derivacao-de-eventos-e-carimbo.md`](./derivacao-de-eventos-e-carimbo.md).
Os dois que mudam o que este plano afirmava:

- a ordem importa. O `capitalAnterior` sai do SNAPSHOT do documento substituído,
  não do ledger, então o contrato social das duas empresas tem de estar registrado
  ANTES do macro. Com a ordem invertida a cláusula de aumento sai com delta zero;
- o carimbo estava incompleto. Validar contrato social não carimba nada, então os
  movimentos de constituição nunca entram no "antes" da derivação, e a primeira
  alteração de toda empresa conta a partir de R$ 0,00 e trata sócio fundador como
  ingressante.

**Objetivo:** provar o par, não uma peça.

1. Migration de sandbox levando o cliente de teste
   `[TESTE] Dinossauro Aposentado Previdência e Fósseis Ltda`
   (`8f9c2796-b9f3-4349-923b-b04e86bc6012`) ao **estado de constituição**: a
   proprietária `Farroupilha Comércio Ltda` (`29d31f73`) com os dois fundadores e o
   capital inicial, a controladora `Jatobá Sementes S.A.` (`11c1394b`) com o capital
   inicial dela. Hoje a controladora está com dois sócios de 4.770.898 quotas cada,
   que é estado posterior, e a proprietária está sem quadro nenhum.
2. Gerar e registrar os dois contratos sociais.
3. Lançar o aumento de capital com imóveis na proprietária, rodar o macro da subida,
   e gerar as duas alterações.
4. Comparar cláusula por cláusula com os quatro PDFs reais.

---

## 6. Decisões fechadas

- O quadro societário é origem do dado **na constituição** e projeção do ledger
  **depois dela**.
- A subida das quotas para a controladora é 1:1 em valor, e o aporte soma ao capital
  de constituição da controladora em vez de substituí-lo.
- O ajuste de proporção depois da subida é uma alteração contratual própria, não um
  remendo no mesmo ato.
- O macro grava ledger, nunca documento.
- As seis flags de evento continuam existindo e o motor de composição não muda: elas
  passam a ser preenchidas por derivação e confirmadas pelo consultor.
- A lista de cláusulas alteradas sai dos eventos, não de diff textual, porque a
  prática aceita que a consolidação altere cláusula sem resolução que a anuncie.

## 7. Pergunta aberta

Na constituição da controladora, o capital inicial é distribuído já na proporção em
que a proprietária vai subir, ou é sempre igualitário e depois se corrige? A
resposta decide se o macro previne o desalinhamento ou apenas o registra.
