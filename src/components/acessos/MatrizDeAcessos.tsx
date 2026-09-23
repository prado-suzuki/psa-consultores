import { useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, Check, Circle, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PapelBadge } from '@/components/ui/PapelBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AREA_CATEGORIES_MAP, type AreaKey } from '@/config/areaCategories';
import { CHAVES_DE_AREA, type PaginaComCategoria } from '@/lib/areasDeAcessoDoUsuario';
import type { ColunaDeEquipe } from '@/lib/equipesDaEstrutura';
import {
  avisarComDesfazer,
  contagemDePessoas,
  useAplicarAreaDeAcesso,
  useAplicarEquipe,
  useAplicarPapel,
  type AlvoDaMatriz,
} from '@/hooks/useAcessosEmLote';
import type { AppRole, UserWithRoles } from '@/hooks/useUsersWithRoles';
import { ariaSortDe, proximaOrdem, type OrdemDaMatriz } from '@/lib/filtroDeUsuarios';
import { ROLE_SHORT_LABELS } from './roleOptions';
import { cn } from '@/lib/utils';
import { ButtonTooltip } from '@/components/ui/button-tooltip';

/**
 * A matriz de acessos: uma linha por pessoa, uma coluna por papel ou por área.
 *
 * ## O clique grava
 *
 * A célula é um `<button>`, não um ícone. Gravar na hora (com Desfazer no aviso)
 * foi decisão dela em 14/09/2026, contra a alternativa de acumular pendências
 * até um"Salvar": a queixa que abriu esta frente era ter de entrar usuário por
 * usuário, e um botão de confirmar por rodada devolveria metade desse custo.
 * A rede de segurança é o Desfazer, que dura 10 segundos e reverte só quem de
 * fato mudou (ver `useAcessosEmLote`).
 *
 * ## Três dimensões, uma de cada vez
 *
 * São 7 papéis, 5 áreas e 11 equipes. As três juntas dariam 23 colunas de ícone
 * mais nome, e-mail e seleção — não cabe em tela nenhuma, e a versão que"cabia"
 * só cabia porque rolava para o lado escondendo o nome da linha. O interruptor
 * troca o eixo e mantém as MESMAS linhas, a mesma seleção e o mesmo filtro.
 *
 * A de EQUIPE eu tinha descartado, argumentando que a estrutura é uma árvore de
 * três degraus e não uma matriz. Medindo o banco: são **11** equipes, e cabem.
 * O argumento da árvore valia para o SELETOR — que precisa deixar escolher entre
 * todas, agrupadas — e não para a coluna. Ela entrou a pedido dela, em
 * 14/09/2026, no mesmo dia em que as outras duas nasceram.
 *
 * O que a equipe exige e as outras duas não é o CAMINHO: "Fiscal" e "Fixos" só
 * significam alguma coisa sob"TAX › Tax", e existem duas áreas chamadas OSG em
 * clusters diferentes. Por isso a coluna de equipe tem cabeçalho de duas linhas
 * — a área em miúdo, o nome embaixo — e as colunas vêm na ordem do caminho,
 * para as irmãs ficarem vizinhas (`colunasDeEquipe`).
 *
 * ## O lápis continua existindo
 *
 * A matriz cobre papel e área; nome, e-mail e equipe continuam no diálogo. O
 * lápis no fim da linha é também o caminho de edição nas larguras em que a
 * matriz não cabe e as colunas viram pílulas.
 */

export type DimensaoDaMatriz = 'papeis' | 'areas' | 'equipes';

/** Ordem das colunas de papel — a mesma do diálogo de edição, de propósito. */
const COLUNAS_DE_PAPEL: AppRole[] = [
  'admin', 'team_member', 'lider', 'sublider', 'client', 'timecliente', 'marketing',
];

export interface MatrizDeAcessosProps {
  /** Já filtrados e ordenados por quem chama. */
  usuarios: UserWithRoles[];
  dimensao: DimensaoDaMatriz;
  /** userId → áreas de acesso inferidas. Ver `areasDeAcessoPorUsuario`. */
  areasDeAcesso: Record<string, Set<AreaKey>>;
  paginas: PaginaComCategoria[];
  /** Colunas da dimensão de equipe, já na ordem do caminho. */
  colunasDeEquipe: ColunaDeEquipe[];
  /** userId → equipes em que a pessoa está. */
  equipesPorUsuario: Record<string, Set<string>>;
  selecionados: Set<string>;
  onAlternarSelecao: (userId: string) => void;
  onSelecionarVisiveis: (marcar: boolean) => void;
  onEditar: (usuario: UserWithRoles) => void;
  /** Ordem em vigor. Quem ORDENA é o pai — aqui só se pede a próxima. */
  ordem: OrdemDaMatriz;
  onOrdemChange: (ordem: OrdemDaMatriz) => void;
  isLoading?: boolean;
}

export const MatrizDeAcessos = ({
  usuarios,
  dimensao,
  areasDeAcesso,
  paginas,
  colunasDeEquipe,
  equipesPorUsuario,
  selecionados,
  onAlternarSelecao,
  onSelecionarVisiveis,
  onEditar,
  ordem,
  onOrdemChange,
  isLoading,
}: MatrizDeAcessosProps) => {
  const [salvando, setSalvando] = useState<string | null>(null);
  const aplicarPapel = useAplicarPapel();
  const aplicarArea = useAplicarAreaDeAcesso();
  const aplicarEquipe = useAplicarEquipe();

  const equipeDe = (id: string) => colunasDeEquipe.find((c) => c.id === id);

  const colunas: string[] =
    dimensao === 'papeis' ? COLUNAS_DE_PAPEL
    : dimensao === 'areas' ? CHAVES_DE_AREA
    : colunasDeEquipe.map((c) => c.id);

  const rotuloDaColuna = (coluna: string) =>
    dimensao === 'papeis' ? (ROLE_SHORT_LABELS[coluna] ?? coluna)
    : dimensao === 'areas' ? AREA_CATEGORIES_MAP[coluna as AreaKey].label
    : (equipeDe(coluna)?.nome ?? coluna);

  /**
   * O nome completo, para o `title` e para o leitor de tela. Só a equipe difere
   * do rótulo: ela precisa do caminho, porque "Fiscal" sozinho não localiza.
   */
  const nomeLongoDaColuna = (coluna: string) => {
    if (dimensao !== 'equipes') return rotuloDaColuna(coluna);
    const equipe = equipeDe(coluna);
    return equipe ? `${equipe.caminhoDaArea} › ${equipe.nome}` : coluna;
  };

  const ligada = (usuario: UserWithRoles, coluna: string) =>
    dimensao === 'papeis' ? usuario.roles.includes(coluna as AppRole)
    : dimensao === 'areas' ? (areasDeAcesso[usuario.id]?.has(coluna as AreaKey) ?? false)
    : (equipesPorUsuario[usuario.id]?.has(coluna) ?? false);

  const nomeDe = (u: UserWithRoles) => `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();

  const alternar = (usuario: UserWithRoles, coluna: string) => {
    const conceder = !ligada(usuario, coluna);
    const alvos: AlvoDaMatriz[] = [{ id: usuario.id, nome: nomeDe(usuario) }];
    const rotulo = rotuloDaColuna(coluna);
    const chave = `${usuario.id}:${coluna}`;

    const rodar = (dar: boolean, ids: string[]) =>
      dimensao === 'papeis'
        ? aplicarPapel.mutateAsync({ userIds: ids, papel: coluna as AppRole, conceder: dar, alvos })
        : dimensao === 'areas'
          ? aplicarArea.mutateAsync({ userIds: ids, area: coluna as AreaKey, conceder: dar, alvos, paginas })
          : aplicarEquipe.mutateAsync({
              userIds: ids,
              equipeId: coluna,
              equipeNome: nomeLongoDaColuna(coluna),
              conceder: dar,
              alvos,
            });

    setSalvando(chave);
    rodar(conceder, [usuario.id])
      .then((resultado) =>
        avisarComDesfazer(
          resultado,
          {
            // Equipe se diz com o verbo de pertencer; papel e área, com o de
            // conceder. "Marketing concedido — Anne" e "Anne entrou em Fiscal"
            // descrevem coisas diferentes, e a frase tem de acompanhar.
            feito: dimensao === 'equipes'
              ? `${nomeDe(usuario)} ${conceder ? 'entrou em' : 'saiu de'} ${rotulo}`
              : `${rotulo} ${conceder ? 'concedido' : 'removido'} — ${nomeDe(usuario)}`,
            nada: `Nada mudou: ${nomeDe(usuario)} já estava assim.`,
          },
          (alterados) => {
            setSalvando(chave);
            rodar(!conceder, alterados)
              .then((r) =>
                toast.success(
                  r.alterados.length
                    ? `Desfeito — ${contagemDePessoas(r.alterados.length)}`
                    : 'Nada a desfazer.',
                ),
              )
              .catch((e: unknown) =>
                toast.error(e instanceof Error ? e.message : 'Não foi possível desfazer.'),
              )
              .finally(() => setSalvando(null));
          },
        ),
      )
      .catch((e: unknown) =>
        toast.error(e instanceof Error ? e.message : 'Não foi possível alterar o acesso.'),
      )
      .finally(() => setSalvando(null));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!usuarios.length) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        Nenhum usuário com esses filtros.
      </div>
    );
  }

  const todosVisiveisMarcados = usuarios.every((u) => selecionados.has(u.id));

  return (
    <Table>
      <TableHeader className="bg-muted">
        <TableRow>
          <TableHead className="w-10">
            <Checkbox
              checked={todosVisiveisMarcados}
              onCheckedChange={(v) => onSelecionarVisiveis(v === true)}
              aria-label="Selecionar todos os usuários visíveis"
            />
          </TableHead>
          <TableHead aria-sort={ariaSortDe(ordem, 'nome')}>
            <BotaoDeOrdem
              ativo={ordem.campo === 'nome'}
              ascendente={ordem.ascendente}
              onClick={() => onOrdemChange(proximaOrdem(ordem, 'nome'))}
              titulo="Ordenar por nome"
            >
              Usuário
            </BotaoDeOrdem>
          </TableHead>
          {/* O e-mail sai na dimensão de EQUIPE, e é medição que mandou: as 11
              equipes de produção pedem 1278px só para elas, e a coluna de
              e-mail (220px) empurrava o total para 1758px — mais do que os
              1566px que sobram numa tela de 1920. O nome já identifica a linha;
              o e-mail é o que dá para dispensar sem perder a identidade. */}
          <TableHead
            className={cn('hidden', dimensao === 'equipes' ? 'hidden' : '2xl:table-cell')}
            aria-sort={ariaSortDe(ordem, 'email')}
          >
            <BotaoDeOrdem
              ativo={ordem.campo === 'email'}
              ascendente={ordem.ascendente}
              onClick={() => onOrdemChange(proximaOrdem(ordem, 'email'))}
              titulo="Ordenar por e-mail"
            >
              Email
            </BotaoDeOrdem>
          </TableHead>
          {/* Pílulas e matriz são a MESMA informação — a linha mostra uma só.
              Ver o commit que tirou a tabela de dez colunas. */}
          <TableHead className="xl:hidden">Permissões</TableHead>
          {colunas.map((coluna) => (
            <TableHead
              key={coluna}
              className="hidden xl:table-cell text-center text-xs align-bottom p-0"
              aria-sort={ariaSortDe(ordem, 'coluna', coluna)}
            >
              <BotaoDeOrdem
                ativo={ordem.campo === 'coluna' && ordem.coluna === coluna}
                ascendente={ordem.ascendente}
                onClick={() => onOrdemChange(proximaOrdem(ordem, 'coluna', coluna))}
                titulo={`Ordenar por ${nomeLongoDaColuna(coluna)} — quem tem primeiro`}
                centralizado
                // Só a dimensão de equipe precisa: é a que tem 11 colunas e a
                // que trunca o caminho — sem um teto, o `truncate` não tem
                // contra o que truncar e a coluna volta a crescer.
                estreita={dimensao === 'equipes'}
              >
                {/* O caminho em miúdo, só na dimensão de equipe. Ver o docstring:
                    "Fiscal" e "Fixos" são irmãs de TAX › Tax, e há duas áreas
                    chamadas OSG — o nome sozinho não localiza a coluna. */}
                {/* O caminho TRUNCA e o nome não, e essa assimetria é medida.
                    "TAX › Trabalhos compartilhados OSG" mede 187px e apareceria
                    em duas colunas irmãs, enquanto "Fiscal" mede 52 — o caminho
                    repetido é que estourava a largura das 11 colunas de
                    produção. Ele é CONTEXTO (a área, que se repete entre
                    irmãs); o nome é a IDENTIDADE da coluna. Contexto cortado
                    ainda orienta, e o caminho inteiro continua no `title` e no
                    rótulo de cada célula. */}
                {dimensao === 'equipes' && (
                  <span className="block max-w-[7.5rem] truncate text-[10px] font-normal normal-case text-muted-foreground">
                    {equipeDe(coluna)?.caminhoDaArea}
                  </span>
                )}
                {rotuloDaColuna(coluna)}
                {/* Equipe desativada que ainda tem gente. A marca é palavra e não
                    cor: a coluna já é miúda, e "inativa" é informação que precisa
                    sobreviver a quem não distingue tons. */}
                {equipeDe(coluna)?.inativa && (
                  <span className="block text-[10px] font-normal normal-case text-muted-foreground">
                    (desativada)
                  </span>
                )}
              </BotaoDeOrdem>
            </TableHead>
          ))}
          <TableHead className="w-10" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {usuarios.map((usuario) => (
          <TableRow
            key={usuario.id}
            className={cn('hover:bg-foreground/[0.03]', selecionados.has(usuario.id) && 'bg-primary/[0.06]')}
          >
            <TableCell>
              <Checkbox
                checked={selecionados.has(usuario.id)}
                onCheckedChange={() => onAlternarSelecao(usuario.id)}
                aria-label={`Selecionar ${nomeDe(usuario)}`}
              />
            </TableCell>
            <TableCell className="font-medium text-foreground">
              {nomeDe(usuario)}
              {/* Quando não há coluna de e-mail, ele vem embaixo do nome. */}
              <span
                className={cn(
                  'block text-xs font-normal text-muted-foreground [overflow-wrap:anywhere]',
                  dimensao !== 'equipes' && '2xl:hidden',
                )}
              >
                {usuario.email}
              </span>
            </TableCell>
            <TableCell
              className={cn(
                'hidden text-muted-foreground [overflow-wrap:anywhere]',
                dimensao !== 'equipes' && '2xl:table-cell',
              )}
            >
              {usuario.email}
            </TableCell>
            <TableCell className="xl:hidden">
              <div className="flex gap-1 flex-wrap">
                {usuario.roles.map((papel) => (
                  <PapelBadge key={papel} papel={papel} />
                ))}
                {usuario.roles.length === 0 && (
                  <span className="text-muted-foreground text-sm">Sem permissões</span>
                )}
              </div>
            </TableCell>
            {colunas.map((coluna) => (
              <TableCell key={coluna} className="hidden xl:table-cell text-center p-1">
                <CelulaDaMatriz
                  ligada={ligada(usuario, coluna)}
                  salvando={salvando === `${usuario.id}:${coluna}`}
                  rotulo={`${nomeLongoDaColuna(coluna)} — ${nomeDe(usuario)}`}
                  onClick={() => alternar(usuario, coluna)}
                />
              </TableCell>
            ))}
            <TableCell className="p-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-primary"
                onClick={() => onEditar(usuario)}
                title={`Abrir o cadastro de ${nomeDe(usuario)}`}
              >
                <Pencil className="h-4 w-4" />
                <span className="sr-only">Editar {nomeDe(usuario)}</span>
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

/**
 * O cabeçalho clicável.
 *
 * A seta aparece SEMPRE, e não só no hover: cabeçalho que só revela a seta
 * quando o ponteiro passa por cima não diz a ninguém que a tabela é ordenável —
 * e não diz nada a quem navega por teclado ou toque. Em repouso ela é a de duas
 * pontas, apagada; ativa, é a ponta única que aponta o sentido em vigor.
 *
 * O `<th>` fica com `aria-sort` e o botão com o `title` que explica o gesto. A
 * seta não é a única pista do estado: o rótulo escurece para `text-foreground`
 * quando a coluna está ordenando, porque forma de ícone a 10px é pista frágil.
 */
const BotaoDeOrdem = ({
  ativo,
  ascendente,
  onClick,
  titulo,
  centralizado,
  estreita,
  children,
}: {
  ativo: boolean;
  ascendente: boolean;
  onClick: () => void;
  titulo: string;
  /** Coluna de matriz: rótulo e seta empilhados e centrados. */
  centralizado?: boolean;
  /** Teto de largura, para o `truncate` do caminho ter contra o que truncar. */
  estreita?: boolean;
  children: React.ReactNode;
}) => {
  const Seta = !ativo ? ArrowUpDown : ascendente ? ArrowUp : ArrowDown;
  return (
    <ButtonTooltip text={titulo}>
      <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-1 rounded-md py-2 transition-colors',
        'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        centralizado ? 'flex-col justify-end px-1 text-center' : 'px-1 text-left',
        estreita && 'max-w-[7.5rem]',
        ativo ? 'text-foreground' : 'text-muted-foreground',
      )}
    >
      <span className={cn('min-w-0', centralizado && 'block max-w-full')}>{children}</span>
      <Seta
        className={cn('h-3 w-3 flex-shrink-0', ativo ? 'text-foreground' : 'text-muted-foreground/50')}
        aria-hidden
      />
    </button>
    </ButtonTooltip>
  );
};

/**
 * A célula. Ela é um botão de verdade — com `aria-pressed`, foco visível e
 * rótulo que diz de quem e de quê.
 *
 * O desligado é um círculo vazio em `text-muted-foreground` CHEIO, e não o
 * `/40` do ícone da tabela só-leitura: aqui ele é o indicador de estado de um
 * CONTROLE, e alfa sobre a cor de frente é o que esta casa vem tirando (ver
 * "Preto com alfa dessatura"). O ligado guarda o `--status-feito` que a matriz
 * de leitura já usava, para as duas versões da mesma tabela não discordarem.
 */
const CelulaDaMatriz = ({
  ligada,
  salvando,
  rotulo,
  onClick,
}: {
  ligada: boolean;
  salvando: boolean;
  rotulo: string;
  onClick: () => void;
}) => (
  <ButtonTooltip text={rotulo}>
    <button
    type="button"
    aria-pressed={ligada}
    aria-label={rotulo}
    disabled={salvando}
    onClick={onClick}
    className={cn(
      'mx-auto flex h-8 w-8 items-center justify-center rounded-md transition-colors',
      'hover:bg-foreground/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
      'disabled:cursor-wait',
    )}
  >
    {salvando ? (
      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
    ) : ligada ? (
      <Check className="h-4 w-4 text-status-feito" strokeWidth={3} />
    ) : (
      <Circle className="h-4 w-4 text-muted-foreground" />
    )}
  </button>
  </ButtonTooltip>
);
