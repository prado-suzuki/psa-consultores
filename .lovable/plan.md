

# Padronizar Auto-seleção de Contribuinte em Todas as Ferramentas Dev

## Análise Atual

Todas as 5 ferramentas da Digital Dev possuem filtro de contribuinte quando um cliente é selecionado:

| Ferramenta | Auto-seleciona? | Padrão |
|---|---|---|
| **ConsultaEFD.tsx** | ✅ Sim | Estado: `selectedContribuinte`, usa `contribuintes[0].id` |
| **ConsultaEFDICMS.tsx** | ✅ Sim | Estado: `selectedContribuinte`, usa `contribuintes[0].id` |
| **AuditoriaFiscal.tsx** | ✅ Sim | Estado: `selectedContribuinte`, usa `contribuintes[0].id` |
| **ConsultaXMLs.tsx** | ❌ Não | Estado: `selectedContribuinte`, precisa add useEffect |
| **ControlePerdcomp.tsx** | ❌ Não | Estado: `contribuinteId` (diferente), precisa add useEffect |
| **GestaoClientes.tsx** | ❌ Não | Estado: `nomeRazaoSocial` (texto, não ID!), precisa add useEffect |

## Particularidades Por Arquivo

### ConsultaXMLs.tsx
- **Estado**: `selectedContribuinte` (string)
- **Local**: Após linha 95 (após useQuery de contribuintes)
- **Padrão**: Usar o mesmo useEffect de ConsultaEFD/ConsultaEFDICMS

### ControlePerdcomp.tsx
- **Estado**: `contribuinteId` (não `selectedContribuinte`)
- **Local**: Após linha 122 (após useQuery de contribuintes)
- **Padrão**: Adaptar para usar `setContribuinteId` e `clienteId` (não `selectedCliente`)

### GestaoClientes.tsx
- **Estado**: `nomeRazaoSocial` (nome, NÃO ID!)
- **Peculiaridade**: Usa o **nome** como valor, não o ID
- **Local**: Após linha 171 (após useQuery de contribuintes)
- **Lógica**: Pegar o `nome_razao_social` do único contribuinte e usar como valor do select
- **Padrão**: `setNomeRazaoSocial(contribuintes[0].nome_razao_social)`

## Implementação

### 1. **src/pages/equipe/dev/ConsultaXMLs.tsx**
Adicionar `useEffect` após a query de contribuintes (linha ~95):
```typescript
useEffect(() => {
  if (selectedCliente && contribuintes && contribuintes.length === 1 && !selectedContribuinte) {
    setSelectedContribuinte(contribuintes[0].id);
  }
}, [selectedCliente, contribuintes, selectedContribuinte]);
```
Nota: Verificar se `useEffect` está já importado; caso contrário, adicionar ao import de React.

### 2. **src/pages/equipe/dev/ControlePerdcomp.tsx**
Adicionar `useEffect` após a query de contribuintes (linha ~122):
```typescript
useEffect(() => {
  if (clienteId && contribuintes && contribuintes.length === 1 && !contribuinteId) {
    setContribuinteId(contribuintes[0].id);
  }
}, [clienteId, contribuintes, contribuinteId]);
```
Nota: Verificar se `useEffect` está já importado; está na linha 1: `import { useState, useMutation, useQueryClient }` - **falta adicionar useEffect**.

### 3. **src/pages/equipe/dev/GestaoClientes.tsx**
Adicionar `useEffect` após a query de contribuintes (linha ~171), aproveitando o existing useEffect que limpa o filtro:
```typescript
// Mover e expandir o useEffect existente (linhas 174-176)
useEffect(() => {
  // Se cliente muda, limpar filtro de contribuinte
  setNomeRazaoSocial('');
}, [clienteId]);

// Adicionar novo useEffect para auto-selecionar
useEffect(() => {
  if (clienteId && clienteId !== '__todos__' && contribuintes && contribuintes.length === 1 && !nomeRazaoSocial) {
    setNomeRazaoSocial(contribuintes[0].nome_razao_social);
  }
}, [clienteId, contribuintes, nomeRazaoSocial]);
```

## Resultado Final

Todas as 6 ferramentas seguirão o mesmo padrão visual/comportamental: ao selecionar um cliente com apenas um contribuinte, o filtro de contribuinte será preenchido automaticamente, economizando cliques do usuário.

