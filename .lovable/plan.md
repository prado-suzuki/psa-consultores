

# Refinamentos visuais no Controle PERDCOMP

## Arquivo: `src/pages/equipe/dev/ControlePerdcomp.tsx`

### 1. Mover botao "+ Novo PER" para o card de Resultados

Remover o botao `handleNew` do `CardHeader` do card de filtros (linhas 704-707) e inseri-lo no `CardHeader` do card de Resultados (linhas 857-860), alinhado a direita na mesma linha do titulo:

```text
Antes:
  Card Filtros  -> [Filter] FILTROS DE BUSCA    [+ Novo PER]
  Card Resultados -> Resultados - PER

Depois:
  Card Filtros  -> [Filter] FILTROS DE BUSCA
  Card Resultados -> Resultados - PER            [+ Novo PER]
```

O `CardHeader` de Resultados passara a usar `flex items-center justify-between` com o titulo e o botao lado a lado.

### 2. Rebaixar hierarquia do botao "Limpar filtros"

Alterar de `bg-red-600 hover:bg-red-700 text-white` para `variant="outline"` com texto vermelho sutil:

```text
Antes:  <Button className="bg-red-600 ...">
Depois: <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50">
```

Isso mantem o "Buscar" (teal solido) como unica acao primaria do rodape.

### 3. Respiro visual no rodape de acoes

Adicionar `mt-6` a div do rodape que ja tem `pt-4 border-t`:

```text
Antes:  <div className="flex ... pt-4 border-t">
Depois: <div className="flex ... mt-6 pt-4 border-t">
```

### 4. Reforcar tipografia do cabecalho da tabela

Nas celulas `TableHead` dentro de `renderTable()`, aplicar classes de enfase:

```text
Antes:  <TableHead>Nº Documento</TableHead>
Depois: <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-700">Nº Documento</TableHead>
```

Aplicar a mesma classe em todas as colunas do `TableHeader` da tabela de PER (e DCOMP, se houver).

---

Sao alteracoes puramente de classes Tailwind e reorganizacao de JSX, sem mudanca de logica ou estado.

