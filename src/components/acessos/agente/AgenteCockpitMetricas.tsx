/**
 * Os números do agente: volume por escopo, o que ele processou por resposta e
 * quantos insights gerou.
 *
 * "Campos processados por resposta" é a coluna que ninguém costuma ter: cada
 * resposta declara quais campos do snapshot a sustentaram (`campos_usados`), e
 * a contagem aqui mostra sobre o que a diretoria realmente pergunta. Campo que
 * nunca aparece é candidato a sair da tela; campo que aparece sempre merece
 * estar mais acima nela.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MessageSquare, Lightbulb, Timer, Users, ThumbsUp, ThumbsDown } from 'lucide-react';
import type { CockpitAgente } from '@/hooks/useDomainAgentePsa';

const ROTULO_MODO: Record<string, string> = {
  dados: 'Dados (leitura fiel)',
  estrategia: 'Estratégia (cruza blocos)',
  aprender: 'Correção (ensina regra)',
};

const ROTULO_CATEGORIA: Record<string, string> = {
  oportunidade: 'Oportunidade',
  risco: 'Risco',
  execucao: 'Execução',
  dado: 'Qualidade do dado',
  observacao: 'Observação',
};

interface Props {
  dados: CockpitAgente;
}

export function AgenteCockpitMetricas({ dados }: Props) {
  const perguntas = dados.metricas.reduce((a, m) => a + m.perguntas, 0);
  const insights = dados.metricas.reduce((a, m) => a + m.insights, 0);
  const usuarios = dados.metricas.reduce((a, m) => a + m.usuarios, 0);
  const respostas = dados.metricas.reduce((a, m) => a + m.respostas, 0);
  const confiancaBaixa = dados.metricas.reduce((a, m) => a + m.confiancaBaixa, 0);
  const latencias = dados.metricas.map((m) => m.latenciaMediaMs).filter((l): l is number => l !== null);
  const latenciaMedia = latencias.length > 0
    ? Math.round(latencias.reduce((a, l) => a + l, 0) / latencias.length)
    : null;

  const maiorUso = Math.max(1, ...dados.camposMaisUsados.map((c) => c.vezes));

  const cartoes = [
    { icone: MessageSquare, rotulo: 'Perguntas', valor: perguntas, nota: `${respostas} respondidas` },
    {
      icone: Lightbulb,
      rotulo: 'Insights gerados',
      valor: insights,
      nota: respostas > 0 ? `${(insights / respostas).toFixed(1)} por resposta` : 'sem respostas na janela',
    },
    {
      icone: Timer,
      rotulo: 'Latência média',
      valor: latenciaMedia === null ? '—' : `${(latenciaMedia / 1000).toFixed(1)}s`,
      nota: latenciaMedia === null ? 'nenhuma resposta medida' : 'da pergunta à resposta',
    },
    { icone: Users, rotulo: 'Pessoas usando', valor: usuarios, nota: `${dados.metricas.length} escopo(s) ativos` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cartoes.map((c) => (
          <Card key={c.rotulo} className="border-border/60">
            <CardContent className="pt-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <c.icone className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">{c.rotulo}</span>
              </div>
              <div className="mt-2 text-2xl font-bold text-foreground tabular-nums">{c.valor}</div>
              <div className="text-xs text-muted-foreground">{c.nota}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Honestidade da medida: se a varredura bateu no teto, o número abaixo
          é piso, não total. Dizer isso é mais barato que uma RPC nova. */}
      {dados.truncado && (
        <p className="text-xs text-muted-foreground">
          Volume acima do teto de varredura da janela — os números são um piso, não o total.
          Reduza o período para medir com exatidão.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-foreground">O que ele processa por resposta</CardTitle>
            <p className="text-sm text-muted-foreground">
              Campos do snapshot que sustentaram as respostas da janela — declarados
              pela própria resposta, não inferidos.
            </p>
          </CardHeader>
          <CardContent className="space-y-2">
            {dados.camposMaisUsados.length === 0 && (
              <p className="text-sm text-muted-foreground">Nenhuma resposta na janela.</p>
            )}
            {dados.camposMaisUsados.map((c) => (
              <div key={c.campo} className="space-y-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-foreground truncate" title={c.campo}>{c.campo}</span>
                  <span className="text-xs text-muted-foreground tabular-nums">{c.vezes}x</span>
                </div>
                <Progress value={(c.vezes / maiorUso) * 100} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-foreground">Insights por categoria</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {dados.insightsPorCategoria.length === 0 && (
                  <p className="text-sm text-muted-foreground">Nenhum insight na janela.</p>
                )}
                {dados.insightsPorCategoria.map((c) => (
                  <Badge key={c.categoria} variant="secondary">
                    {ROTULO_CATEGORIA[c.categoria] ?? c.categoria}: {c.vezes}
                  </Badge>
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <ThumbsUp className="h-3.5 w-3.5" /> {dados.insightsUteis} serviram
                </span>
                <span className="flex items-center gap-1.5">
                  <ThumbsDown className="h-3.5 w-3.5" /> {dados.insightsDescartados} descartados
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-foreground">Como perguntam</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {dados.porModo.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhuma pergunta na janela.</p>
              )}
              {dados.porModo.map((m) => (
                <div key={m.modo} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-foreground">{ROTULO_MODO[m.modo] ?? m.modo}</span>
                  <span className="text-muted-foreground tabular-nums">{m.vezes}</span>
                </div>
              ))}
              {confiancaBaixa > 0 && (
                <p className="pt-1 text-xs text-muted-foreground">
                  {confiancaBaixa} resposta(s) saíram com <strong className="text-foreground">confiança baixa</strong> —
                  o dado pedido não estava na tela. Cada uma é uma pista de campo faltando no snapshot.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
