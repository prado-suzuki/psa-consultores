import { useState } from 'react';
import { AlertCircle, Loader2, Rocket, Send } from 'lucide-react';
import { toast } from 'sonner';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import {
  OnboardingWorkspace,
  type OnboardingDraft,
} from '@/components/equipe/osg/onboarding/OnboardingWorkspace';
import { OnboardingEmptyState } from '@/components/equipe/osg/onboarding/OnboardingEmptyState';
import { panelContainerCls } from '@/components/equipe/osg/onboarding/onboardingKit';
import { Button } from '@/components/ui/button';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useOnboarding, useSendOnboarding } from '@/hooks/useOnboarding';

const Onboarding = () => {
  const { clienteId } = useOsgWork();
  const { data, isLoading, error } = useOnboarding(clienteId || null);
  const [draft, setDraft] = useState<OnboardingDraft | null>(null);
  const sendOnboarding = useSendOnboarding(clienteId || null);

  const sendRequest = async () => {
    if (!draft?.documents.length) {
      toast.error('Inclua ao menos um documento na solicitação.');
      return;
    }

    try {
      const result = await sendOnboarding.mutateAsync(draft.documents);
      toast.success('Solicitação enviada com sucesso', {
        description: `${result.total} item(ns) no checklist: ${result.created} novo(s) e ${result.updated} atualizado(s).`,
      });
    } catch (sendError) {
      toast.error('Não foi possível enviar a solicitação', {
        description: sendError instanceof Error
          ? sendError.message
          : 'Tente novamente em instantes.',
      });
    }
  };

  return (
    <OsgLayout
      title="Solicitação Inicial"
      subtitle="Solicitação inicial de documentos ao cliente"
      headerActions={clienteId ? (
        <Button
          size="sm"
          onClick={sendRequest}
          disabled={!data || !draft?.documents.length || sendOnboarding.isPending}
        >
          {sendOnboarding.isPending
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <Send className="mr-2 h-4 w-4" />}
          {sendOnboarding.isPending ? 'Enviando...' : 'Enviar solicitação'}
        </Button>
      ) : undefined}
    >
      {!clienteId ? (
        <OnboardingEmptyState icon={Rocket} title="Selecione um cliente">
          Use a barra acima para carregar os produtos contratados e preparar a solicitação
          inicial de documentos.
        </OnboardingEmptyState>
      ) : isLoading ? (
        <div
          className={`${panelContainerCls} flex items-center justify-center gap-3 py-16 text-sm text-slate-500`}
        >
          <Loader2 className="h-5 w-5 animate-spin text-osg-moss" />
          Carregando catálogo e produtos contratados...
        </div>
      ) : error || !data ? (
        <div className="flex items-start gap-3 rounded-2xl border border-osg-red/30 bg-osg-red/[0.04] p-5 text-osg-red">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Não foi possível carregar o onboarding.</p>
            <p className="mt-1 text-sm opacity-80">
              {error instanceof Error ? error.message : 'Tente novamente em instantes.'}
            </p>
          </div>
        </div>
      ) : (
        <OnboardingWorkspace key={clienteId} data={data} onDraftChange={setDraft} />
      )}
    </OsgLayout>
  );
};

export default Onboarding;
