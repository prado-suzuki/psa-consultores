
## Remover card de alerta "Atenção!" da sprint

### O que sera feito
Remover o card vermelho de riscos que exibe "Atenção! X atrasados Y vencendo hoje" com os botoes "Ver Atrasados" e "Ver Hoje".

### Alteracao

**Arquivo:** `src/pages/equipe/EquipeSprintDetalhes.tsx`

Remover o bloco inteiro do "Card de Riscos" (linhas 1065-1121), que inclui:
- O card com fundo vermelho (`bg-red-50`)
- O icone de alerta e texto "Atenção!"
- Os contadores de atrasados, vencendo hoje, vencendo amanha e metricas em risco
- Os botoes "Ver Atrasados" e "Ver Hoje"

Nenhuma outra alteracao necessaria -- os filtros de data (`filterDate`) continuam funcionando normalmente pela barra de filtros abaixo.
