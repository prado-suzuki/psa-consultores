
# Adicionar categoria "Transportadora" em Área do Negócio

## Alteração

Arquivo: `src/components/equipe/fiscal/NewClientModal.tsx`, linha ~1902.

Adicionar um novo `SelectItem` na lista de opções do campo "Área do negócio":

```
<SelectItem value="TRA">TRA - Transportadora</SelectItem>
```

Será inserido após "DIV - Outros diversos" (ou em ordem alfabética, conforme preferir).

## Escopo

- 1 arquivo, 1 linha adicionada.
- Sem migração de banco (o campo `setor_cliente` é texto livre).
