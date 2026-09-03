import { type ReactNode, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Landmark, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react';

import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { OrgaoGovernancaModal } from '@/components/equipe/osg/governanca/OrgaoGovernancaModal';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { rowActivateProps } from '@/hooks/rowActivateProps';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import {
  useOrgaosGovernanca,
  useOrgaoGovernancaMutations,
  type OrgaoGovernanca,
} from '@/hooks/useDomainOrgaoGovernanca';
import {
  ehOrgaoPadrao,
  hierarquiaArrumada,
  padroesFaltando,
} from '@/lib/orgaosGovernancaPadrao';
import { cn } from '@/lib/utils';

/**
 * Cadastro de órgãos de governança (GOV-01).
 *
 * O órgão é a instância de decisão de um cliente. Esta tela é a fonte das COLUNAS
 * da Matriz de Alçadas e de quem recebe competência no contrato social.
 *
 * O cliente vem da barra do OSG Work, como nas outras telas do módulo, e não de
 * um seletor próprio: quem está trabalhando um cliente não deveria escolhê-lo de
 * novo a cada tela.
 */
/**
 * Cabeçalho de coluna com explicação no hover.
 *
 * Vale só onde o rótulo é vocabulário de quem já sabe: "Hierarquia", "Status" e
 * "Vigência" não dizem o efeito que têm. Onde o texto da página já explica,
 * tooltip vira ruído.
 */
function ComAjuda({ texto, children }: { texto: string; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="cursor-help border-b border-dotted border-muted-foreground/40">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs leading-relaxed">{texto}</TooltipContent>
    </Tooltip>
  );
}

const OrgaosGovernanca = () => {
  const { clienteId } = useOsgWork();
  const { data: orgaos = [], isLoading } = useOrgaosGovernanca(clienteId);
  const { criar, atualizar, excluir, semear, mover } = useOrgaoGovernancaMutations(clienteId);

  const [modalAberto, setModalAberto] = useState(false);
  const [emEdicao, setEmEdicao] = useState<OrgaoGovernanca | null>(null);
  const [aExcluir, setAExcluir] = useState<OrgaoGovernanca | null>(null);

  // Cabecalho em caixa alta e miúdo, como as outras listas do módulo.
  const cabecalhoCls = 'h-10 text-[11px] uppercase tracking-wide';

  const nomes = useMemo(() => orgaos.map((o) => o.nome), [orgaos]);
  const faltamPadroes = useMemo(() => padroesFaltando(nomes), [nomes]);
  // O botão também serve para arrumar: os três podem existir e estar fora de
  // lugar, se alguém cadastrou um deles à mão em vez de usar o botão.
  const foraDeOrdem = useMemo(() => !hierarquiaArrumada(nomes), [nomes]);
  const mostrarBotaoPadroes = faltamPadroes.length > 0 || foraDeOrdem;
  const proximaOrdem = orgaos.length;

  const abrirNovo = () => {
    setEmEdicao(null);
    setModalAberto(true);
  };

  const abrirEdicao = (orgao: OrgaoGovernanca) => {
    setEmEdicao(orgao);
    setModalAberto(true);
  };

  return (
    <OsgLayout
      title="Órgãos de Governança"
      subtitle="As instâncias de decisão do cliente, que viram as colunas da Matriz de Alçadas"
      headerActions={
        clienteId ? (
          <Button size="sm" onClick={abrirNovo}>
            <Plus className="mr-2 h-4 w-4" /> Novo órgão
          </Button>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-7xl space-y-5">
        {/*
          Uma linha dizendo para que a tela serve. Quem chega aqui pela primeira
          vez não sabe que este cadastro é a fonte das colunas da Matriz, e sem
          isso o campo do contrato social parece detalhe em vez de decisão.
        */}
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground/75">
          As instâncias que decidem na empresa do cliente. Cada órgão vira uma coluna da{' '}
          <span className="font-medium">Matriz de Alçadas</span>, e os marcados como{' '}
          <span className="font-medium">Recebe competência</span> ganham cláusula no contrato
          social. Três são padrão da OSG, e o cliente pode ter os próprios.
        </p>

        {!clienteId ? (
          <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 py-16 text-center text-muted-foreground">
            <Landmark className="h-10 w-10 opacity-50" />
            <p className="text-sm">
              Selecione um cliente na barra acima para cadastrar os órgãos de governança dele.
            </p>
          </div>
        ) : (
          <>
            {/*
              O botão dos padrões acrescenta só o que falta, então continua útil
              depois da primeira vez: quem apagou um por engano traz de volta sem
              digitar. Some quando os três já estão lá, para não virar ruído.
            */}
            {mostrarBotaoPadroes && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-osg-200 bg-osg-50/60 p-4">
                <div className="space-y-0.5">
                  <p className="text-sm font-semibold text-osg-700">
                    {faltamPadroes.length > 0
                      ? 'Usar os órgãos padrão da OSG'
                      : 'Arrumar a hierarquia'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {faltamPadroes.length > 0
                      ? `Acrescenta ${faltamPadroes.map((o) => o.nome).join(', ')} no topo da hierarquia. Nem todo cliente tem os três: apague o que não se aplica.`
                      : 'Os órgãos padrão estão fora de lugar. No contrato social a ordem deles é fixa e nenhum órgão do cliente fica acima.'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={semear.isPending}
                  onClick={() => semear.mutate(orgaos)}
                >
                  <Sparkles className="mr-2 h-4 w-4" />{' '}
                  {faltamPadroes.length > 0 ? 'Adicionar padrões' : 'Arrumar ordem'}
                </Button>
              </div>
            )}

            {isLoading ? (
              <p className="py-12 text-center text-sm text-muted-foreground">Carregando…</p>
            ) : orgaos.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 py-16 text-center text-muted-foreground">
                <Landmark className="h-10 w-10 opacity-50" />
                <p className="text-sm">Nenhum órgão cadastrado para este cliente.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-osg-200 bg-background">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={cn(cabecalhoCls, 'w-16')}>
                        <ComAjuda texto="A lista está em ordem de autoridade, do maior para o menor. É ela que diz para onde a decisão sobe quando o valor passa da alçada.">
                          Hierarquia
                        </ComAjuda>
                      </TableHead>
                      <TableHead className={cabecalhoCls}>Nome do órgão</TableHead>
                      <TableHead className={cabecalhoCls}>
                        <ComAjuda texto="Recebe competência: o contrato social ganha uma cláusula “Compete a este órgão…”. Só na Matriz: vira coluna da Matriz de Alçadas, mas fica fora do contrato.">
                          Status
                        </ComAjuda>
                      </TableHead>
                      <TableHead className={cabecalhoCls}>
                        <ComAjuda texto="O período em que o órgão existiu na estrutura do cliente. Em branco quer dizer que está vigente hoje.">
                          Vigência
                        </ComAjuda>
                      </TableHead>
                      <TableHead className={cn(cabecalhoCls, 'w-24 text-right')}>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgaos.map((orgao, indice) => {
                      // Órgão padrão não se move: no contrato social a ordem dos
                      // três é dada, e a consultoria confirmou que órgão do cliente
                      // nunca fica acima deles. Livre é só a ordem entre os do
                      // cliente, abaixo dos padrão.
                      const travado = ehOrgaoPadrao(orgao.nome);
                      return (
                      <TableRow key={orgao.id} {...rowActivateProps(() => abrirEdicao(orgao))}>
                        <TableCell className="py-2.5">
                          {/*
                            Setas em vez de arrastar: a lista tem de três a seis
                            itens, e arrasto pediria estado de origem, alvo e
                            indicador de posição para o mesmo resultado. Setas
                            funcionam no teclado e no toque sem nada extra.
                          */}
                          <div className="flex items-center gap-0.5">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              title={travado ? 'A ordem dos órgãos padrão é fixa' : 'Subir na hierarquia'}
                              aria-label={`Subir ${orgao.nome} na hierarquia`}
                              disabled={indice === 0 || mover.isPending || travado
                                || ehOrgaoPadrao(orgaos[indice - 1]?.nome ?? '')}
                              onClick={() => mover.mutate({ lista: orgaos, indice, direcao: 'cima' })}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6"
                              title={travado ? 'A ordem dos órgãos padrão é fixa' : 'Descer na hierarquia'}
                              aria-label={`Descer ${orgao.nome} na hierarquia`}
                              disabled={indice === orgaos.length - 1 || mover.isPending || travado}
                              onClick={() => mover.mutate({ lista: orgaos, indice, direcao: 'baixo' })}
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="py-2.5 text-sm font-medium">{orgao.nome}</TableCell>
                        <TableCell className="py-2.5">
                          {orgao.entra_no_contrato ? (
                            <Badge variant="secondary">Recebe competência</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Só na Matriz</span>
                          )}
                        </TableCell>
                        <TableCell className="py-2.5 text-xs text-muted-foreground">
                          {orgao.vigencia_inicio || orgao.vigencia_fim
                            ? `${orgao.vigencia_inicio ?? '…'} a ${orgao.vigencia_fim ?? 'hoje'}`
                            : '—'}
                        </TableCell>
                        <TableCell className="py-2.5">
                          {/* Os dois na mesma linha, encostados à direita. */}
                          <div className="flex justify-end gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              title="Editar"
                              aria-label={`Editar ${orgao.nome}`}
                              onClick={() => abrirEdicao(orgao)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive"
                              title="Excluir"
                              aria-label={`Excluir ${orgao.nome}`}
                              onClick={() => setAExcluir(orgao)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </>
        )}
      </div>

      <OrgaoGovernancaModal
        open={modalAberto}
        onOpenChange={setModalAberto}
        orgao={emEdicao}
        salvando={criar.isPending || atualizar.isPending}
        proximaOrdem={proximaOrdem}
        onSalvar={async (input) => {
          if (emEdicao) await atualizar.mutateAsync({ id: emEdicao.id, ...input });
          else await criar.mutateAsync(input);
        }}
      />

      <AlertDialog open={!!aExcluir} onOpenChange={(aberto) => !aberto && setAExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {aExcluir?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              O órgão sai da lista e deixa de ser coluna da Matriz de Alçadas deste cliente. O
              histórico é preservado, e a exclusão fica registrada na auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (aExcluir) excluir.mutate(aExcluir);
                setAExcluir(null);
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OsgLayout>
  );
};

export default OrgaosGovernanca;
