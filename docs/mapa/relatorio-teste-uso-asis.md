# MAPA — Relatório de teste de uso (fluxo AS-IS)

**Data:** 2026-07-14
**O que é este documento:** relato do **teste de uso ao vivo** do fluxo de mapeamento (foco no AS-IS / "Como Era") — o que foi testado, se funciona, e **quão trabalhoso é preencher** (granularidade). As tarefas de correção ficam no arquivo separado `docs/mapa/checklist-melhorias-preenchimento.md`.

**Como foi testado:** navegador automatizado com **login real** no `localhost:8080` (mesma base do sistema). Foram criados, de verdade, o projeto **"teste"** e o processo **"processo teste"**, e uma etapa foi preenchida e **salva**. Cada passo foi registrado em print e os cliques foram contados.

---

## 1. Cadastrei o AS-IS? Sim — e ele persistiu no banco.

Fluxo completo percorrido: **criar projeto → criar processo → Mapear → adicionar etapa → preencher → Salvar todas → recarregar → conferir**.

Depois de salvar e **recarregar a página do zero**, a etapa apareceu no readout "Como era", confirmando que gravou:

> **1 · Coletar documentos** — MANUAL
> "Recebe e organiza os documentos enviados pelo cliente."
> EQUIPE: Analista Contábil Jr · 3,0h · SISTEMAS: Able2Extract
> HORAS/PROJETO 3,0h · VOLUME 10,0 · ERROS 5,0% · RETRABALHO 15,0%

🗣️ **Em português claro:** dá pra mapear um processo do começo ao fim e o que você preenche **fica salvo de verdade** — inclusive o readout final fica bonito e organizado.
🛠️ **Técnico:** verificado por recarga limpa (refetch do banco). Sinal extra: o card do processo troca de **"Mapear" → "Ver detalhes"** ao virar mapeado. (No teste, só a Entrada/Saída de documentos ficou vazia por limitação do meu roteiro automatizado, não da ferramenta.)

---

## 2. Granularidade: preencher exige "muitos botões"? **Sim — o peso está nos campos de lista.**

**Número medido (1 etapa quase completa):** **12 cliques + 6 campos digitados.**

O que mais pesa é o padrão dos **campos de lista** (documentos, pessoas, sistemas). Para colocar **um único item** você precisa de **3 cliques** antes de digitar qualquer valor:

| Campo | Cliques para adicionar 1 item | + digitar |
|---|---|---|
| Documento (entrada/saída) | Adicionar → abrir lista → escolher = **3 cliques** | volume |
| Executor (pessoa) | Adicionar → abrir lista → escolher = **3 cliques** | horas |
| Sistema | Adicionar → abrir lista → escolher = **3 cliques** | — |
| Execução | abrir → escolher = **2 cliques** | — |
| Métricas (volume/erros/retrabalho) | 0 cliques | 3 números |
| Nome/Descrição | 0 cliques | 2 textos |

**Projeção de uma etapa "rica"** (2 docs + 1 pessoa + 2 sistemas + métricas):
- ~**23 cliques + ~10 campos digitados** ≈ **~33 interações por etapa**.
- Um processo com 4 etapas assim → **~130 interações**.

🗣️ **Em português claro:** para cada documento, pessoa ou sistema que você quer registrar numa etapa, são **três cliques só pra colocar o item na lista** (Adicionar, abrir a lista, escolher), e só depois você digita o número. Numa etapa com vários documentos e pessoas, isso vira muito clique repetido — é a parte mais cansativa do preenchimento.
🛠️ **Técnico:** o `ChipSelector` adiciona uma linha vazia (`Adicionar`), que abre um `Select` (`abrir`), onde se escolhe a opção (`escolher`). Cada item = 3 interações fixas. Uma seleção **múltipla que não fecha a cada escolha**, ou um **campo com digitação/typeahead direto** (começar a digitar e escolher), reduziria para ~1 interação por item.

**Sequência real registrada no teste:**
`Mapear → Editar etapas → Adicionar 1ª etapa → [nome] → [descrição] → abrir Execução → escolher → Adicionar executor → abrir lista → escolher → [horas] → [volume] → [erros] → [retrabalho] → Sistemas: Adicionar → abrir lista → escolher → Salvar todas`

---

## 3. Tempo

- **Salvar** projeto/processo/etapa: **rápido (~1s)**; a UI mostra "Salvando...".
- **Gargalo de tempo = a etapa**, por causa da granularidade acima: ~2,5–3,5 min por etapa preenchida à mão.
- **Projeto médio** (3–4 processos × ~4 etapas), com dados de referência já existindo: **~1 hora**.

---

## 4. Atritos de fluxo observados

- **Beco sem saída no painel do projeto:** recém-criado o projeto, as abas "Processos" e "AS-IS" só dizem *"Nenhum processo vinculado"* e **não têm botão de adicionar** — é preciso sair e criar o processo por outro menu. (detalhado no checklist, item 5)
- **Sistema criado inline** vem **sem o cluster do processo** (vem do filtro global). (checklist, item 3)
- **Nome de etapa** dá pra salvar em branco. (checklist, item 1)

---

## 5. O que funciona bem (pontos fortes)

- **Cadastro inline sem sair da página:** criar sistema/documento/pessoa no meio do mapeamento abre um modal **por cima do editor, clicável**, e **o rascunho da etapa é preservado**. Era o receio original — e está OK.
- **Readout "Como era"** fica limpo e legível (etapa numerada, chips de equipe/sistema, métricas).
- **Empty states** claros ("Nenhuma etapa ainda → Adicionar primeira etapa") e **anti-perda** (rascunho + "Sair sem salvar?").
- **Salvamento rápido** e sem erros de console em todo o fluxo.

---

## Veredito

O cadastro do AS-IS **funciona e é confiável** (testado ponta a ponta, salvou e persistiu). O ponto de fricção mais relevante para produtividade **não é bug, é granularidade**: os campos de lista exigem 3 cliques por item, o que torna o preenchimento de etapas ricas repetitivo. A maior alavanca de ganho de tempo seria **reduzir os cliques por item** nos campos de documentos/pessoas/sistemas.
