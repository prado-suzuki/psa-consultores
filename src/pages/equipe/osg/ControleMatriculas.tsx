import { useMemo, useState } from 'react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from '@/components/ui/command';
import { Plus, Pencil, Trash2, Search, FileText, Link2, Unlink, AlertCircle, Loader2 } from 'lucide-react';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { usePessoasByCliente } from '@/hooks/useQuadroSocietario';
import {
  useAllMatriculas,
  useBensByCliente,
  useDeleteMatricula,
  useSetMatriculaBem,
  type MatriculaEnriched,
} from '@/hooks/useDiagnosticoPatrimonial';
import { MatriculaModal } from '@/components/equipe/osg/diagnostico-patrimonial/MatriculaModal';

type FiltroVinculo = '__todas__' | 'orfas' | 'vinculadas';

const ControleMatriculas = () => {
  const { clienteId } = useOsgWork();
  const { data: matriculas = [], isLoading } = useAllMatriculas();
  const { data: pessoasCliente = [] } = usePessoasByCliente(clienteId || null);
  const deleteMatricula = useDeleteMatricula();
  const setMatriculaBem = useSetMatriculaBem();

  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<FiltroVinculo>('__todas__');

  const [modal, setModal] = useState<{ open: boolean; matricula: MatriculaEnriched | null }>({
    open: false, matricula: null,
  });
  const [vincularTarget, setVincularTarget] = useState<MatriculaEnriched | null>(null);

  // Escopo por cliente: a matrícula pertence ao cliente selecionado se o bem vinculado
  // for dele OU se algum titular for pessoa desse cliente (matrículas órfãs).
  const matriculasDoCliente = useMemo(
    () => matriculas.filter(
      (m) => m.bem_cliente_id === clienteId || m.titular_cliente_ids.includes(clienteId),
    ),
    [matriculas, clienteId],
  );

  const matriculasFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return matriculasDoCliente.filter((m) => {
      const orfa = m.bem_id == null;
      if (filtro === 'orfas' && !orfa) return false;
      if (filtro === 'vinculadas' && orfa) return false;
      if (q) {
        return (
          (m.numero ?? '').toLowerCase().includes(q) ||
          (m.municipio_imovel ?? '').toLowerCase().includes(q) ||
          (m.cartorio_nome ?? '').toLowerCase().includes(q) ||
          (m.bem_referencia ?? '').toLowerCase().includes(q) ||
          (m.bem_denominacao ?? '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [matriculasDoCliente, busca, filtro]);

  const orfas = matriculasDoCliente.filter((m) => m.bem_id == null).length;
  const buscaAtiva = busca.trim().length > 0 || filtro !== '__todas__';

  if (!clienteId) {
    return (
      <OsgLayout
        title="Controle de Matrículas"
        subtitle="Registro de matrículas do cliente, vinculadas ou órfãs"
      >
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Selecione um cliente na barra acima para gerenciar suas matrículas.</p>
          </CardContent>
        </Card>
      </OsgLayout>
    );
  }

  return (
    <OsgLayout
      title="Controle de Matrículas"
      subtitle="Registro de matrículas do cliente, vinculadas ou órfãs"
    >
      <div className="space-y-4">
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
                    placeholder="Nº, cartório, município ou bem"
                    className="h-9 pl-8"
                  />
                </div>
              </div>
              <div className="w-full md:w-56 space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Status</Label>
                <Select value={filtro} onValueChange={(v: FiltroVinculo) => setFiltro(v)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__todas__">Todas</SelectItem>
                    <SelectItem value="orfas">Órfãs (!)</SelectItem>
                    <SelectItem value="vinculadas">Vinculadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-slate-500" />
              Matrículas ({matriculasFiltradas.length}{matriculasDoCliente.length !== matriculasFiltradas.length ? ` de ${matriculasDoCliente.length}` : ''})
              {orfas > 0 && (
                <Badge variant="outline" className="text-[10px] gap-1 text-amber-600 border-amber-300">
                  <AlertCircle className="h-3 w-3" /> {orfas} órfã(s)
                </Badge>
              )}
            </CardTitle>
            <Button size="sm" className="gap-1.5" onClick={() => setModal({ open: true, matricula: null })}>
              <Plus className="h-3.5 w-3.5" /> Nova matrícula
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
            ) : matriculasFiltradas.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                {buscaAtiva
                  ? 'Nenhuma matrícula encontrada com os filtros aplicados.'
                  : 'Nenhuma matrícula cadastrada para este cliente.'}
              </p>
            ) : (
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10"></TableHead>
                      <TableHead>Nº</TableHead>
                      <TableHead>Cartório</TableHead>
                      <TableHead>Município/UF</TableHead>
                      <TableHead>Bem vinculado</TableHead>
                      <TableHead className="w-32 text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matriculasFiltradas.map((m) => {
                      const orfa = m.bem_id == null;
                      return (
                        <TableRow key={m.id}>
                          <TableCell>
                            {orfa && (
                              <span
                                title="Matrícula órfã (sem bem vinculado)"
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-xs"
                              >
                                !
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs font-medium">{m.numero}</TableCell>
                          <TableCell className="text-xs">
                            <div className="flex flex-col">
                              <span>{m.cartorio_nome ?? '—'}</span>
                              {m.cartorio_comarca && (
                                <span className="text-muted-foreground">{m.cartorio_comarca}/{m.cartorio_uf}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs">{m.municipio_imovel}/{m.uf_imovel}</TableCell>
                          <TableCell className="text-xs">
                            {orfa ? (
                              <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-300">Órfã</Badge>
                            ) : (
                              <span className="font-medium">{m.bem_referencia} — {m.bem_denominacao}</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="icon" variant="ghost" className="h-7 w-7"
                                title="Editar"
                                onClick={() => setModal({ open: true, matricula: m })}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              {orfa ? (
                                <Button
                                  size="icon" variant="ghost" className="h-7 w-7"
                                  title="Vincular a um bem"
                                  onClick={() => setVincularTarget(m)}
                                >
                                  <Link2 className="h-3.5 w-3.5" />
                                </Button>
                              ) : (
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" title="Desvincular do bem">
                                      <Unlink className="h-3.5 w-3.5" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Desvincular matrícula?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        A matrícula {m.numero} será desvinculada do bem "{m.bem_referencia} — {m.bem_denominacao}"
                                        e voltará ao estado órfã. Ela não será excluída.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => setMatriculaBem.mutate({ matricula: m, bemId: null })}
                                      >
                                        Desvincular
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              )}
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" title="Excluir">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Remover matrícula?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Remover a matrícula {m.numero}? Titulares e impedimentos vinculados também serão removidos.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => deleteMatricula.mutate(m)}
                                    >
                                      Remover
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <MatriculaModal
        open={modal.open}
        bemId={null}
        bemTipo={null}
        matricula={modal.matricula}
        pessoasCliente={pessoasCliente}
        matriculasDoBem={matriculasDoCliente}
        onClose={() => setModal({ open: false, matricula: null })}
      />

      <VincularBemDialog
        matricula={vincularTarget}
        clienteId={clienteId}
        onClose={() => setVincularTarget(null)}
      />
    </OsgLayout>
  );
};

// Vincula uma matrícula órfã a um bem do cliente selecionado.
function VincularBemDialog({
  matricula, clienteId, onClose,
}: { matricula: MatriculaEnriched | null; clienteId: string; onClose: () => void }) {
  const { data: bens = [], isLoading } = useBensByCliente(matricula ? clienteId : null);
  const setMatriculaBem = useSetMatriculaBem();
  const open = !!matricula;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Link2 className="h-4 w-4" /> Vincular matrícula {matricula?.numero} a um bem
          </DialogTitle>
        </DialogHeader>
        <Command className="rounded-none border-t">
          <CommandInput placeholder="Buscar bem (referência, denominação)..." />
          <CommandList>
            {isLoading ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" /> Carregando...
              </div>
            ) : (
              <>
                <CommandEmpty>Nenhum bem cadastrado para este cliente.</CommandEmpty>
                <CommandGroup>
                  {bens.map((b) => (
                    <CommandItem
                      key={b.id}
                      value={`${b.referencia_dp} ${b.denominacao}`}
                      disabled={setMatriculaBem.isPending}
                      onSelect={() => {
                        if (!matricula) return;
                        setMatriculaBem.mutate(
                          { matricula, bemId: b.id },
                          { onSuccess: () => onClose() },
                        );
                      }}
                    >
                      <span className="text-sm font-medium">{b.referencia_dp} — {b.denominacao}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}

export default ControleMatriculas;
