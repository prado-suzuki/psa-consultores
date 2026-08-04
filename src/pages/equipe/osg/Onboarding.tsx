import { AlertCircle, FileStack, Loader2, PackageOpen, Rocket } from 'lucide-react';
import { toast } from 'sonner';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { OnboardingWorkspace } from '@/components/equipe/osg/onboarding/OnboardingWorkspace';
import { OnboardingEmptyState } from '@/components/equipe/osg/onboarding/OnboardingEmptyState';
import { panelContainerCls } from '@/components/equipe/osg/onboarding/onboardingKit';
import { Button } from '@/components/ui/button';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useDomainSolicitacao } from '@/hooks/useDomainSolicitacao';
import type { CatalogoDocumento, EdicaoItem, NovoItemManual } from '@/lib/solicitacao';

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

  const ativos = itens.filter((item) => item.status === 'ativo');
  const dispensados = itens.length - ativos.length;
  const carregando = catalogo.isLoading || carregandoSolicitacao;
  const erro = catalogo.error ?? erroSolicitacao;
  const ordensServico = catalogo.data?.ordensServico ?? [];

  const gerar = async (ordemServicoId: string) => {
    const criados = await gerarDaOs.mutateAsync(ordemServicoId);
    toast.success(criados > 0
      ? `${criados} documento(s) incluído(s) a partir da OS`
      : 'A OS não trouxe documento novo — a lista já estava completa');
  };

  const incluirDoCatalogo = async (doCatalogo: CatalogoDocumento) => {
    await adicionarDoCatalogo.mutateAsync(doCatalogo);
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

  const acoesDoTopo = clienteId && ordensServico.length > 0
    ? ordensServico.map((ordem) => (
      <Button
        key={ordem.id}
        size="sm"
        variant={itens.length === 0 ? 'default' : 'outline'}
        onClick={() => gerar(ordem.id)}
        disabled={gerarDaOs.isPending}
      >
        {gerarDaOs.isPending
          ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          : <FileStack className="mr-2 h-4 w-4" />}
        {ordensServico.length > 1 && ordem.numeroOs
          ? `Gerar da OS ${ordem.numeroOs}`
          : 'Gerar da OS'}
      </Button>
    ))
    : undefined;

  const subtitulo = solicitacao?.status === 'enviada'
    ? 'Solicitação enviada ao cliente'
    : 'Solicitação inicial de documentos ao cliente';

  return (
    <OsgLayout title="Onboarding" subtitle={subtitulo} headerActions={acoesDoTopo}>
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
      ) : !solicitacao && catalogo.data.produtosContratados.length === 0 ? (
        <OnboardingEmptyState icon={PackageOpen} title="Nenhum produto OSG contratado">
          Este cliente não tem OS com Empresa/Faturamento da OSG e produto contratado.
          Ajuste a OS para gerar a solicitação a partir dela, ou inclua documentos um a
          um.
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
