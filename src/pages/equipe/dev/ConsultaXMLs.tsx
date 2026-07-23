import { useEffect, useMemo, useState } from "react";
import { DevLayout } from "@/components/equipe/dev/DevLayout";
import { DevPageHeader } from "@/components/equipe/dev/DevPageHeader";
import { ConsultaXmlFilters } from "@/components/equipe/dev/consulta-xmls/ConsultaXmlFilters";
import { ConsultaXmlResults } from "@/components/equipe/dev/consulta-xmls/ConsultaXmlResults";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useConsultaXmls } from "@/hooks/useConsultaXmls";
import { useDomainConsultaXMLs } from "@/hooks/useDomainConsultaXMLs";
import { toast } from "@/hooks/use-toast";
import { useXmlDownloads } from "@/hooks/useXmlDownloads";
import { ITEMS_PER_PAGE } from "@/lib/consultaXmls";
import type { TipoDocumentoXml, TipoMovimentoXml } from "@/types/consultaXmls";

const ConsultaXMLs = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCliente, setSelectedCliente] = useState("");
  const [selectedContribuinte, setSelectedContribuinte] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState<TipoDocumentoXml>("");
  const [tipoMov, setTipoMov] = useState<TipoMovimentoXml>("");
  const [emitente, setEmitente] = useState("");
  const [destinatario, setDestinatario] = useState("");
  const [chaveAcesso, setChaveAcesso] = useState("");
  const [committedChave, setCommittedChave] = useState("");
  const [searchTriggered, setSearchTriggered] = useState(false);

  const { clientesQuery, contribuintesQuery } = useDomainConsultaXMLs(selectedCliente);
  const { nfeQuery, cteQuery } = useConsultaXmls({
    contribuinteId: selectedContribuinte, startDate, endDate, currentPage, tipoMov,
    emitente, destinatario, chaveAcesso, committedChave, tipoDocumento, searchTriggered,
  });
  const downloads = useXmlDownloads();
  const activeQuery = tipoDocumento === "nfe" ? nfeQuery : cteQuery;
  const nfeRecords = nfeQuery.data?.items || [];
  const cteRecords = cteQuery.data?.items || [];
  const totalRecords = tipoDocumento === "nfe" ? nfeQuery.data?.total || 0 : cteQuery.data?.total || 0;
  const totalPages = Math.ceil(totalRecords / ITEMS_PER_PAGE);

  useEffect(() => {
    const contribuintes = contribuintesQuery.data;
    if (selectedCliente && contribuintes?.length === 1 && !selectedContribuinte) setSelectedContribuinte(contribuintes[0].id);
  }, [selectedCliente, contribuintesQuery.data, selectedContribuinte]);

  useEffect(() => {
    if (activeQuery.error) toast({ title: "Erro na busca", description: (activeQuery.error as Error).message, variant: "destructive" });
  }, [activeQuery.error]);

  const hasActiveFilters = useMemo(() => Boolean(selectedCliente || selectedContribuinte || startDate || endDate || tipoDocumento || tipoMov || emitente || destinatario || chaveAcesso), [selectedCliente, selectedContribuinte, startDate, endDate, tipoDocumento, tipoMov, emitente, destinatario, chaveAcesso]);
  const invalidateSearch = () => setSearchTriggered(false);
  const setters = {
    cliente: (value: string) => { setSelectedCliente(value); setSelectedContribuinte(""); invalidateSearch(); },
    contribuinte: (value: string) => { setSelectedContribuinte(value); invalidateSearch(); },
    startDate: (value: string) => { setStartDate(value); invalidateSearch(); },
    endDate: (value: string) => { setEndDate(value); invalidateSearch(); },
    tipoDocumento: (value: TipoDocumentoXml) => { setTipoDocumento(value); invalidateSearch(); setCurrentPage(1); },
    tipoMov: (value: TipoMovimentoXml) => { setTipoMov(value); invalidateSearch(); },
    emitente: (value: string) => { setEmitente(value); invalidateSearch(); },
    destinatario: (value: string) => { setDestinatario(value); invalidateSearch(); },
    chave: setChaveAcesso,
  };

  const clearFilters = () => {
    setSelectedCliente(""); setSelectedContribuinte(""); setStartDate(""); setEndDate(""); setTipoDocumento("");
    setTipoMov(""); setEmitente(""); setDestinatario(""); setChaveAcesso(""); setCommittedChave("");
    setSearchTriggered(false); setCurrentPage(1);
    toast({ title: "Filtros limpos", description: "Todos os filtros foram resetados" });
  };
  const search = () => {
    if (!selectedCliente || !selectedContribuinte || !tipoDocumento || !startDate || !endDate) {
      toast({ title: "Campos obrigatórios", description: "Preencha Cliente, Contribuinte, Tipo Doc., Data Início e Data Fim.", variant: "destructive" });
      return;
    }
    setCurrentPage(1); setCommittedChave(chaveAcesso); setSearchTriggered(true);
    if (searchTriggered) activeQuery.refetch();
  };

  const values = { cliente: selectedCliente, contribuinte: selectedContribuinte, startDate, endDate, tipoDocumento, tipoMov, emitente, destinatario, chave: chaveAcesso };
  return <DevLayout title="Consulta de XMLs" subtitle="Busque e visualize documentos fiscais"><TooltipProvider delayDuration={300}><div className="w-full min-w-0 max-w-full overflow-hidden space-y-6">
    <DevPageHeader description="A Consulta de XMLs centraliza a busca e o download de documentos fiscais (NFe e CTe) da base de dados. Utilize os filtros abaixo para consultar notas fiscais específicas ou analisar períodos inteiros, permitindo a visualização rápida dos dados em tela, o download dos arquivos originais em lote (.zip) ou a exportação em formato Excel (.xlsx)." manualUrl="https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/consulta-xmls/" />
    <ConsultaXmlFilters values={values} set={setters} clientes={clientesQuery.data} contribuintes={contribuintesQuery.data} loadingClientes={clientesQuery.isLoading} loadingContribuintes={contribuintesQuery.isLoading} errorContribuintes={contribuintesQuery.error as Error | null} nfeRecords={nfeRecords} cteRecords={cteRecords} totalRecords={totalRecords} isLoading={activeQuery.isLoading} downloadingBatch={downloads.downloadingBatch} hasActiveFilters={hasActiveFilters} onClear={clearFilters} onSearch={search} onDownloadBatch={() => downloads.downloadBatch({ contribuinteId: selectedContribuinte, startDate, endDate, tipoDocumento: tipoDocumento === "cte" ? "cte" : "nfe", tipoMov, emitente, destinatario })} />
    <ConsultaXmlResults searchTriggered={searchTriggered} contribuinteId={selectedContribuinte} tipoDocumento={tipoDocumento} nfeRecords={nfeRecords} cteRecords={cteRecords} totalRecords={totalRecords} totalPages={totalPages} currentPage={currentPage} isLoading={activeQuery.isLoading} error={activeQuery.error as Error | null} downloadingKey={downloads.downloadingKey} onRetry={() => activeQuery.refetch()} onPage={setCurrentPage} onDownload={downloads.downloadSingle} />
  </div></TooltipProvider></DevLayout>;
};

export default ConsultaXMLs;
