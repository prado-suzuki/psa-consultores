import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { BaldePanel } from '@/components/equipe/osg/documentos/classificar/BaldePanel';
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

interface Props {
  clienteId: string;
  docs: DocumentoArquivoRow[];
  carregando: boolean;
}

const bemLabel = (bem: { referencia_dp: string | null; denominacao: string | null }) =>
  [bem.referencia_dp, bem.denominacao].filter(Boolean).join(' — ') || 'Bem';

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
   * Grava o vínculo 1:1 de TODA a leva no mesmo alvo e devolve o consultor ao
   * balde, já no próximo arquivo que sobrou. Um arquivo impedido (georreferência
   * fora de matrícula) barra a leva inteira: gravar metade seria pior.
   */
  const vincularLeva = (docsDaLeva: DocumentoArquivoRow[], alvo: Alvo, aoConcluir?: () => void) => {
    if (docsDaLeva.length === 0) {
      toast.error('Marque no balde ao menos um arquivo desta entidade.');
      return;
    }
    const impedido = docsDaLeva.find((doc) => impedimentoDeVinculo(doc, alvo));
    if (impedido) {
      toast.error(`${impedido.nome_original}: ${impedimentoDeVinculo(impedido, alvo)}`);
      return;
    }
    const ids = docsDaLeva.map((doc) => doc.id);
    const proximo = proximoDoBalde(lista, ids);
    const patch = patchVinculo(alvo);
    let restantes = ids.length;
    ids.forEach((id) =>
      atualizar.mutate(
        { id, patch },
        {
          onSuccess: () => {
            restantes -= 1;
            if (restantes > 0) return;
            setLevaExplicita(false);
            setAbertoId(proximo?.id ?? null);
            setFichaToken((token) => token + 1);
            aoConcluir?.();
          },
        },
      ),
    );
  };

  const cadastrar = (novo: NovoCadastro) => {
    const leva = daLeva();
    if (leva.length === 0) {
      toast.error('Marque no balde ao menos um arquivo desta entidade.');
      return;
    }
    const kind = novo.tipo === 'pessoa' ? 'pessoa' : novo.tipo === 'bem' ? 'bem' : 'matricula';
    const impedido = leva.find((item) => impedimentoDeVinculo(item, { kind, id: 'novo' } as Alvo));
    if (impedido) {
      toast.error(`${impedido.nome_original}: ${impedimentoDeVinculo(impedido, { kind, id: 'novo' } as Alvo)}`);
      return;
    }

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
            vincularLeva(leva, { kind: 'pessoa', id: row.id });
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
            vincularLeva(leva, { kind: 'bem', id: row.id });
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
          vincularLeva(leva, { kind: 'matricula', id: row.id });
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
    vincularLeva([aberto], { kind: 'cliente' }, () => {
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
      { id: ultimoTriado, patch: patchDesfazerTriagem() },
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
        onCadastrar={cadastrar}
        onVincular={(valor) => vincularLeva(daLeva(), alvoDeValor(valor))}
        onLimpar={() => setFichaToken((token) => token + 1)}
      />
    </div>
  );
}
