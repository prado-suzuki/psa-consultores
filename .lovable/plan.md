
# Agente de Boas-Vindas via Webhook n8n

## Objetivo
Quando um novo usuario for criado com sucesso na pagina `/equipe/acessos`, disparar um POST para o webhook do n8n com os dados necessarios para que o workflow envie um e-mail de boas-vindas ao usuario.

## Dados do JSON (payload)

O payload enviado ao webhook contera todas as informacoes que o workflow do n8n precisa para montar o e-mail de boas-vindas:

```text
{
  "event_type": "user_created",
  "user_data": {
    "first_name": "Alexandre",
    "last_name": "Silva",
    "email": "alexandre.silva@psaconsultores.com.br",
    "roles": ["team_member", "client"],
    "areas": ["fiscal", "dev"]
  },
  "credentials": {
    "email": "alexandre.silva@psaconsultores.com.br",
    "temporary_password": "senhaTemporaria123"
  },
  "platform": {
    "login_url": "https://psa-consultores.lovable.app/equipe",
    "name": "PSA Consultores"
  },
  "created_by": "Nome do Admin",
  "created_at": "2026-02-26T12:00:00.000Z"
}
```

## Implementacao

### Alteracao unica: `src/pages/equipe/EquipeControleAcessos.tsx`

No callback `onSuccess` da `createUserMutation` (linha ~304), apos o usuario ser criado com sucesso e as permissoes de area serem concedidas, adicionar um bloco que:

1. Monta o payload JSON com os dados do usuario recem-criado (`newUser`), as credenciais temporarias (email + senha), a URL de login da plataforma, o nome do admin que criou e o timestamp.
2. Dispara um `fetch` POST para a URL do webhook de teste:
   `https://psadigital.app.n8n.cloud/webhook-test/8dd8b7e4-2843-4ab6-bf97-7a3941548153`
3. O disparo e feito em modo "fire-and-forget" (sem bloquear o fluxo). Se falhar, apenas loga no console -- nao impede o sucesso da criacao do usuario.

### Detalhes tecnicos

- O POST sera feito diretamente do frontend via `fetch`, pois o webhook de teste do n8n e publico e nao requer autenticacao.
- Nao sera necessario criar edge function, pois e apenas um POST simples para um endpoint externo.
- O campo `credentials.temporary_password` contem a senha definida no formulario, permitindo que o e-mail de boas-vindas inclua as credenciais iniciais de acesso.
- O campo `created_by` sera preenchido com o nome do usuario logado (disponivel via `useAuth`).

### Seguranca

- A URL do webhook de **teste** sera usada conforme solicitado. Para producao, bastara trocar a URL.
- A senha temporaria e enviada apenas neste momento (criacao); o e-mail de boas-vindas deve orientar o usuario a altera-la no primeiro acesso.
