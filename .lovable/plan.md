

## Plan: Auto-selecionar contribuinte único em ferramentas Dev faltantes

### Diagnóstico

| Ferramenta | Tem auto-select? |
|---|---|
| ConsultaECF, EFD, ECD, EFDCIMS, XMLs | ✅ |
| ControlePerdcomp, ApuracaoPisCofins | ✅ |
| AuditoriaFiscal, CalculadoraIbsCbs | ✅ |
| **AuditoriaCruzada** | ❌ |
| **CorrecoesSped** | ❌ |
| **ControleBalancetes** | ❌ |
| **UploadBalanceteModal** | ❌ |

### Alterações

Adicionar um `useEffect` idêntico ao padrão já existente nas demais ferramentas em cada arquivo:

```tsx
useEffect(() => {
  if (clienteId && contribuintes && contribuintes.length === 1 && !contribuinteId) {
    setContribuinteId(contribuintes[0].id);
  }
}, [clienteId, contribuintes, contribuinteId]);
```

#### 1. `src/pages/equipe/dev/AuditoriaCruzada.tsx`
- Adicionar o `useEffect` após a linha que desestrutura `contribuintes` (linha ~29), usando `setContribuinteId` do `useAuditoriaStore()`

#### 2. `src/pages/equipe/dev/CorrecoesSped.tsx`
- Adicionar o `useEffect` após a linha que desestrutura `contribuintes` (linha ~46)

#### 3. `src/pages/equipe/dev/ControleBalancetes.tsx`
- Adicionar o `useEffect` após o fetch de contribuintes, usando `setContribuinteId` local

#### 4. `src/components/equipe/dev/balancete/UploadBalanceteModal.tsx`
- Adicionar o `useEffect` após o query de `contribuintes` (linha ~83), usando `setContribuinteId` local

### Nenhum tipo ou hook alterado

Apenas 4 arquivos recebem uma adição de ~5 linhas cada.

