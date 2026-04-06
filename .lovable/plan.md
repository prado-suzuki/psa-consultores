

## Redesign do Modal de Detalhes + Refinamento estético do NCM (Revisado)

### Correção principal vs plano anterior
A lógica de validação NCM (`ncmMatch`, `ncmDivergent`, `efdNcm`) é **mantida intacta**. Apenas os estilos visuais são refinados para usar variantes do shadcn/ui em vez de classes de cor hardcoded.

---

### Arquivos alterados: 2

#### 1. `src/pages/equipe/dev/CorrecoesSped.tsx` — Modal de Detalhes

**Bloco 1 — "Registro EFD Original"** (linhas 304-323):
- Envolver o conteúdo existente em `<div className="bg-muted/30 border rounded-lg p-4 space-y-3">`
- Adicionar título `<h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registro EFD Original</h4>`
- Mover descrição e valor (hoje no `DialogDescription`) para dentro deste bloco: descrição em `text-sm font-medium`, valor em `text-base font-mono font-semibold`
- Manter o grid 2x2 de impostos (CST/Alíq) como está

**Bloco 2 — "Itens XML (NFe)"** (linhas 325-367):
- Substituir o texto "— N itens" por `<Badge variant="secondary" className="ml-2">{count}</Badge>` ao lado do título
- Manter tooltip existente
- Cards já estão com `border rounded-lg p-3` — manter
- **NCM — MANTER lógica `ncmMatch`/`efdNcm` intacta** (linhas 339-340)
- Apenas trocar estilos do Badge (linha 358-360):
  - `ncmMatch === true` → `<Badge variant="secondary" className="text-[10px]">OK</Badge>`
  - `ncmMatch === false` → `<Badge variant="destructive" className="text-[10px]">Divergente</Badge>`
- Remover classes hardcoded `bg-emerald-100 text-emerald-700` / `bg-red-100 text-red-700`

#### 2. `src/components/equipe/dev/correcoes-sped/TabC170.tsx` — Coluna NCM XML

- **MANTER** variável `ncmDivergent` (linha 412) e toda a condicional (linhas 506-514)
- Apenas trocar o estilo do Badge divergente (linhas 507-510):
  - De: `variant="outline" className="... border-red-200 text-red-600 bg-red-50/50 ..."`
  - Para: `variant="destructive" className="font-mono text-[11px] gap-1"`
- Manter `<AlertCircle>` dentro do Badge divergente
- Manter o branch não-divergente (`<code>`) como está

**Total: 2 arquivos, ~10 linhas de estilo alteradas. Zero lógica de negócio removida.**

