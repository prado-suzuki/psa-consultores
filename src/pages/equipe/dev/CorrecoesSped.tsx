import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import DevLayout from '@/components/equipe/dev/DevLayout';
import { DevPageHeader } from '@/components/equipe/dev/DevPageHeader';
import { TooltipProvider } from '@/components/ui/tooltip';
import { FieldTooltip, SPED_TOOLTIPS } from '@/components/equipe/dev/correcoes-sped/tooltipHelpers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, X, AlertCircle, FileSearch, Package, CalendarIcon, Info, ChevronsUpDown, Filter } from 'lucide-react';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { RequiredMark } from '@/components/ui/required-mark';
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

  // Auto-consulta ao trocar de aba: se o usuário já consultou alguma vez,
  // os filtros estão válidos e a aba atual ainda não tem dados em cache,
  // dispara o refetch automaticamente para evitar a sensação de tela vazia.
  useEffect(() => {
    if (!hasQueried) return;
    const f100Ok = activeTab !== 'f100' || natBcCreds.length > 0 || !!codCta;
    if (!contribuinteId || !dtIni || !dtFin || !f100Ok) return;
    if (!activeQuery) return;
    if (activeQuery.data !== undefined || activeQuery.isFetching) return;
    activeQuery.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, hasQueried, contribuinteId, dtIni, dtFin, natBcCreds, codCta]);

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
      <TooltipProvider delayDuration={300}>
        <DevPageHeader
          description="A ferramenta **Correções no SPED** permite revisar e ajustar os registros do SPED Contribuições (**C170**, **A170**, **D100**, **F100**, **F120**, **F130**) cruzando dados da escrituração com XMLs originais. Use os filtros para selecionar contribuinte e período, navegue pelas abas e edite as linhas com divergências para gerar correções rastreáveis."
          hideManualLink
        />
        <div className="space-y-4">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg text-primary">
              <Filter className="h-5 w-5 text-teal-600" />
              <span className="uppercase text-sm tracking-wider font-bold text-slate-800">Filtros de Busca</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Cliente <RequiredMark />
                  <FieldTooltip text={SPED_TOOLTIPS.cliente} />
                </label>
                <Select value={clienteId} onValueChange={(v) => { setClienteId(v); setContribuinteId(''); }}>
                  <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Contribuinte <RequiredMark />
                  <FieldTooltip text={SPED_TOOLTIPS.contribuinte} />
                </label>
                <Select value={contribuinteId} onValueChange={setContribuinteId} disabled={!clienteId}>
                  <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
                    <SelectValue placeholder={clienteId ? 'Selecione...' : 'Selecione um cliente'} />
                  </SelectTrigger>
                  <SelectContent>
                    {contribuintes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nome_razao_social}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Data Início <RequiredMark />
                  <FieldTooltip text={SPED_TOOLTIPS.dataInicio} />
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-11 w-full justify-start text-left font-normal bg-white dark:bg-slate-800", !dtIni && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dtIni ? format(new Date(dtIni + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar selected={dtIni ? new Date(dtIni + 'T00:00:00') : undefined} onSelect={(d) => setDtIni(d ? format(d, 'yyyy-MM-dd') : '')} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Data Fim <RequiredMark />
                  <FieldTooltip text={SPED_TOOLTIPS.dataFim} />
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("h-11 w-full justify-start text-left font-normal bg-white dark:bg-slate-800", !dtFin && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dtFin ? format(new Date(dtFin + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'Selecione...'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar selected={dtFin ? new Date(dtFin + 'T00:00:00') : undefined} onSelect={(d) => setDtFin(d ? format(d, 'yyyy-MM-dd') : '')} />
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  NCM
                  <FieldTooltip text={SPED_TOOLTIPS.ncm} />
                </label>
                <Select value={ncmFilter} onValueChange={(v) => setNcmFilter(v as NcmFilter)}>
                  <SelectTrigger className="h-11 bg-white dark:bg-slate-800">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Nat. Base de Crédito <RequiredMark />
                    <FieldTooltip text={SPED_TOOLTIPS.natBcCredF100} />
                  </label>
                  <Popover open={natBcCredOpen} onOpenChange={setNatBcCredOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" role="combobox" aria-expanded={natBcCredOpen} className="h-11 w-full justify-between text-sm font-normal bg-white dark:bg-slate-800">
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
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Código da Conta <RequiredMark />
                    <FieldTooltip text={SPED_TOOLTIPS.codCtaF100} />
                  </label>
                  <Input
                    placeholder="Ex: 31010201"
                    value={codCta}
                    onChange={(e) => setCodCta(e.target.value)}
                    className="h-11 text-sm font-mono bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            )}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 md:col-span-6">
                <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Buscar
                  <FieldTooltip text={SPED_TOOLTIPS.buscar} />
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por descrição, chave ou NCM..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="pl-9 h-11 bg-white dark:bg-slate-800"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={handleLimpar}>
                <X className="h-4 w-4 mr-2" />
                Limpar
              </Button>
              <Button onClick={handleConsultar} disabled={!canConsult || anyFetching} title={activeTab === 'f100' && !f100FiltersValid ? 'Informe Nat. Base de Crédito ou Cód. Conta para consultar F100' : undefined}>
                <Search className="h-4 w-4 mr-2" />
                {anyFetching ? 'Consultando...' : 'Consultar'}
              </Button>
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
            <TabsList className="grid w-full grid-cols-6 mb-2">
              <TabsTrigger value="c170" className="text-xs sm:text-sm">C170 (NFe/NFCe)</TabsTrigger>
              <TabsTrigger value="a170" className="text-xs sm:text-sm">A170 (NFSe)</TabsTrigger>
              <TabsTrigger value="d100" className="text-xs sm:text-sm">D100 (CTe)</TabsTrigger>
              <TabsTrigger value="f100" className="text-xs sm:text-sm">F100 (Outros)</TabsTrigger>
              <TabsTrigger value="f120" className="text-xs sm:text-sm">F120 (Deprec.)</TabsTrigger>
              <TabsTrigger value="f130" className="text-xs sm:text-sm">F130 (Aquis.)</TabsTrigger>
            </TabsList>

            {(() => null)()}
            {(() => {
              // shared action props passed to every tab
              return null;
            })()}

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
                contribuinteId={contribuinteId}
                onEnviar={() => enviarCorrecoes('C170')}
                onExportar={handleExportar}
                isSending={isSending}
                isExporting={isExporting}
                pendingCount={pendingCount}
                idArquivos={getIdArquivos()}
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
                contribuinteId={contribuinteId}
                onEnviar={() => enviarCorrecoes('A170')}
                onExportar={handleExportar}
                isSending={isSending}
                isExporting={isExporting}
                pendingCount={pendingCount}
                idArquivos={getIdArquivos()}
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
                onEnviar={() => enviarCorrecoes('D100')}
                onExportar={handleExportar}
                isSending={isSending}
                isExporting={isExporting}
                pendingCount={pendingCount}
                idArquivos={getIdArquivos()}
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
                f100FiltersValid={f100FiltersValid}
                onEnviar={() => enviarCorrecoes('F100')}
                onExportar={handleExportar}
                isSending={isSending}
                isExporting={isExporting}
                pendingCount={pendingCount}
                idArquivos={getIdArquivos()}
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
                contribuinteId={contribuinteId}
                onEnviar={() => enviarCorrecoes('F120')}
                onExportar={handleExportar}
                isSending={isSending}
                isExporting={isExporting}
                pendingCount={pendingCount}
                idArquivos={getIdArquivos()}
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
                contribuinteId={contribuinteId}
                onEnviar={() => enviarCorrecoes('F130')}
                onExportar={handleExportar}
                isSending={isSending}
                isExporting={isExporting}
                pendingCount={pendingCount}
                idArquivos={getIdArquivos()}
              />
            </TabsContent>
          </Tabs>
        )}
        </div>
      </TooltipProvider>

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
