# Spec de execução — ALE-7 · Front: ligar a geração na criação do projeto e o botão de redisparo

Sprint 11 · 5h estimadas (encolheu, ver §5) · épico "Tarefas que nascem sozinhas: chamado
delegado e abertura de demanda" · dependências EDU-12, ALE-4 e ALE-6 fechadas.

## 0. Leia antes de escrever a primeira linha

`AGENTS.md` na raiz é a fonte única de convenções e regras inegociáveis. Esta spec não o
substitui.

## 1. Objetivo

Fazer a abertura de uma demanda disparar a geração das tarefas do projeto, e dar um botão
para redisparar em projeto que já existia. No vocabulário deste sistema, **demanda é o
projeto** — um projeto por produto contratado da ordem de serviço — e esse fluxo já existe
de ponta a ponta, no cadastro avulso e na criação em lote. **O que falta é a ligação.**

## 2. O contexto que mudou, e que o card original não tem

Leia isto antes de tudo, porque muda o que "pronto" significa.

- A ALE-6 entregou o catálogo de tarefas-pai em **`servicos_prestados` + `produto_servico`**
  (106 serviços, 111 vínculos em produção), pela tela de Cadastro de Categorias.
- A tabela **`produto_tarefa_padrao` foi abandonada** por decisão do tech lead. Ela tem
  **0 linhas** nos dois bancos, e `org_tasks.tarefa_padrao_id` está nulo em 521 de 521.
- A função `gerar_tarefas_projeto(_project_id uuid) → integer` **ainda lê
  `produto_tarefa_padrao`**, então hoje ela devolve `0` sempre. Trocar a fonte dela é
  migration do Eduardo, **não é sua**.
- **A assinatura da RPC não muda.** É por isso que todo o front desta tarefa pode ser
  escrito agora: você programa contra o contrato que já existe, e ele passa a produzir
  número maior que zero quando o Eduardo trocar o corpo da função.

Consequência para o `PRONTO QUANDO` do card: os critérios que exigem "produto que tem
catálogo" só fecham de verdade depois da migration do Eduardo. A §6 mostra como exercitar o
caminho inteiro **agora**, sem esperar por ele.

## 3. Banco: leitura só, e só se precisar

Esta é uma tarefa de front. **Não há mudança de schema e não há escrita em banco.** A
migration que falta é do Eduardo e está na §8 para você **não** fazer.

Se precisar de contexto (o nome do parâmetro da RPC, uma coluna, uma contagem), leia
**produção** pelo MCP do **Lovable**, `query_database`, project
`4cb1f76a-b443-437e-a047-67a69019a54a`, **só `SELECT`**. Nunca `INSERT`/`UPDATE`/`DELETE`/
DDL, por nenhum caminho e em nenhum banco. Nunca edite
`src/integrations/supabase/types.ts` à mão.

Se concluir que precisa de escrita ou de DDL para fechar a tarefa, **pare e pergunte**.

**Não fixe código de produto no código.** Produção usa prefixo (`01-CHA`, `02-ES`), o banco
de desenvolvimento ainda usa o antigo (`CHA`, `ES`). Nada nesta tarefa deveria depender de
código de produto — se depender, é sinal de que a lógica está no lugar errado.

## 4. O que fazer, arquivo por arquivo

Âncoras por **símbolo** — os números de linha do card envelheceram.

### 4.1 `src/hooks/useGerarTarefasProjeto.ts` — novo

Mutação que chama a RPC e lê o inteiro devolvido.

**Molde exato:** a mutação de gerar a solicitação a partir da ordem de serviço em
`src/hooks/useDomainSolicitacao.ts` — é a única mutação do repositório que chama função de
banco devolvendo inteiro de forma idempotente. Copie a forma: chama, lança em erro, lê o
número com alternativa a zero, e registra auditoria com o diff campo a campo.

- **Auditoria obrigatória**: é mutação nova, na entidade de projeto. `useAuditLog` com
  `changed_fields`, conforme `AGENTS.md`.
- No sucesso, invalide o prefixo **`['org-tasks']`** (o mesmo de `src/hooks/useOrgTasks.ts`).
- Aviso de tela **só quando o número for maior que zero**, pela biblioteca de notificação.
  **Nunca `alert()`.**

### 4.2 `src/hooks/useOrgProjects.ts` — a chamada na criação, engolindo erro

A função que insere o projeto com os membros é **`insertProjectWithMembers`**. O ponto da
chamada é **depois do `logAction`** e **antes do `return project`**.

```ts
try {
  const { error } = await supabase.rpc('gerar_tarefas_projeto', {
    // <confirmar o nome do parâmetro nos tipos gerados> recebe project.id
  });
  if (error) throw error;
} catch (error) {
  // Não desfaz o projeto já criado e auditado: a RPC é idempotente e há redisparo manual.
  console.error('Erro ao gerar tarefas do projeto:', project.id, error);
}
```

Isso cobre **os dois caminhos de uma vez**: `useCreateOrgProject` (avulso) e
`useCreateOrgProjectsBatch` (lote), porque os dois chamam essa mesma função. Nos dois
`onSuccess`, acrescente a invalidação de `['org-tasks']` ao lado da de `['org-projects']`
que já existe.

**Por que engolir o erro é o certo aqui:** a alternativa faria a segurança de tarefa
derrubar a criação de projeto. O projeto já está criado e auditado, a RPC é idempotente e
existe redisparo manual. Deixe isso escrito no comentário da captura.

**Alternativa descartada, não a reintroduza:** chamar a RPC no `onSuccess` da mutação. Não
serve para o lote — ele tem **um** sucesso para N projetos e só devolve contagens; os
identificadores dos projetos criados não sobrevivem.

### 4.3 `src/components/equipe/tarefas/ProjetosTarefasList.tsx` — o botão de redisparo

O menu de ação **do projeto** já existe e é um menu suspenso, com os itens `Nova tarefa`,
`Editar projeto`, `Mover tarefas` e `Excluir projeto`. Insira o item novo **entre `Editar
projeto` e `Mover tarefas`**. O ícone entra no import de ícones do topo.

A propriedade nova entra na interface `ProjetosTarefasListProps`, ao lado de
`onEditProject`/`onDeleteProject`, e no destructuring do componente.

**Não é o outro menu.** A tabela de cadastro de projetos tem dois botões soltos na célula
de ações, sem menu suspenso. Se o botão tiver de aparecer lá também, é outra tarefa.

Diferente do caminho da criação, **o redisparo não engole erro**: ele mostra aviso de tela.
É o antídoto para o silêncio da §4.2.

### 4.4 `src/components/equipe/tarefas/PainelTarefas.tsx` — ligar a propriedade

No bloco onde `<ProjetosTarefasList>` é montado, junto de `onEditProject` e
`onDeleteProject`.

### 4.5 `src/components/equipe/tarefas/ProjetosTarefasList.test.tsx` — atualizar

O teste monta **todas** as propriedades do componente. A nova precisa entrar ali ou ele
quebra.

## 5. Fora de escopo — inclusive uma parte que o card pede

- **`src/lib/projetoTarefasPadrao.ts` e o teste dele saem de escopo.** Era a função pura
  que espelharia a precedência de papel (`responsible` / `leader` / `member`), e
  `produto_servico` **não tem coluna de papel**. Sem papel não há precedência para
  espelhar. Isso também derruba o critério de aceite nº 5 do card — registre na
  retrospectiva.
- A função de banco e a troca da fonte dela: é do Eduardo (§8).
- Cadastrar serviço em produção: já foi feito pelo Alexandre.
- O trigger do chamado e o aviso de cliente sem projeto: é a ALE-5, tarefa irmã, em
  arquivos que **não** encostam nos seus.

## 6. Verificação: o que fecha hoje e o que espera o Eduardo

A função devolve `0` hoje, porque a tabela que ela lê está vazia. Então separe as duas
coisas em vez de forçar uma validação que não existe.

**Fecha hoje, e é sua:**

- lint, typecheck e testes (§7);
- **teste do caminho de erro**, que é o critério mais valioso do card: com a RPC falhando,
  o projeto **ainda é criado** e o erro fica só no console. Dá para simular sem banco,
  simulando a chamada;
- teste do componente com a propriedade nova montada;
- ler a resposta da RPC como número com alternativa a zero, e **não** mostrar aviso de tela
  quando vier zero — comportamento que já é observável hoje, porque hoje sempre vem zero.

**Espera a migration do Eduardo, e é do Alexandre validar na tela:** criar projeto avulso e
em lote fazendo as tarefas aparecerem sem recarregar, e o redisparo criando o que falta e
não criando nada na segunda vez.

Escreva isso no anexo com essas palavras: o que já está verificado e o que está pendente de
uma migration de terceiro. Exceção declarada é entrega; exceção escondida é dívida.

## 7. Antes de entregar

- `bunx eslint <arquivos alterados>`
- `bun run typecheck` — a mudança na interface da lista de projetos afeta o painel e o teste
- `bun run test`
- Nenhum `supabase.from()` em componente; nenhum `alert`/`confirm`; imports com alias `@/`;
  `PainelTarefas.tsx` está em 557 linhas, perto do teto de 600 — não engorde

## 8. O que é do Eduardo, e que você NÃO deve fazer

Está aqui para você não tentar resolver, e para citar na retrospectiva:

1. `gerar_tarefas_projeto` passa a ler `produto_servico` e a gravar `org_tasks.servico_id`.
2. Responsável (não há papel → responsável do projeto, caindo para o líder) e prazo (não há
   deslocamento em dias → data de início do projeto, ou sem prazo).
3. **A idempotência não fecha com índice único**, e isso já está medido em produção:
   `org_tasks.servico_id` hoje é **classificação, não 1:1** — há projeto com 7 tarefas no
   mesmo serviço. Índice único `(project_id, servico_id)` **não sobe** (3 pares
   duplicados); restrito a tarefas-pai, ainda sobra 1 par. Precisa de outra chave ou de
   decisão sobre esse par.
4. Descartar `produto_tarefa_padrao`: limpo, sem backfill — 0 linhas e
   `org_tasks.tarefa_padrao_id` nulo em 521 de 521.

## 9. Entregáveis

1. **O código**, em branch própria. **Não commite na `main` e não dê push nela.**
2. **Anexo** — `docs/Spec/ALE-7/anexo-ALE-7.md`. Documento executivo, para humano, **uma
   página, lido em um minuto**: o que passou a acontecer ao abrir uma demanda, onde está o
   botão de redisparo, e o que ainda depende da migration do Eduardo. Regra e o que **não**
   entra: tabela × retrospectiva na skill `criar-retrospectiva`.
3. **Retrospectiva** — **carregue a skill `criar-retrospectiva` antes de escrever** e siga
   as sete seções dela. Salve **fora do repositório**, em
   `C:\Users\Alexandre Silva\Desktop\Claude\projects\PSA Lovable\retrospectivas\ALE-7-retrospectiva.md`.

## 10. Pare e pergunte se

- concluir que precisa de escrita em banco, de mudança de schema, de policy ou de DDL —
  em **qualquer** banco;
- a leitura de que a RPC mantém a assinatura `(_project_id uuid) → integer` se mostrar
  errada;
- o `PRONTO QUANDO` só fechar mexendo em arquivo fora da lista da §4;
- for tentado a "consertar" a função de banco para o botão devolver número maior que zero.
