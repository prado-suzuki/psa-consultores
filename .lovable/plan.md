
# Plano: Aprimoramento do Modal de Classificação DIFAL

## Resumo

Implementar duas melhorias na ferramenta DIFAL Inteligente:
1. **Status imediato**: Alterar a coluna Status para "Validado" imediatamente após salvar uma decisão no modal (sem esperar sincronização com API)
2. **Novo layout do modal**: Expandir para tela cheia (mesmo tamanho do EFDAnalysisModal) e remover os botões de exceção

---

## Arquivos a Modificar

### 1. `src/pages/equipe/dev/AuditoriaFiscal.tsx`

**Alteração**: Adicionar estado local para rastrear decisões feitas na sessão atual

```text
// Novo estado para armazenar NCMs já decididos na sessão
const [localDecisions, setLocalDecisions] = useState<Set<string>>(new Set());
```

**Alteração**: Modificar o callback `handleDecisionSaved` para receber o item decidido

```text
const handleDecisionSaved = (item: DifalItem) => {
  setPendingDecisionsCount(prev => prev + 1);
  // Adicionar ao set de decisões locais
  setLocalDecisions(prev => new Set(prev).add(`${item.id_contribuinte}|${item.cod_produto}|${item.cod_ncm}`));
};
```

**Alteração**: Atualizar o merge `itemsWithStatus` para considerar decisões locais

```text
const itemsWithStatus: DifalItem[] = useMemo(() => {
  if (!classificacoes) return flatItems.map(item => {
    const chave = `${item.id_contribuinte}|${item.cod_produto}|${item.cod_ncm}`;
    // Se está nas decisões locais, marcar como validado
    if (localDecisions.has(chave)) {
      return { ...item, status: 'validado' };
    }
    return { ...item, status: 'pendente' };
  });

  return flatItems.map((item) => {
    const chave = `${item.id_contribuinte}|${item.cod_produto}|${item.cod_ncm}`;
    const classificacao = classificacoes[chave];
    // Priorizar decisões locais
    if (localDecisions.has(chave)) {
      return { ...item, status: 'validado', classificacao };
    }
    return {
      ...item,
      status: classificacao ? 'validado' : 'pendente',
      classificacao,
    };
  });
}, [flatItems, classificacoes, localDecisions]);
```

**Alteração**: Atualizar a chamada do modal para passar callback correto

```text
<DifalAuditModal
  ...
  onDecisionSaved={handleDecisionSaved}
/>
```

**Alteração**: Limpar decisões locais após sincronização bem-sucedida

```text
// Dentro de handleSaveChanges, após sucesso:
setLocalDecisions(new Set());
```

---

### 2. `src/components/equipe/dev/DifalAuditModal.tsx`

**Alteração principal**: Refatorar completamente o layout para tela cheia

**Props**: Alterar assinatura do callback para receber o item

```text
interface DifalAuditModalProps {
  ...
  onDecisionSaved: (item: DifalItem) => void; // Agora recebe o item
}
```

**DialogContent**: Expandir para tela cheia igual EFDAnalysisModal

```text
<DialogContent 
  className={cn(
    "max-w-none w-[calc(100vw-3rem)] h-[calc(100vh-3rem)] p-0",
    "flex flex-col overflow-hidden",
    "[&>button]:hidden"
  )}
>
```

**Header**: Estilo similar ao EFDAnalysisModal

```text
<div className="h-20 flex items-center justify-between px-6 border-b border-slate-200 bg-white/95 backdrop-blur flex-shrink-0">
  <div className="flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 shadow-sm">
      <Scale className="w-7 h-7" />
    </div>
    <div>
      <h3 className="text-xl font-bold text-slate-900">Classificar Item</h3>
      <p className="text-sm text-slate-500 mt-0.5">NCM: {item?.cod_ncm}</p>
    </div>
  </div>
  <Button ... (fechar) />
</div>
```

**Body**: Layout de duas colunas (50/50) com altura total

```text
<div className="flex-1 flex overflow-hidden">
  {/* Coluna Esquerda: Dados do Produto */}
  <div className="w-1/2 border-r border-slate-200 p-6 overflow-y-auto bg-slate-50/30">
    <Card com dados do produto (expandido)>
  </div>
  
  {/* Coluna Direita: Regras Disponíveis */}
  <div className="w-1/2 p-6 overflow-y-auto flex flex-col">
    <Regras (sem seção de exceções)>
  </div>
</div>
```

**Remoções**:
- Remover todo o bloco `{/* Botões de exceção */}` (linhas 333-370)
- Remover imports não utilizados: `XCircle`, `Ban` (usados apenas nos botões de exceção)

**Footer**: Manter no mesmo estilo mas integrado ao layout

```text
<div className="h-16 px-6 border-t border-slate-200 bg-white flex items-center justify-end gap-3 flex-shrink-0">
  <Button variant="outline" onClick={() => onOpenChange(false)}>
    Cancelar
  </Button>
  <Button 
    onClick={() => handleSaveDecision('REGRA_SELECIONADA', selectedRegraId)}
    disabled={!selectedRegraId || isSaving}
    className="bg-teal-600 hover:bg-teal-700"
  >
    ...
  </Button>
</div>
```

**Callback**: Passar o item ao chamar `onDecisionSaved`

```text
// Dentro de handleSaveDecision, após sucesso:
onDecisionSaved(item!); // Passa o item decidido
```

---

## Fluxo Visual

```text
ANTES:
┌─────────────────────────────────────┐
│  Modal pequeno (max-w-4xl)          │
│  ┌─────────────┬─────────────┐      │
│  │ Dados XML   │ Regras      │      │
│  │             │             │      │
│  │             │ ─────────── │      │
│  │             │ Exceções:   │      │
│  │             │ [Sem ST]    │      │
│  │             │ [Isento]    │      │
│  │             │ [N/A]       │      │
│  └─────────────┴─────────────┘      │
│  [Cancelar]         [Salvar]        │
└─────────────────────────────────────┘

DEPOIS:
┌──────────────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ ⚖️ Classificar Item                               [X]      │   │
│ │    NCM: 12345678                                           │   │
│ └────────────────────────────────────────────────────────────┘   │
│ ┌─────────────────────────┬──────────────────────────────────┐   │
│ │                         │                                  │   │
│ │   DADOS DO PRODUTO      │      REGRAS DISPONÍVEIS          │   │
│ │                         │                                  │   │
│ │   ┌─────────────────┐   │   ┌──────────────────────────┐   │   │
│ │   │ Produto: ...    │   │   │ [Regra 1] 18% ✓         │   │   │
│ │   │ Código: ...     │   │   └──────────────────────────┘   │   │
│ │   │ NCM: ...        │   │   ┌──────────────────────────┐   │   │
│ │   │ CFOP: ...       │   │   │ [Regra 2] 12%           │   │   │
│ │   │ Valor: R$...    │   │   └──────────────────────────┘   │   │
│ │   │ UF: SP → MT     │   │                                  │   │
│ │   │ CST: ... | 18%  │   │                                  │   │
│ │   └─────────────────┘   │                                  │   │
│ │                         │                                  │   │
│ └─────────────────────────┴──────────────────────────────────┘   │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │                          [Cancelar]  [Salvar Decisão]      │   │
│ └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Tipo de Decisão

Com a remoção dos botões de exceção, o modal agora só suporta `REGRA_SELECIONADA`. Se no futuro for necessário reativar exceções, basta restaurar o bloco removido.

### Responsividade

O layout de duas colunas usa `w-1/2` para cada lado. Em telas menores, pode ser necessário ajustar, mas como é uma ferramenta interna desktop-first, o layout fixo é aceitável.

### Consistência Visual

O novo modal seguirá exatamente o padrão do `EFDAnalysisModal`:
- Header com altura `h-20` e ícone em container arredondado
- Divisória com `border-slate-200`
- Botão de fechar com hover vermelho
- Footer com altura `h-16`

---

## Ordem de Implementação

1. Modificar `DifalAuditModal.tsx`:
   - Alterar layout para tela cheia
   - Remover seção de exceções
   - Atualizar assinatura do callback

2. Modificar `AuditoriaFiscal.tsx`:
   - Adicionar estado `localDecisions`
   - Atualizar `handleDecisionSaved`
   - Modificar useMemo de `itemsWithStatus`
   - Limpar decisões locais após sync
