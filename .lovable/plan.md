
# Varredura 360 — Correções Aplicadas

## ✅ Corrigido

### 1. protectedPages.ts — Alinhamento com rotas reais
- Removidos paths fantasma: `/equipe/projetos/fiscal/dashboard`, `/equipe/projetos/fixos/dashboard`, `/equipe/projetos/dashboard`, `/equipe/projetos/demandas`
- Corrigido `/gestao/novidades` → `/gestao`
- Adicionadas 5 páginas dev faltantes: `consulta-ecd`, `consulta-ecf`, `gestao-clientes`, `calculadora-ibs-cbs`, `controle-balancetes`
- Corrigido typo `TEX` → `TAX`

### 2. AuthContext.tsx — Project ID dinâmico
- Substituído hardcoded `sb-zwoainzzqhudmmknuycq-auth-token` por template literal usando `import.meta.env.VITE_SUPABASE_PROJECT_ID`

### 3. App.tsx — Import morto removido
- Removido import não utilizado de `FiscalDemandasClientes`

### 4. Auth — auto_confirm desativado
- Confirmado que `auto_confirm_email = false` nas configurações de autenticação

## ℹ️ Falsos positivos do relatório
- `dotted-map` — usado em `BrazilMap.tsx`
- `next-themes` — usado em `sonner.tsx`
- Imports de `FiscalSidebar.tsx` — todos usados (Calculator, ChevronLeft, ArrowLeft)
- RLS permissiva — única policy `USING true` é INSERT em `contatos` (formulário público, intencional)

## 🔲 Pendente (decisão do usuário)
- Páginas órfãs (EquipeUsuarios, AdminUsuarios, etc.) — remover ou criar rotas?
- Edge functions com `verify_jwt = false` — validação JWT já é feita em código (ex: create-team-member), mas config.toml poderia refletir isso
- Leaked Password Protection — requer ativação manual no painel do backend
