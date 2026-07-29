# Segurança — token admin, escrita no banco e limpeza

Detalhamento da política. O resumo operacional está no `SKILL.md`; aqui é o "porquê"
e os casos de borda.

## 1. O token é uma credencial admin viva

Neste projeto o JWT que o usuário fornece é de um **usuário admin**. Consequências:

- **Renderização:** injetado no `localStorage` (`sb-<ref>-auth-token`), o app carrega
  logado como esse admin. Como o admin enxerga tudo (todas as áreas, todos os botões),
  **você quase nunca precisa preparar dados** para um botão aparecer — o gating por
  responsável/perfil que trava usuários comuns não trava o admin. Isso, por si só,
  **elimina a maior parte da tentação de escrever no banco** (foi exatamente o motivo
  que levou o Lovable a mutar dados: gravava como um não-admin).
- **Escrita:** toda ação de UI que salva/confirma/exclui — e qualquer chamada direta
  PostgREST/SQL feita com esse token — **executa com privilégio de admin e passa pelo
  RLS**. Não há rede de segurança. Um clique em "Confirmar" grava de verdade.

**Tratamento do segredo:**
- Nunca imprima o token, nunca escreva num arquivo versionado, nunca passe inline na
  linha de comando (vaza no histórico/lista de processos). Use `--session-file` apontando
  para um arquivo **fora do repo**, ou a env `PSA_GIF_SESSION`.
  - Windows: `%TEMP%\psa_tok.txt` (PowerShell: `$env:TEMP\psa_tok.txt`)
  - macOS/Linux: `"$TMPDIR/psa_tok.txt"` ou `/tmp/psa_tok.txt`
- Apague o arquivo do token ao terminar.
- Se o usuário **colar o token no chat**, avise que ele fica no histórico da conversa e
  recomende **rotacionar a sessão** (deslogar/relogar) depois.
- **Expirou (`exp` no passado) → PARE** e peça um token novo. Nunca "grave com o que tem".
  O script já aborta nesse caso.

### Como o usuário obtém o token
No navegador logado no portal:
- **DevTools → Application → Local Storage → `http://localhost:8080`** → copie o **valor**
  da chave `sb-<ref>-auth-token` (JSON completo — caminho **recomendado**, traz o
  refresh_token e a sessão inteira), **ou**
- Console: `JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.endsWith('-auth-token')))).access_token` → copia só o **JWT** (o script monta uma sessão mínima a partir dele; funciona para gravações curtas).

## 2. Ambiente: confira ANTES de gravar (e muito mais antes de escrever)

O token carrega o `iss` do Supabase, de onde o script deriva o `supabase_ref` e o imprime:
`[alvo] app=localhost:8080  supabase_ref=<ref>`. **Olhe essa linha.** Se o token for de
produção, você estará dirigindo o app contra dados de produção — read-only tudo bem, mas
**qualquer passo `mutates` gravaria em produção**. Na dúvida sobre dev vs prod, pergunte ao
usuário antes de seguir.

## 3. Regra de escrita no banco: avisar ANTES, sempre

Classifique cada ação do roteiro:

| Tipo | Exemplos | Regra |
|---|---|---|
| **Read-only** | navegar, rolar, abrir modal/dropdown, hover, screenshot | Livre. É o padrão. |
| **Escrita via UI** | clicar Salvar/Confirmar/Enviar/Excluir; digitar + salvar | Marque `"mutates": true`. **Avise o usuário o que vai mudar e obtenha OK** antes de rodar com `--confirm-writes`. |
| **Escrita direta no banco** | qualquer POST/PATCH/DELETE PostgREST ou SQL para "preparar" o cenário | **Evite.** Só com OK explícito + snapshot + rollback (ver §5). |

Duas travas no script trabalham juntas:

- **Gate (declarado):** passos `mutates` são **bloqueados** sem `--confirm-writes`. É uma
  barreira técnica, não só textual.
- **Heurística (esquecido):** se um `click`/`press` bate em verbos de escrita
  (Salvar/Confirmar/Excluir/Enviar/Publicar/Criar…) mas **não** está marcado `mutates`, o
  script imprime `[ALERTA HEURISTICO]` listando o passo. Ela **avisa, não bloqueia** —
  então: se aquele passo grava, marque `mutates`; se é read-only (só abre um diálogo, por
  exemplo), pode ignorar. Serve para pegar a marcação esquecida.

A decisão de pedir consentimento é sua: descreva em português claro **qual entidade** muda
e **como** (ex.: "vai mudar o chamado #123 para status *Em revisão* e criar 1 comentário")
antes de seguir.

## 4. Estratégias para NÃO precisar gravar no banco (preferidas, nesta ordem)

1. **Gravar como admin** (padrão) — o admin vê o botão sem preparar nada.
2. **Parar antes do confirm destrutivo** — grave até o diálogo de confirmação **aberto**
   (mostra o fluxo inteiro) e **não** clique em Confirmar. Cobre 90% dos "demos de feature".
3. **Estado transitório via `delay_routes`** — para loaders/skeletons/spinners, atrase a
   resposta em vez de mexer em dado (ver `examples/storyboard.loader.example.json`).
4. **Entidade `[DEMO]` descartável** — se o clique final é essencial, crie uma entidade de
   teste (título com prefixo `[DEMO]`) **pela própria UI**, no fluxo normal, no ambiente
   **dev**, e opere sobre ela. Sem cirurgia no banco.
5. **Só então**, e com consentimento, operar sobre dado real com snapshot+rollback.

## 5. Se for MESMO gravar no banco: snapshot → rollback (e o que NUNCA fazer)

- **Antes:** leia e guarde a(s) linha(s) exata(s) que vão mudar (todas as colunas) — é o
  seu ponto de restauração. Não confie em "eu acho que o status era X".
- **Depois:** restaure a partir do snapshot e **apague por id** o que o fluxo criou
  (comentários, eventos), **não** por janela de tempo (`created_at > now() - interval`
  apaga linhas de outras pessoas e falha se você rodar tarde).
- **Verifique** o estado final ao vivo.

**NUNCA (as lições do episódio Lovable):**
- ❌ `set session_replication_role='replica'` ou qualquer coisa que **desligue triggers/RLS**.
  No `org_tasks`, por exemplo, a trigger `org_tasks_team_member_status_only` é literalmente
  documentada como *"a barreira de integridade para UPDATEs diretos"* — contorná-la fura
  integridade **e** auditoria (os `audit_logs` não registram o que a trigger desligada
  deixou passar).
- ❌ mutar uma **entidade real compartilhada** só para um GIF.
- ❌ deletes por janela de tempo como "rollback".
- ❌ assumir o estado anterior sem snapshot.

## 6. Higiene de saída

- Frames, GIF e token vão para uma pasta **fora do controle de versão** (ex.: `out/` ou o
  diretório temporário do SO). Se for salvar dentro do repo, garanta que a pasta de saída
  está no `.gitignore` **antes** de rodar.
- Entregue **só o GIF**. Não commite frames, token nem SQL temporário.
