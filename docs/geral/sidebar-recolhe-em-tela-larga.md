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
