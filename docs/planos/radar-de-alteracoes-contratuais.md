# Radar de alterações contratuais: o diff entre a junta e o cadastro

**Data:** 08/09/2026 · **Status:** 🔵 proposta de arquitetura, nada implementado.
**Origem:** pedido do Bernardo de resolver as tarefas `AC-01B` (AC por mudança de sede) e
`AC-01C` (AC por mudança de CPF/qualificação) sem tratá-las como duas features isoladas,
e de desenhar o mecanismo que **sugere alterações contratuais a partir da mudança de
variáveis desde o último registro na junta**.

**Corpus medido para escrever isto:** 93 PDFs de 20 sociedades reais em
`~/Documentos/contratos_exemplo` (25 contratos sociais, 71 alterações, 4 re-ratificações;
68 com camada de texto, 44 com capa da JUCEMAT legível). Os números das seções 1 e 2 saem
dessa medição, não de impressão.

---

## 1. A descoberta que muda o desenho: a peça formaliza N eventos, não 1

Das 44 peças com capa legível, **30 declaram dois ou mais eventos no mesmo instrumento** e
21 declaram três ou mais. A 9ª da Fartura leva, numa peça só: consolidação, alteração de
dados, entrada de sócio e alteração de sócio/administrador. A 6ª da Boscoli leva quatro
mudanças de endereço (três de sócio, uma da sede) mais administração.

Isso condena o enunciado das duas tarefas, não o trabalho delas. "Gerar AC por mudança de
sede" descreve um **documento por evento**, e o documento real é uma peça que carrega os
eventos que aconteceram desde o último registro. O código já faz certo (o assistente marca
N flags de evento na mesma peça, `AlteracaoContratualDialog` + `projeto_flag_valor`); o
enunciado empurraria para o lado errado.

**Reescrita proposta:** cada tarefa passa a ser "acrescentar o evento X ao assistente e o
par de blocos dele (resolução + gêmeo de consolidação)", e não "gerar a AC de X".

## 2. Frequência real dos eventos (códigos da JUCEMAT no corpus)

| código | evento | ocorrências | tem domínio hoje? |
|---|---|---|---|
| 051 | consolidação de contrato | 30 | sim |
| 2003 | alteração de sócio/administrador | 26 | sim (ledger + `administracao`) |
| 2247 | alteração de capital social | 19 | sim (ledger) |
| 2001 | entrada de sócio/administrador | 11 | sim (ledger) |
| **048** | **re-ratificação** | **7** | **não (família de documento inexistente)** |
| 2017 | espólio | 5 | parcial (`travaDaSucessao`, sem a entidade) |
| **023/024** | **abertura/alteração de filial** | **7** | **não (nenhuma modelagem)** |
| 021 | alteração de dados (exceto nome empresarial) | 5 | parcial (é a tarefa #2) |
| **2244** | **atividades econômicas (CNAE)** | **4** | **não (`objeto_social` é texto solto)** |
| 2211 | endereço no mesmo município | 4 | parcial (é a tarefa #1) |
| 2015 | objeto social | 3 | parcial (texto solto) |
| 2005 | saída de sócio | 3 | sim (ledger) |
| 050 | absorção de parte cindida | 2 | não |

Leitura: o que o ledger de 26/08 resolveu é justamente o topo da tabela. O que sobra sem
domínio nenhum, somado, dá 18 eventos: **re-ratificação, filial e CNAE**, e não as duas
tarefas da fila.

### 2.1 O endereço que mais muda não é o da sede

Contra-exemplo direto ao recorte da tarefa #1. Na 6ª da Boscoli, três das quatro cláusulas
de endereço são **de sócio**, não da sede, e todas por mudança de CEP do município. Na 11ª
da Fartura: *"Altera-se os endereços dos sócios JOSE EDUARDO ... a fim de que se conste,
em suas qualificações, os seguintes domicílios"*.

Hoje isso é invisível ao assistente, por dois motivos somados:

- `derivarEventosDaAlteracao` restringe o evento de endereço à PJ
  (`!pjPessoaId || m.entityId === pjPessoaId`, `eventosDaAlteracao.ts:130`);
- e a janela do próprio hook só busca `[empresaPessoaId, ...administracaoIds]`
  (`useEventosDaAlteracao.ts:54`), então o log do sócio nem chega à derivação.

O `entidadeIds` do controller de geração (`useGerarDocumentoController.ts:1095`) **já** monta
o conjunto certo (sócios, administradores, titularidades, movimentos) para as notificações
de variável. Alinhar as duas janelas é uma mudança pequena e é metade da tarefa #2.

### 2.2 Re-ratificação é o outro destino do mesmo diff

Sete ocorrências, e um formato que não consolida estado nenhum: cita cláusula e alínea de
um instrumento **já registrado, pelo protocolo**, e troca texto.

> CLÁUSULA PRIMEIRA: Retifica-se o disposto na Cláusula Primeira da Sétima Alteração do
> Contrato, protocolo n.º 251125033 de 29/09/2.025, no que tange à constituição de duas
> novas filiais...

> Parágrafo Primeiro: Na alínea "aa" do Parágrafo Segundo da Cláusula Quinta, onde se lê:
> "...trinta e trinta centavos", leia-se: "...trinta e três centavos".

Os casos reais do corpus: data de nascimento de sócia (AL Lehnen), nome grafado errado
(Boscoli), valor por extenso, denominação de imóvel (Hervalense IV → VI), redação de
confrontação de memorial, filial cadastrada com endereço errado. **Todos são o mesmo diff
da tarefa #2, com destino diferente.** É também o caminho da `AC-03D` (exigência cartorial
como revisão), sem precisar de máquina própria.

---

## 3. O princípio

> **O estado da sociedade na junta é o snapshot da última peça registrada. Tudo o que
> divergir dele é candidato a ato.**

O gerador já sabe produzir a peça. O que falta é a máquina que **observa a divergência** e
a **classifica**. E a classificação tem exatamente três destinos, não um:

| destino | o que é | documento |
|---|---|---|
| **fato novo** | o mundo mudou depois do registro | resolução na AC ("altera-se o endereço da sede, de X para Y") |
| **erro material** | o cadastro sempre foi este; o texto registrado errou | re-ratificação ("onde se lê X, leia-se Y") |
| **irrelevante** | campo que o texto não usa, ou saneamento cadastral | nada, mas a dispensa fica registrada |

Nenhum dado decide entre fato novo e erro material: só o consultor sabe. Mas o sistema
decide tudo o resto, e é isso que torna o radar viável.

---

## 4. Arquitetura

As camadas 1 a 6 são as de `docs/osg/arquitetura-sintese.md`. A proposta acrescenta uma
camada abaixo (L0) e duas no meio (observador e classificador).

```
L5/L6  Composição e render        sem mudança estrutural
L4     Cláusulas e blocos         + par (resolução | gêmeo de consolidação) por evento novo
                                  + FAMÍLIA NOVA: re-ratificação (não reusa o consolidado)
L3.5   CLASSIFICADOR  (novo)      cada divergência → fato novo | erro material | dispensa
L2.5   OBSERVADOR     (novo)      diff(snapshot registrado, cadastro vivo) → Divergencia[]
L1     Domínio                    + filial, + atividade economica (CNAE), + espólio
L0     MARCO DO REGISTRO (novo)   protocolo, data da junta, nº de registro, NIRE do ato
```

### L0. Marco do registro: a âncora que hoje não existe

`confirmarRegistro` grava só `status: 'registrado'` (`useDocumentoGerado.ts:563`). Não há
protocolo, data de registro na junta, número de registro nem NIRE do ato em
`documento_gerado`. Consequências, as duas caras:

1. **A janela do radar mede a coisa errada.** "Desde o último registro na junta" hoje é
   `snapshot_validado_em`, que é quando o consultor validou o rascunho. Na 9ª da Fartura:
   assinada em 28/12/2023, protocolada em 29/12, registrada em 02/01/2024. Toda mudança
   cadastral naquela janela é classificada como posterior ao registro sem ser.
2. **A re-ratificação não tem o que citar.** O texto dela nomeia o protocolo e a data. Sem
   o campo, o consultor digita à mão exatamente o dado que o sistema deveria saber.

Migration pequena e aditiva em `documento_gerado`: `junta_protocolo`, `junta_registrado_em`
(date), `junta_numero_registro`, `junta_nire`, `junta_uf`. O PDF chancelado já cabe em
`documento_arquivo`. É a primeira coisa a fazer, e destrava as outras.

### L2.5. Observador: `divergenciasDoRegistro.ts`

Função **pura**, gêmea de `derivarEventosDaAlteracao`, no mesmo diretório
(`src/lib/osg/`), com o mesmo contrato: recebe fatos já lidos, devolve lista com evidência.

```ts
export interface DivergenciaDeCadastro {
  /** Binding e campo do texto registrado: 'socio[2].endereco_cep', 'sociedade.sede'. */
  caminho: string;
  entidade: 'pessoa' | 'administracao' | 'filial' | 'sociedade' | 'matricula' | 'bem';
  entidadeId: string;
  /** O que a peça registrada PUBLICOU (do snapshot). */
  antes: string | null;
  /** O que o cadastro diz hoje (pelos mesmos mapeadores que hidratam a folha). */
  depois: string | null;
  /** Blocos do documento registrado que citam este campo. Vazio = o texto não usa. */
  blocosQueCitam: string[];
  /** Flag de evento que este campo alimenta, quando alimenta alguma. */
  flagNome: string | null;
  /** Quem mudou e quando, de audit_logs. Explicação, não verdade. */
  procedencia: { autorId: string; em: string }[];
}
```

Três fontes, todas já em mão:

- **`snapshot_dados`** da peça registrada (`selecao` + `itensPorLista`): o que o texto
  publicou. `baselineDaPeca.ts` já lê capital e sócios de lá; isto generaliza a leitura.
- **Cadastro vivo**, pelos **mesmos mapeadores** que hidratam a folha (`mapeadores.ts`).
  Reuso obrigatório: um segundo caminho de leitura produziria divergência fantasma na
  primeira diferença de formatação.
- **`audit_logs`** na janela do registro, para a procedência.

**Ponto fino, e é o que separa esta camada da derivação de hoje.** A derivação atual
pergunta ao log *se* algo mudou (`campos.some(c => c.startsWith('endereco_'))`). O log é
boa **evidência** e mau **estado**: linha apagada e recriada, campo que mudou e voltou,
mudança feita antes do `validadoEm` e revertida depois, todos mentem. O diff de estado
responde "está diferente **hoje**", que é a pergunta que decide se cabe ato. Os dois juntos:
**o diff decide, o log explica.**

### L3.5. Classificador: o que é derivável e o que é decisão

| o sistema deriva | o consultor decide |
|---|---|
| o campo é **usado** pelo texto registrado (`snapshot_versoes_blocos` + `extrairCampos`) | é fato novo ou erro material? |
| qual cláusula do consolidado o cita | entra nesta peça ou na próxima? |
| qual flag de evento ele alimenta | é irrelevante (dispensar)? |
| o "de X para Y" pronto para a resolução | |

**A resposta à "decisão jurídica dos campos" que a tarefa #2 pede como dependência.** Em
vez de comitê produzindo lista fixa, a regra sai do próprio motor:

> **Um campo é candidato a evento se, e só se, algum bloco do documento registrado o
> referencia.**

`snapshot_versoes_blocos` congela quais versões de bloco a peça usou; `extrairCampos`
(`render.ts:398`) devolve os placeholders de cada conteúdo. A interseção é, literalmente,
"o conjunto de variáveis que este contrato registrado afirma". Campo fora dele é
saneamento cadastral e não gera ato, sem ninguém precisar listá-lo. A decisão jurídica
encolhe para a lista das **exceções**: campo que o texto usa e que ainda assim não exige
ato (candidato óbvio: telefone, e-mail, se algum dia entrarem no texto).

**Dispensa registrada.** Tabela pequena (`divergencia_dispensada`: peça, caminho, valor
dispensado, motivo, quem, quando) ou uma linha em `projeto_flag_valor` com escopo próprio.
É o que impede o radar de virar ruído permanente, e é a mesma ideia do
`documento_notificacao_visto`, só que por **campo** em vez de por documento. Sem isso, um
CEP que o consultor decidiu ignorar pisca para sempre.

### L4. Blocos: o padrão já existe, e é o par

Cada evento novo é **dois** blocos, não um: a resolução (no pretérito, "altera-se ... de X
para Y") e o gêmeo de consolidação (no presente, "a sede é ..."), com o par de flags
`e_alteracao` / `e_constituicao`. É exatamente o que a Frente C e a etapa 5 de 27/08 já
fizeram para capital, sede e objeto (`20260827180000_gemeo_consolidacao_capital_agro.sql`).
Nada de motor novo. E `comFlagDaPecaRetroativa` já protege os snapshots selados antes das
flags de peça.

### Família nova: re-ratificação

Único item que **não** reusa o consolidado. O corpo é uma lista de itens
`{ instrumento citado (protocolo + data + ordinal), cláusula/alínea, onde se lê, leia-se }`
e o fecho. O motor tem tudo (repetidor, marcas, docx); falta a família de documento e a
entidade `retificacao_item`, mais o vínculo `retifica_documento_id` (distinto de
`substitui_documento_id`: re-ratificação **não** sucede a peça, ela a emenda). O ledger de
quotas **não** é carimbado por ela, porque nenhum movimento novo aconteceu.

---

## 5. Onde isso aparece na tela

Três superfícies, em ordem de valor por esforço:

1. **Na folha da peça registrada**, onde o assistente já vive. `AlteracaoContratualDialog`
   passa a listar, junto dos eventos derivados, as divergências de qualificação, sede,
   filial e objeto, cada uma com o "de X para Y" e três gestos: **é fato novo** /
   **é erro material** / **dispensar**. O terceiro passo do modal deixa de ser aviso
   genérico ("o cadastro precisa estar atualizado") e passa a ser a lista do que o próprio
   sistema achou.
2. **Radar por sociedade**, em `/equipe/osg/work/quadro-societario`: "4 divergências desde
   a 8ª alteração, registrada em 02/01/2024". É a resposta literal ao pedido: sugerir
   alteração contratual sem ninguém abrir documento.
3. **Radar da carteira**: lista de sociedades ordenada por divergência pendente. É o que
   transforma isso em trabalho proativo, a PSA descobrindo que precisa de AC antes de o
   cliente pedir.

---

## 6. Sequenciamento

| fase | entrega | por que nesta ordem |
|---|---|---|
| **F0** | Marco do registro (migration aditiva + campos no gesto de registrar) | sem ela o radar mede a janela errada e a re-ratificação não tem o que citar. Pequena |
| **F1** | `divergenciasDoRegistro.ts` puro + testes, **só qualificação de pessoa**, exibido na folha ao lado dos eventos. Inclui alinhar a janela do hook de eventos ao `entidadeIds` do controller | **entrega a tarefa #2** com o caso mais frequente do corpus (endereço/CEP de sócio) |
| **F2** | Evento de sede: par de blocos com o "de X para Y", e a distinção mesmo município / outro município / outra UF | **entrega a tarefa #1**. O evento já deriva; falta a redação e o gêmeo. A UF muda o código na junta e o NIRE |
| **F3** | Classificador completo + dispensa registrada | o radar deixa de ser lista e passa a ser fila de trabalho |
| **F4** | Família de re-ratificação + `retifica_documento_id` | 7 casos no corpus, e resolve a `AC-03D` de graça |
| **F5** | Radar por sociedade e por carteira | precisa de F3 para não ser ruído |
| **F6** | Domínio de filial e de atividade econômica (CNAE) | destrava 11 eventos do corpus que hoje não têm onde morar |

O caminho crítico das duas tarefas da fila é **F0 → F1 → F2**, e as três juntas são menores
que o enunciado atual de qualquer uma delas, porque a fundação que elas declaram como
dependência já existe.

---

## 7. O que muda nas duas tarefas da fila

1. **`AC-01A` está entregue, na prática.** Ledger societário (26/08), derivação de eventos
   com baseline de snapshot (27/08) e máquina de estados do fluxo (01/09) cobrem os cinco
   critérios de aceite dela. O que resta de `AC-01A` é o **marco do registro** (F0) e a
   **dispensa** (F3), e nenhum dos dois está escrito lá. Reescrever a tarefa como esses
   dois itens, ou fechá-la e abrir os dois.
2. **Ambas viram "evento + par de blocos"**, não "documento por evento" (seção 1).
3. **A tarefa #1 diz "não incluir filiais".** Recorte correto, mas o corpus mostra sede e
   filial mudando na mesma peça (5ª da GMS renumera FILIAL 01 → 02 e insere CNPJ/NIRE de
   cada uma). O plano precisa declarar que, enquanto filial não tiver domínio (F6), a peça
   de uma empresa com filial **sai incompleta**, para ninguém aceitar "sai sem correção
   manual" como critério cumprido no caso errado.
4. **A tarefa #2 pede "decisão jurídica dos campos" como dependência.** A §L3.5 propõe
   derivá-la do motor (campo citado pelo texto registrado) e reduzir a decisão humana à
   lista de exceções. Isso desbloqueia a tarefa sem esperar reunião.
5. **O critério "o valor anterior permanece rastreável"** da tarefa #2 já é atendido pelo
   `snapshot_dados` da peça registrada, que é imutável por construção. Não precisa de
   versionamento de qualificação (que a tarefa lista como dependência): o snapshot **é** a
   versão.

---

## 8. Riscos e decisões abertas

- **Falso positivo de formatação.** Se o observador comparar o snapshot com o cadastro por
  caminho de leitura diferente do dos mapeadores, todo CEP com ponto vira divergência. Não
  é risco teórico: `baselineDaPeca` já normaliza CPF por `digitosDe` exatamente por isso.
  Mitigação: comparar **valor renderizado contra valor renderizado**, pelo mesmo mapeador.
- **`pessoa.id` não é congelado no snapshot** (pedra conhecida, §6 de
  `derivacao-de-eventos-e-carimbo.md`). O casamento por CPF/CNPJ serve para sócio, e **não
  serve** para o que ainda não tem chave natural (filial, linha de administração). Se o
  radar for atrás de filial (F6), congelar o id no snapshot deixa de ser opcional. Esta
  proposta é o argumento que faltava para decidir aquela pergunta.
- **Objeto social é texto solto.** Enquanto for, o diff só consegue dizer "o objeto mudou",
  nunca "entrou a atividade 4632-0/01 na alínea c". Aceitável na F1, insuficiente para o
  evento 2244.
- **Quem pode dispensar** uma divergência, e se dispensa é por peça ou por sociedade.
  Decisão de produto, não derivável.
- **Espólio** (5 ocorrências) não entrou no sequenciamento: é qualificação de primeira
  classe (espólio → inventariante → herdeiros) e merece frente própria, com a
  `travaDaSucessao` que já existe como ponto de partida.

---

## 9. Referências

- Código: `src/lib/osg/eventosDaAlteracao.ts`, `baselineDaPeca.ts`, `estadoDaSociedade.ts`,
  `src/hooks/useEventosDaAlteracao.ts`, `useNotificacoesDocumento.ts`,
  `src/components/equipe/osg/gerar/AlteracaoContratualDialog.tsx`, `src/lib/templates/`.
- Planos: `ledger-societario-e-alteracao-derivada.md` (✅),
  `derivacao-de-eventos-e-carimbo.md` (🟡, §6 tem as perguntas que esta proposta responde),
  `formato-real-da-alteracao-contratual.md` (✅), `alteracao-contratual-caminho-b.md` (📘).
- Normativo do motor: `docs/osg/contrato-l2-l3-motor-e-blocos.md`.
- Catálogo de blocos e flags: `docs/osg/catalogo-familias-e-flags.md` (a tabela de blocos de
  resolução da §"Alteração Contratual" é o alvo das fases F2 e F4).
- Fila original das tarefas: `docs/sprints/sprint-12/ANALISE_TAREFAS_A_DESTRINCHAR.md`,
  §`AC-01` e §`AC-03`.
- Corpus: `~/Documentos/contratos_exemplo` (não versionado).
