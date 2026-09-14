import { useState } from 'react';
import { Check, Circle, Loader2, Pencil } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { PapelBadge } from '@/components/ui/PapelBadge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AREA_CATEGORIES_MAP, type AreaKey } from '@/config/areaCategories';
import { CHAVES_DE_AREA, type PaginaComCategoria } from '@/lib/areasDeAcessoDoUsuario';
import {
  avisarComDesfazer,
  contagemDePessoas,
  useAplicarAreaDeAcesso,
  useAplicarPapel,
  type AlvoDaMatriz,
} from '@/hooks/useAcessosEmLote';
import type { AppRole, UserWithRoles } from '@/hooks/useUsersWithRoles';
import { ROLE_SHORT_LABELS } from './roleOptions';
import { cn } from '@/lib/utils';

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
 * ## Duas dimensões, nunca as duas ao mesmo tempo
 *
 * São 7 papéis e 5 áreas. Juntas dariam 12 colunas de ícone mais nome, e-mail e
 * seleção — não cabe em tela nenhuma, e a versão que"cabia" só cabia porque
 * rolava para o lado escondendo o nome da linha. O interruptor troca o eixo e
 * mantém as MESMAS linhas, a mesma seleção e o mesmo filtro.
 *
 * ## O lápis continua existindo
 *
 * A matriz cobre papel e área; nome, e-mail e equipe continuam no diálogo. O
 * lápis no fim da linha é também o caminho de edição nas larguras em que a
 * matriz não cabe e as colunas viram pílulas.
 */

export type DimensaoDaMatriz = 'papeis' | 'areas';

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
  selecionados: Set<string>;
  onAlternarSelecao: (userId: string) => void;
  onSelecionarVisiveis: (marcar: boolean) => void;
  onEditar: (usuario: UserWithRoles) => void;
  isLoading?: boolean;
}

export const MatrizDeAcessos = ({
  usuarios,
  dimensao,
  areasDeAcesso,
  paginas,
  selecionados,
  onAlternarSelecao,
  onSelecionarVisiveis,
  onEditar,
  isLoading,
}: MatrizDeAcessosProps) => {
  const [salvando, setSalvando] = useState<string | null>(null);
  const aplicarPapel = useAplicarPapel();
  const aplicarArea = useAplicarAreaDeAcesso();

  const colunas: string[] = dimensao === 'papeis' ? COLUNAS_DE_PAPEL : CHAVES_DE_AREA;
  const rotuloDaColuna = (coluna: string) =>
    dimensao === 'papeis'
      ? (ROLE_SHORT_LABELS[coluna] ?? coluna)
      : AREA_CATEGORIES_MAP[coluna as AreaKey].label;

  const ligada = (usuario: UserWithRoles, coluna: string) =>
    dimensao === 'papeis'
      ? usuario.roles.includes(coluna as AppRole)
      : (areasDeAcesso[usuario.id]?.has(coluna as AreaKey) ?? false);

  const nomeDe = (u: UserWithRoles) => `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim();

  const alternar = (usuario: UserWithRoles, coluna: string) => {
    const conceder = !ligada(usuario, coluna);
    const alvos: AlvoDaMatriz[] = [{ id: usuario.id, nome: nomeDe(usuario) }];
    const rotulo = rotuloDaColuna(coluna);
    const chave = `${usuario.id}:${coluna}`;

    const rodar = (dar: boolean, ids: string[]) =>
      dimensao === 'papeis'
        ? aplicarPapel.mutateAsync({ userIds: ids, papel: coluna as AppRole, conceder: dar, alvos })
        : aplicarArea.mutateAsync({ userIds: ids, area: coluna as AreaKey, conceder: dar, alvos, paginas });

    setSalvando(chave);
    rodar(conceder, [usuario.id])
      .then((resultado) =>
        avisarComDesfazer(
          resultado,
          {
            feito: `${rotulo} ${conceder ? 'concedido' : 'removido'} — ${nomeDe(usuario)}`,
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
          <TableHead>Usuário</TableHead>
          <TableHead className="hidden 2xl:table-cell">Email</TableHead>
          {/* Pílulas e matriz são a MESMA informação — a linha mostra uma só.
              Ver o commit que tirou a tabela de dez colunas. */}
          <TableHead className="xl:hidden">Permissões</TableHead>
          {colunas.map((coluna) => (
            <TableHead key={coluna} className="hidden xl:table-cell text-center text-xs">
              {rotuloDaColuna(coluna)}
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
              <span className="block 2xl:hidden text-xs font-normal text-muted-foreground break-all">
                {usuario.email}
              </span>
            </TableCell>
            <TableCell className="hidden 2xl:table-cell text-muted-foreground break-all">{usuario.email}</TableCell>
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
                  rotulo={`${rotuloDaColuna(coluna)} — ${nomeDe(usuario)}`}
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
  <button
    type="button"
    aria-pressed={ligada}
    aria-label={rotulo}
    title={rotulo}
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
);
