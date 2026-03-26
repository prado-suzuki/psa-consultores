

## Plano: Reorganizar aba Início do Dev Hub

### Alterações

**Arquivo 1: `src/components/equipe/dev/DevLayout.tsx`**
- Renomear label `"Dashboard"` para `"Início"` no `navItems` (L48)

**Arquivo 2: `src/pages/equipe/dev/DevDashboard.tsx`**
- Trocar título do `DevLayout` de `"Hub de Ferramentas"` para `"Início"`
- Reorganizar layout: ferramentas no topo, sessões em andamento embaixo
- Seção "Sessões em Andamento":
  - Card externo: trocar `border-amber-200 bg-amber-50/60` para `border-teal-200 bg-teal-50/60` (verde claro, tom da marca)
  - Título e descrição: fonte preta (`text-slate-900` / `text-slate-700`)
  - Cada card interno de ferramenta pendente: manter fundo amarelo (`bg-amber-50 border-amber-200`) para destacar o item em aberto
  - Ícone Clock interno: manter amarelo
  - Manter botão "Retomar"

