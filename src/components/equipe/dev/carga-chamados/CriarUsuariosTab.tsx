import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Users, Mail, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  useRepresentantesSemUsuario,
  type StatusClienteFiltro,
} from '@/hooks/useRepresentantesSemUsuario';
import {
  useCriarUsuariosRepresentantes,
  type CargaResultado,
} from '@/hooks/useCriarUsuariosRepresentantes';
import { RepresentantesPendentesModal } from './RepresentantesPendentesModal';
import type { WelcomeWebhookPayload } from '@/lib/welcomeWebhookQueue';

export const CriarUsuariosTab = () => {
  const [status, setStatus] = useState<StatusClienteFiltro>('ativos');
  const [dispararN8n, setDispararN8n] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [resultado, setResultado] = useState<CargaResultado | null>(null);

  const { data: representantes = [], isLoading, refetch } = useRepresentantesSemUsuario(status, modalOpen);
  const { run, reenviarEmails, progress, running, MAX_BATCH } = useCriarUsuariosRepresentantes();

  const handleAbrirModal = async () => {
    setResultado(null);
    setModalOpen(true);
    await refetch();
  };

  const handleConfirmar = async () => {
    try {
      const r = await run({ representantes, dispararWebhook: dispararN8n });
      setResultado(r);
      setModalOpen(false);
      toast.success(
        `Concluído: ${r.criados} criados, ${r.jaExistiam} já existiam, ${r.falhasCriacao} falhas.`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro inesperado';
      toast.error(`Erro na execução: ${msg}`);
    }
  };

  const handleReenviarEmails = async () => {
    if (!resultado || resultado.emailsFalhasPayload.length === 0) return;
    const payloads: WelcomeWebhookPayload[] = resultado.emailsFalhasPayload;
    const results = await reenviarEmails(payloads);
    const ok = results.filter((r) => r.ok).length;
    const fail = results.length - ok;
    toast.message(`Reenvio: ${ok} sucesso · ${fail} falha`);
    setResultado({
      ...resultado,
      emailsEnviados: resultado.emailsEnviados + ok,
      emailsFalharam: fail,
      emailsFalhasPayload: results
        .map((r, i) => (r.ok ? null : payloads[i]))
        .filter((p): p is WelcomeWebhookPayload => p !== null),
    });
  };

  const pct = progress.total > 0 ? Math.round((progress.processados / progress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Atualizar usuários de representantes
          </CardTitle>
          <CardDescription>
            Cria os usuários (auth + role <code>client</code>) para representantes que ainda não têm acesso.
            Após a criação, ativa <strong>Acesso a Chamados</strong> no cadastro do representante.
            Não altera dados de representantes que já possuem usuário.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label className="text-sm font-medium mb-3 block">Status do cliente</Label>
            <RadioGroup
              value={status}
              onValueChange={(v) => setStatus(v as StatusClienteFiltro)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ativos" id="st-ativos" />
                <Label htmlFor="st-ativos" className="cursor-pointer">Ativos</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="inativos" id="st-inativos" />
                <Label htmlFor="st-inativos" className="cursor-pointer">Inativos</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="todos" id="st-todos" />
                <Label htmlFor="st-todos" className="cursor-pointer">Todos</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-md border bg-muted/30">
            <Checkbox
              id="disparar-n8n"
              checked={dispararN8n}
              onCheckedChange={(v) => setDispararN8n(v === true)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label htmlFor="disparar-n8n" className="cursor-pointer font-medium">
                Disparar fluxo N8n (e-mail de boas-vindas)
              </Label>
              <p className="text-xs text-muted-foreground">
                Envio serial e com throttle (~500ms entre disparos) + retry com backoff. Falha em um e-mail
                não interrompe o lote.
              </p>
            </div>
          </div>

          <div className="flex justify-center">
            <Button size="lg" onClick={handleAbrirModal} disabled={running}>
              {running ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
              Contabilizar representantes
            </Button>
          </div>

          {(running || progress.total > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Processando {progress.processados} de {progress.total}
                  {progress.currentEmail ? ` · ${progress.currentEmail}` : ''}
                </span>
                <span className="font-medium">{pct}%</span>
              </div>
              <Progress value={pct} />
            </div>
          )}

          {resultado && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <h4 className="font-semibold">Resumo da execução</h4>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="Criados" value={resultado.criados} tone="success" />
                <Stat label="Já existiam" value={resultado.jaExistiam} tone="muted" />
                <Stat label="Falhas de criação" value={resultado.falhasCriacao} tone="error" />
                <Stat label="Pendentes restantes" value={Math.max(0, representantes.length - resultado.processados)} tone="muted" />
              </div>
              {dispararN8n && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t">
                  <Stat label="E-mails enviados" value={resultado.emailsEnviados} tone="success" icon={<Mail className="h-3 w-3" />} />
                  <Stat label="E-mails que falharam" value={resultado.emailsFalharam} tone="error" icon={<Mail className="h-3 w-3" />} />
                </div>
              )}
              {resultado.falhas.length > 0 && (
                <div className="space-y-1 pt-2 border-t">
                  <p className="text-xs font-medium flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-destructive" /> Falhas detalhadas:
                  </p>
                  <ul className="text-xs text-muted-foreground max-h-32 overflow-auto space-y-0.5">
                    {resultado.falhas.map((f, i) => (
                      <li key={i}>
                        <span className="font-mono">{f.email}</span> — {f.motivo}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {resultado.emailsFalhasPayload.length > 0 && (
                <div className="pt-2 border-t flex justify-end">
                  <Button variant="outline" size="sm" onClick={handleReenviarEmails} disabled={running}>
                    <RefreshCw className="h-3 w-3 mr-2" />
                    Reenviar e-mails que falharam ({resultado.emailsFalhasPayload.length})
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <RepresentantesPendentesModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        representantes={representantes}
        loading={isLoading}
        running={running}
        onConfirmar={handleConfirmar}
        maxBatch={MAX_BATCH}
      />
    </div>
  );
};

const Stat = ({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: number;
  tone: 'success' | 'error' | 'muted';
  icon?: React.ReactNode;
}) => {
  const color =
    tone === 'success' ? 'text-green-600' : tone === 'error' ? 'text-destructive' : 'text-muted-foreground';
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
    </div>
  );
};
