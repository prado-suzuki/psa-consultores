

# Relatório de Varredura 360 — Projeto PSA Consultores

---

## 🔴 CRÍTICOS

### 1. Páginas/Componentes existem mas NÃO estão mapeados em rotas
**Categoria**: Código Morto  
**Arquivos**:
- `src/pages/equipe/EquipeUsuarios.tsx` — página completa de gestão de usuários, não importada em `App.tsx`
- `src/pages/administracao/AdminUsuarios.tsx` — página completa de cadastro de usuários, sem rota
- `src/pages/administracao/AdminPerformance.tsx` — dashboard de performance, sem rota
- `src/pages/administracao/AdminAcessos.tsx` — controle de acessos admin, sem rota
- `src/pages/equipe/fixos/FixosDashboard.tsx` — dashboard de Fixos, sem rota
- `src/pages/equipe/projetos/ProjetosAreaSelector.tsx` — seletor de área de projetos, sem rota
- `src/pages/equipe/projetos/ProjetosDashboard.tsx` — dashboard de projetos, sem rota
- `src/pages/equipe/projetos/ProjetosDemandas.tsx` — demandas de projetos, sem rota

**Impacto**: Código morto que aumenta bundle size e confusão na manutenção. Algumas dessas páginas podem ser funcionalidade intencionalmente planejada para o futuro.  
**Sugestão**: Remover ou registrar rotas para essas páginas.

---

### 2. RLS Policies excessivamente permissivas (USING true / WITH CHECK true)
**Categoria**: Segurança  
**Local**: Banco de dados (detectado pelo linter Supabase)  
**Descrição**: Existem policies que usam `USING (true)` ou `WITH CHECK (true)` para operações UPDATE, DELETE ou INSERT, permitindo que qualquer usuário autenticado modifique/exclua dados.  
**Impacto**: Risco de acesso não autorizado a dados — um usuário poderia modificar/excluir dados de outro.  
**Sugestão**: Revisar e restringir as policies para verificar `auth.uid()` contra o `user_id` do registro.

---

### 3. Proteção contra senhas vazadas desativada
**Categoria**: Segurança  
**Local**: Configuração de autenticação do backend  
**Descrição**: A feature "Leaked Password Protection" está desabilitada, permitindo que usuários usem senhas conhecidamente comprometidas.  
**Impacto**: Contas vulneráveis a ataques de credential stuffing.  
**Sugestão**: Ativar leaked password protection nas configurações de autenticação.

---

### 4. Supabase project ID exposto no código frontend
**Categoria**: Segurança  
**Arquivo**: `src/contexts/AuthContext.tsx` (linhas 235, 244)  
**Descrição**: `localStorage.removeItem('sb-zwoainzzqhudmmknuycq-auth-token')` — o project ID do Supabase está hardcoded no código frontend.  
**Impacto**: Embora o anon key seja público por design, hardcodar o project ID dificulta portabilidade e expõe detalhes de infraestrutura desnecessariamente.  
**Sugestão**: Usar `import.meta.env.VITE_SUPABASE_PROJECT_ID` para construir a chave do localStorage dinamicamente.

---

### 5. `FiscalDemandasClientes` importado mas sem rota correspondente no App.tsx
**Categoria**: Bug  
**Arquivo**: `src/App.tsx` (linha 72)  
**Descrição**: `FiscalDemandasClientes` é importado mas não há `<Route>` que aponte para ele. Ele está importado porém nunca utilizado nas rotas.  
**Impacto**: Código morto no bundle; a página existe mas é inacessível.  
**Sugestão**: Adicionar rota ou remover import.

---

### 6. Rotas em `protectedPages.ts` apontam para paths inexistentes no App.tsx
**Categoria**: Bug  
**Arquivo**: `src/config/protectedPages.ts`  
**Descrição**: Paths registrados que NÃO existem como rotas reais:
- `/equipe/projetos/fiscal/dashboard`
- `/equipe/projetos/fixos/dashboard`
- `/equipe/projetos/dashboard`
- `/equipe/projetos/demandas`
- `/gestao/novidades` (rota real é `/gestao`)
  
**Impacto**: O sistema de controle de acessos não funciona para essas páginas; confusão na gestão de permissões.  
**Sugestão**: Alinhar paths do `protectedPages.ts` com os paths reais definidos no `App.tsx`.

---

## 🟡 IMPORTANTES

### 7. Páginas `/equipe/dev/consulta-ecd` e `/equipe/dev/consulta-ecf` sem registro em protectedPages.ts
**Categoria**: Segurança  
**Arquivo**: `src/config/protectedPages.ts`  
**Descrição**: As rotas existem no `App.tsx` com `PageAccessGate`, mas não estão registradas no array `PROTECTED_PAGES`. Sem registro, não aparecem no controle de permissões.  
**Impacto**: Impossível gerenciar acesso a essas páginas pelo painel de controle.  
**Sugestão**: Adicionar entradas para `/equipe/dev/consulta-ecd`, `/equipe/dev/consulta-ecf`, `/equipe/dev/gestao-clientes`, `/equipe/dev/calculadora-ibs-cbs`, `/equipe/dev/controle-balancetes`.

---

### 8. Console.logs em produção (959 ocorrências em 64 arquivos)
**Categoria**: Performance / Limpeza  
**Arquivos**: 64 arquivos com `console.log` ou `console.error`  
**Descrição**: Centenas de statements de debug espalhados pelo código, incluindo logs com dados sensíveis (tokens, IDs de sessão).  
**Impacto**: Poluição do console em produção; possível vazamento de dados sensíveis no console do navegador.  
**Sugestão**: Remover console.logs de debug; manter apenas os de tratamento de erro real.

---

### 9. Pacote `dotted-map` instalado mas não utilizado
**Categoria**: Dependência  
**Arquivo**: `package.json`  
**Descrição**: O pacote `dotted-map` está no `package.json` mas não é importado em nenhum arquivo do projeto.  
**Impacto**: Bundle size aumentado desnecessariamente.  
**Sugestão**: Remover do `package.json`.

---

### 10. Comentário `// OCULTO` em EquipeDemandas sem documentação
**Categoria**: Código Morto  
**Arquivo**: `src/App.tsx` (linha 34)  
**Descrição**: Import e rota de `EquipeDemandas` estão comentados com `// OCULTO`, mas o arquivo `src/pages/equipe/EquipeDemandas.tsx` continua existindo.  
**Impacto**: Confusão na manutenção; arquivo morto no repositório.  
**Sugestão**: Documentar a razão ou remover o arquivo.

---

### 11. Edge functions todas com `verify_jwt = false`
**Categoria**: Segurança  
**Arquivo**: `supabase/config.toml`  
**Descrição**: Todas as 10 edge functions estão configuradas com `verify_jwt = false`, ou seja, podem ser chamadas sem autenticação.  
**Impacto**: Qualquer pessoa com a URL pode invocar funções como `create-team-member`, `delete-team-member`, `sync-cadastros`, etc.  
**Sugestão**: Ativar `verify_jwt = true` para funções sensíveis (create-team-member, delete-team-member) e validar o token manualmente dentro da função.

---

### 12. Signup com auto-confirm implícito
**Categoria**: Segurança  
**Arquivo**: `src/contexts/AuthContext.tsx` (linha 201)  
**Descrição**: O toast de sucesso diz "Você já pode fazer login", sugerindo que auto-confirm está ativado. Se estiver, qualquer email (mesmo inválido) pode criar conta.  
**Impacto**: Criação de contas com emails falsos.  
**Sugestão**: Verificar e desativar auto-confirm; ajustar mensagem para "Verifique seu email".

---

## 🟢 MENORES

### 13. Typo no protectedPages.ts — "TEX" em vez de "TAX"
**Categoria**: Limpeza  
**Arquivo**: `src/config/protectedPages.ts` (linha 127)  
**Descrição**: Comentário diz `// === TEX PAGES ===` quando deveria ser `// === TAX PAGES ===`.  
**Impacto**: Confusão para desenvolvedores.  
**Sugestão**: Corrigir para `TAX`.

---

### 14. Imports não utilizados em FiscalSidebar.tsx
**Categoria**: Código Morto  
**Arquivo**: `src/components/equipe/fiscal/FiscalSidebar.tsx`  
**Descrição**: `Calculator`, `ChevronLeft`, `ArrowLeft` e outros ícones são importados mas podem não ser usados após as recentes refatorações.  
**Impacto**: Bundle size marginalmente maior.  
**Sugestão**: Limpar imports não utilizados.

---

### 15. `next-themes` instalado mas provavelmente não usado (sem dark mode)
**Categoria**: Dependência  
**Arquivo**: `package.json`  
**Descrição**: O pacote `next-themes` está instalado mas o projeto não parece ter dark mode implementado.  
**Impacto**: Dependência desnecessária.  
**Sugestão**: Verificar uso; remover se não utilizado.

---

## Resumo

| Severidade | Total |
|---|---|
| 🔴 Crítico | 6 |
| 🟡 Importante | 6 |
| 🟢 Menor | 3 |

| Categoria | Total |
|---|---|
| Código Morto | 4 |
| Segurança | 5 |
| Bug | 2 |
| Dependência | 2 |
| Limpeza | 1 |
| Performance | 1 |

### Top 5 Prioridades de Correção Imediata

1. **Revisar e corrigir RLS policies permissivas** — risco real de acesso indevido a dados
2. **Ativar `verify_jwt = true` nas edge functions sensíveis** — create/delete-team-member acessíveis sem auth
3. **Alinhar `protectedPages.ts` com as rotas reais** — sistema de permissões com paths fantasma
4. **Registrar páginas dev faltantes no controle de acessos** — consulta-ecd, ecf, balancetes, etc. sem controle
5. **Ativar proteção contra senhas vazadas** — configuração simples com impacto alto

