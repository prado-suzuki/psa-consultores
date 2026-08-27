/**
 * Histórico de aprendizado — o que o agente aprendeu com correção de usuário.
 *
 * É a memória dele: toda lição ATIVA de um escopo volta no prompt das conversas
 * seguintes daquele escopo. Não há fine-tuning nem embedding no caminho; há
 * texto curado, versionado e desligável. Foi escolha, não atalho: uma regra
 * errada aprendida em produção precisa ser removível por uma pessoa, na hora,
 * sem retreinar nada.
 *
 * O peso ordena a injeção quando há mais lições do que cabe no prompt.
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Save, GraduationCap } from 'lucide-react';
import type { AprendizadoAgente } from '@/hooks/useDomainAgentePsa';

export interface EdicaoAprendizado {
  id: string;
  ativo?: boolean;
  licao?: string;
  peso?: number;
}

interface Props {
  aprendizados: AprendizadoAgente[];
  escopoSelecionado: string;
  salvando: boolean;
  onSalvar: (edicoes: EdicaoAprendizado[]) => void;
}

const ROTULO_TIPO: Record<AprendizadoAgente['tipo'], string> = {
  correcao: 'Correção',
  preferencia: 'Preferência',
  glossario: 'Glossário',
  regra: 'Regra da casa',
};

export function AgenteCockpitAprendizados({
  aprendizados, escopoSelecionado, salvando, onSalvar,
}: Props) {
  const [edicoes, setEdicoes] = useState<Record<string, EdicaoAprendizado>>({});

  const doEscopo = aprendizados.filter((a) => a.escopo === escopoSelecionado);
  const ativos = doEscopo.filter((a) => (edicoes[a.id]?.ativo ?? a.ativo)).length;
  const alterados = Object.keys(edicoes).length;

  const editar = (id: string, patch: Partial<EdicaoAprendizado>) =>
    setEdicoes((atual) => ({ ...atual, [id]: { ...atual[id], id, ...patch } }));

  const salvar = () => {
    onSalvar(Object.values(edicoes));
    setEdicoes({});
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Histórico de aprendizado
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {ativos} lição(ões) ativa(s) neste escopo — cada uma volta no prompt de toda
              conversa desta tela. Desligar remove o efeito na hora, sem apagar o registro.
            </p>
          </div>
          {alterados > 0 && (
            <Button onClick={salvar} disabled={salvando} size="sm">
              {salvando
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <Save className="mr-2 h-4 w-4" />}
              Salvar {alterados}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {doEscopo.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Ninguém corrigiu o agente nesta tela ainda. Quando alguém usar o modo
            "Corrigir" no balão, a lição aparece aqui.
          </p>
        )}

        {doEscopo.map((a) => {
          // Tipado, não `?? {}`: com o objeto vazio o TS infere a união
          // `EdicaoAprendizado | {}` e nenhum campo pode ser lido.
          const edicao: Partial<EdicaoAprendizado> = edicoes[a.id] ?? {};
          const ativo = edicao.ativo ?? a.ativo;
          return (
            <div key={a.id} className="rounded-lg border border-border/60 p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary">{ROTULO_TIPO[a.tipo]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {new Date(a.criado_em).toLocaleString('pt-BR')}
                </span>
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">peso</span>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    className="h-8 w-16"
                    value={edicao.peso ?? a.peso}
                    onChange={(e) => editar(a.id, { peso: Number(e.target.value) })}
                  />
                  <Switch
                    checked={ativo}
                    onCheckedChange={(v) => editar(a.id, { ativo: v })}
                    aria-label={ativo ? 'Lição ativa' : 'Lição desativada'}
                  />
                </div>
              </div>

              <Textarea
                rows={2}
                value={edicao.licao ?? a.licao}
                onChange={(e) => editar(a.id, { licao: e.target.value })}
              />

              {/* O rastro de onde a lição nasceu. Sem ele, uma lição estranha
                  seis meses depois é indefensável: ninguém sabe o que ela
                  corrigia, e a saída fácil seria apagar sem entender. */}
              {(a.pergunta || a.resposta_original) && (
                <details className="text-xs text-muted-foreground">
                  <summary className="cursor-pointer">De onde veio</summary>
                  <div className="mt-2 space-y-1">
                    {a.pergunta && <p><strong className="text-foreground">Perguntaram:</strong> {a.pergunta}</p>}
                    {a.resposta_original && (
                      <p><strong className="text-foreground">Ele respondeu:</strong> {a.resposta_original}</p>
                    )}
                    <p><strong className="text-foreground">Corrigiram:</strong> {a.correcao}</p>
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
