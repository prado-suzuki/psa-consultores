# Ensaio da reorganização societária

Roteiro de demonstração assistida do **ledger societário** e da **alteração
contratual derivada dele**: o quadro societário como acumulado de um livro de
movimentos, a subida das quotas para a controladora como um gesto só, e a peça
que formaliza os movimentos carimbando-os.

Script que executa este roteiro: `e2e/demos/ac-reorganizacao-societaria.mjs`.
Ele **mede e narra**; não corrige código de aplicação e não roda SQL. As únicas
escritas que faz são as da própria UI.

Irmão de [`ensaio-fluxo-alteracao-contratual.md`](./ensaio-fluxo-alteracao-contratual.md),
de 25/08/2026. Aquele demonstra o assistente na tela Gerar; este demonstra **de
onde vêm as respostas dele**. O plano por trás dos dois é
[`docs/planos/ledger-societario-e-alteracao-derivada.md`](../planos/ledger-societario-e-alteracao-derivada.md),
e este ensaio é a Frente 6 dele.

---

## 1. O que o ensaio prova, se der certo

Que o evento da alteração contratual **deixou de ser pergunta e virou
derivação**. Três afirmações, cada uma com evidência lida da tela:

1. O quadro societário tem **dois regimes**. Na constituição ele é o dado: a
   tela propõe a partir dos bens aprovados e o consultor grava. Depois dela
   ninguém digita quadro, e o saldo é a projeção de um livro de movimentos, com
   a **procedência** de cada linha dizendo de que ato ela veio.
2. A subida das quotas para a controladora é **um gesto**, com a aritmética
   conferida nas duas empresas antes de gravar, e com o **aviso de proporção**
   quando o capital de constituição da controladora não deixa o quadro dela
   reproduzir o da proprietária.
3. A peça que formaliza os movimentos os **carimba ao ser registrada na junta** —
   e, no mesmo gesto, os bens daqueles movimentos passam a 'Integralizado'.
   Depois do carimbo o evento deixa de aparecer como pendente, e a alteração
   seguinte começa do zero em vez de recontar a mesma história.

   *O gesto mudou em 27/08/2026 (D4 de
   [`derivacao-de-eventos-e-carimbo.md`](../planos/derivacao-de-eventos-e-carimbo.md)):
   era o "Validar versão", virou o "Registrar na junta". Por isso o roteiro tem
   onze passos, e o 10 e o 11 medem coisas diferentes — validar sela, registrar
   formaliza.*

---

## 2. O cenário, já semeado no sandbox

Migration `supabase/migrations/20260826215500_dev_ensaio_reorganizacao_estado_de_constituicao.sql`.

| | |
| --- | --- |
| Cliente | `[TESTE] Dinossauro Aposentado Previdência e Fósseis Ltda` (`8f9c2796-b9f3-4349-923b-b04e86bc6012`) |
| Proprietária (PR) | `Farroupilha Comércio Ltda` (`29d31f73-8fbd-44c3-a856-81ddf7809378`) |
| Controladora (CN) | `Jatobá Sementes S.A.` (`11c1394b-5bc7-4b93-a6f1-98a7fa64088b`) |
| Fundadores | Lucas Nogueira (`d7ce85da`) e Marina Salgado (`ac4de794`) |
| Modelos | `Contrato Social — Sociedade Limitada (Agro)` e `... (Participações)` |

**Estado de partida.** A controladora está no capital de **constituição** dela:
500 quotas para cada fundador, R$ 1.000,00, espelhando a MMS Participações. É
esse resíduo que o aporte da subida vai somar, e é dele que nasce o aviso de
proporção.

A proprietária está **de propósito sem quadro gravado**. Ela tem sete matrículas
aprovadas para integralização, cujos titulares são os mesmos dois fundadores, e a
tela PROPÕE o quadro de constituição a partir delas. Apertar "Gravar quadro
societário" é o **primeiro passo do ensaio**, não um pré-requisito dele:
reproduzir em SQL o rateio por bem e o arredondamento de `proporAportesIniciais`
duplicaria a regra em duas linguagens, e a primeira divergência de centavo
passaria despercebida justamente no cenário que existe para achar divergências.

Os fundadores precisam ser os titulares dos imóveis. A subida transfere para a
controladora as quotas que eles têm na proprietária, e essas quotas nascem dos
imóveis que eles integralizam: fundador diferente do titular quebraria o par.

---

## 3. Pré-requisitos

### 3.1 App rodando, apontando para o sandbox

O código das duas frentes vive em **`feat/alteracao-contratual-caminho-b`**. Fora
da `main` o `bun run dev` aponta para o sandbox, que é onde o cenário está
semeado. Confira a linha `➜ Supabase:` que o Vite imprime ao subir; para um
servidor que já está de pé, sem adivinhar:

```bash
curl -s http://localhost:8080/src/integrations/supabase/client.ts \
  | grep -oE 'https://[a-z]+\.supabase\.co' | sort -u
```

O ref do sandbox é `vgzomuwnsdgrxbkyoavq`. Prefira reusar o servidor da 8080 a
subir um segundo; se o seu estiver em outra porta, passe `AC_URL`. Ver
[`docs/geral/validar-no-app-rodando.md`](../geral/validar-no-app-rodando.md).

### 3.2 Login

Conta de equipe com a área **OSG** liberada. No sandbox, `user001@exemplo.dev` /
`devlocal123`. A tela `/equipe` pede email e senha primeiro; o seletor de área
vem depois.

### 3.3 Rotas

- Quadro Societário: `/equipe/osg/work/quadro-societario`
- Gerar Documento: `/equipe/osg/work/gerar-documento`

---

## 4. Como rodar

Da raiz do repositório:

```bash
node e2e/demos/ac-reorganizacao-societaria.mjs
```

Abre uma janela de verdade, em ritmo de plateia (`slowMo` 700ms mais pausas de 2
a 4 segundos nos momentos que importam), narra cada passo numerado no terminal e
numa tarja flutuante sobre a página, e grava vídeo. Os caminhos do vídeo, das
fotos e do `registro.json` saem impressos no fim, junto com a lista de
divergências acusadas.

Variáveis de ambiente, todas com default:

| Variável | Default | Para quê |
| --- | --- | --- |
| `AC_URL` | `http://localhost:8080` | Base do app |
| `AC_EMAIL` | `user001@exemplo.dev` | Login da equipe |
| `AC_PASSWORD` | `devlocal123` | Senha |
| `AC_CLIENTE` | `Dinossauro Aposentado` | Trecho do nome do cliente |
| `AC_PROPRIETARIA` | `Farroupilha` | A PR de onde as quotas saem |
| `AC_CONTROLADORA` | `Jatobá` | A CN que as recebe |
| `AC_MODELO_PR` | `Agro` | Trecho do modelo da proprietária |
| `AC_MODELO_CN` | `Participações` | Trecho do modelo da controladora |
| `AC_DATA_ATO` | `2023-12-28` | Data do ato da subida (a do caso MMS) |
| `AC_ATE_PASSO` | `11` | Para o roteiro neste passo |
| `AC_HEADLESS` | (vazio) | `1` roda sem janela e sem as pausas |
| `AC_OUT` | `.playwright-mcp/reorg-<timestamp>` | Pasta dos artefatos |

Convém rodar uma vez com `AC_HEADLESS=1 AC_ATE_PASSO=3` antes de rodar headed
para uma plateia: essa passada exercita os seletores todos do Quadro Societário e
**não escreve nada de irreversível** (ver a seção 7).

O ensaio **não entra na suíte do Vitest**: roda com `node`.

---

## 5. A ordem, e por que ela é essa

O `capitalAnterior` da resolução de aumento **não** sai do livro de movimentos:
sai do snapshot do documento que a peça substitui (`calcularHistoricoCapital`, em
`src/lib/templates/historicoCapital.ts`, lendo `selecao.sociedade.capitalValor`).

Consequência: **o contrato social tem de estar registrado antes do macro**, senão
o snapshot dele já traz o capital depois da subida e o delta sai zero. A primeira
versão deste ensaio invertia isso (macro antes dos contratos), e a inversão
degradava justamente a cláusula que o plano existe para produzir. A ordem é a do
caso MMS:

```
  gravar o quadro de constituição da PR
        │
        ▼
  registrar o contrato social das DUAS empresas
  (PR com o capital dela, CN com os R$ 1.000,00 de constituição)
        │
        ▼
  rodar o macro da subida
        │
        ▼
  gerar as DUAS alterações contratuais, a da PR primeiro
  (é ela que a peça da CN cita: "tramita em conjunto")
```

E é um **par de instrumentos**, não uma peça. O lado da controladora tem duas
coisas que o lado da proprietária não tem como mostrar, e são elas que fecham o
ensaio: o aumento de capital dela (o capital de constituição mais o que subiu) e a
alínea de integralização paga com **quotas de outra sociedade**, com a
proprietária qualificada por inteiro e a citação do processo conjunto.

---

## 5.1 Os onze passos, e o que se espera ver em cada um

Cada passo é uma pergunta que a demo responde com evidência lida da tela, não uma
asserção silenciosa. O que ela mede vai para o terminal, para a tarja e para o
`registro.json`.

**1. Login e cliente.**
`/equipe`, email e senha, botão "Entrar", botão da área **OSG**, depois
`/equipe/osg/work/quadro-societario` com o cliente escolhido na barra do topo.

**2. A proprietária propõe o quadro de constituição.**
Aba da Farroupilha. O cartão diz **"Quadro proposto"** e **"Ainda não gravado"**,
com os dois fundadores e o rateio pelos imóveis. O ensaio aperta **"Gravar quadro
societário"**, confirma, e o cartão vira **"Quadro registrado, apurado da
movimentação de quotas"**.

*Mede:* total de quotas e capital antes e depois. Têm de ser os mesmos: a
proposta e o quadro gravado são a mesma conta, uma em memória e outra no livro.
Numa segunda rodada o quadro já está gravado e o ensaio diz que está seguindo de
onde parou, marcando no registro que a comparação não é significativa.

**3. A procedência.**
Com o quadro gravado, cada linha ganha a etiqueta **"Constituição"** ao lado do
nome. A etiqueta vem de uma busca à parte (o livro de movimentos), então o ensaio
relê o quadro antes de conferir. A mesma novidade existe nas duas empresas: ele
vai à aba da Jatobá, lê o capital de constituição dela (1.000 quotas, R$
1.000,00) e volta. Essa leitura é o "antes" com que o passo 7 compara.

**4. O contrato social da proprietária.**
`/equipe/osg/work/gerar-documento`, modelo **"(Agro)"**, empresa Farroupilha.

O modelo pede mais que a empresa: ele tem um binding de registro único
(**"Imóvel"**, no bloco "Este modelo também precisa de:") e pode ter listas de
seleção múltipla com botão **"Concluir seleção"**. **A folha não aparece enquanto
qualquer um dos dois estiver em branco**, e o passo 2 da tela não conclui. O
ensaio escolhe o **primeiro** registro de cada papel, arbitrariamente de
propósito (o que ele demonstra é a derivação societária, não a curadoria do
imóvel) e registra o que escolheu, porque entra no documento.

Depois **"Validar versão"** e **"Registrar na junta"**, os dois idempotentes:
numa segunda rodada o documento já está no estado final e o ensaio só narra.

*Mede:* o capital que a folha **publica** (valor e total de quotas da cláusula de
capital). É esse número que vira `capitalAnterior` na alteração, porque é o que o
snapshot congela, e é ele que o passo 8 confronta.

> **Daqui em diante a passada deixa de ser reversível pela UI.** Registrar na
> junta não tem "desregistrar".

**5. O contrato social da controladora.**
O mesmo, com o modelo **"(Participações)"** e a Jatobá. A cláusula de capital tem
de dizer R$ 1.000,00 e 1.000 quotas, 500 para cada fundador. É o número que a
alteração dela vai citar como capital anterior.

**6. O macro da subida.**
Botão **"Transferir quotas para a controladora"** na aba da PR. No modal, a
controladora e a data, e nada mais. **Antes de gravar**, o ensaio lê e narra:

- o bloco **"O que será gravado"** (N cessões na PR, N aportes na CN, com os
  valores batendo dos dois lados);
- o bloco **"Quadro da controladora depois do ato"**;
- o **aviso de proporção**, quando aparece. Ele é o resíduo dos 500 de
  constituição que não some, e o texto tem de citar "alteração contratual
  própria": é essa frase que diz que a correção é uma peça, não um remendo no
  mesmo ato.

Se o modal acusar um `problema` (as quatro frases de `planejarSubidaDeQuotas`), o
ensaio o registra e segue. Se já houver ato societário na empresa, ele não repete
a subida.

**7. O par espelhado, e a reversão que ainda existe.**
Na PR os fundadores saíram e a Jatobá é a única sócia, com a procedência
apontando o ato. Na aba da Jatobá, os dois fundadores com o saldo somado, cada
linha com duas etiquetas: "Constituição" e o nome do ato. O cartão **"Atos
societários (N)"** aparece nas duas, com o **mesmo nome de ato**.

E o "Desfazer" **continua lá**, com os dois contratos já registrados. Isso não é
descuido, e a razão é mais fina do que parece: desde a D3 o contrato social
**também carimba** ao ser registrado, e os passos 4 e 5 estamparam os aportes de
**constituição**. Só que o carimbo pega o que estava pendente **naquele
instante**, e o ato da subida nasceu depois deles, no passo 6. Quem vai carimbá-lo
é a alteração contratual, ao ser registrada no passo 11. O ensaio narra isso e
**não clica**.

**8. A alteração contratual da proprietária.**
Na folha travada, **"Gerar alteração contratual"**. É o coração da demo: os
interruptores chegam **ligados**, cada um com a evidência embaixo ("aumento de
capital de R$ ... para R$ ...", "N cessão(ões) somando N quotas", "1 ingresso(s) e
2 retirada(s) no quadro societário"). O que o cadastro não sustenta continua na
lista, **desligado**, com "nada no cadastro registra este evento".

*Mede:* os seis rótulos e as seis evidências, comparados com a seção 3.3 do
plano. Do lado da proprietária o ledger sustenta **quatro** eventos (aumento de
capital, integralização, cessão, entrada e retirada de sócio) e não sustenta os
dois que saem de `audit_logs`. Qualquer divergência é **acusada** em voz alta.

O ensaio confirma o que o assistente propôs, **sem mexer em interruptor**: ele não
encena a escolha do consultor, mostra a derivação chegando à folha. Depois lê a
**cessão**, que tem de nomear cedente, cessionário e quantidade (antes ela só
publicava o quadro resultante).

*Mede também os três lugares em que o capital anterior aparece:* o capital que o
contrato publicou (passo 4), a evidência do assistente (que sai do livro) e o "de
R$ ..." da cláusula (que sai do snapshot). Ver a seção 6, porque a diferença entre
os dois últimos é esperada e tem explicação.

Por fim, **"Validar versão"**, que cria a alteração como documento próprio.
Validar **não** carimba nada: sela um rascunho. O carimbo é do passo 11.

**9. A alteração contratual da controladora.**
O mesmo, com "(Participações)" e a Jatobá. Do lado dela o ledger sustenta **três**
eventos (não há cessão: quem cedeu foi a proprietária), e são duas coisas que só
aqui aparecem:

- o **aumento de capital** dela, partindo dos R$ 1.000,00 que o contrato do passo
  5 publicou;
- a **alínea de integralização paga com quotas de outra sociedade**, com a
  Farroupilha qualificada por inteiro (CNPJ, sede, NIRE) e a citação de que a
  alteração dela tramita em conjunto com o presente instrumento.

O ensaio confere cada lado pelo que lhe cabe, e não pelo que caberia ao outro:
cessão só na proprietária, alínea de quotas só na controladora.

**10. Validada, e ainda sem carimbo.**
Duas medidas que só fazem sentido juntas, e que a corrida de 26/08/2026 não
conseguiu tomar:

- **"Rever os eventos" continua no rail.** Antes o botão vivia no ramo
  `alteracaoEmCurso` de `DocumentoCentroRail.tsx`, e esse ramo exige um documento
  **registrado** em cena: validada a peça, a head passava a ser ela e o botão
  desaparecia. Era o defeito 5, e sem ele não havia como provar a idempotência
  pelo caminho natural.
- **O ledger ainda está intacto.** No cartão "Atos societários", o ato segue
  oferecendo "Desfazer" e **não** está "Formalizado em documento". É a prova pelo
  avesso: o carimbo não aconteceu no gesto errado.

O ensaio também fotografa aqui o **status dos bens** em Diagnóstico Patrimonial.
É contra essa foto que o passo 11 mede o flip.

**11. Registrar na junta: as duas marcas, num gesto.**
A asserção mais valiosa do ensaio, e o gesto irreversível. Registrar carimba
`documento_gerado_id` nos movimentos dos eventos confirmados e, pelos `bem_id`
desses mesmos movimentos, vira o status do bem para 'Integralizado' (D5/D6). As
duas nascem juntas de propósito: em gestos separados elas divergiriam.

Três provas, cada uma num lugar diferente da tela:

| Onde | O que muda |
| --- | --- |
| **Ledger** — cartão "Atos societários" | onde havia "Desfazer" passa a haver **"Formalizado em documento"** |
| **Cadastro** — Diagnóstico Patrimonial | o bem daquele movimento passa a **'Integralizado'** e sai da lista de elegíveis |
| **Derivação** — assistente reaberto | o evento formalizado **perde a evidência**, e a próxima peça começa do zero |

O interruptor continua ligado, de propósito, porque a resposta gravada vence a
derivação; o que prova o carimbo é a **evidência sumir**.

Na passada padrão deste cenário a subida foi paga em **quotas**, não em bem, então
é esperado que **nenhum** bem mude de status no passo 11 — os bens de constituição
já tinham virado nos passos 4 e 5, quando os contratos sociais foram registrados.
O ensaio narra os dois casos e registra as duas listas (antes e depois) no
`registro.json`.

---

## 6. O que é defeito e o que é esperado

### Esperado, não relate como bug

- **O aviso de proporção aparecendo.** Ele é o desenho: o capital de constituição
  da controladora não some, e a correção é uma alteração contratual própria.
- **Resolução que entrou na composição e foi descartada por falta de dado.** O
  painel a nomeia em "N blocos não entraram". O ensaio conta folha mais
  descartadas e só reclama se a resolução não aparecer em lugar nenhum.
- **Endereço e administração desligados no assistente.** Nada foi mexido no
  cadastro dentro da janela: o cadastro não sustenta o evento, e o interruptor
  desligado com "nada no cadastro registra este evento" é a resposta correta.
- **"Desfazer" ainda disponível com os contratos sociais já registrados.** O
  registro deles carimbou os aportes de **constituição**; o ato da subida nasceu
  depois, no passo 6, e só a alteração registrada o formaliza (ver o passo 7).
- **Nenhum bem mudando de status no passo 11.** Nesta passada a subida foi paga em
  quotas, e os bens de constituição já viraram nos passos 4 e 5.
- **A consolidação da alteração deixando de descrever bens de atos anteriores.**
  Com o bem indo a 'Integralizado' no registro, a peça seguinte lista só os
  aportes que ela conta. Se isso é a redação desejada é pergunta aberta na §6 do
  plano — decisão de redação, não regressão.
- **Sem cessão do lado da controladora.** Quem cedeu foi a proprietária. Cada lado
  é conferido pelo que lhe cabe.
- **`Resolução: aumento do capital social: ele saiu em branco` no painel, na
  alteração da proprietária.** O bloco é condicional (`houveAumentoCapital`) e o
  capital dela não mudou: mudou de quem são as quotas. A cláusula calada é a
  resposta certa; o interruptor ligado é o defeito 3.
- **O interruptor continuar ligado depois do carimbo.** Ver o passo 11: o que
  prova o carimbo é a evidência sumir, não o interruptor desligar.
- **Ter de refazer cliente, modelo e empresa depois de navegar.** O
  `OsgWorkContext` é `useState` puro, por desenho atual.
- **Aportes pagos com imóvel, e não com quotas, no lado da proprietária.** A
  alínea que qualifica a PJ de origem é do lado da controladora.

### Sinal de defeito

- O total de quotas ou o capital **mudarem** entre a proposta e o quadro gravado.
- Linha do quadro **sem etiqueta de procedência** depois de gravado.
- O ato aparecendo **em uma empresa só**, ou com nome diferente nas duas.
- A proprietária **não ficar** com a controladora como única sócia depois da
  subida.
- O aviso de proporção **sem** a menção à "alteração contratual própria".
- Evento **ligado sem evidência**, ou **desligado com evidência**.
- A resolução de cessão **sem nomear** cedente e cessionário (lado da
  proprietária), ou a de integralização **sem alíneas** (nos dois lados).
- A integralização da **controladora** sem a alínea paga com quotas de outra
  sociedade, ou com a proprietária qualificada pela metade: é a cláusula que a
  Frente 2 do plano existe para produzir.
- O "de R$ ..." da cláusula de aumento **diferente** do capital que o contrato
  substituído publicou: aí não é diferença de fonte, é o snapshot errado.
- Evento formalizado que **continua com evidência** depois do carimbo: é a
  idempotência quebrada, e é o defeito mais caro que este ensaio pode achar.
- O ato **não** passar a "Formalizado em documento" no cartão de atos depois de
  **registrar** a alteração (passo 11): o carimbo não chegou ao ledger.
- O ato JÁ estar "Formalizado em documento" no passo 10, antes de registrar: o
  carimbo voltou para o "Validar versão", contra a D4.
- "Validar versão" ou "Registrar na junta" **habilitados** com a folha em erro de
  composição: é o porteiro do defeito 4 furado, e daí sai peça selada que não
  existe como texto.
- Bem que virou 'Integralizado' **sem** movimento carimbado, ou bem de movimento
  carimbado que **não** virou: a chave das duas marcas é o mesmo `bem_id` (D6).
- Folha inteira em erro depois de confirmar o assistente (placeholder não
  resolvido em algum bloco de resolução derruba a composição inteira).

---

## 7. O fecho: o que a demo desfaz, e o que não tem como desfazer

O ato societário é reversível pela UI **enquanto nenhum documento o formalizou**.
Daí a regra do fecho:

- **`AC_ATE_PASSO=3` ou menos:** nada de irreversível foi escrito. Só o quadro de
  constituição, que a migration de seed devolve.
- **`AC_ATE_PASSO` entre 4 e 10:** o fecho clica o mesmo "Desfazer" que o passo 7
  mostrou e não clicou, e o ato sai do livro nas duas empresas. Mas os contratos
  sociais dos passos 4 e 5 ficam registrados — e o registro deles carimbou os
  aportes de constituição e virou os bens deles para 'Integralizado'. Não há
  "desregistrar" na tela.
- **Passo 11:** as alterações estão registradas, os movimentos que elas contam
  estão carimbados e os bens deles foram para 'Integralizado'. Nada volta pela
  tela. O ensaio diz isso em voz alta no fim, em vez de fingir limpeza, e escreve
  no `registro.json` a lista do que ficou no banco.

O **quadro de constituição** gravado no passo 2 não volta em caso nenhum: os
aportes de constituição não pertencem a ato nenhum, e por isso não aparecem no
cartão que oferece a reversão.

### Voltar o cenário ao começo (comando de operador, fora da demo)

Reaplicar a migration de seed pelo CLI, contra o **sandbox**:

```bash
supabase db query --linked \
  -f supabase/migrations/20260826215500_dev_ensaio_reorganizacao_estado_de_constituicao.sql
```

**Isso basta apenas para uma passada que parou antes do passo 4.** O seed só
apaga movimento **sem** `documento_gerado_id`, de propósito: movimento já
formalizado por uma peça é história registrada, e apagá-lo deixaria a peça
descrevendo um ato que não existe mais. E o corte ficou mais cedo do que era:
desde a D3 o **contrato social** carimba ao ser registrado, então já a partir do
passo 4 há movimento com documento, que sobrevive ao seed. (Antes disso só a
alteração carimbava, e o corte era no passo 8.)

Para uma passada completa, o operador precisa soltar o carimbo e apagar as peças
antes. `movimentacao_quotas.documento_gerado_id` é a **única** FK para
`documento_gerado` sem `ON DELETE`; as demais são `CASCADE` ou `SET NULL`, de
modo que as respostas do assistente
(`projeto_flag_valor.documento_base_id`, `ON DELETE CASCADE`) e os lançamentos do
ato (`movimentacao_quotas.ato_id`, `ON DELETE CASCADE`) vão junto:

```sql
-- SANDBOX. Confira o ref do projeto antes de rodar.
update public.movimentacao_quotas
   set documento_gerado_id = null
 where cliente_id = '8f9c2796-b9f3-4349-923b-b04e86bc6012';

delete from public.documento_gerado
 where cliente_id = '8f9c2796-b9f3-4349-923b-b04e86bc6012';

delete from public.ato_societario
 where cliente_id = '8f9c2796-b9f3-4349-923b-b04e86bc6012';
```

E então reaplicar o seed acima.

---

## 8. Os defeitos que a corrida de 26/08/2026 achou

> **A lista com causa, custo e as decisões de conserto vive em
> [`docs/planos/derivacao-de-eventos-e-carimbo.md`](../planos/derivacao-de-eventos-e-carimbo.md).**
> O que fica aqui é o resumo do que o ensaio observa, para quem estiver lendo o
> roteiro antes de rodar.

Uma corrida assistida completa (as duas empresas, na ordem da seção 5) achou o
seguinte. Enquanto os dois primeiros existirem, o ensaio **não passa** do lado da
proprietária, e ele acusa em vez de morrer.

> **Todos os cinco foram consertados em 27/08/2026**, na ordem da D8. O que cada
> etapa fez está na seção 7 daquele plano. A lista abaixo fica como está — é o
> retrato do que a corrida observou, e é dela que a próxima corrida cobra a prova.

1. ~~**A alteração contratual do modelo "(Agro)" morre inteira**, com
   `Placeholder não resolvido: {{refs.capital_social}}`.~~ **CORRIGIDO em
   27/08/2026**, migration
   `20260827093000_ancora_capital_social_no_modelo_agro.sql`.

   As quatro resoluções semeadas citam `{{ refs.capital_social }}`, e a âncora
   `capital_social` só tinha sido posta no par de blocos de capital "moeda
   corrente" (a redação do modelo Participações) pela migration
   `20260826143800`. No "(Agro)" o bloco de capital é `Capital Social - Agro`,
   que integraliza imóveis e não moeda corrente, e ficou sem âncora. Âncora que
   ninguém publica não existe no contexto, e `render.ts` trata placeholder não
   resolvido como erro de composição, não como campo vazio: caía o documento
   inteiro.

   Auditoria no sandbox antes de corrigir, por modelo e por âncora, contando
   quem cita e quem publica: no "(Agro)", `capital_social` tinha **4 citações e
   0 publicações**; `sede_social` e `administracao_social` publicavam duas cada,
   nos dois modelos. Era o único caso. Diferente do "(Participações)", a âncora
   aqui vai num bloco **sem flag** (`Capital Social - Agro` entra na
   constituição e na consolidação), então a referência resolve nas duas sem
   precisar de gêmeo; o par do outro modelo precisava compartilhar a âncora
   porque os dois lados são mutuamente exclusivos por `e_constituicao` /
   `e_alteracao`.

   Conferido no app rodando: a folha compõe, `{{ refs.capital_social }}` resolve
   para "Cláusula Quinta" nas três citações, e nenhum placeholder cru sobra.

   **Fica pendente, e não é o que a migration trata:** o bloco do "(Agro)" está
   no futuro ("o capital social da empresa **será** de"), que é redação de
   constituição. Na consolidação de uma alteração o tempo devia ser o presente,
   como o par do "(Participações)" faz desde a Frente C (`20260826143600`).
   Corrigir isso pede o gêmeo de consolidação do bloco do "(Agro)".
   **FEITO em 27/08/2026**, migration
   `20260827180000_gemeo_consolidacao_capital_agro.sql` (etapa 5 da seção 7 do
   plano), junto da leitura retroativa que impede a flag nova de apagar a
   cláusula dos documentos já selados.
2. **A resolução de integralização da controladora rende vazia.** O cabeçalho
   sai ("Integralizam-se as quotas subscritas, nos termos e pelos valores
   abaixo:") e nenhuma alínea. Consequência: a alínea paga com **quotas de outra
   sociedade** não existe, e a palavra "Farroupilha" não aparece na peça inteira.
   É metade do item 3 da Frente 6.
3. **A evidência do assistente parte de R$ 0,00 nas duas empresas.** É o defeito
   mais espalhado dos cinco, e o único que fabrica evento que não aconteceu.
   `eventosDaAlteracao.ts` calcula `capitalAntes` sobre os movimentos que já têm
   `documento_gerado_id`, e os movimentos de **constituição nunca recebem
   carimbo**: validar um contrato social não carimba nada. Daí três efeitos
   juntos: "de R$ 0,00" no capital, "2 ingresso(s)" numa empresa onde ninguém
   ingressou, e as retiradas da proprietária ausentes ("1 ingresso(s)", sem as
   duas retiradas). A cláusula na folha acerta porque usa outro caminho
   (`calcularHistoricoCapital`, do snapshot).

   Um efeito colateral dele, achado ao conferir a correção do defeito 1: na
   alteração da **proprietária** a resolução de aumento aparece no painel como
   `Resolução: aumento do capital social: ele saiu em branco`. **Isso está
   certo.** O bloco é condicional desde a migration `20260826154321`
   (`{{#sociedade.houveAumentoCapital}}`, changelog "a resolução só entra quando
   houve aumento de fato"), e o capital da proprietária não mudou: o que mudou
   foi de quem são as quotas. O `capitalDelta` gravado no snapshot é `"0,00"`, e
   a cláusula se recusa a dizer que o capital aumentou zero. Quem está errado é o
   interruptor que chegou ligado, não a cláusula que se calou.
4. **A UI valida e sela peça que não renderiza**, e carimba o ledger a partir
   dela: o ato passou a "Formalizado em documento" apontando um documento em
   erro.
5. **Não há como reabrir o assistente depois de validar** — o que o passo 10
   agora mede como comportamento correto, depois do conserto.

Fora do produto, no ambiente:

- `e2e/renovarSessao.mjs` procura `.env.development{,.local}` e `.env`, e o
  arquivo do sandbox hoje é `.env.sandbox`: ele responde "nenhum .env aponta
  para vgzomuwnsdgrxbkyoavq".
- Um `401` do backend em `localhost:8000`
  (`/api/v1/osg/documentos/georreferenciamento`) faz a tela abrir o modal
  **"Sua sessão expirou"**, que não é a sessão do Supabase. O mesmo `401`
  explica o descarte do bloco de memorial descritivo do SIGEF.

---

## 9. Pendências conhecidas

Herdadas do ensaio irmão, e ainda válidas aqui:

- **Falta o bloco de consolidação.** O documento sai com as resoluções e, em
  seguida, o contrato inteiro, sem a frase que liga uma coisa à outra. O bloco
  teria de entrar quando **qualquer** evento estivesse marcado, e o motor só faz
  AND.
- **Não há "cancelar alteração" na UI.** Desmarcar tudo esvazia o documento novo
  mas não o desfaz.

Próprias desta frente:

- **A janela de `audit_logs` não é exercitada.** Endereço da sede e administração
  chegam desligados porque nada foi mexido no cadastro do cliente de teste dentro
  da janela. Para exercitá-los, o operador precisa mudar o endereço da
  Farroupilha em Qualificação das Partes **entre** o passo 7 e o passo 8; o
  ensaio então os acusaria como divergência da lista esperada, o que estaria
  correto: a lista esperada é a deste cenário, não a de todo cenário.
- **A comparação cláusula por cláusula com os quatro PDFs reais continua sendo
  trabalho de gente.** É o item 4 da Frente 6 do plano, e o ensaio serve de
  apoio: ele deixa no `registro.json` os textos que leu da folha (aumento, cessão
  e integralização, das duas empresas).
- **O ensaio não exercita a renúncia ao direito de preferência nem a
  administração por não sócios.** As duas aparecem nos instrumentos reais (seção
  2.2 do plano) e não estão no roteiro.
