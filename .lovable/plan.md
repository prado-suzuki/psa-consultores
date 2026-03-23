

## Plano: Adicionar coluna "Base Legal" na tabela principal do Mapa NCM

### Arquivo: `src/pages/equipe/dev/MapaNCMPisCofins.tsx`

**1. Header — nova coluna (entre "Descrição CST" e "Crédito", linha 109-110)**
```tsx
<TableHead className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Base Legal</TableHead>
```

**2. Célula de dados (entre desc_cst e permite_credito, linha 133-134)**
```tsx
<TableCell className="text-xs text-slate-600 max-w-[350px]">
  <span className="line-clamp-2">{regra.base_legal || '—'}</span>
</TableCell>
```
Usar `line-clamp-2` para exibir até 2 linhas do texto, permitindo leitura sem abrir o modal.

**3. Atualizar colSpan** dos estados de loading e empty de `6` → `7` (linhas 117 e 123).

**4. Incluir base_legal na busca textual** (filtro `search`, linha ~40) para que o usuário possa buscar por texto da base legal.

Alteração em 1 arquivo, sem mudança de lógica ou schema.

