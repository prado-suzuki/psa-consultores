import type { EstadoSolicitacao } from '@/lib/solicitacao';

/**
 * Cor E rótulo do estado da Solicitação de documentos, nos papéis de status da
 * área — o sétimo mapa da família (ver "Status tem mapa, não classe" em
 * `docs/geral/paleta-por-area.md`).
 *
 * A CHAVE É O ESTADO DERIVADO (`estadoDaSolicitacao`, em `solicitacao.ts`), e
 * não o enum: é ela que permite os dois rótulos de `encerrada` — finalizada e
 * cancelada — com o MESMO papel visual. O que muda entre os dois é rótulo e
 * conteúdo, nunca cor (plano da Solicitação §0 e decisão 9).
 *
 * O mapeamento é fixado em plano (decisão 2):
 *
 *   rascunho     → `fila`      parado, ainda só da casa
 *   enviada      → `espera`    parado esperando o cliente
 *   em_checklist → `andamento` a equipe está com ele na mão
 *   finalizada   → `neutro`    acabou
 *   cancelada    → `neutro`    nunca chegou a sair
 *
 * Verde é ação; estado sai dos papéis `--status-*` — por isso "em checklist"
 * NÃO usa a âncora `osg-moss`, e "cancelada" NÃO usa o vermelho de ajuste:
 * cancelada não pede ação, ela encerra a conversa.
 */
function papel(nome: string) {
  return {
    /** Chip com borda: botão de filtro e selo do card. */
    chip: `border-status-${nome}/30 bg-status-${nome}-soft text-status-${nome} hover:border-status-${nome}/60`,
    /** Pílula ou quadrado de ícone, sem borda. */
    pilula: `bg-status-${nome}-soft text-status-${nome}`,
    /** Fundo e borda de uma linha inteira, mais discretos que o chip. */
    linha: `border-status-${nome}/30 bg-status-${nome}-soft/40`,
    /** Cor cheia como texto: nome de arquivo, motivo da recusa, ícone. */
    texto: `text-status-${nome}`,
  };
}

const FILA = papel('fila');
const ESPERA = papel('espera');
const ANDAMENTO = papel('andamento');
const NEUTRO = papel('neutro');

export const estadoSolicitacaoColors: Record<EstadoSolicitacao, ReturnType<typeof papel>> = {
  rascunho: FILA,
  enviada: ESPERA,
  em_checklist: ANDAMENTO,
  finalizada: NEUTRO,
  cancelada: NEUTRO,
};

/**
 * A palavra do estado, sem data. O selo acrescenta " em DD/MM" quando o estado
 * a tem (`enviadaEm`/`encerradaEm`); "Rascunho" e "Em checklist" nunca levam.
 * A palavra completa (faixa, selo) sai daqui — nunca de literal em JSX.
 */
export const ROTULO_DO_ESTADO: Record<EstadoSolicitacao, string> = {
  rascunho: 'Rascunho',
  enviada: 'Enviada',
  em_checklist: 'Em checklist',
  finalizada: 'Finalizada',
  cancelada: 'Cancelada',
};
