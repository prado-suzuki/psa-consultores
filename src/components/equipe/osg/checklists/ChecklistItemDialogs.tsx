import { useMemo, useState } from 'react';
import { Check, FileText, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';
import type { ChecklistClienteRow, ChecklistPadraoRow } from '@/hooks/useOsgChecklist';

type PessoaOption = { id: string; denominacao: string | null; tipo_pessoa: string };
type BemOption = { id: string; referencia_dp: string; denominacao: string };
type MatriculaOption = { id: string; numero: string };

export type AddChecklistArgs = {
  padrao: ChecklistPadraoRow;
  pessoaId?: string | null;
  bemId?: string | null;
  matriculaId?: string | null;
};

export function AddCondicionalDialog({
  open, onOpenChange, padrao, pessoas, bens, matriculas, onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  padrao: ChecklistPadraoRow[];
  pessoas: PessoaOption[];
  bens: BemOption[];
  matriculas: MatriculaOption[];
  onConfirm: (args: AddChecklistArgs[]) => void;
}) {
  const condicionais = useMemo(
    () => padrao.filter((item) => !item.obrigatorio_default).sort((a, b) => a.ordem - b.ordem),
    [padrao],
  );
  const [padraoId, setPadraoId] = useState('');
  const [instIds, setInstIds] = useState<string[]>([]);
  const selecionado = condicionais.find((item) => item.id === padraoId) ?? null;
  const granularidade = selecionado?.granularidade ?? 'cliente';

  const opcoes = useMemo(() => {
    if (granularidade === 'pessoa_pf') {
      return pessoas.filter((pessoa) => pessoa.tipo_pessoa === 'PF').map((pessoa) => ({ id: pessoa.id, label: pessoa.denominacao ?? 'Pessoa' }));
    }
    if (granularidade === 'pessoa_pj') {
      return pessoas.filter((pessoa) => pessoa.tipo_pessoa === 'PJ').map((pessoa) => ({ id: pessoa.id, label: pessoa.denominacao ?? 'Empresa' }));
    }
    if (granularidade === 'matricula_rural' || granularidade === 'matricula_urbana') {
      return matriculas.map((matricula) => ({ id: matricula.id, label: `Matrícula ${matricula.numero}` }));
    }
    if (granularidade === 'bem') {
      return bens.map((bem) => ({ id: bem.id, label: [bem.referencia_dp, bem.denominacao].filter(Boolean).join(' — ') }));
    }
    return [];
  }, [granularidade, pessoas, bens, matriculas]);

  const reset = () => {
    setPadraoId('');
    setInstIds([]);
  };
  const toggle = (id: string) => setInstIds((current) => (
    current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]
  ));
  const criarArgumento = (id: string): AddChecklistArgs => {
    const argumento: AddChecklistArgs = { padrao: selecionado! };
    if (granularidade === 'pessoa_pf' || granularidade === 'pessoa_pj') argumento.pessoaId = id;
    else if (granularidade === 'matricula_rural' || granularidade === 'matricula_urbana') argumento.matriculaId = id;
    else if (granularidade === 'bem') argumento.bemId = id;
    return argumento;
  };
  const confirmar = () => {
    if (!selecionado) return;
    onConfirm(instIds.length ? instIds.map(criarArgumento) : [{ padrao: selecionado }]);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { onOpenChange(nextOpen); if (!nextOpen) reset(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar documento</DialogTitle>
          <DialogDescription>Escolha um documento condicional e aplique-o às entidades necessárias.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Documento</Label>
            <Select value={padraoId} onValueChange={(value) => { setPadraoId(value); setInstIds([]); }}>
              <SelectTrigger><SelectValue placeholder="Selecione o documento" /></SelectTrigger>
              <SelectContent>
                {condicionais.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.entidade} · {item.documento}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selecionado && opcoes.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-xs">Aplicar a</Label>
                <div className="flex gap-3 text-[11px]">
                  <button type="button" className="font-semibold text-osg-moss hover:underline" onClick={() => setInstIds(opcoes.map((opcao) => opcao.id))}>Selecionar todos</button>
                  <button type="button" className="text-osg-500 hover:underline" onClick={() => setInstIds([])}>Limpar</button>
                </div>
              </div>
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-osg-200/80 bg-osg-50/30 p-1.5">
                {opcoes.map((opcao) => {
                  const marcado = instIds.includes(opcao.id);
                  return (
                    <button
                      key={opcao.id}
                      type="button"
                      aria-pressed={marcado}
                      onClick={() => toggle(opcao.id)}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition-colors',
                        marcado ? 'bg-osg-100 text-osg-700' : 'text-osg-600 hover:bg-white',
                      )}
                    >
                      <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded border', marcado ? 'border-osg-moss bg-osg-moss text-white' : 'border-osg-300')}>
                        {marcado && <Check className="h-3 w-3" />}
                      </span>
                      {opcao.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {selecionado?.nota && <p className="text-xs leading-relaxed text-osg-500">{selecionado.nota}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={confirmar} disabled={!selecionado}>Adicionar{instIds.length > 1 ? ` (${instIds.length})` : ''}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function VincularDocumentoDialog({
  item, documentos, onOpenChange, onVincular,
}: {
  item: ChecklistClienteRow | null;
  documentos: DocumentoArquivoRow[];
  onOpenChange: (open: boolean) => void;
  onVincular: (documentoId: string, itemId: string | null) => void;
}) {
  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Vincular documento</DialogTitle>
          <DialogDescription>Escolha o arquivo que atende a <strong>{item?.documento}</strong>.</DialogDescription>
        </DialogHeader>
        <div className="max-h-80 space-y-1.5 overflow-y-auto">
          {documentos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-osg-200 py-8 text-center text-sm text-osg-500">
              <FileText className="h-6 w-6 text-osg-300" />
              Nenhum arquivo anexado a este cliente.
            </div>
          ) : documentos.map((documento) => {
            const vinculado = item?.arquivos.some((arquivo) => arquivo.id === documento.id) ?? false;
            return (
              <div key={documento.id} className="flex items-center gap-3 rounded-xl border border-osg-100 bg-white px-3 py-2.5 text-sm">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-osg-50 text-osg-moss"><FileText className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1 truncate text-osg-700">{documento.nome_original}</span>
                <Button
                  variant={vinculado ? 'ghost' : 'outline'}
                  size="sm"
                  className={vinculado ? 'text-osg-red' : ''}
                  onClick={() => item && onVincular(documento.id, vinculado ? null : item.id)}
                >
                  <Link2 className="mr-1.5 h-3.5 w-3.5" />{vinculado ? 'Desvincular' : 'Vincular'}
                </Button>
              </div>
            );
          })}
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
