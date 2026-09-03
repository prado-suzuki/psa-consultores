import type { DocRevisao } from '@/hooks/useDocumentoArquivo';
import type { EstadoDocumento } from '@/lib/estadoDocumento';

/**
 * Cor do estado de um documento, nos papéis de status da área — o sexto mapa da
 * família (ver "Status tem mapa, não classe" em `docs/geral/paleta-por-area.md`).
 *
 * POR QUE ELE É COMPARTILHADO, SE AS DUAS TELAS FALAM DIFERENTE
 *
 * O portal do cliente e o checklist do consultor têm vocabulário próprio de
 * propósito — "Falta enviar" lá, "Pendente" cá — e isso continua em cada tela,
 * como `estadoDocumento.ts` já explicava. O que NÃO tinha motivo para divergir era
 * a cor, e divergiu: o portal pintava `amber-*`/`rose-*` do estoque do Tailwind, e
 * o consultor pintava `osg-red`/`osg-moss`, que são a ÂNCORA da OSG. Os dois
 * estavam errados pelo mesmo modelo — âncora pinta o que é grande (cabeçalho,
 * botão, primeira série de gráfico) e **nunca papel de status**, e cor de estoque
 * não acompanha tema nenhum.
 *
 * Em papel, o mesmo mapa serve as duas: dentro de `.osg-theme` o `--status-*` já é
 * o da OSG, no portal é o da base. E o `osg-red` sai do checklist, que era o ponto
 * onde a âncora pintava "recusado" — ele **continua** em outras telas da OSG
 * (`grep -rl osg-red src/components src/pages`), e cada uma é o mesmo caso: se o
 * vermelho ali significa estado, é papel; se é decoração da área, fica.
 *
 * OS PAPÉIS, decididos em 03/09/2026:
 *
 *   pendente / falta enviar → `espera`     parado esperando alguém de fora
 *   em análise / a revisar  → `andamento`  a equipe está com ele na mão
 *   recusado                → `ajuste`     deu problema, pede ação (= --destructive)
 *   aprovado                → `feito`      resolvido
 *
 * O `pendente` foi a única escolha real, entre `espera` e `alerta`: a tela do
 * portal tinha as DUAS respostas ao mesmo tempo (o chip em âmbar, o pontinho do
 * filtro em `bg-warning`, que é `alerta`). Ficou `espera`, porque falta de
 * documento é trabalho parado num terceiro, não urgência subindo.
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

const ESPERA = papel('espera');
const ANDAMENTO = papel('andamento');
const AJUSTE = papel('ajuste');
const FEITO = papel('feito');

/** Os quatro estados de uma pendência (ver `EstadoDocumento`). */
export const estadoDocumentoColors: Record<EstadoDocumento, ReturnType<typeof papel>> = {
  pendente: ESPERA,
  em_analise: ANDAMENTO,
  recusado: AJUSTE,
  aprovado: FEITO,
};

/**
 * A revisão de UM arquivo, que é outro eixo: uma pendência `aprovado` pode ter um
 * arquivo recusado dentro (ver a precedência em `estadoDocumento.ts`). `pendente`
 * aqui é "ninguém olhou ainda", que é o mesmo `andamento` do "a revisar".
 */
export const revisaoArquivoColors: Record<DocRevisao, ReturnType<typeof papel>> = {
  pendente: ANDAMENTO,
  aprovado: FEITO,
  recusado: AJUSTE,
};
