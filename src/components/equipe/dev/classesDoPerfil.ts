/**
 * O tom da estrela de "perfil padrão", nos QUATRO lugares que a desenham.
 *
 * O DEFEITO QUE ISTO DESFAZ. Os dois diálogos de exportação do Dev — o
 * `EFDExportDialog` (via `efd-export/EFDExportProfiles`) e o `ExportDialog` (via
 * `export-dialog/ColumnSelector`) — desenham a mesma estrela para dizer qual
 * perfil de exportação é o padrão. Cada um a desenha duas vezes: pequena na
 * lista, maior no botão de favoritar. Quatro cópias, a mesma classe do
 * amarelo-500 de estoque, com preenchimento, escrita à mão nas quatro.
 *
 * A CONVERSÃO NÃO É DE COR, É DE PAPEL. Amarelo ali não era papel de status
 * nenhum: a estrela marca QUAL perfil está ativo, e marcador de ativo veste a
 * ÂNCORA — é a mesma regra que o contrato aplica ao item de menu, em que só o
 * ativo carrega o acento da área. Fica no degrau escuro (`accent-d`) porque é
 * ícone pequeno sobre superfície clara, e o acento cheio está reservado para
 * marca grande.
 *
 * Medido: o `yellow-500` sobre o cartão branco dá **1,92** — reprova até o 3:1
 * que a WCAG 1.4.11 pede para objeto gráfico, e era o pior contraste encontrado
 * na varredura de 10/09/2026. O `accent-d` dá **6,72**.
 *
 * O TAMANHO NÃO ENTRA AQUI, de propósito: os quatro usos desenham a estrela em
 * três tamanhos diferentes (`h-3`, `h-4`, `h-5`), e isso é layout do lugar, não
 * o mapa. O mapa devolve o tom; quem chama compõe com o tamanho.
 */
export const TOM_DA_ESTRELA = 'text-accent-d fill-accent-d';
