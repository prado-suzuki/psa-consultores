# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/4cb1f76a-b443-437e-a047-67a69019a54a

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/4cb1f76a-b443-437e-a047-67a69019a54a) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## 📁 Documentação do projeto

Toda documentação que **não é código** (planos, análises, roadmaps, design) fica em `docs/`, organizada por módulo. **Não crie arquivos `.md` soltos na raiz do repositório** — eles viram um monte de arquivo solto e ninguém acha depois.

| Pasta | Conteúdo |
|---|---|
| `docs/planos/` | Planos de implementação (handoff para execução) |
| `docs/mapa/` | Docs do módulo MAPA (Digital) |
| `docs/osg/` | Design do gerador de documentos OSG |
| `docs/rls/` | Auditorias e planos de RLS / banco |
| `docs/geral/` | Docs transversais (roadmaps, notificações) |
| `docs/sprints/` | Registros de sprint |
| `docs/AI_CONTEXT.md` | Contexto-mestre do projeto ("cérebro") |

**Ao criar um novo plano ou análise**, salve direto na subpasta do módulo correspondente em `docs/` (ou em `docs/planos/` se for um plano de implementação). Se o módulo ainda não tiver pasta, crie `docs/<modulo>/`.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/4cb1f76a-b443-437e-a047-67a69019a54a) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
