

# Corrigir FK: buscar contribuintes da tabela correta

## Problema raiz

O erro nao tem a ver com draft nem com campo vazio. O problema real e que:

- A tabela `per` tem uma foreign key (`per_id_contribuinte_fkey`) que aponta para a tabela **`contribuinte`** (producao)
- O modal busca os contribuintes da tabela **`contribuinte_dev`** (desenvolvimento)
- Os UUIDs sao diferentes entre as duas tabelas, entao mesmo selecionando corretamente um contribuinte, o ID vindo de `contribuinte_dev` nao existe em `contribuinte`, e o banco rejeita o insert

## Solucao

**Arquivo:** `src/components/equipe/dev/perdcomp/PerFormModal.tsx`

Alterar a query de contribuintes (linha 174) para buscar da tabela `contribuinte` em vez de `contribuinte_dev`:

```typescript
// DE:
.from('contribuinte_dev')

// PARA:
.from('contribuinte')
```

Mesma correcao para a query de clientes (linha 159), que deve buscar de `cliente` em vez de `cliente_dev`, ja que os IDs de `cliente_dev` nao correspondem aos `cliente_id` da tabela `contribuinte`:

```typescript
// DE:
.from('cliente_dev')

// PARA:
.from('cliente')
```

Sao apenas 2 linhas alteradas. Nenhuma outra mudanca e necessaria -- o fluxo de selecao e submit ja esta correto.

