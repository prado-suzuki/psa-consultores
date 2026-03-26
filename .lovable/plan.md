

## Plano: Modernizar UI/UX da tabela CorrecoesSped.tsx

### Arquivo: `src/pages/equipe/dev/CorrecoesSped.tsx`

---

### 1. Imports (L11)

Adicionar `BookOpen` e `Network` aos imports de lucide-react (já tem `FileSearch`).

---

### 2. Headers com zonas coloridas (L215-231)

Criar 3 faixas visuais nos `TableHead` com sub-headers de grupo:

- **Zona EFD** (Descrição, NCM, Valor): fundo padrão, sem alteração.
- **Zona XML** (Descrição, NCM, Valor): `bg-blue-50/60 dark:bg-blue-950/20` + `border-l-2 border-dashed border-blue-200`.
- **Zona Impostos** (CST PIS → VL COF + Conta): `bg-slate-50/60 dark:bg-slate-800/20` + `border-l-2 border-dashed border-slate-200`.

Adicionar uma **linha de grupo** acima dos headers (`colSpan`):
```text
| EFD (3 cols)       | XML (3 cols)       | Impostos (7 cols)     |
| Desc | NCM | Valor | Desc | NCM | Valor | CST PIS ... Conta    |
```

Todos os headers de valor financeiro recebem `text-right`.

---

### 3. Ações explícitas — NCM (EFD) (L243-253)

**De:** `<button><code>NCM</code></button>` texto simples clicável

**Para:** Badge interativo com ícone:
```tsx
<Badge
  variant="outline"
  className="cursor-pointer gap-1 font-mono text-[11px] hover:bg-teal-50 text-teal-700 border-teal-200"
  onClick={() => setSelectedNcm(item.cod_ncm)}
>
  <BookOpen className="h-3 w-3" />
  {item.cod_ncm}
</Badge>
```

---

### 4. Ações explícitas — Descrição (XML) (L259-278)

**1:1:** Transformar o link em Badge outline clicável:
```tsx
<Badge
  variant="outline"
  className="cursor-pointer gap-1 text-[11px] max-w-[190px] truncate hover:bg-blue-50 border-blue-200"
  onClick={() => setSelectedItem(item)}
>
  <FileSearch className="h-3 w-3 shrink-0" />
  <span className="truncate">{xml.xProd}</span>
</Badge>
```

**CONSOLIDADO:** Badge com ícone Network:
```tsx
<Badge
  className="cursor-pointer gap-1 text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
  onClick={() => setSelectedItem(item)}
>
  <Network className="h-3 w-3" />
  Consolidado
</Badge>
```

---

### 5. NCM (XML) com alerta (L280-286)

Quando divergente, renderizar o NCM dentro de um Badge vermelho:
```tsx
<Badge variant="outline" className="font-mono text-[11px] border-red-200 text-red-600 bg-red-50/50 gap-1">
  <AlertCircle className="h-3 w-3" />
  {xml.ncm}
</Badge>
```
Quando OK, exibir como `<code>` simples (sem interação — NCM XML não abre modal).

---

### 6. Zonas coloridas no Body (L239-298)

Aplicar as mesmas faixas de fundo dos headers às `TableCell`:
- Colunas XML: `bg-blue-50/20 dark:bg-blue-950/5` (já parcialmente implementado, uniformizar).
- Colunas Impostos (CST PIS até Conta): `bg-slate-50/30 dark:bg-slate-800/10` + `border-l-2` na primeira coluna do grupo.

---

### 7. Tipografia e empty states

- Todos os valores financeiros: `font-mono tabular-nums text-right` (já existe na maioria, garantir nos headers).
- Traços vazios (`—`): centralizar com `text-center text-muted-foreground/50 italic` (mais sutil que o atual).

---

### 8. Card elevado

Substituir o Card de resultados (L199) por:
```tsx
<Card className="shadow-md border-0 ring-1 ring-border/50 overflow-hidden">
```

O header de contagem (L207-211) ganha fundo mais definido: `bg-muted/50 border-b`.

---

### Resumo de mudanças

| Alteração | Linhas aprox. |
|-----------|--------------|
| Imports: +BookOpen, +Network | L11 |
| Header com linha de grupo (colSpan) | L215-231 |
| Zonas coloridas nos headers | L217-229 |
| NCM (EFD) → Badge com BookOpen | L243-253 |
| Descrição (XML) → Badge com FileSearch/Network | L259-278 |
| NCM (XML) divergente → Badge vermelho | L280-286 |
| Zonas coloridas no body (impostos) | L291-297 |
| Card elevado | L199 |
| Tipografia/empty states uniformizados | disperso |

Apenas `src/pages/equipe/dev/CorrecoesSped.tsx` será editado.

