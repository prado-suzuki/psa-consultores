

## Plan: Atualizar aviso de cascata no SoftDeleteModal

### Arquivo: `src/components/equipe/dev/perdcomp/SoftDeleteModal.tsx`

**Alteração 1 — Texto e destaque visual (linhas 100-103)**

Substituir a frase inline no `DialogDescription` por um card de alerta amarelo separado, exibido apenas quando `type === 'per'`:

```tsx
<DialogDescription>
  Selecione a ação para o {label} <span className="font-mono font-medium">{identifier}</span>
</DialogDescription>
{type === 'per' && (
  <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm font-medium text-black">
    Atenção, esta ação valerá também para todos os DCOMPs vinculados a este PER.
  </div>
)}
```

O componente já está separado (`SoftDeleteModal`) e já diferencia os dois estados (`per` / `dcomp`). Nenhuma reestruturação necessária.

### Resultado
- Para PER: card amarelo com texto em preto aparece abaixo da descrição
- Para DCOMP: nenhum aviso extra (comportamento atual mantido)

