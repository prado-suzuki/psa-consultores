import { Cloud } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TaxTopicsCloudProps {
  topics: { label: string; value: number }[];
  totalTickets: number;
}

export function TaxTopicsCloud({ topics, totalTickets }: TaxTopicsCloudProps) {
  const max = topics[0]?.value ?? 0;
  const min = topics[topics.length - 1]?.value ?? 0;
  const range = Math.max(1, max - min);
  const ratio = (value: number) => (value - min) / range;
  const sizeFor = (value: number) => 12 + Math.round(ratio(value) * 28);
  const weightFor = (value: number) => (ratio(value) > 0.75 ? 700 : ratio(value) > 0.4 ? 600 : 500);
  const colorFor = (value: number) =>
    ratio(value) > 0.25 ? 'text-primary' : 'text-muted-foreground';

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Cloud className="h-4 w-4 text-primary" />
          <div>
            <h3 className="text-sm font-semibold text-foreground">Nuvem de Tópicos Fiscais</h3>
            <p className="text-[11px] text-muted-foreground">
              Termos tributários mais mencionados nos chamados (título + descrição)
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-[11px]">
          {topics.length} {topics.length === 1 ? 'tópico' : 'tópicos'}
        </Badge>
      </div>
      {topics.length === 0 ? (
        <p className="py-10 text-center text-xs text-muted-foreground">
          {totalTickets === 0
            ? 'Sem chamados no recorte atual.'
            : 'Nenhum termo fiscal identificado nos chamados deste recorte.'}
        </p>
      ) : (
        <>
          <div className="flex min-h-[160px] flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-xl bg-gradient-to-br from-muted via-card to-primary/10 px-4 py-6">
            {topics.map((topic) => (
              <span
                key={topic.label}
                className={`inline-flex items-baseline gap-1 leading-none tracking-tight transition-transform hover:scale-110 ${colorFor(topic.value)}`}
                style={{
                  fontSize: `${sizeFor(topic.value)}px`,
                  fontWeight: weightFor(topic.value),
                  fontFamily: "'Instrument Sans', system-ui, sans-serif",
                }}
                title={`${topic.label} — ${topic.value} ${topic.value === 1 ? 'chamado' : 'chamados'}`}
              >
                {topic.label}
                <sup className="text-[10px] font-medium text-muted-foreground tabular-nums">
                  {topic.value}
                </sup>
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
            <span>menos citado</span>
            <span className="h-2 w-2 rounded-sm bg-muted-foreground/40" />
            <span className="h-2 w-2 rounded-sm bg-primary" />
            <span className="h-2 w-2 rounded-sm bg-primary" />
            <span className="h-2 w-2 rounded-sm bg-primary" />
            <span>mais citado</span>
          </div>
        </>
      )}
    </div>
  );
}
