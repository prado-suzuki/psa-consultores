import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Pencil, Power, Blocks, Eye, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModeloBlocos, type ModeloComContagem } from '@/hooks/useModelosDocumento';
import { useBlocos, type BlocoComVersao } from '@/hooks/useBibliotecaModelos';
import { EditorBlocoDialog } from '@/components/equipe/osg/EditorBlocoDialog';
import { DocumentoCanvas } from './DocumentoCanvas';
import { BibliotecaPalette } from './BibliotecaPalette';
import { FolhaPreview } from './FolhaPreview';

type Aba = 'montagem' | 'preview';

interface Props {
  modelo: ModeloComContagem;
  modelos: ModeloComContagem[];
  onVoltar: () => void;
  onSelectModelo: (id: string) => void;
  onEditarMeta: () => void;
  onToggleAtivo: () => void;
  onDuplicar: () => void;
  duplicando?: boolean;
}

export function MontadorWorkbench({ modelo, modelos, onVoltar, onSelectModelo, onEditarMeta, onToggleAtivo, onDuplicar, duplicando }: Props) {
  const { data: docBlocos = [], isLoading } = useModeloBlocos(modelo.id);
  const { data: blocos = [] } = useBlocos();
  const [aba, setAba] = useState<Aba>('montagem');
  const [blocoEditando, setBlocoEditando] = useState<BlocoComVersao | null>(null);

  const idsNoModelo = useMemo(() => new Set(docBlocos.map((b) => b.bloco_id)), [docBlocos]);

  const abrirEdicaoBloco = (blocoId: string) => {
    const bloco = blocos.find((b) => b.id === blocoId) ?? null;
    if (bloco) setBlocoEditando(bloco);
  };

  return (
    <div className="space-y-3">
      {/* Cabeçalho compacto */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-osg-300/60 bg-card px-3 py-2.5 shadow-[0_1px_2px_hsl(var(--osg-700)/0.06)]">
        <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 text-muted-foreground" onClick={onVoltar}>
          <ArrowLeft className="h-4 w-4" /> Modelos
        </Button>

        <Select value={modelo.id} onValueChange={onSelectModelo}>
          <SelectTrigger className="h-8 w-auto min-w-[12rem] max-w-[20rem] gap-1.5 border-osg-200 font-semibold text-osg-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {modelos.map((m) => (
              <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {modelo.tipo && <Badge variant="secondary" className="text-[10px]">{modelo.tipo}</Badge>}
        {!modelo.ativo && <Badge variant="outline" className="text-[10px]">inativo</Badge>}

        {/* Abas Montagem / Pré-visualizar */}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-0.5 rounded-lg bg-osg-50 p-0.5">
            {([['montagem', 'Montagem', Blocks], ['preview', 'Pré-visualizar', Eye]] as const).map(([key, label, Icon]) => (
              <button
                key={key}
                type="button"
                onClick={() => setAba(key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  aba === key ? 'bg-card text-osg-700 shadow-sm' : 'text-muted-foreground hover:text-osg-600',
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEditarMeta} title="Editar dados do modelo">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicar} disabled={duplicando} title="Duplicar modelo">
              <Copy className={cn('h-4 w-4', duplicando && 'animate-pulse')} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onToggleAtivo} title={modelo.ativo ? 'Desativar' : 'Ativar'}>
              <Power className={cn('h-4 w-4', modelo.ativo ? 'text-osg-moss' : 'text-muted-foreground')} />
            </Button>
          </div>
        </div>
      </div>

      {modelo.descricao && <p className="px-1 text-xs text-muted-foreground">{modelo.descricao}</p>}

      {/* Corpo */}
      {aba === 'montagem' ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_minmax(300px,360px)] lg:items-start">
          <DocumentoCanvas modeloId={modelo.id} docBlocos={docBlocos} isLoading={isLoading} onEditarBloco={abrirEdicaoBloco} />
          <div className="lg:sticky lg:top-4 lg:max-h-[calc(100vh-7rem)]">
            <BibliotecaPalette documentoId={modelo.id} idsNoModelo={idsNoModelo} />
          </div>
        </div>
      ) : (
        <FolhaPreview docBlocos={docBlocos} />
      )}
      <EditorBlocoDialog
        open={blocoEditando !== null}
        bloco={blocoEditando}
        onOpenChange={(open) => { if (!open) setBlocoEditando(null); }}
      />
    </div>
  );
}
