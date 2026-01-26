
# Plano: Melhorias na Consulta de EFD Contribuições

## Resumo das Alterações

### 1. Melhorar Visualização do Registro

**Problema atual:** O painel lateral e o título da tabela mostram apenas "REG 0111" de forma simples.

**Solução:**
- No **painel lateral** (`EFDBlockTree.tsx`): Manter o código do registro com badge destacado e descrição truncada
- No **título da tabela** (`EFDAnalysisModal.tsx`): Exibir o código do registro em um badge maior e mais destacado, com a descrição completa ao lado

### 2. Renomear Ferramenta

**Arquivos afetados:**
- `src/components/equipe/dev/DevLayout.tsx` - Linha 40: Alterar label de "Consulta EFD" para "EFD Contribuições"
- `src/pages/equipe/dev/ConsultaEFD.tsx` - Linha 350: Título já está "Consulta EFD Contribuições" (correto)

### 3. Corrigir Botões de Fechar Duplicados

**Problema:** O `DialogContent` do shadcn/ui adiciona automaticamente um botão X, e existe outro X customizado no header do modal.

**Solução:** Remover o X padrão do Dialog usando a classe CSS para ocultá-lo, mantendo apenas o botão customizado no header.

### 4. Auto-carregar Contribuinte Único

**Lógica:**
```typescript
useEffect(() => {
  // Quando cliente é selecionado e tem apenas 1 contribuinte,
  // auto-selecionar esse contribuinte
  if (selectedCliente && contribuintes?.length === 1) {
    setSelectedContribuinte(contribuintes[0].id);
  }
}, [selectedCliente, contribuintes]);
```

### 5. Definir Datas Padrão

**Lógica:**
```typescript
// Data de início: 5 anos atrás (mês atual)
const fiveYearsAgo = new Date();
fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);

const [mesInicio, setMesInicio] = useState<{ month: number; year: number } | null>({
  month: fiveYearsAgo.getMonth(),
  year: fiveYearsAgo.getFullYear(),
});

// Data fim: mês atual
const [mesFim, setMesFim] = useState<{ month: number; year: number } | null>({
  month: new Date().getMonth(),
  year: new Date().getFullYear(),
});
```

---

## Alterações por Arquivo

### Arquivo: `src/components/equipe/dev/DevLayout.tsx`

| Linha | Alteração |
|-------|-----------|
| 40 | Mudar label de `'Consulta EFD'` para `'EFD Contribuições'` |

### Arquivo: `src/components/equipe/dev/EFDAnalysisModal.tsx`

| Linha | Alteração |
|-------|-----------|
| 105-110 | Adicionar classe `[&>button]:hidden` no DialogContent para ocultar o X padrão |
| 181-186 | Melhorar visualização do registro com badge maior e mais destacado |

### Arquivo: `src/pages/equipe/dev/ConsultaEFD.tsx`

| Linha | Alteração |
|-------|-----------|
| 46-47 | Inicializar `mesInicio` com data de 5 anos atrás e `mesFim` com mês atual |
| Após linha 81 | Adicionar `useEffect` para auto-selecionar contribuinte quando houver apenas um |

---

## Detalhes Técnicos

### Visualização do Registro no Header da Tabela

**Antes:**
```tsx
<span className="bg-primary/10 text-primary text-xs font-mono font-bold px-3 py-1.5 rounded-md border border-primary/20">
  REG {regCode}
</span>
<h4 className="text-base font-bold text-slate-800 dark:text-white">
  {regDescription}
</h4>
```

**Depois:**
```tsx
<Badge className="bg-primary text-white text-sm font-mono font-bold px-3 py-1.5">
  REG {regCode}
</Badge>
<h4 className="text-lg font-bold text-slate-800 dark:text-white">
  {regDescription}
</h4>
```

### Ocultar X Padrão do Dialog

```tsx
<DialogContent 
  className={cn(
    "max-w-none w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] p-0",
    "flex flex-col overflow-hidden",
    "[&>button]:hidden" // Oculta o botão X padrão do shadcn
  )}
>
```

### Auto-seleção de Contribuinte

```typescript
// Auto-selecionar contribuinte quando cliente tem apenas um
useEffect(() => {
  if (selectedCliente && contribuintes && contribuintes.length === 1 && !selectedContribuinte) {
    setSelectedContribuinte(contribuintes[0].id);
  }
}, [selectedCliente, contribuintes, selectedContribuinte]);
```

### Datas Padrão (5 anos atrás até hoje)

```typescript
// Calcular datas padrão
const getDefaultDates = () => {
  const now = new Date();
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(now.getFullYear() - 5);
  
  return {
    inicio: { month: fiveYearsAgo.getMonth(), year: fiveYearsAgo.getFullYear() },
    fim: { month: now.getMonth(), year: now.getFullYear() },
  };
};

const defaultDates = getDefaultDates();

// Estados com valores padrão
const [mesInicio, setMesInicio] = useState<{ month: number; year: number } | null>(defaultDates.inicio);
const [mesFim, setMesFim] = useState<{ month: number; year: number } | null>(defaultDates.fim);
```

---

## Resultado Esperado

1. **Nome da ferramenta:** "EFD Contribuições" no menu lateral (compacto e legível)
2. **Registro no modal:** Badge grande e destacado com código + descrição completa
3. **Apenas um botão X:** O X customizado no canto superior direito do header
4. **Contribuinte auto-selecionado:** Quando o cliente tem apenas um contribuinte cadastrado
5. **Datas padrão:** Jan/2021 a Jan/2026 (exemplo para data atual de Jan/2026)
