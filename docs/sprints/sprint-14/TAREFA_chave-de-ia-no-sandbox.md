# TAREFA 9 — A IA não responde no sandbox

> **Decisão dela em 23/09/2026**, ao ver o "Ditar tarefas" do backlog falhar no sandbox:
> em vez de colocar uma chave própria às pressas, **o Bernardo avalia as opções** e decide.
>
> **Banco: não.** Nenhuma migração, nenhuma RPC. É configuração de ambiente, e
> possivelmente um helper compartilhado nas edge functions.
>
> **Responsável pela avaliação: Bernardo.**

## O que aconteceu

O botão **Ditar tarefas** (`/equipe/backlog`, commit `0cc03dd6`) chama a edge function
`gerar-demandas-sprint`. Ela foi publicada no sandbox em 23/09 e, no teste de ponta a ponta,
respondeu **503**: *"Nenhuma chave de IA configurada. Configure ANTHROPIC_API_KEY ou
LOVABLE_API_KEY no Supabase."* A importação de arquivo, que não usa IA, funciona.

## Por que não é só colar uma chave

[`planos/agente-psa-assistente.md`](../../planos/agente-psa-assistente.md) §6.0 registra,
medido em 25/08: a `LOVABLE_API_KEY` **é gerada pelo Lovable por projeto e não existe
caminho oficial para obtê-la fora de um projeto gerenciado por eles**. Produção é Lovable
Cloud e tem a chave; o sandbox é um projeto Supabase comum e não tem como tê-la.

E quase todas as funções de IA leem **só** essa chave. Varredura de 23/09 em
`supabase/functions/`:

| lê `LOVABLE_API_KEY` e também `ANTHROPIC_API_KEY` | lê só `LOVABLE_API_KEY` |
|---|---|
| `gerar-demandas-sprint`, `analise-inteligente-sprints` | `agente-psa`, `gerar-recomendacoes-pessoas`, `gerar-relatorio-individual`, `gerar-sintese-executiva`, `processar-procedimento`, `restructure-novidade`, `restructure-process` |

Uma chave Anthropic no sandbox destrava **as duas da esquerda**; as sete da direita
continuam mudas. O mesmo plano conta que o `agente-psa` já teve um segundo caminho
(OpenRouter), e que ele foi retirado.

## Opções para avaliar

| | Opção | Destrava | Custo e risco |
|---|---|---|---|
| A | `ANTHROPIC_API_KEY` própria só no sandbox | 2 de 9 funções | Conta e cobrança da PSA na Anthropic. Não mexe em código |
| B | Um helper `_shared/` que tenta a chave do Lovable e, sem ela, uma chave própria; as nove passam a usá-lo | 9 de 9 | Toca nove funções. É o caminho que o `agente-psa` já teve e perdeu: vale saber por que saiu antes de repetir |
| C | Resposta simulada no sandbox quando não há chave | e2e e tela, **sem testar o prompt** | Sem custo. Esconde erro de prompt até produção |
| D | Manter como está: IA só se testa em produção | nada | O que vale hoje para o `agente-psa`. Toda mudança de prompt vai ao ar sem ensaio |

**A decidir junto:**

- **D1** — Qual opção, ou qual combinação (A agora e B depois, por exemplo).
- **D2** — Se houver chave própria: em qual conta, com qual limite de gasto e com quem
  guarda a chave. Ela vai em *Edge Functions → Secrets* do painel do sandbox, nunca no
  repositório nem no chat.
- **D3** — Se o provedor escolhido também deve servir à transcrição de áudio. O microfone
  do feed é desenho, não função (`CommentComposer.tsx`, "item 8 do checklist do feed"), e
  o Claude não transcreve áudio: se a resposta for "vamos precisar de outro provedor",
  melhor saber agora.

## Subtarefas

- **T0 — Conferir produção.** O "Ditar tarefas" em produção depende de duas coisas que não
  foram conferidas: `gerar-demandas-sprint` estar publicada lá (publicar é pelo chat do
  Lovable; merge no GitHub não publica a função, ver §6 do plano do agente) e a versão
  publicada já ter o modo `ditado`. Sem isso, o botão chega na `main` e falha.
- **T1 — Registrar a decisão** (D1–D3) nesta tarefa.
- **T2 — Executar a opção escolhida.** Se for a B, uma frente por PR, começando pelas duas
  que já leem as duas chaves.
- **T3 — Aceite:** no sandbox, "Ditar tarefas" com duas tarefas faladas devolve duas
  demandas para revisão, e nenhuma entra sem o clique em "Adicionar".
