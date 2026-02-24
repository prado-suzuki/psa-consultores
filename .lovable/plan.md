

# Mover Cadastros para dentro de Acessos como sub-aba

## O que sera feito

A pagina separada de "Cadastros" (`/equipe/cadastros`) sera incorporada como uma terceira aba dentro da pagina de "Controle de Acessos" (`/equipe/acessos`), ao lado das abas "Paginas" e "Usuarios". A rota e o arquivo separados serao removidos.

## Mudancas

### 1. Arquivo: `src/pages/equipe/EquipeControleAcessos.tsx`

- Importar os icones adicionais usados em Cadastros (`Building2`, `FolderKanban`, `Workflow`)
- Adicionar estados para a logica de cadastros (areas, stats, dialogOpen, editingArea, formData, colorPresets)
- Adicionar funcoes de fetch e CRUD (`fetchCadastros`, `handleSaveCadastro`, `handleToggleActive`, `handleDeleteCadastro`)
- Adicionar uma terceira aba "Cadastros" no TabsList existente (linha ~661), com icone `Building2`
- Adicionar o `TabsContent value="cadastros"` contendo a tabela de areas internas, visao geral e dialog de criacao/edicao (mesmo conteudo que hoje esta em `EquipeCadastros.tsx`)

A estrutura de abas ficara:

```
Paginas | Usuarios | Cadastros
```

### 2. Arquivo: `src/App.tsx`

- Remover o import de `EquipeCadastros`
- Remover a rota `/equipe/cadastros`

### 3. Arquivo: `src/pages/equipe/EquipeCadastros.tsx`

- Sera removido (ou mantido vazio) ja que todo o conteudo foi migrado para EquipeControleAcessos

### 4. Sidebar (se houver referencia)

- Remover qualquer link para `/equipe/cadastros` na navegacao do DigitalAreaSelector ou EquipeLayout, caso exista

## Resultado esperado

- Ao acessar `/equipe/acessos`, o admin vera 3 abas: Paginas, Usuarios e Cadastros
- A aba Cadastros tera exatamente a mesma funcionalidade atual (CRUD de areas internas com cores, lideres e status)
- A rota `/equipe/cadastros` deixa de existir
- Tudo centralizado em um unico ponto de gestao administrativa

