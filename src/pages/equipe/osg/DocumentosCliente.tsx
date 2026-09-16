import { FolderArchive } from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { TELAS_OSG_WORK } from '@/lib/navegacaoOsgWork';
import { Card, CardContent } from '@/components/ui/card';
import { OrganizarDocumentos } from '@/components/equipe/osg/documentos/OrganizarDocumentos';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { cn } from '@/lib/utils';

/**
 * Hub "Documentos do Cliente": a árvore de arquivos por entidade. O modo
 * Classificar saiu daqui e virou item de menu do Onboarding
 * (`/equipe/osg/work/onboarding/cadastro`).
 */
const DocumentosCliente = () => {
  const { clienteId } = useOsgWork();

  return (
    <OsgLayout
      title={TELAS_OSG_WORK.documentosCliente.label}
      subtitle={TELAS_OSG_WORK.documentosCliente.descricao}
    >
      {!clienteId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderArchive className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p className="text-sm">Selecione um cliente na barra acima para navegar pelos documentos.</p>
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            'animate-osg-rise flex flex-col overflow-hidden rounded-xl border border-osg-300/60 bg-background',
            'shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(18,88,55,0.18)]',
          )}
        >
          <OrganizarDocumentos clienteId={clienteId} />
        </div>
      )}
    </OsgLayout>
  );
};

export default DocumentosCliente;
