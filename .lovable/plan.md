
# Plano: Corrigir Erro de Formato de Data no DCOMP

## Diagnóstico

O erro `invalid input syntax for type date: "2025-02"` ocorre porque:

1. O campo `mes_ano_exercicio` no banco de dados é do tipo **DATE** (requer formato `YYYY-MM-DD`)
2. O input HTML `type="month"` retorna formato `YYYY-MM` (exemplo: `2025-02`)
3. Ao salvar/atualizar, o valor `2025-02` é enviado diretamente, causando erro de sintaxe SQL

```text
Fluxo atual (com erro):
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Banco     │ --> │   Formulário │ --> │   Banco     │
│ 2025-09-01  │     │   2025-09    │     │   2025-09   │ ❌ ERRO!
└─────────────┘     └──────────────┘     └─────────────┘
```

---

## Solução

Normalizar o valor de `mes_ano_exercicio` antes de enviar para o banco, adicionando `-01` ao final para formar uma data válida.

```text
Fluxo corrigido:
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Banco     │ --> │   Formulário │ --> │   Banco     │
│ 2025-09-01  │     │   2025-09    │     │ 2025-09-01  │ ✓
└─────────────┘     └──────────────┘     └─────────────┘
```

---

## Arquivo a Modificar

**Arquivo:** `src/components/equipe/dev/perdcomp/DcompFormModal.tsx`

### Alteração 1: Criar Função de Normalização

Adicionar função auxiliar para garantir formato correto:

```typescript
const normalizeMesAno = (value: string): string => {
  if (!value) return '';
  // Se já está no formato YYYY-MM-DD, retornar como está
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  // Se está no formato YYYY-MM, adicionar -01
  if (/^\d{4}-\d{2}$/.test(value)) {
    return `${value}-01`;
  }
  return value;
};
```

### Alteração 2: Aplicar nos Mutations

Modificar `createMutation` e `updateMutation` para usar a função:

```typescript
// Em createMutation:
mes_ano_exercicio: normalizeMesAno(data.mes_ano_exercicio),

// Em updateMutation:
mes_ano_exercicio: normalizeMesAno(data.mes_ano_exercicio),
```

### Alteração 3: Formatar ao Carregar Dados

Ajustar o `useEffect` para converter o formato do banco (YYYY-MM-DD) para o formato do input (YYYY-MM):

```typescript
mes_ano_exercicio: editData.mes_ano_exercicio?.substring(0, 7) || '',
```

---

## Resumo das Mudanças

| Localização | Mudança |
|-------------|---------|
| Linha ~33 | Adicionar função `normalizeMesAno` |
| Linha ~101 | Formatar `mes_ano_exercicio` ao carregar (substring 0-7) |
| Linha ~125 | Aplicar `normalizeMesAno` no insert |
| Linha ~149 | Aplicar `normalizeMesAno` no update |

---

## Impacto

- Correção aplicada apenas no DcompFormModal
- Funciona para criação e edição de DCOMPs
- Compatível com dados existentes no banco
- Sem necessidade de migração de dados
