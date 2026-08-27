import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Lightbulb,
  RefreshCw,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import type { AnaliseInteligenteAnalysis as AnaliseInteligenteAnalysisData } from '@/lib/analiseInteligente';

interface AnaliseInteligenteAnalysisProps {
  analise: AnaliseInteligenteAnalysisData | null;
  analyzing: boolean;
  riskBadgeClassName: string;
  riskBadgeLabel: string;
  onAnalyze: () => void;
}

export function AnaliseInteligenteAnalysis({
  analise,
  analyzing,
  riskBadgeClassName,
  riskBadgeLabel,
  onAnalyze,
}: AnaliseInteligenteAnalysisProps) {
  if (!analise) {
    return (
      <Card className="border-dashed border-accent/40 bg-accent/5">
        <CardContent className="py-8 text-center">
          <Sparkles className="h-10 w-10 text-accent mx-auto mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">Gerar análise estratégica</h3>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Clique em <strong>"Gerar Análise IA"</strong> para produzir insights cruzados sobre
            evolução, saudabilidade, aderência ao escopo e gastos extras — alimentado por Claude AI.
          </p>
          <Button
            onClick={onAnalyze}
            disabled={analyzing}
            className="bg-teal-600 hover:bg-teal-700"
          >
            {analyzing ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {analyzing ? 'Analisando…' : 'Gerar Análise Agora'}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-teal-200 bg-gradient-to-br from-teal-50 to-white shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base text-teal-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-teal-600" />
            Análise Estratégica (Claude AI)
          </CardTitle>
          <Badge className={`${riskBadgeClassName} border-0`}>{riskBadgeLabel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-white/80 rounded-md border-l-4 border-teal-500">
          <p className="text-sm text-teal-900 font-medium">{analise.sintese_executiva}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-white/70 p-3 rounded-md border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-teal-600" /> Evolução das Entregas
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">{analise.evolucao_entregas}</p>
          </div>
          <div className="bg-white/70 p-3 rounded-md border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Clock className="h-3 w-3 text-teal-600" /> Tempo vs Resultado
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">{analise.tempo_vs_resultado}</p>
          </div>
          <div className="bg-white/70 p-3 rounded-md border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-teal-600" /> Saudabilidade
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">{analise.saudabilidade_sprint}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white/70 p-3 rounded-md border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Target className="h-3 w-3 text-blue-600" /> Aderência ao Escopo
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">{analise.aderencia_escopo}</p>
          </div>
          <div className="bg-white/70 p-3 rounded-md border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <DollarSign className="h-3 w-3 text-red-600" /> Gastos Extras
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">{analise.gastos_extras}</p>
          </div>
        </div>

        <Separator className="my-2" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-red-50/70 p-3 rounded-md border border-red-100">
            <h4 className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" /> Riscos
            </h4>
            <ul className="space-y-1 text-xs text-red-800">
              {analise.riscos.map((r, i) => (
                <li key={i} className="flex gap-1">
                  <span>•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-amber-50/70 p-3 rounded-md border border-amber-100">
            <h4 className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
              <Lightbulb className="h-3 w-3" /> Oportunidades
            </h4>
            <ul className="space-y-1 text-xs text-amber-800">
              {analise.oportunidades.map((o, i) => (
                <li key={i} className="flex gap-1">
                  <span>•</span>
                  <span>{o}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-teal-50/70 p-3 rounded-md border border-teal-100">
            <h4 className="text-xs font-semibold text-teal-700 mb-2 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> Recomendações
            </h4>
            <ul className="space-y-1 text-xs text-teal-800">
              {analise.recomendacoes.map((r, i) => (
                <li key={i} className="flex gap-1">
                  <span>•</span>
                  <span>{r}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
