

# Ajustes no NewClientModal

## 1. Aba Cliente: Ordem dos campos (sem alteracao)

A ordem atual ja esta correta: Area do negocio (5) -> Tipo de produto/segmento (6) -> Regiao (7). Nenhuma movimentacao necessaria.

## 2. Aba Participantes

### 2a. Remover campo "Cargo" (3 locais)
- **Formulario novo** (linhas 1814-1820): remover bloco do campo Cargo
- **Edicao inline** (linhas 1721-1727): remover bloco do campo Cargo
- **Visualizacao expandida** (linha 1687): remover `<FieldPair label="Cargo" ...>`

### 2b. Renomear "Tipo" para "Cargo/funcao" (3 locais)
- Formulario novo (linha 1801): `"Tipo *"` -> `"Cargo/funcao *"`
- Edicao inline (linha 1708): `"Tipo *"` -> `"Cargo/funcao *"`
- Visualizacao expandida (linha 1686): `"Tipo de Participante"` -> `"Cargo/funcao"`

### 2c. Header do card (linha 1652)
- Remover referencia a `part.cargo` no subtitulo (exibir apenas `part.tipo_participante`)

## 3. Aba Contribuintes: Adicionar campo telefone

### 3a. Interface `DraftEntity` (linha 87-105)
Adicionar `telefone: string` na interface.

### 3b. Inicializacao
Incluir `telefone: ''` nos valores default do draftEntity e nos resets.

### 3c. Formulario de novo contribuinte
Adicionar campo de telefone com mascara `formatPhone` (ja existente no projeto) apos Nome Fantasia, seguindo o layout padrao (Label w-48, Input h-8).

### 3d. Formulario de edicao inline
Adicionar campo equivalente na edicao inline do contribuinte.

### 3e. Visualizacao expandida (linha 1272-1287)
Adicionar `<FieldPair label="Telefone" value={ent.telefone} />`.

### 3f. Payload de salvamento (linha 893-903)
Incluir `telefone: e.telefone || null` no objeto de insert do contribuinte.

## 4. Aba Contribuintes: Labels dinamicas para PF

Quando `tipo_pessoa === 'PF'`:
- **Formulario novo** (linha 1498): label muda de `"Razao Social *"` para `"Nome completo *"`, placeholder de `"Nome Empresarial"` para `"Nome completo do contribuinte"`
- **Edicao inline** (linha 1317): mesma logica de label e placeholder
- Visualizacao expandida (linha 1275): ja exibe `"Razao Social / Nome Completo"` -- manter como esta

## 5. Selects: Remover "Selecione" da lista suspensa

Nos selects de Inscricao Estadual e Simples Nacional, o item `<SelectItem value="__none__">Selecione...</SelectItem>` aparece como opcao selecionavel. A correcao:

- Remover o `<SelectItem value="__none__">` do `<SelectContent>`
- Manter `placeholder="Selecione..."` no `<SelectTrigger>` (ja existe)
- Mudar `value` de `|| '__none__'` para `|| ''` e ajustar `onValueChange` para tratar string vazia

**Locais afetados (4 selects):**
- Inscricao Estadual - formulario novo (linhas 1516-1524)
- Inscricao Estadual - edicao inline (linhas 1335-1338)
- Simples Nacional - formulario novo (linhas 1550-1557)
- Simples Nacional - edicao inline (linhas 1364-1371)

## Resumo tecnico

| Alteracao | Arquivo |
|---|---|
| Todas as alteracoes acima | `src/components/equipe/dev/NewClientModal.tsx` |

Nenhuma migration de banco necessaria (campo `telefone` ja existe na tabela `contribuinte`/`contribuinte_dev` conforme schema).
