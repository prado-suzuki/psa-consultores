
## Objetivo

Inserir no `/equipe/dev` (DevDashboard) um card único, centralizado e visualmente diferente dos demais, destacando o manual da **Estrutura de Pastas do Google Drive** — fonte primária dos arquivos que alimentam o BigQuery e, por consequência, todas as ferramentas Digital DEV.

## Onde

`src/pages/equipe/dev/DevDashboard.tsx` — entre o bloco do HeroBanner (linha ~213-231) e o "Catálogo de Ferramentas" (linha ~233), garantindo que apareça acima da grade de ferramentas, com **destaque máximo**.

## Conteúdo do card

- **Eyebrow**: "Fonte dos dados · Crítico"
- **Título**: "Estrutura de Pastas do Google Drive"
- **Descrição**: Texto curto explicando que o Drive é onde os analistas carregam os arquivos dos clientes, que disparam a coleta para o BigQuery e abastecem todas as ferramentas Digital DEV — por isso seguir a estrutura é obrigatório.
- **CTA**: "Abrir manual" → abre em nova aba `https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/estrutura-pastas-drive/` (`target="_blank"`, `rel="noopener noreferrer"`).
- **Ícone**: `FolderTree` (lucide) + selo "SOP oficial".

## Tratamento visual (para se diferenciar dos demais)

- Linha exclusiva: `grid grid-cols-1` (ocupa 100% da largura, sem vizinhos).
- Layout em duas colunas internas: ícone grande + título/descrição à esquerda, CTA + métricas/badges à direita.
- Paleta divergente dos cards padrão (que são teal escuro). Proposta: fundo `bg-gradient-to-r from-amber-50 via-white to-teal-50` com borda dupla `border-2 border-amber-300/60` e shadow âmbar suave — comunica "atenção/diretriz" sem virar alerta vermelho.
- Selo pulsante discreto (`animate-pulse` num dot) e badge "Leitura obrigatória".
- Hover: leve elevação + brilho na borda âmbar.
- Mantém o design system existente (tokens slate/teal/amber já usados no projeto).

## Técnico

- Componente inline no DevDashboard (não justifica criar arquivo separado).
- Link externo via `<a href ... target="_blank">` — não usar `navigate`.
- Sem mudanças em rotas, hooks ou backend.
- Sem novas dependências.

## Fora de escopo

- Não importar o HTML do SOP localmente (manual fica hospedado no GitHub Pages).
- Não alterar `devHubDefinitions` nem o catálogo de ferramentas.
- Não mexer nos KPIs nem no HeroBanner.
