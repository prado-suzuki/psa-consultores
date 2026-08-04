import { useState } from 'react';
import { AlertCircle, FileStack, Loader2, PackageOpen, PenLine, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { OnboardingWorkspace } from '@/components/equipe/osg/onboarding/OnboardingWorkspace';
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


  /**
   * O mesmo botão, com o verbo certo para cada momento.
   *
   * A RPC é aditiva: só insere o documento que ainda não está na solicitação,
   * nunca atualiza e nunca apaga (`WHERE NOT EXISTS` por
   * `solicitacao_id + item_padrao_id`). Então, depois que a lista existe, clicar
   * de novo é **atualizar** — é o caminho para quando alguém corrige o produto
   * contratado na OS. Nada do que o analista fez se perde: documento criado à
   * mão, instrução editada e item dispensado sobrevivem.
   */
  const listaVazia = itens.length === 0;
  const rotuloGerar = listaVazia ? 'Gerar lista a partir da OS' : 'Atualizar a partir da OS';

  const acoesDoTopo = clienteId && ordensServicoIds.length > 0
    ? (
      <Button
        size="sm"
        variant={listaVazia ? 'default' : 'outline'}
        onClick={gerar}
        disabled={gerarDaOs.isPending}
      >
        {gerarDaOs.isPending
          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          : <FileStack className="mr-2 h-4 w-4" />}
        {rotuloGerar}
      </Button>
    )
    : undefined;

  const semOrigemNaOs = !solicitacao
    && (catalogo.data?.produtosContratados.length ?? 0) === 0
    && montarAMaoPara !== clienteId;

  const subtitulo = solicitacao?.status === 'enviada'
    ? 'Solicitação enviada ao cliente'
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
        <OnboardingWorkspace
          itens={ativos}
          dispensados={dispensados}
          catalogDocuments={catalogo.data.catalogDocuments}
          catalogoPorId={catalogo.data.catalogoPorId}
          produtosContratados={catalogo.data.produtosContratados}
          onAdicionarDoCatalogo={incluirDoCatalogo}
          onAdicionarManual={incluirManual}
          onEditar={editar}
          onDispensar={dispensar}
        />
      )}
    </OsgLayout>
  );
};

export default Onboarding;
