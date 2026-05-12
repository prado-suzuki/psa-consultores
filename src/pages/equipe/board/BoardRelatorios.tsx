import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { BOARD_REPORTS } from '@/config/boardReports';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const BoardRelatorios = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const reportParam = searchParams.get('relatorio') ?? '';

  const selectedReport = useMemo(() => {
    if (BOARD_REPORTS.length === 0) return null;
    return BOARD_REPORTS.find((report) => report.id === reportParam) ?? BOARD_REPORTS[0];
  }, [reportParam]);

  const handleReportChange = (reportId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('relatorio', reportId);
    setSearchParams(nextParams, { replace: true });
  };

  const iframeUrl = selectedReport.embedUrl;

  if (!selectedReport) {
    return (
      <BoardLayout title="Relatórios BI">
        <div
          className="rounded-[20px] border p-8 text-center shadow-sm"
          style={{ borderColor: 'var(--board-border)', backgroundColor: 'var(--board-card)' }}
        >
          <p className="text-sm" style={{ color: 'var(--board-t2)' }}>
            Nenhum relatório foi configurado para esta área.
          </p>
        </div>
      </BoardLayout>
    );
  }

  return (
    <BoardLayout title="Relatórios BI" noPadding>
      <div className="px-[22px] md:px-6 lg:px-6 pt-[22px] md:pt-6 lg:pt-6 mb-5">
        <h1
          className="text-[22px] font-semibold tracking-[-0.01em]"
          style={{ color: 'var(--board-t1)' }}
        >
          Relatórios BI
        </h1>

        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div className="min-w-0">
            <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--board-t2)' }}>
              Utilize para alternar entre relatórios
            </label>
            <Select value={selectedReport.id} onValueChange={handleReportChange}>
              <SelectTrigger className="w-[340px] h-10 rounded-full border bg-white/90 px-3 text-left text-sm shadow-none focus:ring-2 focus:ring-ring focus:ring-offset-0">
                <SelectValue placeholder="Selecione um relatório" />
              </SelectTrigger>
              <SelectContent>
                {BOARD_REPORTS.map((report) => (
                  <SelectItem key={report.id} value={report.id}>
                    {report.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="w-full overflow-auto flex justify-center">
        <iframe
          key={selectedReport.id}
          width="1280"
          height="925"
          src={iframeUrl}
          title={selectedReport.label}
          frameBorder={0}
          style={{ border: 0 }}
          allowFullScreen
          loading="lazy"
          sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </BoardLayout>
  );
};

export default BoardRelatorios;