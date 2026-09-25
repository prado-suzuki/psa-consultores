import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Controle clicável não repousa sobre superfície tingida.
 *
 * Existe porque o defeito não aparece como erro: a tela continua funcionando,
 * o item continua clicável, e só alguém olhando percebe que "tá tudo bege".
 * Foi assim que os blocos da Biblioteca de Montagem ficaram bege — não porque
 * a tela estivesse errada, mas porque o VALOR de um token mudou e arrastou
 * junto todo controle pintado com ele.
 *
 * A regra é a da escada: o MAIS CLARO vai onde a mão age. A casa tem quatro
 * superfícies e elas não são intercambiáveis —
 *
 *   `bg-field`              onde a mão OPERA: campo de preencher, item
 *                           selecionável, bloco arrastável. É o mais claro.
 *   `bg-card`               o branco do CROMO: cabeçalho, barra, botão.
 *   `bg-superficie-cartao`  o OBJETO cartão, tingido (`--muted` com alfa).
 *   `bg-surface-elevada`    o que FLUTUA: modal, sheet, gaveta.
 *
 * O que esta catraca cobra é só a primeira linha: elemento clicável EM REPOUSO
 * não se pinta com superfície tingida. Estado não conta — `hover:bg-muted` num
 * item branco é o realce, e é justamente o desenho certo.
 *
 * ⚠️ Ela é uma CATRACA, não um inventário com motivos. A diferença importa: a
 * lista abaixo não afirma que cada linha está certa, afirma que é o que existia
 * quando a catraca nasceu. Nem toda entrada é defeito — a canaleta de um
 * segmentado é tingida de propósito (a pastilha ativa é que é branca), o
 * quadrado de ícone dentro de uma linha clicável é ornamento e não superfície,
 * e um cartão-objeto sobre página BRANCA precisa do tingido para existir: foi
 * essa a razão que manteve o `AcordoDeQuotistas` fora da conversão, e ela está
 * escrita no próprio arquivo.
 *
 * O número só pode CAIR.
 */

const RAIZ = 'src';

/** Superfície genuinamente tingida. `bg-card` fica fora: nele o controle está certo. */
const TINGIDO = /(^|[^-:\w])bg-(superficie-cartao|muted|osg-50|osg-100)(\b|\/)/;
/** Variante de estado: o tingido aqui é o realce, não o repouso. */
const ESTADO = /(hover|focus|active|group-hover|data-\[state=[a-z]+\]):bg-/;
const CLICAVEL = /onClick=|draggable=|role="button"|role="option"|cursor-pointer|cursor-grab/;

/**
 * Comentário vira espaço em branco, preservando a numeração das linhas.
 *
 * Sem isso a catraca acusa quem apenas FALA de uma classe. O `OsgWorkDashboard`
 * era exatamente esse caso: um comentário citando `bg-osg-100` para explicar o
 * desenho da grade, contado como se pintasse alguma coisa.
 */
function semComentarios(fonte: string): string {
  return fonte
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, antes: string) => antes + ' '.repeat(m.length - antes.length));
}

function arquivosTsx(dir: string): string[] {
  const achados: string[] = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const f = join(dir, e.name);
    if (e.isDirectory()) achados.push(...arquivosTsx(f));
    else if (e.name.endsWith('.tsx') && !e.name.includes('.test.')) achados.push(f);
  }
  return achados;
}

/**
 * A janela de 6 linhas para cada lado existe porque o `className` e o `onClick`
 * quase nunca moram na mesma linha: um `cn()` de quatro linhas separa os dois.
 * Ler linha a linha daria a fila por vazia.
 */
function contarNoArquivo(fonte: string): number {
  const linhas = semComentarios(fonte).split('\n');
  let total = 0;
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i];
    if (!TINGIDO.test(linha)) continue;
    if (ESTADO.test(linha) && !TINGIDO.test(linha.replace(ESTADO, ''))) continue;
    const janela = linhas.slice(Math.max(0, i - 6), i + 7).join('\n');
    if (CLICAVEL.test(janela)) total++;
  }
  return total;
}

/** A fila medida em 24/09/2026: 61 arquivos, 74 ocorrências. */
const CONTROLE_TINGIDO_HOJE: Record<string, number> = {
  'src/components/ErrorBoundary.tsx': 1,
  'src/components/acessos/DashboardsTab.tsx': 1,
  'src/components/acessos/UsersTab.tsx': 1,
  'src/components/chamados/TicketRichTextEditor.tsx': 1,
  'src/components/comentarios/AnexosDoComentario.tsx': 1,
  'src/components/comentarios/OrgCommentEditor.tsx': 1,
  'src/components/comentarios/feed/FeedFiltros.tsx': 1,
  'src/components/comentarios/feed/FeedGrupoOrigem.tsx': 1,
  'src/components/equipe/ImprovementHistoryModal.tsx': 1,
  'src/components/equipe/SOPViewerModal.tsx': 1,
  'src/components/equipe/TarefaRichTextEditor.tsx': 1,
  'src/components/equipe/client-form/CentrosCustoPickerDialog.tsx': 1,
  'src/components/equipe/controle/ControleDeProjetosTabela.tsx': 1,
  'src/components/equipe/dev/DevHubPage.tsx': 1,
  'src/components/equipe/dev/balancete/UploadBalanceteModal.tsx': 1,
  'src/components/equipe/dev/calculadora-ibs-cbs/AbaPorProduto.tsx': 1,
  'src/components/equipe/dev/calculadora-ibs-cbs/por-estado/PorEstadoFluxo.tsx': 1,
  'src/components/equipe/dev/calculadora-ibs-cbs/por-estado/PorEstadoUfs.tsx': 1,
  'src/components/equipe/dev/carga-chamados/CriarUsuariosTab.tsx': 1,
  'src/components/equipe/dev/consulta-efd-icms/EfdResultsHeader.tsx': 1,
  'src/components/equipe/dev/efd-export/EFDExportStatus.tsx': 1,
  'src/components/equipe/dev/efd-export/EFDRecordSelector.tsx': 2,
  'src/components/equipe/dev/export-dialog/ColumnSelector.tsx': 1,
  'src/components/equipe/dev/pis-cofins/DynamicTableHeader.tsx': 1,
  'src/components/equipe/dev/procedimentos/ReviewProcedimentoModal.tsx': 1,
  'src/components/equipe/dev/processo-difal/DifalSummaryActions.tsx': 1,
  'src/components/equipe/estrutura/EstruturaManager.tsx': 2,
  'src/components/equipe/fiscal/tasks/ReviewRichText.tsx': 1,
  'src/components/equipe/fiscal/tasks/TaskCalendar.tsx': 1,
  'src/components/equipe/fiscal/tasks/TaskCard.tsx': 1,
  'src/components/equipe/gantt/GanttChart.tsx': 2,
  'src/components/equipe/osg/EditorBlocoDialog.tsx': 1,
  'src/components/equipe/osg/EditorConteudoModelo.tsx': 2,
  'src/components/equipe/osg/HistoricoFlutuante.tsx': 1,
  'src/components/equipe/osg/checklists/ChecklistPendentes.tsx': 1,
  'src/components/equipe/osg/diagnostico-patrimonial/impedimentos/ImpedimentosPanel.tsx': 1,
  'src/components/equipe/osg/documentos/DocUploadDialog.tsx': 1,
  'src/components/equipe/osg/documentos/OrganizarDocumentos.tsx': 1,
  'src/components/equipe/osg/documentos/classificar/BaldePanel.tsx': 1,
  'src/components/equipe/osg/documentos/organizar/pecasArvore.tsx': 1,
  'src/components/equipe/osg/gerar/PainelConferencia.tsx': 3,
  'src/components/equipe/osg/montagem/BibliotecaPalette.tsx': 1,
  'src/components/equipe/osg/montagem/GaleriaModelos.tsx': 2,
  'src/components/equipe/osg/montagem/MontadorWorkbench.tsx': 1,
  'src/components/equipe/osg/quadro-societario/BarraDeEmpresas.tsx': 1,
  'src/components/equipe/osg/relatorios/PreviaEmModal.tsx': 1,
  'src/components/equipe/processos/ProcessStagesTab.tsx': 1,
  'src/components/equipe/projetos-cadastro/ProjetosCadastroTable.tsx': 1,
  'src/components/equipe/projetos/ProjectProcessesTab.tsx': 1,
  'src/components/equipe/sprint-detalhes/DeliverablesTab.tsx': 1,
  'src/components/equipe/tarefas/ProjetosTarefasList.tsx': 2,
  'src/components/ui/calendar.tsx': 3,
  'src/components/ui/month-range-picker.tsx': 3,
  'src/components/ui/month-year-picker.tsx': 2,
  'src/components/ui/onboarding-checklist.tsx': 1,
  'src/pages/equipe/EquipeAuth.tsx': 1,
  'src/pages/equipe/dev/ConsultaEFD.tsx': 1,
  'src/pages/equipe/dev/DevDashboard.tsx': 1,
  'src/pages/equipe/osg/AcordoDeQuotistas.tsx': 1,
  'src/pages/equipe/osg/BibliotecaApresentacoes.tsx': 1,
  'src/pages/equipe/osg/OsgBoasVindas.tsx': 1,
};

describe('controle tingido: o mais claro vai onde a mão age', () => {
  it('a fila de clicável sobre superfície tingida é exatamente a medida', () => {
    const medido: Record<string, number> = {};
    for (const arquivo of arquivosTsx(RAIZ)) {
      const n = contarNoArquivo(readFileSync(arquivo, 'utf8'));
      if (n > 0) medido[arquivo.split(/[\\/]/).join('/')] = n;
    }

    expect(
      medido,
      '\n' +
        '· Arquivo NOVO, ou contagem que SUBIU: você pintou um clicável com\n' +
        '  superfície tingida. Se ele é campo, item selecionável ou bloco que se\n' +
        '  arrasta, a classe é `bg-field`. Se o tingido é o realce e não o\n' +
        '  repouso, escreva-o como estado (`hover:`, `data-[state=...]:`) — a\n' +
        '  catraca não conta estado.\n' +
        '· Contagem que CAIU, ou arquivo que sumiu: a conversão andou. Atualize\n' +
        '  CONTROLE_TINGIDO_HOJE neste arquivo. O número só desce.\n' +
        '· A linha TEM de continuar tingida? Três casos legítimos: canaleta de\n' +
        '  segmentado (a pastilha ativa é a branca), quadrado de ícone dentro de\n' +
        '  uma linha clicável, e cartão-objeto sobre página branca, que sem o\n' +
        '  tingido desaparece. Deixe a contagem e diga o porquê num comentário no\n' +
        '  arquivo de origem, como o `AcordoDeQuotistas` faz.',
    ).toEqual(CONTROLE_TINGIDO_HOJE);
  });
});
