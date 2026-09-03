# PSA Consultores - Sistema Interno e Portal B2B

Sistema de gestão interna e portal de clientes da PSA Consultores, com foco em consultoria tributária, CRM, cálculos fiscais e controle organizacional.

## 🛠 Stack Tecnológica e Comandos
- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, shadcn-ui, React Query, react-router-dom v6.
- **Backend:** Lovable Cloud (Supabase) - Postgres, Auth, Storage, Edge Functions (Deno).
- **Gerenciador de pacotes:** **Bun** (padrão do Lovable). Instalar deps: `bun install`. Rodar dev: `bun run dev`.
- **Lockfile de referência:** `bun.lock` / `bun.lockb`. O Lovable usa Bun na build — qualquer divergência aqui causa "funciona local, quebra no Lovable".

## 🚫 REGRAS INEGOCIÁVEIS (NUNCA FAÇA ISSO)
- **NUNCA** faça chamadas diretas ao Supabase (`supabase.from()`) em componentes React. Toda query/mutation DEVE estar isolada em um custom hook (`src/hooks/`).
- **NUNCA** use `alert()`, `confirm()` ou `prompt()`. O feedback visual DEVE ser feito via `useToast` (`src/hooks/use-toast.ts`) ou `sonner`.
- **NUNCA** armazene papéis (roles) em `localStorage`, `sessionStorage` ou na tabela `profiles`. Eles vivem exclusivamente em `public.user_roles`.
- **NUNCA** crie FK referenciando `auth.users` diretamente. Use `profiles.id` como proxy.
- **NUNCA** edite arquivos autogerados: `components.json`, `supabase/config.toml`, `src/integrations/supabase/*`. Regenerar `types.ts` pelo gerador oficial (`supabase gen types`) **não** conta como editar; editar à mão, costurar conflito ou acrescentar campo na mão conta (ver "Dois bancos").
- **NUNCA** aplique DDL em produção, por nenhum caminho (MCP `query_database`, SQL editor, `db push`). Aplicar migration em produção é ação **humana**, pelo chat do Lovable. Agente aplica só no sandbox.
- **NUNCA** ponha `src/integrations/supabase/types.ts` no `.gitignore`. A CI faz checkout puro e roda `tsc --build --noEmit` e `bun run build`; sem o arquivo, os dois falham, e ninguém além do Lovable consegue gerar a versão de produção.
- **NUNCA** use `CHECK` constraints com `now()`. Use triggers de validação.
- **NUNCA** crie rotas protegidas sem registrá-las em `src/config/protectedPages.ts`.
- **NUNCA** remova tipagens TypeScript ou use `any` sem justificativa via comentário.
- **NUNCA** use `npm install`, `npm ci`, `yarn` ou `pnpm` neste repo. Use SEMPRE `bun` (padrão do Lovable) — rodar outro gerenciador faz os lockfiles divergirem e quebra a build do Lovable.
- **NUNCA** delete, mova ou modifique o `package-lock.json` que já está versionado. Ele deve permanecer intacto no repositório. Se por acidente for alterado, execute `git checkout package-lock.json` para restaurar antes de commitar.

## ✅ DIRETRIZES DE ARQUITETURA
- **Auditoria Obrigatória (CUD):** SEMPRE use o hook `useAuditLog` para operações de Create/Update/Delete. Você deve enviar o diff campo-a-campo em `changed_fields`.
- **Autenticação e RLS:** Mantenha o RLS sempre habilitado. Utilize as funções SECURITY DEFINER `has_role(uuid, app_role)` e `is_project_member()` para checar permissões.
- **Separação de Ambientes:** O sistema detecta dev/prod via URL (`src/config/api.ts`). `cliente` e `contribuinte` possuem a coluna `ambiente`, e suas queries DEVEM incluir o filtro `.eq('ambiente', currentAmbiente)`. `representante`, `ordem_servico`, `org_projects`, `org_tasks`, `tickets`, `pessoa` e `bem` NÃO têm a coluna: o ambiente delas é o do cliente a que se ligam, e o recorte é feito na mão (ver `src/lib/ambienteScope.ts`). **Filtrar `ambiente` numa dessas tabelas quebra a query.** Todo cadastro de dev carrega o prefixo `[TESTE] ` no nome, para que um vazamento se identifique sozinho em produção — a regra é aplicada pela migration `supabase/migrations/20260814190000_dev_clientes_prefixo_teste.sql`, que é a fonte do conjunto padrão. O resto do ambiente de dev está em `docs/ambiente-de-desenvolvimento.md`.
- **Soft Delete:** Várias tabelas usam a coluna `excluido` (boolean). Suas consultas de leitura devem sempre conter `.eq('excluido', false)`.
- **Imports:** Use SEMPRE aliases (ex: `@/components`, `@/hooks`, `@/lib`).

## 🗄 DOIS BANCOS: SANDBOX E PRODUÇÃO

**Não confunda com a coluna `ambiente`.** `ambiente` separa cadastro de teste de cadastro real **dentro** de um banco (ver Diretrizes de Arquitetura). Esta seção é sobre **dois bancos diferentes**. As duas coisas coexistem: o sandbox tem cadastros dos dois `ambiente`s.

- **Qual banco o app usa** é decidido no `vite.config.ts`, em tempo de execução, e **produção é o default**: o sandbox (`.env.sandbox`, ref `vgzomuwnsdgrxbkyoavq`) só entra em branch de trabalho, ou seja, git respondendo e branch fora de `main`. Sem git (sandbox do Lovable, tarball, CI) é produção, e é por isso que o arquivo se chama `.env.sandbox`: `sandbox` não é mode do Vite, então nada o carrega sozinho. Um `.env.development.local` vence de todos. O `bun run dev` imprime o alvo ao subir, e reinicia sozinho quando você troca de branch com ele de pé (sem isso o app ficaria no banco da branch anterior, calado). Os arquivos são idênticos nas duas branches de propósito: valor diferente por branch conflitaria em todo merge.
- **Produção é Lovable Cloud e não tem credencial Supabase da PSA.** Logo não existe `supabase link`, `db push` nem `gen types` contra ela, e um `db push` apontado para lá tentaria aplicar o schema inteiro (o baseline não está registrado). Leitura de produção: MCP do Lovable, `query_database`, **só SELECT**.
- **`supabase_migrations.schema_migrations` de produção não é registro confiável.** Migration aplicada à mão não é registrada lá. Para saber se algo já está no ar, consulte o schema, não essa tabela.

**Mudança de schema, na ordem (agente executa 1 e 2, para em 3):**

1. Migration em `supabase/migrations/`, timestamp real (`date -u +%Y%m%d%H%M%S`) e **idempotente** (ver "Toda migration é idempotente", abaixo: é cobrado pela CI).
2. `bun run db:sync --apply` (sandbox; **não** use `supabase db push`, ver "O sandbox é compartilhado") e `supabase gen types typescript --project-id vgzomuwnsdgrxbkyoavq > src/integrations/supabase/types.ts`, commitado **sozinho**. Sem CLI logada, pare e peça ao humano. O código da feature vem depois, normal, sem cast de contorno.
3. **Humano** pede ao Lovable para aplicar o SQL em produção; o bot regenera o `types.ts` de lá e commita na `main`.
4. `main → develop` sobrescreve o `types.ts` pelo da `main`. Só então o PR `develop → main`.

**Regra dura:** produção recebe a coluna **antes** de o código que a usa chegar na `main`, porque o app publicado é buildado da `main` e fala com produção. Coluna aditiva parada em produção é inofensiva; o inverso quebra na cara do cliente.

**Sobre o `types.ts`:** ele descreve o banco **daquela** branch (`main` = produção, pelo bot; branch de trabalho = sandbox, pelo CLI). Conflito nele se resolve **regenerando** a partir do banco da branch, nunca costurando os dois lados: o conteúdo é função do schema, e costurar produz arquivo que não corresponde a banco nenhum.

**Toda migration é idempotente.** Rodar duas vezes tem de dar no mesmo. Não é
preferência de estilo: o mesmo DDL existe em **dois** arquivos, porque quando a
migration é aplicada por fora do repositório (chat do Lovable em produção, ou SQL
direto no sandbox) o arquivo é depois reconstruído a partir do ledger, com o nome que
o ledger registrou (às vezes um UUID). Para o outro banco essa segunda versão é uma
migration inédita, e o DDL roda de novo. Idempotente, isso é um no-op inofensivo; não
idempotente, é erro no meio de um push, e o push seguinte de outra pessoa vem junto.

Na prática: `create table if not exists`, `add column if not exists`, `create index if
not exists`, `create or replace function/view`, `add value if not exists`, `drop ... if
exists`. Para o que não tem cláusula de guarda (policy, trigger, constraint), o par
`drop ... if exists` + `create`. Para enum e constraint, alternativamente um `do $$ ...
end $$` consultando `pg_type` / `pg_constraint`. `insert` de dado leva `on conflict`.

Cobrado pela CI (job `Migrations idempotentes`), que roda
`scripts/checa-idempotencia-migrations.ts` **só nas migrations do diff do PR**, nunca no
histórico. Escotilha: `-- idempotencia-ok: <motivo>` na linha, com motivo escrito. Sem
motivo não libera. Dispensa de arquivo inteiro em
`supabase/migrations/.idempotencia-excecoes`, que hoje tem só o baseline (é um `pg_dump`,
roda uma vez em banco vazio).

### O sandbox é compartilhado, e isso muda duas coisas

Quatro pessoas empurram para o mesmo sandbox, de branches diferentes.

**Aplique com `bun run db:sync`, não com `supabase db push`.** O `db push` mantém uma
lista ordenada e **se recusa** a aplicar versão mais antiga que a última registrada
("found local migration older than remote"), então quem tem o timestamp menor fica
travado por trabalho de outra pessoa que ele nem sabe que existe. O `db:sync` pergunta
outra coisa: "quais dos MEUS arquivos ainda não rodaram". Ordem deixa de importar.
Ele tem ledger próprio (`public.psa_migrations_aplicadas`, com autor, branch e o
`sha256` do conteúdo), e reaplica arquivo editado depois de aplicado, o que só é seguro
porque toda migration é idempotente. Sem flag ele apenas **planeja**; escreve com
`--apply`. Primeira vez num banco novo: `--bootstrap`.

**O `types.ts` regenerado contra o sandbox traz trabalho não mesclado.** O sandbox
contém, a qualquer momento, schema de branch que ninguém pushou (em 02/09/2026 eram
23 migrations aplicadas por fora do repositório). Regenerar o arquivo inteiro nesse
estado leva para a sua branch coluna que nenhuma migration do repo cria e que não
existe em produção: o typecheck passa, o build passa, e o app publicado quebra. O
`bun run db:sync` lista essas migrations no fim do plano, e a CI reprova o PR pela
trava `types.ts não importou schema de fora`. Enquanto houver divergência, aplique no
`types.ts` só o delta da sua mudança.

O `docs/rls/mapa-do-banco.md` é o oposto: sai do `types.ts` por função pura
(`node scripts/gen-mapa-banco.mjs`), a CI prova a correspondência sem tocar em banco, e
pode ser regenerado sempre.

**Migration exclusiva do sandbox nunca altera schema**, só dados (ex.: `20260814190000_dev_clientes_prefixo_teste.sql`). Schema que só existe no sandbox faz o código compilar em `develop` e quebrar em produção.

Detalhes e passo a passo em `docs/ambiente-de-desenvolvimento.md`.

## 💻 PADRÃO DE CÓDIGO (Show, don't tell)

**Data Fetching:** Os componentes não devem saber da existência do Supabase.
```tsx
// ❌ ERRADO: Supabase ou fetch no componente
const { data } = await supabase.from('fiscal_tasks').select('*');

// ✅ CORRETO: Consumo via Custom Hook (PascalCase no componente, useDomainAction no hook)
const { data: tasks, isLoading } = useFiscalTasks(filtros);
```

**Logs de Auditoria:**
```typescript
// ✅ CORRETO: Toda mutação deve gerar um log de diff
logAction({
  area: 'tax',
  entity_type: 'cliente',
  entity_id: clienteId,
  action: 'updated',
  changed_fields: computeFieldDiff(oldData, newData, fieldsToCompare) // Importado de @/lib/diffUtils
});
```

## 🧱 DECOMPOSIÇÃO E CAMADA DE DADOS (padrões consolidados na refatoração de god-components)
Fonte: os ledgers em `docs/geral/refatoracao-*`. Siga estes padrões ao criar telas novas ou mexer em arquivos grandes.

- **Teto de 600 linhas:** nenhum `.tsx` de produção deve ultrapassar 600 linhas; a meta ideal de uma fachada/página é **< 400**. Se um arquivo cruzar esse limite, decomponha antes de adicionar mais lógica.
- **Anatomia da decomposição (nesta ordem):** 1) extrair funções puras para `src/lib/<feature>*.ts` **com testes**; 2) extrair blocos visuais em subcomponentes com responsabilidade real — **NUNCA** crie wrappers passa-tudo só para reduzir linhas; 3) manter o arquivo original como fachada/orquestrador enxuta; 4) criar hook controlador local `use<Feature>Controller.ts` **apenas** se estado + handlers ainda estourarem o teto.
- **Evite prop drilling:** acima de ~8 props, prefira React Context (`<Feature>Context.ts`) ou o controller hook. Evite passar um objeto controller onisciente a todos os filhos quando um contrato de props menor por componente for viável.
- **Nomenclatura de hooks:** hooks de dados de domínio = `useDomain<Feature>.ts` (React Query); hooks controladores de UI = `use<Feature>Controller.ts`. Um componente React NUNCA conhece o Supabase (ver Regra Inegociável nº1).
- **Refatoração preserva comportamento:** ao mover queries/mutations para hooks, mantenha **idênticos** query keys, filtros de tenancy/soft-delete (`ambiente`/`excluido`/`ativo`), payloads, ordem das operações sequenciais, `enabled`/`retry`/`staleTime` e invalidações. NÃO converta operações sequenciais em paralelas (ou vice-versa).
- **Não corrija bugs durante a divisão:** refatoração estrutural preserva até peculiaridades e bugs preexistentes. Registre achados como tarefa separada (ex.: gaps de auditoria em `docs/geral/auditoria-gaps-cud.md`) em vez de corrigir junto.
- **Auditoria em refatoração vs. código novo:** ao *mover* uma mutation que hoje não audita, **preserve** o comportamento (não adicione `useAuditLog`) e registre o gap. Isso **não** dispensa a regra: toda **mutation nova** continua obrigada a usar `useAuditLog` (ver Diretrizes de Arquitetura).
- **Teste de caracterização primeiro:** antes de refatorar um arquivo grande, escreva testes golden-master que travem o comportamento observável (payloads exatos, ordem das chamadas, query keys, textos, estados vazio/erro/loading). Caracterize bugs atuais deliberadamente, com comentário, para não "corrigi-los de graça".
- **Não deixe detritos:** remova hooks/funções que ficaram sem consumidor após a divisão; não deixe dead code "por garantia".

## 📂 ORGANIZAÇÃO DE DOCUMENTAÇÃO (.md que não é código)
- **NUNCA** crie arquivos `.md` de plano/análise soltos na raiz do repositório. Toda documentação (planos, análises, roadmaps, design) vive em `docs/`, organizada por módulo:
  - `docs/planos/` — planos de implementação (handoff)
  - `docs/mapa/`, `docs/osg/`, `docs/rls/` — docs por módulo
  - `docs/geral/` — transversais · `docs/sprints/` — sprints · `docs/AI_CONTEXT.md` — contexto-mestre
- **Tarefa delegável para uma sprint:** salve em `docs/sprints/sprint-<N>/TAREFA_<slug>.md` e registre a linha no `README.md` da pasta da sprint (índice). Uma tarefa = um arquivo, com subtarefas numeradas (`T1`, `T2`, …), bugs achados (`B1`, …) e marcação explícita de **⚠️ MIGRAÇÃO** / **⚠️ MUDANÇA DE RPC** quando depender do Lovable. O plano de design/arquitetura longo continua em `docs/planos/` — a tarefa **linka**, não duplica.
- Ao criar um novo plano/análise, salve direto na subpasta do módulo correspondente (crie `docs/<modulo>/` se ainda não existir). Não deixe soltos na raiz.

## 📂 REVELAÇÃO PROGRESSIVA (Leia estes arquivos se precisar de contexto específico)
- **Schema do banco:** consulte `docs/rls/mapa-do-banco.md` (tabelas/colunas/FKs/flags/RLS) — nunca leia `src/integrations/supabase/types.ts` inteiro (autogerado, ~8.9k linhas).
- **Permissões e Rotas:** Leia `@src/contexts/AuthContext.tsx` e `@src/config/protectedPages.ts`.
- **Trilha de Auditoria Exata:** Leia `@src/hooks/useAuditLog.ts` e `@src/lib/diffUtils.ts`.
- **Criação de Chamados (Roteamento):** Investigue `@src/components/.../CreateTicketDialog.tsx` e analise a relação `cliente_clusters`.
- **Edge Functions:** Localizadas em `supabase/functions/`. Lembre-se que elas operam com `verify_jwt = false`, então a validação do token Supabase deve ser feita manualmente no código do Deno.
