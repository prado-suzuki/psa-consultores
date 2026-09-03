import { describe, expect, it } from 'vitest';

import { familiaCrua, medirCorCrua } from '@/lib/medirCorCrua';

/**
 * Catraca da fila do papel `alerta`.
 *
 * O papel `alerta` foi convertido em 01/09/2026: `<Alert variant="warning">`,
 * `<Badge variant="warning">` e o trio `border-warning/40 bg-warning/10
 * text-warning` no painel feito à mão. O contrato está em
 * `docs/geral/paleta-por-area.md`, na seção "O papel `alerta` tem variante no
 * `ui/`".
 *
 * A conversão NÃO zerou a fila, e não devia: nem todo âmbar é `alerta`. O que
 * sobrou está aqui, arquivo a arquivo, agrupado pelo MOTIVO de ter ficado — e é
 * o motivo, não o número, que faz esta lista valer a pena. Cada entrada foi
 * classificada uma vez; quem for converter o próximo papel não precisa
 * reclassificar do zero.
 *
 * A asserção é de igualdade EXATA, então a lista é catraca nos dois sentidos:
 *
 * - âmbar NOVO em arquivo que não está aqui derruba o teste. É o que trava o
 *   crescimento da fila, e é o motivo principal desta lista existir;
 * - âmbar novo em arquivo que ESTÁ aqui também derruba, porque a contagem
 *   daquele arquivo muda;
 * - e converter um sítio derruba igual, pedindo que a contagem caia ou que o
 *   arquivo saia. A fila só pode diminuir, e nunca de fininho.
 *
 * Por que não é regra de ESLint: `bg-amber-50` é classe válida do Tailwind, e a
 * regra `escala/cor-de-estoque` só dispara em nome que o projeto TAMBÉM define
 * (`teal`, `lime`, `gray`) — âmbar não é. Sobrariam `warn` global, que joga os
 * sítios num monte indistinto e perde a classificação, ou escopo por pasta, que
 * foi medido e protege o terço errado: as pastas já em zero são as quietas, e
 * `equipe/dev` — onde está o maior naco da fila — ficaria de fora inteira.
 *
 * ⚠️ Ao mexer aqui, mexa por MOTIVO e não por arquivo solto. `escada-de-status`
 * inteiro sai junto quando `feito`, `ajuste` e `espera` forem convertidos; é
 * conversão por papel, no modelo do `taskStatusColors`.
 */
type MotivoDeFicar =
  /** Degrau de uma escada cujos outros degraus continuam crus: `Validado`/`Pendente`,
      `Alta`/`Média`/`Baixa`. Converter só o degrau âmbar põe token e cor de estoque na
      mesma coluna — troca escada crua por escada meio crua, que é pior. */
  | 'escada-de-status'
  /** Âmbar que significa OUTRA coisa: "Oportunidades" com lâmpada é ideia; o lápis e o
      `--edit-shadow-color` são modo de edição; `amberClass = isChanged ? …` é realce de
      diff, que é `info`; "Hoje"/"Amanhã" é proximidade; a estrela é favorito. */
  | 'outro-papel'
  /** Cor que separa categorias, não estados: `Original`/`Retificadora`, a cor por
      categoria de página, o tipo de cenário. Aqui o âmbar é um tom de uma paleta
      categórica, e o destino são os `--tag-*`, não um papel de status. */
  | 'paleta-categorica'
  /** "Líder", "Admin": rótulo de acesso. Não é estado de nada. */
  | 'rotulo-nao-status'
  /** Ícone grande de estado vazio, ao lado de texto em `muted-foreground`. Em
      `text-warning` cheio ele passa a gritar. */
  | 'decoracao'
  /** Paleta categórica que sai para PNG pelo `html-to-image`. É a fase 3b, e ela
      depende da decisão 4 — ver `docs/geral/fase-3a-cor-crua-na-mao.md`. */
  | 'grafico-fase-3b'
  /** Prosa que conta por que aquele âmbar era errado. Reescrever apaga a história. */
  | 'comentario';

const FILA_DO_ALERTA: Record<MotivoDeFicar, Record<string, number>> = {
  'escada-de-status': {
    'src/components/equipe/HorasAcumuladas.tsx': 1,
    // O `AuditPendenciasTable` fica, e o motivo é mais forte que "ainda não
    // converteram": o `CORES_MOTIVO` é ESCALA de severidade, não escada de status, e
    // o contrato diz que gradiente não veste papel. O `AuditPessoasTable` saiu em
    // 03/09 — o `parou` dele era estado de verdade, e virou `alerta`.
    'src/components/equipe/audit/AuditPendenciasTable.tsx': 4,
    'src/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteKpis.tsx': 2,
    'src/components/equipe/dev/calculadora-ibs-cbs/por-estado/PorEstadoKpis.tsx': 1,
    'src/components/equipe/dev/efd-export/EFDExportStatus.tsx': 2,
    'src/components/equipe/dev/icms-saidas/familias/FamiliaSaidaTab.tsx': 2,
    'src/components/equipe/dev/icms-saidas/familias/checkColor.ts': 2,
    'src/components/equipe/dev/perdcomp/PerDetailModal.tsx': 10,
    'src/components/equipe/dev/processo-difal/DifalProductsCard.tsx': 4,
    'src/components/equipe/mapeamento/ScenarioComparator.tsx': 2,
    'src/components/equipe/mapeamento/ScenarioList.tsx': 3,
    'src/components/equipe/projetos/projectPresentation.tsx': 3,
    'src/components/equipe/sprint-detalhes/AgendaTab.tsx': 2,
    'src/components/equipe/sprint-detalhes/MetricsTab.tsx': 2,
    'src/components/equipe/sprint-detalhes/RisksTab.tsx': 4,
    'src/components/sprint/GroupedTasks.tsx': 1,
    'src/pages/equipe/EquipeBacklog.tsx': 3,
    'src/pages/equipe/EquipeKanban.tsx': 2,
    'src/pages/equipe/dashboards/AnaliseInteligente.tsx': 3,
    'src/pages/equipe/dev/GerenciarDados.tsx': 3,
    'src/pages/equipe/fiscal/GestaoClientes.tsx': 2,
  },
  'outro-papel': {
    'src/components/equipe/StageEditCard.tsx': 3,
    'src/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteAnalysis.tsx': 4,
    'src/components/equipe/dev/correcoes-sped/TabA170.tsx': 3,
    'src/components/equipe/dev/correcoes-sped/TabC170.tsx': 7,
    'src/components/equipe/dev/correcoes-sped/TabD100.tsx': 1,
    'src/components/equipe/dev/correcoes-sped/TabF100.tsx': 1,
    'src/components/equipe/dev/correcoes-sped/TabF120.tsx': 2,
    'src/components/equipe/dev/correcoes-sped/TabF130.tsx': 2,
    'src/components/equipe/dev/efd-export/EFDExportProfiles.tsx': 4,
    'src/components/equipe/dev/export-dialog/ColumnSelector.tsx': 4,
    'src/components/equipe/osg/relatorios/DiagnosticoPatrimonialReport.tsx': 3,
    'src/components/equipe/sprint-detalhes/SprintHeaderFilters.tsx': 6,
  },
  'paleta-categorica': {
    'src/pages/equipe/DigitalAreaSelector.tsx': 1,
    'src/components/equipe/ImprovementHistoryModal.tsx': 1,
    'src/components/acessos/pageCategoryStyles.ts': 3,
    'src/components/equipe/dev/consulta-efd-icms/EfdResultsTable.tsx': 3,
    'src/components/equipe/mapeamento/ScenarioCreateModal.tsx': 3,
    'src/pages/equipe/dev/ConsultaECD.tsx': 3,
    'src/pages/equipe/dev/ConsultaECF.tsx': 3,
    'src/pages/equipe/dev/ConsultaEFD.tsx': 3,
  },
  'rotulo-nao-status': {
    'src/components/acessos/UsersRolesView.tsx': 2,
    'src/components/acessos/roleOptions.ts': 3,
    'src/pages/administracao/AdminUsuarios.tsx': 2,
    'src/pages/equipe/EquipeUsuarios.tsx': 6,
  },
  'decoracao': {
    'src/components/equipe/dev/consulta-xmls/ConsultaXmlResults.tsx': 1,
  },
  'grafico-fase-3b': {
    'src/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteCharts.tsx': 1,
  },
  'comentario': {
    'src/components/equipe/osg/calculadora-itcmd/itcmdKit.tsx': 1,
  },
};

/** Âmbar e amarelo — as duas famílias que o papel `alerta` reivindica.
    O recorte de propriedade e o de variante vêm de `familiaCrua`, e são mais largos
    que a versão que esta catraca nasceu usando: aquela olhava sete propriedades e um
    `hover:` só, e por isso deixou passar o `from-amber-500` do DigitalAreaSelector. */
const COR_CRUA_DE_AVISO = familiaCrua('amber', 'yellow');

describe('fila do papel `alerta`', () => {
  it('a cor crua de aviso que sobrou é exatamente a que está inventariada', () => {
    const esperado = Object.fromEntries(
      Object.values(FILA_DO_ALERTA).flatMap(grupo => Object.entries(grupo)),
    );
    expect(
      medirCorCrua(COR_CRUA_DE_AVISO),
      'A fila do `alerta` mudou.\n'
        + '· Arquivo NOVO na medição: alguém escreveu âmbar cru. Use a variante — o contrato\n'
        + '  está em docs/geral/paleta-por-area.md, seção "O papel `alerta` tem variante no ui/".\n'
        + '· Contagem que SUBIU: mesmo caso, em arquivo que já estava na fila.\n'
        + '· Contagem que CAIU, ou arquivo que sumiu: a conversão andou. Atualize FILA_DO_ALERTA\n'
        + '  neste arquivo, mantendo a entrada no grupo do MOTIVO dela.',
    ).toEqual(esperado);
  });

  it('nenhum arquivo aparece em dois motivos', () => {
    // A lista serve para dizer POR QUE cada sítio ficou. Arquivo em dois grupos
    // faz o `esperado` acima somar errado e a resposta deixa de ser única.
    const vistos = Object.values(FILA_DO_ALERTA).flatMap(grupo => Object.keys(grupo));
    expect(vistos.length, 'arquivo repetido entre motivos').toBe(new Set(vistos).size);
  });
});
