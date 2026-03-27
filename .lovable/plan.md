

## Plano: Corrigir profileType nos EFDExportDialog inline

### Diagnóstico

Existem **duas** instâncias de `EFDExportDialog` em cada página: uma inline (dentro da tabela, por arquivo) e uma externa (controlada, para o botão de exportação fora da tabela). Apenas as instâncias externas passam `profileType`. As inline usam o default `'efd'`, causando todos os perfis serem salvos como `tool_type = 'efd'`.

| Página | Inline (bug) | Externa (OK) |
|---|---|---|
| ConsultaEFD.tsx (linha 671) | sem profileType → default `'efd'` | ✅ não tem externa |
| ConsultaEFDICMS.tsx (linha 913) | sem profileType → default `'efd'` | profileType="efd_icms" ✅ |
| ConsultaECD.tsx (linha 482) | sem profileType → default `'efd'` | profileType="efd_ecd" ✅ |
| ConsultaECF.tsx (linha 490) | sem profileType → default `'efd'` | profileType="efd_ecf" ✅ |

### Correções

**1. ConsultaEFD.tsx** — linha 671: já é `'efd'`, está correto. Nenhuma mudança.

**2. ConsultaEFDICMS.tsx** — linha 913: adicionar `profileType="efd_icms"`.

**3. ConsultaECD.tsx** — linha 482: adicionar `profileType="efd_ecd"`.

**4. ConsultaECF.tsx** — linha 490: adicionar `profileType="efd_ecf"`.

### Também: derivar profileType do tipo automaticamente

Para evitar esse bug no futuro, alterar `EFDExportDialog` para derivar `profileType` do `tipo` quando não fornecido explicitamente:

```typescript
// No componente, trocar o default:
// profileType = 'efd'  →  profileType derivado
const resolvedProfileType = profileType ?? (tipo === 'contribuicoes' ? 'efd' : `efd_${tipo}` as ExportToolType);
```

Assim, mesmo sem passar `profileType`, o componente usa o tipo correto baseado no `tipo` já fornecido.

