import { useState, useMemo, useEffect } from 'react';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { useRegrasNCM } from '@/hooks/useRegrasNCM';
import { useSetoresCliente } from '@/hooks/useSetorCliente';
import { RegraFormSheet } from '@/components/equipe/dev/pis-cofins/RegraFormSheet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Search, Plus, FileSpreadsheet, Eye, Trash2, Loader2 } from 'lucide-react';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type RegraNCMRow = Database['public']['Tables']['pis_cofins_regra']['Row'];
type ModalMode = 'view' | 'edit' | 'create' | null;

const MapaNCMPisCofins = () => {
  const { regras, isLoading, createRegra, updateRegra, deleteRegra } = useRegrasNCM();
  const { data: setores = [] } = useSetoresCliente();
  const { toast } = useToast();

  const setorMap = useMemo(() =>
    setores.reduce((acc, s) => ({ ...acc, [s.id]: s }), {} as Record<string, typeof setores[0]>),
  [setores]);

  const [search, setSearch] = useState('');
  const [creditOnly, setCreditOnly] = useState(false);
  const [selectedRegra, setSelectedRegra] = useState<RegraNCMRow | null>(null);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);

  const filtered = useMemo(() => {
    let list = regras;
    if (creditOnly) list = list.filter(r => r.permite_credito === 'S');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => {
        const setorLabel = setorMap[r.id_segmento ?? ''];
        return (r.cod_ncm ?? '').toLowerCase().includes(q) ||
          (r.desc_cst ?? '').toLowerCase().includes(q) ||
          (r.base_legal ?? '').toLowerCase().includes(q) ||
          (setorLabel?.sigla ?? '').toLowerCase().includes(q) ||
          (setorLabel?.nome ?? '').toLowerCase().includes(q);
      });
    }
    return list;
  }, [regras, search, creditOnly, setorMap]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(0); }, [filtered.length]);

  const handleSubmit = (values: any) => {
    if (modalMode === 'edit' && selectedRegra) {
      updateRegra.mutate({ id: selectedRegra.id, ...values }, {
        onSuccess: () => {
          toast({ title: 'Regra atualizada com sucesso' });
          setModalMode(null);
          setSelectedRegra(null);
        },
        onError: () => toast({ title: 'Erro ao atualizar', variant: 'destructive' }),
      });
    } else if (modalMode === 'create') {
      createRegra.mutate(values, {
        onSuccess: () => {
          toast({ title: 'Regra criada com sucesso' });
          setModalMode(null);
        },
        onError: () => toast({ title: 'Erro ao criar', variant: 'destructive' }),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteRegra.mutate(deleteId, {
      onSuccess: () => {
        toast({ title: 'Regra excluída' });
        setDeleteId(null);
      },
      onError: () => toast({ title: 'Erro ao excluir', variant: 'destructive' }),
    });
  };

  const openView = (regra: RegraNCMRow) => {
    setSelectedRegra(regra);
    setModalMode('view');
  };

  return (
    <DevLayout title="Mapa NCM" subtitle="Regras fiscais PIS/COFINS por NCM">
      {/* Filters */}
      <div className="bg-slate-50 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por NCM ou descrição..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={creditOnly} onCheckedChange={setCreditOnly} />
          <span className="text-sm text-slate-600">Apenas com crédito</span>
        </div>
        <Button className="bg-teal-600 hover:bg-teal-700 text-white" onClick={() => { setSelectedRegra(null); setModalMode('create'); }}>
          <Plus className="h-4 w-4 mr-2" /> Nova Regra
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                <TableHead className="text-xs font-semibold tracking-wider text-slate-500 uppercase">NCM</TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Setor</TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-slate-500 uppercase">CST PIS/COFINS</TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Descrição CST</TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-slate-500 uppercase">Base Legal</TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-slate-500 uppercase text-center">Crédito</TableHead>
                <TableHead className="text-xs font-semibold tracking-wider text-slate-500 uppercase text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                     <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12">
                    <FileSpreadsheet className="h-10 w-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">Nenhuma regra encontrada</p>
                  </TableCell>
                </TableRow>
              ) : paged.map(regra => (
                <TableRow key={regra.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => openView(regra)}>
                  <TableCell className="text-xs font-mono text-slate-700">{regra.cod_ncm}</TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {setorMap[regra.id_segmento ?? '']?.nome ?? regra.id_segmento ?? '—'}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">{regra.cst_pis}</TableCell>
                  <TableCell className="text-xs text-slate-600 max-w-[300px] truncate">{regra.desc_cst}</TableCell>
                  <TableCell className="text-xs text-slate-600 max-w-[350px]">
                    <span className="line-clamp-2">{regra.base_legal || '—'}</span>
                  </TableCell>
                  <TableCell className="text-center">
                    {regra.permite_credito === 'S' ? (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">Sim</Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-400 text-xs">Não</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openView(regra); }}>
                        <Eye className="h-3.5 w-3.5 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeleteId(regra.id); }}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Detail/Edit Modal */}
      <RegraFormSheet
        open={modalMode !== null}
        onOpenChange={o => { if (!o) { setModalMode(null); setSelectedRegra(null); } }}
        regra={selectedRegra}
        mode={modalMode ?? 'view'}
        onModeChange={setModalMode}
        onSubmit={handleSubmit}
        isSubmitting={createRegra.isPending || updateRegra.isPending}
        setores={setores}
        setorMap={setorMap}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={o => { if (!o) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir esta regra? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DevLayout>
  );
};

export default MapaNCMPisCofins;
