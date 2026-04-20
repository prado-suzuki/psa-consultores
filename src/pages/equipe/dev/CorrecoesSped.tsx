import { useState, useEffect } from 'react';
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
import { Search, X, AlertCircle, FileSearch, Package, CalendarIcon, Info, ChevronsUpDown } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const NAT_BC_CRED_OPTIONS = [
  { value: '01', label: 'Aquisição de bens para revenda' },
  { value: '02', label: 'Aquisição de bens utilizados como insumos' },
  { value: '03', label: 'Energia elétrica e térmica, inclusive sob a forma de vapor' },
  { value: '04', label: 'Aluguéis de máquinas e equipamentos' },
  { value: '05', label: 'Contraprestações de arrendamento mercantil' },
  { value: '06', label: 'Máquinas e equipamentos incorporados ao ativo imobilizado (crédito sobre depreciação)' },
  { value: '07', label: 'Máquinas e equipamentos incorporados ao ativo imobilizado (crédito sobre valor de aquisição)' },
  { value: '08', label: 'Aquisição e Depreciação de edificações e benfeitorias em imóveis' },
  { value: '09', label: 'Encargos de depreciação e amortização de bens incorpóreos' },
  { value: '10', label: 'Devolução de mercadorias sujeitas à substituição tributária' },
  { value: '11', label: 'Devolução de Vendas Sujeitas a Incidência Não-Cumulativa' },
  { value: '12', label: 'Outras Operações com Direito ao Crédito (com incidência sobre receitas)' },
  { value: '13', label: 'Outras Operações com Direito ao Crédito' },
  { value: '14', label: 'Atividade Imobiliária – Custo Incorrido de unidade não concluída' },
  { value: '15', label: 'Atividade Imobiliária – Custo Orçado de unidade não concluída (RET)' },
  { value: '16', label: 'Serviços de Limpeza, Conservação e Manutenção – vale transporte, alimentação, fardamento' },
  { value: '99', label: 'Outras' },
] as const;
import { useClientesList, useContribuintesByCliente } from '@/hooks/useDevClients';
import { NcmRegrasModal } from '@/components/equipe/dev/pis-cofins/NcmRegrasModal';
import { useCorrecoesC170, useCorrecoesA170, useCorrecoesD100, useCorrecoesF100, useCorrecoesF120, useCorrecoesF130, useEnviarCorrecoes, useExportarCorrecoes, usePendingCorrecoesCount } from '@/hooks/useCorrecoesSped';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { FlatItemEfd } from '@/types/correcoesSped';

import TabC170 from '@/components/equipe/dev/correcoes-sped/TabC170';
import TabA170 from '@/components/equipe/dev/correcoes-sped/TabA170';
import TabD100 from '@/components/equipe/dev/correcoes-sped/TabD100';
import TabF100 from '@/components/equipe/dev/correcoes-sped/TabF100';
import TabF120 from '@/components/equipe/dev/correcoes-sped/TabF120';
import TabF130 from '@/components/equipe/dev/correcoes-sped/TabF130';

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
  const [activeTab, setActiveTab] = useState('c170');
  const [natBcCreds, setNatBcCreds] = useState<string[]>([]);
  const [codCta, setCodCta] = useState('');
  const [natBcCredOpen, setNatBcCredOpen] = useState(false);

  // Modals
  const [selectedItem, setSelectedItem] = useState<FlatItemEfd | null>(null);
  const [selectedNcm, setSelectedNcm] = useState<string | null>(null);

  const { data: clientes = [] } = useClientesList({ ativo: true });
  const { data: contribuintes = [] } = useContribuintesByCliente(clienteId || null);

  useEffect(() => {
    if (clienteId && contribuintes.length === 1 && !contribuinteId) {
      setContribuinteId(contribuintes[0].id);
    }
  }, [clienteId, contribuintes, contribuinteId]);

  const contribuinteSelecionado = contribuintes.find((item) => item.id === contribuinteId) ?? null;

  const queryParams = { id_contribuinte: contribuinteId, dt_ini: dtIni, dt_fin: dtFin };
  const c170Query = useCorrecoesC170(queryParams);
  const a170Query = useCorrecoesA170(queryParams);
  const d100Query = useCorrecoesD100(queryParams);
  const f100Query = useCorrecoesF100({
    ...queryParams,
    nat_bc_creds: natBcCreds.length > 0 ? natBcCreds : undefined,
    cod_cta: codCta || undefined,
  });
  const f120Query = useCorrecoesF120(queryParams);
  const f130Query = useCorrecoesF130(queryParams);

  const { enviar: enviarCorrecoes, isSending } = useEnviarCorrecoes();
  const { exportar: exportarCorrecoes, isExporting } = useExportarCorrecoes();
  const { data: pendingCount = 0 } = usePendingCorrecoesCount(contribuinteId, activeTab.toUpperCase());

  const getIdArquivos = (): string[] => {
    let ids: string[] = [];
    switch (activeTab) {
      case 'c170': ids = (c170Query.data ?? []).map((i) => i.ID_ARQUIVO); break;
      case 'a170': ids = (a170Query.data ?? []).map((i) => i.ID_ARQUIVO); break;
      case 'd100': ids = (d100Query.data ?? []).map((i) => i.ID_ARQUIVO); break;
      case 'f100': ids = (f100Query.data ?? []).map((i) => i.F100.ID_ARQUIVO); break;
      case 'f120': ids = (f120Query.data ?? []).map((i) => i.F120.ID_ARQUIVO); break;
      case 'f130': ids = (f130Query.data ?? []).map((i) => i.F130.ID_ARQUIVO); break;
    }
    return [...new Set(ids.filter(Boolean))];
  };

  const handleExportar = () => {
    exportarCorrecoes({
      tipo: 'contribuicoes',
      idContribuinte: contribuinteId,
      idArquivos: getIdArquivos(),
      registros: [activeTab.toUpperCase()],
    });
  };

  const queryMap = {
    c170: c170Query, a170: a170Query, d100: d100Query,
    f100: f100Query, f120: f120Query, f130: f130Query,
  } as const;

  const activeQuery = queryMap[activeTab as keyof typeof queryMap];
  const anyFetching = activeQuery?.isFetching ?? false;

  const handleConsultar = () => {
    if (!contribuinteId || !dtIni || !dtFin) return;
    setHasQueried(true);
    activeQuery?.refetch();
  };

  const handleLimpar = () => {
    setClienteId('');
    setContribuinteId('');
    setDtIni('');
    setDtFin('');
    setNcmFilter('all');
    setSearchText('');
    setHasQueried(false);
    setNatBcCreds([]);
    setCodCta('');
    setNatBcCredOpen(false);
  };

  const f100FiltersValid = natBcCreds.length > 0 || !!codCta;
  const canConsult = !!contribuinteId && !!dtIni && !!dtFin && (activeTab !== 'f100' || f100FiltersValid);

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
                <span className="flex items-center gap-1">
                  <Label className="text-xs">NCM</Label>
                  <Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Filtra os itens da tabela cruzando a informação com o NCM vinculado ao produto no Registro 0200 do SPED.</TooltipContent></Tooltip>
                </span>
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
            {activeTab === 'f100' && (
              <div className="mt-3 pt-3 border-t border-dashed grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="flex items-center gap-1">
                    <Label className="text-xs">Nat. Base de Crédito</Label>
                    <Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Código NAT_BC_CRED do registro F100 (Tab. 4.3.7). Obrigatório se Cód. Conta não for informado.</TooltipContent></Tooltip>
                  </span>
                  <Popover open={natBcCredOpen} onOpenChange={setNatBcCredOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={natBcCredOpen} className="h-8 w-full justify-between text-sm font-normal">
                        {natBcCreds.length === 0 && <span className="text-muted-foreground">Selecione ou digite...</span>}
                        {natBcCreds.length === 1 && (
                          <span className="truncate">
                            <span className="font-mono font-medium">{natBcCreds[0]}</span>
                            {' – '}
                            {NAT_BC_CRED_OPTIONS.find((o) => o.value === natBcCreds[0])?.label ?? natBcCreds[0]}
                          </span>
                        )}
                        {natBcCreds.length > 1 && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="truncate">
                                <span className="font-medium">{natBcCreds.length} selecionados</span>
                                <span className="ml-2 font-mono text-xs text-muted-foreground">{[...natBcCreds].sort().join(', ')}</span>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs text-xs">
                              <div className="space-y-0.5">
                                {[...natBcCreds].sort().map((code) => (
                                  <div key={code}>
                                    <span className="font-mono font-semibold">{code}</span>
                                    {' – '}
                                    {NAT_BC_CRED_OPTIONS.find((o) => o.value === code)?.label ?? code}
                                  </div>
                                ))}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[420px] p-0" align="start">
                      <Command>
                        <CommandInput placeholder="Buscar por código ou descrição..." className="h-8 text-sm" />
                        <CommandList>
                          <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
                          {natBcCreds.length > 0 && (
                            <>
                              <CommandGroup>
                                <CommandItem
                                  value="__limpar-selecao__"
                                  onSelect={() => setNatBcCreds([])}
                                  className="text-xs text-muted-foreground"
                                >
                                  <X className="mr-2 h-3.5 w-3.5 shrink-0" />
                                  Limpar seleção ({natBcCreds.length})
                                </CommandItem>
                              </CommandGroup>
                              <CommandSeparator />
                            </>
                          )}
                          <CommandGroup>
                            {NAT_BC_CRED_OPTIONS.map((option) => {
                              const checked = natBcCreds.includes(option.value);
                              return (
                                <CommandItem
                                  key={option.value}
                                  value={`${option.value} ${option.label}`}
                                  onSelect={() => {
                                    setNatBcCreds((prev) =>
                                      prev.includes(option.value)
                                        ? prev.filter((v) => v !== option.value)
                                        : [...prev, option.value],
                                    );
                                  }}
                                  className="group text-xs"
                                >
                                  <Checkbox checked={checked} className="mr-2 h-3.5 w-3.5 shrink-0 pointer-events-none" />
                                  <span className="font-mono font-semibold mr-2 shrink-0">{option.value}</span>
                                  <span className="truncate text-muted-foreground group-data-[selected=true]:text-accent-foreground">{option.label}</span>
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <span className="flex items-center gap-1">
                    <Label className="text-xs">Código da Conta</Label>
                    <Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">COD_CTA do registro F100. Ex: 31010201. Obrigatório se Nat. Base de Crédito não for informado.</TooltipContent></Tooltip>
                  </span>
                  <Input
                    placeholder="Ex: 31010201"
                    value={codCta}
                    onChange={(e) => setCodCta(e.target.value)}
                    className="h-8 text-sm font-mono"
                  />
                </div>
              </div>
            )}
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
                <Button size="sm" onClick={handleConsultar} disabled={!canConsult || anyFetching} title={activeTab === 'f100' && !f100FiltersValid ? 'Informe Nat. Base de Crédito ou Cód. Conta para consultar F100' : undefined}>
                  <Search className="h-3.5 w-3.5 mr-1" />
                  {anyFetching ? 'Consultando...' : 'Consultar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty state */}
        {!hasQueried && !anyFetching && (
          <Card className="border-dashed">
            <CardContent className="p-16 flex flex-col items-center gap-4 text-center">
              <FileSearch className="h-14 w-14 text-muted-foreground/30" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-foreground">Nenhum dado consultado</h3>
                <p className="text-sm text-muted-foreground">
                  Selecione o contribuinte e o período para consultar as notas e itens do SPED.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        {hasQueried && (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex items-center gap-2 mb-2">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="c170" className="text-xs sm:text-sm">C170 (NFe/NFCe)</TabsTrigger>
                <TabsTrigger value="a170" className="text-xs sm:text-sm">A170 (NFSe)</TabsTrigger>
                <TabsTrigger value="d100" className="text-xs sm:text-sm">D100 (CTe)</TabsTrigger>
                <TabsTrigger value="f100" className="text-xs sm:text-sm">F100 (Outros)</TabsTrigger>
                <TabsTrigger value="f120" className="text-xs sm:text-sm">F120 (Deprec.)</TabsTrigger>
                <TabsTrigger value="f130" className="text-xs sm:text-sm">F130 (Aquis.)</TabsTrigger>
              </TabsList>
              {['c170', 'a170', 'd100', 'f100', 'f120', 'f130'].includes(activeTab) && (
                <>
                  <Button size="sm" onClick={() => enviarCorrecoes(activeTab.toUpperCase())} disabled={isSending} className="shrink-0">
                    {isSending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                    {isSending ? 'Enviando...' : `Enviar Correções ${activeTab.toUpperCase()}`}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportar}
                    disabled={isExporting || getIdArquivos().length === 0}
                    className="shrink-0"
                  >
                    {isExporting ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1" />}
                    {isExporting ? 'Exportando...' : `Exportar correções`}
                  </Button>
                </>
              )}
              {/* TODO: remover — botão temporário de debug */}
              <Button
                size="sm"
                variant="destructive"
                className="shrink-0"
                onClick={async () => {
                  const { error } = await supabase.from('efd_correcoes').delete().gte('created_at', '1970-01-01');
                  if (error) {
                    toast.error(`Erro ao limpar: ${error.message}`);
                  } else {
                    toast.success('efd_correcoes limpa.');
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Limpar efd_correcoes
              </Button>
            </div>

            <TabsContent value="c170">
              <TabC170
                data={c170Query.data}
                isLoading={c170Query.isFetching}
                error={c170Query.error as Error | null}
                hasQueried={hasQueried}
                ncmFilter={ncmFilter}
                searchText={searchText}
                empresaCnpj={contribuinteSelecionado?.cpf_cnpj ?? null}
                periodo={dtIni && dtFin ? `${dtIni} a ${dtFin}` : null}
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
                empresaCnpj={contribuinteSelecionado?.cpf_cnpj ?? null}
                periodo={dtIni && dtFin ? `${dtIni} a ${dtFin}` : null}
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
                empresaCnpj={contribuinteSelecionado?.cpf_cnpj ?? null}
                periodo={dtIni && dtFin ? `${dtIni} a ${dtFin}` : null}
                contribuinteId={contribuinteId}
                cod_cta={codCta || undefined}
                dt_ini={dtIni || undefined}
                dt_fin={dtFin || undefined}
              />
            </TabsContent>

            <TabsContent value="f100">
              <TabF100
                data={f100Query.data}
                isLoading={f100Query.isFetching}
                error={f100Query.error as Error | null}
                hasQueried={hasQueried}
                searchText={searchText}
                empresaCnpj={contribuinteSelecionado?.cpf_cnpj ?? null}
                periodo={dtIni && dtFin ? `${dtIni} a ${dtFin}` : null}
                contribuinteId={contribuinteId}
                nat_bc_creds={natBcCreds.length > 0 ? natBcCreds : undefined}
                cod_cta={codCta || undefined}
                dt_ini={dtIni || undefined}
                dt_fin={dtFin || undefined}
              />
            </TabsContent>

            <TabsContent value="f120">
              <TabF120
                data={f120Query.data}
                isLoading={f120Query.isFetching}
                error={f120Query.error as Error | null}
                hasQueried={hasQueried}
                searchText={searchText}
                empresaCnpj={contribuinteSelecionado?.cpf_cnpj ?? null}
                periodo={dtIni && dtFin ? `${dtIni} a ${dtFin}` : null}
              />
            </TabsContent>

            <TabsContent value="f130">
              <TabF130
                data={f130Query.data}
                isLoading={f130Query.isFetching}
                error={f130Query.error as Error | null}
                hasQueried={hasQueried}
                searchText={searchText}
                empresaCnpj={contribuinteSelecionado?.cpf_cnpj ?? null}
                periodo={dtIni && dtFin ? `${dtIni} a ${dtFin}` : null}
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
            <DialogDescription className="sr-only">Detalhes do item EFD selecionado</DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4">
              <div className="bg-muted/30 border rounded-lg p-4 space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registro EFD Original</h4>
                <div className="flex items-baseline justify-between gap-2">
                  <p className="text-sm font-medium truncate">{selectedItem.DESCR_COMPL}</p>
                  <span className="text-base font-mono font-semibold shrink-0">{formatCurrency(selectedItem.VL_ITEM)}</span>
                </div>
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
              </div>

              <div className="border-t pt-3">
                  <h4 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider flex items-center gap-1">
                  Itens XML (NFe)
                  <Badge variant="secondary" className="ml-1 text-[10px]">{selectedItem.nfe_itens.length}</Badge>
                  <Tooltip><TooltipTrigger asChild><Info className="h-3 w-3 cursor-help text-muted-foreground/70" /></TooltipTrigger><TooltipContent side="top" className="max-w-xs text-xs">Relação original de todos os itens da nota no XML. Útil para revisar registros do SPED que agruparam vários produtos em uma só linha.</TooltipContent></Tooltip>
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
                        <div key={`${nfe.nItem}-${i}`} className="rounded-lg border p-3 space-y-2 bg-background">
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
                              <Badge variant={ncmMatch ? 'secondary' : 'destructive'} className="text-[10px]">
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
        setorClienteId={contribuinteSelecionado?.setor_cliente_id ?? null}
      />
    </DevLayout>
  );
};

export default CorrecoesSped;
