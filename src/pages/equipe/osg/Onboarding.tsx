import { useState } from 'react';
import { AlertCircle, Loader2, PackageOpen, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { AvisoClienteNaoNotificado } from '@/components/equipe/osg/AvisoClienteNaoNotificado';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { TELAS_OSG_WORK } from '@/lib/navegacaoOsgWork';
import { FaixaDeEstado, SeloEstadoSolicitacao } from '@/components/equipe/osg/onboarding/FaixaDeEstado';
import { OnboardingWorkspace } from '@/components/equipe/osg/onboarding/OnboardingWorkspace';
import { SolicitacaoAcoes } from '@/components/equipe/osg/onboarding/SolicitacaoAcoes';
import { SolicitacaoEncerrada } from '@/components/equipe/osg/onboarding/SolicitacaoEncerrada';
import { ModalEnviarSolicitacao } from '@/components/equipe/osg/onboarding/ModalEnviarSolicitacao';
import { ModalFinalizarSolicitacao } from '@/components/equipe/osg/onboarding/ModalFinalizarSolicitacao';
import { SolicitacaoVazia } from '@/components/equipe/osg/onboarding/SolicitacaoVazia';
import { SelecionarOsDialog } from '@/components/equipe/osg/onboarding/SelecionarOsDialog';
import { OnboardingEmptyState } from '@/components/equipe/osg/onboarding/OnboardingEmptyState';
import { panelContainerCls } from '@/components/equipe/osg/onboarding/onboardingKit';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useDomainSolicitacao, type EscolhaDoEnvio } from '@/hooks/useDomainSolicitacao';
import { useDocumentosByCliente } from '@/hooks/useDocumentoArquivo';
import { contarArquivosSemTipo } from '@/lib/checklistDerivado';
import {
  estadoDaSolicitacao,
  geracaoTemOQueTrazer,
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


  /**
   * O envio passa por modal desde 10/09/2026: o analista escolhe para quem e
   * por onde. O botão só abre a caixa; quem envia é o `onConfirmar` dela.
   */
  const [modalDeEnvio, setModalDeEnvio] = useState(false);

  const enviar = async (escolha: EscolhaDoEnvio) => {
    await enviarSolicitacao.mutateAsync(escolha);
    setModalDeEnvio(false);
    toast.success('Solicitação enviada — o cliente já vê a lista');
  };

  const virarChecklist = async () => {
    await passarParaChecklist.mutateAsync();
    toast.success('Agora o cliente vê o checklist, com upload por documento');
  };

  /**
   * A finalização passou a ter modal em 11/09/2026, pelo mesmo motivo do envio:
   * o aviso "recebemos e conferimos" saía para todo mundo sem ninguém escolher.
   * `null` só aparece em rascunho, que nunca chegou ao cliente.
   */
  const [modalDeFinalizacao, setModalDeFinalizacao] = useState(false);

  const encerrar = async (escolha: EscolhaDoEnvio | null) => {
    await encerrarSolicitacao.mutateAsync(escolha);
    setModalDeFinalizacao(false);
    toast.success('Solicitação finalizada');
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
  /**
   * O estado do ciclo já resolvido — `encerrada` separada em finalizada e
   * cancelada (plano §0). É dele que se alimentam a faixa, o selo do cabeçalho
   * e o corpo encerrado; nenhum dos três pergunta o enum de novo.
   */
  const estado = estadoDaSolicitacao(solicitacao ?? null);
  const ocupado = gerarDaOs.isPending
    || enviarSolicitacao.isPending
    || passarParaChecklist.isPending
    || encerrarSolicitacao.isPending
    || abrirNovaSolicitacao.isPending;

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

  /**
   * Com o botão no meio da tela, o do topo sai — 21/09/2026.
   *
   * Eram dois botões para o mesmo ato e com rótulos diferentes ("Gerar lista a
   * partir da OS" no topo, "Gerar os 58 documentos da OS" no meio), o que fazia
   * a tela vazia parecer ter duas saídas. Ficou a do meio, com o rótulo do topo.
   *
   * A pergunta vai ao componente do corpo e não se repete aqui: o corpo vazio
   * nem sempre traz botão, e nesse caso o do topo tem de continuar.
   */
  const geracaoNoCorpo = convidarAGerar
    && geracaoTemOQueTrazer(documentosDaOs, ordensServico.length);

  const acoesDoTopo = clienteId && (solicitacao || ordensServico.length > 0)
    ? (
      <SolicitacaoAcoes
        status={solicitacao?.status ?? null}
        temOrigemNaOs={ordensServico.length > 0}
        listaVazia={itens.length === 0}
        geracaoNoCorpo={geracaoNoCorpo}
        itensAtivos={ativos.length}
        arquivosSemTipo={contarArquivosSemTipo(documentosDoCliente)}
        ocupado={ocupado}
        onGerar={() => void gerar()}
        onEnviar={() => setModalDeEnvio(true)}
        onPassarParaChecklist={() => void virarChecklist()}
        onEncerrar={() => setModalDeFinalizacao(true)}
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
   * O subtítulo é FIXO: o texto da Patrícia (10/09/2026), e mais nada.
   *
   * Ele variava com o estado — "Enviada ao cliente em 10/09/2026", "Em fase de
   * checklist", "Encerrada em ..." —, e com isso o texto que a coordenação
   * escreveu para a tela só aparecia quando não havia solicitação, que é a
   * situação mais rara. Foi decisão minha e estava errada por dois motivos: o
   * subtítulo descreve a TELA, não o registro aberto nela; e os três estados já
   * têm faixa própria logo abaixo, com data e com o que muda em cada um. O
   * subtítulo variável repetia a faixa em versão pior.
   *
   * O TEXTO em si mora em `navegacaoOsgWork`, com o motivo de ele não trazer a
   * palavra "iniciais" e de o nome da tela não ser o "Solicitação Inicial" que a
   * spec propunha. É a mesma frase do cartão no painel de entrada, e era a
   * divergência entre as duas que originou aquele arquivo.
   */

  return (
    <OsgLayout
      title={TELAS_OSG_WORK.solicitacaoDocumentos.label}
      subtitle={TELAS_OSG_WORK.solicitacaoDocumentos.descricao}
      headerActions={acoesDoTopo}
      selo={(
        <SeloEstadoSolicitacao
          estado={estado}
          enviadaEm={solicitacao?.enviadaEm ?? null}
          encerradaEm={solicitacao?.encerradaEm ?? null}
        />
      )}
    >
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
        <div className="flex items-start gap-3 rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-5 text-destructive">
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
          {/* Primeiro de todos, e acima do "aberta desde": aquela faixa diz que o
              cliente está vendo a lista, e é justamente a impressão que precisa
              ser desmentida quando o aviso não saiu. */}
          <AvisoClienteNaoNotificado
            solicitacaoId={solicitacao?.id ?? null}
            enviadaEm={solicitacao?.enviadaEm}
          />

          {/* Encerrada é um corpo próprio — faixa, resumo e lista só-consulta no
              SolicitacaoEncerrada (§1.5) — e o workspace não renderiza: a
              superfície de trabalho não existe para um pedido que acabou. Os
              dois estados abertos ficam com a FaixaDeEstado (§1.4). */}
          {encerrada && solicitacao ? (
            <SolicitacaoEncerrada
              estado={estado === 'cancelada' ? 'cancelada' : 'finalizada'}
              encerradaEm={solicitacao.encerradaEm}
              ativos={ativos}
            />
          ) : (
            <>
              <FaixaDeEstado
                estado={estado}
                enviadaEm={solicitacao?.enviadaEm ?? null}
              />

              <OnboardingWorkspace
                itens={ativos}
                dispensados={dispensados}
                catalogDocuments={catalogo.data.catalogDocuments}
                catalogoPorId={catalogo.data.catalogoPorId}
                produtosContratados={produtosDoRail}
                produtosPorDocumento={catalogo.data.produtosPorDocumento}
                somenteLeitura={encerrada}
                status={solicitacao?.status ?? null}
                onAdicionarDoCatalogo={incluirDoCatalogo}
                onAdicionarManual={incluirManual}
                onEditar={editar}
                onDispensar={dispensar}
              />
            </>
          )}
        </div>
      )}

      <SelecionarOsDialog
        open={escolhendoOs}
        ordensServico={ordensServico}
        ocupado={ocupado}
        onOpenChange={setEscolhendoOs}
        onEscolher={(id) => void gerar(id)}
      />

      {/* Montado só quando abre: ele consulta os destinatários do cliente, e
          essa consulta não tem por que rodar em toda renderização da tela. */}
      {clienteId && modalDeEnvio && (
        <ModalEnviarSolicitacao
          aberto={modalDeEnvio}
          onFechar={() => setModalDeEnvio(false)}
          clienteId={clienteId}
          itensAtivos={ativos.length}
          enviando={enviarSolicitacao.isPending}
          onConfirmar={(escolha) => void enviar(escolha)}
        />
      )}

      {clienteId && modalDeFinalizacao && (
        <ModalFinalizarSolicitacao
          aberto={modalDeFinalizacao}
          onFechar={() => setModalDeFinalizacao(false)}
          clienteId={clienteId}
          itensAtivos={ativos.length}
          /* A mesma condição que a mutação e a borda usam: sem `enviada_em` o
             pedido nunca chegou ao cliente, e não há o que avisar. */
          jaEnviada={Boolean(solicitacao?.enviadaEm)}
          encerrando={encerrarSolicitacao.isPending}
          onConfirmar={(escolha) => void encerrar(escolha)}
        />
      )}
    </OsgLayout>
  );
};

export default Onboarding;
