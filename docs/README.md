# Manual do `docs/`

Onde cada coisa mora, e como decidir sem perguntar. **Leia antes de criar arquivo aqui.**

Este manual existe porque a desorganização tem um custo medido: em 23/09/2026, uma varredura
achou 42 documentos de tarefa espalhados por cinco pastas, **nenhum** deles no backlog da
ferramenta, e **seis com status errado** — cinco tarefas de banco davam-se por pendentes e já
estavam em produção há semanas.

## A pergunta que decide tudo

Antes de criar um `.md` aqui, responda **uma** pergunta: *isto é trabalho que alguém vai pegar
e fazer?*

| Resposta | Vai para | Nome do arquivo |
|---|---|---|
| **Sim, é trabalho pendente** | `tarefas-a-executar/` | `yyyy_mm_dd_<o-que-faz>.md` |
| Sim, mas **já foi feito ou cancelado** | `tarefas-executadas/` | o mesmo nome, sem mudar a data |
| Não: é **desenho** de como algo vai funcionar | `planos/` | `<assunto>.md` |
| Não: é **decisão, medição, especificação ou texto em vigor** | a pasta do módulo | `<assunto>.md` |
| Não: é **saída gerada** por ferramenta | a subpasta do módulo que a gerou | — |

Na dúvida entre plano e tarefa: **tarefa tem subtarefas numeradas (`T1`, `T2`, …) e critério de
aceite.** Documento que só descreve um desenho é plano, mesmo que fale de trabalho futuro. Um
documento que se declara "inventário" ou "análise" é **fonte** de tarefa, não tarefa — ele fica
na pasta do módulo, e as tarefas que saem dele nascem em `tarefas-a-executar/`.

## O mapa

```
docs/
├── README.md                      ← este manual
├── INDICE-PLANOS.md               ← índice dos PLANOS: feito, parcial, aberto, morto, referência
├── AI_CONTEXT.md                  ← contexto-mestre do projeto
├── ambiente-de-desenvolvimento.md ← leitura obrigatória antes de qualquer coisa sobre banco
│
├── tarefas-a-executar/            ← SÓ trabalho pendente. Entregou, sai daqui
│   ├── README.md                  ← índice da fila, uma linha por tarefa
│   └── PARA-O-BACKLOG.md          ← pronto para o botão Importar tarefas de /equipe/backlog
│
├── tarefas-executadas/            ← histórico: tarefa entregue ou cancelada
│   └── README.md                  ← índice, com a sprint que entregou e o estado em produção
│
├── sprints/                       ← o registro da sprint, que não é tarefa
│   ├── TRIAGEM-DE-TAREFAS-2026-09-23.md  ← por que uma tarefa não está na fila
│   └── sprint-<N>/                ← índice da sprint, planilhas de planejamento, documentos de contexto
│
├── planos/                        ← desenho e arquitetura, transversais a módulo
├── osg/    mapa/    rls/          ← por módulo
├── geral/                         ← transversal que não é plano (decisão, medição, padrão)
└── skills/                        ← skills de agente
```

**Só quatro arquivos podem viver na raiz de `docs/`**: os quatro acima. Qualquer outro `.md`
solto aqui está no lugar errado — é a regra mais fácil de conferir e a primeira que se quebra.

## As cinco regras

1. **Nada solto na raiz.** Nem de `docs/`, nem do repositório. Se não couber em nenhuma pasta,
   a pasta certa ainda não existe: crie `docs/<modulo>/`.
2. **Tarefa nasce em `tarefas-a-executar/` com a data de criação no nome** e ganha uma linha no
   `README.md` de lá. A data faz tarefa velha parecer velha ao abrir a pasta.
3. **Tarefa entregue sai da pasta** e vai para `tarefas-executadas/`, **no mesmo commit do
   código**, com a linha atualizada nos dois índices. O nome do arquivo não muda — a data é a de
   criação, e é a idade da demanda que interessa no histórico. Cancelada faz o mesmo caminho e
   ganha `_CANCELADA` no fim do nome. Uma pasta em que só há trabalho pendente é uma pasta em que
   se pode confiar; uma que mistura os dois obriga a ler tudo.
4. **Status de banco não se escreve de cabeça.** Antes de marcar uma tarefa como pendente em
   produção, confira lá (MCP do Lovable, **só SELECT**). Migration aplicada pelo chat do Lovable
   não deixa rastro no repositório, e `supabase_migrations.schema_migrations` de produção não
   registra tudo. Foi assim que seis status ficaram errados.
5. **A tarefa linka o plano, não o copia.** Plano longo fica em `planos/` ou na pasta do módulo.
   Duplicar texto cria duas verdades, e a segunda envelhece calada.

## Para quem lê isto sendo um agente

Três arquivos respondem quase tudo, nesta ordem:

1. **`tarefas-a-executar/README.md`** — o que falta fazer. Tabela, uma linha por tarefa, com
   estado e o que depende de produção. O par dele, **`tarefas-executadas/README.md`**, responde
   "isto já foi feito?" sem abrir a pasta de sprint nenhuma.
2. **`INDICE-PLANOS.md`** — o que cada plano é e se ainda vale. Existe para **ninguém abrir um
   documento de 700 linhas** e descobrir no fim que ele foi executado em junho. Leia a linha,
   não o repositório.
3. **`sprints/TRIAGEM-DE-TAREFAS-2026-09-23.md`** — por que uma tarefa **não** está na fila:
   executada, cancelada, ou nunca foi tarefa.

Nenhum dos três exige abrir o documento que descrevem. Essa é a intenção: a leitura cara é a
última, não a primeira. As regras de código, banco e arquitetura estão no `AGENTS.md`, que é a
fonte única — este manual só governa onde os arquivos ficam.

## Ao fechar uma frente

Mude a linha dela no índice **no mesmo commit** do código. Índice que mente custa mais caro que
índice que não existe, porque nele se confia.
