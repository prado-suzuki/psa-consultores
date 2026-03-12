

# Plano: Reordenar campos do formulário de OS no NewClientModal

## Problema atual

Nos dois formulários de OS (edição e nova OS) em `NewClientModal.tsx`, a ordem dos campos é:

1. Data de Emissão | Data Início
2. Data Fim | Tipo Produto/Segmento
3. Situação do Projeto | (vazio)
4. Valor do Projeto (col-span-2, linha inteira)

O usuário quer:

1. **Data Início | Data Fim** (mesma linha)
2. **Data de Emissão | Tipo Produto/Segmento** (mesma linha)
3. **Valor do Projeto (R$) | Situação do Projeto** (mesma linha, lado a lado)

## Correções

**Arquivo**: `src/components/equipe/dev/NewClientModal.tsx`

### 1. Formulário "Nova OS" (linhas ~3890-3983)

Reordenar os campos dentro do grid `grid-cols-2`:
- L1: Data Início → Data Fim
- L2: Data de Emissão → Tipo Produto/Segmento
- L3: Valor do Projeto (R$) à esquerda → Situação do Projeto à direita (remover `col-span-2` do Valor)

### 2. Formulário de edição de OS (linhas ~3521-3618)

Mesma reordenação:
- L1: Data Início → Data Fim
- L2: Data de Emissão → Tipo Produto/Segmento
- L3: Valor do Projeto (R$) à esquerda → Situação do Projeto à direita (remover `col-span-2` do Valor)

### 3. Seção de visualização (read-only FieldPair, linhas ~3424-3454)

Reordenar os `FieldPair` para manter consistência visual:
- Data Início | Data Fim
- Data de Emissão (se existir) | Tipo Produto/Segmento (se existir)
- Valor do Projeto | Situação do Projeto

