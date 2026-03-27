

## Plano: Adicionar validação de IE no saveEditEntity

### Problema
`saveEditEntity()` não valida Inscrições Estaduais. As IEs durante edição ficam no `inscricoesMap` (chave = `_dbId || _id`), não em `editingEntityData`.

### Alteração (ContribuintesTab.tsx, linha 75→76)

Inserir após a validação de Simples Nacional (L74) e antes do `setEntities` (L76):

```tsx
// Validar IEs do contribuinte em edição
const ieKey = editingEntityData._dbId || String(editingEntityId);
const editingIEs = inscricoesMap[ieKey] || [];
for (const ie of editingIEs) {
  if (ie.situacao === "sim" && !ie.uf) { toast.error("Selecione a UF para todas as inscrições estaduais"); return; }
  if (ie.situacao === "sim" && !ie.numero_ie?.trim()) { toast.error(`Informe o número da IE para o estado ${ie.uf}`); return; }
}
```

Nota: usa `inscricoesMap` (onde as IEs ficam durante edição inline) em vez de `editingEntityData.inscricoes_estaduais` que não existe nessa estrutura.

### Arquivo modificado
| Arquivo | Alteração |
|---------|-----------|
| `ContribuintesTab.tsx` | +6 linhas entre L75 e L76 |

