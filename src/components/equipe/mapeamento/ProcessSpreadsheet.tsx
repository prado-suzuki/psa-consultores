import { useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowUpDown, ArrowUp, ArrowDown, Download, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MappingProcess } from '@/hooks/useProcessMapping';
import { STAGE_LABEL, STAGE_TO_STATUS } from '@/hooks/useProcessMapping';

interface ProcessSpreadsheetProps {
  processes: MappingProcess[];
}

type SortKey =
  | 'code'
  | 'name'
  | 'area'
  | 'stage'
  | 'priority'
  | 'stages_count'
  | 'completeness_score'
  | 'roi'
  | 'last_improvement_date';

type SortDir = 'asc' | 'desc';

const STATUS_LABEL: Record<string, string> = {
  not_started: 'Não Iniciado',
  in_progress: 'Em Andamento',
  completed: 'Concluído',
};

const STATUS_BADGE_CLASS: Record<string, string> = {
  not_started: 'bg-amber-100 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-accent/10 text-teal-700 border-primary/15',
};

const PRIORITY_LABEL: Record<string, string> = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
  critical: 'Crítica',
};

export function ProcessSpreadsheet({ processes }: ProcessSpreadsheetProps) {
  const navigate = useNavigate();
  const [sortKey, setSortKey] = useState<SortKey>('code');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const sorted = useMemo(() => {
    const arr = [...processes];
    arr.sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      const va = pickValue(a, sortKey);
      const vb = pickValue(b, sortKey);
      if (va === vb) return 0;
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
    return arr;
  }, [processes, sortKey, sortDir]);

  const handleExport = () => {
    const rows = sorted.map(p => ({
      Codigo: p.code ?? '',
      Nome: p.name,
      Equipe: p.display_group_name,
      Estagio: STAGE_LABEL[p.stage] ?? p.stage,
      Status: STATUS_LABEL[STAGE_TO_STATUS[p.stage] ?? 'in_progress'],
      Prioridade: p.priority ? (PRIORITY_LABEL[p.priority] ?? p.priority) : '',
      Etapas: p.stages_count,
      'Completude (%)': Math.round(p.completeness_score * 100),
      'ROI (%)': p.last_roi_percentage !== null ? Math.round(p.last_roi_percentage) : '',
      'Economia Mensal (R$)': p.last_cost_saved_monthly ?? '',
      'Última Avaliação': p.last_improvement_date
        ? new Date(p.last_improvement_date).toLocaleDateString('pt-BR')
        : '',
    }));

    const headers = Object.keys(rows[0] ?? { Codigo: '' });
    const csv = [
      headers.join(';'),
      ...rows.map(row =>
        headers
          .map(h => {
            const v = (row as any)[h];
            const s = v === null || v === undefined ? '' : String(v);
            return s.includes(';') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(';')
      ),
    ].join('\n');

    // eslint-disable-next-line no-irregular-whitespace -- BOM \ufeff necessário para Excel reconhecer UTF-8
    const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapeamento-processos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <div className="flex items-center justify-between p-4 border-b">
        <p className="text-sm text-muted-foreground">
          {sorted.length} processo(s) listado(s)
        </p>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={sorted.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableHead label="Código" sortKey="code" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortableHead label="Processo" sortKey="name" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortableHead label="Equipe" sortKey="area" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortableHead label="Status" sortKey="stage" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortableHead label="Prioridade" sortKey="priority" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortableHead label="Etapas" sortKey="stages_count" current={sortKey} dir={sortDir} onClick={toggleSort} className="text-center" />
              <SortableHead label="Completude" sortKey="completeness_score" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <SortableHead label="ROI" sortKey="roi" current={sortKey} dir={sortDir} onClick={toggleSort} className="text-right" />
              <SortableHead label="Última Avaliação" sortKey="last_improvement_date" current={sortKey} dir={sortDir} onClick={toggleSort} />
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  Nenhum processo encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            )}
            {sorted.map(p => {
              const status = STAGE_TO_STATUS[p.stage] ?? 'in_progress';
              const completenessPercent = Math.round(p.completeness_score * 100);
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-xs">{p.code ?? '—'}</TableCell>
                  <TableCell className="font-medium text-slate-900">{p.name}</TableCell>
                  <TableCell>{p.display_group_name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={STATUS_BADGE_CLASS[status]}>
                      {STATUS_LABEL[status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{p.priority ? PRIORITY_LABEL[p.priority] ?? p.priority : '—'}</TableCell>
                  <TableCell className="text-center">{p.stages_count}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={completenessPercent} className="h-1.5 flex-1" />
                      <span className="text-xs text-muted-foreground w-9 text-right">{completenessPercent}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.last_roi_percentage !== null
                      ? `${Math.round(p.last_roi_percentage)}%`
                      : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {p.last_improvement_date
                      ? new Date(p.last_improvement_date).toLocaleDateString('pt-BR')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => navigate(`/equipe/processos?id=${p.id}`)}
                      title="Abrir no detalhe"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function pickValue(p: MappingProcess, key: SortKey): string | number | null {
  switch (key) {
    case 'code': return p.code ?? '';
    case 'name': return p.name;
    case 'area': return p.display_group_name;
    case 'stage': return STAGE_LABEL[p.stage] ?? p.stage;
    case 'priority': return p.priority ?? '';
    case 'stages_count': return p.stages_count;
    case 'completeness_score': return p.completeness_score;
    case 'roi': return p.last_roi_percentage ?? -Infinity;
    case 'last_improvement_date': return p.last_improvement_date ?? '';
  }
}

interface SortableHeadProps {
  label: string;
  sortKey: SortKey;
  current: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
  className?: string;
}

function SortableHead({ label, sortKey, current, dir, onClick, className }: SortableHeadProps) {
  const active = current === sortKey;
  const Icon = !active ? ArrowUpDown : dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead className={className}>
      <button
        type="button"
        onClick={() => onClick(sortKey)}
        className="inline-flex items-center gap-1 hover:text-slate-900 transition-colors"
      >
        {label}
        <Icon className="h-3 w-3" />
      </button>
    </TableHead>
  );
}
