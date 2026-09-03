import { useState } from 'react';
import { AlertCircle, ListChecks, Loader2, Lock, PackageOpen, Rocket, Send } from 'lucide-react';
import { toast } from 'sonner';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { OnboardingWorkspace } from '@/components/equipe/osg/onboarding/OnboardingWorkspace';
import { SolicitacaoAcoes } from '@/components/equipe/osg/onboarding/SolicitacaoAcoes';
import { SolicitacaoVazia } from '@/components/equipe/osg/onboarding/SolicitacaoVazia';
import { SelecionarOsDialog } from '@/components/equipe/osg/onboarding/SelecionarOsDialog';
import { OnboardingEmptyState } from '@/components/equipe/osg/onboarding/OnboardingEmptyState';
import { panelContainerCls } from '@/components/equipe/osg/onboarding/onboardingKit';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useDomainSolicitacao } from '@/hooks/useDomainSolicitacao';
import { useDocumentosByCliente } from '@/hooks/useDocumentoArquivo';
import { contarArquivosSemTipo } from '@/lib/checklistDerivado';
import {
  type CatalogoDocumento,
  type EdicaoItem,
  type EstruturaDoItem,
  type NovoItemManual,
} from '@/lib/solicitacao';

/**
 * Tela de montagem do pedido de documentos.
 *
 * O rascunho vive no banco: não há mais estado de rascunho aqui nem botão que
 * grava tudo de uma vez no fim. Abrir a tela mostra o que está gravado; cada
 * ação grava na hora. Enviar e encerrar são a ALE-30.
 */
const Onboarding = () => {
  const { clienteId } = useOsgWork();
  const catalogo = useOnboarding(clienteId || null);
  const {
    solicitacao,
    itens,
    isLoading: carregandoSolicitacao,
    error: erroSolicitacao,
    gerarDaOs,
    adicionarDoCatalogo,
    adicionarManual,
    editarItem,
    dispensarItem,
    enviarSolicitacao,
    passarParaChecklist,
    encerrarSolicitacao,
    abrirNovaSolicitacao,
  } = useDomainSolicitacao(clienteId || null);

  /**
   * Só para avisar na confirmação da virada: arquivo sem tipo é invisível para a
   * subtração, e o checklist do cliente cobraria o que ele já entregou.
   */
  const { data: documentosDoCliente = [] } = useDocumentosByCliente(clienteId || null);

  const [escolhendoOs, setEscolhendoOs] = useState(false);

  const ativos = itens.filter((item) => item.status === 'ativo');
  const dispensados = itens.filter((item) => item.status === 'dispensado');
  const carregando = catalogo.isLoading || carregandoSolicitacao;
  const erro = catalogo.error ?? erroSolicitacao;
  const ordensServico = catalogo.data?.ordensServico ?? [];

  /**
   * Quantos documentos a geração traria — da OS que já gerou esta solicitação, ou
   * da única OS do cliente quando a lista está vazia.
   *
   * Com mais de uma OS e nada gerado ainda, não há número honesto a prometer: o
   * total depende de qual OS o consultor escolher no modal.
   */
  const osDaSolicitacao = solicitacao?.ordemServicoId
    ? ordensServico.find((os) => os.id === solicitacao.ordemServicoId)
    : undefined;
  const documentosDaOs = osDaSolicitacao?.documentos
    ?? (ordensServico.length === 1 ? ordensServico[0].documentos : 0);

  /**
   * O rail mostra os produtos da OS que gerou a solicitação.
   *
   * Sem OS registrada cai em todos os produtos da OSG do cliente, que é o melhor
   * recorte disponível sem inventar vínculo. Isso alcança só as solicitações
   * antigas: as novas nascem da OS e já chegam com a coluna preenchida.
   */
  const produtosDoRail = osDaSolicitacao?.produtos
    ?? catalogo.data?.produtosContratados
    ?? [];

  /**
   * Gera a partir de UMA OS.
   *
   * Antes somava todas em silêncio, e nem o consultor nem a solicitação — que
   * guarda um `solicitacao.ordem_servico_id` só — sabiam de onde os documentos
   * vinham. Com mais de uma OS, o modal pergunta; com uma, gera direto.
   */
  const gerar = async (ordemServicoId?: string) => {
    const alvo = ordemServicoId
      ?? solicitacao?.ordemServicoId
      ?? (ordensServico.length === 1 ? ordensServico[0].id : null);

    if (!alvo) {
      setEscolhendoOs(true);
      return;
    }

    const criados = await gerarDaOs.mutateAsync(alvo);
    setEscolhendoOs(false);

    if (criados > 0) {
      toast.success(`${criados} documento(s) incluído(s) a partir da OS`);
      return;
    }

    // Dizer "a lista está completa" quando há item dispensado seria falso: o
    // documento está fora da lista, e a atualização não o traz de volta —
    // dispensar é decisão do analista e a RPC não a desfaz.
    const dispensadosDoCatalogo = dispensados.filter((item) => item.doCatalogo).length;
    toast.success(dispensadosDoCatalogo > 0
      ? `A OS não trouxe documento novo. ${dispensadosDoCatalogo} documento(s) da OS `
        + 'seguem dispensados e não voltam pela atualização.'
      : 'A OS não trouxe documento novo — a lista já está completa');
  };

  const incluirDoCatalogo = async (
    doCatalogo: CatalogoDocumento,
    estrutura?: EstruturaDoItem,
  ) => {
    await adicionarDoCatalogo.mutateAsync({ catalogo: doCatalogo, estrutura });
    toast.success(`"${doCatalogo.documento}" incluído na solicitação`);
  };

  const incluirManual = async (entrada: NovoItemManual) => {
    await adicionarManual.mutateAsync(entrada);
    toast.success(`"${entrada.documento}" incluído na solicitação`);
  };

  const editar = async (id: string, edicao: EdicaoItem) => {
    const alterou = await editarItem.mutateAsync({ id, edicao });
    if (alterou) toast.success('Documento atualizado nesta solicitação');
  };

  const dispensar = async (id: string) => {
    await dispensarItem.mutateAsync({ id });
    toast.success('Documento dispensado desta solicitação');
  };


  const enviar = async () => {
    await enviarSolicitacao.mutateAsync();
    toast.success('Solicitação enviada — o cliente já vê a lista');
  };

  const virarChecklist = async () => {
    await passarParaChecklist.mutateAsync();
    toast.success('Agora o cliente vê o checklist, com upload por documento');
  };

  const encerrar = async () => {
    await encerrarSolicitacao.mutateAsync();
    toast.success('Solicitação encerrada');
  };

  /**
   * A OS vai junto porque a RLS de escrita de `solicitacao` exige — ver o
   * comentário em `abrirNovaSolicitacao`.
   *
   * Com mais de uma OS, pega a de maior `numero_os`, que é a última da lista já
   * ordenada por esse campo. É padrão determinístico e não escolha: quem decide de
   * qual OS a lista sai é o consultor no passo de gerar, que já pergunta.
   */
  const abrirNova = async () => {
    const os = ordensServico.at(-1);
    if (!os) {
      toast.error('Este cliente não tem ordem de serviço da OSG.');
      return;
    }
    await abrirNovaSolicitacao.mutateAsync(os.id);
    toast.success('Nova solicitação aberta em rascunho');
  };

  const encerrada = solicitacao?.status === 'encerrada';
  const emChecklist = solicitacao?.status === 'em_checklist';
  const ocupado = gerarDaOs.isPending
    || enviarSolicitacao.isPending
    || passarParaChecklist.isPending
    || encerrarSolicitacao.isPending
    || abrirNovaSolicitacao.isPending;

  const acoesDoTopo = clienteId && (solicitacao || ordensServico.length > 0)
    ? (
      <SolicitacaoAcoes
        status={solicitacao?.status ?? null}
        temOrigemNaOs={ordensServico.length > 0}
        listaVazia={itens.length === 0}
        itensAtivos={ativos.length}
        arquivosSemTipo={contarArquivosSemTipo(documentosDoCliente)}
        ocupado={ocupado}
        onGerar={() => void gerar()}
        onEnviar={enviar}
        onPassarParaChecklist={() => void virarChecklist()}
        onEncerrar={encerrar}
        onAbrirNova={abrirNova}
      />
    )
    : undefined;

  /**
   * Cliente sem produto OSG contratado: a tela informa e para aí.
   *
   * Não há mais botão de montar à mão. Sem produto não há o que pedir, e criar um
   * cabeçalho aqui produziria uma solicitação sem OS — exatamente o que fazia
   * `solicitacao.ordem_servico_id` ficar nulo e ninguém saber de onde a lista
   * vinha. O caminho é corrigir a OS no cadastro do cliente.
   */
  const semOrigemNaOs = !solicitacao
    && (catalogo.data?.produtosContratados.length ?? 0) === 0;

  /**
   * Lista em zero num cliente que TEM OS da OSG: o corpo convida a gerar.
   *
   * Cobre os três caminhos que chegam a zero — nunca gerou, encerrou e abriu
   * outra, ou dispensou tudo e a lista voltou a ficar vazia — e sai do ar assim
   * que existir o primeiro item, porque aí o número prometido pela geração
   * deixaria de bater.
   *
   * Encerrada fica de fora: ela não recebe item novo, e o topo já oferece "Abrir
   * nova solicitação".
   */
  const convidarAGerar = !encerrada
    && itens.length === 0
    && ordensServico.length > 0;

  /** Data curta, para dizer desde quando o cliente vê a lista. */
  const emData = (iso: string | null) =>
    (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

  const subtitulo = solicitacao?.status === 'enviada'
    ? `Enviada ao cliente em ${emData(solicitacao.enviadaEm)}`
    : emChecklist
      ? 'Em fase de checklist: o cliente envia por documento que falta'
      : encerrada
        ? `Encerrada em ${emData(solicitacao?.encerradaEm ?? null)}`
        : 'Solicitação inicial de documentos ao cliente';

  return (
    <OsgLayout title="Solicitação Inicial" subtitle={subtitulo} headerActions={acoesDoTopo}>
      {!clienteId ? (
        <OnboardingEmptyState icon={Rocket} title="Selecione um cliente">
          Use a barra acima para carregar a solicitação de documentos deste cliente.
        </OnboardingEmptyState>
      ) : carregando ? (
        <div
          className={`${panelContainerCls} flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground`}
        >
          <Loader2 className="h-5 w-5 animate-spin text-osg-moss" />
          Carregando a solicitação e o catálogo...
        </div>
      ) : erro || !catalogo.data ? (
        <div className="flex items-start gap-3 rounded-2xl border border-osg-red/30 bg-osg-red/[0.04] p-5 text-osg-red">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Não foi possível carregar o onboarding.</p>
            <p className="mt-1 text-sm opacity-80">
              {erro instanceof Error ? erro.message : 'Tente novamente em instantes.'}
            </p>
          </div>
        </div>
      ) : semOrigemNaOs ? (
        <OnboardingEmptyState icon={PackageOpen} title="Nenhum produto OSG contratado">
          Nenhuma OS deste cliente contrata produto da OSG. A solicitação sai dos produtos da
          OS, então não há o que pedir enquanto isso não existir — e note que quem decide é o
          produto contratado, não a empresa que fatura. Cadastre ou ajuste a OS no cadastro do
          cliente e volte aqui.
        </OnboardingEmptyState>
      ) : convidarAGerar ? (
        <SolicitacaoVazia
          documentosDaOs={documentosDaOs}
          ordensServico={ordensServico.length}
          ocupado={ocupado}
          onGerar={() => void gerar()}
        />
      ) : (
        <div className="space-y-3">
          {solicitacao?.status === 'enviada' && (
            <div className="flex items-start gap-3 rounded-2xl border border-osg-200/70 bg-osg-50/60 p-4 text-sm text-osg-700">
              <Send className="mt-0.5 h-4 w-4 shrink-0 text-osg-moss/70" />
              <p className="leading-relaxed">
                Solicitação <strong className="font-semibold">aberta desde{' '}
                {emData(solicitacao.enviadaEm)}</strong> — o cliente vê a lista e pode
                enviar os arquivos. Incluir documentos agora também chega até ele; o
                pedido só fecha quando você encerrar.
              </p>
            </div>
          )}

          {emChecklist && (
            <div className="flex items-start gap-3 rounded-2xl border border-osg-200/70 bg-osg-50/60 p-4 text-sm text-osg-700">
              <ListChecks className="mt-0.5 h-4 w-4 shrink-0 text-osg-moss/70" />
              <p className="leading-relaxed">
                Esta solicitação está <strong className="font-semibold">em fase de
                checklist</strong>: a tela do cliente mostra o que falta, de quem é cada
                documento, e o envio dele já chega classificado. Incluir documento aqui
                continua chegando até ele, e é o normal desta fase. O pedido só fecha
                quando você encerrar.
              </p>
            </div>
          )}

          {encerrada && (
            <div className="flex items-start gap-3 rounded-2xl border border-osg-200/70 bg-osg-50/60 p-4 text-sm text-osg-700">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-osg-500/70" />
              <p className="leading-relaxed">
                Esta solicitação foi <strong className="font-semibold">finalizada</strong>
                {solicitacao?.encerradaEm ? ` em ${emData(solicitacao.encerradaEm)}` : ''} e
                está só para consulta. O cliente continua vendo os arquivos que enviou, mas
                não envia mais nada. Para pedir outros documentos, abra uma nova solicitação
                pelo botão no topo.
              </p>
            </div>
          )}

          <OnboardingWorkspace
            itens={ativos}
            dispensados={dispensados}
            catalogDocuments={catalogo.data.catalogDocuments}
            catalogoPorId={catalogo.data.catalogoPorId}
            produtosContratados={produtosDoRail}
            produtosPorDocumento={catalogo.data.produtosPorDocumento}
            somenteLeitura={encerrada}
            onAdicionarDoCatalogo={incluirDoCatalogo}
            onAdicionarManual={incluirManual}
            onEditar={editar}
            onDispensar={dispensar}
          />
        </div>
      )}

      <SelecionarOsDialog
        open={escolhendoOs}
        ordensServico={ordensServico}
        ocupado={ocupado}
        onOpenChange={setEscolhendoOs}
        onEscolher={(id) => void gerar(id)}
      />
    </OsgLayout>
  );
};

export default Onboarding;
