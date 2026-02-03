

# Plano: Renomear Página para DIFAL Inteligente (Nome e Caminho)

## Objetivo

Alterar tanto o nome quanto o caminho da página de "Auditoria Fiscal" para "DIFAL Inteligente" no sistema de controle de acessos.

## Alterações a Realizar

| Campo | Antes | Depois |
|-------|-------|--------|
| page_path | /equipe/dev/auditoria-fiscal | /equipe/dev/difal-inteligente |
| page_name | Auditoria Fiscal | DIFAL Inteligente |
| page_description | Ferramenta de auditoria fiscal | Ferramenta DIFAL Inteligente |

## Arquivo a Modificar

`src/config/protectedPages.ts`

## Código Atual (linhas 74-80)

```typescript
{
  page_path: '/equipe/dev/auditoria-fiscal',
  page_name: 'Auditoria Fiscal',
  page_description: 'Ferramenta de auditoria fiscal',
  category: 'dev',
  requires_admin: false,
  requires_team_member: true,
},
```

## Código Após Alteração

```typescript
{
  page_path: '/equipe/dev/difal-inteligente',
  page_name: 'DIFAL Inteligente',
  page_description: 'Ferramenta DIFAL Inteligente',
  category: 'dev',
  requires_admin: false,
  requires_team_member: true,
},
```

## Atenção: Alterações Adicionais Necessárias

Como o `page_path` será alterado, será necessário também atualizar:

| Arquivo | Alteração |
|---------|-----------|
| `src/App.tsx` | Atualizar a rota de `/equipe/dev/auditoria-fiscal` para `/equipe/dev/difal-inteligente` |
| Menu de navegação (se houver) | Atualizar link para a nova rota |

## Resumo das Alterações

1. Alterar `page_path` para `/equipe/dev/difal-inteligente`
2. Alterar `page_name` para `DIFAL Inteligente`
3. Alterar `page_description` para `Ferramenta DIFAL Inteligente`
4. Atualizar rota no `App.tsx`
5. Após deploy, clicar em "Atualizar lista" para sincronizar com o banco

