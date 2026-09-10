import { useMemo, useState } from 'react';
import {
  ArrowUp,
  Grid3x3,
  Landmark,
  MousePointerClick,
  Plus,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { MatrizLinhaModal } from '@/components/equipe/osg/governanca/MatrizLinhaModal';
import { AcrescentarAtividadeModal } from '@/components/equipe/osg/governanca/AcrescentarAtividadeModal';
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
import { useOrgaosGovernanca } from '@/hooks/useDomainOrgaoGovernanca';
import {
  useCatalogoDeAtividades,
  useCatalogoDePapeis,
  useMatrizDoCliente,
  useMatrizMutations,
  type LinhaDaMatriz,
} from '@/hooks/useDomainMatrizAlcadas';
import { diffDaLinha } from '@/lib/matrizAlcadas';
import { cn } from '@/lib/utils';

/**
 * A Matriz de Alçadas de um cliente (GOV-02).
 *
 * ATIVIDADES em linha, ÓRGÃOS em coluna. Cada cruzamento diz o que aquele órgão
 * faz naquela atividade, para onde a decisão sobe, e até que limite ele decide
 * sozinho. É o documento-eixo da governança e a origem das alíneas de competência
 * de cada órgão no contrato social.
 *
 * **A grade é para olhar, não para preencher.** Num cliente de cinco órgãos são
 * 115 células, e no documento cada uma é uma frase de 21 palavras em média: isso
 * não cabe numa tela. Aqui cada célula mostra só os papéis, curtos, e o
 * preenchimento acontece numa caixa por LINHA, que é como quem preenche pensa.
 *
 * **As colunas vêm da GOV-01**, sem lista fixa em código, que é o critério que
 * migrou daquela tarefa para esta.
 */
const MatrizDeAlcadas = () => {
  const { clienteId } = useOsgWork();
  const { data: orgaos = [], isLoading: carregandoOrgaos } = useOrgaosGovernanca(clienteId);
  const { data: atividades = [] } = useCatalogoDeAtividades(clienteId);
  const { data: papeis = [] } = useCatalogoDePapeis(clienteId);
  const { data: matriz, isLoading: carregandoMatriz } = useMatrizDoCliente(clienteId);
  const { criarMatriz, salvarLinha, removerLinha, adicionarAtividades, criarAtividadeDoCliente } =
    useMatrizMutations(clienteId);

  const [emEdicao, setEmEdicao] = useState<LinhaDaMatriz | null>(null);
  const [acrescentando, setAcrescentando] = useState(false);
  const [aTirar, setATirar] = useState<LinhaDaMatriz | null>(null);

  const nomeDaAtividade = useMemo(
    () => new Map(atividades.map((a) => [a.id, a.nome])),
    [atividades],
  );
  const nomeDoPapel = useMemo(() => new Map(papeis.map((p) => [p.id, p.nome])), [papeis]);
  const nomeDoOrgao = useMemo(() => new Map(orgaos.map((o) => [o.id, o.nome])), [orgaos]);

  /* Linha preenchida e a que ja tem pelo menos uma celula gravada. */
  const preenchidas = useMemo(
    () => (matriz?.linhas ?? []).filter((l) => l.competencias.length > 0).length,
    [matriz],
  );

  const foraDaMatriz = useMemo(() => {
    const dentro = new Set((matriz?.linhas ?? []).map((l) => l.atividade_id));
    return atividades.filter((a) => !dentro.has(a.id));
  }, [atividades, matriz]);

  /* A linha seguinte na ordem da grade. Ausente quando a aberta é a última. */
  const proxima = useMemo(() => {
    if (!emEdicao || !matriz) return null;
    const i = matriz.linhas.findIndex((l) => l.id === emEdicao.id);
    return i >= 0 ? (matriz.linhas[i + 1] ?? null) : null;
  }, [emEdicao, matriz]);

  const ultimaOrdem = useMemo(
    () => (matriz?.linhas ?? []).reduce((maior, l) => Math.max(maior, l.ordem), 0),
    [matriz],
  );

  const vazio = (icone: React.ReactNode, texto: React.ReactNode) => (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 px-6 py-16 text-center">
      {icone}
      {texto}
    </div>
  );

  return (
    <OsgLayout
      title="Matriz de Alçadas"
      subtitle="Quem decide o quê na empresa do cliente, e até que valor cada instância decide sozinha. As colunas são os órgãos cadastrados em Órgãos de Governança."
      headerActions={
        matriz ? (
          <Button size="sm" variant="outline" onClick={() => setAcrescentando(true)}>
            <Plus className="mr-2 h-4 w-4" /> Acrescentar atividade
          </Button>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-[1400px] space-y-5">
        {!clienteId ? (
          vazio(
            <Grid3x3 className="h-10 w-10 text-muted-foreground opacity-50" />,
            <p className="max-w-md text-sm text-muted-foreground">
              Selecione um cliente na barra acima para abrir a matriz dele.
            </p>,
          )
        ) : carregandoOrgaos || carregandoMatriz ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : orgaos.length === 0 ? (
          /*
            Sem órgão não há coluna, e uma grade de zero colunas não se preenche.
            O texto manda para a tela que resolve, em vez de deixar a pessoa
            procurando.
          */
          vazio(
            <Landmark className="h-10 w-10 text-muted-foreground opacity-50" />,
            <>
              <p className="text-sm font-medium">Este cliente ainda não tem órgãos cadastrados.</p>
              <p className="max-w-lg text-sm text-muted-foreground">
                As colunas da matriz são os órgãos de governança. Cadastre-os primeiro e volte
                aqui.
              </p>
              <Button size="sm" variant="outline" asChild>
                <Link to="/equipe/osg/work/governanca/orgaos">Ir para Órgãos de Governança</Link>
              </Button>
            </>,
          )
        ) : !matriz ? (
          vazio(
            <Grid3x3 className="h-10 w-10 text-muted-foreground opacity-50" />,
            <>
              <p className="text-sm font-medium">Este cliente ainda não tem matriz.</p>
              <p className="max-w-lg text-sm text-muted-foreground">
                A matriz nasce com as {atividades.filter((a) => !a.cliente_id).length} atividades
                padrão da OSG, e você tira as que não se aplicam. Os {orgaos.length} órgãos deste
                cliente entram como colunas.
              </p>
              <Button size="sm" disabled={criarMatriz.isPending} onClick={() => criarMatriz.mutate()}>
                <Sparkles className="mr-2 h-4 w-4" />
                {criarMatriz.isPending ? 'Criando…' : 'Criar a matriz'}
              </Button>
            </>,
          )
        ) : (
          <>
            {/*
              A instrução fica ANTES da grade, e não depois. Quem abre isto pela
              primeira vez não sabe que a linha é clicável, e um aviso embaixo de
              23 linhas é um aviso que ninguém lê. Vale a régua da Patricia: qual
              é o primeiro passo tem de estar visível sem rolar.
            */}
            <div className="flex items-start gap-2.5 rounded-xl border border-osg-200 bg-osg-50/60 p-4">
              <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-osg-600" aria-hidden />
              <div className="space-y-0.5">
                <p className="text-sm text-osg-700">
                  <span className="font-semibold">Clique em uma linha para preencher.</span> A
                  caixa abre com {orgaos.length === 1 ? 'o órgão' : `os ${orgaos.length} órgãos`}{' '}
                  deste cliente, e você diz o que cada um faz naquela atividade. Se faltar
                  alguma atividade nesta lista, use{' '}
                  <span className="font-semibold">Acrescentar atividade</span>, no alto da tela.
                </p>
                {/*
                  O andamento existe porque a grade nasce inteira em branco: sem
                  ele, 24 linhas de traço parecem tela quebrada em vez de trabalho
                  por fazer.
                */}
                <p className="text-xs text-muted-foreground">
                  {preenchidas} de {matriz.linhas.length} atividades preenchidas
                  {` · versão ${matriz.matriz.versao}`}
                  {matriz.matriz.data_referencia
                    ? ` · de ${new Date(matriz.matriz.data_referencia + 'T12:00:00').toLocaleDateString('pt-BR')}`
                    : ''}
                </p>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-osg-200 bg-background">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="min-w-[260px]">
                        Decisão / Atividade ou Matéria
                      </TableHead>
                      {/*
                        `align-bottom` no cabeçalho e `align-top` na célula. Com nome
                        de órgão que quebra em duas linhas, o `align-middle` padrão
                        deixava o rótulo boiando no meio da altura e o conteúdo da
                        primeira linha parecendo desencontrado dele.
                      */}
                      {/*
                        A coluna diz se vira clausula, porque nem toda vira e
                        isso nao se adivinha. No Grupo Mattei as Gerencias tem as
                        23 celulas preenchidas e ZERO alinea no contrato: quem
                        preenche aquela coluna precisa saber que esta descrevendo
                        a operacao, e nao escrevendo contrato.
                      */}
                      {orgaos.map((o) => (
                        <TableHead key={o.id} className="min-w-[150px]">
                          {o.nome}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matriz.linhas.map((linha) => (
                      <TableRow key={linha.id} {...rowActivateProps(() => setEmEdicao(linha))}>
                        <TableCell className="py-2.5 text-left align-top text-sm font-medium">
                          {nomeDaAtividade.get(linha.atividade_id) ?? '—'}
                          {linha.detalhamento && (
                            <span className="mt-0.5 block text-[11px] font-normal text-muted-foreground">
                              {linha.detalhamento}
                            </span>
                          )}
                        </TableCell>

                        {orgaos.map((o) => {
                          const c = linha.competencias.find((x) => x.orgao_id === o.id);
                          if (!c) {
                            return (
                              <TableCell key={o.id} className="py-2.5 text-left align-top text-xs text-muted-foreground/50">
                                —
                              </TableCell>
                            );
                          }
                          if (c.nao_participa) {
                            return (
                              <TableCell key={o.id} className="py-2.5 text-left align-top text-xs text-muted-foreground">
                                Não participa
                              </TableCell>
                            );
                          }
                          return (
                            <TableCell key={o.id} className="py-2.5 text-left align-top text-xs">
                              <span className="text-foreground">
                                {c.papeis.map((p) => nomeDoPapel.get(p) ?? '?').join(' · ')}
                              </span>
                              {/*
                                A ordem das três linhas é a ordem em que a
                                frase se lê: o que o órgão faz, até quanto, e
                                só então para onde vai o resto. Com a seta
                                antes do valor, o "até R$ 100.000" parecia
                                limitar a subida em vez da decisão.

                                E a seta ganha o "acima disso" quando existe
                                alçada: sem isso, duas células com o mesmo
                                órgão na seta não se distinguem, uma que sobe
                                sempre e outra que só sobe passando do limite.
                              */}
                              {c.alcada_valor !== null && (
                                <span className="mt-0.5 block text-[11px] text-osg-700">
                                  até{' '}
                                  {c.alcada_unidade === 'percentual'
                                    ? `${Number(c.alcada_valor)}%`
                                    : `R$ ${Number(c.alcada_valor).toLocaleString('pt-BR')}`}
                                </span>
                              )}
                              {c.sobe_para_orgao_id && (
                                <span className="mt-0.5 flex items-start gap-1 text-[11px] text-muted-foreground">
                                  <ArrowUp className="mt-px h-3 w-3 shrink-0" aria-hidden />
                                  <span>
                                    {c.alcada_valor !== null && 'acima disso: '}
                                    {nomeDoOrgao.get(c.sobe_para_orgao_id)}
                                  </span>
                                </span>
                              )}
                              {c.fora_da_politica && (
                                <span className="mt-0.5 flex items-start gap-1 text-[11px] text-muted-foreground">
                                  {c.sobe_para_orgao_id ? (
                                    <>
                                      <ArrowUp className="mt-px h-3 w-3 shrink-0" aria-hidden />
                                      <span>
                                        fora da política:{' '}
                                        {nomeDoOrgao.get(c.sobe_para_orgao_id)}
                                      </span>
                                    </>
                                  ) : (
                                    <span>autoriza o que foge da política</span>
                                  )}
                                </span>
                              )}
                            </TableCell>
                          );
                        })}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </>
        )}
      </div>

      <MatrizLinhaModal
        open={!!emEdicao}
        onOpenChange={(aberto) => !aberto && setEmEdicao(null)}
        atividade={emEdicao ? (nomeDaAtividade.get(emEdicao.atividade_id) ?? '') : ''}
        linha={emEdicao}
        orgaos={orgaos}
        papeis={papeis}
        salvando={salvarLinha.isPending}
        onSalvar={(detalhamento, competencias) =>
          salvarLinha.mutateAsync({
            linhaId: emEdicao!.id,
            detalhamento,
            competencias,
            rotulo: nomeDaAtividade.get(emEdicao!.atividade_id) ?? 'atividade',
            /*
              O diff é montado aqui, e não no hook, porque só a tela tem os NOMES
              de órgão e de papel. Uma auditoria com uuid dentro não se lê depois.
            */
            diff: diffDaLinha(
              emEdicao!.competencias,
              competencias,
              (id) => nomeDoPapel.get(id) ?? '?',
              (id) => nomeDoOrgao.get(id) ?? '?',
            ),
          })
        }
        onTirarDaMatriz={() => setATirar(emEdicao)}
        onProxima={proxima ? () => setEmEdicao(proxima) : undefined}
      />

      <AcrescentarAtividadeModal
        open={acrescentando}
        onOpenChange={setAcrescentando}
        disponiveis={foraDaMatriz}
        salvando={adicionarAtividades.isPending || criarAtividadeDoCliente.isPending}
        onAcrescentar={(ids) =>
          adicionarAtividades.mutateAsync({
            matrizId: matriz!.matriz.id,
            atividadeIds: ids,
            ordemBase: ultimaOrdem,
          })
        }
        onCriar={(nome) =>
          criarAtividadeDoCliente.mutateAsync({
            matrizId: matriz!.matriz.id,
            nome,
            ordemBase: ultimaOrdem,
          })
        }
      />
      {/*
        Tirar apaga as celulas junto, por cascade, e nao ha desfazer. A GOV-01 ja
        confirma exclusao assim, e aqui perde mais: uma linha preenchida sao ate
        seis celulas de trabalho.
      */}
      <AlertDialog open={!!aTirar} onOpenChange={(aberto) => !aberto && setATirar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Tirar {aTirar ? nomeDaAtividade.get(aTirar.atividade_id) : ''} da matriz?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {aTirar && aTirar.competencias.length > 0
                ? `O que foi preenchido nos ${aTirar.competencias.length} órgãos desta linha se perde. A atividade continua no catálogo e pode voltar por Acrescentar atividade.`
                : 'A atividade continua no catálogo e pode voltar por Acrescentar atividade.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (aTirar) {
                  removerLinha.mutate({
                    linhaId: aTirar.id,
                    rotulo: nomeDaAtividade.get(aTirar.atividade_id) ?? 'atividade',
                  });
                }
                setATirar(null);
              }}
            >
              Tirar da matriz
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OsgLayout>
  );
};

export default MatrizDeAlcadas;
