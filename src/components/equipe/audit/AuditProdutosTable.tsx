import { useMemo, useState } from 'react';
import { Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useDomainAuditProdutividade, useDomainOrgTasksProdutividade } from '@/hooks/useDomainAuditLogs';
import {
  agregarPorProduto, buildProdutosCsv, idsTocados,
  type HorasPorId, type VinculoPorId,
} from '@/lib/auditProdutividade';
import { triggerCsvDownload } from '@/lib/roiCsv';
import { AuditTempoMedioProduto } from './AuditTempoMedioProduto';
import { PERIODOS_AUDITORIA } from './auditLabels';

interface AuditProdutosTableProps {
  area: 'tax' | 'osg';
}

const SEM_HORAS: HorasPorId = {};
const SEM_VINCULO: VinculoPorId = {};
const SEM_NOMES: Record<string, string> = {};

/**
 * Aba Produtos: quanto tempo cada tipo de produto contratado consome por item
 * entregue, somando a equipe.
 *
 * Fica separada da aba Produtividade de propósito — lá a pergunta é sobre
 * pessoa, aqui é sobre produto, e a média da equipe não é a média das médias por
 * pessoa (cada uma tem um divisor diferente de itens com apontamento). Os
 * produtos de UMA pessoa continuam na linha expandida da aba Produtividade.
 */
export const AuditProdutosTable = ({ area }: AuditProdutosTableProps) => {
  const [periodo, setPeriodo] = useState('30');
  const dias = Number(periodo);

  const { data: logs = [], isLoading } = useDomainAuditProdutividade(area, dias);

  // Horas e produto dos itens tocados — a lista de ids sai dos próprios logs.
  const ids = useMemo(() => idsTocados(logs), [logs]);
  const { data: vinculos } = useDomainOrgTasksProdutividade(ids);
  // Fallbacks são constantes de módulo: literais `{}` aqui trocariam de
  // identidade a cada render e invalidariam o useMemo abaixo sem motivo.
  const horas = vinculos?.horas ?? SEM_HORAS;
  const produtoPorId = vinculos?.produtoPorId ?? SEM_VINCULO;
  const nomePorProduto = vinculos?.nomePorProduto ?? SEM_NOMES;

  const linhas = useMemo(
    () => agregarPorProduto(logs, horas, produtoPorId, nomePorProduto),
    [logs, horas, produtoPorId, nomePorProduto],
  );

  const handleExportCsv = () => {
    triggerCsvDownload(buildProdutosCsv(linhas), `produtos-${area}-${dias}d.csv`);
  };

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODOS_AUDITORIA.map(p => (
              <SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportCsv}
          disabled={isLoading || linhas.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          CSV
        </Button>
      </div>

      <AuditTempoMedioProduto linhas={linhas} isLoading={isLoading} />

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          <strong className="font-medium">Passe o mouse no nome de qualquer coluna</strong> para
          ver o que aquele número significa. A média por produto é da equipe: ela não é a média
          das médias por pessoa, porque cada pessoa tem um número diferente de itens com horas
          apontadas. Para ver os produtos de uma pessoa, clique na linha dela na aba
          Produtividade.
        </span>
      </p>
    </div>
  );
};
