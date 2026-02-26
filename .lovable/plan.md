

# Melhorias de UX e Mascaras no NewClientModal (com correcao de edge case)

## Resumo
Adicionar 4 blocos de melhorias ao componente: protecao contra refresh do navegador, funcoes de mascara para formatacao automatica, aplicacao dessas mascaras nos inputs + limite de caracteres, e correcao do edge case ao trocar tipo de pessoa.

## Detalhes Tecnicos

### 1. Protecao contra Refresh / Fechamento da Aba

Adicionar um `useEffect` que observa `hasUnsavedChanges`:
- Se `true`, registra `window.addEventListener('beforeunload', handler)`.
- O handler: `e.preventDefault(); e.returnValue = '';`.
- Cleanup remove o listener.

### 2. Funcoes de Mascara (utilitarias puras)

Criar 3 funcoes no topo do arquivo (antes do componente, apos as constantes):

- **`formatCpfCnpj(value, tipo)`**: Remove nao-digitos. Se PF, limita 11 digitos e aplica `000.000.000-00`. Se PJ, limita 14 digitos e aplica `00.000.000/0000-00`.
- **`formatCep(value)`**: Remove nao-digitos, limita 8, aplica `00000-000`.
- **`formatPhone(value)`**: Remove nao-digitos, limita 11, aplica `(00) 0000-0000` (10 digitos) ou `(00) 00000-0000` (11 digitos).

### 3. Aplicacao das Mascaras e Limites nos Inputs

**Aba Contribuintes -- CPF/CNPJ:**
- Draft: trocar onChange para usar `formatCpfCnpj(e.target.value, draftEntity.tipo_pessoa || 'PJ')`.
- Inline edit: trocar onChange para usar `formatCpfCnpj(e.target.value, ed.tipo_pessoa || 'PJ')`.

**Aba Contribuintes -- CEP:**
- Draft: trocar onChange para usar `formatCep(e.target.value)`.
- Inline edit: trocar onChange para usar `formatCep(e.target.value)`.

**Aba Participantes -- Telefone:**
- Draft: trocar onChange para usar `formatPhone(e.target.value)`.
- Inline edit: mesma mascara.

**Aba Contratos -- Descricao do Projeto:**
- Draft Textarea: adicionar `maxLength={500}` e contador de caracteres abaixo (`X/500`).
- Inline edit Textarea: adicionar `maxLength={500}` e contador abaixo.

### 4. Correcao do Edge Case: Troca de Tipo de Pessoa (PJ <-> PF)

Ao trocar o Select de "Tipo" (PJ/PF), o campo CPF/CNPJ deve ser limpo para evitar que numeros residuais quebrem a mascara do novo tipo.

**Draft (linha ~1150):** Alterar o `onValueChange` do Select de tipo_pessoa para:
```text
onValueChange={v => setDraftEntity({ ...draftEntity, tipo_pessoa: v, cpf_cnpj: '' })}
```

**Inline edit (linha ~1026):** Alterar o `onValueChange` para:
```text
onValueChange={v => setEditingEntityData({ ...ed, tipo_pessoa: v, cpf_cnpj: '' })}
```

### Resumo de alteracoes

| Local | O que muda |
|-------|-----------|
| Topo do arquivo | 3 funcoes utilitarias: `formatCpfCnpj`, `formatCep`, `formatPhone` |
| useEffect | Listener `beforeunload` baseado em `hasUnsavedChanges` |
| Input CPF/CNPJ (draft + inline) | onChange com mascara |
| Input CEP (draft + inline) | onChange com mascara |
| Input Telefone participante (draft + inline) | onChange com mascara |
| Select tipo_pessoa (draft + inline) | Limpa cpf_cnpj ao trocar tipo |
| Textarea Descricao OS (draft + inline) | `maxLength={500}` + contador |

Arquivo unico alterado: `src/components/equipe/dev/NewClientModal.tsx`

