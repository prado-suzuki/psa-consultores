# Fluxo do processo

> **NOTA DE ARQUIVO:** esta é uma nota de trabalho anterior e não substitui
> confirmação humana. A fonte canônica de aceite é
> [`../levantamento-contratos-rurais.md`](../levantamento-contratos-rurais.md).

**Inteiro rotulado `[MAP]`/`[ROAD]`/`[PAR]` — mapeado, não validado.** É a leitura
de um documento de entrevista/análise interna sobre como o processo funcionaria, não
uma verificação direta. Onde um contrato real confirma um pedaço, isso está anotado
à parte.

## As 5 etapas descritas em `[MAP]`

```
1. Planejamento Tributário Rural (define o % da parceria)
   ↓ (produzido pelo Fiscal — Felipe/Ricardo — a partir de planilha de exploração
      preenchida pelo cliente)
2. Distrato de Arrendamento — só se já havia arrendamento prévio sobre o imóvel
   ↓ (obrigatório antes da parceria; parceria e arrendamento não podem coexistir)
3. Contrato de Parceria Rural
   ↓ (Anexo Único montado a partir do bloco de imóvel do Contrato Social da Agro)
4. Contrato de Composse
   ↓ (remete à Parceria como "instrumento principal"; pro indiviso por padrão)
5. Assinatura, Registro e Manutenção (Aditivos)
   (mudança de área, nova matrícula ou novo percentual → Termo Aditivo)
```

### O que cada etapa confirma ou não contra os contratos reais

| Etapa | Selo | Observação |
|---|---|---|
| 1. Planejamento Tributário Rural | MAPEADO, mas o **produto** existe: `[SERIO]` é um exemplar real desse entregável | Não confirmado o fluxo de handoff em si (é aliás um gargalo citado: "Interface OSG↔Fiscal sem visibilidade") |
| 2. Distrato de Arrendamento | MAPEADO, não observado | Nenhum Distrato real foi aberto nesta rodada; compatível com o fato de Terra Viva ter pasta própria de "Contrato de Arrendamento" separada da de Parceria, mas isso não prova a regra de exclusão mútua |
| 3. Contrato de Parceria | **Estrutura do documento CONFIRMADA** em 3 clientes (`[CHI-PAR]`, `[MMS-PAR]`, `[TV-ADT]`) | O método de montagem do Anexo por cópia do Contrato Social é hipótese `[MAP]`, coerente mas não verificada |
| 4. Contrato de Composse | **Estrutura CONFIRMADA** em 2 clientes (`[CHI-COM]`, `[MMS-COM]`) | "Remete à Parceria como instrumento principal" — CONFIRMADO no texto real (`[CHI-COM]` preâmbulo) |
| 5. Aditivos | **Padrão de aditivo CONFIRMADO** em `[TV-ADT]` (delta + consolidação, reaproveita o motor de Alteração Contratual) | Frequência/volume ("dezenas de versões ao longo de décadas") é só `[MAP]` — mas achei pelo menos 2 rodadas reais de aditivo (Parceria e Composse) na Terra Viva, o que é compatível |

## O processo P2 (`[ROAD]`, 24/06/2026) — onde cada etapa vira template

| Processo | Nome | h/projeto | Template hoje | Prioridade roadmap |
|---|---|---|---|---|
| P2.09 | Planejamento Tributário Rural | 7,55 | não aplicável — é estudo, não gera contrato | gargalo declarado: interface Fiscal↔OSG sem visibilidade |
| P2.13 | Distrato de Arrendamento Preexistente | 6,35 | ausente | reuso baixo — caso raro |
| **P2.14** | **Contrato de Parceria Rural** | **12,55** | **ausente** | **alta — 2º maior ROI de baixo custo de montagem** |
| **P2.15** | **Contrato de Composse** | **6,6** | **ausente** | média — complementar ao P2.14 |
| P2.16 | Termo de Encerramento de Safra | não mapeado (0 etapas) | ausente | **crítico**: é o único processo do P2 sem etapas mapeadas, e é o documento que formaliza o ajuste final do percentual (art. 96, §2º do Estatuto da Terra) |

## O cronograma real (`[SPRINT11-GOAL]`, lido direto de `sprints.goal` — não do roadmap.json)

**Isto substitui a seção anterior**, que citava só `[PAR]` (parecer de 25/07,
não validado) e um esquema de marcos (`P2-ONDA2-RURAL` em S13,
`P2-SPEC-ESTRUTURA-RURAL` em S16) que **não bate com o que o banco vivo
mostra hoje**. Não sei se o `roadmap.json` mudou depois do parecer ou se ele
nunca chegou a ser aplicado como o próprio parecer supunha — não investiguei
isso. O que sei, direto da tabela `sprints`, é:

- A sprint em andamento é a **11** (10-21/08/2026), `goal` lido por completo.
  Trecho decisivo: *"Duas frentes de levantamento que são portão da Sprint 12:
  governança (...) e contratos rurais (campos de parceria e composse + o
  motor de partes escolhidas à mão). Quem levanta constrói na próxima."*
- A **"próxima sprint"** que o card da ALE-3 pressupõe é literalmente a
  **Sprint 12** — `12_Sprint_planejamento tributário e contratos agrários`
  (17-28/08/2026, projeto "P3 - Sucessão"), confirmado pelo nome e pela frase
  acima.
- Sprint 12 tem `goal IS NULL` e **0 `sprint_deliverables`** — é uma casca
  vazia, só com nome e datas. Não existe hoje nenhum marco técnico
  equivalente a `P2-ONDA2-RURAL` ou `P2-SPEC-ESTRUTURA-RURAL` no sistema de
  tarefas real — só no documento de parecer, que é análise, não registro.
- Ainda na Sprint 11, o item "Telas novas de cadastro (28h)" cobre **proposta
  comercial** + **a tela onde o Fiscal preenche o planejamento tributário**
  (ALE-9/EDU-13) — confirmando que essa tela é trabalho desta sprint, de
  outra tarefa, não da Sprint 12 nem da ALE-3.

**Conclusão prática:** o que esta tarefa produz (a tabela de campos + o
mockup) é literalmente o material com que a Sprint 12 vai ser desenhada — não
há outro plano já escrito para comparar. As duas hipóteses de arquitetura em
`01-campos.md` (seção D) e as perguntas em `04-perguntas-abertas.md` são o
que falta decidir para a Sprint 12 ganhar `goal` e tarefas.
