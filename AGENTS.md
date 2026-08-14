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
- **NUNCA** edite arquivos autogerados: `components.json`, `supabase/config.toml`, `src/integrations/supabase/*`.
- **NUNCA** use `CHECK` constraints com `now()`. Use triggers de validação.
- **NUNCA** crie rotas protegidas sem registrá-las em `src/config/protectedPages.ts`.
- **NUNCA** remova tipagens TypeScript ou use `any` sem justificativa via comentário.
- **NUNCA** use `npm install`, `npm ci`, `yarn` ou `pnpm` neste repo. Use SEMPRE `bun` (padrão do Lovable) — rodar outro gerenciador faz os lockfiles divergirem e quebra a build do Lovable.
- **NUNCA** delete, mova ou modifique o `package-lock.json` que já está versionado. Ele deve permanecer intacto no repositório. Se por acidente for alterado, execute `git checkout package-lock.json` para restaurar antes de commitar.

## ✅ DIRETRIZES DE ARQUITETURA
- **Auditoria Obrigatória (CUD):** SEMPRE use o hook `useAuditLog` para operações de Create/Update/Delete. Você deve enviar o diff campo-a-campo em `changed_fields`.
- **Autenticação e RLS:** Mantenha o RLS sempre habilitado. Utilize as funções SECURITY DEFINER `has_role(uuid, app_role)` e `is_project_member()` para checar permissões.
- **Separação de Ambientes:** O sistema detecta dev/prod via URL (`src/config/api.ts`). `cliente` e `contribuinte` possuem a coluna `ambiente`, e suas queries DEVEM incluir o filtro `.eq('ambiente', currentAmbiente)`. `representante`, `ordem_servico`, `org_projects`, `org_tasks`, `tickets`, `pessoa` e `bem` NÃO têm a coluna: o ambiente delas é o do cliente a que se ligam, e o recorte é feito na mão (ver `src/lib/ambienteScope.ts`). Todo cadastro de dev carrega o prefixo `[TESTE] ` no nome, para que um vazamento se identifique sozinho em produção. Regras e conjunto padrão em `docs/geral/clientes-de-teste-dev.md`.
- **Soft Delete:** Várias tabelas usam a coluna `excluido` (boolean). Suas consultas de leitura devem sempre conter `.eq('excluido', false)`.
- **Imports:** Use SEMPRE aliases (ex: `@/components`, `@/hooks`, `@/lib`).

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
Fonte: `docs/planos/plano-refatoracao-god-components-fase-3.md` e ledgers em `docs/geral/refatoracao-*`. Siga estes padrões ao criar telas novas ou mexer em arquivos grandes.

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
