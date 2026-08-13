import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fieldCls } from '@/components/equipe/osg/formKit';
import { Plus, X } from 'lucide-react';
import type { MatriculaRow } from '@/hooks/useDiagnosticoPatrimonial';
import type { ExploracaoImovelDraft } from '@/previews/contratosExploracaoModel';
import { Selo } from './SeloCampo';

// Aba "Imóveis e origens": uma linha por matrícula dentro do instrumento —
// achado real em `[BV-COM]` (15 imóveis, 6 instrumentos de origem distintos, um
// único contrato de composse). "Situação da origem" é estado COMPUTADO (a
// Parceria de origem ainda vigora ou já encerrou), não um campo digitado — ver
// Cláusula Quarta, Parágrafo Único do `[BV-COM]`: quando a origem encerra, o
// imóvel sai da composse sem precisar de aditivo.

interface Props {
  imoveis: ExploracaoImovelDraft[];
  onChange: (imoveis: ExploracaoImovelDraft[]) => void;
  matriculas: MatriculaRow[];
  instrumentosDeOrigem: { ref: string; label: string }[];
}

export function ExploracaoRuralImoveisTab({ imoveis, onChange, matriculas, instrumentosDeOrigem }: Props) {
  const update = (id: string, patch: Partial<ExploracaoImovelDraft>) =>
    onChange(imoveis.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  const remove = (id: string) => onChange(imoveis.filter((item) => item.id !== id));
  const add = () => {
    const proximaLetra = String.fromCharCode('a'.charCodeAt(0) + imoveis.length);
    onChange([...imoveis, { id: `imv-${Date.now()}-${imoveis.length}`, ref: proximaLetra, matriculaId: null, areaExplorada: '', instrumentoOrigemRef: null, situacaoOrigem: 'vigente' }]);
  };

  return (
    <div>
      <p className="mb-3 text-[11px] text-muted-foreground">
        Uma linha por matrícula dentro do instrumento. Os dados cartoriais são lidos do cadastro; somente a área
        explorada e a origem são próprios da relação. "Situação da origem" é um estado computado — confirmado em{' '}
        <code>[BV-COM]</code>: quando a Parceria de origem encerra, o imóvel sai da composse sem precisar de aditivo;
        não é um campo digitado.
      </p>
      <div className="overflow-x-auto rounded-md border border-osg-100">
        <Table>
          <TableHeader>
            <TableRow className="bg-osg-50/50">
              <TableHead><span className="inline-flex items-center gap-1.5">Ref. <Selo tipo="existe" /></span></TableHead>
              <TableHead><span className="inline-flex items-center gap-1.5">Imóvel / matrícula <Selo tipo="existe" /></span></TableHead>
              <TableHead><span className="inline-flex items-center gap-1.5">Área documento <Selo tipo="existe" /></span></TableHead>
              <TableHead><span className="inline-flex items-center gap-1.5">Área explorada <Selo tipo="existe" /></span></TableHead>
              <TableHead><span className="inline-flex items-center gap-1.5">Instrumento de origem <Selo tipo="novo" /></span></TableHead>
              <TableHead><span className="inline-flex items-center gap-1.5">Situação da origem <Selo tipo="novo" /></span></TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {imoveis.map((item) => {
              const matricula = matriculas.find((m) => m.id === item.matriculaId) ?? null;
              return (
                <TableRow key={item.id}>
                  <TableCell><Input value={item.ref} onChange={(e) => update(item.id, { ref: e.target.value })} className={`${fieldCls} w-14 font-mono`} /></TableCell>
                  <TableCell className="min-w-[14rem]">
                    <Select value={item.matriculaId ?? undefined} onValueChange={(v) => update(item.id, { matriculaId: v })}>
                      <SelectTrigger className={fieldCls}><SelectValue placeholder="Selecionar matrícula…" /></SelectTrigger>
                      <SelectContent>{matriculas.map((m) => <SelectItem key={m.id} value={m.id}>Matrícula {m.numero} — {m.municipio_imovel}</SelectItem>)}</SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell><Input disabled value={matricula ? `${matricula.area_documento} ${matricula.area_unidade}` : '—'} className={`${fieldCls} w-32 font-mono`} /></TableCell>
                  <TableCell><Input value={item.areaExplorada} onChange={(e) => update(item.id, { areaExplorada: e.target.value })} className={`${fieldCls} w-28 font-mono`} /></TableCell>
                  <TableCell className="min-w-[12rem]">
                    <Select value={item.instrumentoOrigemRef ?? undefined} onValueChange={(v) => update(item.id, { instrumentoOrigemRef: v })}>
                      <SelectTrigger className={fieldCls}><SelectValue placeholder="Não se aplica à parceria" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">Não se aplica à parceria</SelectItem>
                        {instrumentosDeOrigem.map((i) => <SelectItem key={i.ref} value={i.ref}>{i.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {item.situacaoOrigem === 'vigente' ? (
                      <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">vigente</Badge>
                    ) : (
                      <Badge variant="outline" className="border-osg-red/30 bg-osg-red/10 text-osg-red">encerrado c/ origem</Badge>
                    )}
                  </TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" onClick={() => remove(item.id)}><X className="h-3.5 w-3.5" /></Button></TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Button variant="outline" size="sm" className="mt-3 gap-1.5 border-dashed" onClick={add}><Plus className="h-3.5 w-3.5" />Selecionar outro imóvel</Button>
    </div>
  );
}
