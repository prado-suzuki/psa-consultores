
# Plano: Adicionar Escritório Sinop

## Objetivo
Adicionar um novo card de filial para o Escritório Sinop entre os escritórios de Cuiabá e Barreiras na seção "Onde Estamos".

## Dados do Novo Escritório

| Campo | Valor |
|-------|-------|
| **Tipo** | Filial |
| **Cidade** | Sinop |
| **Estado** | MT |
| **E-mail** | contato@pradosuzuki.com |
| **Telefone** | (65) 3622-2426 |
| **Endereço** | Av. das Itaúbas 3020, Sinop, MT, 78550-086 |

## Alteração Necessária

### Arquivo: `src/components/OfficesSection.tsx`

Inserir novo objeto no array `offices` entre o escritório de Cuiabá (posição 0) e Barreiras (posição 1):

```typescript
const offices = [
  {
    id: "cuiaba",
    city: "Cuiabá",
    state: "MT",
    type: "Matriz",
    email: "contato@pradosuzuki.com",
    phone: "(65) 3622-2426",
    address: "Rua Des. José Barros do Vale, 03 – Bairro Duque de Caxias – Cuiabá/MT, CEP 78043-292",
  },
  // ↓ NOVO ESCRITÓRIO AQUI ↓
  {
    id: "sinop",
    city: "Sinop",
    state: "MT",
    type: "Filial",
    email: "contato@pradosuzuki.com",
    phone: "(65) 3622-2426",
    address: "Av. das Itaúbas 3020, Sinop, MT, 78550-086",
  },
  {
    id: "barreiras",
    // ... resto permanece igual
  },
  // ...
];
```

## Resultado Visual Esperado

A ordem dos cards ficará:

1. **Matriz** - Escritório Cuiabá (MT)
2. **Filial** - Escritório Sinop (MT) ← Novo
3. **Filial** - Escritório Barreiras (BA)
4. **Filial** - Escritório Curitiba (PR)

## Resumo

| Aspecto | Detalhes |
|---------|----------|
| **Arquivo** | `src/components/OfficesSection.tsx` |
| **Tipo de alteração** | Adicionar 1 objeto ao array `offices` |
| **Posição** | Entre índice 0 (Cuiabá) e índice 1 (Barreiras) |
| **Linhas afetadas** | 16-17 (inserção após linha 16) |
