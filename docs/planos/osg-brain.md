# OSG Brain: o desenho geral, e onde o enriquecimento de texto entra nele

Escrito em 24/09/2026, a partir da conversa de planejamento com o Bernardo. As tarefas moram
na ferramenta de sprint (Sprint 14, mãe **OSG Brain**), não em `docs/tarefas-a-executar/`: este
documento é o desenho que liga as tarefas, e **não copia o texto delas**. Na dúvida sobre o
escopo de uma tarefa, vale o card.

**Se você vai implementar o enriquecimento de texto (tarefa 4), leia a seção 4 com atenção.**
Ele é a primeira peça do Brain a virar código, e o que ele criar em `supabase/functions/_shared/`
vai ser usado pelo agente depois. Uma escolha errada ali vira reescrita mais tarde.

## 1. O que é o Brain

Um agente que responde qualquer pergunta sobre o estado dos projetos: tarefas, comentários,
revisões, ajustes, horas. Cada usuário vê apenas o que já veria no app. Exemplos que guiaram
o desenho:

- Diretor: "Como está o andamento da consultoria tributária do cliente X?" A resposta esperada
  diz se está no prazo, onde houve gargalo e quem está esperando o quê ("o Diego está
  esperando o cliente enviar os documentos de ...").
- Coordenador: "Quem da minha equipe está com mais horas alocadas?", "Quantas tarefas estão
  atrasadas no projeto X?"

A diferença para o agente atual do Board (`supabase/functions/agente-psa/`) é de premissa. O
agente do Board **não consulta o banco**: responde sobre o snapshot que a tela publica, para
nunca dar um número diferente do que está desenhado. O Brain existe justamente para consultar o
banco. Por isso ele é uma função nova, e reaproveita do agente atual só a infraestrutura
(conversas, mensagens, lições, painel de configuração).

## 2. As peças

| # | Tarefa (Sprint 14, OSG Brain) | Papel no Brain |
|---|---|---|
| 1, 2 | Conversas com o Prado | Concluídas. Levantaram as perguntas que o Brain precisa responder |
| 3 | Agente para consultar status de projetos | O laço de raciocínio e a conversa |
| 4 | Enriquecimento de texto com perfis configuráveis | **Primeira peça em código.** Cria a camada de chamada ao modelo |
| 5 | Ditado por áudio | Divide o `_shared/ia.ts` com a 4 |
| 6 | Acesso por SQL livre limitado ao escopo de quem pergunta | A porta de leitura do banco |
| 7 | Configurar o Brain no painel do agente | Modelo e limites pela aba Agente |
| 8 | Documento semântico do schema | O que as colunas significam no negócio |
| backlog | Tela de chat com histórico de conversas | Depois; no início o Brain usa o balão do Board |

As camadas, de baixo para cima:

```
  enriquecimento (4)     ditado (5)     Brain (3)          agente do Board (depois)
        │                    │              │                        │
        │                    │     laço + documento semântico (8)    │
        │                    │     config em agente_config (7)       │
        │                    │              │                        │
        │    (quando um perfil precisar de contexto do banco)        │
        ├──────────────────────────────────►│ acesso SQL no escopo do usuário (6)
        │                    │              │
        └──────── _shared/ia.ts: chamarChat, transcrever, erros 429/402 ─────────┘
                  + regras base do prompt (não inventar fato, pt-BR, estilo da casa)
```

## 3. Decisões fechadas

**SQL livre, não catálogo de consultas.** Um catálogo fixo de ferramentas ("resumo_projeto",
"carga_da_equipe") foi descartado: limita as perguntas ao que alguém previu e transforma o
agente num dashboard em texto corrido. O modelo escreve o próprio SQL.

**A RLS é a única regra de escopo.** As policies já fazem a hierarquia (`can_view_org_project`,
`visible_org_project_ids`): admin vê tudo, líder vê projetos com membro da sua área, sublíder os
da sua equipe, membro os próprios projetos. `org_tasks`, `org_task_comments` e `org_comments`
seguem a mesma regra. O Brain não reimplementa permissão.

**Como o SQL livre fica seguro** (tarefa 6):

- O role `brain_reader` tem login próprio, sem `BYPASSRLS`, e `GRANT SELECT` só nas tabelas
  liberadas (por coluna quando houver dado sensível). A função **conecta como ele, nunca como
  `postgres`**: conectando como `postgres`, bastaria um `RESET ROLE` para escapar da RLS.
- Cada pergunta roda numa transação `READ ONLY` com as claims do usuário validado
  (`request.jwt.claims`), `statement_timeout` e `LIMIT` forçado, e termina em `ROLLBACK`.
- Antes de executar, o SQL passa pelo parser real do Postgres (`libpg_query` em WASM): um único
  `SELECT`, com funções só de uma allowlist. A allowlist é o que barra `set_config`, com o qual
  qualquer role forjaria as claims de outro usuário, e as RPCs que leem dados passando por cima
  da RLS. Nenhum grant resolve o `set_config`: a função pertence ao `supabase_admin`.
- Segunda trava: `REVOKE EXECUTE ... FROM PUBLIC` nas funções do `public`, reconcedido a
  `anon`, `authenticated` e `service_role`, mais `ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC` (global, porque o default por schema só adiciona).
  O `brain_reader` recebe `EXECUTE` só nas funções chamadas pelas policies.

**O laço** (tarefa 3): uma ferramenta só, `executar_sql`, com teto de 8 rodadas ou 60 segundos.

- Ambiguidade sobre **qual coisa** (dois clientes "X") vira pergunta de volta, com as opções
  listadas. Ambiguidade sobre **qual recorte** (período, só ativos) ele supõe e declara.
- A query traz o dado agregado no formato da pergunta sempre que possível.
- **Texto nunca é cortado dentro de uma linha.** Resultado acima do orçamento volta como aviso
  para ele refinar a query. Trecho cortado leva o modelo a completar o resto por conta própria,
  e o Bernardo vetou isso de forma explícita.
- Erro do Postgres ou recusa do parser volta ao modelo para ele corrigir, dentro do mesmo teto.
- A RLS não dá erro, ela esconde. Resultado vazio pode ser falta de acesso, então a resposta
  é "não encontrei entre o que você tem acesso", nunca "não existe".
- Ao bater no teto, ele responde com o que tem e diz o que não fechou. Cada rodada emite um
  evento de progresso.

**A resposta**: texto corrido, fontes com link para o projeto e as tarefas citados, as queries
disponíveis sob "como cheguei nisso", e progresso ao vivo.

**O conhecimento do schema** (tarefa 8): escrito primeiro à mão e validado contra as perguntas
do Prado. Depois vira JSON versionado no código, conferido pela CI contra o `types.ts`. No
prompt, o JSON vira texto corrido. Conceitos da casa levam o SQL junto: "atrasada" é
`due_date < current_date and status <> 'done'`, sem deixar o modelo reinventar a cada
pergunta. O que se aprende em conversa continua nas lições (`agente_aprendizados`).

**A configuração** (tarefa 7): o Brain é uma linha a mais na `agente_config`, editada na aba
Agente do painel. O modelo sai de uma lista fechada de modelos bons com ferramentas, não de
texto livre.

**Descartado por ora**:

- **Jev (classificador da TypeSafe AI)**: não gera SQL nem texto e é fraco em datas e
  contagem, que é o centro das perguntas. Só serviria para triagem na entrada, e isso fica
  para depois de medir onde os tokens vão. Cache de prompt ataca o mesmo custo sem acrescentar
  um provedor à cadeia.
- **Memória entre conversas** (o Brain lembrar do que foi dito em outra conversa): é outro
  projeto. A tela do backlog só lista e reabre conversas.

## 4. O enriquecimento de texto como porta de entrada

A tarefa 4 é pequena por si só, mas é **ela que cria o `supabase/functions/_shared/ia.ts`**, ou
a 5, se começar antes. Hoje cada edge function faz o próprio `fetch` para o gateway (há 10
funções assim). O módulo compartilhado passa a ser o único lugar que conversa com um modelo, e o
Brain vai usá-lo. O que isso pede de quem implementa:

1. **`chamarChat` aceita ferramentas (`tools`) desde o primeiro dia.** A saída estruturada do
   próprio perfil "comentário para tarefa" já precisa disso, porque saída estruturada no
   gateway sai por tool call (ver `supabase/functions/agente-psa/ai.ts`, que força
   `tool_choice`). O Brain vai além: chama o modelo várias vezes, com o resultado da
   ferramenta voltando como mensagem. A interface precisa aceitar um histórico com mensagens
   de ferramenta, e não só `system` + `user`.
2. **Cache de prompt entra na interface, mesmo que o provedor atual não use.** Quem chama
   marca o trecho fixo do prompt (regras base, instruções do perfil, depois o documento
   semântico) como cacheável, e o adaptador decide o que fazer com isso. O provedor ainda não
   está decidido (seção 5), e o Brain manda o mesmo documento grande a cada rodada: sem cache,
   é aí que o custo cresce.
3. **O provedor fica atrás do módulo.** Hoje é o gateway do Lovable (`LOVABLE_API_KEY`), que
   não existe no sandbox (`docs/tarefas-a-executar/2026_09_23_chave-de-ia-no-sandbox.md`).
   Trocar para uma chave própria não pode obrigar a mexer em quem chama.
4. **As regras base do prompt são um export próprio**, separado do `Perfil`. O Brain as usa sem
   usar perfil nenhum.
5. **O `Perfil` fica só no enriquecimento.** Não crie um objeto pai que o Brain estenderia. Os
   dois têm em comum três campos (`instrucoes`, `modelo`, `temperatura`) e mudam por motivos
   diferentes. Os perfis moram no código; a configuração do Brain mora no banco.
6. **Contexto do banco, quando um perfil precisar, passa pela porta da tarefa 6.** A tarefa 4
   já diz que "quem busca é o servidor, com a permissão do usuário". Quando esse dia chegar, o
   perfil usa a mesma leitura no escopo do usuário que o Brain usa, sem virar agente.

O que **não** fazer de carona na tarefa 4: migrar o `agente-psa` para o `_shared/ia.ts` (vale
fazer depois, numa frente própria), criar qualquer coisa do laço do Brain, ou mexer em grant e
role do banco.

## 5. O que ainda está em aberto

- **Onde o diretor entra na hierarquia.** Não existe papel "diretor"; hoje só o `admin` vê
  tudo. É o primeiro passo da tarefa 6.
- **Provedor e chave de IA**: o gateway do Lovable ou uma chave própria. É a mesma decisão da
  tarefa da chave no sandbox.
- **LGPD**: comentários com dados de cliente passam a ir para um modelo externo. Precisa do ok
  de alguém com autoridade para dar.
- **Conjunto de teste**: as perguntas do Prado precisam virar pares pergunta/resposta certa,
  conferidos por SQL e com o papel de quem pergunta. A tarefa 8 depende disso para ser
  validada, e isso ainda não virou tarefa.

## 6. Fatos conferidos em produção (24/09/2026, só SELECT)

- As 164 funções do schema `public` pertencem ao `postgres`. 126 são `SECURITY DEFINER` e 123
  são executáveis pelo `PUBLIC`. Os default privileges do `postgres` não retiram o `PUBLIC`.
- O `postgres` tem `CREATEROLE` e `BYPASSRLS`, e não é superusuário.
- A `SUPABASE_DB_URL` existe nas edge functions do Lovable Cloud e aponta para a conexão
  direta (5432), segundo o chat do Lovable. Nenhuma função do repositório conecta direto ao
  Postgres hoje. O pooler (6543, modo transação) aceita `SET LOCAL` e `set_config(..., true)`
  dentro da transação.
- A policy de SELECT de `org_comments` é por projeto (`baseline.sql`, `org_comments_select`),
  embora o `mapa-do-banco.md` a classifique como "interno".

Achado de passagem: no `agente-psa`, `registrarNotificacao` é importada e nunca chamada, em
nenhuma branch. Por isso o pop-up de notificação do agente do Board nunca recebe nada.
