

# Plano de Ação — Fase 6.1: Extração de Constantes e Utilitários de Formatação

## Objetivo
Mover constantes de opções e funções de máscara/formatação do `NewClientModal.tsx` para um arquivo dedicado, sem alterar nenhum JSX ou lógica de componente.

## Análise do Arquivo Atual
Identificadas no topo do arquivo (linhas 58-163):

| Item | Linhas | Tipo |
|------|--------|------|
| `clienteTable`, `contribuinteTable`, `participanteTable` | 58-60 | Constantes de ambiente |
| `TIPO_PARTICIPANTE_OPTIONS` | 65-74 | Constante de opções |
| `SITUACAO_PROJETO_OPTIONS` | 80-85 | Constante de opções |
| `UF_STATES` | 89-92 | Constante de opções |
| `formatCpfCnpj` | 95-110 | Função de máscara |
| `formatCep` | 112-116 | Função de máscara |
| `formatPhone` | 118-124 | Função de máscara |
| `formatBRLInput` | 127-129 | Função de formatação |
| `centsToValue` | 131 | Função utilitária |
| `valueToCents` | 133 | Função utilitária |
| `formatDateMask` | 136-141 | Função de máscara |
| `parseDateMask` | 143-153 | Função de parsing |
| `isoToMasked` | 155-163 | Função de conversão |

## Passos de Execução

### 1. Criar estrutura de diretório
```
src/components/equipe/fiscal/client-form/
```

### 2. Criar `src/components/equipe/fiscal/client-form/constants.ts`

Conteúdo a incluir:
- Todas as constantes de opções (`UF_STATES`, `TIPO_PARTICIPANTE_OPTIONS`, `SITUACAO_PROJETO_OPTIONS`)
- Todas as funções de máscara e formatação (`formatCpfCnpj`, `formatCep`, `formatPhone`, `formatBRLInput`, `formatDateMask`, `parseDateMask`, `isoToMasked`)
- Funções auxiliares de conversão de moeda (`centsToValue`, `valueToCents`)

### 3. Editar `NewClientModal.tsx`

- **Remover** as definições das linhas 65-163 (constantes e funções)
- **Adicionar** import no topo:
```typescript
import {
  UF_STATES,
  TIPO_PARTICIPANTE_OPTIONS,
  SITUACAO_PROJETO_OPTIONS,
  formatCpfCnpj,
  formatCep,
  formatPhone,
  formatBRLInput,
  centsToValue,
  valueToCents,
  formatDateMask,
  parseDateMask,
  isoToMasked,
} from "./client-form/constants";
```

## Escopo Estritamente Protegido

| NÃO Mover Agora | Razão |
|-----------------|-------|
| `DateFieldWithInput` (linhas 168-238) | É um componente React completo (futura Fase 6.2) |
| `CurrencyField` (linhas 241-271) | É um componente React completo (futura Fase 6.2) |
| `clienteTable`, `contribuinteTable`, `participanteTable` | Constantes de ambiente, podem ficar no arquivo principal |
| Qualquer estado, handler ou lógica de aba | Mantido no orquestrador |

## Resultado Esperado

- `NewClientModal.tsx`: ~90 linhas removidas do topo
- Novo arquivo `constants.ts`: ~100 linhas com exports nomeados
- Funcionalidade idêntica: zero mudanças no comportamento do formulário
- Base estabelecida para as próximas fases de extração de componentes visuais

