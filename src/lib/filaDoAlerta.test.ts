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
      `--edit-shadow-color` são modo de edição; "Hoje"/"Amanhã" é proximidade.

      ⚠️ Dois exemplos desta lista JÁ FORAM DECIDIDOS em 10/09/2026, e o palpite que
      estava escrito aqui não se confirmou nos dois casos:

      · o realce de diff (`isChanged`) — o texto dizia "que é `info`", e ela escolheu
        `alerta`, com a medição na frente: `espera` tem a matiz mais parecida mas quer
        dizer "parado por alguém", e célula editada não está parada;
      · a estrela de favorito — o texto dizia só "é favorito", e o papel dela é
        marcador de ATIVO, que veste a ÂNCORA, não papel de status nenhum.

      Os dois viraram mapa: `classeDeAlterado` nas Correções SPED e
      `classesDoPerfil.ts` nos dois diálogos de exportação. Quem classificar o
      próximo âmbar aqui: o grupo acerta o "não é alerta"; qual papel É fica para a
      medição e para ela. */
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
    // Quatro entradas saíram daqui em 11/09/2026, e as quatro saíram pelo mesmo
    // motivo: a escada delas FECHOU inteira, que é a condição que este grupo
    // sempre pediu. Elas eram `HorasAcumuladas` (o âmbar de 80% ao lado do
    // vermelho de 100%: `alerta` e `ajuste`), `AnaliseInteligente` (o trio do
    // score e o trio do risco, `feito`/`alerta`/`ajuste` nos dois),
    // `GerenciarDados` (erro/ok/nem-um-nem-outro, que virou
    // `destructive`/`success`/`warning`) e `GestaoClientes` (o mapa de situação,
    // com `suspenso` em `espera` — parado por alguém é exatamente o que o papel
    // diz). Decisão dela em 11/09, olhando a página
    // `comparacoes-de-cor/vermelho-e-verde-o-que-cada-um-diz.html`.
    //
    // O `scoreBg` da Análise Inteligente NÃO foi junto, e não é esquecimento: ele
    // vai para o exportador de PDF, onde `hsl(var(--status-feito))` não resolve.
    // É fase 3b, e continua em hex de propósito.
    // O `AuditPendenciasTable` SAIU em 11/09/2026, e o comentário que estava aqui
    // dizia que ele ficaria: o `CORES_MOTIVO` é escala de severidade, e o contrato
    // diz que gradiente não veste papel. Ela olhou os dois lados renderizados e
    // decidiu pelo papel — as duas pontas da fila (`sem_projeto`/`sem_cliente` em
    // `ajuste`, `sem_os`/`os_sem_produto` em `alerta`), com os dois motivos sem
    // gravidade seguindo em `muted`. O porquê está no comentário do próprio arquivo.
    // O `AuditPessoasTable` já tinha saído em 03/09 — o `parou` dele era estado de
    // verdade, e virou `alerta`.
    // A fileira de KPI da Análise Inteligente saiu em 11/09/2026, e ela foi
    // convertida INTEIRA porque a decisão dela foi sobre o significado, não sobre
    // o tom: "Scope creep é coisa ruim como os outros três". Os quatro viraram
    // `ajuste`/`alerta`/`alerta`/`ajuste` — o azul do scope creep junto, o que tira
    // duas da `filaDoBlue` também. Ela decidiu olhando a tela rodando, com os dois
    // candidatos aplicados ao vivo sobre o dado real (31, 33, 691 e R$ 18,6k).
    // O `PorEstadoKpis` saiu em 11/09/2026 junto com o lote das escadas: o âmbar
    // dele era o degrau do meio de "concentração geográfica" (alta / moderada /
    // baixa), e os outros dois degraus eram `rose` e `emerald`. Escada de três,
    // convertida inteira.
    // O `EFDExportStatus` saiu em 10/09/2026, e a classificação estava certa: é
    // escada de status de verdade — `processing`/`starting`, `completed`, `idle` —,
    // e converteu inteira. O âmbar dele era `andamento` e não `alerta`: nada está
    // em atenção, o trabalho está andando. O disco dava 2,86 de contraste, abaixo
    // até do 3:1 de objeto gráfico; agora dá 5,39.
    // O ICMS Saídas saiu deste grupo em 10/09/2026, e ele estava classificado
    // certo: o `checkColor.ts` É uma escada, de três degraus, e converteu inteira
    // — `feito`/`alerta`/`ajuste`. O que a classificação não podia saber é que o
    // âmbar do `FamiliaSaidaTab` NÃO era degrau da escada: era a linha com
    // correção aplicada, ou seja o mesmo mapa de "valor alterado" que as Correções
    // SPED ganharam no mesmo dia. Dois arquivos, duas coisas diferentes, o mesmo
    // tom. Ver a nota da pasta em `corCruaNaTelaDoDev.test.ts`.
    // O `PerDetailModal` saiu em 11/09/2026, e não por virar papel: as nove
    // situações da Receita viraram ETIQUETA de fase (`--tag-*`), que é o destino de
    // quem não é estado de trabalho. Só as duas pontas ganharam papel —
    // `Homologado` em `feito`, `Cancelado` em `ajuste` —, por decisão dela: são as
    // duas que o cliente lê como resultado. O âmbar daqui eram as três instâncias
    // de "em discussão administrativa", que agora são `--tag-c`.
    'src/components/equipe/dev/processo-difal/DifalProductsCard.tsx': 4,
    'src/components/equipe/mapeamento/ScenarioComparator.tsx': 2,
    'src/components/equipe/mapeamento/ScenarioList.tsx': 3,
    'src/components/equipe/sprint-detalhes/AgendaTab.tsx': 2,
    'src/components/equipe/sprint-detalhes/MetricsTab.tsx': 2,
    // O `RisksTab` e o `projectPresentation` saíram em 11/09/2026 pela FRENTE DO
    // AZUL, que roda em paralelo (`32e04e6b` e `bd08822f`), e as duas conversões
    // deixaram esta catraca vermelha: quem converteu âmbar não atualizou o
    // inventário do alerta. Ficou registrado aqui porque é o modo de falha que a
    // catraca existe para expor — ela reprova por conversão feita, não só por cor
    // nova, e a fila só pode encolher com a lista na mão.
    'src/components/sprint/GroupedTasks.tsx': 1,
    // O `EquipeBacklog` saiu em 11/09/2026: a escada de prioridade dele — alta,
    // média, e o resto em `muted` — converteu inteira para `alerta`/`espera`/neutro,
    // pela escada de quatro degraus que ela aprovou olhando a página de comparação.
    //
    // O `EquipeKanban` saiu no mesmo dia, e saiu de CARONA: o amarelo era degrau
    // do `getStatusBadgeColor` escrito à mão, e quem o matou foi a frente do
    // `blue` (commit `07f4d74b`), trocando o `switch` inteiro por uma leitura do
    // `entregavelStatusColors`. A escada fechou de uma vez, nas três cores.
    //
    // É o caso que a mensagem desta catraca descreve, e ele mordeu: a contagem
    // CAIU sem ninguém baixar a fila, e a `develop` ficou com a catraca vermelha
    // até a outra sessão apontar. Quem converte um MAPA reconfere todas as filas
    // que citam aquele arquivo, não só a da família que foi buscar.
  },
  'outro-papel': {
    // O `StageEditCard` caiu de 3 para 1 em 11/09/2026, e o que sobrou é o mais
    // claro do grupo: o âmbar da escada de prioridade foi embora com a conversão, e
    // ficou só a bolinha do número da etapa EM MODO DE EDIÇÃO — que é o mesmo âmbar
    // do lápis e do `--edit-shadow-color`, e continua não sendo estado de nada.
    'src/components/equipe/StageEditCard.tsx': 1,
    'src/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteAnalysis.tsx': 4,
    // As seis abas de `correcoes-sped` saíram daqui em 10/09/2026, e o grupo estava
    // certo em tê-las: o âmbar delas era DUAS outras coisas, não uma. O marcador de
    // célula alterada (`isChanged`/`valueDivergent`, doze ocorrências) virou `alerta`
    // por decisão dela — `espera` tem a matiz mais parecida mas quer dizer "parado
    // por alguém", e uma célula editada não está parada. O par de selos de
    // `tipo_relacao` era categoria e foi para `tag-a`/`tag-b`, junto com o irmão
    // dele, que usava `success` fazendo papel de categoria. Os contrastes subiram:
    // 3,19 -> 7,46 no valor, 4,84 -> 6,30 no selo.
    // Os dois diálogos de exportação saíram juntos em 10/09/2026, e tinham de estar
    // neste grupo: o amarelo deles era a estrela de "perfil padrão", que não é
    // status nenhum — é marcador de ATIVO, e marcador de ativo veste a âncora, pela
    // mesma regra do item de menu. Eram QUATRO cópias da mesma classe, duas em cada
    // diálogo, e o tom foi para `classesDoPerfil.ts`. Era o pior contraste da
    // varredura do dia: 1,92 sobre o cartão branco, contra 6,72 agora.
    'src/components/equipe/osg/relatorios/DiagnosticoPatrimonialReport.tsx': 3,
    'src/components/equipe/sprint-detalhes/SprintHeaderFilters.tsx': 6,
  },
  'paleta-categorica': {
    'src/pages/equipe/DigitalAreaSelector.tsx': 1,
    // Saiu em 11/09/2026, de carona com a frente do `blue`: o âmbar era o ícone
    // de "Outras economias", uma das três entradas de um trio que estava copiado
    // em dois arquivos. Converter só a azul deixaria escada meio crua, então o
    // mapa andou inteiro e virou `@/lib/tipoDeEconomia`, em tons categóricos.
    'src/components/acessos/pageCategoryStyles.ts': 3,
    'src/components/equipe/dev/consulta-efd-icms/EfdResultsTable.tsx': 3,
    'src/components/equipe/mapeamento/ScenarioCreateModal.tsx': 3,
    'src/pages/equipe/dev/ConsultaECD.tsx': 3,
    'src/pages/equipe/dev/ConsultaECF.tsx': 3,
    'src/pages/equipe/dev/ConsultaEFD.tsx': 3,
  },
  'rotulo-nao-status': {
    // Os dois da pasta acessos saíram em 11/09/2026 (commit `f0538b86`): o âmbar
    // do "Líder Geral" vivia nos mapas de papel — `ROLE_VISUALS` no
    // `UsersRolesView` e `ROLE_BADGE_CLASSES` no `roleOptions` —, e os dois mapas
    // morreram no `ui/PapelBadge`. É fim do âmbar, não mudança de motivo: a cor
    // deixou de desenhar hierarquia e passou a marcar só o eixo "de fora da PSA".
    // O grupo continua existindo, agora pela escada de peso que o `PapelBadge`
    // desenha.
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
