import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAuditLog } from '@/hooks/useAuditLog';
import { splitName } from '@/lib/nameUtils';
import {
  dispatchWelcomeWebhooks,
  type WelcomeWebhookPayload,
  type WebhookDispatchResult,
} from '@/lib/welcomeWebhookQueue';
import type { RepresentantePendente } from './useRepresentantesSemUsuario';

const TEMP_PASSWORD = 'trocarsenha';
const MAX_BATCH = 200;

export interface CargaProgress {
  total: number;
  processados: number;
  criados: number;
  jaExistiam: number;
  falhasCriacao: number;
  emailsEnviados: number;
  emailsFalharam: number;
  currentEmail?: string;
}

export interface CargaResultado extends CargaProgress {
  falhas: { email: string; motivo: string }[];
  emailsFalhasPayload: WelcomeWebhookPayload[];
}

interface RunArgs {
  representantes: RepresentantePendente[];
  dispararWebhook: boolean;
}

const initialProgress: CargaProgress = {
  total: 0,
  processados: 0,
  criados: 0,
  jaExistiam: 0,
  falhasCriacao: 0,
  emailsEnviados: 0,
  emailsFalharam: 0,
};

export const useCriarUsuariosRepresentantes = () => {
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();
  const [progress, setProgress] = useState<CargaProgress>(initialProgress);
  const [running, setRunning] = useState(false);

  const adminName =
    user?.user_metadata?.first_name && user?.user_metadata?.last_name
      ? `${user.user_metadata.first_name} ${user.user_metadata.last_name}`
      : user?.email || 'Admin';

  const reset = useCallback(() => setProgress(initialProgress), []);

  const run = useCallback(
    async ({ representantes, dispararWebhook }: RunArgs): Promise<CargaResultado> => {
      const lote = representantes.slice(0, MAX_BATCH);
      setRunning(true);
      const failuresCriacao: { email: string; motivo: string }[] = [];
      const webhookPayloads: WelcomeWebhookPayload[] = [];

      let p: CargaProgress = { ...initialProgress, total: lote.length };
      setProgress(p);

      // Etapa 1: criar/ligar usuários sequencialmente (segurança > velocidade).
      for (const r of lote) {
        p = { ...p, currentEmail: r.email };
        setProgress(p);

        const { first_name, last_name } = splitName(r.nome);
        if (!first_name) {
          failuresCriacao.push({ email: r.email, motivo: 'Nome inválido' });
          p = { ...p, processados: p.processados + 1, falhasCriacao: p.falhasCriacao + 1 };
          setProgress(p);
          continue;
        }

        try {
          const { data, error } = await supabase.functions.invoke('upsert-representante-user', {
            body: { email: r.email, first_name, last_name },
          });
          if (error || data?.error) {
            const motivo = data?.error || error?.message || 'Erro desconhecido';
            failuresCriacao.push({ email: r.email, motivo });
            p = { ...p, processados: p.processados + 1, falhasCriacao: p.falhasCriacao + 1 };
            setProgress(p);
            continue;
          }

          const userId: string | null = data?.user_id ?? null;
          const created: boolean = data?.created === true;

          if (!userId) {
            failuresCriacao.push({ email: r.email, motivo: 'Sem user_id retornado' });
            p = { ...p, processados: p.processados + 1, falhasCriacao: p.falhasCriacao + 1 };
            setProgress(p);
            continue;
          }

          // Vincula user_id ao representante e ativa acesso_chamados (única atualização permitida).
          const { error: updErr } = await supabase
            .from('representante')
            .update({ user_id: userId, acesso_chamados: true })
            .eq('id_representante', r.id_representante);

          if (updErr) {
            failuresCriacao.push({ email: r.email, motivo: `Update representante: ${updErr.message}` });
            p = { ...p, processados: p.processados + 1, falhasCriacao: p.falhasCriacao + 1 };
            setProgress(p);
            continue;
          }

          await logAction({
            area: 'cadastros',
            entity_type: 'representante',
            entity_id: r.id_representante,
            entity_name: r.nome,
            action: 'updated',
            changed_fields: {
              user_id: { old: null, new: userId },
              acesso_chamados: { old: false, new: true },
            },
            details: `Carga de chamados (${created ? 'usuário criado' : 'já existia'})`,
          });

          if (created) {
            p = { ...p, criados: p.criados + 1 };
            if (dispararWebhook) {
              webhookPayloads.push({
                first_name,
                last_name,
                email: r.email,
                temporary_password: TEMP_PASSWORD,
                created_by: adminName,
                roles: ['client'],
                areas: [],
              });
            }
          } else {
            p = { ...p, jaExistiam: p.jaExistiam + 1 };
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Erro inesperado';
          failuresCriacao.push({ email: r.email, motivo: msg });
          p = { ...p, falhasCriacao: p.falhasCriacao + 1 };
        } finally {
          p = { ...p, processados: p.processados + 1 };
          setProgress(p);
        }
      }

      // Etapa 2: webhooks N8n em fila throttled (apenas para criados, se solicitado).
      let webhookResults: WebhookDispatchResult[] = [];
      const emailFalhasPayload: WelcomeWebhookPayload[] = [];
      if (dispararWebhook && webhookPayloads.length > 0) {
        webhookResults = await dispatchWelcomeWebhooks(webhookPayloads, (done, total, last) => {
          setProgress((curr) => ({
            ...curr,
            currentEmail: last.email,
            emailsEnviados: curr.emailsEnviados + (last.ok ? 1 : 0),
            emailsFalharam: curr.emailsFalharam + (last.ok ? 0 : 1),
          }));
        });
        webhookResults.forEach((r, idx) => {
          if (!r.ok) emailFalhasPayload.push(webhookPayloads[idx]);
        });
      }

      queryClient.invalidateQueries({ queryKey: ['representantes-sem-usuario'] });
      setRunning(false);

      const finalProgress = await new Promise<CargaProgress>((resolve) => {
        setProgress((curr) => {
          resolve(curr);
          return curr;
        });
      });

      return {
        ...finalProgress,
        falhas: failuresCriacao,
        emailsFalhasPayload: emailFalhasPayload,
      };
    },
    [adminName, logAction, queryClient],
  );

  /** Reenvia apenas emails que falharam, mantendo throttle e retry. */
  const reenviarEmails = useCallback(
    async (payloads: WelcomeWebhookPayload[]) => {
      if (payloads.length === 0) return [];
      setRunning(true);
      const results = await dispatchWelcomeWebhooks(payloads, (_d, _t, last) => {
        setProgress((curr) => ({
          ...curr,
          currentEmail: last.email,
          emailsEnviados: curr.emailsEnviados + (last.ok ? 1 : 0),
          emailsFalharam: curr.emailsFalharam - (last.ok ? 1 : 0),
        }));
      });
      setRunning(false);
      return results;
    },
    [],
  );

  return { run, reenviarEmails, progress, running, reset, MAX_BATCH };
};
