/**
 * Configuração de um escopo do agente: onde ele está ligado, para quem, com
 * qual persona e quantos insights por resposta.
 *
 * Uma linha de `agente_config` = uma aba onde o balão aparece. Ligar o agente
 * numa tela nova é INSERIR uma linha aqui e a tela publicar o seu snapshot —
 * nenhuma linha de código a mais no cliente.
 *
 * O `nivel_acesso` é o papel MÍNIMO para conversar; a checagem acontece na
 * edge function, com o papel lido de `user_roles`. O select abaixo é a
 * configuração, nunca a garantia — garantia que vive no cliente não é garantia.
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Save } from 'lucide-react';
import type { ConfigAgente } from '@/hooks/useDomainAgentePsa';

export interface PatchConfig {
  ativo?: boolean;
  rotulo?: string;
  modelo?: string;
  prompt_personalizado?: string | null;
  nivel_acesso?: ConfigAgente['nivel_acesso'];
  temperatura?: number;
  max_insights_por_resposta?: number;
}

interface Props {
  config: ConfigAgente;
  salvando: boolean;
  onSalvar: (escopo: string, patch: PatchConfig) => void;
}

const NIVEIS: { valor: ConfigAgente['nivel_acesso']; label: string; nota: string }[] = [
  { valor: 'admin', label: 'Admin', nota: 'só administradores' },
  { valor: 'lider', label: 'Líder ou superior', nota: 'líderes e admins' },
  { valor: 'sublider', label: 'Sublíder ou superior', nota: 'sublíderes, líderes e admins' },
  { valor: 'team_member', label: 'Equipe (qualquer membro)', nota: 'todo membro interno' },
];

export function AgenteCockpitConfig({ config, salvando, onSalvar }: Props) {
  const [form, setForm] = useState({
    ativo: config.ativo,
    rotulo: config.rotulo,
    modelo: config.modelo,
    nivel_acesso: config.nivel_acesso,
    temperatura: Number(config.temperatura),
    max_insights_por_resposta: config.max_insights_por_resposta,
    prompt_personalizado: config.prompt_personalizado ?? '',
  });

  // Trocar de escopo na lista recarrega o formulário — sem isto o texto do
  // escopo anterior ficaria na tela e seria salvo no escopo novo.
  useEffect(() => {
    setForm({
      ativo: config.ativo,
      rotulo: config.rotulo,
      modelo: config.modelo,
      nivel_acesso: config.nivel_acesso,
      temperatura: Number(config.temperatura),
      max_insights_por_resposta: config.max_insights_por_resposta,
      prompt_personalizado: config.prompt_personalizado ?? '',
    });
  }, [config]);

  const nivelAtual = NIVEIS.find((n) => n.valor === form.nivel_acesso);

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-foreground">Configuração · {config.escopo}</CardTitle>
        <p className="text-sm text-muted-foreground">
          Última alteração: {new Date(config.updated_at).toLocaleString('pt-BR')}
        </p>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
          <div>
            <Label htmlFor={`ativo-${config.id}`} className="text-foreground">Agente ativo nesta tela</Label>
            <p className="text-xs text-muted-foreground">
              Desligado, o balão recusa a pergunta com o motivo — não desaparece calado.
            </p>
          </div>
          <Switch
            id={`ativo-${config.id}`}
            checked={form.ativo}
            onCheckedChange={(ativo) => setForm((f) => ({ ...f, ativo }))}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`rotulo-${config.id}`}>Rótulo</Label>
            <Input
              id={`rotulo-${config.id}`}
              value={form.rotulo}
              onChange={(e) => setForm((f) => ({ ...f, rotulo: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`nivel-${config.id}`}>Nível de acesso (papel mínimo)</Label>
            <Select
              value={form.nivel_acesso}
              onValueChange={(v) => setForm((f) => ({ ...f, nivel_acesso: v as ConfigAgente['nivel_acesso'] }))}
            >
              <SelectTrigger id={`nivel-${config.id}`}><SelectValue /></SelectTrigger>
              <SelectContent>
                {NIVEIS.map((n) => (
                  <SelectItem key={n.valor} value={n.valor}>{n.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Quem pode conversar: {nivelAtual?.nota}.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`modelo-${config.id}`}>Modelo</Label>
            <Input
              id={`modelo-${config.id}`}
              value={form.modelo}
              onChange={(e) => setForm((f) => ({ ...f, modelo: e.target.value }))}
            />
            <p className="text-xs text-muted-foreground">Identificador do gateway de IA da Lovable.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`insights-${config.id}`}>Insights por resposta (máximo)</Label>
            <Input
              id={`insights-${config.id}`}
              type="number"
              min={0}
              max={6}
              value={form.max_insights_por_resposta}
              onChange={(e) => setForm((f) => ({ ...f, max_insights_por_resposta: Number(e.target.value) }))}
            />
            <p className="text-xs text-muted-foreground">0 desliga o insight e deixa só a resposta.</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <Label>Temperatura</Label>
            <span className="text-xs text-muted-foreground tabular-nums">{form.temperatura.toFixed(2)}</span>
          </div>
          <Slider
            value={[form.temperatura]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={([v]) => setForm((f) => ({ ...f, temperatura: v }))}
          />
          <p className="text-xs text-muted-foreground">
            Baixa é o certo para tela de decisão: o texto varia menos e o número não vira opinião.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor={`prompt-${config.id}`}>Personalização do prompt</Label>
          <Textarea
            id={`prompt-${config.id}`}
            rows={6}
            value={form.prompt_personalizado}
            placeholder="Com quem ele fala, o que a casa chama de quê, o que nunca deve concluir..."
            onChange={(e) => setForm((f) => ({ ...f, prompt_personalizado: e.target.value }))}
          />
          <p className="text-xs text-muted-foreground">
            Some às regras fixas do código (responder só sobre a tela, tratar falha como
            desconhecido, citar a janela) e às lições aprendidas. Não substitui nenhuma das duas.
          </p>
        </div>

        <Button
          onClick={() => onSalvar(config.escopo, {
            ...form,
            prompt_personalizado: form.prompt_personalizado.trim() || null,
          })}
          disabled={salvando}
        >
          {salvando
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <Save className="mr-2 h-4 w-4" />}
          Salvar configuração
        </Button>
      </CardContent>
    </Card>
  );
}
