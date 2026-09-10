# A conta do usuário: o cartão da barra lateral vira porta

**Decidido com a Patricia em 10/09/2026**, olhando a maquete clicável das três alternativas.
Ela escolheu a **porta A** (menu curto no cartão, conta em página própria) e a ordem
**cartão primeiro, escala escura depois**.

## Fase 1 — o cartão vira porta ✅ (10/09/2026)

`SidebarCartaoUsuario` era um `<div>` que não clicava. Virou gatilho de menu, e o menu
absorveu os botões que ficavam soltos logo abaixo dele.

**O que estava espalhado.** "Trocar área", "Voltar ao site" e "Sair" eram cópias em **seis**
layouts, com destino diferente por área e três classes de hover distintas para a mesma ação:

| área | trocar área | voltar ao site | onde estava |
|---|---|---|---|
| Tax | `/equipe` | — | `FiscalSidebar` |
| OSG | `/equipe/osg` | `/` | `OsgLayout` |
| Gestão | `/equipe` | — | `GestaoLayout` |
| Rotina | `/equipe/digital` | `/` | `EquipeLayout` |
| Administração | `/equipe` | — | `AdminLayout` |
| Fixos | `/equipe/projetos` | `/` | `FixosLayout` |

Os destinos agora são linhas do registro `AREAS`, dentro do próprio cartão — o mesmo lugar
onde o rótulo e o acento já moravam. Área nova entra por uma linha, não por uma sétima cópia.
`SidebarCartaoUsuario.test.tsx` trava destino por destino, porque uniformizar esses seis
caminhos sem ninguém perceber era o único estrago que a consolidação podia causar calada.

**O nome do usuário.** O cartão mostrava `email.split('@')[0]` — "joana.silva". O nome de
verdade sempre esteve em `profiles`, e agora vem de lá pelo `useDomainMeuPerfil`. A ordem de
queda (`perfil → pedaço do e-mail → "Usuário"`) é função pura em `src/lib/nomeDoUsuario.ts`.

**Efeito colateral em teste:** o cartão passou a fazer query, então todo teste que monta uma
barra lateral precisa de `QueryClientProvider`. Só `FiscalSidebar.test.tsx` montava sem.

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
