
## Plano: Padronização de Design das Ferramentas Dev

### Contexto do Problema

Após análise detalhada das quatro ferramentas da área de Dev, foram identificadas diversas inconsistências de design que afetam a coerência visual do sistema:

| Arquivo | Ferramenta |
|---------|------------|
| `ConsultaEFD.tsx` | Consulta EFD Contribuições (REFERÊNCIA) |
| `ConsultaEFDICMS.tsx` | Consulta EFD ICMS |
| `ConsultaXMLs.tsx` | Consulta de XMLs |
| `AuditoriaFiscal.tsx` | DIFAL Inteligente |

---

### Análise de Inconsistências Encontradas

#### 1. Título do Card de Filtros

| Ferramenta | Estilo Atual |
|------------|--------------|
| **ConsultaEFD** (ref) | `<CardTitle className="text-lg flex items-center gap-2 text-primary">` + `<span className="uppercase text-sm tracking-wider font-bold text-slate-800">Filtros de Busca</span>` |
| ConsultaEFDICMS | Igual à referência ✓ |
| ConsultaXMLs | `<CardTitle className="text-lg flex items-center gap-2">` + texto simples "Filtros" (sem uppercase, sem tracking) |
| AuditoriaFiscal | `<CardTitle className="text-base flex items-center gap-2">` + texto simples "Filtros de Busca" (font menor, sem estilização) |

#### 2. Labels dos Campos de Filtro

| Ferramenta | Estilo Atual |
|------------|--------------|
| **ConsultaEFD** (ref) | `text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider` |
| ConsultaEFDICMS | Igual à referência ✓ |
| ConsultaXMLs | `text-sm font-medium text-muted-foreground mb-2 block` (maior, sem uppercase, sem tracking, peso diferente) |
| AuditoriaFiscal | `text-xs font-medium text-slate-600 uppercase` (peso diferente: medium vs bold, espaçamento mb diferente) |

#### 3. Altura dos Select/Input

| Ferramenta | Estilo Atual |
|------------|--------------|
| **ConsultaEFD** (ref) | `h-11 bg-white dark:bg-slate-800` |
| ConsultaEFDICMS | Igual à referência ✓ |
| ConsultaXMLs | `h-9` (menor) |
| AuditoriaFiscal | Sem altura definida (padrão) |

#### 4. Ícone do Título do Card

| Ferramenta | Ícone | Cor |
|------------|-------|-----|
| **ConsultaEFD** (ref) | `Filter` | `text-primary` (via CardTitle) |
| ConsultaEFDICMS | `Filter` ✓ | `text-primary` ✓ |
| ConsultaXMLs | `Search` | Sem cor definida |
| AuditoriaFiscal | `Search` | `text-slate-500` |

#### 5. Botão "Buscar" / Botão Principal

| Ferramenta | Estilo Atual |
|------------|--------------|
| **ConsultaEFD** (ref) | `className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 active:translate-y-0"` |
| ConsultaEFDICMS | Igual à referência ✓ |
| ConsultaXMLs | `size="sm"` (menor, sem sombra, sem animação) |
| AuditoriaFiscal | `className="bg-teal-600 hover:bg-teal-700 gap-2"` (cor hardcoded, sem sombra, sem animação) |

#### 6. Botão "Limpar Filtros"

| Ferramenta | Estilo Atual |
|------------|--------------|
| **ConsultaEFD** (ref) | `variant="ghost"` + `className="text-slate-500 hover:text-red-600 hover:bg-red-50"` + Ícone `Eraser` |
| ConsultaEFDICMS | Igual à referência ✓ |
| ConsultaXMLs | `variant="ghost" size="sm"` + `className="text-muted-foreground hover:text-destructive"` (sem ícone) |
| AuditoriaFiscal | `variant="outline"` + Ícone `X` diferente |

#### 7. Header da Tabela de Resultados

| Ferramenta | Estilo Atual |
|------------|--------------|
| **ConsultaEFD** (ref) | `<th className="px-6 py-4 text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">` |
| ConsultaEFDICMS | Similar mas com diferenças pontuais |
| ConsultaXMLs | Usa componente `TableHead` do shadcn (estilo diferente) |
| AuditoriaFiscal | Usa componente `TableHead` + `TableRow className="bg-slate-50"` |

#### 8. Espaçamento do Grid de Filtros

| Ferramenta | Estilo Atual |
|------------|--------------|
| **ConsultaEFD** (ref) | `grid grid-cols-1 md:grid-cols-12 gap-6` |
| ConsultaEFDICMS | Igual ✓ |
| ConsultaXMLs | `flex flex-wrap gap-4 items-end` (layout diferente) |
| AuditoriaFiscal | `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` (breakpoints diferentes, gap menor) |

---

### Padrão a Ser Adotado (baseado em ConsultaEFD.tsx)

```text
┌─────────────────────────────────────────────────────────────────┐
│  Card de Filtros                                                │
├─────────────────────────────────────────────────────────────────┤
│  CardHeader: pb-4                                               │
│  CardTitle: text-lg flex items-center gap-2 text-primary        │
│    └─ Ícone: Filter (h-5 w-5)                                   │
│    └─ Span: uppercase text-sm tracking-wider font-bold          │
│            text-slate-800 dark:text-slate-200                   │
│                                                                 │
│  CardContent: space-y-4                                         │
│  Grid: grid-cols-1 md:grid-cols-12 gap-6                        │
│                                                                 │
│  Labels:                                                        │
│    block text-xs font-bold text-slate-700 dark:text-slate-300   │
│    mb-2 uppercase tracking-wider                                │
│                                                                 │
│  SelectTrigger:                                                 │
│    h-11 bg-white dark:bg-slate-800                              │
│                                                                 │
│  Barra de Ações:                                                │
│    flex justify-end gap-3 pt-4 border-t border-slate-200        │
│    dark:border-slate-700                                        │
│                                                                 │
│  Botão Limpar:                                                  │
│    variant="ghost"                                              │
│    className="text-slate-500 hover:text-red-600                 │
│              hover:bg-red-50 dark:hover:bg-red-900/20"          │
│    Ícone: Eraser (h-4 w-4 mr-2)                                 │
│                                                                 │
│  Botão Buscar:                                                  │
│    className="bg-primary hover:bg-primary/90 shadow-lg          │
│              shadow-primary/20 transition-transform             │
│              hover:-translate-y-0.5 active:translate-y-0"       │
│    Ícone: Search (h-4 w-4 mr-2)                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

### Arquivos a Modificar

#### 1. `src/pages/equipe/dev/ConsultaXMLs.tsx`

| Seção | Alteração |
|-------|-----------|
| CardHeader (linha ~655) | Adicionar `pb-4` |
| CardTitle (linha ~656-659) | Mudar para `text-lg flex items-center gap-2 text-primary` |
| Ícone do título | Manter `Search` mas adicionar cor via CardTitle ou trocar por `Filter` |
| Span do título | Adicionar `<span className="uppercase text-sm tracking-wider font-bold text-slate-800 dark:text-slate-200">Filtros de Busca</span>` |
| Labels (múltiplas) | Mudar de `text-sm font-medium text-muted-foreground mb-2 block` para `block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider` |
| SelectTrigger (múltiplos) | Mudar de `h-9` para `h-11 bg-white dark:bg-slate-800` |
| Input (múltiplos) | Mudar de `h-9` para `h-11` |
| Botão Limpar (~899-904) | Adicionar ícone `Eraser` e classe `text-slate-500 hover:text-red-600 hover:bg-red-50` |
| Botão Buscar (~936-943) | Adicionar classes de sombra e animação da referência |
| Grid layout (~663) | Considerar migrar para grid de 12 colunas (opcional - pode manter flex se funciona bem) |

#### 2. `src/pages/equipe/dev/AuditoriaFiscal.tsx`

| Seção | Alteração |
|-------|-----------|
| Card de filtros (linha ~702) | Manter `mb-6 border-slate-200 shadow-sm` |
| CardHeader (linha ~703) | Adicionar `pb-4` |
| CardTitle (linha ~704-707) | Mudar de `text-base` para `text-lg` + adicionar `text-primary` + wrapper span estilizado |
| Ícone do título | Trocar `Search` por `Filter` + remover `text-slate-500` |
| Labels (múltiplas ~713, 742, 770, 805) | Mudar de `text-xs font-medium text-slate-600 uppercase` para `block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider` |
| SelectTrigger (múltiplos) | Adicionar `h-11 bg-white dark:bg-slate-800` |
| Grid layout (~710) | Mudar de `grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4` para estrutura de 12 colunas ou manter com `gap-6` |
| Barra de ações (~840) | Adicionar `border-t border-slate-200 dark:border-slate-700` |
| Botão Limpar (~842-849) | Mudar `variant="outline"` para `variant="ghost"` + trocar `X` por `Eraser` + classes de hover |
| Botão Buscar (~850-857) | Mudar de `bg-teal-600 hover:bg-teal-700` para `bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 active:translate-y-0` |

---

### Resumo das Mudanças por Propriedade

| Propriedade | Valor Padronizado |
|-------------|-------------------|
| **CardTitle** | `text-lg flex items-center gap-2 text-primary` |
| **Título Texto** | `uppercase text-sm tracking-wider font-bold text-slate-800 dark:text-slate-200` |
| **Ícone Título** | `Filter` (h-5 w-5) |
| **Label** | `block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider` |
| **SelectTrigger** | `h-11 bg-white dark:bg-slate-800` |
| **Input** | `h-11` |
| **Grid Gap** | `gap-6` |
| **Botão Ghost (Limpar)** | `variant="ghost"` + `text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20` + ícone `Eraser` |
| **Botão Primary (Buscar)** | `bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 transition-transform hover:-translate-y-0.5 active:translate-y-0` |

---

### Observações Técnicas

- **ConsultaEFDICMS.tsx** já está alinhado com a referência e não precisa de alterações significativas
- As mudanças são puramente visuais/CSS e não afetam a lógica de negócio
- O uso de variáveis CSS (`bg-primary`) garante consistência com o tema
- Imports adicionais necessários: `Filter`, `Eraser` do lucide-react (onde não existirem)
