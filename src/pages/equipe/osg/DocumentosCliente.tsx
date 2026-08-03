import { useMemo, useState } from 'react';
import { FolderArchive, FolderTree, Inbox, SlidersHorizontal } from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Card, CardContent } from '@/components/ui/card';
import { ClassificarDocumentos } from '@/components/equipe/osg/documentos/classificar/ClassificarDocumentos';
import { OrganizarDocumentos } from '@/components/equipe/osg/documentos/OrganizarDocumentos';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useDocumentosByCliente } from '@/hooks/useDocumentoArquivo';
import { contarSemDono } from '@/lib/classificarBalde';
import { cn } from '@/lib/utils';

type Modo = 'organizar' | 'classificar';

const MODOS: { value: Modo; label: string; Icon: typeof FolderTree }[] = [
  { value: 'organizar', label: 'Organizar', Icon: FolderTree },
  { value: 'classificar', label: 'Classificar', Icon: SlidersHorizontal },
];

/**
 * Hub "Documentos do Cliente" em dois modos: Organizar (a árvore por entidade) e
 * Classificar (balde → documento → ficha). A página é só a casca: cabeçalho com
 * a alternância, o contador de arquivos sem dono, e o modo escolhido.
 */
const DocumentosCliente = () => {
  const { clienteId } = useOsgWork();
  const [modo, setModo] = useState<Modo>('organizar');
  // Marcações "não é de ninguém" desta sessão. Vivem aqui para o contador do
  // cabeçalho e o balde contarem a mesma coisa.
  const [resolvidos, setResolvidos] = useState<string[]>([]);

  const { data: docs = [], isLoading } = useDocumentosByCliente(clienteId || null);
  const semDono = useMemo(() => contarSemDono(docs, resolvidos), [docs, resolvidos]);

  return (
    <OsgLayout
      title="Documentos do Cliente"
      subtitle="Todos os arquivos recebidos, organizados por entidade"
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
            modo === 'classificar' && 'h-[calc(100vh-13rem)] min-h-[560px]',
          )}
        >
          <div className="flex shrink-0 items-center gap-4 border-b border-osg-100 px-4 py-2.5">
            <div
              role="group"
              aria-label="Modo de trabalho"
              className="flex items-center gap-1 rounded-lg border border-osg-300/60 bg-osg-50/70 p-1"
            >
              {MODOS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setModo(value)}
                  aria-pressed={modo === value}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss focus-visible:ring-offset-1',
                    modo === value
                      ? 'bg-osg-moss font-semibold text-white shadow-sm'
                      : 'font-medium text-osg-600 hover:bg-white/70',
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {label}
                </button>
              ))}
            </div>

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

          {modo === 'organizar' ? (
            <OrganizarDocumentos clienteId={clienteId} />
          ) : (
            <ClassificarDocumentos
              clienteId={clienteId}
              docs={docs}
              carregando={isLoading}
              resolvidos={resolvidos}
              onResolver={(id) => setResolvidos((atual) => [...atual, id])}
              onDesfazerResolvidos={() => setResolvidos([])}
            />
          )}
        </div>
      )}
    </OsgLayout>
  );
};

export default DocumentosCliente;
