# Demonstração: aumento de capital por integralização de novos imóveis

Roteiro de passagem end-to-end para o agente **`cleberson-oliveira`** executar no
app rodando, pelo Playwright MCP, e relatar com prova literal.

Ele **mede e relata**. Não corrige código de aplicação, não roda SQL de escrita e
não conserta cadastro. As únicas escritas são as da própria UI: gravar quadro,
gravar aumento, transferir quotas, validar versão e registrar na junta.

Plano da frente: `plan.mdx`, nesta mesma pasta. Doc companheiro do ensaio
anterior, com o mesmo formato: `docs/osg/ensaio-fluxo-alteracao-contratual.md`.

---

## 1. O que esta demonstração existe para provar

Seis pontos. O relato final precisa dar um veredito para cada um, com a prova ao
lado. Tudo o mais no roteiro é o caminho até eles.

| # | Ponto de verificação | Onde ele aparece |
| --- | --- | --- |
| V1 | O card do aumento **só existe** quando há imóvel elegível fora do capital | passos 1, 2 e 5 (ausência) e 11 (presença) |
| V2 | A procedência do sócio traz o **nome do ato**, e o aumento não é absorvido por "Constituição" | passo 12 |
| V3 | A parcela em moeda com centavos fecha pela regra da casa | passo 11 |
| V4 | Registrar **carimba o ledger** e tira os bens da lista de elegíveis | passos 5 e 14 |
| V5 | A AC seguinte **não repete** os eventos já registrados | passo 15 |
| V6 | A **segunda concentração** é possível | passo 16 |
| V7 | Sobre peça registrada, os gestos de edição ficam **visíveis e travados com o motivo**, e não somem | passo 18 |
| V8 | A peça já sucedida **não gera uma segunda** alteração | passo 18 |
| V9 | A folha **declara** que peça é, em que situação, e quantos atos ela formaliza | passos 13 e 18 |

O V6 é o que mais interessa: até 01/09/2026 o macro recusava com "A controladora
já é sócia da proprietária: as quotas já subiram", e a segunda concentração não
tinha por onde ser gravada.

---

## 2. Pré-requisitos

### 2.1 Conferir para onde o app aponta (primeiro passo, sem exceção)

O servidor já está de pé na porta **8080**. Antes de qualquer clique, prove que
ele fala com o **sandbox** e não com produção:

```bash
curl -s http://localhost:8080/src/integrations/supabase/client.ts \
  | grep -oE 'https://[a-z]+\.supabase\.co' | sort -u
```

**Esperado:** `https://vgzomuwnsdgrxbkyoavq.supabase.co`

Esse ref é o sandbox. Se sair qualquer outro (produção é `zwoainzzqhudmmknuycq`),
**pare a demonstração e reporte**. Não clique em nada: os passos deste roteiro
escrevem no banco, e escrever em produção não é aceitável por nenhum caminho.

Cole a saída literal desse comando no relato. É a prova de que a demonstração não
mirou produção.

> A regra por trás: o `vite.config.ts` decide o banco pela branch em tempo de
> execução. Fora da `main` carrega o `.env.sandbox`; na `main`, produção. O
> `bun run dev` imprime o alvo na linha `➜ Supabase:` ao subir. Como aqui o
> servidor já está de pé, o `curl` acima é a forma de perguntar isso a ele.
> (`docs/geral/validar-no-app-rodando.md` descreve o mecanismo, mas cita
> `.env.development`, que é o nome antigo do arquivo.)

**Não suba um segundo servidor.** Se a 8080 já responde, use-a. Um Vite novo
sobe em outra porta e a demonstração passa a mirar outro processo.

### 2.2 Login

Não há bloqueio de credencial: as contas de dev do sandbox estão publicadas nas
demos existentes (`e2e/demos/ac-alteracao-contratual.mjs`).

| Variável | Default |
| --- | --- |
| `AC_URL` | `http://localhost:8080` (a demo antiga tem `5199` no default; **ignore**, o servidor de agora é 8080) |
| `AC_EMAIL` | `user001@exemplo.dev` |
| `AC_PASSWORD` | `devlocal123` |

Sequência do login, na ordem em que a UI pede:

1. Navegue para `http://localhost:8080/equipe`.
2. Preencha `#email` com `user001@exemplo.dev`.
3. Preencha `#password` com `devlocal123`.
4. Clique no botão **Entrar**.
5. Aparece o seletor de áreas (Board, Digital, Marketing, OSG, Tax). Clique no
   botão que começa com **OSG**.

Se o login for recusado, ou se a área OSG não aparecer para essa conta, **aí sim
é bloqueio**: reporte com o texto literal do erro e pare. Não tente contornar.

### 2.3 Escolher o cliente

Toda tela da área OSG lê o cliente de uma barra no topo, com o rótulo
**Cliente** e o placeholder `Selecione um cliente...`. Escolha:

> `[TESTE] Dinossauro Aposentado Previdência e Fósseis Ltda`

Sem cliente escolhido, as telas mostram "Selecione um cliente na barra acima" e
nada mais. O cliente fica escolhido entre as rotas: escolha uma vez, no começo.

---

## 3. Identificadores do sandbox

Confira que está no lugar certo antes de começar. O cenário foi zerado em
01/09/2026 e está pronto para a passagem completa: o livro de movimentos está
vazio, não há documento gerado nenhum e não há resposta de assistente gravada.

Para zerar de novo depois de uma passagem, o script está ao lado, em
`reset-cenario.sql`, com o passo do backup no cabeçalho. Ele **não** é migration
de propósito: reset que entra em `db push` apaga o cenário de quem não pediu.

| Papel | Nome na tela | id |
| --- | --- | --- |
| Cliente | `[TESTE] Dinossauro Aposentado Previdência e Fósseis Ltda` | `8f9c2796-b9f3-4349-923b-b04e86bc6012` |
| Proprietária (PR) | `Farroupilha Comércio Ltda` | `29d31f73-8fbd-44c3-a856-81ddf7809378` |
| Controladora (CN) | `Jatobá Sementes S.A.` | `11c1394b-5bc7-4b93-a6f1-98a7fa64088b` |

Modelos de documento:

- Farroupilha (PR): **Contrato Social - (Agro)**
- Jatobá (CN): **Contrato Social - (Participações)**

O mesmo modelo serve à constituição e às alterações: os blocos da constituição
estão presos à flag `e_constituicao` e os da alteração à `e_alteracao`, e a
posição da peça na sucessão é que decide qual entra. Não procure um modelo
chamado "alteração contratual", ele não existe.

Sócios (pessoas físicas do cliente): `Lucas Nogueira`, `Marina Salgado`,
`Heitor Cardoso`.

### Bens elegíveis hoje (entram na constituição)

| Ref | Imóvel | Valor | Titularidade | Status |
| --- | --- | --- | --- | --- |
| BS 60 | Fazenda Pterodáctilo | R$ 1.480.000,00 | Lucas, 100% | Aprovado para 2ª Instancia |
| BS 61 | Fazenda Ossada Boa | R$ 733.333,33 | Lucas e Marina, 50/50 | Aprovado para 2ª Instancia |
| BS 62 | Sala Comercial Cratera | R$ 415.209,00 | Heitor, 100% | Aprovado para 2ª Instancia |

### Bens em reserva (para o aumento, no passo 11)

`BS 01`, `BS 02`, `BS 03`, `BS 08`, `BS 09`, todos em **Pendente**, todos com
destino à Farroupilha. `Pendente` não é status elegível, então eles ficam fora da
constituição até alguém aprová-los.

`BS 51` está fora da estruturação. Não encoste nele.

---

## 4. Duas armadilhas a respeitar durante a execução

Leia antes de começar. As duas produzem um resultado que **parece** defeito do
produto e é, na verdade, erro de condução da demonstração.

### A1. Registrar é o que fecha a peça. Validar não carimba nada.

"Validar versão" congela um rascunho. Quem carimba `documento_gerado_id` nos
movimentos e vira o status dos bens é **"Registrar na junta"**.

Consequência: enquanto uma AC estiver em rascunho, ela continua sendo a peça da
vez, e todo ato novo entra nela. **Não pule o registro entre uma AC e a
próxima.** Se pular o registro do passo 10, o aumento do passo 11 cai dentro da AC1 e a
demonstração passa a mostrar concatenação, que não é o comportamento em teste.

### A2. Não separe dois atos pendentes desmarcando evento no assistente.

`evento_mudanca_socios` carrega **todos** os movimentos pendentes em
`movimentoIds`, não só os que produziram o ingresso. Como o registro carimba os
movimentos das flags marcadas, deixar mudança de sócios ligada e desmarcar
aumento de capital carimba os aportes do aumento assim mesmo, e eles somem sem
nunca terem sido narrados.

Regra da demonstração: **um ato, uma AC, um registro.** Não desmarque nada no
assistente, a não ser que um passo mande.

---

## 5. Os passos

Rotas usadas:

- Quadro Societário: `/equipe/osg/work/quadro-societario`
- Gerar Documento: `/equipe/osg/work/gerar-documento`
- Diagnóstico Patrimonial: `/equipe/osg/work/diagnostico-patrimonial`

Na tela do Quadro Societário as empresas aparecem como **abas**, controladora
primeiro: `Jatobá Sementes S.A. (Controladora)` e depois
`Farroupilha Comércio Ltda (Proprietária)`.

Em todo passo, a prova mínima é um screenshot. Onde o roteiro pede texto
literal, transcreva o que está na tela, sem parafrasear.

---

### Passo 1. Ponto de partida: a Farroupilha propõe o quadro

**Gesto:** Quadro Societário → aba `Farroupilha Comércio Ltda`.

**Esperado:** a empresa ainda não tem movimentação, então a tela está no primeiro
estado, o de proposta:

- título do card: **Quadro proposto (3)**
- chip âmbar: **Ainda não gravado**
- botão: **Gravar quadro societário**, habilitado
- a tabela traz, em participação decrescente:

| Sócio | Quotas |
| --- | --- |
| Lucas Nogueira | 1.846.667 |
| Heitor Cardoso | 415.209 |
| Marina Salgado | 366.666 |

- KPI **Total de Quotas**: `2.628.542`
- KPI **Capital Social Total**: `R$ 2.628.542,00`
- KPI **Valor Nominal**: `R$ 1,00`

**Prova:** screenshot do card inteiro com os três KPIs e a tabela. Transcreva as
três linhas com as quotas.

**Já vale para V1:** neste momento **não deve** existir o card
"imóvel(is) aprovado(s) fora do capital". Ele é do segundo estado, e o quadro
ainda não foi gravado. Registre a ausência explicitamente.

> Os números vêm do rateio por fração de titularidade. Lucas leva o BS 60 inteiro
> (1.480.000) mais metade do BS 61 (366.667); Marina leva a outra metade
> (366.666, um a menos, que é o ajuste de arredondamento caindo na última linha);
> Heitor leva o BS 62 (415.209).

---

### Passo 2: Gravar o quadro de constituição

**Gesto:** clique em **Gravar quadro societário**. Abre um diálogo de
confirmação. Confirme em **Gravar**.

**Esperado:** toast `Quadro societário gravado`. A tela troca para o segundo
estado:

- título: **Lista de Sócios (3)**
- chip verde: **Quadro registrado, apurado da movimentação de quotas**
- aparece o botão **Transferir quotas para a controladora**
- os KPIs continuam nos mesmos números do passo 1

**Prova:** screenshot do toast e screenshot do card já no segundo estado.

**Ponto V1, de novo:** o card do aumento **continua não existindo**, porque todos
os bens elegíveis acabaram de entrar no capital. Registre a ausência.

---

### Passo 3: Contrato social da Farroupilha

**Gesto:** Gerar Documento → passo **Escolha o modelo** → `Contrato Social -
(Agro)` → passo **Escolha a empresa do contrato** → `Farroupilha Comércio Ltda`.

**Esperado:** a folha central compõe o contrato de constituição. A cláusula de
capital deve dizer **R$ 2.628.542,00** e as alíneas de integralização devem
descrever os **três imóveis** (matrículas 31.401, 31.402 e 31.403).

**Prova:** screenshot da folha. Transcreva a cláusula do capital e as alíneas dos
imóveis.

---

### Passo 4: Validar a versão

**Gesto:** no rail à direita, botão **Validar versão**. Confirme no diálogo, que
tem um botão com o mesmo rótulo.

**Esperado:** o rail troca de estado e passa a oferecer **Atualizar versão** e
**Registrar na junta**.

**Prova:** screenshot do rail depois de validar.

---

### Passo 5: Registrar o contrato social na junta

**Gesto:** botão **Registrar na junta**. Confirme no diálogo.

**Esperado:** o rail passa a mostrar o selo **Registrado na junta** e a frase
"Esta peça está travada: ela já produziu efeito e não se reescreve". Aparece o
botão **Gerar alteração contratual**.

**Prova:** screenshot do rail travado.

**Ponto V4, primeira metade.** O registro carimbou o ledger e virou os bens para
`Integralizado`. Confira as duas consequências:

1. Diagnóstico Patrimonial: `BS 60`, `BS 61` e `BS 62` agora estão em
   **Integralizado**. Screenshot.
2. Quadro Societário → Farroupilha: o card do aumento **continua sem aparecer**,
   porque `Integralizado` não é status elegível e não sobrou imóvel fora do
   capital. Screenshot.

Essa dupla é a prova de V4 e mais uma de V1.

---

### Passo 6: Constituir a Jatobá (controladora)

A Jatobá não tem bem nenhum: a constituição dela é em moeda, lançada à mão. Ela
não é PR, então a tela dela não propõe nada.

**Gesto:** Quadro Societário → aba `Jatobá Sementes S.A.` → botão **Registrar
movimento**. No modal:

- **Tipo do movimento**: `Aporte`
- **Quem recebe as quotas**: `Lucas Nogueira`
- **Quotas**: `500`
- botão **Registrar aporte**

Repita para `Marina Salgado`, também com `500` quotas.

**Esperado:** a Jatobá fica com **Lista de Sócios (2)**, total de `1.000` quotas
e capital `R$ 1.000,00`.

**Prova:** screenshot do quadro da Jatobá.

> O modal de movimento não pergunta forma de pagamento. Aporte sem bem é moeda
> corrente, que no banco é a ausência das outras colunas. É esperado.

---

### Passo 7: Contrato social da Jatobá

**Gesto:** Gerar Documento → modelo `Contrato Social - (Participações)` →
empresa `Jatobá Sementes S.A.` → **Validar versão** → **Registrar na junta**.

**Esperado:** rail travado, com o selo **Registrado na junta**.

**Prova:** screenshot.

> Os passos 6 e 7 não são opcionais. A transferência de quotas exige que **as
> duas** empresas tenham constitutivo registrado; sem isso o botão do passo 8
> fica desabilitado e a tela explica por quê.

---

### Passo 8: Concentrar as quotas na controladora

**Gesto:** Quadro Societário → aba `Farroupilha Comércio Ltda` → botão
**Transferir quotas para a controladora**. No modal:

- **Controladora**: `Jatobá Sementes S.A.`
- **Data do ato**: qualquer data
- botão **Transferir quotas**

**Esperado antes de gravar**, no bloco "O que será gravado":

- `3 cessão(ões) em Farroupilha Comércio Ltda: 2.628.542 quotas
  (R$ 2.628.542,00) para Jatobá Sementes S.A.`
- `3 aporte(s) em Jatobá Sementes S.A., integralizados com essas quotas:
  R$ 2.628.542,00`
- o bloco "Quadro da controladora depois do ato" listando Lucas, Marina e Heitor
- provavelmente um aviso âmbar de proporção, dizendo que o capital de
  constituição da controladora não some. **É esperado, não é erro.** Transcreva.

**Prova:** screenshot do modal inteiro **antes** de gravar, e o toast depois.

**Esperado depois de gravar:** a Farroupilha fica com **Lista de Sócios (1)**,
só a `Jatobá Sementes S.A.`, com 2.628.542 quotas. Lucas, Marina e Heitor saíram
do quadro porque foram a saldo zero.

**Prova:** screenshot do quadro da Farroupilha com um sócio só.

---

### Passo 9. AC1, a concentração

**Gesto:** Gerar Documento → modelo `Contrato Social - (Agro)` → empresa
`Farroupilha Comércio Ltda`. O rail está travado no contrato social registrado.
Clique em **Gerar alteração contratual**.

**Esperado no assistente (passo 1 de 2):** o título é "Gerar alteração
contratual" e o texto "O que mudou desde o registro". A lista deve trazer, **já
marcada e sem ninguém marcar nada**:

- cessão de quotas, com evidência do tipo `3 cessão(ões) somando 2.628.542 quotas`
- entrada ou retirada de sócio
- possivelmente mudança na administração

**Não deve** trazer aumento de capital nem integralização: o capital não mudou,
as quotas só trocaram de mão.

**Prova:** screenshot da lista de eventos com as evidências. Transcreva cada
evidência literalmente.

**Gesto:** **Continuar** → **Gerar alteração contratual**.

**Esperado:** a folha passa a compor a alteração ao vivo, com as resoluções dos
eventos marcados e o contrato consolidado ao final.

**Prova:** screenshot da folha, com a resolução de cessão visível.

---

### Passo 10: Registrar a AC1

**Gesto:** **Validar versão** (e confirmar) → **Registrar na junta** (e
confirmar).

**Esperado:** rail travado no selo **Registrado na junta**.

**Prova:** screenshot.

> Armadilha A1 mora aqui. Sem este registro, a AC1 continua sendo a peça da vez e
> o aumento do passo 12 cai dentro dela.

---

### Passo 11: Aprovar os imóveis do aumento e gravar o aumento

**Gesto, parte 1:** Diagnóstico Patrimonial → mude **`BS 01`** de `Pendente`
para `Aprovado`. Se quiser um segundo imóvel, use o `BS 03`, que tem duas
matrículas e composse, e exercita mais o rateio. O destino já é a Farroupilha,
não mexa nisso.

**Prova:** screenshot do bem com o status novo.

**Gesto, parte 2:** Quadro Societário → aba `Farroupilha Comércio Ltda`.

**Esperado, e este é o ponto V1:** agora aparece, **acima da lista de sócios**, o
card com:

- título: **1 imóvel(is) aprovado(s) fora do capital** (ou `2`, se aprovou dois)
- o texto explicando que foram aprovados depois da constituição
- botão **Registrar aumento de capital**

**Prova:** screenshot do card. É a prova positiva de V1, e junta com as três
ausências registradas nos passos 1, 2 e 5.

**Gesto, parte 3:** clique em **Registrar aumento de capital**. No modal:

- **Nome do ato**: deixe o default,
  `Aumento de capital por integralização de imóveis`
- **Data do ato**: qualquer data
- seção **Imóveis que entram (N)**: os imóveis vêm em leitura, com valor. Confira
  que só os recém-aprovados estão ali, e nenhum dos já integralizados.
- seção **Parcela em moeda corrente, por sócio**: digite, no campo de
  **Lucas Nogueira**, o valor **95.209,23**.

**Esperado antes de gravar, e este é o ponto V3.** No bloco "O que será gravado":

- a parcela em moeda de R$ 95.209,23 tem de virar **95.209 quotas**, e não
  95.209,23 nem 95.210
- a linha **Capital hoje** mostra `R$ 2.628.542,00`
- a linha **Aumento** mostra o valor dos imóveis mais `R$ 95.209,00` (o valor
  segue as quotas, e o resíduo de centavos não fica pendurado)
- a linha **Capital depois do ato** é a soma das duas

Com só o `BS 01` (R$ 250.000,00) aprovado, o esperado é:

| Linha | Valor |
| --- | --- |
| Capital hoje | R$ 2.628.542,00 |
| Aumento | R$ 345.209,00 |
| Capital depois do ato | R$ 2.973.751,00 |

**Prova:** screenshot do rodapé do modal **antes** de gravar, com as quatro
linhas legíveis. É a prova de V3, e ela é obrigatória: depois de gravar não dá
para reconstruir a conferência.

**Gesto, parte 4:** botão **Gravar aumento de capital**.

**Esperado:** toast `Aumento de capital gravado`. O card do aumento some (não há
mais imóvel elegível fora do capital) e a lista de sócios volta a ter **Lucas** e
a **Jatobá**, porque Lucas subscreveu e voltou ao quadro.

**Prova:** screenshot do quadro depois de gravar.

---

### Passo 12: A procedência na tabela

**Gesto:** ainda no Quadro Societário da Farroupilha, olhe a coluna de
procedência ao lado do nome do sócio, na linha do **Lucas Nogueira**.

**Esperado, e este é o ponto V2:** entre os rótulos de procedência do Lucas tem de
aparecer **`Aumento de capital por integralização de imóveis`**, que é o nome do
ato que ele nomeou no passo 11.

**Leia o esperado com cuidado**, porque a asserção ingênua aqui é errada. Lucas
**foi** fundador, e a tela agrega os rótulos de **todos** os movimentos dele nesta
empresa, não só os do saldo de hoje. Então é legítimo e esperado que a linha dele
traga três rótulos:

- `Constituição` (os aportes de constituição dele, no passo 2)
- `Subida das quotas da Farroupilha Comércio Ltda para a Jatobá Sementes S.A.`
  (a cessão do passo 8)
- `Aumento de capital por integralização de imóveis` (os aportes do passo 11)

O que **reprova V2** é a **ausência** do nome do ato: se o aumento tivesse sido
gravado sem ato societário, ele não teria nome nenhum para exibir e seria
absorvido pelo rótulo `Constituição`, e a linha do Lucas mostraria só
`Constituição` e a subida.

**Não procure uma "asserção limpa" na linha do Heitor.** Ele É fundador nesta
passagem: o BS 62 é dele e entra na constituição, no passo 2. Depois da
concentração ele sai do quadro (saldo zero) e só volta se um imóvel dele entrar
num aumento, o que não acontece aqui, porque o bem do passo 11 é do Lucas. A
linha dele provavelmente nem existe na tabela quando você chegar no passo 12.

Quem tem procedência para conferir é o **Lucas**, e a asserção correta é a de
cima: o nome do ato PRESENTE entre os rótulos dele.

**Prova:** screenshot com a linha do Lucas e os rótulos legíveis, mais a
transcrição literal de todos eles, na ordem em que aparecem.

**Confirmação cruzada:** role até o card **Atos societários** no fim da página. Ele
deve listar `Aumento de capital por integralização de imóveis` com a data e a
contagem de lançamentos. Screenshot.

> Por que isso importa: a procedência rotula como "Constituição" o prefixo de
> aportes sem ato. Numa PR cuja história é só aportes, um aumento gravado sem
> `ato_id` cairia nesse prefixo e a tela chamaria o aumento de capital de
> abertura. É o defeito que o ato societário evita, e este passo é o que prova
> que ele foi evitado.

---

### Passo 13. AC2, o aumento com o assistente acendendo sozinho

**Gesto:** Gerar Documento → modelo `Contrato Social - (Agro)` → empresa
`Farroupilha Comércio Ltda` → **Gerar alteração contratual**.

**Esperado no assistente, sem ninguém marcar nada:**

- **aumento de capital**, com evidência no formato
  `aumento de capital de R$ 2.628.542,00 para R$ 2.973.751,00`
- **integralização**, com evidência citando **as duas formas de pagamento**,
  algo como `2 aporte(s) integralizado(s) com bens, moeda corrente`
- **entrada ou retirada de sócio**, porque Lucas voltou ao quadro

**Prova:** screenshot da lista. Transcreva as três evidências literalmente. O
"de quanto para quanto" tem de bater com o rodapé do modal do passo 11.

**Gesto:** **Continuar** → **Gerar alteração contratual**.

**Esperado na folha:** a resolução do aumento com o delta, e as alíneas
descrevendo o imóvel **e** a parcela em moeda corrente, nesta ordem: os imóveis
do sócio primeiro, a parcela em dinheiro dele em seguida.

**Prova:** screenshot da folha. Transcreva a cláusula do delta e as alíneas.

---

### Passo 14: Registrar a AC2

**Gesto:** **Validar versão** → **Registrar na junta**.

**Esperado:** rail travado.

**Ponto V4, segunda metade:** volte ao Diagnóstico Patrimonial e confira que o
`BS 01` (e o `BS 03`, se usou) virou **Integralizado** sozinho, sem ninguém
editar o cadastro.

**Prova:** screenshot do bem com o status novo.

---

### Passo 15: A AC seguinte não repete o que já foi registrado

**Gesto:** ainda na tela Gerar, com a AC2 registrada, clique em **Gerar
alteração contratual** outra vez.

**Esperado, e este é o ponto V5:** o assistente abre com a lista **vazia**, ou ao
menos **sem** aumento de capital e **sem** integralização. Os movimentos daquele
ato já foram carimbados pela AC2 e não voltam.

**Prova:** screenshot da lista de eventos. Se vier algum evento, transcreva qual
e com que evidência: um evento repetido aqui **reprova V5** e é o achado mais
importante que a demonstração pode produzir.

**Gesto:** feche o assistente em **Cancelar**. Não gere peça vazia.

---

### Passo 16: A segunda concentração

**Gesto:** Quadro Societário → aba `Farroupilha Comércio Ltda` → botão
**Transferir quotas para a controladora** → controladora `Jatobá Sementes S.A.`
→ data.

**Esperado, e este é o ponto V6, o principal.**

O modal **não pode** mostrar a mensagem "A controladora já é sócia da
proprietária: as quotas já subiram". Se mostrar, V6 está reprovado e é o achado
central do relato.

O esperado é que ele monte o plano normalmente, subindo **só quem voltou ao
quadro**:

- `1 cessão(ões) em Farroupilha Comércio Ltda`, com as quotas do **Lucas**, e
  **não** os 2.628.542 do quadro inteiro
- a quantidade de quotas cedidas tem de bater com o valor cedido ao lado
- a **Jatobá não aparece cedendo**: ela não cede para si mesma
- no "Quadro da controladora depois do ato", as quotas do Lucas **somam** às que
  ele já tinha lá

**Prova:** screenshot do modal inteiro antes de gravar, com a contagem de cessões
e os valores legíveis. Transcreva as duas linhas do "O que será gravado".

**Gesto:** **Transferir quotas**.

**Esperado:** a Farroupilha volta a ter **Lista de Sócios (1)**, só a Jatobá.

**Prova:** screenshot.

---

### Passo 17. AC3, a nova concentração

**Gesto:** Gerar Documento → Farroupilha → **Gerar alteração contratual** →
**Continuar** → **Gerar alteração contratual** → **Validar versão** →
**Registrar na junta**.

**Esperado:** o assistente traz cessão de quotas e mudança de sócios (a retirada
do Lucas), e **não** traz aumento de capital. Ao final, rail travado.

**Prova:** screenshot do assistente e do rail travado.

Isso fecha o ciclo que a OSG descreveu: concentração, aumento com os sócios
voltando ao quadro, e nova concentração numa alteração contratual própria.

---

### Passo 18: a ordem errada não é possível (conferência que NÃO escreve nada)

Este passo é diferente de todos os anteriores: ele **não grava**. São quatro
conferências de leitura, sobre o estado em que os passos 1 a 17 já deixaram o
cliente. Pode ser executado sozinho, sem rodar a demonstração inteira, desde que
exista pelo menos uma peça registrada na junta.

**Nenhum clique deste passo grava.** Os botões que ele manda procurar estão
desabilitados: clicar não faz nada, e é justamente isso que se está medindo. Não
gere peça, não valide versão, não registre nada aqui.

O que está por trás: `docs/planos/blindagem-ordem-do-fluxo/plan.mdx`. A regra de
cada trava é uma função pura (`src/lib/osg/travaDoConstitutivo.ts`,
`travaDaSucessao.ts`, reunidas em `estadoDaSociedade.ts`), lida pela tela e
RELIDA pelo hook no instante de gravar.

#### 18.1 · A peça registrada, e os gestos que ela fecha (V7)

**Gesto:** Gerar Documento → modelo do contrato social → empresa **Jatobá
Sementes S.A.** (ou qualquer uma cujo contrato já foi registrado no passo 5 ou 7).

**Esperado no rail, os quatro juntos:**

1. o selo **Registrado na junta**;
2. **Validar versão** e **Atualizar versão** **presentes e desabilitados** — o
   ponto V7 é este: eles não podem ter sumido;
3. a frase, logo abaixo do selo, nomeando a sociedade: *"Jatobá Sementes S.A. já
   foi constituída: o contrato social dela está registrado na junta, e uma
   sociedade se constitui uma vez. Para mudar o que está registrado, gere uma
   alteração contratual a partir daquela peça."*;
4. **Gerar alteração contratual** habilitado, que é o caminho de saída.

**Prova:** screenshot do rail inteiro, com os dois botões cinzas visíveis, e a
transcrição literal da frase. Passe o mouse sobre **Validar versão** e confira
que o mesmo motivo aparece no tooltip do sistema.

> Conferido em 01/09/2026 no sandbox, cliente `[TESTE] Alteração Contratual
> Cenário Completo`, empresa `Ipê Amarelo Participações Ltda`: selo presente,
> `Validar versão [disabled]`, `Atualizar versão [disabled]`, `Gerar alteração
> contratual` habilitado, e a frase saiu nomeando a sociedade. Nesse cliente a
> folha está em erro de composição por outro motivo (`Seção não resolvida:
> {{#aportes}}`, anterior a esta frente), e mesmo assim a razão que a tela dá é a
> da ORDEM, e não a do erro: sobre peça registrada, consertar a folha não
> destravaria nada.

**Reprova V7** se qualquer um dos dois botões estiver ausente, ou se a frase
disser só "ação indisponível" e não o que falta.

#### 18.2 · A peça que já foi sucedida (V8)

**Aviso de reprodutibilidade, medido em 01/09/2026:** este caso **não é
alcançável pela navegação normal**, e isso é esperado. A tela resolve a peça da
vez como "o rascunho, se houver; senão o REGISTRADO mais recente" — então, numa
sociedade que já tem alteração registrada, quem aparece é a alteração, e ela
ainda não foi sucedida por ninguém. A peça antiga não volta a ser a cabeça.

A trava existe para a tela **velha**: o consultor com a aba aberta desde antes de
a alteração nascer, ou duas abas ao mesmo tempo. Por isso a segunda leitura dela
mora no hook (`papelDaRaiz`, em `useDocumentoGerado.ts`), que relê o banco antes
de carimbar `alterador`.

**Como reproduzir, se quiser prova de tela** (opcional, e **não** grava nada na
segunda aba): abra a tela Gerar numa aba **A**, com a peça registrada em cena e
"Gerar alteração contratual" habilitado. Numa aba **B**, gere e valide a
alteração daquela peça. Volte à aba **A** sem recarregar e observe.

**Esperado na aba A**, depois de o cache dela expirar ou de um foco na janela:
**Gerar alteração contratual** desabilitado, com a frase *"Esta peça já tem uma
alteração contratual gerada a partir dela, ainda em aberto. Continue naquela:
gerar outra faria duas peças descrevendo a mesma mudança."*, repetida em âmbar
logo abaixo do botão. Se a aba A ainda oferecer o gesto, clicar leva ao toast com
a mesma frase, e nada é gravado: é a segunda leitura do hook falando.

**Prova:** screenshot da aba A. **Reprova V8** se o gesto abrir o assistente e a
validação seguinte criar uma segunda peça apontando para o mesmo antecessor.

#### 18.3 · A folha declara onde você está (V9)

**Gesto:** nenhum. Olhe o alto da folha central, logo abaixo do título, em cada
uma das telas que você já abriu.

**Esperado:** uma linha curta declarando a peça, a situação e, quando houver, os
atos que ela formaliza:

| Situação da tela | Linha esperada |
| --- | --- |
| Contrato social ainda não validado | `Contrato social · ainda não validada · formalizando N atos pendentes` |
| Contrato social registrado | `Contrato social · registrada na junta` |
| AC compondo ao vivo (passo 13) | `1ª alteração · em composição, ainda não validada · formalizando 1 ato pendente` |
| AC validada, antes de registrar | `1ª alteração · rascunho · …` |

**Prova:** screenshot de duas delas, com a linha legível. O `N` do primeiro caso
é observação, não expectativa: transcreva o que a tela disser.

> Conferido em 01/09/2026 no sandbox: `[TESTE] Banana Quântica`, empresa `Rondon
> Administradora de Bens S.A.`, saiu `1ª alteração · em composição, ainda não
> validada` (sem atos pendentes a formalizar naquele momento); `[TESTE] Alteração
> Contratual Cenário Completo`, empresa `Ipê Amarelo`, saiu `1ª alteração ·
> registrada na junta`. A linha aparece **também** quando a folha não compõe, no
> cartão de erro: é ali que saber em que peça se está mais importa, porque é o
> que diz se consertar a folha destrava alguma coisa.

Isto é a metade "avisar" do plano: dois atos na mesma peça é legítimo e continua
permitido (a 2ª alteração da MMS Agro publica aumento e cessão no mesmo
instrumento). O que faltava era a peça **dizer** o que ela é, e foi a ausência
disso que fez uma peça com dois atos parecer que estava concatenando alterações.

#### 18.4 · O que este passo NÃO cobre

A folha em **erro de composição** fecha os três gestos de selagem, inclusive o
"Atualizar do cadastro" (que até 01/09/2026 recongelava o snapshot por cima do
erro). Provocar esse estado exige editar um bloco do modelo na Biblioteca, o que
**escreve**, e por isso está fora deste roteiro de leitura. A cobertura dele é
por teste (`GerarDocumento.test.tsx`, "o porteiro: folha em erro não é selada nem
registrada").

---

## 6. Formato do relato

Duas partes, nesta ordem.

### 6.1 Tabela passo a passo

Uma linha por passo, com a prova referenciada pelo nome do arquivo do
screenshot. Não resuma o observado: transcreva.

| Passo | Esperado | Observado | Prova | Veredito |
| --- | --- | --- | --- | --- |
| 0 · alvo do app | `vgzomuwnsdgrxbkyoavq.supabase.co` | | saída do `curl` | |
| 1 · quadro proposto | Lucas 1.846.667 · Heitor 415.209 · Marina 366.666 · total R$ 2.628.542,00 · sem card de aumento | | | |
| 2 · gravar quadro | toast, segundo estado, sem card de aumento | | | |
| … | | | | |
| 18 · travas de ordem | botões visíveis e travados, com motivo nomeando a sociedade | | screenshots do rail | |

Veredito por passo: `OK`, `DIVERGE` ou `BLOQUEADO`. Em `DIVERGE`, a coluna
Observado tem de trazer o texto literal da tela, não a sua interpretação dele.

### 6.2 Veredito por ponto de verificação

Um parágrafo curto para cada um dos seis, dizendo **provado** ou **reprovado**,
com o passo e a prova que sustentam:

| Ponto | Veredito | Prova |
| --- | --- | --- |
| V1 · card só com imóvel fora do capital | | passos 1, 2, 5 (ausência) e 11 (presença) |
| V2 · procedência traz o nome do ato | | passo 12 |
| V3 · centavos da moeda fecham pela regra da casa | | passo 11 |
| V4 · registrar carimba e tira o bem da lista | | passos 5 e 14 |
| V5 · a AC seguinte não repete eventos | | passo 15 |
| V6 · a segunda concentração é possível | | passo 16 |
| V7 · gesto fora de ordem fica visível e travado, com motivo | | passo 18 |
| V8 · peça sucedida não gera segunda alteração | | passo 18 |
| V9 · a folha declara peça, situação e atos | | passos 13 e 18 |

### 6.3 Regras do relato

- **Prova literal.** Todo número afirmado tem de vir de texto lido na tela, com
  screenshot. Não repita número deste roteiro como se fosse observação: o
  esperado está aqui, o observado tem de vir da tela.
- **Não conserte nada.** Se um passo falhar, capture, descreva e siga para o
  próximo que não dependa dele. Se depender, marque `BLOQUEADO` e diga por quê.
- **Não rode SQL de escrita**, nem "só para destravar". Se o cenário estiver
  fora do ponto de partida descrito na seção 3, pare e reporte: o reset é gesto
  de quem conduz, não do executor.
- **Divergência de valor é achado, não erro de execução.** Se o capital sair
  diferente do esperado, o achado é o número, não uma teoria sobre a causa.
