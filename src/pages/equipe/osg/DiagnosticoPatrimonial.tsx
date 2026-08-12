import { useMemo, useState } from 'react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { Plus, Pencil, Trash2, Search, Landmark, Loader2 } from 'lucide-react';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { rowActivateProps } from '@/hooks/rowActivateProps';
import { usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import {
  useBensByCliente,
  useDeleteBem,
  useMatriculasByBem,
  TIPO_BEM_OPTIONS,
  type BemRow,
} from '@/hooks/useDiagnosticoPatrimonial';
import { BemModal } from '@/components/equipe/osg/diagnostico-patrimonial/BemModal';
// A lista mostra um número derivado; `origemDoValor` é o que o consultor lê no
// tooltip para saber de onde ele veio (e por que não há campo editável no bem
// com matrícula), inclusive quando a soma é parcial.
import { origemDoValor, totalizarValoresDosBens } from '@/lib/osg/valoresDoBem';

const formatBrl = (v: number | null | undefined) =>
  v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const DiagnosticoPatrimonial = () => {
  const { clienteId } = useOsgWork();
  const [busca, setBusca] = useState('');
  const [filtroTipo, setFiltroTipo] = useState<string>('__todos__');

  const { data: bens = [], isLoading: loadingBens } = useBensByCliente(clienteId || null);
  const { data: pessoasCliente = [] } = usePessoasByCliente(clienteId || null);

  const deleteBem = useDeleteBem();

  const [bemModal, setBemModal] = useState<{ open: boolean; bem: BemRow | null }>({
    open: false, bem: null,
  });
  const [bemParaExcluir, setBemParaExcluir] = useState<BemRow | null>(null);

  const bensFiltrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return bens.filter((b) => {
      if (filtroTipo !== '__todos__' && b.tipo_bem !== filtroTipo) return false;
      if (q) {
        return (
          (b.referencia_dp ?? '').toLowerCase().includes(q) ||
          (b.denominacao ?? '').toLowerCase().includes(q) ||
          (b.ccir_codigo ?? '').toLowerCase().includes(q) ||
          (b.inscricao_municipal ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [bens, busca, filtroTipo]);

  // Totais sobre o valor DERIVADO (soma das matrículas, ou o do próprio bem
  // quando não há matrícula) — nunca sobre a coluna do bem, que para imóvel
  // deixou de ser a fonte e ficaria em R$ 0,00. Ver `@/lib/osg/valoresDoBem`.
  const totais = useMemo(() => totalizarValoresDosBens(bensFiltrados), [bensFiltrados]);

  const buscaAtiva = busca.trim().length > 0 || filtroTipo !== '__todos__';

  return (
    <OsgLayout
      title="Diagnóstico Patrimonial"
      subtitle="Cadastro de bens, matrículas, titulares e impedimentos por cliente"
    >
      <div className="space-y-4">
        {!clienteId ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Landmark className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Selecione um cliente na barra acima para visualizar e gerenciar o Diagnóstico Patrimonial.</p>
            </CardContent>
          </Card>
        ) : loadingBens ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="text-sm">Carregando...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Filtros</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-3 md:items-end">
                  <div className="flex-1 space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Buscar</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Referência, nome, CCIR ou inscrição"
                        className="h-9 pl-8"
                      />
                    </div>
                  </div>
                  <div className="w-full md:w-56 space-y-1.5">
                    <Label className="text-xs font-semibold text-muted-foreground">Tipo</Label>
                    <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__todos__">Todos</SelectItem>
                        {TIPO_BEM_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            <span className="font-mono mr-2">{o.value}</span>{o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-slate-500" />
                  Bens ({bensFiltrados.length}{bens.length !== bensFiltrados.length ? ` de ${bens.length}` : ''})
                </CardTitle>
                <Button size="sm" className="gap-1.5" onClick={() => setBemModal({ open: true, bem: null })}>
                  <Plus className="h-3.5 w-3.5" /> Novo bem
                </Button>
              </CardHeader>
              <CardContent>
                {bensFiltrados.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-6 text-center">
                    {buscaAtiva
                      ? 'Nenhum bem encontrado com os filtros aplicados.'
                      : 'Nenhum bem cadastrado para este cliente.'}
                  </p>
                ) : (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ref.</TableHead>
                          <TableHead>Tipo do Bem</TableHead>
                          <TableHead>Denominação</TableHead>
                          <TableHead className="text-right">Vlr. contábil</TableHead>
                          <TableHead className="text-right">Vlr. mercado</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="w-24 text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bensFiltrados.map((b) => {
                          const tipoOpt = TIPO_BEM_OPTIONS.find((o) => o.value === b.tipo_bem);
                          return (
                            <TableRow key={b.id} {...rowActivateProps(() => setBemModal({ open: true, bem: b }))}>
                              <TableCell className="font-mono text-xs">{b.referencia_dp}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs">
                                  {tipoOpt?.label ?? b.tipo_bem}
                                </Badge>
                              </TableCell>
                              <TableCell className="font-medium">
                                <div className="flex flex-col">
                                  <span>{b.denominacao}</span>
                                  {!b.participa_estruturacao && (
                                    <span className="text-[10px] text-muted-foreground">
                                      Não participa da estruturação
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell
                                className="text-right font-mono text-xs"
                                title={origemDoValor(b.valores, 'contabil')}
                              >
                                {formatBrl(b.valores.contabil.valor)}
                              </TableCell>
                              <TableCell
                                className="text-right font-mono text-xs"
                                title={origemDoValor(b.valores, 'mercado')}
                              >
                                {formatBrl(b.valores.mercado.valor)}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {b.status_integralizacao ?? '—'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7"
                                    onClick={() => setBemModal({ open: true, bem: b })}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => setBemParaExcluir(b)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {bensFiltrados.length > 0 && (
                  <div className="mt-3 flex gap-6 text-xs text-muted-foreground justify-end">
                    <span>Total contábil: <span className="font-mono font-semibold">{formatBrl(totais.contabil)}</span></span>
                    <span>Total mercado: <span className="font-mono font-semibold">{formatBrl(totais.mercado)}</span></span>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {clienteId && (
        <BemModal
          open={bemModal.open}
          clienteId={clienteId}
          bem={bemModal.bem}
          pessoasCliente={pessoasCliente}
          onClose={() => setBemModal({ open: false, bem: null })}
        />
      )}

      <DeleteBemDialog
        bem={bemParaExcluir}
        isPending={deleteBem.isPending}
        onClose={() => setBemParaExcluir(null)}
        onConfirm={(matriculaMode) => {
          if (!bemParaExcluir) return;
          deleteBem.mutate(
            { bem: bemParaExcluir, matriculaMode },
            { onSuccess: () => setBemParaExcluir(null) },
          );
        }}
      />
    </OsgLayout>
  );
};

interface DeleteBemDialogProps {
  bem: BemRow | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (matriculaMode: 'cascade' | 'keep') => void;
}

function DeleteBemDialog({ bem, isPending, onClose, onConfirm }: DeleteBemDialogProps) {
  const { data: matriculas = [], isLoading } = useMatriculasByBem(bem?.id ?? null);
  const temMatriculas = matriculas.length > 0;

  return (
    <Dialog open={!!bem} onOpenChange={(o) => !o && !isPending && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remover bem?</DialogTitle>
          <DialogDescription>
            {bem ? `${bem.referencia_dp} — ${bem.denominacao}` : ''}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <p className="text-sm text-muted-foreground py-2 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Verificando matrículas vinculadas...
          </p>
        ) : temMatriculas ? (
          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Este bem possui <span className="font-semibold text-foreground">{matriculas.length}</span>{' '}
              matrícula(s) vinculada(s). Escolha o que fazer com elas:
            </p>
            <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1">
              <li><span className="font-medium text-foreground">Excluir matrículas</span>: remove também titulares e impedimentos.</li>
              <li><span className="font-medium text-foreground">Manter matrículas</span>: elas voltam ao estado órfã (sem bem).</li>
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Nenhuma matrícula vinculada. Esta ação não pode ser desfeita.
          </p>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>Cancelar</Button>
          {temMatriculas ? (
            <>
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => onConfirm('keep')}
              >
                Manter matrículas
              </Button>
              <Button
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
                disabled={isPending}
                onClick={() => onConfirm('cascade')}
              >
                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Excluir bem e matrículas
              </Button>
            </>
          ) : (
            <Button
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-1.5"
              disabled={isPending || isLoading}
              onClick={() => onConfirm('keep')}
            >
              {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Remover
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DiagnosticoPatrimonial;
