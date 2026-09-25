import { FolderArchive } from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { TELAS_OSG_WORK } from '@/lib/navegacaoOsgWork';
import { OrganizarDocumentos } from '@/components/equipe/osg/documentos/OrganizarDocumentos';
import { EstadoVazio } from '@/components/shared/EstadoVazio';
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
        <EstadoVazio
          titulo="Selecione um cliente na barra acima para navegar pelos documentos."
          icone={<FolderArchive className="h-10 w-10 text-muted-foreground opacity-50" />}
          acao={<span className="text-xs text-muted-foreground">A árvore de arquivos aparece aqui.</span>}
        />
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
