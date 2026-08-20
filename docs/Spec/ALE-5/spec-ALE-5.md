# Spec de execução — ALE-5 · Front: avisar quando o cliente não tem projeto de chamados

Sprint 11 · 3h estimadas · épico "Tarefas que nascem sozinhas: chamado delegado e abertura
de demanda" · dependência EDU-11 fechada em 14/08/2026.

## 0. Leia antes de escrever a primeira linha

`AGENTS.md` na raiz é a fonte única de convenções e regras inegociáveis. Esta spec não o
substitui: ela diz o que fazer nesta tarefa e onde ela encosta em regra do repositório.

## 1. Objetivo

O trigger `delegar_chamado_gera_tarefa` (EDU-11) cria a tarefa quando um chamado é
delegado. Quando o cliente **não tem projeto de canal de chamados**, o trigger não
bloqueia a delegação: grava `RAISE WARNING` no log do servidor e segue. A delegação "dá
certo" e ninguém descobre que a tarefa não nasceu.

Esta tarefa faz essa lacuna aparecer na tela, e faz a tarefa recém-criada aparecer no
painel sem recarregar a página.

## 2. Banco: leitura só, e só se precisar

Esta é uma tarefa de front. **Não há mudança de schema e não há escrita em banco.**

Se precisar de contexto (uma coluna, um valor, uma contagem), leia **produção** pelo MCP do
**Lovable**, `query_database`, project `4cb1f76a-b443-437e-a047-67a69019a54a`, **só
`SELECT`**. Nunca `INSERT`/`UPDATE`/`DELETE`/DDL, por nenhum caminho e em nenhum banco.

Se concluir que precisa de escrita ou de DDL para fechar a tarefa, **pare e pergunte**.

## 3. Duas coisas do dado que mudam o código

- **Não fixe código de produto no código.** Produção usa prefixo (`01-CHA`), o banco de
  desenvolvimento ainda usa o código antigo (`CHA`), e amanhã pode mudar de novo. O hook
  desta tarefa resolve o produto **pela marca `is_canal_chamados`**, que é justamente o
  motivo de a coluna existir — não por código nem por nome.
- **Nenhum produto está marcado como canal de chamados hoje.** Enquanto a marca não for
  posta, o hook devolve nulo para todo cliente e o aviso aparece em toda delegação. Isso é
  esperado, não é defeito seu: quem marca é o Alexandre, na tela de Cadastro de Categorias.
  Ver §6.

## 4. O que fazer, arquivo por arquivo

As âncoras abaixo são **símbolos**, não números de linha — os cards do épico têm números
que envelheceram.

### 4.1 `src/hooks/useProjetoCanalChamados.ts` — novo

Hook de consulta por cliente, habilitado só quando há cliente. Busca em `org_projects` com
o produto embutido, filtrando pelo cliente externo e pela marca de canal.

```ts
const { data, error } = await supabase
  .from('org_projects')
  .select('id, produto_segmento:produto_segmento!inner(is_canal_chamados)')
  .eq('external_client_id', clienteId!)
  .eq('produto_segmento.is_canal_chamados', true)
  .maybeSingle();

if (error) throw error;
return data?.id ?? null;
```

Duas exigências técnicas, e as duas têm motivo:

- **`maybeSingle()`, não `single()`** — a ausência de projeto é o caso normal que a tela
  quer detectar, e `single()` estouraria nele.
- **embutido `!inner`** — sem ele o filtro pela marca recai sobre o embutido e não recorta
  a linha-pai, e o hook devolveria projeto que não é de canal.

Molde de estilo: `src/hooks/useOsProdutosContratados.ts` (hook enxuto, embutido nomeado,
guarda no argumento vazio).

### 4.2 `src/hooks/useTickets.ts` — expor o `cliente_id` na lista

Hoje o identificador do cliente **não chega na lista de chamados**: a interface
`TicketListItem` tem só `cliente_nome`, e o mapeamento de saída usa `cliente_id` para
resolver o nome e depois **descarta** o id. O detalhe (`TicketDetail`) já tem.

Acrescente o campo na interface `TicketListItem`, ao lado de `cliente_nome`, e no objeto
retornado pelo mapeamento, ao lado de onde `cliente_nome` é montado.

### 4.3 `src/components/gestao/ClienteSemProjetoChamadosAlert.tsx` — novo

Recebe o cliente e o nome, chama o hook e renderiza o alerta nomeando o cliente.

**Arquivo próprio, não embutido na página.** `src/pages/gestao/GestaoChamados.tsx` está com
**764 linhas**, acima do teto de 600 do `AGENTS.md`. Extrair o alerta reduz dívida; **não
refatore a tela toda nesta tarefa.**

### 4.4 `src/pages/gestao/GestaoChamados.tsx` — o gancho

Em `handleAssignAgent`, guarde o último cliente delegado em estado, dentro do bloco de
tentativa, depois da espera pela mutação e ao lado do aviso de sucesso. Monte o
subcomponente no topo do corpo do layout, antes do bloco de cartões.

### 4.5 `src/hooks/useTicketMutations.ts` — a invalidação

Acrescente a invalidação da lista de tarefas **dentro de `useAssignTicket`**, no `onSuccess`
dele, ao lado das invalidações que já existem.

**Não** no auxiliar compartilhado de invalidação: as outras cinco mutações que o usam não
geram tarefa nenhuma, e invalidar ali é busca nova gratuita da lista mais pesada do
sistema.

O prefixo certo é **`['org-tasks']`**, o mesmo que `src/hooks/useOrgTasks.ts` usa.

## 5. Fora de escopo

- Criar a tarefa a partir do chamado: é o trigger (EDU-11). O front **nunca** insere tarefa
  a partir de chamado — a política de inserção bloquearia quem delega.
- Registrar no log do servidor o caso sem projeto: também é do trigger.
- Marcar `is_canal_chamados` em produção: é ação do Alexandre, na tela de Cadastro de
  Categorias.
- Refatorar `GestaoChamados.tsx`.
- Os outros dois caminhos de delegação (`GestaoDetalhesChamado` e `EquipeChamados`):
  a invalidação os cobre, porque está no hook; **o aviso não**. Isso é deliberado —
  registre na retrospectiva, não conserte aqui.

## 6. Verificação: o que é sua e o que é do Alexandre

**Sua:** lint, typecheck, testes (§7), e o comportamento do hook em teste — cliente nulo
não dispara consulta, resposta vazia devolve `null`, erro é propagado com `throw` em vez de
virar valor neutro.

**Do Alexandre, na tela:** a validação visual é dele, e depende de a marca
`is_canal_chamados` estar posta. Deixe no anexo, escrito para ele conferir de olho, o
cenário exato — o dado abaixo está medido e a proporção é a mesma nos dois bancos:

- entre os **11 clientes com chamado delegado**, **7 não têm** projeto de canal → o aviso
  deve aparecer, nomeando o cliente;
- os outros **4 têm** → nada deve aparecer;
- **nenhum cliente tem mais de um** projeto de canal, então o `maybeSingle()` é seguro hoje.
  Se algum dia tiver, ele acusa multiplicidade em vez de escolher em silêncio — é o
  comportamento desejado.

Diga no anexo, também, que a tarefa criada pelo trigger deve aparecer no painel **sem
recarregar a página** — é o que a invalidação da §4.5 entrega.

## 7. Antes de entregar

- `bunx eslint <arquivos alterados>`
- `bun run typecheck` — a mudança em `TicketListItem` propaga para três arquivos de
  chamados
- `bun run test` — um dos testes simula `useAssignTicket`
- Nenhum `supabase.from()` em componente; nenhum `alert`/`confirm`; imports com alias `@/`

## 8. Entregáveis

1. **O código**, em branch própria. **Não commite na `main` e não dê push nela.**
2. **Anexo** — `docs/Spec/ALE-5/anexo-ALE-5.md`. Documento executivo, para humano, **uma
   página, lido em um minuto**: o que passou a acontecer na tela, onde, e o que ainda
   depende da marca em produção. Regra e o que **não** entra: tabela × retrospectiva na
   skill `criar-retrospectiva`.
3. **Retrospectiva** — **carregue a skill `criar-retrospectiva` antes de escrever** e siga
   as sete seções dela. Salve **fora do repositório**, em
   `C:\Users\Alexandre Silva\Desktop\Claude\projects\PSA Lovable\retrospectivas\ALE-5-retrospectiva.md`.

## 9. Pare e pergunte se

- concluir que precisa de escrita em banco, de mudança de schema, de policy ou de DDL —
  em **qualquer** banco;
- o `PRONTO QUANDO` só fechar mexendo em arquivo fora da lista da §4;
- concluir que o trigger da EDU-11 não faz o que a §1 descreve — nesse caso o problema é de
  banco e não desta tarefa.
