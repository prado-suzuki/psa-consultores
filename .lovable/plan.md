

# Corrigir site em branco em psaconsultores.com.br

## Diagnóstico
O HTML servido na URL publicada (`psaconsultores.com.br` e `psa-consultores.lovable.app`) está vindo com o `<head>` completamente vazio — sem `<script>`, sem CSS, sem meta tags. Apenas o `<div id="root"></div>` existe no body. Isso significa que o build de produção que foi publicado está corrompido.

O preview (dev server Vite) funciona normalmente porque serve os arquivos diretamente, sem depender do build estático.

## Causa provável
A última publicação capturou um build quebrado. Pode ter ocorrido um erro de build silencioso (ex: import de arquivo inexistente, erro de TypeScript não bloqueante) que gerou um `index.html` sem os scripts injetados pelo Vite.

## Plano de correção

### 1. Verificar se o build atual compila sem erros
- Rodar `npx vite build` no sandbox para confirmar que o build de produção gera corretamente os arquivos em `dist/`
- Inspecionar o `dist/index.html` gerado para verificar se contém as tags `<script>` e `<link>` esperadas
- Se houver erro de build, corrigir antes de republicar

### 2. Republicar o projeto
- Após confirmar que o build está limpo, solicitar ao usuário que clique em **Publish → Update** para gerar uma nova publicação com o build correto

### 3. Verificar a publicação
- Após republish, acessar `psaconsultores.com.br` e confirmar que o site carrega normalmente com Header, Hero e demais seções

## Detalhes técnicos
- Arquivos envolvidos: `index.html`, `vite.config.ts`, `src/main.tsx`
- O `index.html` fonte está correto (contém todos os meta tags, scripts, etc.)
- O problema está exclusivamente no artefato de build/deploy

