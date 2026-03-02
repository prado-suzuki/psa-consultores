

# Refazer layout da pagina GestaoClientes conforme referencia HTML

## Objetivo

Reorganizar a interface principal de `src/pages/equipe/dev/GestaoClientes.tsx` para ficar identica ao layout do HTML de referencia e imagem fornecidos, mantendo as cores padrao do projeto (Teal/Slate).

## Diferencas identificadas (atual vs referencia)

### 1. Secao do topo (Botao + texto auxiliar)
- **Atual**: Titulo "Visao Geral" + subtitulo + botao a direita com `bg-teal-600 text-white`
- **Referencia**: Apenas botao "+ Novo cliente" a ESQUERDA com fundo teal, e texto auxiliar "Gerencie sua base de dados de clientes" a DIREITA (com icone info). Sem titulo "Visao Geral" nem subtitulo.

### 2. Card de Filtros
- **Atual**: Titulo "Filtros de busca" (sentence case), grid 5 colunas, labels `text-xs`, selects com `bg-gray-50`, botoes na mesma area do card
- **Referencia**:
  - Titulo "FILTROS DE BUSCA" (uppercase, bold, lg) com icone filter_list em bg-gray-50 separado por borda
  - Grid 3 colunas (linha 1: Cliente, Contribuinte, Status; linha 2: Tipo, Categoria)
  - Labels `text-sm font-bold uppercase tracking-wider`
  - Selects com `h-12 bg-white border border-gray-300 rounded-lg shadow-sm`
  - Area de botoes separada em footer com `bg-gray-50 border-t` contendo "Limpar filtros" (sempre visivel, estilo outline) e "Buscar" (teal com icone search)

### 3. Secao de Resultados
- **Atual**: Card branco com header "Resultados recentes" + badge de contagem, empty state com icone grande em circulo
- **Referencia**:
  - Titulo "Resultados recentes" e "Mostrando X resultados" FORA de card, como texto simples entre o card de filtros e a area de resultados
  - Empty state: card com borda dashed, icone menor, texto simples "Utilize os filtros acima para encontrar clientes."
  - Sem card envolvente pesado, apenas borda dashed arredondada

### 4. Placeholders dos selects
- **Atual**: "Todos os clientes", "Selecione...", "Todos", "Selecione...", "Qualquer"
- **Referencia**: "Selecione um cliente", "Selecione o contribuinte", "Todos os status", "Selecione o tipo", "Selecione a categoria"

## Mudancas tecnicas

### Arquivo: `src/pages/equipe/dev/GestaoClientes.tsx`

**1. Secao do topo (linhas 203-220)**
- Remover titulo "Visao Geral" e subtitulo
- Botao "+ Novo cliente" a ESQUERDA com classes `h-12 px-6 bg-teal-500 hover:bg-teal-600 text-gray-900 font-bold rounded-lg shadow-md`
- Texto auxiliar a DIREITA: icone info + "Gerencie sua base de dados de clientes" (hidden em mobile)

**2. Card de Filtros (linhas 222-330)**
- Header separado: `px-6 py-5 border-b bg-gray-50` com icone Filter teal + titulo "FILTROS DE BUSCA" uppercase bold lg
- Corpo: `p-6` com grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`
- Labels: `text-sm font-bold uppercase tracking-wider text-gray-900`
- SelectTrigger: `h-12 bg-white border-gray-300 rounded-lg shadow-sm`
- Placeholders atualizados conforme referencia
- Footer separado: `px-6 py-4 bg-gray-50 border-t flex justify-end gap-3`
- Botao "Limpar filtros": sempre visivel (nao condicional), estilo `bg-white border border-gray-300 text-gray-500 hover:text-gray-900 h-10 px-4 rounded-lg font-bold shadow-sm`
- Botao "Buscar": `bg-teal-500 hover:bg-teal-600 text-gray-900 h-10 px-6 rounded-lg font-bold shadow-sm` com icone Search

**3. Secao de Resultados (linhas 332-457)**
- Remover card envolvente branco com header
- Titulo "Resultados recentes" como `text-lg font-bold` e "Mostrando X resultados" como `text-sm text-gray-500` em flex justify-between FORA de qualquer card
- Empty state: `rounded-xl border border-dashed border-gray-300 bg-white h-48 flex items-center justify-center gap-3 text-gray-500 shadow-sm` com icone Search menor e texto simples
- Quando ha resultados: manter tabela atual com paginacao como esta (ja esta boa)

## Campos e funcionalidades preservados

- Todos os 5 filtros (Cliente, Contribuinte, Status, Tipo, Categoria) mantidos
- Logica de queries, paginacao e modal inalterados
- Tabela de resultados e formatadores mantidos
- Cores Teal/Slate do projeto mantidas
