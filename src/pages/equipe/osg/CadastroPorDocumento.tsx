import { useMemo, useState } from 'react';
import { FolderArchive, Inbox } from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ClassificarDocumentos } from '@/components/equipe/osg/documentos/classificar/ClassificarDocumentos';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useDocumentosByCliente } from '@/hooks/useDocumentoArquivo';
import { contarSemDono } from '@/lib/classificarBalde';
import { cn } from '@/lib/utils';

/**
 * Etapa do onboarding em que os arquivos que chegaram viram cadastro: balde à
 * esquerda, documento no centro, ficha à direita. Saiu de trás do toggle do
 * explorador de arquivos e passou a ser item de menu próprio — a página é só a
 * casca (contador de arquivos sem dono + a tela).
 */
const CadastroPorDocumento = () => {
  const { clienteId } = useOsgWork();
  // Marcações "não é de ninguém" desta sessão. Vivem aqui para o contador do
  // cabeçalho e o balde contarem a mesma coisa.
  const [resolvidos, setResolvidos] = useState<string[]>([]);

  const { data: docs = [], isLoading } = useDocumentosByCliente(clienteId || null);
  const semDono = useMemo(() => contarSemDono(docs, resolvidos), [docs, resolvidos]);

  return (
    <OsgLayout
      title="Cadastro por Documento"
      subtitle="Abra um arquivo sem dono e cadastre a entidade a partir dele"
    >
      {!clienteId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FolderArchive className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p className="text-sm">Selecione um cliente na barra acima para começar pelos documentos recebidos.</p>
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            'animate-osg-rise flex h-[calc(100vh-13rem)] min-h-[560px] flex-col overflow-hidden',
            'rounded-xl border border-osg-300/60 bg-background',
            'shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-12px_rgba(18,88,55,0.18)]',
          )}
        >
          <div className="flex shrink-0 items-center gap-4 border-b border-osg-100 px-4 py-2.5">
            <p
              aria-live="polite"
              className="ml-auto flex items-center gap-2 rounded-full border border-osg-300/60 bg-osg-50 px-3 py-1.5 text-[12px] font-semibold text-osg-700"
            >
              <Inbox className="h-3.5 w-3.5 text-osg-600" aria-hidden />
              <span className="tabular-nums">
                {isLoading
                  ? 'contando arquivos sem dono…'
                  : `${semDono} ${semDono === 1 ? 'arquivo sem dono' : 'arquivos sem dono'}`}
              </span>
            </p>
          </div>

          <ClassificarDocumentos
            clienteId={clienteId}
            docs={docs}
            carregando={isLoading}
            resolvidos={resolvidos}
            onResolver={(id) => setResolvidos((atual) => [...atual, id])}
            onDesfazerResolvidos={() => setResolvidos([])}
          />
        </div>
      )}
    </OsgLayout>
  );
};

export default CadastroPorDocumento;
