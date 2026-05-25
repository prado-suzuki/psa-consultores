import { useMemo, useState } from 'react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Users, Search, Building2, User as UserIcon } from 'lucide-react';
import { useClientesLista } from '@/hooks/useGestaoClientes';
import {
  useDeletePessoa,
  usePessoasByCliente,
  type PessoaRow,
  type TipoPessoa,
} from '@/hooks/useQuadroSocietario';
import { PessoaModal } from '@/components/equipe/osg/quadro-societario/PessoaModal';

interface PessoasTableProps {
  titulo: string;
  icone: React.ReactNode;
  tipo: TipoPessoa;
  pessoas: PessoaRow[];
  buscaAtiva: boolean;
  documentoLabel: string;
  onNovo: () => void;
  onEditar: (p: PessoaRow) => void;
  onRemover: (p: PessoaRow) => void;
}

const PessoasTable = ({
  titulo, icone, tipo, pessoas, buscaAtiva, documentoLabel, onNovo, onEditar, onRemover,
}: PessoasTableProps) => (
  <Card>
    <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
      <CardTitle className="text-base flex items-center gap-2">
        {icone}
        {titulo} ({pessoas.length})
      </CardTitle>
      <Button size="sm" className="gap-1.5" onClick={onNovo}>
        <Plus className="h-3.5 w-3.5" /> Nova {tipo}
      </Button>
    </CardHeader>
    <CardContent>
      {pessoas.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          {buscaAtiva ? 'Nenhuma pessoa encontrada.' : `Nenhuma ${tipo} cadastrada para este cliente.`}
        </p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Denominação</TableHead>
                <TableHead>{documentoLabel}</TableHead>
                <TableHead>Município/UF</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pessoas.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.denominacao}</TableCell>
                  <TableCell className="font-mono text-xs">{p.cpf_cnpj ?? '—'}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {[p.endereco_municipio, p.endereco_uf].filter(Boolean).join('/') || '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => onEditar(p)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover pessoa</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja remover "{p.denominacao}"? Os vínculos de parentesco
                              associados também serão removidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => onRemover(p)}
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
  </Card>
);

const QuadroSocietario = () => {
  const [clienteId, setClienteId] = useState<string>('');
  const [busca, setBusca] = useState('');

  const { data: clientes = [], isLoading: loadingClientes } = useClientesLista();
  const { data: pessoas = [], isLoading: loadingPessoas } = usePessoasByCliente(clienteId || null);

  const [pessoaModal, setPessoaModal] = useState<{
    open: boolean;
    pessoa: PessoaRow | null;
    defaultTipo: TipoPessoa;
  }>({ open: false, pessoa: null, defaultTipo: 'PJ' });

  const deletePessoa = useDeletePessoa();

  const { pjs, pfs } = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const filtradas = q
      ? pessoas.filter((p) =>
          (p.denominacao ?? '').toLowerCase().includes(q) ||
          (p.cpf_cnpj ?? '').toLowerCase().includes(q),
        )
      : pessoas;
    return {
      pjs: filtradas.filter((p) => p.tipo_pessoa === 'PJ'),
      pfs: filtradas.filter((p) => p.tipo_pessoa === 'PF'),
    };
  }, [pessoas, busca]);

  const clienteSelecionado = clientes.find((c) => c.id === clienteId);
  const buscaAtiva = busca.trim().length > 0;

  return (
    <OsgLayout
      title="Quadro Societário"
      subtitle="Cadastro de pessoas físicas/jurídicas e vínculos de parentesco por cliente"
    >
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Cliente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-3 md:items-end">
              <div className="flex-1 space-y-1.5">
                <Label className="text-xs font-semibold text-muted-foreground">Selecione um cliente</Label>
                <Select value={clienteId || undefined} onValueChange={setClienteId} disabled={loadingClientes}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={loadingClientes ? 'Carregando...' : 'Selecione...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {clienteId && (
                <div className="flex-1 space-y-1.5">
                  <Label className="text-xs font-semibold text-muted-foreground">Buscar pessoa</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      placeholder="Nome ou CPF/CNPJ"
                      className="h-9 pl-8"
                    />
                  </div>
                </div>
              )}
            </div>
            {clienteSelecionado && (
              <p className="text-xs text-muted-foreground mt-3">
                Cliente selecionado: <span className="font-medium">{clienteSelecionado.nome}</span>
              </p>
            )}
          </CardContent>
        </Card>

        {!clienteId ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Selecione um cliente para visualizar e gerenciar o quadro societário.</p>
            </CardContent>
          </Card>
        ) : loadingPessoas ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <p className="text-sm">Carregando...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <PessoasTable
              titulo="Pessoas Jurídicas"
              icone={<Building2 className="h-4 w-4 text-slate-500" />}
              tipo="PJ"
              documentoLabel="CNPJ"
              pessoas={pjs}
              buscaAtiva={buscaAtiva}
              onNovo={() => setPessoaModal({ open: true, pessoa: null, defaultTipo: 'PJ' })}
              onEditar={(p) => setPessoaModal({ open: true, pessoa: p, defaultTipo: 'PJ' })}
              onRemover={(p) => deletePessoa.mutate(p)}
            />
            <PessoasTable
              titulo="Pessoas Físicas"
              icone={<UserIcon className="h-4 w-4 text-slate-500" />}
              tipo="PF"
              documentoLabel="CPF"
              pessoas={pfs}
              buscaAtiva={buscaAtiva}
              onNovo={() => setPessoaModal({ open: true, pessoa: null, defaultTipo: 'PF' })}
              onEditar={(p) => setPessoaModal({ open: true, pessoa: p, defaultTipo: 'PF' })}
              onRemover={(p) => deletePessoa.mutate(p)}
            />
          </>
        )}
      </div>

      {clienteId && (
        <PessoaModal
          open={pessoaModal.open}
          clienteId={clienteId}
          pessoa={pessoaModal.pessoa}
          pessoasCliente={pessoas}
          defaultTipo={pessoaModal.defaultTipo}
          onClose={() => setPessoaModal((prev) => ({ ...prev, open: false, pessoa: null }))}
        />
      )}
    </OsgLayout>
  );
};

export default QuadroSocietario;
