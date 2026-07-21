import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { GerarDocumentoEscolhas } from '@/components/equipe/osg/gerar/GerarDocumentoEscolhas';
import { PainelConferencia } from '@/components/equipe/osg/gerar/PainelConferencia';
import { DocumentoCentroRail } from '@/components/equipe/osg/gerar/DocumentoCentroRail';
import { GerarDocumentoDialogs } from '@/components/equipe/osg/gerar/GerarDocumentoDialogs';
import { useGerarDocumentoController } from '@/hooks/useGerarDocumentoController';
import { cn } from '@/lib/utils';

const GerarDocumento = () => {
  const controller = useGerarDocumentoController();

  return (
    <OsgLayout
      title="Gerar Documento"
      subtitle="Etapa final da oficina: escolha o modelo e a empresa — o documento sai pronto, preenchido do cadastro"
    >
      <div className="space-y-6 py-2">
        {!controller.modoDocumento && <GerarDocumentoEscolhas controller={controller} />}
        {controller.modoDocumento && (
          <section className="animate-osg-rise motion-reduce:animate-none">
            <div
              className={cn(
                'mx-auto grid max-w-[1400px] grid-cols-1 items-start gap-6',
                controller.temPainel
                  ? 'xl:grid-cols-[330px_minmax(0,1fr)_240px]'
                  : 'xl:grid-cols-[minmax(0,1fr)_240px]',
              )}
            >
              <PainelConferencia controller={controller} />
              <DocumentoCentroRail controller={controller} />
            </div>
          </section>
        )}
      </div>
      <GerarDocumentoDialogs controller={controller} />
    </OsgLayout>
  );
};

export default GerarDocumento;
