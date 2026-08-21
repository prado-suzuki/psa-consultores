/**
 * Aba Agente — o cockpit operacional do Agente PSA, em Digital > Acessos.
 *
 * Mora aqui, e não numa tela nova, porque é a mesma pergunta das outras abas
 * desta página: QUEM alcança O QUÊ. A diferença é que o "quem" tem prompt,
 * memória e volume medido.
 *
 * Quatro coisas, na ordem em que a dúvida aparece:
 *   1. está sendo usado?          -> volume por escopo
 *   2. sobre o que ele responde?  -> campos processados por resposta
 *   3. como ele se comporta?      -> configuração e personalização do prompt
 *   4. o que ele já aprendeu?     -> histórico de correções (ativáveis)
 *
 * Só admin: a leitura é da casa inteira e a escrita muda o comportamento do
 * agente em produção. A edge function repete a checagem — o gate visual aqui é
 * conveniência, não segurança.
 */
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Bot, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAgenteCockpit, useAgenteSalvarConfig,
} from '@/hooks/useDomainAgentePsa';
import { AgenteCockpitMetricas } from '@/components/acessos/agente/AgenteCockpitMetricas';
import { AgenteCockpitConfig, type PatchConfig } from '@/components/acessos/agente/AgenteCockpitConfig';
import {
  AgenteCockpitAprendizados, type EdicaoAprendizado,
} from '@/components/acessos/agente/AgenteCockpitAprendizados';

const JANELAS = [7, 30, 90];

export function AgenteTab() {
  const { isAdmin } = useAuth();
  const [dias, setDias] = useState(30);
  const [escopoSelecionado, setEscopoSelecionado] = useState<string | null>(null);

  const cockpit = useAgenteCockpit(dias, isAdmin);
  const salvar = useAgenteSalvarConfig();

  // Seleciona o primeiro escopo assim que a lista chega, e não deixa uma
  // seleção órfã sobreviver se aquele escopo sair do cadastro.
  useEffect(() => {
    const escopos = cockpit.data?.configs.map((c) => c.escopo) ?? [];
    if (escopos.length === 0) return;
    setEscopoSelecionado((atual) => (atual && escopos.includes(atual) ? atual : escopos[0]));
  }, [cockpit.data]);

  if (!isAdmin) {
    return (
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Acesso restrito</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            O cockpit do agente é de administradores: ele mostra as conversas da casa
            inteira e altera o comportamento do agente em produção.
          </p>
        </CardContent>
      </Card>
    );
  }

  const dados = cockpit.data;
  const config = dados?.configs.find((c) => c.escopo === escopoSelecionado) ?? null;

  const aplicarConfig = (escopo: string, patch: PatchConfig) => {
    salvar.mutate({ escopo, patch }, {
      onSuccess: () => toast.success('Configuração do agente salva'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Falha ao salvar'),
    });
  };

  const aplicarAprendizados = (edicoes: EdicaoAprendizado[]) => {
    if (!escopoSelecionado || edicoes.length === 0) return;
    salvar.mutate({ escopo: escopoSelecionado, patch: {}, aprendizados: edicoes }, {
      onSuccess: () => toast.success('Histórico de aprendizado atualizado'),
      onError: (e) => toast.error(e instanceof Error ? e.message : 'Falha ao salvar'),
    });
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base text-foreground flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Agente PSA
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                O balão flutuante das telas do sistema. Ele responde sobre o snapshot
                que a própria tela publica — não recalcula número nenhum — e aprende
                pelas correções registradas aqui.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {JANELAS.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={d === dias ? 'default' : 'outline'}
                  onClick={() => setDias(d)}
                >
                  {d}d
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => cockpit.refetch()}
                disabled={cockpit.isFetching}
                title="Atualizar"
              >
                <RefreshCw className={`h-4 w-4 ${cockpit.isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {cockpit.isError && (
            <div role="alert" className="flex items-start gap-2 rounded-lg border border-border/60 p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Não consegui carregar o cockpit</p>
                <p className="text-muted-foreground">
                  {cockpit.error instanceof Error ? cockpit.error.message : 'Erro desconhecido.'}
                  {' '}Se a mensagem falar de tabela inexistente, a migration do agente ainda
                  não foi aplicada neste banco.
                </p>
              </div>
            </div>
          )}

          {cockpit.isLoading && <Skeleton className="h-24 rounded-lg" />}

          {dados && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {dados.configs.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    Nenhum escopo configurado. Cada tela que ganha o agente vira uma linha
                    de <code>agente_config</code>.
                  </p>
                )}
                {dados.configs.map((c) => {
                  const m = dados.metricas.find((x) => x.escopo === c.escopo);
                  const ativo = c.escopo === escopoSelecionado;
                  return (
                    <button
                      key={c.escopo}
                      type="button"
                      onClick={() => setEscopoSelecionado(c.escopo)}
                      className={`rounded-lg border px-3 py-2 text-left transition-colors ${
                        ativo ? 'border-primary bg-primary/10' : 'border-border/60 hover:border-border'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{c.rotulo}</span>
                        {!c.ativo && <Badge variant="outline">desligado</Badge>}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {m ? `${m.perguntas} perguntas · ${m.insights} insights · ${m.usuarios} pessoa(s)` : 'sem uso na janela'}
                      </div>
                    </button>
                  );
                })}
              </div>

              <AgenteCockpitMetricas dados={dados} />
            </div>
          )}
        </CardContent>
      </Card>

      {config && (
        <AgenteCockpitConfig
          config={config}
          salvando={salvar.isPending}
          onSalvar={aplicarConfig}
        />
      )}

      {dados && escopoSelecionado && (
        <AgenteCockpitAprendizados
          aprendizados={dados.aprendizados}
          escopoSelecionado={escopoSelecionado}
          salvando={salvar.isPending}
          onSalvar={aplicarAprendizados}
        />
      )}
    </div>
  );
}

export default AgenteTab;
