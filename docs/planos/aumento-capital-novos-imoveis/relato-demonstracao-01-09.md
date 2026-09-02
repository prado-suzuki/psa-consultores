# Relato da demonstração: aumento de capital por novos imóveis (01/09/2026)

Executado no app rodando em `http://localhost:8080`, branch `feat/papeis-de-documento`,
cliente `[TESTE] Dinossauro Aposentado Previdência e Fósseis Ltda`.

Prova do alvo, primeiro gesto da sessão, saída literal do `curl` da seção 2.1:

```
https://vgzomuwnsdgrxbkyoavq.supabase.co
```

Sandbox. Nenhum SQL foi executado, de leitura nem de escrita. Nenhum arquivo de
`src/` foi tocado.

Registro estruturado: `e2e/dados/demo-aumento-capital-01-09-v4.json`.
Artefatos: `.playwright-mcp/demo-aumento-capital-01-09/`.

---

## 1. O que deu errado

Cinco itens. O primeiro é o único que muda documento de cliente.

### A1 · Registrar na junta reescreve a cláusula de retirada de sócio e quebra a frase

**Passos 10 e 17.** Uma peça registrada não deveria mudar de texto. Ela muda, e muda
para pior: some o verbo da oração.

O par de downloads da AC1 (concentração) difere em 6 palavras, e são estas:

Antes de "Registrar na junta" (versão validada, `p10-ac1-concentracao-antes-registro.docx`):

> CLÁUSULA SEGUNDA: Em virtude das cessões e transferências descritas nas cláusulas
> anteriores, **por terem cedido** a totalidade de suas quotas, **os sócios** LUCAS
> NOGUEIRA , HEITOR CARDOSO e MARINA SALGADO **retiram-se** da sociedade.

Depois de "Registrar na junta" (`p10-ac1-concentracao-depois-registro.docx`):

> CLÁUSULA SEGUNDA: Em virtude das cessões e transferências descritas nas cláusulas
> anteriores,  a totalidade de suas quotas,  LUCAS NOGUEIRA , HEITOR CARDOSO e MARINA
> SALGADO  da sociedade.

O mesmo acontece na AC3, no singular: somem `por ter cedido`, `o sócio` e `retira-se`.

Não é artefato do `.docx`. A tela da 3ª alteração registrada, lida agora, diz:

> CLÁUSULA SEGUNDA: Em virtude das cessões e transferências descritas nas cláusulas
> anteriores,  a totalidade de suas quotas,  LUCAS NOGUEIRA  da sociedade.

Prova: `diff` palavra a palavra dos dois pares (`p10-*` e `p17-*`) e o screenshot
`achado-01-clausula-segunda-quebrada-depois-do-registro.png`.

Os pares que **não** mudaram nada entre antes e depois do registro: contrato social da
Farroupilha (0 palavras), contrato social da Jatobá (0), AC2 do aumento (0). Só as duas
peças que têm cláusula de retirada de sócio quebram. Contorno da causa: os três trechos
que somem são exatamente os que dependem da lista de sócios que se retiram, e essa lista
some quando o registro carimba os movimentos.

### A2 · O gesto barrado na aba velha falha em silêncio

**Passo 18.2.** O roteiro esperava, na aba A, "Gerar alteração contratual" desabilitado
com a frase *"Esta peça já tem uma alteração contratual gerada a partir dela, ainda em
aberto..."*, ou, se o gesto ainda estivesse oferecido, um toast com a mesma frase.

Observado, com a aba A parada na Jatobá registrada e a aba B tendo gerado e validado a
alteração dela: o botão continuou **habilitado**, o assistente **abriu** com a lista de
eventos, e o "Gerar alteração contratual" do passo 2 **não disparou requisição nenhuma**
(`waitForResponse` de POST/PATCH por 20s devolveu `n/a`), o modal fechou e **nenhuma
mensagem apareceu na tela** — busca por `já tem uma alteração contratual gerada` no
`innerText` da página inteira: ausente.

O efeito protegido está certo: depois de recarregar a aba A, a Jatobá tem **uma** peça,
`1ª alteração · rascunho`. Nenhuma segunda peça nasceu. O que falta é a tela dizer por quê.

Prova: `p18-aba-a-depois-do-gesto-uma-so-peca.png`.

### A3 · A frase da trava, sobre alteração registrada, fala em constituição

**Passos 10, 14 e 17.** Com a 1ª, a 2ª e a 3ª alteração registradas em cena, o rail diz,
literalmente:

> Farroupilha Comércio Ltda já foi constituída: o contrato social dela está registrado na
> junta, e uma sociedade se constitui uma vez. Para mudar o que está registrado, gere uma
> alteração contratual a partir daquela peça.

A peça em cena é a alteração, não o contrato social. A frase é a correta para o caso do
18.1 (contrato social registrado) e é reaproveitada sem ajuste para a alteração.

### A4 · Divergência de copy contra o roteiro, no passo 5

O roteiro espera, no rail travado, *"Esta peça está travada: ela já produziu efeito e não
se reescreve"*. Essa frase não existe na tela. O que sai é a frase do V7, nomeando a
sociedade (transcrita em A3). Não é defeito do produto: é o roteiro que está com a copy
antiga. Registrado aqui porque a instrução manda dizer onde encontrei divergência.

### A5 · 401 no backend local de georreferenciamento

Único erro de console da sessão inteira, repetido por matrícula, ao compor a folha:

```
Failed to load resource: the server responded with a status of 401 (Unauthorized)
@ http://localhost:8000/api/v1/osg/documentos/georreferenciamento?matricula_i...
```

Sem efeito visível: a folha compôs e os imóveis saíram descritos com perímetro e
confrontações. É o backend local não autenticado, não a frente em teste.

---

## 2. Tabela passo a passo

| Passo | Esperado | Observado | Prova | Veredito |
| --- | --- | --- | --- | --- |
| 0 · alvo do app | `vgzomuwnsdgrxbkyoavq.supabase.co` | `https://vgzomuwnsdgrxbkyoavq.supabase.co` | saída do `curl` acima | OK |
| 1 · quadro proposto | Lucas 1.846.667 · Heitor 415.209 · Marina 366.666 · total R$ 2.628.542,00 · sem card de aumento | `Quadro proposto (3)` · `Ainda não gravado` · `Gravar quadro societário` · `Lucas Nogueira 1.846.667 R$ 1.846.667,00 70,25%` · `Heitor Cardoso 415.209 R$ 415.209,00 15,80%` · `Marina Salgado 366.666 R$ 366.666,00 13,95%` · `Total 2.628.542 R$ 2.628.542,00 100,00%` · `VALOR NOMINAL R$ 1,00`; nenhuma ocorrência de "fora do capital" | `p01-quadro-proposto-farroupilha.png` | OK |
| 2 · gravar quadro | toast, segundo estado, sem card de aumento | diálogo `Gravar o quadro de constituição / 3 sócio(s) e 2.628.542 quotas (R$ 2.628.542,00) entram como aporte de constituição...`; HTTP 201; toast `Quadro societário gravado`; `Lista de Sócios (3)` · `Quadro registrado, apurado da movimentação de quotas` · `Transferir quotas para a controladora`; nenhuma ocorrência de "fora do capital" | `p02-quadro-gravado-farroupilha.png` | OK |
| 3 · contrato social Farroupilha | capital R$ 2.628.542,00, três imóveis | `CLÁUSULA QUINTA:   O capital social da empresa será de R$ 2.628.542,00 (dois milhões, seiscentos e vinte e oito mil, quinhentos e quarenta e dois reais), dividido em 2.628.542 ... quotas, no valor nominal de R$ 1,00 (um real) cada uma`; Parágrafo Segundo alínea a) matrícula 31.401 R$ 1.480.000,00, alínea b) 50,000% da matrícula 31.402 R$ 366.666,67; Parágrafo Terceiro alínea a) matrícula 31.403 R$ 415.209,00; Parágrafo Quarto alínea a) 50,000% da 31.402 | `p03-folha-contrato-farroupilha.png` | OK |
| 4 · validar versão | rail passa a Atualizar versão + Registrar na junta | HTTP 201; rail com `Atualizar versão`, `Atualizar do cadastro`, `Registrar na junta`; linha `Contrato social · rascunho · formalizando 4 atos pendentes` | `p04-rail-validado-farroupilha.png` | OK |
| 5 · registrar contrato social | selo, bens em Integralizado, sem card de aumento | HTTP 200; `Registrado na junta` + a frase de A3/A4; `Validar versão [disabled]`, `Atualizar versão [disabled]`, `Gerar alteração contratual` habilitado; Diagnóstico: `BS 60 ... Integralizado`, `BS 61 ... Integralizado`, `BS 62 ... Integralizado`; quadro sem "fora do capital" | `p05-rail-registrado-farroupilha.png`, `p05-diagnostico-bs60-61-62-integralizado.png`, `p05-quadro-farroupilha-sem-card-aumento.png` | OK (copy diverge do roteiro, ver A4) |
| 6 · constituir a Jatobá | 2 sócios, 1.000 quotas, R$ 1.000,00 | 2 aportes HTTP 201; `Lista de Sócios (2)` · `Lucas Nogueira 500 R$ 500,00 50,00%` · `Marina Salgado 500 R$ 500,00 50,00%` · `Total 1.000 R$ 1.000,00 100,00%` · `CAPITAL SOCIAL TOTAL R$ 1.000,00` | `p06-quadro-jatoba-constituicao.png` | OK |
| 7 · contrato social Jatobá | rail travado | HTTP 201 validar, HTTP 200 registrar; `Registrado na junta` + `Jatobá Sementes S.A. já foi constituída: ...`; linha `Contrato social · registrada na junta` | `p07-rail-registrado-jatoba.png` | OK |
| 8 · concentrar quotas | 3 cessões de 2.628.542, quadro fica com 1 sócio | modal: `3 cessão(ões) em Farroupilha Comércio Ltda: 2.628.542 quotas (R$ 2.628.542,00) para Jatobá Sementes S.A..` / `3 aporte(s) em Jatobá Sementes S.A., integralizados com essas quotas: R$ 2.628.542,00.`; aviso âmbar: `O capital de constituição da controladora não some, então o quadro dela não reproduz a proporção da proprietária (Lucas Nogueira: 70,254% na proprietária, 70,247% na controladora; ...)`; HTTP 201; toast `Quotas transferidas para a controladora`; `Lista de Sócios (1)` = `Jatobá Sementes S.A. 2.628.542 R$ 2.628.542,00 100,00%`, procedência `Subida das quotas da Farroupilha Comércio Ltda para a Jatobá Sementes S.A.` | `p08-modal-transferir-antes-gravar.png`, `p08-quadro-farroupilha-um-socio.png` | OK |
| 9 · AC1 assistente + folha | cessão marcada, sem aumento nem integralização | marcados: `Houve cessão de quotas entre sócios ou para terceiro · 3 cessão(ões) somando 2.628.542 quotas`, `Houve mudança na administração da sociedade · 2 administrador(es) passa(m) a administrar sem estar no quadro societário`, `Houve entrada ou retirada de sócio · 1 ingresso(s) e 3 retirada(s) no quadro societário`; desmarcados com `nada no cadastro registra este evento`: endereço, **aumento de capital**, **integralização**; folha: `CLÁUSULA PRIMEIRA: Formaliza-se a cessão e transferência de quotas ... i) LUCAS NOGUEIRA ... cede e transfere 1.846.667 ... quotas ... a JATOBÁ SEMENTES S.A.`; linha `1ª alteração · em composição, ainda não validada · formalizando 3 atos pendentes` | `p09-assistente-ac1-eventos.png`, `p09-folha-ac1-cessao.png` | OK |
| 10 · registrar AC1 | rail travado | HTTP 201 validar, HTTP 200 registrar; `1ª alteração · registrada na junta` | `p10-rail-ac1-registrada.png` | **DIVERGE** — o texto da CLÁUSULA SEGUNDA mudou com o registro (A1) |
| 11 · aprovar BS 01 e gravar aumento | card aparece; 95.209 quotas; capital depois R$ 2.973.751,00 | BS 01 `Pendente` → `Aprovado`, HTTP 200, linha `BS 01 Imóvel Rural Imóvel A3B8FE R$ 250.000,00 — Aprovado`; card `1 imóvel(is) aprovado(s) fora do capital` + `Aprovados no Diagnóstico Patrimonial depois da constituição, eles ainda não entraram no capital desta empresa. Registre o aumento para que a próxima alteração contratual o publique.`; modal `IMÓVEIS QUE ENTRAM (1) · Imóvel A3B8FE · Matrícula 2.424 · Lucas do Rio Verde/MT · Lucas Nogueira · R$ 250.000,00`; com `95.209,23` no campo do Lucas, o rodapé lê `2 lançamento(s) de aporte, em um ato` / `345.209 quotas` / `Capital hoje R$ 2.628.542,00` / `Aumento R$ 345.209,00` / `Capital depois do ato R$ 2.973.751,00`; HTTP 201; toast `Aumento de capital gravado`; card do aumento some; `Lista de Sócios (2)` = Lucas 345.209 (11,61%) + Jatobá 2.628.542 (88,39%) | `p11-bs01-aprovado.png`, `p11-card-aumento-presente.png`, `p11-modal-aumento-antes-gravar.png` | OK |
| 12 · procedência | nome do ato presente na linha do Lucas | linha do Lucas, na ordem em que aparece: `Constituição` / `Subida das quotas da Farroupilha Comércio Ltda para a Jatobá Sementes S.A.` / `Aumento de capital por integralização de imóveis`; card `Atos societários (2)` com `Subida das quotas ... 01/09/2026 · 3 lançamento(s) nesta empresa · Formalizado em documento` e `Aumento de capital por integralização de imóveis · 01/09/2026 · 2 lançamento(s) nesta empresa` | `p12-quadro-procedencia-lucas-e-atos.png` | OK |
| 13 · AC2 assistente + folha | aumento, integralização e entrada acesos sozinhos | marcados: `Houve aumento do capital social · aumento de capital de R$ 2.628.542,00 para R$ 2.973.751,00`, `Houve integralização de capital (em imóveis, quotas ou dinheiro) · 2 aporte(s) integralizado(s) com bens, moeda corrente`, `Houve entrada ou retirada de sócio · 1 ingresso(s) no quadro societário`; folha: `CLÁUSULA PRIMEIRA: Aumenta-se o capital social em R$ 345.209,00 ..., de modo que o capital social anterior de R$ 2.628.542,00 ... passará a ser de R$ 2.973.751,00 ...`; `CLÁUSULA SEGUNDA: ... i) pelo sócio LUCAS NOGUEIRA, no valor total de R$ 345.209,00 ... a) Um imóvel rural ... matrícula de nº 2.424 ... pelo valor de R$ 250.000,00 ... b) em moeda corrente nacional, no valor de R$ 95.209,00 ...`; linha `2ª alteração · em composição, ainda não validada · formalizando 2 atos pendentes` | `p13-assistente-ac2-eventos.png`, `p13-folha-ac2-aumento.png` | OK |
| 14 · registrar AC2 | rail travado, BS 01 vira Integralizado sozinho | HTTP 200; `2ª alteração · registrada na junta`; Diagnóstico: `BS 01 Imóvel Rural Imóvel A3B8FE R$ 250.000,00 — Integralizado`, com `BS 02` e `BS 03` ainda em `Pendente` | `p14-rail-ac2-registrada.png`, `p14-diagnostico-bs01-integralizado.png` | OK |
| 15 · AC seguinte não repete | lista vazia | os seis eventos vieram `unchecked`, todos com evidência `nada no cadastro registra este evento` | `p15-assistente-lista-vazia.png` | OK |
| 16 · segunda concentração | 1 cessão, só o Lucas, sem a recusa | `1 cessão(ões) em Farroupilha Comércio Ltda: 345.209 quotas (R$ 345.209,00) para Jatobá Sementes S.A..` / `1 aporte(s) em Jatobá Sementes S.A., integralizados com essas quotas: R$ 345.209,00.`; `QUADRO DA CONTROLADORA DEPOIS DO ATO · Lucas Nogueira 2.192.376 quotas · R$ 2.192.376,00`; a Jatobá não aparece cedendo; nenhuma ocorrência de "A controladora já é sócia da proprietária"; HTTP 201; `Lista de Sócios (1)` = Jatobá 2.973.751 | `p16-modal-segunda-concentracao-antes-gravar.png`, `p16-quadro-farroupilha-so-jatoba.png` | OK |
| 17 · AC3 | cessão e retirada, sem aumento | marcados: `Houve cessão de quotas entre sócios ou para terceiro · 1 cessão(ões) somando 345.209 quotas`, `Houve mudança na administração da sociedade · 2 administrador(es) ...`, `Houve entrada ou retirada de sócio · 1 retirada(s) no quadro societário`; `Houve aumento do capital social · nada no cadastro registra este evento`; folha: `CLÁUSULA PRIMEIRA: ... i) LUCAS NOGUEIRA ... cede e transfere 345.209 ... quotas ... a JATOBÁ SEMENTES S.A.`; HTTP 201 validar, HTTP 200 registrar; `3ª alteração · registrada na junta` | `p17-assistente-ac3-eventos.png`, `p17-rail-ac3-registrada.png` | **DIVERGE** — mesma quebra do A1 na CLÁUSULA SEGUNDA |
| 18.1 · travas de ordem (V7) | botões visíveis e travados, com motivo nomeando a sociedade | Jatobá: `Registrado na junta`; `Validar versão` `disabled=true`, `Atualizar versão` `disabled=true`, ambos com `title` = *"Jatobá Sementes S.A. já foi constituída: o contrato social dela está registrado na junta, e uma sociedade se constitui uma vez. Para mudar o que está registrado, gere uma alteração contratual a partir daquela peça."*; `Gerar alteração contratual` habilitado | `p18-rail-jatoba-travas-visiveis.png` | OK |
| 18.2 · peça sucedida (V8) | gesto travado com a frase, ou toast com ela | gesto habilitado, assistente abriu, gerar não disparou requisição (`n/a`), modal fechou sem mensagem; nenhuma segunda peça nasceu (`1ª alteração · rascunho`, uma só, depois do reload) | `p18-aba-a-depois-do-gesto-uma-so-peca.png` | **DIVERGE** (efeito certo, aviso ausente — A2) |
| 18.3 · a folha declara (V9) | linha com peça, situação e atos | `Contrato social · ainda não validada · formalizando 4 atos pendentes`; `Contrato social · rascunho · formalizando 4 atos pendentes`; `Contrato social · registrada na junta`; `1ª alteração · em composição, ainda não validada · formalizando 3 atos pendentes`; `1ª alteração · rascunho · formalizando 3 atos pendentes`; `1ª alteração · registrada na junta`; `2ª alteração · em composição, ainda não validada · formalizando 2 atos pendentes`; `2ª alteração · registrada na junta`; `3ª alteração · em composição, ainda não validada · formalizando 1 ato pendente`; `3ª alteração · registrada na junta` | `p03-*`, `p04-*`, `p13-*`, `p18-*` | OK |

Placar: **16 OK**, **3 DIVERGE** (passos 10, 17 e 18.2), **0 BLOQUEADO**.

---

## 3. Veredito por ponto de verificação

| Ponto | Veredito | Prova |
| --- | --- | --- |
| V1 · card só com imóvel fora do capital | **provado** | três ausências e uma presença. Passos 1, 2 e 5: `"fora do capital"` não ocorre no `innerText` da tela em nenhum dos três momentos. Passo 11, depois de aprovar o BS 01: `1 imóvel(is) aprovado(s) fora do capital` + `Registrar aumento de capital`. E some de novo assim que o aumento é gravado. |
| V2 · procedência traz o nome do ato | **provado** | a linha do Lucas no passo 12 traz os três rótulos, e o do meio é o do ato que ele nomeou: `Constituição` / `Subida das quotas da Farroupilha Comércio Ltda para a Jatobá Sementes S.A.` / `Aumento de capital por integralização de imóveis`. O aumento não foi absorvido por `Constituição`. Confirmação cruzada no card `Atos societários (2)`, que lista `Aumento de capital por integralização de imóveis · 01/09/2026 · 2 lançamento(s) nesta empresa`. |
| V3 · centavos da moeda fecham pela regra da casa | **provado** | com `95.209,23` digitado no campo do Lucas, o rodapé do modal, antes de gravar, lê `345.209 quotas` (250.000 do imóvel + 95.209 da moeda), `Capital hoje R$ 2.628.542,00`, `Aumento R$ 345.209,00`, `Capital depois do ato R$ 2.973.751,00`. Nada de `95.209,23` nem de `95.210`. Fecha no documento: a alínea sai `b) em moeda corrente nacional, no valor de R$ 95.209,00 (noventa e cinco mil, duzentos e nove reais).` |
| V4 · registrar carimba e tira o bem da lista | **provado** | passo 5: depois de registrar o contrato social, `BS 60`, `BS 61` e `BS 62` aparecem em `Integralizado` no Diagnóstico, e o card do aumento não volta. Passo 14: depois de registrar a AC2, `BS 01 ... Integralizado` sem ninguém abrir o cadastro do bem. Os atos ficam marcados `Formalizado em documento` no card de Atos societários. |
| V5 · a AC seguinte não repete eventos | **provado** | passo 15, com a AC2 registrada: os seis eventos vieram `unchecked` e todos com a evidência `nada no cadastro registra este evento`. Nenhum aumento, nenhuma integralização, nada. |
| V6 · a segunda concentração é possível | **provado** | passo 16: nenhuma ocorrência de `A controladora já é sócia da proprietária` no modal. O plano montou com `1 cessão(ões) em Farroupilha Comércio Ltda: 345.209 quotas (R$ 345.209,00)` — só o que o Lucas tinha, não os 2.628.542 do quadro; a Jatobá não aparece cedendo; e no quadro da controladora o Lucas fica com `2.192.376 quotas`, que é a soma de 1.847.167 (passo 8) com 345.209. |
| V7 · gesto fora de ordem fica visível e travado, com motivo | **provado** | passo 18.1, Jatobá: os dois botões estão **presentes** e `disabled=true`, e o `title` de cada um traz a frase nomeando a sociedade, palavra por palavra como o roteiro previu. `Gerar alteração contratual` fica habilitado, que é o caminho de saída. Observação em A3: a mesma frase é reaproveitada quando a peça em cena é uma alteração, e aí ela fala de constituição sem necessidade. |
| V8 · peça sucedida não gera segunda alteração | **provado com ressalva** | o efeito está garantido: na aba velha, o "Gerar alteração contratual" não emitiu requisição nenhuma e, depois do reload, a Jatobá tem uma única peça (`1ª alteração · rascunho`). Nenhuma segunda peça apontando para o mesmo antecessor. A ressalva é o aviso: o botão não ficou desabilitado, o assistente abriu, e o gesto morreu em silêncio, sem a frase esperada (A2). Sintoma morto, aceite não fechado. |
| V9 · a folha declara peça, situação e atos | **provado** | dez linhas distintas colhidas ao longo da passagem, cobrindo as quatro situações da tabela do roteiro. A contagem de atos é observação: a peça de constituição da Farroupilha declarou `formalizando 4 atos pendentes` (quatro aportes), a da Jatobá `2`, a AC1 `3`, a AC2 `2` e a AC3 `1` — a linha conta lançamentos pendentes, não atos societários. |

---

## 4. Arquivos baixados

Todos em `/home/bernardo/Documentos/repos/psa-consultores/.playwright-mcp/demo-aumento-capital-01-09/`.

| Arquivo | Bytes | Momento | Palavras diferentes do par |
| --- | --- | --- | --- |
| `p04-farroupilha-contrato-social-antes-registro.docx` | 22030 | validada, antes de registrar | — |
| `p05-farroupilha-contrato-social-depois-registro.docx` | 22031 | depois de registrar | **0** |
| `p07-jatoba-contrato-social-antes-registro.docx` | 20563 | validada, antes de registrar | — |
| `p07-jatoba-contrato-social-depois-registro.docx` | 20562 | depois de registrar | **0** |
| `p10-ac1-concentracao-antes-registro.docx` | 23271 | validada, antes de registrar | — |
| `p10-ac1-concentracao-depois-registro.docx` | 23254 | depois de registrar | **6** (achado A1) |
| `p14-ac2-aumento-antes-registro.docx` | 22930 | validada, antes de registrar | — |
| `p14-ac2-aumento-depois-registro.docx` | 22930 | depois de registrar | **0** |
| `p17-ac3-segunda-concentracao-antes-registro.docx` | 23011 | validada, antes de registrar | — |
| `p17-ac3-segunda-concentracao-depois-registro.docx` | 22995 | depois de registrar | **6** (achado A1) |

Os dez arquivos saíram com o nome sugerido terminando em `_rascunho`
(`Contrato_Social_-_Agro_rascunho.docx`, `Contrato_Social_-_Participacoes_rascunho.docx`),
inclusive os baixados **depois** do registro na junta. A confirmação que aparece é sempre
a mesma:

> Baixar documento incompleto?
> Estes campos obrigatórios ainda não foram resolvidos:
> Data da assinatura
> Se continuar, o arquivo será identificado como rascunho.

É consequência de o roteiro não mandar preencher `dataAssinatura`, não de o registro ter
falhado. Registrado para que o nome do arquivo não seja lido como sinal de estado da peça.

Screenshots na mesma pasta, prefixados pelo passo, mais
`achado-01-clausula-segunda-quebrada-depois-do-registro.png`.

---

## 5. Estado em que deixei os dados

**Farroupilha Comércio Ltda:** capital `R$ 2.973.751,00`, `Lista de Sócios (1)` com a
Jatobá em 2.973.751 quotas. Contrato social e três alterações contratuais, todas
registradas na junta. Três atos societários, todos `Formalizado em documento`.

**Jatobá Sementes S.A.:** contrato social registrado. **Uma 1ª alteração em rascunho,
validada e não registrada** — criada apenas para medir o V8, no procedimento das duas
abas que o próprio roteiro descreve no 18.2. É a única peça pendente que sobrou.

**Bens:** `BS 60`, `BS 61`, `BS 62` e `BS 01` em `Integralizado`. `BS 02`, `BS 03`,
`BS 08`, `BS 09` seguem em `Pendente`. `BS 51` intocado.

**Alterações de cadastro que fiz:** uma só, autorizada pelo passo 11 — `BS 01` de
`Pendente` para `Aprovado`. Ele virou `Integralizado` sozinho no passo 14, pelo registro
da AC2, e por isso não foi devolvido ao estado original: devolver seria desfazer o
resultado que a demonstração existe para provar.

**Arquivo de ambiente criado:** `e2e/.auth/cred.local`, com as credenciais de dev
publicadas em `e2e/demos/ac-alteracao-contratual.mjs`. O harness do Playwright exige
`E2E_EMAIL`/`E2E_PASSWORD` e recusava subir sem elas. O arquivo está coberto pelo
`.gitignore` (linha 89) e não vai para o versionamento.

Para zerar tudo de novo: `reset-cenario.sql`, nesta mesma pasta.
