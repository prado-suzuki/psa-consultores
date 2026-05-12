import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ExternalLink, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { AreaSummary } from '@/hooks/useProcessMapping';
import { STAGE_TO_STATUS, STAGE_LABEL } from '@/hooks/useProcessMapping';

interface AreaAccordionProps {
  areas: AreaSummary[];
}

const STATUS_ICON: Record<string, any> = {
  not_started: Circle,
  in_progress: Loader2,
  completed: CheckCircle2,
};

const STATUS_COLOR: Record<string, string> = {
  not_started: 'text-amber-500',
  in_progress: 'text-blue-500',
  completed: 'text-teal-600',
};

export function AreaAccordion({ areas }: AreaAccordionProps) {
  const navigate = useNavigate();

  if (areas.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        Nenhum processo cadastrado ainda.
      </Card>
    );
  }

  return (
    <Accordion type="multiple" defaultValue={areas.map(a => a.group_id)} className="space-y-2">
      {areas.map(area => {
        const key = area.group_id;
        return (
          <AccordionItem key={key} value={key} className="border rounded-lg bg-white">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex-1 flex items-center gap-3 pr-4">
                <div
                  className="h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: area.color }}
                />
                <span className="font-medium text-slate-900">{area.area_name}</span>
                <Badge variant="secondary" className="ml-1">
                  {area.completed} de {area.total} concluídos
                </Badge>
                <span className="text-xs text-muted-foreground">{area.completion_percent}%</span>
                <div className="flex-1 max-w-[200px]">
                  <Progress value={area.completion_percent} className="h-1.5" />
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4 pt-0">
              <div className="space-y-2">
                {area.processes.map(p => {
                  const status = STAGE_TO_STATUS[p.stage] ?? 'in_progress';
                  const Icon = STATUS_ICON[status];
                  return (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-md border bg-slate-50/50 hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon className={`h-4 w-4 flex-shrink-0 ${STATUS_COLOR[status]}`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-slate-900 truncate">
                              {p.name}
                            </span>
                            {p.equipe && (
                              <Badge variant="outline" className="h-5 text-[10px] bg-teal-50 text-teal-700 border-teal-200">
                                {p.equipe.name}
                              </Badge>
                            )}
                            {p.code && (
                              <span className="text-xs font-mono text-muted-foreground">
                                {p.code}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>{STAGE_LABEL[p.stage] ?? p.stage}</span>
                            <span>·</span>
                            <span>{p.stages_count} etapa(s)</span>
                            {p.has_roi && <Badge variant="outline" className="h-5 text-[10px]">ROI</Badge>}
                            {p.has_sop && <Badge variant="outline" className="h-5 text-[10px]">SOP</Badge>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="w-24">
                          <Progress value={p.completeness_score * 100} className="h-1.5" />
                          <p className="text-[10px] text-muted-foreground text-right mt-1">
                            {Math.round(p.completeness_score * 100)}%
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => navigate(`/equipe/processos?id=${p.id}`)}
                          title="Ver no detalhe"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}
