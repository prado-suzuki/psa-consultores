

# Reestruturar filtros do Controle PERDCOMP seguindo padrao Gestao de Clientes

## Referencia visual

A pagina **Gestao de Clientes** sera o padrao a seguir. Ela usa:
- CardHeader com icone Filter + titulo "FILTROS DE BUSCA" (uppercase, tracking-wider) + botao de acao primaria a direita
- CardContent com grid de 12 colunas para inputs
- Rodape com botoes "Limpar filtros" e "Buscar" alinhados a direita, separados por `border-t`
- Dados carregam automaticamente (`searched` inicia como `true`)

## Mudancas no arquivo `src/pages/equipe/dev/ControlePerdcomp.tsx`

### 1. CardHeader com titulo e botao "Novo PER"

Adicionar CardHeader seguindo o padrao de GestaoClientes:

```text
+------------------------------------------------------------+
| [Filter icon] FILTROS DE BUSCA            [+ Novo PER]     |
+------------------------------------------------------------+
```

- Icone `Filter` (lucide) com cor `text-teal-600`
- Titulo em `uppercase text-sm tracking-wider font-bold text-slate-800`
- Botao "Novo PER" alinhado a direita com `bg-teal-600 hover:bg-teal-700 text-white`

### 2. Grid de inputs em 12 colunas

Todos os 5 campos organizados em um unico grid `grid-cols-12`:

```text
| Cliente (col-span-3)  | Contribuinte (col-span-3) | Situacao (col-span-2) | Exercicio (col-span-2) | N Processo (col-span-2) |
```

- Labels com `text-xs font-bold uppercase tracking-wider text-slate-700`
- SelectTrigger com `h-11 bg-white dark:bg-slate-800`
- Em mobile: cada campo ocupa `col-span-12` ou `col-span-6`

### 3. Rodape de acoes (Buscar + Limpar)

Abaixo do grid, uma div com `flex justify-end gap-3 pt-4 border-t`:

```text
                                    [Limpar filtros]  [Buscar]
```

- "Limpar filtros" aparece apenas quando ha filtros ativos, com `bg-red-600`
- "Buscar" com `bg-teal-600`, mostra spinner quando carregando

### 4. Busca automatica ao montar a pagina

- Alterar `useState(false)` para `useState(true)` no estado `searched`
- Remover o empty state de "Selecione os filtros e clique em Buscar" (ou mante-lo apenas para quando nao ha contribuinte selecionado)
- As queries ja ficam habilitadas desde o inicio, carregando dados do contribuinte selecionado (se houver)

### 5. Importar icone Filter

Adicionar `Filter` a lista de imports do lucide-react (ja existe `Search, Plus, X, Loader2`).

## Estrutura final do JSX

```text
<Card>
  <CardHeader>
    [Filter] FILTROS DE BUSCA                    [+ Novo PER]
  </CardHeader>
  <CardContent>
    <grid 12 colunas>
      Cliente(3) | Contribuinte(3) | Situacao(2) | Exercicio(2) | N Processo(2)
    </grid>
    <div border-t flex justify-end>
      [Limpar filtros]  [Buscar]
    </div>
  </CardContent>
</Card>

<Card>
  <CardHeader>
    Resultados - PER
  </CardHeader>
  <CardContent>
    tabela...
  </CardContent>
</Card>
```

Essa estrutura espelha exatamente o padrao usado em Gestao de Clientes, mantendo consistencia visual em todo o modulo Dev.

