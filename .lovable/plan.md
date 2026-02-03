

# Plano: Design Moderno para Tabelas - Abordagem Limpa

## Objetivo

Melhorar a diferenciação entre colunas e linhas de forma moderna e sutil, **sem usar bordas verticais** que deixam o visual pesado. A proposta segue tendências de UI contemporâneas usadas em produtos como Notion, Linear e Airtable.

---

## Técnicas Modernas Propostas

### 1. Zebra Striping Sutil
Linhas alternadas com fundo levemente diferente para facilitar a leitura horizontal.

### 2. Padding e Espaçamento
Espaçamento interno generoso nas células cria separação visual natural entre colunas.

### 3. Tipografia Diferenciada
- Header em **uppercase**, menor, com tracking largo e cor mais escura
- Células com peso e cor diferentes conforme importância do dado

### 4. Hover com Destaque
Linha inteira ganha destaque suave ao passar o mouse, reforçando a percepção de linha.

### 5. Primeira Coluna com Destaque
A coluna principal (nome) recebe peso visual maior, criando âncora para os olhos.

### 6. Fundo do Header Diferenciado
Header com fundo `slate-50` e borda inferior mais marcada (`border-b-2`).

---

## Comparação Visual

```text
ATUAL:
┌────────────────────────────────────────────────────────────────┐
│ Nome Cliente     Status    Tipo Cliente    Telefone    Setor  │
├────────────────────────────────────────────────────────────────┤
│ Fazenda Boa...   Ativo     Fixo           (11) 99...   Agro   │
├────────────────────────────────────────────────────────────────┤
│ Cooperativa...   Inativo   Pontual        (21) 88...   Coop   │
└────────────────────────────────────────────────────────────────┘

PROPOSTO (moderno/limpo):
┌────────────────────────────────────────────────────────────────┐
│ NOME CLIENTE     STATUS    TIPO CLIENTE   TELEFONE     SETOR  │  ← Header uppercase, bg-slate-50, border-b-2
├────────────────────────────────────────────────────────────────┤
│ Fazenda Boa...   ● Ativo   Fixo           (11) 99...   Agro   │  ← Fundo branco
│ Cooperativa...   ○ Inativo Pontual        (21) 88...   Coop   │  ← Fundo slate-50/50 (zebra)
│ Empresa XYZ...   ● Ativo   Fixo           (31) 77...   Tech   │  ← Fundo branco
└────────────────────────────────────────────────────────────────┘
```

---

## Mudanças CSS Específicas

### Container da Tabela
```tsx
<div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
```
- Bordas arredondadas mais pronunciadas (`rounded-xl`)
- Sombra sutil para elevação

### Header
```tsx
<TableHeader className="bg-slate-50">
  <TableRow className="hover:bg-slate-50 border-b-2 border-slate-200">
    <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">
      ...
    </TableHead>
  </TableRow>
</TableHeader>
```
- Fundo `bg-slate-50` destaca do body
- `border-b-2` cria separação clara
- Texto em `uppercase` + `tracking-wider` + `text-xs` = visual profissional

### Body com Zebra Striping
```tsx
<TableBody className="divide-y divide-slate-100">
  {data.map((row, index) => (
    <TableRow 
      className={cn(
        "transition-colors cursor-pointer",
        "hover:bg-teal-50/60",
        index % 2 === 1 && "bg-slate-50/50"
      )}
    >
      ...
    </TableRow>
  ))}
</TableBody>
```
- `divide-y divide-slate-100` para linhas sutis
- Linhas ímpares com `bg-slate-50/50`
- Hover em `teal-50/60` mantém identidade da marca

### Células
```tsx
// Primeira coluna (Nome) - âncora visual
<TableCell className="px-4 py-3 font-medium text-slate-900">
  {row.nome}
</TableCell>

// Colunas secundárias - mais leves
<TableCell className="px-4 py-3 text-slate-600">
  {row.valor}
</TableCell>

// Coluna numérica/código - fonte mono
<TableCell className="px-4 py-3 text-slate-600 font-mono text-sm">
  {row.cpf_cnpj}
</TableCell>
```
- Padding `px-4 py-3` cria espaço entre colunas naturalmente
- Primeira coluna em `font-medium text-slate-900` = destaque
- Demais colunas em `text-slate-600` = hierarquia clara
- Números/códigos em `font-mono` = alinhamento visual

---

## Arquivos a Modificar

| Arquivo | Mudanças |
|---------|----------|
| `src/pages/equipe/dev/GestaoClientes.tsx` | Aplicar novos estilos às tabelas principal e do modal |

---

## Detalhes da Implementação

### Tabela Principal (Clientes)
```tsx
<div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
  <Table>
    <TableHeader className="bg-slate-50">
      <TableRow className="hover:bg-slate-50 border-b-2 border-slate-200">
        <TableHead className="text-xs font-semibold uppercase tracking-wider text-slate-600 h-12 px-4">
          Nome Cliente
        </TableHead>
        {/* ... outras colunas ... */}
      </TableRow>
    </TableHeader>
    <TableBody className="divide-y divide-slate-100">
      {paginatedResults.map((row, index) => (
        <TableRow 
          key={row.id}
          className={cn(
            "cursor-pointer transition-colors hover:bg-teal-50/60",
            index % 2 === 1 && "bg-slate-50/50"
          )}
          onClick={() => handleClienteClick({ id: row.id, nome: row.nome })}
        >
          <TableCell className="px-4 py-3.5 font-medium text-slate-900">
            {row.nome || '-'}
          </TableCell>
          <TableCell className="px-4 py-3.5 text-slate-600">
            {formatStatus(row.ativo)}
          </TableCell>
          {/* ... outras células ... */}
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

### Tabela do Modal (Contribuintes)
Aplicar o mesmo padrão, com ajustes para a coluna CPF/CNPJ usar `font-mono`.

---

## Benefícios

| Aspecto | Melhoria |
|---------|----------|
| **Legibilidade** | Zebra striping facilita seguir linhas longas |
| **Hierarquia** | Header diferenciado + primeira coluna em destaque |
| **Modernidade** | Visual limpo sem bordas pesadas |
| **Interatividade** | Hover em teal reforça clicabilidade |
| **Consistência** | Segue design system já estabelecido (teal/slate) |
| **Espaçamento** | Padding generoso cria separação natural entre colunas |

---

## Sem Alteração no Componente Base

Esta abordagem **não requer modificar** o `src/components/ui/table.tsx`. Todas as customizações são feitas via className inline, mantendo o componente base reutilizável para outros contextos.

