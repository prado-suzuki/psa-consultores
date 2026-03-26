import { useState, useMemo } from 'react';
import DevLayout from '@/components/equipe/dev/DevLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, X, AlertCircle, FileSearch, Package, BookOpen, Network } from 'lucide-react';
import { useClientesList, useContribuintesByCliente } from '@/hooks/useDevClients';
import { NcmRegrasModal } from '@/components/equipe/dev/pis-cofins/NcmRegrasModal';
import { useCorrecoesSped } from '@/hooks/useCorrecoesSped';
import TablePagination, { PAGE_SIZE } from '@/components/equipe/dev/TablePagination';
import type { FlatItemEfd, ItemEfd } from '@/types/correcoesSped';

type NcmFilter = 'all' | 'with' | 'without';




const formatCurrency = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const CorrecoesSped = () => {
  const [clienteId, setClienteId] = useState('');
  const [contribuinteId, setContribuinteId] = useState('');
  const [dtIni, setDtIni] = useState('');
  const [dtFin, setDtFin] = useState('');
  const [ncmFilter, setNcmFilter] = useState<NcmFilter>('all');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(0);
  const [hasQueried, setHasQueried] = useState(false);

  // XML detail modal
  const [selectedItem, setSelectedItem] = useState<ItemEfd | null>(null);
  // NCM rules modal
  const [selectedNcm, setSelectedNcm] = useState<string | null>(null);

  const { data: clientes = [] } = useClientesList({ ativo: true });
  const { data: contribuintes = [] } = useContribuintesByCliente(clienteId || null);

  const query = useCorrecoesSped({
    id_contribuinte: contribuinteId,
    dt_ini: dtIni,
    dt_fin: dtFin,
  });

  const handleConsultar = () => {
    if (!contribuinteId || !dtIni || !dtFin) return;
    setHasQueried(true);
    setPage(0);
    query.refetch();
  };

  const handleLimpar = () => {
    setClienteId('');
    setContribuinteId('');
    setDtIni('');
    setDtFin('');
    setNcmFilter('all');
    setSearchText('');
    setPage(0);
    setHasQueried(false);
  };

  // Flatten notas → itens_efd
  const flatItems: FlatItemEfd[] = useMemo(() => {
    if (!query.data?.notas) return [];
    return query.data.notas.flatMap((nota) =>
      nota.itens_efd.map((item) => ({
        ...item,
        chv_nfe: nota.chv_nfe,
        dt_doc: nota.dt_doc,
        tipo_relacao: nota.tipo_relacao,
      }))
    );
  }, [query.data]);

  // Client-side filters
  const filtered = useMemo(() => {
    let items = flatItems;
    if (ncmFilter === 'with') items = items.filter((i) => !!i.cod_ncm);
    if (ncmFilter === 'without') items = items.filter((i) => !i.cod_ncm);
    if (searchText.trim()) {
      const s = searchText.toLowerCase();
      items = items.filter(
        (i) =>
          i.descr_item.toLowerCase().includes(s) ||
          i.chv_nfe.includes(s) ||
          (i.cod_ncm && i.cod_ncm.includes(s))
      );
    }
    return items;
  }, [flatItems, ncmFilter, searchText]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const canConsult = !!contribuinteId && !!dtIni && !!dtFin;

  return (
    <DevLayout title="Correções no SPED" subtitle="Revisão de notas e itens EFD vs XML para correções no SPED Contribuições.">
      <div className="space-y-4">
        {/* Filters */}
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Cliente</Label>
                <Select value={clienteId} onValueChange={(v) => { setClienteId(v); setContribuinteId(''); }}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Contribuinte</Label>
                <Select value={contribuinteId} onValueChange={setContribuinteId} disabled={!clienteId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder={clienteId ? 'Selecione...' : 'Selecione um cliente'} />
                  </SelectTrigger>
                  <SelectContent>
                    {contribuintes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Início</Label>
                <Input type="date" value={dtIni} onChange={(e) => setDtIni(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Fim</Label>
                <Input type="date" value={dtFin} onChange={(e) => setDtFin(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">NCM</Label>
                <Select value={ncmFilter} onValueChange={(v) => { setNcmFilter(v as NcmFilter); setPage(0); }}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="with">Com NCM</SelectItem>
                    <SelectItem value="without">Sem NCM</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row justify-between gap-2 mt-3">
              <Input
                placeholder="Buscar por descrição, chave ou NCM..."
                value={searchText}
                onChange={(e) => { setSearchText(e.target.value); setPage(0); }}
                className="h-8 text-sm max-w-sm"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleLimpar}>
                  <X className="h-3.5 w-3.5 mr-1" />Limpar
                </Button>
                <Button size="sm" onClick={handleConsultar} disabled={!canConsult || query.isFetching}>
                  <Search className="h-3.5 w-3.5 mr-1" />
                  {query.isFetching ? 'Consultando...' : 'Consultar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error */}
        {query.error && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4 flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {(query.error as Error).message}
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton */}
        {query.isFetching && (
          <Card>
            <CardContent className="p-8 flex justify-center">
              <div className="animate-pulse text-sm text-muted-foreground">Carregando dados...</div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {hasQueried && !query.isFetching && !query.error && query.data && (
          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  Nenhum item encontrado para os filtros selecionados.
                </div>
              ) : (
                <>
                  <div className="px-4 py-2.5 border-b bg-muted/50 flex items-center justify-between">
                     <span className="text-xs font-medium text-muted-foreground">
                       {filtered.length} {filtered.length === 1 ? 'item' : 'itens'} encontrados
                       {' '}· {query.data.notas.length} notas
                     </span>
                   </div>
                  <div className="overflow-auto">
                     <Table>
                      <TableHeader>
                         <TableRow className="border-b-0">
                           <TableHead colSpan={3} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 pb-0 pt-2">EFD</TableHead>
                           <TableHead colSpan={3} className="text-[10px] uppercase tracking-wider font-semibold text-blue-600/70 dark:text-blue-400/70 pb-0 pt-2 border-l-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20">XML</TableHead>
                           <TableHead colSpan={7} className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 pb-0 pt-2 border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">Impostos</TableHead>
                         </TableRow>
                         <TableRow>
                           <TableHead className="text-[11px] min-w-[200px]">Descrição</TableHead>
                           <TableHead className="text-[11px] min-w-[100px]">NCM</TableHead>
                           <TableHead className="text-[11px] text-right min-w-[110px]">Valor</TableHead>
                           <TableHead className="text-[11px] min-w-[200px] border-l-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/20">Descrição</TableHead>
                           <TableHead className="text-[11px] min-w-[100px] bg-blue-50/60 dark:bg-blue-950/20">NCM</TableHead>
                           <TableHead className="text-[11px] text-right min-w-[110px] bg-blue-50/60 dark:bg-blue-950/20">Valor</TableHead>
                           <TableHead className="text-[11px] text-center min-w-[60px] border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/20">CST PIS</TableHead>
                           <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20">% PIS</TableHead>
                           <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL PIS</TableHead>
                           <TableHead className="text-[11px] text-center min-w-[60px] bg-slate-50/60 dark:bg-slate-800/20">CST COF</TableHead>
                           <TableHead className="text-[11px] text-right min-w-[70px] bg-slate-50/60 dark:bg-slate-800/20">% COF</TableHead>
                           <TableHead className="text-[11px] text-right min-w-[100px] bg-slate-50/60 dark:bg-slate-800/20">VL COF</TableHead>
                           <TableHead className="text-[11px] min-w-[90px] bg-slate-50/60 dark:bg-slate-800/20">Conta</TableHead>
                         </TableRow>
                       </TableHeader>
                      <TableBody>
                        {paged.map((item, idx) => {
                          const xml = item.tipo_relacao === '1:1' && item.nfe_itens[0] ? item.nfe_itens[0] : null;
                          const ncmDivergent = xml && item.cod_ncm && item.cod_ncm !== xml.ncm;
                          const valueDivergent = xml && Math.abs(item.vl_item - xml.vProd) > 0.01;
                          return (
                          <TableRow key={`${item.chv_nfe}-${item.num_item}-${idx}`} className="group">
                            <TableCell className="text-xs py-1.5 max-w-[200px] truncate" title={item.descr_item}>
                              {item.descr_item}
                            </TableCell>
                            <TableCell className="py-1.5">
                               {item.cod_ncm ? (
                                 <Badge
                                   variant="outline"
                                   className="cursor-pointer gap-1 font-mono text-[11px] hover:bg-teal-50 dark:hover:bg-teal-950/30 text-teal-700 dark:text-teal-400 border-teal-200 dark:border-teal-800"
                                   onClick={() => setSelectedNcm(item.cod_ncm)}
                                 >
                                   <BookOpen className="h-3 w-3 shrink-0" />
                                   {item.cod_ncm}
                                 </Badge>
                               ) : (
                                 <span className="text-xs text-muted-foreground/50 italic text-center block">—</span>
                               )}
                             </TableCell>
                            <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums">
                              {formatCurrency(item.vl_item)}
                            </TableCell>
                            {/* --- Colunas XML --- */}
                             <TableCell className="py-1.5 border-l-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/5" title={xml?.xProd}>
                               {xml ? (
                                 <Badge
                                   variant="outline"
                                   className="cursor-pointer gap-1 text-[11px] max-w-[190px] hover:bg-blue-50 dark:hover:bg-blue-950/30 border-blue-200 dark:border-blue-800"
                                   onClick={() => setSelectedItem(item)}
                                 >
                                   <FileSearch className="h-3 w-3 shrink-0" />
                                   <span className="truncate">{xml.xProd}</span>
                                 </Badge>
                               ) : item.tipo_relacao === 'CONSOLIDADO' ? (
                                 <Badge
                                   className="cursor-pointer gap-1 text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800"
                                   onClick={() => setSelectedItem(item)}
                                 >
                                   <Network className="h-3 w-3 shrink-0" />
                                   Consolidado
                                 </Badge>
                               ) : (
                                 <span className="text-xs text-muted-foreground/50 italic text-center block">—</span>
                               )}
                             </TableCell>
                             <TableCell className="py-1.5 bg-blue-50/20 dark:bg-blue-950/5">
                               {xml ? (
                                 ncmDivergent ? (
                                   <Badge variant="outline" className="font-mono text-[11px] border-red-200 text-red-600 bg-red-50/50 dark:bg-red-950/20 dark:text-red-400 dark:border-red-800 gap-1">
                                     <AlertCircle className="h-3 w-3 shrink-0" />
                                     {xml.ncm}
                                   </Badge>
                                 ) : (
                                   <code className="text-xs font-mono text-muted-foreground">{xml.ncm}</code>
                                 )
                               ) : <span className="text-xs text-muted-foreground/50 italic text-center block">—</span>}
                             </TableCell>
                             <TableCell className={`text-xs text-right py-1.5 font-mono tabular-nums bg-blue-50/20 dark:bg-blue-950/5 ${valueDivergent ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}`}>
                               {xml ? formatCurrency(xml.vProd) : <span className="text-xs text-muted-foreground/50 italic text-center block">—</span>}
                             </TableCell>
                             {/* --- Zona Impostos --- */}
                             <TableCell className="text-xs text-center py-1.5 font-mono border-l-2 border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-800/10">{item.cst_pis}</TableCell>
                             <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{item.aliq_pis.toFixed(2)}</TableCell>
                             <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{formatCurrency(item.vl_pis)}</TableCell>
                             <TableCell className="text-xs text-center py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">{item.cst_cofins}</TableCell>
                             <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{item.aliq_cofins.toFixed(2)}</TableCell>
                             <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-slate-50/30 dark:bg-slate-800/10">{formatCurrency(item.vl_cofins)}</TableCell>
                             <TableCell className="text-xs py-1.5 font-mono bg-slate-50/30 dark:bg-slate-800/10">{item.cod_cta}</TableCell>
                          </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="px-4 pb-3">
                    <TablePagination
                      currentPage={page}
                      totalPages={totalPages}
                      totalItems={filtered.length}
                      onPageChange={setPage}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!hasQueried && !query.isFetching && (
          <Card>
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <FileSearch className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Selecione o contribuinte e o período para consultar as notas e itens do SPED.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* XML Detail Modal */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Detalhes do Item EFD
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedItem?.descr_item} — {selectedItem && formatCurrency(selectedItem.vl_item)}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              {/* EFD summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CST PIS</p>
                  <p className="text-sm font-mono font-medium">{selectedItem.cst_pis}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Alíq. PIS</p>
                  <p className="text-sm font-mono font-medium">{selectedItem.aliq_pis.toFixed(2)}%</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CST COFINS</p>
                  <p className="text-sm font-mono font-medium">{selectedItem.cst_cofins}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Alíq. COFINS</p>
                  <p className="text-sm font-mono font-medium">{selectedItem.aliq_cofins.toFixed(2)}%</p>
                </div>
              </div>

              <div className="border-t pt-3">
                <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">
                  Itens XML (NFe) — {selectedItem.nfe_itens.length} {selectedItem.nfe_itens.length === 1 ? 'item' : 'itens'}
                </h4>

                {selectedItem.nfe_itens.length === 0 ? (
                  <div className="rounded-lg border border-dashed p-6 text-center">
                    <AlertCircle className="h-5 w-5 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum item XML encontrado (SEM NFE)</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedItem.nfe_itens.map((nfe, i) => {
                      const ncmMatch = selectedItem.cod_ncm === nfe.ncm;
                      return (
                        <div key={`${nfe.nItem}-${i}`} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{nfe.xProd}</p>
                              <p className="text-xs text-muted-foreground">
                                Item #{nfe.nItem} · cProd: {nfe.cProd}
                              </p>
                            </div>
                            <span className="text-sm font-mono font-semibold shrink-0">
                              {formatCurrency(nfe.vProd)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">NCM:</span>
                            <code className="text-xs font-mono">{nfe.ncm}</code>
                            {selectedItem.cod_ncm && (
                              <Badge className={`text-[10px] border-0 ${ncmMatch ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                {ncmMatch ? 'OK' : 'Divergente'}
                              </Badge>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <NcmRegrasModal
        open={!!selectedNcm}
        onOpenChange={(v) => { if (!v) setSelectedNcm(null); }}
        ncm={selectedNcm}
      />
    </DevLayout>
  );
};

export default CorrecoesSped;
