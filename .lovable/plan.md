

# Plano: Corrigir Modo de Leitura Absoluto nos Tabs do NewClientModal

## Problema Identificado
Os componentes de aba (`ContribuintesTab`, `ParticipantesTab`, `ContratosTab`) exibem botões de **Editar** (lápis) e **Remover** (lixeira) nos cards expandidos mesmo quando `isReadOnly={true}`. Isso permite edição local que dispara o alerta de dados não salvos ao fechar, criando UX confusa.

## Solução Técnica

### 1. ContribuintesTab.tsx (linhas ~142-189)
**Atual**: Bloco de ações sempre visível no modo read-only expandido
**Correção**: Condicionar renderização dos botões "Editar" e "Remover" a `!isReadOnly`

```text
ANTES (linha ~142):
{isExpanded && !isEditingThis && (
  <div className="px-4 pb-4 border-t pt-3">
    <div className="flex justify-end gap-2 mb-3">
      <Button onEdit...>  ← sempre visível
      <AlertDialog onDelete...>  ← sempre visível

DEPOIS:
{isExpanded && !isEditingThis && (
  <div className="px-4 pb-4 border-t pt-3">
    {!isReadOnly && (
      <div className="flex justify-end gap-2 mb-3">
        <Button onEdit...>
        <AlertDialog onDelete...>
      </div>
    )}
```

### 2. ParticipantesTab.tsx (linhas ~109-151)
Mesmo padrão - envolver botões de edição/exclusão em `{!isReadOnly && (...)}`

### 3. ContratosTab.tsx (linhas ~280-323)
Mesmo padrão - envolver botões de edição/exclusão em `{!isReadOnly && (...)}`

## Checklist de Implementação

| Arquivo | Linha(s) | Ação |
|---------|----------|------|
| `ContribuintesTab.tsx` | ~144-189 | Adicionar condicional `!isReadOnly` ao bloco de ações |
| `ParticipantesTab.tsx` | ~111-151 | Adicionar condicional `!isReadOnly` ao bloco de ações |
| `ContratosTab.tsx` | ~282-323 | Adicionar condicional `!isReadOnly` ao bloco de ações |

## Comportamento Esperado Após Correção
- Modo leitura (`isReadOnly=true`): Cards expandidos mostram apenas os dados, sem botões de ação
- Modo edição (`isReadOnly=false`): Cards expandidos mantêm botões Editar/Remover funcionais
- O formulário "Novo X" já está corretamente condicionado a `!isReadOnly` nos três componentes

