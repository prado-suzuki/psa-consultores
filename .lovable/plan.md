

## Plano: Agrupar ferramentas em categorias no Hub

### Alterações em `src/pages/equipe/dev/DevDashboard.tsx`

**1. Estrutura de dados** — substituir o array flat `tools` por `toolGroups`:

```ts
interface ToolGroup {
  label: string;
  tools: ToolEntry[];
}

const toolGroups: ToolGroup[] = [
  {
    label: 'Consulta SPED',
    tools: [
      { name: 'EFD Contribuições', description: '...', path: '...', sopUrl: '...' },
      { name: 'EFD ICMS/IPI', ... },
      { name: 'ECD', ... },
      { name: 'ECF', ... },
    ],
  },
  {
    label: 'Levantamento de Créditos',
    tools: [
      { name: 'Mapa NCM (PIS/COFINS)', path: '/equipe/dev/mapa-ncm-pis-cofins' },
      { name: 'Apuração PIS/COFINS', path: '/equipe/dev/apuracao-pis-cofins' },
      { name: 'Auditoria Cruzada', path: '/equipe/dev/cruzamento-dados' },
      { name: 'Revisão de Registros', path: '/equipe/dev/correcoes-sped' },
    ],
  },
  {
    label: 'DIFAL Inteligente',
    tools: [
      { name: 'DIFAL Inteligente', description: 'Auditoria automatizada de DIFAL por NCM', ... },
    ],
  },
  {
    label: 'Outros',
    tools: [
      { name: 'Consulta de XMLs', ... },
      { name: 'Calculadora IBS/CBS', ... },
      { name: 'Controle PER/DCOMP', ... },
      { name: 'Controle de Balancetes', ... },
    ],
  },
];
```

Nota: **Gerenciar dados** removido do hub. **DIFAL Inteligente** fica como card de grupo proprio (mesmo com 1 ferramenta).

**2. Busca global** — filtrar ferramentas dentro de cada grupo pelo texto digitado; ocultar grupos sem correspondencia; badge no topo mostra total filtrado somando todos os grupos.

**3. Layout visual**:

```text
┌─ Consulta SPED ─────────────────────────────────┐
│  ┌──────────┐ ┌──────────┐ ┌─────┐ ┌─────┐     │
│  │EFD Contr.│ │EFD ICMS  │ │ ECD │ │ ECF │     │
│  └──────────┘ └──────────┘ └─────┘ └─────┘     │
└─────────────────────────────────────────────────┘
┌─ Levantamento de Créditos ──────────────────────┐
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────┐ │
│  │Mapa NCM  │ │Apuração  │ │Audit.Cruz│ │Rev.│ │
│  └──────────┘ └──────────┘ └──────────┘ └────┘ │
└─────────────────────────────────────────────────┘
┌─ DIFAL Inteligente ─────────────────────────────┐
│  ┌────────────────────┐                         │
│  │DIFAL Inteligente   │                         │
│  └────────────────────┘                         │
└─────────────────────────────────────────────────┘
┌─ Outros ────────────────────────────────────────┐
│  ┌────────┐ ┌──────────┐ ┌──────────┐ ┌──────┐ │
│  │XMLs    │ │IBS/CBS   │ │PERDCOMP  │ │Bal.  │ │
│  └────────┘ └──────────┘ └──────────┘ └──────┘ │
└─────────────────────────────────────────────────┘
```

Cada grupo e um `Card` com `CardHeader` (titulo + badge de contagem) e `CardContent` com grid responsivo (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`). Dentro do grid, cada ferramenta mantem o mini-card atual (nome, descricao, botao Acessar, link SOP).

**4. Mensagem vazia** — se a busca global nao encontrar nada em nenhum grupo, mostrar o placeholder "Nenhuma ferramenta encontrada".

