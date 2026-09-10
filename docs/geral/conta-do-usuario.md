# A conta do usuário: o cartão da barra lateral vira porta

**Decidido com a Patricia em 10/09/2026**, olhando a maquete clicável das três alternativas.
Ela escolheu a **porta A** (menu curto no cartão, conta em página própria) e a ordem
**cartão primeiro, escala escura depois**.

## Fase 1 — o cartão vira porta ✅ (10/09/2026)

`SidebarCartaoUsuario` era um `<div>` que não clicava. Virou gatilho de menu, e **só o "Sair"
entrou nele**.

**A correção do mesmo dia, e a regra que sai dela.** A primeira versão levou os três botões do
rodapé para dentro do menu — "Trocar área" e "Voltar ao site" junto. A Patricia mandou os dois
de volta para fora poucas horas depois, olhando `/equipe/dashboard`: **são navegação**, ficam
na barra ao lado dos outros destinos, e atrás de um clique no nome de quem está logado a equipe
procura. "Sair" é o único que não é destino — é o fim da sessão, e é o que pertence à conta.

A regra, para a próxima vez que der vontade de limpar o rodapé: **destino fica visível na
barra; o que é da sessão e da identidade fica no cartão.** `SidebarCartaoUsuario.test.tsx` tem
um teste que falha se "Trocar área" ou "Voltar ao site" voltarem para dentro do menu.

Os seis rodapés ficaram assim — o card, os botões de navegação que cada área já tinha (e que
seguem sendo do layout, com os destinos que sempre tiveram), e nenhum "Sair":

| área | trocar área | voltar ao site | layout |
|---|---|---|---|
| Tax | `/equipe` | — | `FiscalSidebar` |
| OSG | `/equipe/osg` | `/` | `OsgLayout` |
| Gestão | `/equipe` | — | `GestaoLayout` |
| Rotina | `/equipe/digital` | `/` | `EquipeLayout` |
| Administração | `/equipe` | — | `AdminLayout` |
| Fixos | `/equipe/projetos` | `/` | `FixosLayout` |

**O nome do usuário.** O cartão mostrava `email.split('@')[0]` — "joana.silva". O nome de
verdade sempre esteve em `profiles`, e agora vem de lá pelo `useDomainMeuPerfil`. A ordem de
queda (`perfil → pedaço do e-mail → "Usuário"`) é função pura em `src/lib/nomeDoUsuario.ts`.

**Efeito colateral em teste:** o cartão passou a fazer query, então todo teste que monta uma
barra lateral precisa de `QueryClientProvider`. Só `FiscalSidebar.test.tsx` montava sem.

**As nove áreas (10/09/2026).** O cartão começou em seis barras e passou a nove no mesmo dia,
quando ela pediu o padrão em toda tela com barra — eram **56 telas sem ele**: 20 do Board, 23
do Dev e 13 do Mapeamento. Dois achados no caminho:

- o **Dev já tinha cartão**, feito à mão: avatar, `email.split('@')[0]` e o nome da área, sem o
  estado recolhido e sem o nome de `profiles`. Era a sétima cópia do markup que este componente
  existe para acabar;
- o **Mapeamento não tinha saída nenhuma** — nem "Sair" no rodapé, nem cartão. Quem entrava só
  saía por "Trocar área". Agora tem.

**O Board e o Acessos entraram na régua depois, no mesmo dia**, a pedido dela:

- o chip de nome + iniciais do **topbar do Board** saiu. Ele lia `user_metadata` — fonte
  diferente do cartão, que lê `profiles`, e as duas podem divergir. Sem ele a faixa de 48px
  ficaria vazia no desktop, então ela virou `md:hidden`: no celular continua sendo quem abre a
  gaveta, no desktop não existe mais;
- **`/equipe/acessos` deixou de ter casca própria** e passou a montar dentro do `EquipeLayout`,
  como qualquer outra tela. Perdeu o cabeçalho com `ShieldCheck`, "Trocar área" e "Sair"
  escritos à mão, e o `ScrollArea` de `h-[calc(100vh-64px)]` — a rolagem e o recuo são do
  layout. O título virou `title`/`subtitle`, que é como as outras telas o declaram.

**Achado ao fazer isso: a área "Administração" não existe no app.** O `AdminLayout`, as três
páginas de `src/pages/administracao/` e a rota `/administracao/*` **não estão registradas em
lugar nenhum** — nem no `App.tsx`, nem no `MapaRoutes.tsx`, os dois únicos arquivos que
declaram rota. É código morto, e por isso `/equipe/acessos` (448 linhas, com abas de páginas,
usuários, dashboards, agente, estrutura e centro de custo) é a **única** tela de acessos
alcançável — o `/administracao/acessos` que existe no repositório tem 15 linhas e chama outra
coisa. Não mexi nisso: ressuscitar ou apagar a área é decisão dela, não limpeza.

**Fica de fora, e é gap conhecido:** `/equipe/acessos` (`EquipeControleAcessos.tsx`) **não tem
barra lateral** — tem cabeçalho próprio, com "Trocar área" e "Sair" soltos nele. Logo não tem
cartão, não mostra nome nem e-mail, e o "Sair" de lá é o único do sistema fora do cartão. Dar
cartão àquela tela não é acrescentar um componente: é decidir se ela ganha barra lateral.

## Fase 2 — a página `/conta` 🔵 ABERTA

Menu ganha o item "Minha conta"; a página tem abas, nunca blocos empilhados.

- **Perfil** — `first_name`, `last_name`, `phone` de `profiles`. É **mutation nova**, então
  `useAuditLog` é obrigatório (ver AGENTS.md §Auditoria). Nada de migration: as colunas
  existem, e a policy de `profiles` já é própria-usuário.
- **Segurança** — trocar senha sem sair do sistema. As duas peças existem: `reautenticar()`
  do `AuthContext` confere a senha atual sem derrubar a sessão, e
  `supabase.auth.updateUser({ password })` é o que `ResetPassword.tsx` já faz (com o schema
  zod de 8 caracteres pronto para reusar).
- **Preferência de notificação** — fora da fase 2. Precisa de coluna nova, ou seja, migration
  e passo humano no Lovable.

## Fase 3 — a escala escura 🔵 ABERTA, e é frente do tamanho da passada de cor clara

O `.dark` do `index.css` **nunca foi ligado**: nada põe a classe no `<html>`, e o único
consumidor de `next-themes` é o `ui/sonner`, sem provider montado. Medido em 10/09/2026, ele
declara **24 das 51 variáveis** que a `.tax-theme` usa. As outras 27 ficam no valor claro:
todos os `--status-*`, `--canvas`, os `--tag-*` e as `--surface-escura*`.

O `.dark` vem **depois** da `.tax-theme` e da `.osg-theme` no arquivo, com a mesma
especificidade — então ganha onde declara. Ligar hoje dá:

| token | Tax, como está | com `.dark` | resultado |
|---|---|---|---|
| `--background` | `192 18% 99.6%` | `35 12% 9%` | escurece |
| `--primary` | `192 73% 20%` | `172 66% 50%` | **a área perde a âncora** |
| `--canvas` | `192 10% 93%` | não declara | claro dentro do escuro |
| `--status-feito` | `128 61% 21%` | não declara | claro dentro do escuro |

Some com o modelo de cor por camada: no escuro, Tax, OSG e Gestão viram o mesmo teal.

E o bloco está **desatualizado por escrito**: o comentário dele diz que a premissa de
temperatura ("o sistema É quente") caiu em 31/08/2026, quando o piso claro virou frio e a
`.sistema-theme` deixou de existir, e que ele **não foi recalibrado**. A decisão de
temperatura tem que ser refeita, não herdada.

**O que a fase 3 exige, então:** decidir a temperatura de novo (com página de comparação, como
as de `docs/geral/comparacoes-de-cor/`), declarar os 27 tokens que faltam **por área** — Tax e
OSG têm âncoras diferentes e no escuro precisam continuar tendo —, e medir contraste par a par.
Ver `docs/geral/cor-o-que-falta.md` (ponto de retomada da frente) e
`docs/geral/paleta-por-area.md` (o contrato em vigor). **Não** use
`decisoes-tema-e-cor.md`: o índice o marca ⛔ MORTO, com três decisões revertidas.

Enquanto isso não acontece, **a aba de aparência não existe**. Um interruptor que entrega tela
híbrida é pior do que não ter interruptor.
