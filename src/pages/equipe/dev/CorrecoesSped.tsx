import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DevLayout from '@/components/equipe/dev/DevLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, X, AlertCircle, FileSearch, Package, CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClientesList, useContribuintesByCliente } from '@/hooks/useDevClients';
import { NcmRegrasModal } from '@/components/equipe/dev/pis-cofins/NcmRegrasModal';
import { useCorrecoesSped, useCorrecoesA170, useCorrecoesD100, useCorrecoesF100 } from '@/hooks/useCorrecoesSped';
import type { FlatItemEfd } from '@/types/correcoesSped';

import TabC170 from '@/components/equipe/dev/correcoes-sped/TabC170';
import TabA170 from '@/components/equipe/dev/correcoes-sped/TabA170';
import TabD100 from '@/components/equipe/dev/correcoes-sped/TabD100';
import TabF100 from '@/components/equipe/dev/correcoes-sped/TabF100';

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
  const [hasQueried, setHasQueried] = useState(false);

  // Modals
  const [selectedItem, setSelectedItem] = useState<ItemEfd | null>(null);
  const [selectedNcm, setSelectedNcm] = useState<string | null>(null);

  const { data: clientes = [] } = useClientesList({ ativo: true });
  const { data: contribuintes = [] } = useContribuintesByCliente(clienteId || null);

  const queryParams = { id_contribuinte: contribuinteId, dt_ini: dtIni, dt_fin: dtFin };
  const c170Query = useCorrecoesSped(queryParams);
  const a170Query = useCorrecoesA170(queryParams);
  const d100Query = useCorrecoesD100(queryParams);
  const f100Query = useCorrecoesF100(queryParams);

  const anyFetching = c170Query.isFetching || a170Query.isFetching || d100Query.isFetching || f100Query.isFetching;

  const handleConsultar = () => {
    if (!contribuinteId || !dtIni || !dtFin) return;
    setHasQueried(true);
    c170Query.refetch();
    a170Query.refetch();
    d100Query.refetch();
    f100Query.refetch();
  };

  const handleLimpar = () => {
    setClienteId('');
    setContribuinteId('');
    setDtIni('');
    setDtFin('');
    setNcmFilter('all');
    setSearchText('');
    setHasQueried(false);
  };

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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-8 text-sm w-full justify-start text-left font-normal", !dtIni && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dtIni ? format(new Date(dtIni + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar selected={dtIni ? new Date(dtIni + 'T00:00:00') : undefined} onSelect={(d) => setDtIni(d ? format(d, 'yyyy-MM-dd') : '')} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Fim</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-8 text-sm w-full justify-start text-left font-normal", !dtFin && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {dtFin ? format(new Date(dtFin + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar selected={dtFin ? new Date(dtFin + 'T00:00:00') : undefined} onSelect={(d) => setDtFin(d ? format(d, 'yyyy-MM-dd') : '')} />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">NCM</Label>
                <Select value={ncmFilter} onValueChange={(v) => setNcmFilter(v as NcmFilter)}>
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
                onChange={(e) => setSearchText(e.target.value)}
                className="h-8 text-sm max-w-sm"
              />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleLimpar}>
                  <X className="h-3.5 w-3.5 mr-1" />Limpar
                </Button>
                <Button size="sm" onClick={handleConsultar} disabled={!canConsult || anyFetching}>
                  <Search className="h-3.5 w-3.5 mr-1" />
                  {anyFetching ? 'Consultando...' : 'Consultar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty state */}
        {!hasQueried && !anyFetching && (
          <Card>
            <CardContent className="p-12 flex flex-col items-center gap-3 text-center">
              <FileSearch className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">
                Selecione o contribuinte e o período para consultar as notas e itens do SPED.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        {hasQueried && (
          <Tabs defaultValue="c170" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="c170" className="text-xs sm:text-sm">C170 (NFe/NFCe)</TabsTrigger>
              <TabsTrigger value="a170" className="text-xs sm:text-sm">A170 (NFSe)</TabsTrigger>
              <TabsTrigger value="d100" className="text-xs sm:text-sm">D100 (CTe)</TabsTrigger>
              <TabsTrigger value="f100" className="text-xs sm:text-sm">F100 (Outros)</TabsTrigger>
            </TabsList>

            <TabsContent value="c170">
              <TabC170
                data={c170Query.data}
                isLoading={c170Query.isFetching}
                error={c170Query.error as Error | null}
                hasQueried={hasQueried}
                ncmFilter={ncmFilter}
                searchText={searchText}
                onSelectItem={setSelectedItem}
                onSelectNcm={setSelectedNcm}
              />
            </TabsContent>

            <TabsContent value="a170">
              <TabA170
                data={a170Query.data}
                isLoading={a170Query.isFetching}
                error={a170Query.error as Error | null}
                hasQueried={hasQueried}
                ncmFilter={ncmFilter}
                searchText={searchText}
                onSelectNcm={setSelectedNcm}
              />
            </TabsContent>

            <TabsContent value="d100">
              <TabD100
                data={d100Query.data}
                isLoading={d100Query.isFetching}
                error={d100Query.error as Error | null}
                hasQueried={hasQueried}
                searchText={searchText}
              />
            </TabsContent>

            <TabsContent value="f100">
              <TabF100
                data={f100Query.data}
                isLoading={f100Query.isFetching}
                error={f100Query.error as Error | null}
                hasQueried={hasQueried}
                searchText={searchText}
              />
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* XML Detail Modal (C170) */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" />
              Detalhes do Item EFD
            </DialogTitle>
            <DialogDescription className="text-xs">
              {selectedItem?.DESCR_COMPL} — {selectedItem && formatCurrency(selectedItem.VL_ITEM)}
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CST PIS</p>
                  <p className="text-sm font-mono font-medium">{selectedItem.CST_PIS}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Alíq. PIS</p>
                  <p className="text-sm font-mono font-medium">{(selectedItem.ALIQ_PIS ?? 0).toFixed(2)}%</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CST COFINS</p>
                  <p className="text-sm font-mono font-medium">{selectedItem.CST_COFINS}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Alíq. COFINS</p>
                  <p className="text-sm font-mono font-medium">{(selectedItem.ALIQ_COFINS ?? 0).toFixed(2)}%</p>
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
                      const efdNcm = selectedItem.nfe_itens[0]?.ncm ?? null;
                      const ncmMatch = efdNcm === nfe.ncm;
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
                          {efdNcm && (
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
