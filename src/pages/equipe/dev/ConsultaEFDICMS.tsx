import { useEffect, useMemo, useState } from 'react';
import { ConsultaEfdFilters } from '@/components/equipe/dev/consulta-efd-icms/ConsultaEfdFilters';
import { EfdResultsHeader } from '@/components/equipe/dev/consulta-efd-icms/EfdResultsHeader';
import { EfdResultsTable } from '@/components/equipe/dev/consulta-efd-icms/EfdResultsTable';
import { DevLayout } from '@/components/equipe/dev/DevLayout';
import { DevPageHeader } from '@/components/equipe/dev/DevPageHeader';
import { EFDAnalysisModal } from '@/components/equipe/dev/EFDAnalysisModal';
import { EFDExportDialog } from '@/components/equipe/dev/EFDExportDialog';
import { Card, CardContent } from '@/components/ui/card';
import { TooltipProvider } from '@/components/ui/tooltip';
import { monthYearToDateString } from '@/components/ui/month-year-picker.utils';
import { useDomainConsultaEFDICMS } from '@/hooks/useDomainConsultaEFDICMS';
import { useEFDOverview } from '@/hooks/useEFDData';
import { useEfdExportDownloads } from '@/hooks/useEfdExportDownloads';
import { toast } from '@/hooks/use-toast';
import { filterEfdArquivos, getDefaultEfdPeriod, getEfdFiliais, toggleEfdSelection, type MonthYear } from '@/lib/consultaEfdIcms';
import type { EFDArquivo } from '@/types/efd';

const ConsultaEFDICMS = () => {
  const defaults = useMemo(() => getDefaultEfdPeriod(), []);
  const [cliente, setCliente] = useState('');
  const [contribuinte, setContribuinte] = useState('');
  const [filial, setFilial] = useState('todas');
  const [inicio, setInicio] = useState<MonthYear | null>(defaults.inicio);
  const [fim, setFim] = useState<MonthYear | null>(defaults.fim);
  const [searchTriggered, setSearchTriggered] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisArquivo, setAnalysisArquivo] = useState<EFDArquivo | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const domain = useDomainConsultaEFDICMS(cliente);
  const cnpj = useMemo(() => domain.contribuintes?.find(item => item.id === contribuinte)?.cpf_cnpj?.replace(/\D/g, '') || '', [domain.contribuintes, contribuinte]);
  const startDate = monthYearToDateString(inicio, 'start');
  const endDate = monthYearToDateString(fim, 'end');
  const overviewQuery = useEFDOverview({ enabled: searchTriggered && !!contribuinte, idContribuinte: contribuinte, tipo: 'icms' });
  const filiais = useMemo(() => getEfdFiliais(overviewQuery.data?.arquivos), [overviewQuery.data?.arquivos]);
  const arquivos = useMemo(() => filterEfdArquivos(overviewQuery.data?.arquivos, filial, startDate, endDate), [overviewQuery.data?.arquivos, filial, startDate, endDate]);
  const downloads = useEfdExportDownloads();
  const allSelected = arquivos.length > 0 && arquivos.every(item => selected.has(item.ID_ARQUIVO));
  const exportArquivo = selected.size === 1 ? arquivos.find(item => selected.has(item.ID_ARQUIVO)) || null : null;
  const blocos = overviewQuery.data?.blocos_disponiveis || {};

  useEffect(() => {
    if (cliente && domain.contribuintes?.length === 1 && !contribuinte) setContribuinte(domain.contribuintes[0].id);
  }, [cliente, contribuinte, domain.contribuintes]);
  useEffect(() => {
    if (overviewQuery.error) toast({ title: 'Erro ao carregar dados', description: overviewQuery.error instanceof Error ? overviewQuery.error.message : 'Erro desconhecido', variant: 'destructive' });
  }, [overviewQuery.error]);

  const changeCliente = (value: string) => { setCliente(value); setContribuinte(''); setSearchTriggered(false); };
  const changeContribuinte = (value: string) => { setContribuinte(value); setFilial('todas'); setSearchTriggered(false); setSelected(new Set()); };
  const clear = () => { setCliente(''); setContribuinte(''); setFilial('todas'); setInicio(null); setFim(null); setSearchTriggered(false); setSelected(new Set()); };
  const search = () => {
    const missing = [[cliente, 'Cliente'], [contribuinte, 'Contribuinte'], [inicio, 'Data de Início'], [fim, 'Data Fim']].filter(([value]) => !value).map(([, label]) => label);
    if (missing.length) return void toast({ title: 'Preenchimento obrigatório', description: `Por favor, preencha ${missing.join(', ')} para realizar a busca.`, variant: 'destructive' });
    if (!cnpj) return void toast({ title: 'CNPJ não encontrado', description: 'O contribuinte selecionado não possui CNPJ cadastrado.', variant: 'destructive' });
    setSearchTriggered(true);
  };
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(arquivos.map(item => item.ID_ARQUIVO)));
  const downloadSelected = async () => {
    if (!selected.size) return void toast({ title: 'Nenhum arquivo selecionado', description: 'Selecione ao menos um arquivo para baixar.', variant: 'destructive' });
    if (selected.size > 1) return downloads.downloadAll(contribuinte, cnpj, startDate, endDate);
    const arquivo = arquivos.find(item => selected.has(item.ID_ARQUIVO));
    if (arquivo) await downloads.downloadOne(arquivo);
  };
  const exportSelected = () => {
    if (!selected.size) return void toast({ title: 'Nenhum arquivo selecionado', description: 'Selecione ao menos um arquivo para exportar.', variant: 'destructive' });
    if (selected.size === 1) return void setExportOpen(true);
    toast({ title: 'Funcionalidade em desenvolvimento', description: `A exportação em lote de ${selected.size} arquivos ainda está sendo implementada. Por enquanto, exporte cada arquivo individualmente.`, duration: 5000 });
  };

  return <DevLayout title="Consulta EFD ICMS" subtitle="Consulta de EFD ICMS/IPI"><TooltipProvider delayDuration={300}>
    <DevPageHeader description="A Consulta de EFD ICMS centraliza a busca e o download das **Escriturações Fiscais Digitais do ICMS e IPI** da base de dados. Utilize os filtros abaixo para consultar arquivos específicos ou analisar períodos inteiros, permitindo a análise detalhada de blocos e registros diretamente em tela, o download dos arquivos originais em lote (.zip) ou a exportação em formato Excel (.xlsx)." manualUrl="https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-icms/" />
    <ConsultaEfdFilters clientes={domain.clientes} contribuintes={domain.contribuintes} loadingClientes={domain.loadingClientes} loadingContribuintes={domain.loadingContribuintes} cliente={cliente} contribuinte={contribuinte} inicio={inicio} fim={fim} searching={overviewQuery.isLoading && searchTriggered} onCliente={changeCliente} onContribuinte={changeContribuinte} onInicio={setInicio} onFim={setFim} onClear={clear} onSearch={search} />
    <Card className="shadow-sm min-h-[400px] flex flex-col overflow-hidden">{overviewQuery.data && cnpj && <EfdResultsHeader filial={filial} filiais={filiais} cnpj={cnpj} selectedCount={selected.size} loading={overviewQuery.isLoading} downloading={downloads.downloadingId !== null || downloads.downloadingAll} onFilial={setFilial} onRefresh={() => void overviewQuery.refetch()} onExport={exportSelected} onDownload={() => void downloadSelected()} />}<CardContent className="flex-1 p-0"><EfdResultsTable searchTriggered={searchTriggered} loading={overviewQuery.isLoading} arquivos={arquivos} selected={selected} allSelected={allSelected} downloadingId={downloads.downloadingId} blocos={blocos} idContribuinte={contribuinte} onToggleAll={toggleAll} onToggle={id => setSelected(previous => toggleEfdSelection(previous, id))} onDownload={arquivo => void downloads.downloadOne(arquivo)} onAnalyze={arquivo => { setAnalysisArquivo(arquivo); setAnalysisOpen(true); }} /></CardContent></Card>
    <EFDAnalysisModal open={analysisOpen} onOpenChange={setAnalysisOpen} arquivo={analysisArquivo} blocosDisponiveis={blocos} idContribuinte={contribuinte} tipo="icms" />
    {exportArquivo && <EFDExportDialog arquivo={exportArquivo} blocosDisponiveis={blocos} tipo="icms" profileType="efd_icms" idContribuinte={contribuinte} externalOpen={exportOpen} onExternalOpenChange={setExportOpen} hideTrigger />}
  </TooltipProvider></DevLayout>;
};

export default ConsultaEFDICMS;
