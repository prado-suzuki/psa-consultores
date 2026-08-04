import { useState } from 'react';
import { AlertCircle, Loader2, Lock, PackageOpen, PenLine, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { OnboardingWorkspace } from '@/components/equipe/osg/onboarding/OnboardingWorkspace';
import { SolicitacaoAcoes } from '@/components/equipe/osg/onboarding/SolicitacaoAcoes';
import { OnboardingEmptyState } from '@/components/equipe/osg/onboarding/OnboardingEmptyState';
import { panelContainerCls } from '@/components/equipe/osg/onboarding/onboardingKit';
import { Button } from '@/components/ui/button';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useDomainSolicitacao } from '@/hooks/useDomainSolicitacao';
import type {
  CatalogoDocumento,
  EdicaoItem,
  EstruturaDoItem,
  NovoItemManual,
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
    encerrarSolicitacao,
    abrirNovaSolicitacao,
  } = useDomainSolicitacao(clienteId || null);

  /**
   * O cliente para quem o analista pediu para montar o pedido à mão.
   *
   * Guarda o id, e não um booleano, para a escolha não vazar de um cliente para
   * o outro quando ele troca de cliente na barra do topo.
   *
   * Montar à mão é caminho previsto desde a EDU-21: `solicitacao.ordem_servico_id`
   * é nulável justamente para o pedido que nasce sem OS. Mas ele fica atrás de um
   * clique para o aviso continuar aparecendo primeiro — abrir um cliente de outra
   * área tem de deixar claro que ele não é da OSG.
   */
  const [montarAMaoPara, setMontarAMaoPara] = useState<string | null>(null);

  const ativos = itens.filter((item) => item.status === 'ativo');
  const dispensados = itens.filter((item) => item.status === 'dispensado');
  const carregando = catalogo.isLoading || carregandoSolicitacao;
  const erro = catalogo.error ?? erroSolicitacao;
  const ordensServicoIds = catalogo.data?.ordensServicoIds ?? [];

  /**
   * Gera a partir de todas as OS da OSG do cliente, em sequência.
   *
   * O pedido de documentos é um por CLIENTE, não por OS — o índice único do
   * banco só admite uma solicitação não encerrada por cliente. Então, quando o
   * cliente tem mais de uma OS da OSG, o certo é somar os documentos das duas na
   * mesma lista, e não obrigar o analista a escolher de qual OS gerar.
   *
   * Em sequência e não em paralelo de propósito: a primeira chamada pode criar o
   * cabeçalho, e duas criações simultâneas esbarrariam no índice único.
   */
  const gerar = async () => {
    let criados = 0;
    for (const ordemServicoId of ordensServicoIds) {
      criados += await gerarDaOs.mutateAsync(ordemServicoId);
    }

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

  const encerrar = async () => {
    await encerrarSolicitacao.mutateAsync();
    toast.success('Solicitação encerrada');
  };

  const abrirNova = async () => {
    await abrirNovaSolicitacao.mutateAsync();
    toast.success('Nova solicitação aberta em rascunho');
  };

  const encerrada = solicitacao?.status === 'encerrada';
  const ocupado = gerarDaOs.isPending
    || enviarSolicitacao.isPending
    || encerrarSolicitacao.isPending
    || abrirNovaSolicitacao.isPending;

  const acoesDoTopo = clienteId && (solicitacao || ordensServicoIds.length > 0)
    ? (
      <SolicitacaoAcoes
        status={solicitacao?.status ?? null}
        temOrigemNaOs={ordensServicoIds.length > 0}
        listaVazia={itens.length === 0}
        itensAtivos={ativos.length}
        ocupado={ocupado}
        onGerar={gerar}
        onEnviar={enviar}
        onEncerrar={encerrar}
        onAbrirNova={abrirNova}
      />
    )
    : undefined;

  const semOrigemNaOs = !solicitacao
    && (catalogo.data?.produtosContratados.length ?? 0) === 0
    && montarAMaoPara !== clienteId;

  /** Data curta, para dizer desde quando o cliente vê a lista. */
  const emData = (iso: string | null) =>
    (iso ? new Date(iso).toLocaleDateString('pt-BR') : '');

  const subtitulo = solicitacao?.status === 'enviada'
    ? `Enviada ao cliente em ${emData(solicitacao.enviadaEm)}`
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
          className={`${panelContainerCls} flex items-center justify-center gap-3 py-16 text-sm text-slate-500`}
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
        <OnboardingEmptyState
          icon={PackageOpen}
          title="Nenhum produto OSG contratado"
          action={(
            <Button variant="outline" size="sm" onClick={() => setMontarAMaoPara(clienteId)}>
              <PenLine className="mr-2 h-4 w-4" />
              Montar solicitação à mão
            </Button>
          )}
        >
          Este cliente não tem OS com Empresa/Faturamento da OSG e produto contratado.
          Ajuste a OS no cadastro do cliente para gerar a lista a partir dela — ou monte o
          pedido à mão, que vale para o cliente e não depende da OS.
        </OnboardingEmptyState>
      ) : (
        <div className="space-y-3">
          {encerrada && (
            <div className="flex items-start gap-3 rounded-2xl border border-osg-200/70 bg-osg-50/60 p-4 text-sm text-osg-700">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-osg-500/70" />
              <p className="leading-relaxed">
                Esta solicitação foi <strong className="font-semibold">encerrada</strong>
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
            produtosContratados={catalogo.data.produtosContratados}
            somenteLeitura={encerrada}
            onAdicionarDoCatalogo={incluirDoCatalogo}
            onAdicionarManual={incluirManual}
            onEditar={editar}
            onDispensar={dispensar}
          />
        </div>
      )}
    </OsgLayout>
  );
};

export default Onboarding;
