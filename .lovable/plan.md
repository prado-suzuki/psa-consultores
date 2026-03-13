

# Plano: Simplificar campos das etapas

## Mudanças em ambos `StageEditCard.tsx` e `NewStageForm.tsx`

### 1. Remover campo "Responsável"
O dropdown "Cargo/Função" já cumpre essa função. Remover o campo `responsible` do formulário e da exibição read-only.

### 2. "Tempo Atual" e "Tempo Alvo" como input numérico em horas
Substituir os `<Input>` de texto livre por `<Input type="number" step="0.5">` com sufixo "h" visual. O valor será armazenado como string no banco (ex: `"2"`, `"0.5"`), mantendo compatibilidade com a coluna existente, mas o input garante que só números entrem.

### 3. Volume calculado automaticamente
Calcular `volume` a partir de `frequency` e `time_current`:
- Mapear frequência para multiplicador mensal: Diária=22, Semanal=4, Quinzenal=2, Mensal=1, Trimestral=0.33, Anual=0.083
- Usar um `<Select>` para frequência em vez de texto livre (valores padronizados)
- Volume = `frequência_multiplicador × time_current` (horas/mês)
- Exibir volume como campo read-only calculado (ex: "44h/mês")
- Remover o campo editável de Volume

### 4. Exibição read-only (StageEditCard)
- Remover bloco "Responsável" da visualização
- Mostrar cargo do `job_role_id` se disponível (buscar nome do role)
- Mostrar volume calculado automaticamente

## Arquivos alterados

| Arquivo | Alteração |
|---|---|
| `StageEditCard.tsx` | Remover campo responsável, input numérico para tempos, select para frequência, volume auto-calculado |
| `NewStageForm.tsx` | Mesmas mudanças |

Sem alteração de banco — os campos `responsible` e `volume` continuam existindo na tabela, apenas não serão mais preenchidos manualmente.

