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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { extractErrorMessage } from '@/lib/rlsMessages';
import { useClientesList } from '@/hooks/useDevClients';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDescartarRevisao,
  useEstudosDoCliente,
  useImportarPapelDeTrabalho,
  useOrdensDeServicoDoCliente,
  useRevisoesDoEstudo,
} from '@/hooks/useDomainPapelDeTrabalho';
import { usePapelDeTrabalhoController, type Analise } from '@/hooks/usePapelDeTrabalhoController';
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

function Campo({ rotulo, valor }: { rotulo: string; valor: string | number | undefined }) {
  return (
    <div>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
        {rotulo}
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
        <CardTitle className="text-base">O que o arquivo diz de si</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Campo rotulo="Cliente no WP" valor={cabecalho.clienteNoWp} />
        <Campo rotulo="Período" valor={periodo} />
        <Campo rotulo="Ano-base" valor={cabecalho.anoBase} />
        <Campo
          rotulo="Crescimento anual"
          valor={
            cabecalho.crescimentoAnual === undefined
              ? undefined
              : `${(cabecalho.crescimentoAnual * 100).toFixed(1).replace('.', ',')}%`
          }
        />
        <Campo rotulo="Preparado por" valor={cabecalho.preparadoPor} />
        <Campo rotulo="Revisado por" valor={cabecalho.revisadoPor} />
        <Campo rotulo="Arquivo" valor={analise.nomeDoArquivo} />
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
    return `${anoInicial} a ${anoFinal} no estudo, e até ${ultimo} na venda de ativos`;
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
function DeOndeSaiCadaSlide({ analise }: { analise: Analise }) {
  const semFonte = analise.slides.filter((s) => !s.temFonte).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">De onde sai cada slide</CardTitle>
        <p className="text-sm text-muted-foreground">
          {semFonte === 0
            ? 'Todos os slides têm de onde sair.'
            : semFonte === 1
              ? '1 slide sairia vazio.'
              : `${semFonte} slides sairiam vazios.`}
        </p>
      </CardHeader>
      <CardContent className="divide-y divide-border/60">
        {analise.slides.map((s) => (
          <div
            key={s.slide}
            className="grid grid-cols-1 gap-1 py-2.5 first:pt-0 last:pb-0 md:grid-cols-[minmax(0,14rem)_minmax(0,11rem)_1fr] md:items-baseline md:gap-4"
          >
            <p className="flex items-center gap-2 text-sm font-medium">
              {s.temFonte ? (
                <Check className="h-4 w-4 shrink-0 text-success" aria-hidden />
              ) : (
                <Minus className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              {s.slide}
            </p>
            <p className="pl-6 text-sm text-muted-foreground md:pl-0">{s.fonte}</p>
            <p className={`pl-6 text-sm md:pl-0 ${s.temFonte ? '' : 'text-muted-foreground'}`}>
              {s.detalhe}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

/** Os anos e as abas, que confirmam que a leitura pegou as colunas certas. */
function ComoFoiLido({ analise }: { analise: Analise }) {
  return (
    <Card>
      <CardContent className="grid grid-cols-1 gap-4 py-4 md:grid-cols-2">
        <Campo rotulo="Anos" valor={anosPorExtenso(analise)} />
        <Campo rotulo="Abas lidas" valor={analise.resumo.abasLidas.join(' · ')} />
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
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">De quem é este estudo</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            Cliente{' '}
            <span aria-hidden className="text-destructive">
              *
            </span>
          </p>
          <Select
            value={clienteId}
            onValueChange={(v) => {
              setMexeuNoCliente(true);
              onCliente(v);
              onOrdemServico('');
            }}
            onOpenChange={(aberto) => {
              if (!aberto) setMexeuNoCliente(true);
            }}
          >
            <SelectTrigger aria-invalid={faltaCliente || undefined}>
              <SelectValue placeholder="Escolha o cliente" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {faltaCliente && (
            <p className="text-sm text-destructive">Escolha o cliente para continuar.</p>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-muted-foreground">
            Ordem de serviço{' '}
            <span aria-hidden className="text-destructive">
              *
            </span>
          </p>
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
            <SelectTrigger>
              <SelectValue
                placeholder={
                  !clienteId
                    ? 'Escolha o cliente primeiro'
                    : carregandoOs
                      ? 'Carregando…'
                      : ordens.length === 0
                        ? 'Este cliente não tem OS'
                        : 'Escolha a OS'
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
            <p className="text-sm text-destructive">
              {ordens.length === 0
                ? 'Este cliente não tem ordem de serviço. Sem ela não é possível gravar o estudo.'
                : 'Escolha a ordem de serviço para continuar.'}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * As revisões já importadas daquele estudo.
 *
 * É o histórico, e existe para duas coisas: chegar num estudo que já existe, e
 * saber que a próxima importação vai ser a versão 4 e não a primeira.
 */
/* Exportado para o teste alcançar a lista sem ter de dirigir o Select do Radix,
   que precisa de eventos de ponteiro que o jsdom não tem. */
export function Revisoes({ estudoId }: { estudoId: string | null }) {
  const { data: revisoes = [], isLoading } = useRevisoesDoEstudo(estudoId);
  const { isAdmin } = useAuth();
  const descartar = useDescartarRevisao();

  if (!estudoId) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          Este cliente e OS ainda não têm estudo. A primeira importação cria um.
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

  const gravar = async () => {
    if (!analise || !arquivo || !clienteId || !ordemServicoId) return;
    try {
      const revisao = await importar.mutateAsync({
        clienteId,
        ordemServicoId,
        arquivo,
        analise,
      });
      toast({
        title: `Revisão ${revisao.versao} gravada`,
        description: Object.entries(revisao.gravados)
          .map(([bloco, n]) => `${n} de ${bloco}`)
          .join(', '),
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
      subtitle="Confira o que o sistema entendeu do WP antes de gravar"
    >
      <div className="space-y-4">
        <Escolha
          clienteId={clienteId}
          onCliente={setClienteId}
          ordemServicoId={ordemServicoId}
          onOrdemServico={setOrdemServicoId}
        />

        {clienteId && ordemServicoId && <Revisoes estudoId={estudo?.id ?? null} />}

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
                Escolha o papel de trabalho preenchido, no modelo atual, para conferir o que o
                sistema entendeu dele.
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
                  onClick={() => void gravar()}
                  disabled={falta.length > 0 || importar.isPending}
                >
                  {importar.isPending ? 'Gravando…' : 'Confirmar e gravar a revisão'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  {falta.length === 0
                    ? estudo
                      ? 'Entra como revisão nova deste estudo. Nada é sobrescrito.'
                      : 'Cria o estudo deste cliente e OS, na revisão 1.'
                    : `Falta ${falta.join(', ')}.`}
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DevLayout>
  );
};

export default PapelDeTrabalho;
