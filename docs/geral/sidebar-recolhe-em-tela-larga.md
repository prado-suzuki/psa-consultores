# A barra lateral recolhe sozinha em tela de trabalho largo

Tela que trabalha em colunas lado a lado (balde / documento / ficha, editor com painel,
tabela larga) precisa de espaço horizontal. Nessas telas a barra lateral **recolhe
sozinha**, e o padrão vale para o sistema inteiro — Tax, OSG, Board, Dev, Equipe, Gestão,
Administração, Fixos e Mapeamento.

## Como uma tela nova adere

Uma linha, no arquivo da própria tela. Nenhum layout precisa ser editado — nem hoje, nem
quando uma área nova for criada:

```tsx
import { useTelaDeTrabalhoLargo } from '@/hooks/useSidebarRecolhimentoController';

const CadastroPorDocumento = () => {
  // Três colunas lado a lado: a barra lateral recolhe sozinha para dar o espaço.
  useTelaDeTrabalhoLargo();
  // …
};
```

É só isso. A tela não sabe em que layout está, e o layout não sabe que a tela existe.

Se o recolhimento só faz sentido em parte da vida da tela (uma aba, um modo de edição),
passe a condição: `useTelaDeTrabalhoLargo(abaAtiva === 'editor')`. Quando a condição volta
a ser falsa, a barra volta a abrir.

## Como um layout novo adere

Trocando o `useState` da barra pelo controlador — que é como se declara essa peça de
estado a partir de agora:

```tsx
// ❌ antes
const [collapsed, setCollapsed] = useState(false);

// ✅ agora
const { collapsed, setCollapsed } = useSidebarRecolhimentoController();
```

O `setCollapsed` tem a mesma assinatura de sempre (valor ou função), então os botões de
recolher/expandir do layout continuam iguais. Sem nenhuma tela larga montada, o
comportamento é idêntico ao de antes.

Layout que lembra a barra entre sessões passa a chave de armazenamento em vez de gravar à
mão: `useSidebarRecolhimentoController({ persistKey: 'board-sidebar-collapsed' })`.

## Por que a barra entra ABERTA e só depois recolhe

Esta é a parte que parece um detalhe e não é. A barra **nasce aberta** e recolhe 450ms
depois, na frente do usuário.

Nascer estreita foi testado e reprovado: sem o movimento, o usuário chega numa tela cujo
menu está estreito **sem explicação** — e a leitura imediata é "o menu quebrou", não "esta
tela me deu mais espaço". É o movimento que comunica a intenção. Os 450ms são o tempo de
a pessoa registrar que a barra estava lá inteira antes de encolher.

## Duas coisas que o padrão nunca faz

**Não recolhe por cima de quem mexeu.** A partir do momento em que o usuário toca no botão
de recolher/expandir naquela tela, o recolhimento automático está cancelado — inclusive
durante os 450ms, e inclusive depois de a barra já ter recolhido sozinha. (Antes de o
padrão existir, o caso escrito à mão no `OsgLayout` recolhia por cima de quem expandisse
dentro da janela; isso deixou de acontecer.)

**Não vira preferência do usuário.** Nos layouts que lembram a barra entre sessões, só a
escolha **manual** é gravada. O recolhimento automático é uma decisão daquela tela;
gravá-lo deixaria a barra estreita em todas as outras telas da área para sempre.

Ao sair da tela larga a barra volta a abrir — mas só se quem a recolheu foi o sistema. Se
o usuário a recolheu, a escolha dele continua valendo.

## Quanto o trilho recolhido mede (5rem, não 4rem) — e onde a medida mora

A barra recolhida mede **80px** (`w-20`) nos cinco layouts do padrão — Tax
(`FiscalSidebar`), OSG, Gestão, Administração e Fixos. Ela media 64px, e **não cabia**:

o rodapé da barra tem recuo de 16px de cada lado e o cartão do usuário mais 12px, então
sobravam 8px de largura útil para um avatar de 32px. No único layout que mantinha o cartão
montado ao recolher (o `OsgLayout` — nos outros ele desaparecia), o círculo do avatar
vazava para fora do chip. A mesma aritmética espremia o selo de 40px do cabeçalho, que
usava `p-6`.

São três medidas que andam juntas, e mexer numa sem as outras traz o corte de volta:

- trilho recolhido de **80px**;
- **cabeçalho** em `p-4` quando recolhido (com `p-6` sobravam 32px para o selo de 40px);
- **cartão do usuário** sem `gap` e com `px-2` quando recolhido — o `gap-3` continua
  ocupando 12px mesmo com o texto reduzido a zero, e é o que empurrava o avatar para fora.

Alargar mais não resolveria melhor: o que corta é o recuo somado, não o trilho.

### Por que virou padrão compartilhado (e não cinco correções iguais)

A primeira correção foi arquivo por arquivo, e isso era o próprio bug: o markup do cartão
do usuário estava **copiado em cinco layouts**, com diferença apenas de cor de acento e
rótulo da área. Foi a cópia que deixou o corte vivo em um deles — quatro escondiam o
cartão ao recolher (`{!collapsed && …}`) e mascaravam o problema, o quinto o mostrava.
Corrigir cinco vezes só adiaria a sexta cópia.

Agora existem duas peças, e nenhuma barra guarda medida própria:

| Onde | O que mora ali |
|---|---|
| `src/lib/sidebarMedidas.ts` | as medidas: `MEDIDAS_TRILHO_SIDEBAR` (px) e os helpers `classeLarguraBarra`, `classeRecuoCabecalho`, `larguraBarraCss` |
| `src/components/shared/SidebarCartaoUsuario.tsx` | o cartão do usuário, com o estado recolhido embutido e o registro das cinco áreas |

As medidas ficaram **ao lado** do `useSidebarRecolhimentoController.ts`, não dentro dele:
aquele arquivo é o *comportamento* (quando a barra recolhe) e é consumido como hook; estas
são dados puros, e quem mais precisa delas não é layout — é o cartão compartilhado e o
`Layout` do Mapeamento, que precisa do número em px para alimentar uma variável CSS. Módulo
puro neste repositório vive em `src/lib/` (AGENTS.md, "Anatomia da decomposição").

As strings `w-20`/`w-64`/`p-4`/`p-6` ficam escritas **nos helpers**, e só ali: o Tailwind
gera a classe apenas quando o literal aparece no fonte, então nenhum layout pode montá-la
por concatenação — e nenhum precisa.

O cartão recebe **uma** prop de variação, `area`, que resolve rótulo e acento por um
registro fechado das cinco áreas. Não é um wrapper passa-tudo: uma área nova entra por uma
linha no registro, não por uma classe de cor vinda de fora. As cores literais de
Administração e Fixos (teal e blue crus) continuam ali porque essas duas barras ainda não
declaram tema no `<html>` — trocá-las por token tingiria o chip e o escureceria no tema
escuro dentro de uma barra que seguiria branca. É migração de paleta, não correção de
corte, e quando ela vier é um arquivo só que muda.

O comportamento do OSG passou a ser o de todos: ao recolher, **o avatar fica** e só o texto
desbota. Desmontar o texto fazia o cartão sumir de estalo enquanto a barra ainda encolhia —
era isso que dava a sensação de corte seco. Recolhido, o avatar carrega o nome e a área
como rótulo acessível (e o chip como `title`), então nada de informação se perde.

### Quais barras seguem o padrão

| Barra lateral | Recolhida | Cartão do usuário | No padrão? |
|---|---|---|---|
| `equipe/fiscal/FiscalSidebar.tsx` (Tax) | 80px | sim, compartilhado | ✅ |
| `equipe/osg/OsgLayout.tsx` | 80px | sim, compartilhado | ✅ |
| `gestao/GestaoLayout.tsx` | 80px | sim, compartilhado | ✅ |
| `administracao/AdminLayout.tsx` | 80px | sim, compartilhado | ✅ |
| `equipe/fixos/FixosLayout.tsx` | 80px | sim, compartilhado | ✅ |
| `equipe/mapa/Layout.tsx` | 80px (era 72px) | não tem | ⚠️ só a medida |
| `equipe/board/BoardLayout.tsx` | 64px | esconde ao recolher | ❌ fora |
| `equipe/dev/DevLayout.tsx` | `w-0` (some) | esconde ao recolher | ❌ fora |
| `equipe/EquipeLayout.tsx` | `w-0` (some) | esconde ao recolher | ❌ fora |

**Mapeamento** entra só pela medida. A barra dele é CSS legado (`src/pages/equipe/mapa/mapa.css`,
escopado em `.app-root`) e não tem cartão do usuário — o rodapé é só ações —, então nunca
teve o corte. O trilho recolhido, porém, media 72px, um terceiro valor sem motivo: agora a
variável `--sidebar-width-collapsed` é alimentada pelo `Layout` a partir de
`MEDIDAS_TRILHO_SIDEBAR`, e o `.css` deixou de declarar número próprio. No estado recolhido
aquele CSS já zera os recuos horizontais e centraliza tudo, então os 8px extras só sobram.

**Board** fica de fora de propósito: ele tem linguagem visual própria (trilho de 64px,
aberto em 232px, tipografia de 12,5px, tokens `--board-*`), já centraliza os itens ao
recolher e, no recolhido, troca o bloco de marca + usuário pelo selo de 28px centralizado —
não há avatar para vazar, e 28px é exatamente o que sobra dos 64px menos os 18px de recuo
de cada lado: cabe, com a conta fechada. Alinhá-lo ao padrão seria mudar a identidade do
módulo, não corrigir corte.

**Dev** e **Equipe** recolhem para `w-0`: a barra desaparece por inteiro e o botão de
reabrir migra para o cabeçalho da página. Não existe trilho de ícones ali, logo não existe
o que cortar. Transformá-las em trilho de 80px é mudança de UX (e de navegação: hoje o
usuário recolhe justamente para não ver a barra), e por isso ficou fora desta correção.
Se um dia se quiser padronizar, o caminho é adotar o cartão compartilhado e
`classeLarguraBarra` — as duas peças já existem.

### O que trava o padrão

`src/lib/sidebarMedidas.test.ts` mede o que **sobra**, não as medidas isoladas: o avatar de
32px tem de caber no chip depois dos dois recuos, e o selo de 40px no cabeçalho recolhido.
E lê o fonte das cinco barras para garantir que nenhuma tem largura escrita à mão nem
cartão remontado — é a forma direta de travar "não volte por cópia". Os dois estados do
cartão estão em `src/components/shared/SidebarCartaoUsuario.test.tsx`.

## `prefers-reduced-motion`

Com movimento reduzido a barra **já nasce recolhida**, sem os 450ms.

O raciocínio é o inverso do de cima. Sem animação, esperar meio segundo para saltar seria
o pior dos mundos: o pulo continua acontecendo e não há movimento nenhum para explicá-lo —
vira exatamente o glitch que o atraso existe para evitar. Quem pediu menos movimento
recebe a tela já assentada, com o espaço que ela pede, e o botão de expandir à mão.

## Onde já está ligado

| Rota | Arquivo da tela | Por que se qualifica |
|---|---|---|
| `/equipe/osg/work/onboarding/cadastro` | `pages/equipe/osg/CadastroPorDocumento.tsx` | balde + documento + ficha em `h-[calc(100vh-13rem)]` (o caso aprovado) |
| `/equipe/osg/work/gerar-documento` | `pages/equipe/osg/GerarDocumento.tsx` | `xl:grid-cols-[330px_1fr_240px]` — conferência + documento + rail ¹ |
| `/equipe/osg/work/montagem-documentos` | `pages/equipe/osg/MontagemDocumentos.tsx` | bancada de arrastar-e-soltar + paleta `max-h-[calc(100vh-7rem)]` ¹ |
| `/equipe/osg/projetos/tarefas` | `pages/equipe/osg/OsgTarefas.tsx` | `PainelTarefas`: lista `min-w-[1200px]`, Kanban de altura cheia, Gantt |
| `/equipe/osg/projetos/cadastro` | `pages/equipe/osg/OsgProjetos.tsx` | idem |
| `/equipe/tax/projetos/tarefas` | `pages/equipe/fiscal/FiscalDemandasTarefas.tsx` | idem |
| `/equipe/tax/projetos/cadastro` | `pages/equipe/fiscal/FiscalProjetosCadastro.tsx` | idem |
| `/equipe/tax/gerencial/chamados` | `pages/equipe/fiscal/FiscalGerencialChamados.tsx` | tabela de 14 colunas, rolagem horizontal, ações congeladas |
| `/equipe/osg/gerencial/chamados` | `pages/equipe/osg/OsgGerencialChamados.tsx` | idem |
| `/equipe/board/chamados` | `pages/equipe/board/BoardChamados.tsx` | idem |
| `/equipe/kanban` | `pages/equipe/EquipeKanban.tsx` | quadro de três colunas na largura toda |
| `/equipe/digital/mapa/cascata` | `pages/equipe/mapa/CascataPage.tsx` | rail de 300px + canvas do grafo por ondas |
| `/equipe/dev/controle-perdcomp` | `pages/equipe/dev/ControlePerdcomp.tsx` | planilha `min-w-[1400px]`, 16 colunas |
| `/equipe/dev/correcoes-sped` | `pages/equipe/dev/CorrecoesSped.tsx` | seis abas de planilha somando mais de 2000px |
| `/equipe/dev/apuracao-difal/icms-saidas` | `pages/equipe/dev/IcmsSaidas.tsx` | cabeçalho de dois níveis, colunas largas em scroll |
| `/equipe/dev/apuracao-pis-cofins` | `pages/equipe/dev/ApuracaoPisCofins.tsx` | duas colunas congeladas + uma coluna por mês |

¹ Ligadas na forma condicional: essas duas telas abrem numa galeria de escolha e
só viram bancada larga depois que algo é selecionado.

## Candidatas deixadas de fora (de propósito)

Ligar onde não devia irrita mais do que faltar, então na dúvida ficou desligado.
Estas passaram perto e podem ser ligadas com a linha do hook se a usuária quiser:

| Rota | Por que ficou de fora |
|---|---|
| `/equipe/osg/work/documentos` | explorador de 2 painéis (árvore + lista), mas `min-h-[60vh]` e sem terceira coluna — é o caso mais próximo de entrar |
| `/equipe/osg/work/onboarding` | rail de produto (290px) + lista; o rail é filtro, não coluna de trabalho |
| `/equipe/sprints/:id` (aba Gantt) | o Gantt qualifica, mas as abas são não-controladas — ligar exige converter `Tabs` para controlado, não é uma linha |
| `/equipe/dev/consulta-xmls` | tabelas `min-w-[950px]`/`[1050px]`: abaixo da régua de ~1200px |
| `/equipe/dev/cruzamento-dados` | cabeçalho agrupado de 10 colunas, mas sem largura mínima que force rolagem |
| `/equipe/dev/controle-balancetes` | ~1070px em 6 colunas |
| `/equipe/dev/mapa-ncm-pis-cofins`, `/equipe/dev/processo-difal` | 7-8 colunas sem `min-w` |
| `/equipe/dev/consulta-efd`, `-efd-icms`, `-ecd`, `-ecf` | a tela tem 6 colunas; o grid denso vive num modal que já cobre a barra |
| `/equipe/tax/projetos/clientes`, `/equipe/osg/projetos/clientes` | `min-w-[1100px]` em ~8 colunas, expansão vertical |
| `/equipe/osg/work/biblioteca-modelos` | galeria de cards: ganha uma coluna, mas não tem painéis simultâneos |
| `/equipe/tax/gerencial`, `/equipe/osg/gerencial` | o iframe do Looker cresce com a largura, mas é dashboard |
| `/equipe/digital/mapa/processos/:id/mapear`, `/mapa/dashboard-roi` | coluna única de cards / dashboard de KPIs |
| `/gestao/acessos` | matriz de 10 colunas, mas sem contêiner de rolagem — a tabela comprime |
| `/equipe/chamados`, `/equipe/acessos` | são largas de verdade, mas montam header próprio e **não têm barra lateral** para recolher |

## Onde isso mora

Tudo em `src/hooks/useSidebarRecolhimentoController.ts`: o hook da tela
(`useTelaDeTrabalhoLargo`), o hook do layout (`useSidebarRecolhimentoController`) e o
registro minúsculo que liga os dois. Testes em
`src/hooks/useSidebarRecolhimentoController.test.tsx`.

O **quanto** a barra mede quando recolhe é vizinho, e não parte do hook: fica em
`src/lib/sidebarMedidas.ts`, com o cartão compartilhado em
`src/components/shared/SidebarCartaoUsuario.tsx` (ver "Quanto o trilho recolhido mede").

As duas metades se encontram por um **registro global**, não por React Context, porque
tela e layout não têm relação de parentesco estável: na maior parte do sistema a página é
quem monta o layout (`<OsgLayout>…</OsgLayout>`), logo é o **pai** dele; no Mapeamento o
layout é o pai e a página entra por `<Outlet />`. Um contexto teria que ser provido acima
dos dois e quebraria todo teste de página que renderiza um layout sem provider.

Duas alternativas foram descartadas:

- **Cadastro central de rotas largas** (um arquivo com a lista de caminhos): funciona, mas
  obriga quem cria a tela a lembrar de um segundo arquivo e a mantê-lo em dia quando a
  rota muda de caminho — o trabalho manual que se queria eliminar.
- **Detecção automática** (largura do conteúdo, número de colunas): decide pelo usuário a
  partir de um palpite, erra nas telas de fronteira e produz um comportamento que ninguém
  prevê lendo o código da página.

O `src/components/ui/sidebar.tsx` do shadcn **não** foi usado: ele está no repositório sem
nenhum consumidor, e nenhum dos nove layouts é construído sobre ele. Adotá-lo aqui
significaria reescrever as nove barras laterais — refatoração própria, não carona nesta.
