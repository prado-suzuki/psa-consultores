import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BaldePanel } from '@/components/equipe/osg/documentos/classificar/BaldePanel';
import { ClassificarLevaDialog } from '@/components/equipe/osg/documentos/classificar/ClassificarLevaDialog';
import { DocumentoVisualizador } from '@/components/equipe/osg/documentos/classificar/DocumentoVisualizador';
import { FichaColuna } from '@/components/equipe/osg/documentos/classificar/FichaColuna';
import { isPreviavel } from '@/components/equipe/osg/documentos/docMeta';
import {
  useAllMatriculas, useBensByCliente, useUpsertBem, useUpsertMatricula,
} from '@/hooks/useDiagnosticoPatrimonial';
import {
  useAtualizarDocumento, useBaixarDocumento, usePreviewUrl, type DocumentoArquivoRow,
} from '@/hooks/useDocumentoArquivo';
import { usePessoasByCliente, useUpsertParentesco, useUpsertPessoa } from '@/hooks/useQualificacaoDasPartes';
import { contarPorGaveta, filtrarBalde, proximoDoBalde, type Gaveta } from '@/lib/classificarBalde';
import {
  alvoDeValor, impedimentoDeVinculo, patchDesfazerTriagem, patchVinculo,
  type Alvo, type NovoCadastro,
} from '@/lib/classificarFicha';
import { destinoDoAlvo, destinoDoNovo, type DestinoFicha } from '@/lib/classificarTipo';

interface Props {
  clienteId: string;
  docs: DocumentoArquivoRow[];
  carregando: boolean;
}

/**
 * De onde veio o vínculo, para o histórico da ficha (BER-41). Sem isto o log
 * diz o que mudou mas não por qual caminho, e "cadastrei a partir do documento"
 * é diferente de "vinculei à mão no explorador".
 */
const ORIGEM_LOG = 'Cadastro por Documento';

const bemLabel = (bem: { referencia_dp: string | null; denominacao: string | null }) =>
  [bem.referencia_dp, bem.denominacao].filter(Boolean).join(' — ') || 'Bem';

/**
 * A leva já decidida, esperando só a classificação.
 *
 * Existe entre o clique no botão da ficha e o Confirmar do modal, e nada foi
 * gravado enquanto ela existe — nem o cadastro novo. É de propósito: se a
 * entidade fosse criada antes, cancelar o modal deixaria um cadastro órfão no
 * banco e nenhum arquivo apontando para ele.
 */
type PedidoDeVinculo =
  | { acao: 'cadastrar'; novo: NovoCadastro; destino: DestinoFicha }
  | { acao: 'vincular'; alvo: Alvo; destino: DestinoFicha };

type Pendente = PedidoDeVinculo & {
  leva: DocumentoArquivoRow[];
  destinoLabel: string;
  rotulo: string;
};

/**
 * Modo Classificar do hub: balde à esquerda, documento no centro, ficha à
 * direita. O consultor abre um arquivo sem dono, lê, e cadastra a entidade a
 * partir dele — salvar cria o cadastro e vincula o arquivo aberto (1:1), o que
 * tira o arquivo do balde. Ver docs/planos/cadastro-vinculo-documentos.md.
 */
export function ClassificarDocumentos({ clienteId, docs, carregando }: Props) {
  const [gaveta, setGaveta] = useState<Gaveta>('todas');
  const [busca, setBusca] = useState('');
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [erroPreview, setErroPreview] = useState<string | null>(null);
  const [fichaToken, setFichaToken] = useState(0);
  const [sugestao, setSugestao] = useState<{ valor: string; label: string } | null>(null);
  // Cadastrar x Vincular vive AQUI, e não dentro da ficha: a coluna é remontada
  // a cada arquivo aberto (ver a `key` abaixo), e quem está varrendo o balde
  // vinculando não pode ser jogado de volta ao cadastro a cada troca de arquivo.
  const [modo, setModo] = useState<'novo' | 'existente'>('novo');
  // O alvo escolhido em Vincular também mora aqui, pelo mesmo motivo: varrer o
  // balde é abrir um arquivo atrás do outro apontando para a MESMA entidade.
  // Se a seleção morresse a cada arquivo, o trabalho seria reescolher a pessoa
  // toda vez. Só os rascunhos do formulário se perdem na troca (a `key`).
  const [alvo, setAlvo] = useState('');
  // A LEVA: um documento não corresponde a uma ficha — um contrato social
  // qualifica a empresa e três sócios, uma pessoa precisa de vários documentos.
  // Então o consultor abre um arquivo, preenche a ficha e vai marcando no balde
  // tudo que é daquela entidade; o botão grava o cadastro e todos os vínculos
  // numa tacada só. Abrir é ler, marcar é dizer "é dela".
  const [recrutados, setRecrutados] = useState<string[]>([]);
  // Qual foi a última marcação de "é do cliente", só para o desfazer. A marca em
  // si é gravada; o que é de sessão é apenas "qual foi a última", e por isso o
  // desfazer some ao recarregar a página, o que está certo.
  const [ultimoTriado, setUltimoTriado] = useState<string | null>(null);
  // Enquanto o consultor não marcar nada à mão, a leva é só o arquivo aberto e
  // acompanha a navegação (é o caso um-arquivo-um-cadastro, que não pode custar
  // um clique a mais). Ao primeiro clique numa caixa, a leva passa a ser dele:
  // aí abrir outro arquivo é ler, não muda o que vai ser gravado.
  const [levaExplicita, setLevaExplicita] = useState(false);
  // A leva esperando classificação: enquanto não for null, o modal está aberto
  // e nada foi gravado.
  const [pendente, setPendente] = useState<Pendente | null>(null);

  // Cadastrou: o próximo arquivo abre já em Vincular, com o cadastro recém-criado
  // sugerido — é assim que se varre o balde recrutando o resto dos arquivos dele.
  const registrarSugestao = (nova: { valor: string; label: string }) => {
    setSugestao(nova);
    setModo('existente');
    setAlvo(nova.valor);
  };

  const alternarRecrutado = (id: string) => {
    setLevaExplicita(true);
    setRecrutados((atual) => (atual.includes(id) ? atual.filter((item) => item !== id) : [...atual, id]));
  };

  const { data: pessoas = [] } = usePessoasByCliente(clienteId || null);
  const { data: bens = [] } = useBensByCliente(clienteId || null);
  const { data: todasMatriculas = [] } = useAllMatriculas();

  const upsertPessoa = useUpsertPessoa();
  const upsertParentesco = useUpsertParentesco();
  const upsertBem = useUpsertBem();
  const upsertMatricula = useUpsertMatricula();
  const atualizar = useAtualizarDocumento(clienteId);
  const baixar = useBaixarDocumento();
  const { mutate: pedirUrl, isPending: carregandoUrl } = usePreviewUrl();

  const gavetas = useMemo(() => contarPorGaveta(docs), [docs]);
  const lista = useMemo(() => filtrarBalde(docs, { gaveta, busca }), [docs, gaveta, busca]);
  const totalSemDono = gavetas[0]?.total ?? 0;
  const aberto = lista.find((doc) => doc.id === abertoId) ?? null;

  // Matrículas deste cliente (o hook é global) e os imóveis, que são os bens que
  // podem receber matrícula.
  const matriculasCliente = useMemo(
    () => todasMatriculas.filter(
      (item) => item.bem_cliente_id === clienteId || item.titular_cliente_ids.includes(clienteId),
    ),
    [todasMatriculas, clienteId],
  );
  const imoveis = useMemo(() => bens.filter((bem) => bem.tipo_bem === 'IR' || bem.tipo_bem === 'IB'), [bens]);

  const opcoes = useMemo(
    () => ({
      pessoas: pessoas
        .map((pessoa) => ({ id: pessoa.id, label: pessoa.denominacao ?? 'Pessoa', tipo: pessoa.tipo_pessoa }))
        .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
      bens: bens.map((bem) => ({ id: bem.id, label: bemLabel(bem) })),
      matriculas: matriculasCliente.map((item) => ({
        id: item.id, label: `Matrícula ${item.numero}`, numero: item.numero,
      })),
    }),
    [pessoas, bens, matriculasCliente],
  );

  // Mantém sempre um arquivo aberto enquanto houver balde.
  useEffect(() => {
    if (!abertoId && lista.length > 0) setAbertoId(lista[0].id);
    if (abertoId && lista.length === 0) setAbertoId(null);
  }, [abertoId, lista]);

  // Leva implícita: espelha o arquivo aberto. Some assim que o consultor marca
  // algo à mão (levaExplicita), e volta a valer depois de gravar ou limpar.
  useEffect(() => {
    if (levaExplicita) return;
    setRecrutados(abertoId ? [abertoId] : []);
  }, [abertoId, levaExplicita]);

  // Arquivo que saiu do balde (vinculado por outra via, ou marcado como do
  // cliente) não pode continuar na leva.
  useEffect(() => {
    if (!levaExplicita) return;
    setRecrutados((atual) => {
      const vivos = atual.filter((id) => lista.some((doc) => doc.id === id));
      return vivos.length === atual.length ? atual : vivos;
    });
  }, [lista, levaExplicita]);

  // Mesmo mecanismo de URL assinada do preview do hub (sign-download no backend).
  useEffect(() => {
    setUrl(null);
    setErroPreview(null);
    if (!aberto || !isPreviavel(aberto.nome_original, aberto.mime)) return;
    pedirUrl(aberto, {
      onSuccess: (assinada) => setUrl(assinada),
      onError: () => setErroPreview('Não foi possível abrir este documento.'),
    });
    // `aberto` inteiro mudaria de identidade a cada refetch da lista; o id é o que importa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto?.id, pedirUrl]);

  const salvando = atualizar.isPending || upsertPessoa.isPending || upsertBem.isPending
    || upsertMatricula.isPending || upsertParentesco.isPending;

  /** Os arquivos da leva, na ordem do balde. Vazia, é o arquivo aberto. */
  const daLeva = () => {
    const marcados = lista.filter((doc) => recrutados.includes(doc.id));
    return marcados.length > 0 ? marcados : aberto ? [aberto] : [];
  };

  /**
   * Recusa a leva inteira quando um arquivo dela não pode ir para o alvo
   * (georreferência fora de matrícula é a exceção conhecida). Gravar metade
   * seria pior. Devolve true quando barrou.
   */
  const barrado = (docsDaLeva: DocumentoArquivoRow[], alvo: Alvo): boolean => {
    if (docsDaLeva.length === 0) {
      toast.error('Marque no balde ao menos um arquivo desta entidade.');
      return true;
    }
    const impedido = docsDaLeva.find((doc) => impedimentoDeVinculo(doc, alvo));
    if (!impedido) return false;
    toast.error(`${impedido.nome_original}: ${impedimentoDeVinculo(impedido, alvo)}`);
    return true;
  };

  /**
   * Grava o vínculo 1:1 de TODA a leva no mesmo alvo e devolve o consultor ao
   * balde, já no próximo arquivo que sobrou.
   *
   * `tipos` é a classificação por arquivo escolhida no modal — o dono é um só
   * para a leva, o tipo é de cada um. Arquivo que ficou sem tipo não entra no
   * mapa, e aí `patchVinculo` nem manda a coluna.
   */
  const vincularLeva = (
    docsDaLeva: DocumentoArquivoRow[],
    alvo: Alvo,
    tipos: Record<string, string> = {},
    aoConcluir?: () => void,
  ) => {
    if (barrado(docsDaLeva, alvo)) return;
    const ids = docsDaLeva.map((doc) => doc.id);
    const proximo = proximoDoBalde(lista, ids);
    let restantes = ids.length;
    ids.forEach((id) =>
      atualizar.mutate(
        { id, patch: patchVinculo(alvo, tipos[id]), origem: ORIGEM_LOG },
        {
          onSuccess: () => {
            restantes -= 1;
            if (restantes > 0) return;
            setPendente(null);
            setLevaExplicita(false);
            setAbertoId(proximo?.id ?? null);
            setFichaToken((token) => token + 1);
            aoConcluir?.();
          },
        },
      ),
    );
  };

  /** Nome de quem vai receber a leva, para o cabeçalho do modal. */
  const rotuloDoAlvo = (alvo: Alvo): string => {
    if (alvo.kind === 'cliente') return 'o cliente';
    const lista = alvo.kind === 'pessoa' ? opcoes.pessoas
      : alvo.kind === 'bem' ? opcoes.bens
        : opcoes.matriculas;
    return lista.find((item) => item.id === alvo.id)?.label ?? 'a entidade escolhida';
  };

  const rotuloDoNovo = (novo: NovoCadastro): string => {
    if (novo.tipo === 'pessoa') return novo.values.denominacao ?? 'o novo cadastro';
    if (novo.tipo === 'bem') return bemLabel(novo.values);
    return `Matrícula ${novo.values.numero}`;
  };

  /**
   * O clique no botão da ficha não grava mais direto: abre o modal para dizer
   * que documento é cada arquivo da leva. A validação de impedimento continua
   * ANTES do modal, para o consultor não escolher tipos de uma leva que vai ser
   * recusada no fim.
   */
  const pedirClassificacao = (pedido: PedidoDeVinculo) => {
    const leva = daLeva();
    const alvo: Alvo = pedido.acao === 'vincular'
      ? pedido.alvo
      // No cadastro a entidade ainda não existe; para a checagem de impedimento
      // só a espécie importa, e um id de mentira basta.
      : ({ kind: pedido.novo.tipo === 'pessoa' ? 'pessoa' : pedido.novo.tipo, id: 'novo' } as Alvo);
    if (barrado(leva, alvo)) return;
    setPendente({
      ...pedido,
      leva,
      destinoLabel: pedido.acao === 'vincular' ? rotuloDoAlvo(pedido.alvo) : rotuloDoNovo(pedido.novo),
      rotulo: pedido.acao === 'vincular'
        ? `Vincular ${leva.length} ${leva.length === 1 ? 'arquivo' : 'arquivos'}`
        : `Cadastrar e vincular ${leva.length} ${leva.length === 1 ? 'arquivo' : 'arquivos'}`,
    } as Pendente);
  };

  const confirmarClassificacao = (tipos: Record<string, string>) => {
    if (!pendente) return;
    if (pendente.acao === 'vincular') {
      vincularLeva(pendente.leva, pendente.alvo, tipos);
      return;
    }
    cadastrar(pendente.novo, pendente.leva, tipos);
  };

  /** Cria a entidade e, no sucesso, vincula a leva inteira a ela. */
  const cadastrar = (novo: NovoCadastro, leva: DocumentoArquivoRow[], tipos: Record<string, string>) => {
    if (novo.tipo === 'pessoa') {
      upsertPessoa.mutate(
        { values: novo.values },
        {
          onSuccess: async ({ row }) => {
            if (row.tipo_pessoa === 'PF' && novo.parentesco.parenteId) {
              await upsertParentesco.mutateAsync({
                values: {
                  pessoa_id: row.id,
                  parente_pessoa_id: novo.parentesco.parenteId,
                  tipo: novo.parentesco.tipo || null,
                  natureza: novo.parentesco.natureza || null,
                },
                original: null,
                clienteId,
              });
            }
            registrarSugestao({ valor: `pessoa:${row.id}`, label: row.denominacao ?? 'Pessoa' });
            vincularLeva(leva, { kind: 'pessoa', id: row.id }, tipos);
          },
        },
      );
      return;
    }

    if (novo.tipo === 'bem') {
      upsertBem.mutate(
        { values: novo.values, titular: novo.titular },
        {
          onSuccess: ({ row }) => {
            registrarSugestao({ valor: `bem:${row.id}`, label: bemLabel(row) });
            vincularLeva(leva, { kind: 'bem', id: row.id }, tipos);
          },
        },
      );
      return;
    }

    upsertMatricula.mutate(
      { values: novo.values, titular: novo.titular },
      {
        onSuccess: ({ row }) => {
          registrarSugestao({ valor: `matricula:${row.id}`, label: `Matrícula ${row.numero}` });
          vincularLeva(leva, { kind: 'matricula', id: row.id }, tipos);
        },
      },
    );
  };

  /**
   * Válvula §5.4: o arquivo passa a ser documento do cliente como um todo.
   *
   * Reusa o mesmo caminho do vínculo, que já recusa o que não pode (documento de
   * georreferenciamento, por exemplo), já pula para o próximo do balde e já
   * invalida a lista. A diferença é só o alvo.
   */
  const naoEDeNinguem = () => {
    if (!aberto) return;
    const id = aberto.id;
    // Sem modal de classificação: a válvula é um clique só, e um passo a
    // mais nela encareceria justamente a saída rápida para o que não interessa.
    vincularLeva([aberto], { kind: 'cliente' }, {}, () => {
      setUltimoTriado(id);
      toast.success('Marcado como documento do cliente', {
        description: 'Saiu do balde. Continua visível no modo Organizar.',
      });
    });
  };

  /** Desfaz a ÚLTIMA marcação: o arquivo volta ao balde. */
  const desfazerTriagem = () => {
    if (!ultimoTriado) return;
    atualizar.mutate(
      { id: ultimoTriado, patch: patchDesfazerTriagem(), origem: `${ORIGEM_LOG} (desfazer)` },
      { onSuccess: () => setUltimoTriado(null) },
    );
  };

  return (
    <div className="flex min-h-0 flex-1 gap-3 p-3">
      <BaldePanel
        arquivos={lista}
        gavetas={gavetas}
        gaveta={gaveta}
        onGaveta={setGaveta}
        busca={busca}
        onBusca={setBusca}
        abertoId={aberto?.id ?? null}
        onAbrir={(doc) => setAbertoId(doc.id)}
        recrutados={recrutados}
        onRecrutar={alternarRecrutado}
        onLimparRecrutados={() => setLevaExplicita(false)}
        semDonoTotal={totalSemDono}
        carregando={carregando}
        onNaoEDeNinguem={naoEDeNinguem}
        podeDesfazer={!!ultimoTriado}
        onDesfazer={desfazerTriagem}
      />

      <DocumentoVisualizador
        doc={aberto}
        url={url}
        carregando={carregandoUrl}
        erro={erroPreview}
        onRecarregar={() => {
          if (!aberto) return;
          setErroPreview(null);
          pedirUrl(aberto, {
            onSuccess: (assinada) => setUrl(assinada),
            onError: () => setErroPreview('Não foi possível abrir este documento.'),
          });
        }}
        onBaixar={() => aberto && baixar.mutate(aberto)}
      />

      {/* A `key` NÃO inclui o arquivo aberto: preencher a ficha e sair andando
          pelo balde para achar o resto dos arquivos da entidade é o fluxo — o
          rascunho só zera quando a leva é gravada ou o consultor manda limpar. */}
      <FichaColuna
        key={fichaToken}
        doc={aberto}
        naLeva={daLeva().length}
        clienteId={clienteId}
        pessoasCliente={pessoas}
        imoveis={imoveis}
        opcoes={opcoes}
        salvando={salvando}
        sugestao={sugestao}
        modo={modo}
        onModo={setModo}
        alvo={alvo}
        onAlvo={setAlvo}
        onCadastrar={(novo) => pedirClassificacao({ acao: 'cadastrar', novo, destino: destinoDoNovo(novo) })}
        onVincular={(valor) => {
          const escolhido = alvoDeValor(valor);
          pedirClassificacao({
            acao: 'vincular',
            alvo: escolhido,
            destino: destinoDoAlvo(escolhido, opcoes.pessoas),
          });
        }}
        onLimpar={() => setFichaToken((token) => token + 1)}
      />

      {/* Última parada antes de gravar: que documento é cada arquivo da leva. */}
      {pendente && (
        <ClassificarLevaDialog
          aberto
          clienteId={clienteId}
          arquivos={pendente.leva}
          destino={pendente.destino}
          destinoLabel={pendente.destinoLabel}
          rotuloConfirmar={pendente.rotulo}
          salvando={salvando}
          onCancelar={() => setPendente(null)}
          onConfirmar={confirmarClassificacao}
        />
      )}
    </div>
  );
}
