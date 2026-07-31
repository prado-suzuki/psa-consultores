# MAPA — Diagnóstico de fechamento das tarefas pendentes

**Data:** 31/07/2026 · **Plano de origem:** `docs/planos/2026-07-31-fechamento-tarefas-mapa.md`
**Como foi verificado:** banco ao vivo via PostgREST (JWT do Alexandre, paginado de 1000 em 1000) + leitura do código na `develop` + `vitest` nos testes existentes.

> **Resumo em uma linha:** das 7 tarefas de UI, **5 já estavam feitas e não marcadas**, 1 foi **implementada nesta sessão** (reduzir cliques) e 1 é a própria revisão — o checklist fecha **10 de 10**. A tarefa de dado (15,5h) tem os 3 gaps de garimpo **levantados e nominados**, e todos os números da auditoria de 24/07 foram **reproduzidos exatamente** contra o banco de hoje.

> **O arquivo-fonte da auditoria foi localizado** no Drive (não estava no repo): `2026-07-24_Preenchimento_MAPA_Alexandre.md`, id `1H4-JOH3eQvuXhq-dlKQP8FD38LKj2imm`, criado 24/07 19:51. É um handoff da Patrícia para o Alexandre escrito para a **Sprint 11 (03–07/08)** — não para a Sprint 10, onde a tarefa está hoje no backlog. Escopo: auditoria dos 38 `SOP_as-is.md` do export de **20/07**, que cobre **só P1 a P5 (cluster OSG)**.

---

## 1. Veredito por tarefa

| # | Tarefa | Sprint | Est. | Veredito | Evidência |
|---|---|---|---|---|---|
| 1 | Garantir que o export do ROI não quebre | 09 | 1h | **Feito** (aceite final pendente) | `node_modules/html-to-image@1.11.13` e `node_modules/jspdf@4.2.1` presentes; `package.json:77,79`; imports dinâmicos em `src/lib/roiVisualExport.ts:17,73`. Teste ad-hoc: `import('html-to-image')` expõe `toPng` e `new jsPDF({format:'a4'})` instancia — 2/2 verdes. |
| 2 | Compactar a seção "Operação" (um campo só) | 09 | 1h | **Feito** | A seção não existe mais no módulo (grep por `Operação` em `src/` não retorna nada no MAPA). O campo **Execução** está dentro de **Identificação**, dividindo o `form-row` com **Nome**: `EtapasEditorModal.tsx:65`. Seções hoje: Identificação · Documentos · Equipe · Métricas · Sistemas. Saiu no commit `5a963e19`. |
| 3 | Não deixar linha vazia órfã ao cancelar | 09 | 1h | **Feito** | `useEtapasEditor.ts:120-130` (`closeQuick`) filtra os itens de nome vazio do campo que abriu o cadastro; ligado ao `onClose` dos 3 modais em `QuickCadastros.tsx:28,33,38`. |
| 4 | Reduzir cliques nos campos de lista | 09 | 4h | **Feito nesta sessão** (31/07) | *Já existia:* busca com foco automático, navegação por teclado, Enter confirma, filtro insensível a acento (`Select.tsx`), painel alargado a 620px. *Implementado agora:* `Select` ganhou `keepOpenOnSelect` (painel não fecha a cada escolha), `openOnMount` e `onClose`; `ChipSelector` trocou o `handleAdd` que criava linha vazia por um seletor que **anexa um chip por escolha**. Ver §6. |
| 5 | Adicionar processo de dentro do painel do projeto | 09 | 2h | **Feito** | CTA "Adicionar processo" no estado vazio das 4 abas: `ProjetoDetalheModal.tsx:170,242,312,383`, abrindo `ProcessoFormModal` com `projetoIdInicial={projeto.id}` (`:524-529`). |
| 6 | Adicionar o processo dentro do painel do projeto (mapa de preenchimento) | 10 | 3h | **Feito** — duplicata da #5 | Mesma entrega. Uma marcação fecha as duas. |
| 7 | Revisar item por item os ajustes de feedback | 10 | 4h | **É este documento** | Os 10 itens de `docs/mapa/checklist-melhorias-preenchimento.md` revisados um a um abaixo. |
| 8 | **Preenchimento do MAPA (Alexandre, 15,5h)** | 10 | *(nulo)* | **Não feito — mas o garimpo está pronto** | Seção 2. `assigned_to` e `estimated_hours` seguem nulos no banco (id `99d62017-fa29-4adb-8450-88a35b466722`). |

### Revisão item a item do checklist de melhorias (tarefa #7)

| Item do checklist | Veredito | Evidência |
|---|---|---|
| 1. Nome da etapa obrigatório | **Feito** | `useEtapasEditor.ts:133-134` — `primeiraEtapaSemNome` bloqueia o save, foca a etapa e diz o número; `EtapasEditorModal.tsx:65` marca `required`. |
| 2. Apagar número tem que sumir de verdade | **Feito** | `ProcessoFormModal.tsx:93-95,103,105` — envia `null` (não `undefined`) ao limpar, com comentário explicando o PATCH. |
| 3. Ferramenta inline nasce no cluster certo | **Feito** | `QuickCadastros.tsx:33` passa `clusterIdInicial={procClusterId}` ao `SistemaFormModal` (idem documento e responsável, `:28,38`). |
| 4. Botão de excluir processo quebrado | **Feito** | `CadastroItem.tsx:99` — `e.stopPropagation()` no handler do excluir (e `:88` no editar). |
| 5. Adicionar processo de dentro do projeto | **Feito** | Ver tarefa #5. |
| 6. "Salvar todas" aponta a etapa com erro | **Feito** | `useEtapasEditor.ts:147,160` — envolve o erro em `Etapa N ("nome"): …`. |
| 7. Export do ROI | **Feito** | Ver tarefa #1. |
| 8. "+ Cadastrar novo" visível | **Feito** | `ChipSelector.tsx:157-166` botão dedicado fora do dropdown + `Select.tsx:243-275` ação fixa no topo do painel. |
| 9. Linha vazia órfã ao cancelar | **Feito** | Ver tarefa #3. |
| 10. Seção "Operação" | **Feito** | Ver tarefa #2. |
| *(11) Reduzir cliques nos campos de lista* | **Feito nesta sessão** | Ver tarefa #4 e §6. Não está no checklist de 14/07; entrou depois como "a maior alavanca". |

**Placar: 10 de 10 itens do checklist feitos** — e o 11º (reduzir cliques) entregue em 31/07. Nenhum trabalho de código restante nesta frente.

---

## 2. Listas nominais dos gaps de dado (tarefa das 15,5h)

Fonte: `processes`, `process_stages`, `gargalos`, `gargalo_processos`, `gargalo_etapas`, `etapa_responsaveis` — lidas ao vivo em 31/07.

### 2.1 Reconciliação com a auditoria de 24/07

Com o **escopo real da auditoria** — cluster OSG, projetos **P1 a P5**, qualquer número de etapas — todos os números fecham exatamente:

| Auditoria | Ao vivo (31/07) |
|---|---|
| "38 processos · 164 etapas" | **38 · 164** ✓ |
| "17 processos sem gargalo" | **17** — e o **mesmo conjunto**, nome por nome ✓ |
| "apenas 6 das 164 etapas (4%) têm gargalo vinculado" | **6** — e os mesmos 6 processos/etapas ✓ |
| "29 dos 35 gargalos são invisíveis na Cascata" | **29 pares** gargalo×processo sem etapa, + 6 gargalos vinculados = 35 ✓ |
| "110 das 164 etapas com retrabalho 0,0%" | 99 em `0.0` + 11 nulas = **110**; 54 com valor ✓ |
| "5 processos com hora inflada" | **os mesmos 5**, com os mesmos vetores ✓ |
| "2 processos sem frequência" | *Atos Societários de Manutenção* e *Instalação do Conselho* ✓ |

> ⚠️ **Correção de uma versão anterior deste documento.** A primeira reconciliação usou "processos com ≥4 etapas AS-IS", que também dava 17 — mas era **coincidência de contagem sobre um conjunto diferente**: incluía 6 processos de P6/P7 e excluía 5 de P1–P5 com poucas etapas (*Planilha de Capital Social*, *Regimento Interno do Conselho*, *Instalação do Conselho*, as 2 de P5 e *Testamento*). A definição correta é a do escopo do export: **OSG, projetos P1–P5**. A lista da §2.2 abaixo é a corrigida.

Sanidade: **nenhuma linha de `gargalo_etapas` foi criada desde 15/06** — nada foi remediado nessa frente desde a auditoria.

### 2.2 Os 17 processos sem gargalo

Todos OSG, projetos P1–P5. **Confere nome por nome com a lista da auditoria** (que traz também a pasta no Drive, a contagem de documentos de exemplo e uma pista de gargalo para cada um — vale abrir o arquivo-fonte antes de cadastrar).

| # | Projeto | Processo | Etapas |
|---|---|---|---|
| 1 | P2 - Contratos | AC Imóvel Adicional (2º momento) | 5 |
| 2 | P2 - Contratos | AC por Exigência Cartorial | 6 |
| 3 | P2 - Contratos | Atos Societários de Manutenção | 7 |
| 4 | P2 - Contratos | Contrato de Composse | 5 |
| 5 | P2 - Contratos | Distrato de Arrendamento Pré-existente | 4 |
| 6 | P2 - Contratos | Holdings Individuais | 6 |
| 7 | P2 - Contratos | **Planilha de Capital Social** | 1 |
| 8 | P2 - Contratos | Regularização da situação Matrimonial | 4 |
| 9 | P2 - Contratos | Revisão da Parceria e da Composse | 4 |
| 10 | P3 - Sucessão | **Testamento (alternativa à doação)** | 3 |
| 11 | P4 - Governança | AC Reflexo da Governança (Participações) | 5 |
| 12 | P4 - Governança | **Instalação do Conselho de Administração e Diretoria** | 2 |
| 13 | P4 - Governança | Matriz de Alçadas | 4 |
| 14 | P4 - Governança | Protocolo de Remuneração | 5 |
| 15 | P4 - Governança | **Regimento Interno do Conselho** | 2 |
| 16 | P5 - Apresentações | **Apresentação Final de Sucessão** | 3 |
| 17 | P5 - Apresentações | **Apresentação Inicial Tributário e Societário** | 1 |

Em negrito, os 5 que faltavam na versão anterior deste documento. O P1 - Gestão não aparece: seus 8 processos **têm** gargalo (o problema do P1 é outro — descrição fraca, tarefa C da auditoria).

**Fora do escopo do export, mas também sem gargalo (19 processos):** os 6 de *P2 - Automação SPED*, os 5 de *P8 - Templates Papéis Trabalho* (ambos TAX), os **6 de P6/P7** (ver §2.6) e os 2 **TESTE** / **TESTE DE PROCESSO - ALEXANDRE** (candidatos a exclusão, não a preenchimento).

### 2.3 Os 29 pares gargalo × processo sem vínculo de etapa

15 gargalos distintos, todos OSG. O trabalho é escolher, em cada processo, **qual etapa** origina o gargalo:

| Gargalo | Processo (projeto) | Etapas p/ escolher |
|---|---|---|
| Acompanhamento informal e horas soltas | Acompanhamento (P1) | 4 |
| Agendamento manual e aceite sem registro | Apresentação e Formalização do Projeto (P1) | 2 |
| Cadastro espalhado e retrabalho | Contratação / OS (P1) | 4 |
| Complementares controlados à mão | Documentos complementares (P1) | 3 |
| Cálculo de ITCMD manual e variável por UF | Planejamento Tributário ITCMD (P3) | 5 |
| DP sem revisão de par | Atualização do DP (P2) · DP Inicial (P2) | 5 · 8 |
| Encerramento duplicado | Finalização do Projeto (P1) | 2 |
| Expectativas e riscos sem memória | Entrevista Preliminar (P1) | 1 |
| Interface OSG↔Fiscal sem visibilidade | Planejamento Tributário ITCMD (P3) · Planejamento Tributário Rural (P2) | 5 · 5 |
| Leitura manual de matrícula e impedimentos | DP Inicial (P2) · Digitação de Matrícula (P2) | 8 · 4 |
| Minutas sem biblioteca de cláusulas padronizada | AC de Integralização (P2) · Acordo de Quotistas (P4) · Constituição da Agro (P2) · Constituição da Participações (P2) · Contrato de Parceria Rural (P2) · Doação + AC Reflexo (P3) | 6 · 7 · 6 · 6 · 7 · 9 |
| Pendências e cobrança manuais | Relatório de documentos pendentes (P1) | 3 |
| Revisão excessiva e troca de caracteres na minuta | *(os mesmos 6 processos de "Minutas sem biblioteca")* | idem |
| Solicitação dispersa e sem rastreio | Solicitações Preliminares (P1) | 4 |
| Soma do capital social com erro de centavos | Constituição da Agro (P2) · Qualificação dos Sócios (P2) | 6 · 2 |

**Atalho, com a ressalva da auditoria:** "Minutas sem biblioteca" e "Revisão excessiva na minuta" cobrem **o mesmo conjunto de 6 processos** — 12 dos 29 pares. Mas a auditoria é explícita: em cada processo os dois se manifestam em **etapas diferentes** (a de *elaborar minuta* e a de *checklist do revisor*), e manda vincular processo por processo, na etapa certa de cada um. Ou seja: são duas decisões por processo, não uma — ambas mecânicas, mas não é o mesmo alvo. A auditoria também proíbe vincular "em todas as etapas por segurança": o valor está em apontar **uma**.

Observação lateral: os 15 gargalos estão com `horas_gastas = 0` e `taxa_ocorrencia = 0`. Se a cascata/ROI usa esses campos, o vínculo de etapa sozinho não vai produzir número.

### 2.4 Horas infladas: são estes 5, todos em *P2 - Contratos*

Há um corte natural e inequívoco em **20h numa única etapa**. Exatamente 5 processos passam desse corte, e são os 5 maiores do projeto:

| Processo | Total AS-IS | Maior etapa | vol_exec | Frequência |
|---|---|---|---|---|
| Digitação de Matrícula | **112,50h** | 45,00h (Transcrever limites e confrontações) | 15 | Semanal |
| Atos Societários de Manutenção | **62,90h** | 28,80h (Elaborar AC de manutenção) | 15 | *(nula)* |
| AC por Exigência Cartorial | **62,40h** | 28,80h (Elaborar AC ajustando descrição) | 15 | Mensal |
| AC Imóvel Adicional (2º momento) | **57,20h** | 28,80h (Elaborar minuta AC 2º momento) | 15 | Mensal |
| AC de Integralização, Concentração de Cotas e Ata | **33,33h** | 21,33h (Elaborar minuta AC — cláusula 5ª) | **45** | Quinzenal |

O 6º colocado do projeto é *DP Inicial*, com 29,00h e maior etapa de 8,00h — outra ordem de grandeza.

**Por que estão infladas — e a auditoria confirma com número exato:** as horas foram digitadas **já multiplicadas pelo volume anual**. A auditoria fecha o caso na *Digitação de Matrícula*: *"o piloto medido da Digitação foi 7,5h. 112,5 ÷ 15 = 7,5 exato"*. Os 3 processos de AC/Ato compartilham um **vetor de horas idêntico** — 3,60 / 7,20 / 28,80 / 4,00 / 10,80 / 8,00 — o que a auditoria classifica como *"copy-paste, não medição"*. E o 21,33h do *AC de Integralização* *"não é número que alguém estima: é resultado de divisão"*.

Régua de plausibilidade da própria auditoria: o P1 inteiro usa 0,3 a 5,4h por etapa; P6 e P7, 0,5 a 3,5h. *"Uma etapa de 'elaborar AC ajustando descrição' não leva 28,8h."* Contexto: `P2 - Contratos` soma **451,08h** AS-IS, contra capacidade real de 44h/semana.

⚠️ **Decidir a hora final não é do Alexandre.** A auditoria é explícita: ele monta a tabela `hora hoje × hora proposta × de onde veio` (piloto medido, divisão pelo volume, ou "a confirmar") e **a Patrícia valida antes de qualquer gravação**, porque hora alimenta ROI e ROI vai a gate executivo. Há checkpoint marcado para **qui 06/08**.

### 2.5 Dois problemas de dado adicionais encontrados no caminho

**a) `processes.time_spent_hours` e as horas das etapas são mundos disjuntos.**

| Cluster | `time_spent_hours` | Soma de `etapa_responsaveis.horas` |
|---|---|---|
| **OSG** (P1, P2-Contratos, P3-Sucessão, P4-Governança, P5, P6-Reorg, P7-Diag) | **0 em todos** | populada (451h só no P2-Contratos) |
| **TAX** (P2-SPED, P3-Consultas, P4-PIS/COFINS, P5-PERDCOMP, P6-Dashboard, P7-DIFAL, P8) | populada | **~0 em todos** |

Exemplos de divergência no TAX: *Levantamento de Crédito PIS/COFINS* 146,76h no processo × 7,38h nas etapas; *Elaboração de Papéis de Trabalho* 88,17h × 5,84h; *Apuração do DIFAL* 92,34h × 18,45h. Qualquer relatório que escolha uma das duas fontes zera metade da casa. **Isso precisa de decisão sua sobre qual é a fonte canônica** — não é garimpo.

**b) `process_stages.time_current` é coluna de texto.** 232 das 364 etapas estão nulas e **3 guardam a string `'2-4 horas'`** — o que estoura qualquer soma numérica. (Não é a fonte usada pelo editor, que soma `etapa_responsaveis.horas`; mas está lá.)

**c) `volume_per_process` está preenchido, mas não informa nada.** As **164 etapas do escopo têm o valor `1.0`** — default replicado, não medição. A auditoria trata volume como campo vazio e está certa: tecnicamente preenchido, semanticamente vazio. A outra coluna, `volume`, está nula em 141 das 164. Isso importa porque a tarefa D da auditoria manda *"preencher o campo volume da etapa com a frequência real, que é justamente onde o número multiplicado deveria estar"* — o campo existe e está esperando.

**d) `error_rate` está mais preenchido que o retrabalho, mas não sai no export.** 41 das 164 etapas têm taxa de erros com valor (123 em zero ou nulo). Como o export não imprime esse campo (§4, item 5), o dado existe e ninguém vê.

### 2.6 P6 e P7 já estão no MAPA — libera ~4h do bloco da S12

A auditoria lista, no bloco que desce para a Sprint 12: *"Cadastrar P6 e P7 no MAPA (~4h). Os dois **não estão no MAPA**: o export cobre só P1 a P5… São 4 processos e 30 etapas de transcrição."*

**Ao vivo, estão.** `P6 - Reorganização Societária` (5 processos) e `P7 - Diagnóstico Societário` (1) somam **6 processos e 40 etapas**, criados em **08–09/07/2026** — antes do export de 20/07 e antes da auditoria. Não entraram no export porque ele foi gerado só para P1–P5, e a auditoria inferiu ausência a partir da ausência no export.

Consequência prática: **essa tarefa de ~4h da S12 não existe mais.** O que falta em P6/P7 é apenas gargalo — nenhum dos 6 tem —, e isso pode entrar na mesma leva da tarefa A. Vale conferir se as horas deles são plausíveis (a auditoria usa P6/P7 como *régua* de plausibilidade, 0,5–3,5h/etapa, então provavelmente sim).

Nota de escopo: a *Fusão* está marcada na fonte como estrutura teórica, sem exemplo real, e a auditoria pede que isso continue sinalizado no MAPA.

### 2.7 Correção a duas premissas do plano

- **O filtro `cluster_id NOT NULL` não esconde nada hoje.** `processes`, `projects` e `gargalos` têm **0 linhas** com `cluster_id` nulo — os 28 processos do Digital Rotina já foram tratados. O filtro segue no código (`useProcessos.ts:10-11` etc.), mas contagem via PostgREST **bate** com a tela. A única exceção é `melhorias`, com 4 linhas nulas.
- **`process_stages.responsible` não é o campo de horas.** É uma coluna de texto legada, preenchida em apenas 4 linhas com strings como `"Revisor Senior"`. As horas por pessoa vivem em **`etapa_responsaveis (responsavel_id, papel, horas, scenario)`**.

---

## 3. Ordem de ataque sugerida (agrupada por área, não por sprint)

**Bloco A — marcações no backlog (minutos, zero código).** Fechar as 6 tarefas entregues (#1, #2, #3, #4, #5, #6) e a #7 apontando para este documento. Atribuir a #8 ao Alexandre e gravar as 15,5h. *Aguarda OK explícito — ver §7.*

**Bloco B — ~~`ChipSelector` + `Select`~~ FEITO em 31/07.** Ver §6.

**Bloco C — playbook (tarefa G da auditoria, 0,5h).** A auditoria manda **fazer primeiro**: é o que destrava o passo 3 para todo mundo, e é edição de texto em dois arquivos do Drive. Ver §4, item 4.

**Bloco D — vínculos de gargalo (29 pares, garimpo já feito).** Ordem por atrito crescente: os 9 pares de **P1 - Gestão** primeiro (1–4 etapas cada, escolha quase forçada) — e aproveitar que a auditoria pede, no mesmo passo, **reescrever as 8 descrições do P1** (tarefa C), que são as mais fracas do MAPA e estão no projeto-piloto. Depois os 12 pares de minuta, lembrando que são **duas etapas distintas** por processo (§2.3). Sobram 8.

**Bloco E — cadastrar gargalo nos 17 sem nenhum (tarefas A1 e A2, 6,5h).** Começar pelos 9 do P2 - Contratos, que é a frente em sprint. Antes de cadastrar, **abrir o arquivo-fonte**: ele traz, por processo, a pasta no Drive, quantos documentos de exemplo existem e uma pista de gargalo — e em 5 casos indica que o gargalo **já existe** e é só vincular, não criar (evita duplicata, que quebra a contagem da Cascata e do ROI). Checkpoint da Patrícia nos **3 primeiros**, antes de fazer os outros 14.

**Bloco F — horas do P2 (5 processos).** Montar a tabela `hora hoje × hora proposta × fonte`. A *Digitação* tem resposta fechada (112,5 ÷ 15 = 7,5h, piloto medido). Os 3 de AC/Ato compartilham vetor copy-paste. **Não gravar sem a Patrícia validar** (§2.4).

**Bloco G — decisão, não execução.** Qual é a fonte canônica de horas do processo (§2.5a). Bloqueia qualquer relatório que cruze OSG e TAX.

Blocos C, D, E e F não se tocam: texto no Drive, junção, cadastro e coluna de horas. Podem ir em paralelo. O que a auditoria **proíbe** ao Alexandre: mexer em tabela/coluna/enum/RLS/migração do MAPA (é do Eduardo) e alterar `sopMarkdown.ts`/`SopDocument.tsx` (é do Bernardo — ele entrega só a spec).

---

## 4. Os itens 4 e 5 da auditoria, resolvidos

**Os itens 4 e 5 da auditoria foram resolvidos** com a leitura do arquivo-fonte no Drive. Os dois estavam fora do meu alcance inicial, e um deles eu tinha diagnosticado errado:

**Item 4 — "caminho errado do AS-IS no playbook" (tarefa G, 0,5h, a auditoria manda fazer primeiro).**
Não é no repositório. `COMO_Gerar_uma_Sprint.md` e `Fluxo_Gerar_Sprint.mermaid` (Drive) mandam buscar o AS-IS em `02_Mapeamento_Processos / Exportação MAPA`, onde **não existe nenhuma saída do MAPA** — zero `.txt`, zero pastas `Mapeamento/`, só LEIA-ME de andaime. O export mora em `09_Gerencial/02_Insumos Projetos/Exportação projeto MAPA/`. É por isso que o passo 3 do playbook é pulado: quem segue a instrução ao pé da letra não acha nada. Corrigir em três lugares: passo 3 do playbook (linha 14), nó `S3` do mermaid, e a linha "processo real + gargalos" da tabela de Fontes.

> ~~Hipótese descartada:~~ eu havia apontado o `sop_before_document_path` de *Quebra de Notais Fiscais (Cte)* apontando para o PDF do NFe. **Não é isso** — era pista falsa, sem relação com o item da auditoria. Fica registrada como achado independente, de baixa prioridade, junto com o `sop_link` do *SPEDs* na raiz do site de manuais e os 3 processos com `sop_before_link` sem `sop_before_document_path`.

**Item 5 — "`[SPEC]` do volume no export" (tarefa E, 2h).**
`[SPEC]` é **prefixo do título da tarefa** na planilha da sprint, não um marcador em código nem em dado — por isso a busca literal não achou nada em lugar algum. A entrega é uma **spec para o Bernardo** (o código de geração é dele, não do Alexandre):

- Passam a sair na etapa: **Volume por processo** e **Taxa de erros**, mantendo Taxa de retrabalho.
- Os dois geradores têm de sair iguais, senão o `.md` e o `.pdf` do mesmo processo divergem. Confirmado no código: `src/utils/pdf/sopMarkdown.ts:61-66` e `src/utils/pdf/SopDocument.tsx:136-141` imprimem hoje exatamente 6 campos — Execução, Executado por, Sistemas, Docs entrada, Docs saída, Taxa retrabalho.
- Campo vazio imprime `—` (como já se faz em Docs entrada), para dar para ver **que está vazio** em vez de esconder.
- Incluir um exemplo "antes e depois" do bloco de uma etapa.

**Motivo de existir:** sem volume no export não se ordena gargalo por custo (horas × volume), e o passo 3 do playbook vira lista em vez de prioridade.

---

## 5. O que segue sem resposta

1. **Aceite de ponta a ponta do export do ROI.** A causa-raiz (dependências ausentes) está resolvida e provada. Mas o aceite escrito é "gera o arquivo sem erro", e isso só se prova clicando no botão num navegador real — `html-to-image` rasteriza DOM, coisa que o jsdom não faz. `DashboardRoiPage.test.tsx` passa 8/8, mas não exercita o export.

2. **As 5 outras tarefas sem dono sob "Tarefas órfãs", 4 vencendo em 31/07.** Não assumi que são do Alexandre: *Espelhar barras fixas OSG para TAX* (1h) · *Ajuste modulo de projetos e tarefas* · *Gestão de chamados:* · *Entender a tabela tasks* · *Rever toda a área de clientes* (1h, 03–07/08).

3. **A tarefa de 15,5h está na sprint errada.** O arquivo-fonte foi escrito para a **Sprint 11 (03–07/08)** e as 8 subtarefas têm datas de 03 a 07/08. No banco ela está na **Sprint 10**, com `due_date` 31/07 e sob o pai "Tarefas órfãs". Mover para a S11 é decisão de coordenação.

4. **Divergência menor não explicada:** a auditoria diz "todas as 22 do P1"; ao vivo o P1 - Gestão tem **23 etapas** AS-IS. Provável etapa criada depois de 20/07 (*Contratação / OS* é o processo mais recente do MAPA, 15/07). Não afeta nenhuma conclusão.

---

## 6. Reduzir cliques nos campos de lista — implementado em 31/07

Único gap de código do checklist, fechado nesta sessão. Dois arquivos, mudança **opt-in** (nada muda para quem não passar as props novas).

**`src/components/equipe/mapa/Select.tsx`** — três props novas:
- `keepOpenOnSelect` — em `commit()`, o painel **não fecha** ao escolher: limpa a busca e devolve o foco ao campo de busca, pronto para o próximo item.
- `openOnMount` — monta já com o painel aberto, para quando o gatilho vive fora do componente.
- `onClose` — avisa quem montou que o painel fechou. Todo fechamento passa agora por um único `fechar()` (pointerdown fora, Escape, Tab, `commit`, toggle do gatilho, `footerAction`), com `onClose` em `useRef` para `fechar` ficar estável e não re-assinar os listeners de scroll/pointerdown a cada render.

**`src/components/equipe/mapa/ChipSelector.tsx`** — o "Adicionar" mudou de comportamento:
- Antes: `handleAdd` empurrava um item vazio na lista; o usuário então abria a lista daquela linha e escolhia. **3 interações por item**, e uma linha órfã se desistisse.
- Agora: "Adicionar" abre um seletor que **anexa um chip por escolha** e permanece aberto. **1 clique para abrir + 1 por item.** Itens já escolhidos aparecem desabilitados; não há linha vazia para sobrar.

Efeito colateral desejado: elimina também o resíduo do item 9 do checklist — o caminho "clica Adicionar e simplesmente fecha o editor" já não cria linha nenhuma. O `closeQuick` continua no lugar, cobrindo o cancelamento do cadastro inline.

**Validação:** `bunx eslint` nos dois arquivos — limpo, 0 problemas. `bun run typecheck` — limpo. `MapearProcessoPage.test.tsx` + `etapaEditor.test.ts` — **29/29 passando**. Validação visual no `bun run dev` (:8080) feita pelo Alexandre.

**Alcance conferido antes de mexer:** `ChipSelector` tem 6 usos — 4 no `EtapasEditorModal` (Docs Entrada, Docs Saída, Executado por, Sistemas) e 2 no `MelhoriaFormModal`, que não passam as props novas e seguem idênticos.

---

## 7. Escritas no banco aguardando OK explícito

Nada foi escrito. As operações prontas para rodar, na confirmação do Alexandre:

| # | Operação | Alvo |
|---|---|---|
| 1 | `assigned_to` = Alexandre e `estimated_hours` = 15.5 | `99d62017-…` *Preenchimento do MAPA* |
| 2 | `status` = `completed` | `843a44f5-…` export do ROI |
| 3 | `status` = `completed` | `e2844794-…` seção "Operação" |
| 4 | `status` = `completed` | `6a07f1c4-…` linha vazia órfã |
| 5 | `status` = `completed` | `05879a21-…` adicionar processo no painel (S09) |
| 6 | `status` = `completed` | `be9749c3-…` adicionar processo no painel (S10, duplicata) |
| 7 | `status` = `completed` | `f74a1972-…` revisar item por item (entrega = este documento) |
| 8 | `status` = `completed` | `f3212243-…` reduzir cliques (§6) |

A #7 depende de aceitar este documento como a entrega da tarefa; a #8, da validação visual do §6.

Sugestão adicional, fora da lista acima porque é decisão de coordenação: **mover a #1 para a Sprint 11** e transcrever as 8 subtarefas nomeadas do arquivo-fonte (com datas de 03 a 07/08 e horas de 0,5 a 3,5h), em vez de manter uma linha única de 15,5h vencendo em 31/07 sob "Tarefas órfãs".
