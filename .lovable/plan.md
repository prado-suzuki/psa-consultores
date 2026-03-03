

# Reordenar abas em Controle de Acessos

## Ordem atual
1. Páginas → 2. Usuários Estrutura → 3. Cadastros Estrutura → 4. Cadastros Clientes

## Nova ordem
1. **Páginas** → 2. **Cadastros Estrutura** → 3. **Usuários Estrutura** → 4. **Cadastros Clientes**

## Alteração

**`src/pages/equipe/EquipeControleAcessos.tsx`** — linhas 840-861:
- Trocar a posição dos `TabsTrigger` de "cadastros" (Cadastros Estrutura) com "users" (Usuários Estrutura)
- Os blocos `TabsContent` não precisam ser reordenados pois são renderizados por `value`, não por posição

Apenas reordenação visual, sem mudança de lógica.

