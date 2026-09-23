# DEMAIS ROTAS DO OSG WORK — AJUSTES DE CONTEÚDO E NAVEGAÇÃO

**Lista executável para implementação • Responsável: Alexandre • TIP-03**

**Objetivo:** ajustar textos, nomenclaturas e pontos de navegação das rotas que sobraram, para que
o nome clicado no menu seja o nome encontrado na tela, o subtítulo diga o que a pessoa faz ali, e
nenhum rótulo dependa de conhecimento interno para ser entendido.

**Escopo:** os agrupamentos **Onboarding** (Cadastro por Documento), **Estrutura do Cliente**,
**Governança**, **Oficina de Contratos**, **Ferramentas / Cálculos** e **Relatórios**. Os
agrupamentos Documentos e a Solicitação de documentos são da TIP-02, em
[`Ajustes_Solicitacao_e_Checklist_para_Tarefas.md`](Ajustes_Solicitacao_e_Checklist_para_Tarefas.md).

**Origem dos achados:** especificação final do menu (tarefa 1), decisões registradas nos canais da
equipe entre 09 e 18/09/2026, treinamento de 09/09, e leitura das telas pela árvore de
[`geral/texto-explicativo-na-tela.md`](../../geral/texto-explicativo-na-tela.md).

**Nota de estado:** os **16 subtítulos** foram revisados na tarefa 1 e estão conformes à régra
"verbo + objeto + finalidade". Esta lista trata do que sobrou depois daquela passada.

---

## 1. Nomenclatura — o nome não bate

| Local | Campo | Texto atual | Ajustar para | Motivo do ajuste |
|---|---|---|---|---|
| Menu → Ferramentas / Cálculos | Rótulo da tela | Calculadora de **ITCD** | Calculadora de **ITCMD** | **Decisão registrada em 09/09/2026:** ITCMD é a sigla do texto constitucional (art. 155, I) e o padrão para documentação e integração; ITCD é a forma simplificada de alguns estados. A rota **já é** `/calculadora-itcmd`, a pasta de componentes também — hoje só o rótulo e os textos discordam. **São 18 ocorrências visíveis**, em 6 arquivos: `CalculadoraItcmd.tsx`, `calculadora-itcmd/{CenariosEmColunas,NovaSimulacaoModal,SimulacaoAberta,itcmdKit,itcmdFmt}` e `documentos/checklistPadrao.ts` |
| Calculadora | Subtítulo | "Simule o **ITCD** sobre doações de quotas em diferentes cenários de avaliação." | "Simule o **ITCMD** sobre doações de quotas em diferentes cenários de avaliação." | Mesma decisão. A frase no mais está correta e não muda |
| Calculadora | Textos internos | Toda ocorrência visível de "ITCD" | "ITCMD" | A sigla tem que ser a mesma do começo ao fim do fluxo |

**Como implementar:** `src/lib/navegacaoOsgWork.ts` (chave `calculadoraItcd` — **o nome da chave
também muda, para `calculadoraItcmd`**, e o `satisfies` do objeto faz o compilador apontar todos os
usos) · `src/pages/equipe/osg/CalculadoraItcmd.tsx` e componentes da pasta da calculadora.
**Não mexer** na rota, no nome do arquivo nem em nome de coluna, tabela ou enum: é rótulo, não
endereço. **Origem:** decisão da coordenação, 09/09.

---

## 2. Texto que não descreve a tela

**FEITO em 18/09/2026, por outra lista.** O subtítulo de Relatórios prometia "diagnóstico
patrimonial e quadro societário" — as duas peças da outra tela. A revisão de textos da coordenação
achou o mesmo erro no mesmo dia, com outra redação, e as duas foram conciliadas em
[`../../tarefas-executadas/2026_09_18_relatorios-e-apresentacoes.md`](../../tarefas-executadas/2026_09_18_relatorios-e-apresentacoes.md)
§2: ficou **"Consulte e imprima os imóveis explorados, os produtores responsáveis e a origem da
posse."**, que guarda o verbo desta lista ("imprima", a única ação da tela) e o conteúdo da
revisão, e não nomeia os relatórios — que foram renomeados na mesma passada.

A linha saiu daqui para não haver duas redações concorrentes da mesma correção.

---

## 3. Jargão e mistura de idioma

| Local | Campo | Texto atual | Ajustar para | Motivo do ajuste |
|---|---|---|---|---|
| Montagem de Documentos → escolha do tipo | Descrição da opção | "Sociedade — vai à junta e **carimba o ledger**" | "Sociedade — registra na junta comercial e movimenta as quotas" | "Ledger" e "carimba" exigem conhecimento interno. A frase longa logo abaixo já explica o resto; a linha da opção precisa ser entendida sem ela |
| Montagem de Documentos → escolha do tipo | Descrição da opção | "Avulso — não mexe na sociedade" | "Avulso — não altera a sociedade" | "Não mexe" é coloquial. O par das duas opções tem que ler no mesmo registro |
| Biblioteca de Modelos → filtro | Rótulo | "**Flag** de composição" (~311) e "Todas as **flags**" (~317) | "Regra de composição" e "Todas as regras" | Mistura de inglês e português num rótulo de filtro, **nos dois textos do mesmo controle**. O padrão retira inglês onde existe palavra corrente |
| Controle de Matrículas → filtro | Rótulo | "Órfãs **(!)**" | "Órfãs" | O "(!)" não informa nada: a coluna já marca a matrícula órfã, e o balão já explica o que é. Pontuação decorativa em rótulo de filtro vira ruído |

**Como implementar:** `src/pages/equipe/osg/MontagemDocumentos.tsx` (~191-192),
`src/pages/equipe/osg/BibliotecaModelos.tsx` (~311), `src/pages/equipe/osg/ControleMatriculas.tsx`
(~132). **Origem:** tela.

---

## 4. Promessa maior que a entrega

| Local | Campo | Texto atual | Ajustar para | Motivo do ajuste |
|---|---|---|---|---|
| Gerar Documento | Subtítulo | "Gere documentos **preenchidos automaticamente** com os dados cadastrados." | "Gere documentos com os dados já cadastrados e revise antes de enviar." | A especificação final pede, com todas as letras, *"evitar 'o documento sai pronto'; usar linguagem que represente com precisão a automação e **preserve eventual necessidade de revisão**"*. O texto atual promete um documento pronto e o fluxo real tem conferência |

**Como implementar:** `src/lib/navegacaoOsgWork.ts` (chave `gerarDocumento`).
**Origem:** especificação final do menu (tarefa 1, §5).

---

## 5. Consistência entre telas irmãs

Seis telas abrem com a mesma frase e **três verbos diferentes** para a mesma coisa. A régua diz: a
mesma palavra para o mesmo conceito, do começo ao fim do fluxo.

| Local | Campo | Texto atual | Ajustar para | Motivo do ajuste |
|---|---|---|---|---|
| Qualificação das Partes | Estado vazio | "…para **visualizar e gerenciar** a qualificação das partes." | "…para **abrir** a qualificação das partes deste cliente." | Três formas para a mesma ação nas telas vizinhas |
| Quadro Societário | Estado vazio | "…para **visualizar e gerenciar** o quadro societário." | "…para **abrir** o quadro societário deste cliente." | idem |
| Cadastro Patrimonial | Estado vazio | "…para **visualizar e gerenciar** o Cadastro Patrimonial." | "…para **abrir** o Cadastro Patrimonial deste cliente." | idem |
| Controle de Matrículas | Estado vazio | "…para **gerenciar suas** matrículas." | "…para **abrir** as matrículas deste cliente." | "suas" é ambíguo: do cliente ou de quem está lendo? |
| Acordo de Quotistas | Estado vazio | "…para **abrir o acordo dele**." | "…para **abrir** o acordo deste cliente." | "dele" tem o mesmo problema de "suas" |
| Cadastro por Documento | Estado vazio | "…para **começar pelos** documentos recebidos." | "…para **abrir** os documentos recebidos deste cliente." | idem |

**A forma canônica**, para toda tela que dependa de cliente selecionado:

> Selecione um cliente na barra acima para abrir {o quê} deste cliente.

**Como implementar:** cada página listada acima, no `OnboardingEmptyState`/bloco de estado vazio.
**Origem:** tela.

---

## 6. As dúvidas do treinamento e do canal

| Local | Campo | Problema | Ajustar para | Motivo do ajuste |
|---|---|---|---|---|
| Qualificação das Partes | Texto de apoio (não existe) | *"Qual que é a finalidade de cadastrar aqueles documentos? Ele vai ficar vinculado nesse sistema ou vai nos dar um documento de qualificação pronto?"* — pergunta feita no treinamento de 09/09, que levou dois minutos e duas pessoas para ser respondida | Acrescentar abaixo do título: "Os dados cadastrados aqui alimentam o checklist de documentos, a calculadora de ITCMD, o quadro societário e a geração de contratos." | É a única pergunta do treinamento que ninguém conseguiu responder pela tela. A resposta é a mesma que foi dada na sala |
| Qualificação das Partes → cadastro de PJ | Comportamento | *"Por que ao cadastrar contribuinte CNPJ os dados vêm na grande maioria, e na qualificação das partes não vêm?"* — canal, 04/09 | **Fora desta lista.** Não é texto: é o preenchimento por CNPJ que não existe nesta tela | Registrado para virar tarefa própria. Escrever um texto explicando a ausência seria usar explicação para compensar o fluxo |

**Como implementar:** o primeiro item em `src/pages/equipe/osg/QualificacaoDasPartes.tsx`, como
texto de apoio permanente (`<p className="text-sm text-muted-foreground">` com `id` e
`aria-describedby`, §3 do padrão) — **não** como tooltip: é informação que orienta o trabalho
inteiro da tela, não detalhe complementar. **Origem:** treinamento 09/09 e canal 04/09.

---

## 7. Placeholders fora das formas canônicas

Varredura completa das rotas, 18/09/2026. O padrão fixa quatro formas — `Selecione…` · `Buscar…` ·
`Ex: …` · vazio —, reticências é `…` e nunca `...`, e placeholder **nunca** é instrução.

**Dezoito ocorrências de `ex:` em minúscula.** A forma canônica é `Ex:` com maiúscula (57 × 18 na
medição que originou o padrão).

| Arquivo | Linhas |
|---|---|
| `pages/equipe/osg/MontagemDocumentos.tsx` | 160, 168 |
| `osg/EditorBlocoDialog.tsx` | 150, 217, 234, 344 |
| `osg/diagnostico-patrimonial/exploracao-rural/ExploracaoRuralDadosTab.tsx` | 116, 392, 437, 458 |
| `osg/diagnostico-patrimonial/exploracao-rural/OrigemExternaDialog.tsx` | 96, 129 |
| `osg/diagnostico-patrimonial/bem/BemDadosTab.tsx` | 31, 42, 47 |
| `osg/diagnostico-patrimonial/matricula/MatriculaDadosTab.tsx` | 99 |
| `osg/diagnostico-patrimonial/titularidade/TitularesIniciaisSection.tsx` | 205 |
| `osg/documentos/classificar/BaldePanel.tsx` | 102 |

**Dez ocorrências de `...` onde devia ser `…`**, e uma delas vale por todas:

| Arquivo | Linha | Texto atual | Ajustar para |
|---|---|---|---|
| **`osg/OsgLayout.tsx`** | **99** | `Selecione um cliente...` | `Selecione…` |
| `osg/quadro-societario/TabelaSocios.tsx` | 99 | `Buscar sócio...` | `Buscar…` |
| `osg/onboarding/DocumentEditorDialog.tsx` | 285 | `Selecione...` | `Selecione…` |
| `osg/documentos/classificar/FichaFormularios.tsx` | 71 | `Selecione o i…...` | `Selecione…` |
| `pages/equipe/osg/ControleMatriculas.tsx` | 331 | `Buscar bem (referência, denominação…)...` | `Buscar…` |
| `osg/checklists/ChecklistPendentes.tsx` | 318 | `Buscar pessoa, imóvel ou documento...` | `Buscar…` |
| `osg/diagnostico-patrimonial/CartorioSelect.tsx` | 125, 217 | `Buscar cartório...` / `Cartório de…...` | `Buscar…` |
| `osg/diagnostico-patrimonial/titularidade/TitularesIniciaisSection.tsx` | 185 | — | `Buscar…` |
| `osg/diagnostico-patrimonial/VincularMatriculaDialog.tsx` | 36 | `Buscar…...` | `Buscar…` |

**O `OsgLayout.tsx:99` é o seletor de cliente da barra superior — ele aparece nas 19 telas do OSG
Work.** É um texto sob medida ocupando o lugar de uma forma canônica, no controle mais visto da
área inteira.

**E um placeholder que é instrução:**

| Local | Campo | Texto atual | Ajustar para | Motivo do ajuste |
|---|---|---|---|---|
| Órgãos de Governança → modal | Placeholder | "Digite e tecle Enter" | `""` (vazio), e a instrução vira texto de apoio abaixo do campo: "Tecle Enter para adicionar cada item." | Placeholder é forma do campo, nunca instrução essencial (§3). Instrução que some ao digitar é instrução perdida |

**Nota de escopo, e ela importa:** os 225 placeholders fora do cânone são **backlog técnico
paralelo** declarado no padrão — tarefa própria, por inventário. O que entra aqui são **só os das
rotas desta lista**, porque são rótulo e nomenclatura, que é o recorte da tarefa. Pagar estes
desce o número da catraca, e o número desce no mesmo commit.

---

## 8. Conferir antes de alterar

Um ponto que a leitura levantou e que **não** deve ser mexido sem verificar na tela:

- `src/pages/equipe/osg/DiagnosticoPatrimonial.tsx` tem a string **"Diagnóstico Patrimonial"** no
  corpo do arquivo, enquanto o rótulo da tela é **"Cadastro Patrimonial"**. Pode ser comentário,
  pode ser o nome do relatório (que **não** foi renomeado, por decisão registrada), ou pode ser
  rótulo divergente de verdade. **Abra a tela e confira** antes de tocar: se for o relatório, está
  certo como está.

---

## 9. O que fica de fora, e é decisão

- **Os 16 subtítulos** foram revisados na tarefa 1 e estão conformes. Desta lista muda só o de
  **Gerar Documento** (§4); o de Relatórios saiu para a lista de Relatórios e Apresentações (§2).
- **"Diagnóstico Patrimonial" como nome do relatório** não se renomeia. A colisão com o nome da
  tela de cadastro foi decidida: a tela virou "Cadastro Patrimonial" e o relatório manteve o nome,
  porque ali a palavra "diagnóstico" é literal.
- **`documento_tipo.modulo`** guarda o nome antigo em 29 linhas de produção. Renomear lá é
  migração de dado, não de rótulo.
- **A ordem do menu e os agrupamentos** já foram entregues na tarefa 5. Esta lista não reordena
  nada.

---

## Regra de consistência para próximos ajustes

O nome clicado no menu é o nome encontrado no título da tela, e a sigla é a mesma do começo ao fim
— inclusive na rota, quando ela já estiver certa. Telas irmãs abrem com a mesma frase e o mesmo
verbo. Nenhum rótulo depende de conhecimento interno para ser lido: se a palavra só faz sentido
para quem é da casa, ela não é rótulo, é jargão.
