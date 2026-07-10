# Plano — Seletor global de cliente do MAPA com paridade visual ao OSG Work

> **Para o executor (Sonnet 4.6):** este plano é autocontido. Siga as etapas na ordem.
> Todo o código necessário está nos blocos abaixo — adapte apenas se o arquivo real
> divergir do trecho citado. Não introduza Tailwind nos componentes do MAPA: o padrão
> do módulo é CSS puro em `src/pages/equipe/mapa/mapa.css`, escopado em `.app-root`.

---

## 1. Objetivo

O OSG Work possui uma **barra global de seleção de cliente** (`OsgWorkClienteBar` em
`src/components/equipe/osg/OsgLayout.tsx:31-96`) renderizada em largura total logo
abaixo do header, com dois estados visuais (com/sem cliente), animação de pulso e
paleta tonal da área (marrom `osg-*`).

No MAPA (Digital), o seletor equivalente (`HeaderClusterSelect` em
`src/components/equipe/mapa/Layout.tsx:59-75`) é um `<Select compact>` de 200px
espremido no canto direito do header — sem rótulo, sem ícone, sem estados, quase
invisível.

**Meta:** replicar no MAPA a anatomia, os estados, as animações e a hierarquia visual
da barra do OSG Work, usando a **cor base do MAPA (teal `#0d9488`)** no lugar do
marrom OSG.

---

## 2. Decisões já tomadas (não reabrir)

1. **Posição:** a barra sai do header e vira uma faixa de largura total **entre o
   `<header>` e o `.content-body`**, igual ao OSG. Como o scroll do MAPA é interno ao
   `.content-body`, a barra fica sempre visível sem precisar de `sticky`.
2. **Rótulo:** "**Cliente**" (terminologia do usuário; internamente a entidade continua
   sendo `cluster` — não renomear hooks, contexto nem rotas). As opções do select
   continuam vindo de `useClusterFiltroOpcoes()` sem alteração.
3. **Semântica do estado "vazio":** no OSG, sem cliente as ferramentas ficam bloqueadas;
   no MAPA, `cluster === ''` significa "Todos os clusters" e as páginas continuam
   funcionando. Por isso o estado de atenção (pulso + borda destacada) é mantido, mas o
   texto de apoio é adaptado: *"Selecione um cliente para filtrar as páginas"* em vez
   de *"…para usar as ferramentas"*.
4. **Componente `Select` do MAPA** (`src/components/equipe/mapa/Select.tsx`): **não
   alterar a lógica**. Toda a variação visual é feita por CSS descendente a partir do
   wrapper `.cluster-bar`.

---

## 3. Anatomia do design de referência (OSG Work)

Estrutura do `OsgWorkClienteBar` e o que cada parte faz:

| Parte | Implementação OSG (Tailwind) | Comportamento |
|---|---|---|
| **Barra** | `border-b px-6 py-3 transition-colors` + `bg-osg-50` (sem cliente) / `bg-osg-50/40` (com cliente) | Fundo fica mais saturado quando falta cliente; transição suave de cor entre estados |
| **Badge do ícone** | `h-8 w-8 rounded-lg` + `bg-osg-500 text-white animate-pulse` (sem cliente) / `bg-osg-100 text-osg-700` (com cliente) | Ícone `Building2`; **pulsa em opacidade** (animate-pulse = opacidade 1 → 0.5 → 1, 2s, infinito) enquanto não há cliente |
| **Rótulo** | `text-sm font-bold text-osg-700 uppercase tracking-wide` — "Cliente" | Sempre visível, caixa alta |
| **Select** | `h-10 font-medium`, fundo branco; sem cliente: `border-2 border-osg-300 ring-2 ring-osg-100`; com cliente: `border-osg-200` | Borda dupla + anel chamam atenção quando vazio |
| **Texto de apoio (vazio)** | `text-xs font-medium text-osg-700` + ícone `AlertCircle` | "Selecione um cliente para usar as ferramentas" |
| **Texto de apoio (preenchido)** | `text-xs text-slate-600 truncate` | "Trabalhando em: **{nome}**" |
| **Responsivo** | `flex flex-col md:flex-row md:items-center gap-2 md:gap-4`; select em `flex-1 max-w-md` (448px) | Empilha verticalmente abaixo de 768px |

Paleta OSG (HSL em `src/index.css:57-64`): rampa tonal marrom de `osg-50` (fundo
quase branco) a `osg-700` (texto escuro), com `osg-500` como cor cheia do badge.

---

## 4. Mapeamento de cores OSG → MAPA (teal)

A cor base do MAPA é `--accent-color: #0d9488` (= Tailwind `teal-600`), definida em
`mapa.css` no bloco `.app-root`. Mapear a rampa OSG para a rampa teal do Tailwind:

| Papel no design | OSG | MAPA (novo token) | Hex |
|---|---|---|---|
| Fundo da barra (atenção) | `osg-50` | `--accent-50` | `#f0fdfa` |
| Fundo da barra (calmo, 40–45% alpha) | `osg-50/40` | `rgba(240,253,250,0.45)` | — |
| Borda da barra / anel do select / badge calmo | `osg-100` | `--accent-100` | `#ccfbf1` |
| Borda do select (calmo) | `osg-200` | `--accent-200` | `#99f6e4` |
| Borda do select (atenção, 2px) | `osg-300` | `--accent-400` | `#2dd4bf` |
| Badge cheio (atenção) | `osg-500` | `--accent-color` (existente) | `#0d9488` |
| Rótulo / ícone calmo | `osg-700` | `--accent-700` | `#0f766e` |
| Texto de apoio (atenção) | `osg-700` | `--accent-800` | `#115e59` |

> Nota: a rampa teal é mais clara/saturada que a marrom; por isso a borda de atenção
> usa `teal-400` (e não `teal-300`) para manter contraste equivalente ao OSG.

---

## 5. Implementação — passo a passo

### Etapa 1 — Tokens de cor em `mapa.css`

No bloco `.app-root` (que começa em `mapa.css:5`), logo após
`--accent-green: #8bc63f;` (linha 14), adicionar:

```css
  /* Rampa tonal do accent (teal Tailwind) — barra global de cliente */
  --accent-50:  #f0fdfa;
  --accent-100: #ccfbf1;
  --accent-200: #99f6e4;
  --accent-400: #2dd4bf;
  --accent-700: #0f766e;
  --accent-800: #115e59;
```

### Etapa 2 — Novo componente `ClusterBar`

Criar `src/components/equipe/mapa/ClusterBar.tsx`:

```tsx
import { useClusterGlobal } from '@/hooks/useClusterGlobal';
import { useClusterFiltroOpcoes } from '@/hooks/useClusters';
import Select from './Select';

/** Barra global de seleção de cliente — paridade visual com a OsgWorkClienteBar.
 *  '' = "Todos os clusters": as páginas funcionam, mas a barra entra em estado de
 *  atenção (pulso + borda destacada) para induzir a seleção de um cliente. */
export default function ClusterBar() {
  const { cluster, setCluster } = useClusterGlobal();
  const opcoes = useClusterFiltroOpcoes();
  const semCluster = !cluster;
  const selecionado = opcoes.find((o) => o.value === cluster);

  return (
    <div className={`cluster-bar${semCluster ? ' sem-cluster' : ''}`}>
      <div className="cluster-bar-id">
        <span className="cluster-bar-icon" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            <path d="M10 6h4" /><path d="M10 10h4" /><path d="M10 14h4" /><path d="M10 18h4" />
          </svg>
        </span>
        <span className="cluster-bar-label">Cliente</span>
      </div>
      <div className="cluster-bar-select">
        <Select
          id="cluster-global"
          value={cluster}
          onChange={setCluster}
          options={opcoes}
          ariaLabel="Filtrar todas as páginas por cliente"
        />
      </div>
      {semCluster ? (
        <div className="cluster-bar-hint">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>Selecione um cliente para filtrar as páginas</span>
        </div>
      ) : (
        <div className="cluster-bar-working" key={cluster}>
          Trabalhando em: <strong>{selecionado?.label}</strong>
        </div>
      )}
    </div>
  );
}
```

Detalhes intencionais:
- O ícone é o `building-2` (mesmo desenho do `Building2` do lucide usado no OSG),
  inline SVG porque é o padrão do módulo MAPA (ver `icons` em `Layout.tsx:10-21`).
- O `key={cluster}` no texto "Trabalhando em" remonta o nó a cada troca de cliente,
  re-disparando a animação de entrada (Etapa 4).
- O `Select` é usado **sem** `compact` (altura cheia `--ctrl-h`, como o `h-10` do OSG)
  e **sem** `style={{ minWidth: 200 }}` — a largura vem do CSS (`flex:1; max-width`).

### Etapa 3 — Reposicionar no `Layout.tsx`

Em `src/components/equipe/mapa/Layout.tsx`:

1. **Remover** a função `HeaderClusterSelect` (linhas 58–75) e os imports que só ela
   usava: `useClusterGlobal`, `useClusterFiltroOpcoes` e `Select`.
2. **Importar** o novo componente: `import ClusterBar from './ClusterBar';`
3. No JSX, **remover** `<HeaderClusterSelect />` de dentro de `.header-right` e
   **inserir** `<ClusterBar />` entre o `</header>` e o `<main className="content-body">`:

```tsx
      <div className="main-content">
        <header>
          <div className="page-title">{pageTitle}</div>
          <div className="header-right">
            <div className="header-status">
              <span className="status-dot" aria-hidden="true" />
              Status: <span className="status-label">Online</span>
            </div>
          </div>
        </header>
        <ClusterBar />
        <main className="content-body">
          <Outlet />
        </main>
      </div>
```

### Etapa 4 — CSS da barra em `mapa.css`

Adicionar um bloco novo (sugestão: junto à seção
`/* ---------- Header top com indicador "Status: Online" ---------- */`, ~linha 2496),
e **remover** a regra órfã `.main-content header .header-cluster` (linhas 2502–2505):

```css
/* ---------- Barra global de cliente (paridade visual OSG Work) ---------- */
.app-root .cluster-bar{
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 30px;
  background: rgba(240, 253, 250, 0.45);   /* accent-50 a 45% — estado calmo */
  border-bottom: 1px solid var(--accent-100);
  transition: background 0.3s ease, border-color 0.3s ease;
}
.app-root .cluster-bar.sem-cluster{
  background: var(--accent-50);
}

/* Identidade: badge + rótulo */
.cluster-bar-id{
  display: inline-flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.cluster-bar-icon{
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--accent-100);
  color: var(--accent-700);
  transition: background 0.3s ease, color 0.3s ease;
}
.cluster-bar.sem-cluster .cluster-bar-icon{
  background: var(--accent-color);
  color: #fff;
  animation: cluster-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
.cluster-bar-label{
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--accent-700);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

/* Select — estados calmo/atenção sobre o custom-select existente */
.cluster-bar-select{
  flex: 1;
  max-width: 448px;   /* max-w-md, como no OSG */
}
.cluster-bar-select .custom-select-trigger{
  background: #fff;
  font-weight: 500;
  border-color: var(--accent-200);
}
.cluster-bar.sem-cluster .cluster-bar-select .custom-select-trigger{
  border: 2px solid var(--accent-400);
  box-shadow: 0 0 0 2px var(--accent-100);   /* ring-2 ring-accent-100 */
}
/* foco/aberto continuam herdando o estilo accent global do .custom-select-trigger */

/* Texto de apoio */
.cluster-bar-hint{
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--accent-800);
}
.cluster-bar-working{
  font-size: 0.78rem;
  color: var(--on-surface-variant);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  animation: cluster-fade-in 0.3s ease;
}
.cluster-bar-working strong{
  color: var(--on-surface);
  font-weight: 600;
}

/* Animações */
@keyframes cluster-pulse{          /* equivalente ao animate-pulse do Tailwind */
  0%, 100%{ opacity: 1; }
  50%{ opacity: 0.55; }
}
@keyframes cluster-fade-in{
  from{ opacity: 0; transform: translateY(2px); }
  to{ opacity: 1; transform: none; }
}

/* Responsivo — empilha como o flex-col do OSG abaixo de 768px */
@media (max-width: 768px){
  .app-root .cluster-bar{
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
    padding: 10px 16px;
  }
  .cluster-bar-id{ gap: 8px; }
  .cluster-bar-select{ max-width: none; }
}
```

Notas:
- O `padding: 10px 30px` alinha a barra ao padding horizontal do header do MAPA
  (`header{ padding: 16px 30px }`), espelhando o `px-6 py-3` do OSG.
- O header do MAPA já tem `border-bottom: 2px solid var(--accent-color)` — manter;
  ele funciona como divisor entre header e barra (no OSG esse papel é do `border-b`
  cinza do header).
- O estado de atenção usa `border: 2px` num trigger de altura fixa (`--ctrl-h`), então
  não há salto de layout vertical; a diferença de 1px no padding interno é imperceptível.

### Etapa 5 — Limpeza

- Confirmar que nada mais referencia `header-cluster` (era usado só pelo
  `HeaderClusterSelect`): `grep "header-cluster" src/` deve retornar vazio após a Etapa 3/4.
- Rodar `bun run lint` e corrigir eventuais imports não usados em `Layout.tsx`.

---

## 6. Critérios de aceite (QA visual)

Com `bun run dev`, na área `/equipe/digital/mapa`:

1. **Estado atenção (`Todos os clusters`)**: barra com fundo teal-50 cheio; badge
   teal sólido com ícone branco **pulsando** (2s, loop); select com borda 2px
   `teal-400` + anel `teal-100`; texto "⚠ Selecione um cliente para filtrar as páginas".
2. **Estado calmo (cliente selecionado)**: fundo da barra clareia (45% alpha) com
   **transição suave** (0.3s); badge vira `teal-100` com ícone `teal-700` e o pulso
   para; borda do select volta a 1px `teal-200`; aparece "Trabalhando em: **{nome}**"
   com fade-in — e o fade re-dispara ao trocar de cliente.
3. **Comportamento preservado**: trocar o cluster continua filtrando todas as páginas
   (Projetos, Processos, Cascata, dashboards); o painel de opções (portal no `body`)
   abre alinhado ao trigger; navegação por teclado (setas/Enter/Esc) intacta.
4. **Responsivo**: abaixo de 768px a barra empilha (identidade / select / texto) sem
   overflow horizontal.
5. **Sem regressões**: header mantém o indicador "Status: Online"; sidebar
   colapsada/expandida não afeta a barra; nenhum estilo de outros `custom-select`
   do MAPA mudou (as regras novas são todas escopadas em `.cluster-bar`).

---

## 7. Restrições (do CLAUDE.md e do módulo)

- Não usar Tailwind/shadcn dentro do módulo MAPA — CSS puro em `mapa.css`.
- Não alterar `src/components/equipe/mapa/Select.tsx` (lógica) nem os hooks
  `useClusterGlobal` / `useClusterFiltroOpcoes`.
- Não tocar em arquivos autogerados nem em `package-lock.json`; usar apenas `bun`.
- Sem chamadas diretas ao Supabase em componentes (os hooks existentes já cobrem).
