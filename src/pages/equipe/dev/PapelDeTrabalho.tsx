import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  FileSpreadsheet,
  Minus,
  RotateCcw,
  Trash2,
  ShieldAlert,
  Upload,
} from 'lucide-react';

import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RequiredMark } from '@/components/ui/required-mark';
import { FiltroDeBusca } from '@/components/equipe/FiltroDeBusca';
import { FieldTooltip } from '@/components/equipe/dev/auditoria/tooltipHelpers';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SelecaoDeCliente } from '@/components/equipe/selecao/SelecaoDeCliente';
import { toast } from '@/hooks/use-toast';
import { extractErrorMessage } from '@/lib/rlsMessages';
import { useClientesList } from '@/hooks/useDevClients';
import { useAuth } from '@/contexts/AuthContext';
import { EscolhaDoProjeto } from '@/components/equipe/dev/planejamento-tributario/EscolhaDoProjeto';
import {
  useDescartarRevisao,
  useEstudosDoCliente,
  useImportarPapelDeTrabalho,
  useOrdensDeServicoDoCliente,
  useRevisoesDoEstudo,
  useVincularProjetoAoPlanejamento,
  type ProjetoDaOrdemDeServico,
} from '@/hooks/useDomainPapelDeTrabalho';
import {
  usePapelDeTrabalhoController,
  type Analise,
  type EstadoDaFonte,
} from '@/hooks/usePapelDeTrabalhoController';
import type { ProblemaWp } from '@/lib/planejamento-tributario/parser';

/**
 * Conferência do papel de trabalho de Planejamento Tributário.
 *
 * O Fiscal escolhe o WP preenchido e vê **o que o sistema entendeu** antes de
 * qualquer coisa ir para o banco. Nada é gravado nesta tela: o botão de confirmar
 * espera a RPC de importação, que depende dos tipos gerados do banco.
 *
 * ## Por que impedimento e aviso ficam separados
 *
 * Aviso é raro. Medindo os cinco estudos que temos, três não têm nenhuma célula
 * de erro, e nos outros dois quase tudo está em abas que a leitura nem abre. Como
 * é raro, quando aparecer não pode passar batido: por isso o bloco só existe
 * quando há algo, em vez de uma lista sempre presente que viraria paisagem.
 *
 * A diferença entre os dois é o que a pessoa faz a seguir. Impedimento significa
 * consertar a planilha e subir de novo. Aviso significa que grava assim e dá para
 * conferir depois. Se os dois parecessem iguais, ou ela trataria tudo como
 * urgente, ou ignoraria os dois.
 */

const CAIXA = 'rounded-md border px-3 py-2 text-sm';

/**
 * Um dado lido da planilha, com a explicacao de onde ele saiu.
 *
 * **O `ajuda` diz a celula, nao o obvio.** Tooltip que repete o rotulo em outras
 * palavras nao ajuda ninguem: o que a pessoa precisa saber e em que aba e em que
 * celula do papel de trabalho aquilo foi escrito, para poder conferir ou corrigir.
 */
function Campo({
  rotulo,
  valor,
  ajuda,
}: {
  rotulo: string;
  valor: string | number | undefined;
  ajuda?: string;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
        {rotulo}
        {ajuda && <FieldTooltip text={ajuda} />}
      </p>
      <p className="text-sm">{valor === undefined || valor === '' ? '—' : valor}</p>
    </div>
  );
}

/**
 * Uma linha de problema. O endereço da célula vem em fonte de código e é o que a
 * pessoa leva para o Excel: sem ele, "a conta não fecha" é uma reclamação que não
 * se pode agir.
 */
function LinhaDeProblema({ problema }: { problema: ProblemaWp }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
      <code className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-xs">{problema.onde}</code>
      <span className="text-sm">{problema.detalhe}</span>
    </li>
  );
}

/**
 * O que o arquivo diz de si: os campos que identificam o estudo.
 *
 * **A versão do mapa NÃO entra aqui**, e o tamanho do arquivo em lugar nenhum. A
 * régua com que a leitura foi feita é pergunta de auditoria, não de conferência:
 * ela serve para explicar uma revisão depois que o modelo mudar, e o lugar dela é
 * a lista de revisões, onde se compara uma com a outra. Neste card ela destoava,
 * porque aqui é a planilha falando dela mesma, e a régua é o sistema falando de si.
 */
function Cabecalho({ analise }: { analise: Analise }) {
  const { cabecalho } = analise.leitura;
  const periodo =
    cabecalho.anoInicial && cabecalho.anoFinal
      ? `${cabecalho.anoInicial} a ${cabecalho.anoFinal}`
      : undefined;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">O que a planilha informa</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Campo rotulo="Cliente no WP" valor={cabecalho.clienteNoWp} />
        <Campo
          rotulo="Período"
          valor={periodo}
          ajuda="Os dois anos que aparecem na data-base, na célula B4 da aba Resumo. É o intervalo que o planejamento projeta."
        />
        <Campo
          rotulo="Ano-base"
          valor={cabecalho.anoBase}
          ajuda="O exercício de onde saíram as receitas e os custos reais que servem de partida, na célula C7 da aba DRE Projetada."
        />
        <Campo
          rotulo="Crescimento anual"
          valor={
            cabecalho.crescimentoAnual === undefined
              ? undefined
              : `${(cabecalho.crescimentoAnual * 100).toFixed(1).replace('.', ',')}%`
          }
          ajuda="O percentual aplicado sobre o ano-base para projetar os anos seguintes, na célula C5 da aba DRE Projetada."
        />
        <Campo rotulo="Preparado por" valor={cabecalho.preparadoPor} />
        <Campo
          rotulo="Revisado por"
          valor={cabecalho.revisadoPor}
          ajuda="Quem conferiu o papel de trabalho, conforme a célula B8 da aba Resumo. Vem escrito à mão na planilha, não do cadastro de usuários: se estiver em branco, é porque ninguém preencheu aquela célula."
        />
        <Campo
          rotulo="Arquivo"
          valor={analise.nomeDoArquivo}
          ajuda="O nome do arquivo que você escolheu no computador. Fica guardado junto da revisão."
        />
      </CardContent>
    </Card>
  );
}

/**
 * A linha dos anos, escrita por extenso.
 *
 * O intervalo cru brigava com o período do cabeçalho logo acima: o estudo tem
 * três anos, e a leitura acha sete, porque a aba de Venda de Ativos acompanha o
 * cronograma de amortização da dívida. Os números estavam certos e a tela
 * convidava à conclusão errada, então ela passa a dizer de onde vêm os anos a mais.
 */
function anosPorExtenso(analise: Analise): string | undefined {
  const { anos } = analise.resumo;
  if (anos.length === 0) return undefined;

  const primeiro = anos[0];
  const ultimo = anos[anos.length - 1];
  const { anoInicial, anoFinal } = analise.leitura.cabecalho;

  if (anoInicial !== undefined && anoFinal !== undefined && ultimo > anoFinal) {
    return `${anoInicial} a ${anoFinal} no planejamento, e até ${ultimo} na venda de ativos`;
  }
  return primeiro === ultimo ? String(primeiro) : `${primeiro} a ${ultimo}`;
}

/**
 * De onde sai cada slide.
 *
 * Substituiu um bloco de contagens cruas, que somava célula, linha de texto e
 * registro com o mesmo peso e não dava para conferir: ninguém sabe se 1.394
 * valores é o número certo, então o número não pegava leitura incompleta, que era
 * a razão de ele existir.
 *
 * Aqui cada linha é um slide da apresentação, e o detalhe está em termos que se
 * conferem abrindo a planilha: "3 cenários em 3 anos", "9 blocos de comentário".
 * Slide sem fonte aparece nomeado, em vez de escondido atrás de um zero.
 */
/**
 * O sinal da esquerda, em três estados.
 *
 * O visto verde afirma que o slide tem tudo; o triângulo diz que ele sai, mas
 * com buraco; o traço diz que não sai número nenhum. Antes eram dois estados, e
 * "Premissas, cartões" aparecia com visto verde ao lado de um texto avisando que
 * o cartão de hectares não tem fonte.
 */
function MarcaDaFonte({ estado }: { estado: EstadoDaFonte }) {
  if (estado === 'completa') {
    return (
      <>
        <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
        <span className="sr-only">tem tudo de que precisa:</span>
      </>
    );
  }
  if (estado === 'parcial') {
    return (
      <>
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden />
        <span className="sr-only">sai com parte dos números:</span>
      </>
    );
  }
  return (
    <>
      <Minus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="sr-only">sai sem número:</span>
    </>
  );
}

function DeOndeSaiCadaSlide({ analise }: { analise: Analise }) {
  const ausentes = analise.slides.filter((s) => s.estadoDaFonte === 'ausente').length;
  const parciais = analise.slides.filter((s) => s.estadoDaFonte === 'parcial').length;
  const plural = (n: number, um: string, muitos: string) => `${n} ${n === 1 ? um : muitos}`;
  const recado = [
    ausentes && `${plural(ausentes, 'slide sairia', 'slides sairiam')} sem número`,
    parciais && `${plural(parciais, 'slide sai', 'slides saem')} com parte dos números`,
  ]
    .filter(Boolean)
    .join(', e ');

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">O que vai para a apresentação</CardTitle>
        <p className="text-sm text-muted-foreground">
          {recado === '' ? 'Todos os slides têm os números de que precisam.' : `${recado}.`}
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <span className="flex items-center gap-1.5">
                  Slide
                  <FieldTooltip text="O slide da apresentação que vai usar estes números." />
                </span>
              </TableHead>
              <TableHead>
                <span className="flex items-center gap-1.5">
                  Origem
                  <FieldTooltip text="A aba do papel de trabalho de onde os números do slide saem." />
                </span>
              </TableHead>
              <TableHead>
                <span className="flex items-center gap-1.5">
                  O que foi encontrado
                  <FieldTooltip text="O que a leitura achou nessa aba, em termos que dá para conferir abrindo a planilha." />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analise.slides.map((s) => (
              <TableRow key={s.slide}>
                <TableCell className="font-medium">
                  <span className="flex items-center gap-2">
                    <MarcaDaFonte estado={s.estadoDaFonte} />
                    {s.slide}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground">{s.fonte}</TableCell>
                <TableCell
                  className={s.estadoDaFonte === 'ausente' ? 'text-muted-foreground' : undefined}
                >
                  {s.detalhe}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

/**
 * Os anos e as abas, que confirmam que a leitura pegou as colunas certas.
 *
 * Os rótulos eram "Anos" e "De onde vieram os números", que o Eduardo apontou
 * como coloquiais demais. O primeiro não dizia anos de quê, e o segundo parecia
 * pergunta. Agora nomeiam o dado, e o tooltip explica o que fazer com ele.
 */
function ComoFoiLido({ analise }: { analise: Analise }) {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
        <Campo
          rotulo="Exercícios lidos na planilha"
          valor={anosPorExtenso(analise)}
          ajuda="Os anos que a leitura achou nos cabeçalhos de coluna das abas. Pode passar do período do planejamento porque a aba de Venda de Ativos acompanha o cronograma de pagamento da dívida, que costuma ir além."
        />
        <Campo
          rotulo="Abas que trouxeram números"
          valor={analise.resumo.abasLidas.join(' · ')}
          ajuda="As abas da planilha que produziram algum valor. Aba que você preencheu e não aparece nesta lista não entrou na revisão: confira se o nome dela está igual ao do modelo."
        />
      </CardContent>
    </Card>
  );
}

const SITUACAO_LABEL: Record<string, string> = {
  em_andamento: 'em andamento',
  suspenso: 'suspensa',
  concluido: 'concluída',
};

/**
 * O par cliente e OS, que é o que identifica o estudo.
 *
 * **Não sai do WP, e não teria como sair.** O nome do cliente está na planilha,
 * na célula `B3` do `Resumo`, mas é texto livre: casar texto com cadastro é
 * adivinhação, e adivinhar errado pendura o estudo no cliente errado. A OS não
 * está no WP em lugar nenhum. Então a escolha é da pessoa, e o nome lido da
 * planilha serve para CONFERIR o que ela escolheu.
 *
 * A forma é a que a área já usa no `ControleBalancetes` e na `CalculadoraIbsCbs`:
 * cliente, depois o segundo nível, com seleção automática quando há uma só.
 */
function Escolha({
  clienteId,
  onCliente,
  ordemServicoId,
  onOrdemServico,
}: {
  clienteId: string;
  onCliente: (id: string) => void;
  ordemServicoId: string;
  onOrdemServico: (id: string) => void;
}) {
  const { data: clientes = [] } = useClientesList({ ativo: true });
  const { data: ordens = [], isLoading: carregandoOs } = useOrdensDeServicoDoCliente(
    clienteId || null,
  );

  /*
   * A mensagem só aparece depois que a pessoa mexeu no campo e saiu sem escolher.
   * Cobrar antes de ela ter chance de responder é ruído: a tela abriria vermelha
   * dizendo que falta tudo, e o vermelho perde o sentido.
   */
  const [mexeuNoCliente, setMexeuNoCliente] = useState(false);
  const [mexeuNaOs, setMexeuNaOs] = useState(false);
  const faltaCliente = mexeuNoCliente && !clienteId;
  const faltaOs = mexeuNaOs && !!clienteId && !ordemServicoId;

  /* Uma OS só: marca sozinho, como o Controle Balancetes faz com o contribuinte. */
  useEffect(() => {
    if (clienteId && ordens.length === 1 && !ordemServicoId) onOrdemServico(ordens[0].id);
  }, [clienteId, ordens, ordemServicoId, onOrdemServico]);

  return (
    /*
      A mesma caixa das outras ferramentas da equipe, e pelo mesmo componente, e
      não por coincidência de classes: a Patricia pediu em 08/09/2026 que o filtro
      seja reconhecível em todas as telas. Sem os botões de ação, porque aqui
      escolher cliente e OS não é buscar, é dizer a que planejamento o arquivo vai
      pertencer, e um "Buscar" nessa escolha confundiria.
    */
    <FiltroDeBusca titulo="Escolha o cliente e a OS do planejamento" colunas={2}>
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="pt-cliente">
            Cliente
            <RequiredMark />
          </Label>
          <FieldTooltip text="O cliente para quem o planejamento foi feito. É ele que define quem enxerga esta revisão depois." />
        </div>
        <SelecaoDeCliente
          id="pt-cliente"
          clientes={clientes}
          value={clienteId}
          onChange={(v) => {
            setMexeuNoCliente(true);
            onCliente(v);
            onOrdemServico('');
          }}
          onOpenChange={(aberto) => {
            if (!aberto) setMexeuNoCliente(true);
          }}
          aria-invalid={faltaCliente || undefined}
          placeholder="Selecione um cliente"
          className="w-full min-w-0"
        />
        {faltaCliente && (
          <p className="text-sm font-medium text-destructive">Selecione um cliente</p>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label htmlFor="pt-os">
            Ordem de serviço
            <RequiredMark />
          </Label>
          <FieldTooltip text="O trabalho a que este planejamento pertence. Aparecem todas as OS do cliente, com as em andamento primeiro." />
        </div>
        <Select
          value={ordemServicoId}
          onValueChange={(v) => {
            setMexeuNaOs(true);
            onOrdemServico(v);
          }}
          onOpenChange={(aberto) => {
            if (!aberto) setMexeuNaOs(true);
          }}
          disabled={!clienteId}
        >
          <SelectTrigger id="pt-os" aria-invalid={faltaOs || undefined}>
            <SelectValue
              placeholder={
                !clienteId
                  ? 'Selecione um cliente primeiro'
                  : carregandoOs
                    ? 'Carregando…'
                    : ordens.length === 0
                      ? 'Este cliente não tem OS'
                      : 'Selecione uma ordem de serviço'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {ordens.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.numero_os ?? 'sem número'}
                {o.situacao && o.situacao !== 'em_andamento'
                  ? ` · ${SITUACAO_LABEL[o.situacao] ?? o.situacao}`
                  : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {faltaOs && (
          <p className="text-sm font-medium text-destructive">
            {ordens.length === 0
              ? 'Este cliente não tem ordem de serviço. Sem ela não é possível guardar o planejamento.'
              : 'Selecione uma ordem de serviço'}
          </p>
        )}
      </div>
    </FiltroDeBusca>
  );
}

/**
 * As revisões já importadas daquele planejamento.
 *
 * É o histórico, e existe para duas coisas: chegar num planejamento que já existe, e
 * saber que a próxima importação vai ser a versão 4 e não a primeira.
 */
/* Exportado para o teste alcançar a lista sem ter de dirigir o Select do Radix,
   que precisa de eventos de ponteiro que o jsdom não tem. */
export function Revisoes({
  estudoId,
  semProjeto = false,
}: {
  estudoId: string | null;
  /** Planejamento que existe e não aponta para projeto nenhum. */
  semProjeto?: boolean;
}) {
  const { data: revisoes = [], isLoading } = useRevisoesDoEstudo(estudoId);
  const { isAdmin } = useAuth();
  const descartar = useDescartarRevisao();

  if (!estudoId) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Este cliente e OS ainda não têm planejamento. A primeira importação cria um.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {isLoading
            ? 'Revisões…'
            : revisoes.length === 1
              ? '1 revisão importada'
              : `${revisoes.length} revisões importadas`}
        </CardTitle>
      </CardHeader>

      {/*
        **Planejamento sem projeto não avisa ninguém, e antes disso nada dizia.**
        Os planejamentos criados antes de 08/09/2026 não têm projeto, e um deles
        já existe com revisão importada: quem abrisse a tela não tinha como saber
        que aquele trabalho não chega a projeto nenhum. O texto diz o efeito e o
        conserto, que é a próxima importação.
      */}
      {semProjeto && revisoes.length > 0 && (
        <div className="mx-4 mb-3 flex items-start gap-3 rounded-md border border-warning/30 bg-warning/[0.07] px-3 py-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          <p className="text-sm text-muted-foreground">
            Este planejamento não está ligado a nenhum projeto da OS, então ninguém é avisado quando
            entra revisão. Na próxima importação a tela pergunta qual é o projeto, e isso se
            resolve.
          </p>
        </div>
      )}

      <CardContent className="divide-y divide-border/60">
        {revisoes.map((r) => (
          <div key={r.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
            <span className="text-sm font-medium tabular-nums">v{r.versao}</span>
            <span className="text-sm">{r.nome_original ?? 'sem nome'}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(r.created_at).toLocaleDateString('pt-BR')}
              {r.ano_inicial && r.ano_final ? ` · ${r.ano_inicial} a ${r.ano_final}` : ''}
              {` · mapa ${r.versao_do_mapa}`}
            </span>
            {r.problemas > 0 && (
              <span className="text-xs text-warning">
                {r.problemas === 1 ? '1 aviso' : `${r.problemas} avisos`}
              </span>
            )}
            {/*
              Só admin, e é marca e não exclusão: a revisão sai da lista e continua
              no banco. Quem subiu o arquivo errado deixa rastro, que é o que a
              auditoria existe para guardar.
            */}
            {isAdmin && estudoId && (
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto h-7 px-2 text-muted-foreground hover:text-destructive"
                disabled={descartar.isPending}
                onClick={() => {
                  if (
                    !window.confirm(
                      `Descartar a revisão ${r.versao}? Ela sai da lista e continua no banco. ` +
                        'O arquivo segue no bucket, e o mesmo arquivo não pode ser subido de novo.',
                    )
                  ) {
                    return;
                  }
                  descartar.mutate(
                    { importacaoId: r.id, estudoId, versao: r.versao },
                    {
                      onError: (causa) =>
                        toast({
                          title: 'Não consegui descartar',
                          description: causa instanceof Error ? causa.message : 'Tente de novo.',
                          variant: 'destructive',
                        }),
                    },
                  );
                }}
              >
                <Trash2 className="mr-1 h-3.5 w-3.5" />
                Descartar
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const PapelDeTrabalho = () => {
  const { estado, analise, erro, analisar, limpar } = usePapelDeTrabalhoController();
  const entrada = useRef<HTMLInputElement>(null);
  const [clienteId, setClienteId] = useState('');
  const [ordemServicoId, setOrdemServicoId] = useState('');
  const [arquivo, setArquivo] = useState<File | null>(null);

  const { data: estudos = [] } = useEstudosDoCliente(clienteId || null);
  const importar = useImportarPapelDeTrabalho();
  const vincular = useVincularProjetoAoPlanejamento();
  const [perguntandoProjeto, setPerguntandoProjeto] = useState(false);

  /* O estudo daquele par. Nulo quando ainda não existe: a primeira gravação cria. */
  const estudo = useMemo(
    () => estudos.find((e) => e.ordem_servico_id === ordemServicoId) ?? null,
    [estudos, ordemServicoId],
  );

  const escolher = () => entrada.current?.click();

  const impedimentos = analise?.decisao.impedimentos ?? [];
  const avisos = analise?.decisao.avisos ?? [];
  const aceito = analise?.decisao.veredito !== 'recusa';

  /*
   * O que falta para poder gravar, nomeado. O botão desabilitado sem dizer por quê
   * é o defeito que o `ControleBalancetes` evita listando o que falta, e aqui vale
   * o mesmo: a pessoa não adivinha se o problema é a OS ou a planilha.
   */
  const falta: string[] = [];
  if (!clienteId) falta.push('o cliente');
  if (!ordemServicoId) falta.push('a OS');
  if (!analise) falta.push('o arquivo');
  else if (!aceito) falta.push('corrigir o que impede');

  /*
   * O nome que a planilha declara contra o cliente escolhido. Não barra, avisa: o
   * WP costuma trazer razão social e o cadastro um nome curto, então divergir é
   * comum. O que não pode é subir o WP de um cliente no cadastro de outro sem
   * ninguém ver.
   */
  const clienteNoWp = analise?.leitura.cabecalho.clienteNoWp;

  /*
   * Gravar acontece em duas etapas, e a ordem importa.
   *
   * A RPC cria o planejamento quando ele ainda não existe, então na PRIMEIRA
   * revisão o id só existe depois dela voltar: não há como mandar o projeto junto.
   * Da segunda em diante o planejamento já existe e o que se faz é confirmar ou
   * trocar. As duas situações terminam num `update`, e é por isso que o vínculo
   * é passo separado em vez de parâmetro da RPC.
   *
   * **Falhar no vínculo não desfaz a revisão**, e é o desenho certo: a revisão
   * gravada é o retrato da planilha e vale por si. O que se perde é o aviso, e a
   * tela diz isso em vez de fingir que nada aconteceu.
   */
  const gravar = async (projeto: ProjetoDaOrdemDeServico) => {
    if (!analise || !arquivo || !clienteId || !ordemServicoId) return;
    try {
      const revisao = await importar.mutateAsync({
        clienteId,
        ordemServicoId,
        arquivo,
        analise,
      });

      let avisoDoVinculo: string | null = null;
      let avisados = 0;
      try {
        const vinculo = await vincular.mutateAsync({
          estudoId: revisao.estudo_id,
          projetoId: projeto.id,
          importacaoId: revisao.importacao_id,
          clienteId,
          nomeDoProjeto: projeto.name,
        });
        avisados = vinculo.sinos;
      } catch (causaDoVinculo) {
        avisoDoVinculo = extractErrorMessage(causaDoVinculo) ?? 'não consegui identificar o motivo';
      }

      setPerguntandoProjeto(false);
      toast({
        title: `Revisão ${revisao.versao} gravada`,
        description: avisoDoVinculo
          ? /*
             * A mensagem do banco já nomeia o projeto e já explica a regra, então
             * repetir o nome aqui produzia o mesmo nome três vezes na mesma frase.
             * O que falta a ela é o efeito: a revisão está salva e o aviso não saiu.
             */
            `${avisoDoVinculo} A revisão ficou salva, mas o projeto não foi avisado.`
          : `Ligada ao projeto ${projeto.name}. ` +
            (avisados === 0
              ? 'Ninguém mais está nesse projeto, então não houve quem avisar.'
              : avisados === 1
                ? '1 pessoa avisada.'
                : `${avisados} pessoas avisadas.`),
        variant: avisoDoVinculo ? 'destructive' : undefined,
      });
      limpar();
      setArquivo(null);
    } catch (causa) {
      /*
       * `causa instanceof Error` não serve aqui: o erro do Supabase é objeto
       * simples, e caía no texto genérico "Tente de novo", que é conselho errado
       * quando o motivo é arquivo repetido, porque tentar de novo falha sempre.
       * O `extractErrorMessage` é o mesmo que o resto da casa usa e alcança a
       * mensagem que a RPC escreveu.
       */
      setPerguntandoProjeto(false);
      toast({
        title: 'Não consegui gravar',
        description:
          extractErrorMessage(causa) ??
          'Não consegui identificar o motivo. Confira a conexão e tente de novo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DevLayout
      title="Papel de Trabalho"
      subtitle="Traga o papel de trabalho preenchido e o sistema confere as contas dele"
    >
      <div className="space-y-4">
        <Escolha
          clienteId={clienteId}
          onCliente={setClienteId}
          ordemServicoId={ordemServicoId}
          onOrdemServico={setOrdemServicoId}
        />

        {clienteId && ordemServicoId && (
          <Revisoes
            estudoId={estudo?.id ?? null}
            semProjeto={estudo !== null && estudo.projeto_id === null}
          />
        )}

        <input
          ref={entrada}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={(e) => {
            const escolhido = e.target.files?.[0];
            if (escolhido) {
              setArquivo(escolhido);
              void analisar(escolhido);
            }
            /* Zera para o mesmo arquivo poder ser escolhido de novo depois de um ajuste. */
            e.target.value = '';
          }}
        />

        <Card>
          <CardContent className="flex flex-wrap items-center gap-3 py-4">
            <Button onClick={escolher} disabled={estado === 'lendo'}>
              <Upload className="mr-2 h-4 w-4" />
              {estado === 'lendo' ? 'Lendo…' : 'Escolher o WP'}
            </Button>
            {analise && (
              <Button variant="ghost" onClick={limpar}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Começar de novo
              </Button>
            )}
            <p className="text-sm text-muted-foreground">
              O arquivo é lido aqui no navegador. Nada sai daqui enquanto você não confirmar.
            </p>
          </CardContent>
        </Card>

        {estado === 'vazio' && (
          <Card>
            <CardContent className="py-16 text-center">
              <FileSpreadsheet className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Escolha o papel de trabalho do planejamento: o arquivo Excel já preenchido, no
                modelo atual. O sistema vai conferir as somas, as alíquotas e os anos, e mostrar o
                que encontrou antes de guardar.
              </p>
            </CardContent>
          </Card>
        )}

        {estado === 'falhou' && erro && (
          <div className={`${CAIXA} border-destructive/40 bg-destructive/5 text-destructive`}>
            {erro}
          </div>
        )}

        {analise && (
          <>
            {impedimentos.length > 0 && (
              <Card className="border-destructive/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-destructive">
                    <ShieldAlert className="h-4 w-4" />
                    {impedimentos.length === 1
                      ? '1 coisa impede a importação'
                      : `${impedimentos.length} coisas impedem a importação`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Isto não entra no sistema. Corrija a planilha e escolha o arquivo de novo.
                  </p>
                  <ul className="space-y-1.5">
                    {impedimentos.map((p, i) => (
                      <LinhaDeProblema key={`${p.onde}-${i}`} problema={p} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {avisos.length > 0 && (
              <Card className="border-warning/40 bg-warning/10">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base text-warning">
                    <AlertTriangle className="h-4 w-4" />
                    {avisos.length === 1 ? '1 aviso' : `${avisos.length} avisos`}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    O número existe e foi lido. Dá para gravar assim e conferir depois, mas vale
                    olhar cada célula antes.
                  </p>
                  <ul className="space-y-1.5">
                    {avisos.map((p, i) => (
                      <LinhaDeProblema key={`${p.onde}-${i}`} problema={p} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Cabecalho analise={analise} />
            <DeOndeSaiCadaSlide analise={analise} />
            <ComoFoiLido analise={analise} />

            {clienteNoWp && (
              <Card>
                <CardContent className="py-3 text-sm">
                  A planilha diz que o cliente é <strong>{clienteNoWp}</strong>. Confira se é o
                  mesmo que você escolheu acima.
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="flex flex-wrap items-center gap-3 py-4">
                <Button
                  onClick={() => setPerguntandoProjeto(true)}
                  disabled={falta.length > 0 || importar.isPending}
                >
                  {importar.isPending ? 'Gravando…' : 'Confirmar e gravar a revisão'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {falta.length === 0
                    ? estudo
                      ? 'Entra como revisão nova deste planejamento. Nada é sobrescrito.'
                      : 'Cria o planejamento deste cliente e OS, na revisão 1.'
                    : `Falta ${falta.join(', ')}.`}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/*
        O modal só existe depois de a planilha ser aceita, porque escolher
        projeto de uma revisão que não vai entrar é pergunta sem sentido.
      */}
      {ordemServicoId && (
        <EscolhaDoProjeto
          aberto={perguntandoProjeto}
          onFechar={() => setPerguntandoProjeto(false)}
          ordemServicoId={ordemServicoId}
          projetoAtual={estudo?.projeto_id ?? null}
          gravando={importar.isPending || vincular.isPending}
          onConfirmar={(projeto) => void gravar(projeto)}
        />
      )}
    </DevLayout>
  );
};

export default PapelDeTrabalho;
