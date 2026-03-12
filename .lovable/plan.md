

# Plano: Remover siglas de setor do dropdown de clientes

## Problema

Na linha 685 de `FiscalProjetosCadastro.tsx`, o dropdown de clientes exibe:
```
{client.nome} {client.setor_cliente && `(${client.setor_cliente})`}
```

O campo `setor_cliente` contém códigos internos como `REV`, `DIV` — siglas sem significado para o usuário. Exemplo: **"Barralcool (REV)"**, **"DK Transportes (DIV)"**.

## Correção

Remover a exibição de `setor_cliente` do `SelectItem`, deixando apenas `client.nome`. Mesma linha, alteração mínima:

```tsx
// De:
{client.nome} {client.setor_cliente && `(${client.setor_cliente})`}

// Para:
{client.nome}
```

**Arquivo**: `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`, linha 685.

