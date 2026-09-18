import { useMemo, useState } from 'react';
import { AlertTriangle, Check, FileSignature, MousePointerClick, Sparkles } from 'lucide-react';

import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { TELAS_OSG_WORK } from '@/lib/navegacaoOsgWork';
import {
  AcordoGrupoModal, type ValoresDoAcordo,
} from '@/components/equipe/osg/governanca/AcordoGrupoModal';
import {
  FaixaDaVersao, PainelDaVersao,
} from '@/components/equipe/osg/governanca/PainelDaVersao';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { rowActivateProps } from '@/hooks/rowActivateProps';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useAuditAutores } from '@/hooks/useNotificacoesDocumento';
import {
  useAcordoDoCliente, useAcordoMutations, useVersoesDoAcordo,
} from '@/hooks/useDomainAcordoQuotistas';
import { usePessoasByCliente } from '@/hooks/useQualificacaoDasPartes';
import {
  GRUPOS_DO_ACORDO, obrigatoriosEmFalta, preenchidosNoGrupo, type GrupoDoAcordo,
} from '@/lib/acordoGrupos';
import { resumoDosQuoruns, resumoDosRamos } from '@/lib/acordoQuotistas';
import { mecanismosCoerentes, type BaseQuorum, type TipoQuorum } from '@/lib/acordoQuotistasPadrao';
import { cn } from '@/lib/utils';

/**
 * Cadastro do Acordo de Quotistas (GOV-03).
 *
 * O acordo é o contrato ENTRE OS SÓCIOS: o contrato social diz quem é dono de
 * quanto e quem manda, e o acordo diz o que acontece quando alguém quer sair,
 * morre, se separa ou quer vender.
 *
 * VEM DEPOIS DA MATRIZ no menu, e isso foi verificado no documento antes de ser
 * decidido: o próprio acordo manda que "composição, eleição e prazos de gestão
 * obedecerão ao que dispor o contrato social", define o quórum PARA ALTERAR o
 * contrato, e tira a área da não concorrência do objeto social dele. Documento
 * que lê três coisas de outro vem depois. Como a Matriz é o que vira as
 * cláusulas de competência do contrato, a ordem é Órgãos, Matriz, Acordo.
 *
 * LISTA DE GRUPOS MAIS MODAL, e não formulário corrido. É o modelo de interface
 * decidido para a governança, e a crítica ao mockup foi exatamente essa. Os oito
 * grupos são os da validação de 11/09 contra o modelo do escritório, com os
 * nomes das cláusulas, porque é o vocabulário de quem preenche.
 *
 * O CADASTRO NASCE SEMEADO. Medido no modelo do escritório: ele marca em ciano o
 * que foi trocado ao adaptar o acordo de um cliente para o do seguinte, 277
 * trechos. Ou seja, o consultor não preenche do zero, ele parte do anterior e
 * muda o que difere. Por isso os sete quóruns e os mecanismos padrão já vêm
 * preenchidos: é o gesto que ele já faz no Word.
 */
const AcordoDeQuotistas = () => {
  const { clienteId } = useOsgWork();

  /*
   * A VERSÃO SOB LEITURA, e null quando se está na atual.
   *
   * Mesma convenção da tela Gerar: null é a head, que é a única editável. Sem
   * isto, criar a versão 2 fazia a 1 sumir da tela para sempre, porque a
   * consulta pega a de número mais alto.
   */
  const [versaoVistaId, setVersaoVistaId] = useState<string | null>(null);

  const { data, isLoading } = useAcordoDoCliente(clienteId, versaoVistaId);
  const { data: versoes = [] } = useVersoesDoAcordo(clienteId);
  const { data: autores = {} } = useAuditAutores();
  const { data: pessoas = [] } = usePessoasByCliente(clienteId ?? null);
  const {
    criarAcordo, salvarAcordo, salvarListas, salvarVinculos, novaVersao,
  } = useAcordoMutations(clienteId);

  const [grupoAberto, setGrupoAberto] = useState<GrupoDoAcordo | null>(null);

  const ehMaisRecente = versaoVistaId === null;
  /*
   * ASSINADA, CONGELA. Velha, não.
   *
   * Ver o comentário longo em `HistoricoDoAcordo`: o que vale é o documento
   * assinado, e enquanto ele não existe o cadastro é minuta, corrigível. O
   * precedente é a tela Gerar, onde a versão editável é a que está em rascunho,
   * e não a mais nova.
   */
  const somenteLeitura = !!data?.acordo.assinado_em;

  /** O estado do acordo achatado, como os grupos e o modal o leem. */
  const valores: ValoresDoAcordo = useMemo(() => ({
    ...(data?.acordo ?? {}),
    quoruns: (data?.quoruns ?? []).map((q) => ({
      materia: q.materia,
      chave: q.chave,
      tipo: q.tipo as TipoQuorum,
      percentual: q.percentual,
      base: q.base as BaseQuorum,
    })),
    ramos: (data?.ramos ?? []).map((r) => ({ nome: r.nome })),
    signatarios: (data?.signatarios ?? []).map((x) => x.pessoa_id),
  }), [data]);

  const salvarGrupo = async (novos: ValoresDoAcordo) => {
    if (!data) return;
    const { quoruns, ramos, signatarios, sociedades, ...cabecalho } = novos;

    /*
     * Os quatro mecanismos espelhados se acertam AQUI, e não na tela.
     *
     * A opção de compra se liga no bloco "Opções de compra e venda", e a
     * marcação dela mora na lista do bloco "Saída". Sem passar por esta função,
     * desligar o interruptor deixaria a marcação velha no banco até alguém abrir
     * o outro bloco. Como toda gravação passa por aqui, seja qual for o bloco
     * editado, a lista nunca discorda dos interruptores.
     */
    cabecalho.mecanismos = mecanismosCoerentes(
      cabecalho.mecanismos as string[] | null, novos,
    );

    // As duas listas viajam juntas porque a auditoria delas é uma entrada por
    // lista, e não uma por linha. Ver `lib/acordoQuotistas`.
    await salvarListas.mutateAsync({
      acordoId: data.acordo.id,
      versao: data.acordo.versao,
      quoruns,
      ramos,
      antes: {
        quoruns: resumoDosQuoruns(valores.quoruns),
        ramos: resumoDosRamos(valores.ramos),
      },
    });

    await salvarVinculos.mutateAsync({
      acordoId: data.acordo.id,
      versao: data.acordo.versao,
      signatarios,
    });

    // O `grupo` é o que carimba o bloco como conferido. Ver `salvarAcordo`.
    await salvarAcordo.mutateAsync({
      id: data.acordo.id, campos: cabecalho, grupo: grupoAberto?.chave,
    });
  };

  const salvando = salvarAcordo.isPending || salvarListas.isPending
    || salvarVinculos.isPending;

  const conferidos = new Set(data?.acordo.grupos_conferidos ?? []);
  const faltamConferir = GRUPOS_DO_ACORDO.filter((g) => !conferidos.has(g.chave)).length;

  return (
    <OsgLayout
      title={TELAS_OSG_WORK.acordoQuotistas.label}
      subtitle={TELAS_OSG_WORK.acordoQuotistas.descricao}
    >
      <div className="mx-auto max-w-6xl space-y-5">
        {!clienteId ? (
          <Vazio texto="Selecione um cliente na barra acima para abrir o acordo deste cliente." />
        ) : isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : !data ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 px-6 py-16 text-center">
            <FileSignature className="h-10 w-10 text-muted-foreground opacity-50" />
            <p className="text-sm font-medium">Este cliente ainda não tem acordo.</p>
            <p className="max-w-lg text-sm text-muted-foreground">
              O acordo nasce com os sete quóruns e os mecanismos mais comuns já preenchidos,
              medidos nos acordos que a OSG já fez. Você corrige o que este cliente tem de
              diferente, em vez de digitar tudo.
            </p>
            <Button
              size="sm"
              className="mt-1"
              disabled={criarAcordo.isPending}
              onClick={() => criarAcordo.mutate()}
            >
              <Sparkles className="mr-2 h-4 w-4" /> Criar o acordo
            </Button>
          </div>
        ) : (
          <>
            {/*
              DUAS COLUNAS, e o painel da versão na estreita.

              Ele já foi duas faixas no topo: uma barra bege com três palavras
              dentro e a lista de versões, que empurrava os oito blocos para baixo
              cada vez que abria. Informação de contexto não disputa espaço com o
              trabalho. Embaixo de 1024px vira uma coluna só, e aí o painel vem
              primeiro, porque é a identidade do que está na tela.
            */}
            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_248px] lg:items-start">
              <div className="order-2 space-y-5 lg:order-1">

            {/*
              A faixa aparece nas duas situações que fogem do caso comum: versão
              assinada (congelada) e versão que não é a mais nova. Na minuta mais
              recente, que é o caso de sempre, ela não tem o que dizer, e quem
              informa é o painel ao lado.
            */}
            {(somenteLeitura || !ehMaisRecente) && (
              <FaixaDaVersao
                numero={data.acordo.versao}
                numeroAtual={versoes[0]?.versao ?? data.acordo.versao}
                assinadoEm={data.acordo.assinado_em}
                ehMaisRecente={ehMaisRecente}
              />
            )}

            {/*
              A faixa de instrução, no mesmo molde da Matriz: o que fazer primeiro
              tem de estar visível sem rolar. Ela diz o GESTO, e não repete o que
              o cartão e o subtítulo já dizem.

              SOME EM MODO LEITURA, onde ela mandaria fazer o que a tela não deixa:
              o lugar dela é a faixa da versão anterior, que diz por que não dá.
            */}
            {!somenteLeitura && ehMaisRecente && (
            <div className="flex items-start gap-2.5 rounded-xl border border-osg-200 bg-osg-50/60 p-4">
              <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-osg-600" aria-hidden />
              <p className="text-sm text-osg-700">
                <span className="font-semibold">Clique em um bloco para preencher.</span>{' '}
                Os quóruns e as regras mais comuns já vêm respondidos, então percorra os
                blocos e corrija só o que este cliente tem de diferente. Cada campo mostra,
                na ajuda, a frase que o modelo usa e o número que ele traz.{' '}
                {faltamConferir > 0 ? (
                  <span className="font-semibold">
                    Faltam {faltamConferir} de {GRUPOS_DO_ACORDO.length} blocos por conferir.
                  </span>
                ) : (
                  <span className="font-semibold">Todos os blocos foram conferidos.</span>
                )}
              </p>
            </div>
            )}

            {/*
              Os oito grupos como cartões, com o estado de preenchimento. O
              consultor vai ao grupo que este cliente tem de diferente, como vai
              à cláusula pintada no documento que ele adapta.
            */}
            <div className="grid gap-4 sm:grid-cols-2">
              {GRUPOS_DO_ACORDO.map((g) => {
                /*
                 * CONFERIDO NÃO VENCE CAMPO OBRIGATÓRIO VAZIO.
                 *
                 * Antes dava para abrir o bloco, salvar sem preencher e o cartão
                 * dizer "conferido": o Acordo ficava com os oito blocos verdes e
                 * sem um único signatário, e o buraco só aparecia no documento,
                 * com o preâmbulo sem ninguém. O carimbo diz que alguém olhou; o
                 * que falta continua faltando.
                 */
                const faltando = obrigatoriosEmFalta(g, valores);
                const conferido = conferidos.has(g.chave) && faltando.length === 0;
                const { preenchidos, total } = preenchidosNoGrupo(g, valores, conferido);
                /*
                 * NÃO EXISTE "PRONTO" AQUI, e a ausência é deliberada.
                 *
                 * Ter todos os campos com valor não quer dizer que alguém olhou:
                 * os quóruns e as regras mais comuns nascem respondidos pela
                 * semente, e o grupo aparecia com o selo de pronto antes de o
                 * analista abrir. Isso convida a pular justamente o bloco que
                 * mais precisa de conferência, porque é o que veio de fora.
                 *
                 * O selo volta quando existir o registro de quem CONFERIU, que é
                 * outra coisa que ter valor. Até lá, a contagem é o que é honesto
                 * dizer: quantos campos têm resposta, de quantos existem.
                 */
                const cheio = preenchidos === total && total > 0;
                return (
                  <div
                    key={g.chave}
                    /*
                      O SPREAD VEM ANTES DO `className`, e a ordem não é gosto.
                      `rowActivateProps` devolve `className: 'cursor-pointer'`, porque
                      nasceu para `<TableRow>`, que não recebe classe de quem chama.
                      Espalhado depois, ele substitui o `className` inteiro e o cartão
                      perde moldura, fundo e espaçamento de uma vez, que foi o que
                      aconteceu na primeira versão desta tela.
                    */
                    /*
                      Em leitura o cartão não é botão: sem `role`, sem tabIndex e
                      sem clique. Deixá-lo clicável abriria o modal editando a
                      versão VELHA, que é justamente o que a faixa promete que não
                      acontece.
                    */
                    {...(somenteLeitura ? {} : rowActivateProps(() => setGrupoAberto(g)))}
                    className={cn(
                      // `bg-superficie-cartao` é a superfície do OBJETO cartão, tingida.
                      // A outra classe, a do cromo e do controle, difere em duas letras e
                      // significa o oposto; escrevê-la aqui deixaria a caixa branca sobre
                      // página branca. A catraca de `cartaoTingido.test.ts` guarda isso, e
                      // casa o texto do arquivo inteiro, comentário incluído.
                      'rounded-xl border bg-superficie-cartao p-4',
                      'shadow-sm shadow-osg-300/20 transition-colors',
                      somenteLeitura
                        ? 'cursor-default'
                        : 'cursor-pointer hover:border-osg-moss hover:bg-osg-50/60 hover:shadow-md',
                      conferido ? 'border-osg-200' : 'border-osg-300/70',
                    )}
                  >
                    {/*
                      `flex-wrap` e `min-w-0`: medido em 1024px, o contador
                      passava até 48px da borda direita do cartão. Com o painel
                      lateral comendo 248px, a coluna fica estreita demais para
                      título e badge na mesma linha; agora o badge desce em vez
                      de vazar.
                    */}
                    <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
                      <p className="min-w-0 flex-1 text-sm font-semibold">{g.titulo}</p>
                      {conferido ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 gap-1 border-osg-200 bg-osg-50 text-osg-700"
                        >
                          <Check className="h-3 w-3" /> conferido
                        </Badge>
                      ) : faltando.length > 0 ? (
                        <Badge
                          variant="outline"
                          className="shrink-0 gap-1 border-warning/40 bg-warning/10 text-warning"
                        >
                          <AlertTriangle className="h-3 w-3" />
                          falta {faltando.map((c) => c.rotulo.toLowerCase()).join(', ')}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className={cn(
                            'shrink-0 tabular-nums',
                            cheio ? 'text-osg-700' : 'text-muted-foreground',
                          )}
                        >
                          {preenchidos} de {total} respondidos
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{g.resumo}</p>
                  </div>
                );
              })}
            </div>
              </div>

              {/*
                SEM `sticky`, e a tentativa está registrada porque ela não funciona
                aqui por um motivo que não é desta tela.
                
                O `OsgLayout` envolve o conteúdo num `div.flex-1.overflow-y-auto`,
                que passa a ser o contêiner de rolagem do `sticky`. Só que ele
                NUNCA rola: medido em quatro resoluções, `scrollHeight` é igual a
                `clientHeight`, e quem rola é a janela. Contra um contêiner que não
                rola, o `sticky` nunca engata: em 1024x700 o painel saiu inteiro da
                tela em vez de travar no topo.
                
                Consertar de verdade é fechar a cadeia de altura do `OsgLayout`,
                que vale para TODAS as telas da área. Não é mudança para embutir
                aqui de carona.
              */}
              <aside className="order-1 lg:order-2">
                <PainelDaVersao
                  versao={data.acordo.versao}
                  assinadoEm={data.acordo.assinado_em}
                  atualizadoEm={data.acordo.updated_at}
                  atualizadoPor={autores[data.acordo.updated_by ?? ''] || null}
                  versoes={versoes}
                  autores={autores}
                  versaoVistaId={versaoVistaId}
                  onSelecionar={(id) => {
                    setVersaoVistaId(id);
                    setGrupoAberto(null);
                  }}
                  /*
                    O BOTÃO DE NOVA VERSÃO SÓ COM TUDO CONFERIDO, por decisão de
                    15/09. "Terminado" não é "todo campo tem valor", porque o
                    acordo nasce semeado: é todo bloco aberto e salvo por alguém.

                    E SÓ NA MAIS NOVA: criar a versão 3 olhando a 1 daria uma
                    versão que não continua o que está na tela.

                    NA VERSÃO ASSINADA ELE APARECE SEMPRE, e essa exceção é o que
                    impede um beco sem saída: a assinada congela, e sem o botão a
                    tela ficaria sem porta nenhuma, nem corrigir nem seguir.
                  */
                  podeNovaVersao={ehMaisRecente && (somenteLeitura || faltamConferir === 0)}
                  criandoVersao={novaVersao.isPending}
                  onNovaVersao={() => novaVersao.mutate({ versaoAtual: data.acordo.versao })}
                />
              </aside>
            </div>
          </>
        )}
      </div>

      {grupoAberto && (
        <AcordoGrupoModal
          open={!!grupoAberto}
          onOpenChange={(aberto) => !aberto && setGrupoAberto(null)}
          grupo={grupoAberto}
          valores={valores}
          pessoas={pessoas}
          onSalvar={salvarGrupo}
          salvando={salvando}
          /*
           * Trocar de grupo sem passar pela lista: a marcação espelhada diz em
           * que bloco se muda, e daqui ela LEVA. Salvar não entra no caminho de
           * propósito — o que a pessoa fez nas caixas livres deste grupo segue
           * no rascunho, e quem decide gravar continua sendo o botão.
           */
          onIrParaGrupo={(chave) => {
            const destino = GRUPOS_DO_ACORDO.find((g) => g.chave === chave);
            if (destino) setGrupoAberto(destino);
          }}
        />
      )}
    </OsgLayout>
  );
};

const Vazio = ({ texto }: { texto: string }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 py-16 text-center text-muted-foreground">
    <FileSignature className="h-10 w-10 opacity-50" />
    <p className="max-w-md text-sm">{texto}</p>
  </div>
);

export default AcordoDeQuotistas;
