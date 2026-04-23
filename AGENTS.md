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
- **Separação de Ambientes:** O sistema detecta dev/prod via URL (`src/config/api.ts`). Tabelas como `cliente`, `contribuinte`, `representante` e `ordem_servico` possuem a coluna `ambiente`. Suas queries DEVEM incluir o filtro `.eq('ambiente', currentAmbiente)`.
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

## 📂 REVELAÇÃO PROGRESSIVA (Leia estes arquivos se precisar de contexto específico)
- **Permissões e Rotas:** Leia `@src/contexts/AuthContext.tsx` e `@src/config/protectedPages.ts`.
- **Trilha de Auditoria Exata:** Leia `@src/hooks/useAuditLog.ts` e `@src/lib/diffUtils.ts`.
- **Criação de Chamados (Roteamento):** Investigue `@src/components/.../CreateTicketDialog.tsx` e analise a relação `cliente_clusters`.
- **Edge Functions:** Localizadas em `supabase/functions/`. Lembre-se que elas operam com `verify_jwt = false`, então a validação do token Supabase deve ser feita manualmente no código do Deno.
