import { useMemo, useState } from 'react';
import JSZip from 'jszip';
import { toast } from 'sonner';
import {
  Columns3, CopyPlus, FileSpreadsheet, MousePointerClick, Plus, ScrollText, Sparkles,
} from 'lucide-react';

import { AcrescentarItemModal } from '@/components/equipe/osg/governanca/AcrescentarItemModal';
import { ColunasDoProtocoloModal } from '@/components/equipe/osg/governanca/ColunasDoProtocoloModal';
import { GradeDoProtocolo } from '@/components/equipe/osg/governanca/GradeDoProtocolo';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { ProtocoloLinhaModal } from '@/components/equipe/osg/governanca/ProtocoloLinhaModal';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useOsgWork } from '@/contexts/OsgWorkContext';
import { useClienteTemDocumentoGerado } from '@/hooks/useDocumentoGerado';
import {
  useCatalogoDeItens,
  useCatalogoDeTemas,
  useProtocoloDoCliente,
  useProtocoloMutations,
  useVersoesDoProtocolo,
} from '@/hooks/useDomainProtocoloRemuneracao';
import { TELAS_OSG_WORK } from '@/lib/navegacaoOsgWork';
import { nomeDoArquivo, planilhaXmlDoProtocolo } from '@/lib/protocoloPlanilhaXml';
import {
  type LinhaDaGrade,
  diffDaLinha,
  montarGrade,
  ordenarBeneficiarios,
} from '@/lib/protocoloRemuneracao';

/**
 * O Protocolo de Remuneração de um cliente (GOV-F).
 *
 * ITENS em linha, agrupados por TEMA; BENEFICIÁRIOS em coluna. Cada cruzamento é
 * a regra escrita: quanto o fundador retira, que carro a sociedade paga, quem
 * tem plano de saúde. É o que a família combinou, item por item.
 *
 * **A coluna não é órgão de governança.** Ela é título combinado na conversa com
 * o cliente, e por isso a tela deixa renomear, acrescentar e tirar. O padrão que
 * ela oferece são Fundadores, Sócios e Sócios Gestores, mas nenhum cliente real
 * usa exatamente esses três: Potrich usa "Sócios Fundadores" e "Sucessores na
 * Gestão", Toqueto usa "Gestores", "Fundadores" e "Sócios/Filhos 1a geração".
 *
 * **A grade mostra o começo da regra, e a caixa mostra a regra inteira.** Aqui a
 * célula JÁ É a frase do documento, e ela é longa: no Potrich, o item "Modelo do
 * Veículo" tem 160 caracteres numa célula só. Espremer isso na grade tornaria as
 * 52 linhas ilegíveis, então a grade corta em três linhas de texto e o
 * preenchimento acontece numa caixa por ITEM, que é como quem preenche pensa.
 */
const ProtocoloDeRemuneracao = () => {
  const { clienteId } = useOsgWork();
  const { data: temas = [] } = useCatalogoDeTemas(clienteId);
  const { data: itens = [] } = useCatalogoDeItens(clienteId);
  const [versaoAberta, setVersaoAberta] = useState<string | null>(null);
  const { data: versoes = [] } = useVersoesDoProtocolo(clienteId);
  const { data: protocolo, isLoading } = useProtocoloDoCliente(clienteId, versaoAberta);
  const { data: temDocumento = false } = useClienteTemDocumentoGerado(clienteId ?? null);
  const {
    criarProtocolo, novaVersao, registrarGeracao, salvarLinha, removerLinha, adicionarItens,
    criarTemaDoCliente, criarItemDoCliente,
    adicionarBeneficiario, renomearBeneficiario, removerBeneficiario,
  } = useProtocoloMutations(clienteId);

  const [emEdicao, setEmEdicao] = useState<LinhaDaGrade | null>(null);
  const [gerindoColunas, setGerindoColunas] = useState(false);
  const [acrescentando, setAcrescentando] = useState(false);
  const [aTirar, setATirar] = useState<LinhaDaGrade | null>(null);

  const colunas = useMemo(
    () => ordenarBeneficiarios(protocolo?.beneficiarios ?? []),
    [protocolo],
  );

  const grade = useMemo(
    () =>
      protocolo
        ? montarGrade(protocolo.linhas, protocolo.beneficiarios, protocolo.regras)
        : [],
    [protocolo],
  );

  /* Linha preenchida é a que já tem pelo menos uma regra escrita. */
  const preenchidas = useMemo(
    () => grade.flatMap((s) => s.linhas).filter((l) => l.celulas.some((c) => c.texto)).length,
    [grade],
  );

  const totalDeLinhas = useMemo(() => grade.reduce((n, s) => n + s.linhas.length, 0), [grade]);

  const regrasPorColuna = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const c of grade.flatMap((s) => s.linhas).flatMap((l) => l.celulas)) {
      if (c.texto) contagem.set(c.beneficiario_id, (contagem.get(c.beneficiario_id) ?? 0) + 1);
    }
    return contagem;
  }, [grade]);

  const foraDoProtocolo = useMemo(() => {
    const dentro = new Set((protocolo?.linhas ?? []).map((l) => l.item.id));
    return itens.filter((i) => !dentro.has(i.id));
  }, [itens, protocolo]);

  /* A linha seguinte na ordem da grade, atravessando a virada de tema. Ausente
     quando a aberta é a última de todas. */
  const proxima = useMemo(() => {
    if (!emEdicao) return null;
    const todas = grade.flatMap((s) => s.linhas);
    const i = todas.findIndex((l) => l.linha_id === emEdicao.linha_id);
    return i >= 0 ? (todas[i + 1] ?? null) : null;
  }, [emEdicao, grade]);

  /* A ordem é DENTRO do tema, então a base de quem entra depois sai das linhas
     daquele tema, e não da grade inteira. */
  const ultimaOrdemDoTema = (temaId: string) =>
    (grade.find((s) => s.tema_id === temaId)?.linhas ?? []).reduce(
      (maior, l) => Math.max(maior, protocolo?.linhas.find((x) => x.id === l.linha_id)?.ordem ?? 0),
      0,
    );

  /**
   * Escreve a planilha DENTRO do modelo da casa.
   *
   * Não monta um arquivo novo: abre o `.xlsx` do modelo, que é um zip, troca só
   * a planilha de dentro e refecha. Assim `styles.xml`, fontes, cores, bordas,
   * alturas de linha, congelamento de painel e configuração de impressão ficam
   * intocados, e a saída é idêntica ao modelo por construção.
   *
   * A primeira versão montava o arquivo do zero com o `xlsx`, e saía cru: a
   * versão community do SheetJS escreve valor, largura e mesclagem, mas não
   * escreve estilo de célula. O arquivo saía com 1 fonte e 1 estilo contra as 6
   * fontes e 18 estilos do modelo.
   */
  const gerarPlanilha = async () => {
    if (!protocolo) return;
    try {
      const resposta = await fetch('/modelos/protocolo-remuneracao-modelo.xlsx');
      if (!resposta.ok) throw new Error('não encontrei o modelo da casa');

      const zip = await JSZip.loadAsync(await resposta.arrayBuffer());
      const planilha = zip.file('xl/worksheets/sheet1.xml');
      if (!planilha) throw new Error('o modelo não tem a planilha esperada');

      const { xml } = planilhaXmlDoProtocolo(
        await planilha.async('string'),
        grade,
        colunas,
      );
      zip.file('xl/worksheets/sheet1.xml', xml);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = nomeDoArquivo(protocolo.cliente, protocolo.protocolo.versao);
      link.click();
      URL.revokeObjectURL(url);

      /*
        O registro vem DEPOIS do arquivo e sem esperar: o download é o que a
        pessoa pediu, e não pode ser desfeito se o banco falhar. A mutação avisa
        sozinha se não conseguir registrar.
      */
      void registrarGeracao.mutateAsync({
        protocoloId: protocolo.protocolo.id,
        versao: protocolo.protocolo.versao,
        /* O snapshot guarda a grade que produziu o arquivo, e e ela que permite
           refazer a planilha identica depois. O arquivo em si nao e guardado,
           como nenhum documento deste sistema e. */
        grade,
      });
    } catch (e) {
      toast.error(
        e instanceof Error ? `Não consegui gerar a planilha: ${e.message}` : 'Não consegui gerar a planilha',
      );
    }
  };

  const vazio = (icone: React.ReactNode, texto: React.ReactNode) => (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 px-6 py-16 text-center">
      {icone}
      {texto}
    </div>
  );

  return (
    <OsgLayout
      title={TELAS_OSG_WORK.protocoloRemuneracao.label}
      subtitle={TELAS_OSG_WORK.protocoloRemuneracao.descricao}
      headerActions={
        protocolo ? (
          <div className="flex items-center gap-2">
            {/*
              O seletor só aparece a partir da segunda versão: com uma só, ele
              seria um campo que não escolhe nada. A mais nova vem primeiro e é a
              que abre por padrão.

              O RÓTULO DIZ UM FATO, E NÃO UM STATUS. A primeira versão desta tela
              marcava a mais nova como "(atual)", e isso prometia uma decisão que
              o cadastro não tem: não existe aqui nada que diga que uma versão
              está fechada, nem nada que trave a anterior. "Mais recente" é
              constatação, e a data diz o resto.

              O Acordo de Quotistas tem o critério que falta, e é `assinado_em`:
              preenchido, a versão é assinada e fica em leitura; vazio, é minuta
              e se corrige. Não copiei porque o que se assina é o instrumento em
              prosa, e o que esta tela gera é planilha. Fica para quando a
              consultoria disser se o protocolo assinado é o produto final.
            */}
            {versoes.length > 1 && (
              <Select
                value={protocolo.protocolo.id}
                onValueChange={(id) => setVersaoAberta(id)}
              >
                <SelectTrigger className="h-8 w-[230px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {versoes.map((v, i) => (
                    <SelectItem key={v.id} value={v.id}>
                      Versão {v.versao}
                      {i === 0 ? ' · mais recente' : ''}
                      {` · ${new Date(v.created_at).toLocaleDateString('pt-BR')}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={novaVersao.isPending}
              onClick={() => {
                void novaVersao.mutateAsync({ atual: protocolo }).then(() => setVersaoAberta(null));
              }}
            >
              <CopyPlus className="mr-2 h-4 w-4" /> Nova versão
            </Button>
            <Button size="sm" variant="outline" onClick={() => setGerindoColunas(true)}>
              <Columns3 className="mr-2 h-4 w-4" /> Colunas
            </Button>
            <Button size="sm" variant="outline" onClick={() => setAcrescentando(true)}>
              <Plus className="mr-2 h-4 w-4" /> Acrescentar item
            </Button>
            {/*
              Gerar fica por último e é o único preenchido: é o fim do trabalho
              desta tela, e as outras três ações servem para chegar até ele.
            */}
            <Button size="sm" onClick={() => void gerarPlanilha()}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Gerar planilha
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="mx-auto max-w-[1400px] space-y-5">
        {!clienteId ? (
          vazio(
            <ScrollText className="h-10 w-10 text-muted-foreground opacity-50" />,
            <p className="max-w-md text-sm text-muted-foreground">
              Selecione um cliente na barra acima para abrir o protocolo deste cliente.
            </p>,
          )
        ) : isLoading ? (
          <p className="py-12 text-center text-sm text-muted-foreground">Carregando…</p>
        ) : !protocolo ? (
          vazio(
            <ScrollText className="h-10 w-10 text-muted-foreground opacity-50" />,
            <>
              <p className="text-sm font-medium">Este cliente ainda não tem protocolo.</p>
              <p className="max-w-lg text-sm text-muted-foreground">
                O protocolo nasce com os {itens.filter((i) => !i.cliente_id).length} itens do
                modelo da casa, em {temas.filter((t) => !t.cliente_id).length} temas, e você tira
                os que não se aplicam. As colunas começam em Fundadores, Sócios e Sócios
                Gestores, e você renomeia para os nomes que a família usa.
              </p>
              <Button
                size="sm"
                disabled={criarProtocolo.isPending}
                onClick={() => criarProtocolo.mutate()}
              >
                <Sparkles className="mr-2 h-4 w-4" />
                {criarProtocolo.isPending ? 'Criando…' : 'Criar o protocolo'}
              </Button>
            </>,
          )
        ) : (
          <>
            {/*
              A instrução fica ANTES da grade, e não depois: quem abre isto pela
              primeira vez não sabe que a linha é clicável, e um aviso embaixo de
              52 linhas é um aviso que ninguém lê. Mesma régua da Matriz.
            */}
            <div className="flex items-start gap-2.5 rounded-xl border border-osg-200 bg-osg-50/60 p-4">
              <MousePointerClick className="mt-0.5 h-4 w-4 shrink-0 text-osg-600" aria-hidden />
              <div className="space-y-0.5">
                <p className="text-sm text-osg-700">
                  <span className="font-semibold">Clique em uma linha para escrever a regra.</span>{' '}
                  A caixa abre com{' '}
                  {colunas.length === 1 ? 'a coluna' : `as ${colunas.length} colunas`} deste
                  protocolo, e você escreve o que vale para cada uma naquele item. Se a família
                  usa outros nomes de grupo, troque em{' '}
                  <span className="font-semibold">Colunas</span>, no alto da tela.
                </p>
                <p className="text-xs text-muted-foreground">
                  {preenchidas} de {totalDeLinhas} itens preenchidos
                  {` · versão ${protocolo.protocolo.versao}`}
                </p>
              </div>
            </div>

            {colunas.length === 0 ? (
              /*
                Sem coluna não há onde escrever, e uma grade de zero colunas não
                se preenche. O texto manda para o botão que resolve, em vez de
                deixar a pessoa procurando.
              */
              vazio(
                <Columns3 className="h-10 w-10 text-muted-foreground opacity-50" />,
                <>
                  <p className="text-sm font-medium">Este protocolo está sem colunas.</p>
                  <p className="max-w-lg text-sm text-muted-foreground">
                    As colunas são os grupos que recebem: fundadores, sócios, gestores, o nome
                    que a família usar. Sem pelo menos uma, não há onde escrever a regra.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setGerindoColunas(true)}>
                    <Columns3 className="mr-2 h-4 w-4" /> Definir as colunas
                  </Button>
                </>,
              )
            ) : (
              <GradeDoProtocolo grade={grade} colunas={colunas} onAbrirLinha={setEmEdicao} />
            )}
          </>
        )}
      </div>

      <ProtocoloLinhaModal
        open={!!emEdicao}
        onOpenChange={(aberto) => !aberto && setEmEdicao(null)}
        linha={emEdicao}
        salvando={salvarLinha.isPending}
        mostrarHistorico={temDocumento}
        onSalvar={(celulas) =>
          salvarLinha.mutateAsync({
            linhaId: emEdicao!.linha_id,
            celulas,
            rotulo: emEdicao!.item,
            /*
              O diff é montado aqui, e não no hook, porque só a tela tem os NOMES
              das colunas. Uma auditoria com uuid dentro não se lê depois.
            */
            diff: diffDaLinha(
              emEdicao!.celulas
                .filter((c) => c.texto)
                .map((c) => ({
                  linha_id: emEdicao!.linha_id,
                  beneficiario_id: c.beneficiario_id,
                  texto: c.texto as string,
                })),
              celulas,
              (id) => emEdicao!.celulas.find((c) => c.beneficiario_id === id)?.beneficiario ?? '?',
            ),
          })
        }
        onTirarDoProtocolo={() => setATirar(emEdicao)}
        onProxima={proxima ? () => setEmEdicao(proxima) : undefined}
      />

      <ColunasDoProtocoloModal
        open={gerindoColunas}
        onOpenChange={setGerindoColunas}
        colunas={colunas}
        regrasPorColuna={regrasPorColuna}
        salvando={
          adicionarBeneficiario.isPending ||
          renomearBeneficiario.isPending ||
          removerBeneficiario.isPending
        }
        onAcrescentar={(nome) =>
          adicionarBeneficiario.mutateAsync({
            protocoloId: protocolo!.protocolo.id,
            nome,
            ordemBase: colunas.reduce((maior, b) => Math.max(maior, b.ordem), 0),
          })
        }
        onRenomear={(id, de, para) => renomearBeneficiario.mutateAsync({ id, de, para })}
        onTirar={(id, nome) => removerBeneficiario.mutateAsync({ id, nome })}
      />

      <AcrescentarItemModal
        open={acrescentando}
        onOpenChange={setAcrescentando}
        disponiveis={foraDoProtocolo}
        temas={temas}
        salvando={
          adicionarItens.isPending || criarItemDoCliente.isPending || criarTemaDoCliente.isPending
        }
        onAcrescentar={(ids) =>
          adicionarItens.mutateAsync({
            protocoloId: protocolo!.protocolo.id,
            itemIds: ids,
            ordemBase: Math.max(
              ...ids.map((id) => {
                const item = itens.find((i) => i.id === id);
                return item ? ultimaOrdemDoTema(item.tema_id) : 0;
              }),
              0,
            ),
          })
        }
        onCriarItem={(temaId, nome) =>
          criarItemDoCliente.mutateAsync({
            protocoloId: protocolo!.protocolo.id,
            temaId,
            nome,
            ordemBase: ultimaOrdemDoTema(temaId),
          })
        }
        onCriarTema={(nome) =>
          criarTemaDoCliente.mutateAsync({
            nome,
            ordemBase: temas.reduce((maior, t) => Math.max(maior, t.ordem), 0),
          })
        }
      />

      {/*
        Tirar apaga as regras junto, por cascade, e não há desfazer. Aqui perde
        mais do que na Matriz: cada célula é um parágrafo escrito à mão, e não
        uma escolha de lista.
      */}
      <AlertDialog open={!!aTirar} onOpenChange={(aberto) => !aberto && setATirar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tirar {aTirar?.item} do protocolo?</AlertDialogTitle>
            <AlertDialogDescription>
              {aTirar && aTirar.celulas.some((c) => c.texto)
                ? `O que foi escrito nas ${aTirar.celulas.filter((c) => c.texto).length} colunas desta linha se perde. O item continua no catálogo e pode voltar por Acrescentar item.`
                : 'O item continua no catálogo e pode voltar por Acrescentar item.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (aTirar) {
                  removerLinha.mutate({ linhaId: aTirar.linha_id, rotulo: aTirar.item });
                  setEmEdicao(null);
                }
                setATirar(null);
              }}
            >
              Tirar do protocolo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OsgLayout>
  );
};

export default ProtocoloDeRemuneracao;
