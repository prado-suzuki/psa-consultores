/**
 * Webhook N8n de boas-vindas para novos usuários (representantes e team members).
 * Usado por:
 * - src/hooks/useTeamMemberMutations.ts (criação manual de team member)
 * - src/hooks/useSaveClientTransaction.ts (representante com acesso_chamados)
 * - src/lib/welcomeWebhookQueue.ts (carga em lote via Carga de Chamados)
 */
export const N8N_WELCOME_WEBHOOK =
  'https://psadigital.app.n8n.cloud/webhook/8dd8b7e4-2843-4ab6-bf97-7a3941548153';

export const PSA_LOGIN_URL = 'https://psa-consultores.lovable.app/auth';
export const PSA_PLATFORM_NAME = 'PSA Consultores';
