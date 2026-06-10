import { useMemo } from 'react';
import { TextoFormatado } from '@/components/equipe/osg/TextoFormatado';
import { numerarBlocos, unirBlocos } from '@/lib/templates';
import type { DocumentoBlocoComBloco } from '@/hooks/useModelosDocumento';

interface Props {
  docBlocos: DocumentoBlocoComBloco[];
}

export function FolhaPreview({ docBlocos }: Props) {
  const estrutura = useMemo(() => {
    const blocos = docBlocos
      .filter((b) => b.bloco?.conteudo)
      .map((b) => ({ id: b.id, tipo: b.bloco!.tipo, conteudo: b.bloco!.conteudo as string }));
    return unirBlocos(numerarBlocos(blocos));
  }, [docBlocos]);

  return (
    <div className="rounded-2xl border-2 border-dashed border-osg-200 bg-osg-canvas/40 p-3 sm:p-6">
      {docBlocos.length === 0 ? (
        <p className="py-20 text-center text-sm text-muted-foreground">
          Adicione blocos na aba <span className="font-medium text-osg-600">Montagem</span> para ver a prévia do documento.
        </p>
      ) : (
        <>
          {/* Folha de papel */}
          <div className="mx-auto max-w-3xl rounded-sm border border-osg-200 bg-white px-8 py-10 shadow-[0_8px_30px_-12px_hsl(var(--osg-700)/0.25)] sm:px-14 sm:py-14">
            <div className="whitespace-pre-wrap text-justify text-sm leading-relaxed text-slate-800 [&_.campo]:rounded [&_.campo]:bg-osg-moss/10 [&_.campo]:px-1 [&_.campo]:text-osg-moss">
              <TextoFormatado texto={estrutura} />
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-3xl border-t border-osg-100 pt-3 text-xs text-muted-foreground">
            Prévia com a numeração automática (capítulos, cláusulas e parágrafos pela ordem). Os campos{' '}
            <code className="rounded bg-osg-moss/10 px-1 text-osg-moss">{'{{ }}'}</code> são preenchidos na geração do
            documento para um cliente (próxima etapa).
          </p>
        </>
      )}
    </div>
  );
}
