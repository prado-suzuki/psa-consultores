

# Plano: Sistema de Análise de Situação PER

## Objetivo

Implementar sistema de análise e marcação de situação diretamente na tabela de PERs, removendo "Situação" como opção de filtro separada e integrando-a como colunas dinâmicas na visualização de PER.

## Resumo das Alterações

| Tipo | Descrição |
|------|-----------|
| Remover | Opção "Situações" do filtro de Tipo de Registro |
| Adicionar | 3 novas colunas na tabela PER: Analisar, Situação, Data Atualização |
| Criar | Modal de análise simplificado (AnalisarPerModal) |
| Modificar | Query de PER para incluir última situação via join |

## Arquivos a Modificar

### 1. ControlePerdcomp.tsx (página principal)

**Alterações:**

1. **Tipo de Registro**: Remover opção `situacao` do tipo e do Select
   - Antes: `'per' | 'dcomp' | 'situacao'`
   - Depois: `'per' | 'dcomp'`

2. **Query de PER**: Modificar para buscar a situação mais recente
   ```text
   Para cada PER, buscar da tabela per_situacao:
   - situacao (string) - valor mais recente
   - criado_em (timestamp) - data mais recente
   WHERE nr_proc_per = numero_processo_per
   ORDER BY criado_em DESC LIMIT 1
   ```

3. **Novas colunas na tabela PER**:
   | Posição | Coluna | Descrição |
   |---------|--------|-----------|
   | 1ª | Analisar | Botão amarelo "Analisar" |
   | 2ª | Situação | Texto da situação atual |
   | 3ª | Atualização | Data `criado_em` mais recente |
   | 4ª+ | Colunas existentes | Nº Processo, Contribuinte, etc. |

4. **Estado para controlar botão "Verificado!"**:
   - Manter um Map/Set de PERs recém-verificados na sessão
   - Ao marcar, o botão muda de "Analisar" para "Verificado!"

5. **Remover código relacionado a Situação**:
   - Query `situacaoData`
   - Mutation `deleteSituacaoMutation`
   - Renderização da tabela de situações
   - Import do `SituacaoFormModal`

### 2. Criar AnalisarPerModal.tsx (novo componente)

**Arquivo:** `src/components/equipe/dev/perdcomp/AnalisarPerModal.tsx`

**Funcionalidade:**
- Modal simples com dropdown de situação
- Pré-carrega situação existente do PER (se houver)
- Ao confirmar, insere novo registro em `per_situacao`

**Interface:**

```text
+--------------------------------+
|  Analisar PER                  |
|  [X]                           |
+--------------------------------+
|                                |
|  Situação:                     |
|  [Dropdown com opções     ▼]   |
|   - PER Deferido               |
|   - Em análise                 |
|   - Analisado                  |
|                                |
|  [Marcar como verificado]      |
|                                |
+--------------------------------+
```

**Props:**

| Prop | Tipo | Descrição |
|------|------|-----------|
| open | boolean | Controla visibilidade |
| onOpenChange | function | Callback de fechamento |
| perNumero | string | Número do PER sendo analisado |
| situacaoAtual | string ou null | Situação atual para pré-selecionar |
| onSuccess | function | Callback após inserção bem-sucedida |

**Comportamento:**
1. Ao abrir, pré-seleciona situação atual no dropdown (se existir)
2. Ao clicar "Marcar como verificado":
   - Insere novo registro em `per_situacao`
   - Chama `onSuccess()` para atualizar estado pai
   - Fecha modal

## Fluxo de Dados

```text
[Usuário aplica filtro Cliente + Contribuinte]
                    ↓
[Query busca PERs + última situação de cada um]
                    ↓
[Tabela renderiza com colunas: Analisar | Situação | Data | ... ]
                    ↓
[Usuário clica "Analisar" em uma linha]
                    ↓
[AnalisarPerModal abre com situação pré-selecionada]
                    ↓
[Usuário seleciona situação e clica "Marcar como verificado"]
                    ↓
[INSERT em per_situacao + invalidate queries]
                    ↓
[Tabela atualiza + botão muda para "Verificado!"]
```

## Detalhes Técnicos

### Query Modificada de PER

A query precisa fazer um subquery ou join para trazer a situação mais recente:

```text
Estratégia: Duas queries
1. Query principal: busca PERs do contribuinte
2. Query secundária: busca situações mais recentes para os PERs encontrados
3. Combina os dados no frontend via map/reduce
```

Esta abordagem é mais simples que tentar fazer um join complexo no Supabase e permite melhor tratamento de PERs sem situação.

### Estado de "Verificado!"

```text
Estado local: Set<string> de numero_processo_per recém-verificados

Quando usuário marca como verificado:
1. Adiciona PER ao Set
2. Botão exibe "Verificado!" em vez de "Analisar"
3. Ao refetch dos dados, situação aparece na coluna

O estado "Verificado!" é visual/sessão para feedback imediato
```

### Opções do Dropdown

| Valor | Label |
|-------|-------|
| PER Deferido | PER Deferido |
| Em análise | Em análise |
| Analisado | Analisado |

## Arquivos a Criar

| Arquivo | Descrição |
|---------|-----------|
| `src/components/equipe/dev/perdcomp/AnalisarPerModal.tsx` | Modal simplificado de análise |

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/equipe/dev/ControlePerdcomp.tsx` | Remover Situação do filtro, adicionar colunas, integrar modal |

## Arquivos a Remover/Descontinuar

| Arquivo | Ação |
|---------|------|
| `src/components/equipe/dev/perdcomp/SituacaoFormModal.tsx` | Pode ser mantido mas não será mais usado nesta página |

## Ordem de Implementação

1. Criar `AnalisarPerModal.tsx` com dropdown e lógica de inserção
2. Modificar `ControlePerdcomp.tsx`:
   - Remover tipo `situacao` e código relacionado
   - Alterar query de PER para buscar situações
   - Adicionar novas colunas na tabela
   - Integrar `AnalisarPerModal`
   - Adicionar estado para "Verificado!"

