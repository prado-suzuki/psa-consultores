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
  alvoDeValor, impedimentoDeVinculo, patchVinculo, type Alvo, type NovoCadastro,
} from '@/lib/classificarFicha';

interface Props {
  clienteId: string;
  docs: DocumentoArquivoRow[];
  carregando: boolean;
  /** Ids marcados como "não é de ninguém" nesta sessão (a válvula do §5.4). */
  resolvidos: string[];
  onResolver: (id: string) => void;
  onDesfazerResolvidos: () => void;
}

const bemLabel = (bem: { referencia_dp: string | null; denominacao: string | null }) =>
  [bem.referencia_dp, bem.denominacao].filter(Boolean).join(' — ') || 'Bem';

/**
 * Modo Classificar do hub: balde à esquerda, documento no centro, ficha à
 * direita. O consultor abre um arquivo sem dono, lê, e cadastra a entidade a
 * partir dele — salvar cria o cadastro e vincula o arquivo aberto (1:1), o que
 * tira o arquivo do balde. Ver docs/planos/cadastro-vinculo-documentos.md.
 */
export function ClassificarDocumentos({
  clienteId, docs, carregando, resolvidos, onResolver, onDesfazerResolvidos,
}: Props) {
  const [gaveta, setGaveta] = useState<Gaveta>('todas');
  const [busca, setBusca] = useState('');
  const [abertoId, setAbertoId] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [erroPreview, setErroPreview] = useState<string | null>(null);
  const [fichaToken, setFichaToken] = useState(0);
  const [sugestao, setSugestao] = useState<{ valor: string; label: string } | null>(null);

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

  const gavetas = useMemo(() => contarPorGaveta(docs, resolvidos), [docs, resolvidos]);
  const lista = useMemo(() => filtrarBalde(docs, { gaveta, busca, resolvidos }), [docs, gaveta, busca, resolvidos]);
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

  /** Grava o vínculo 1:1 e devolve o consultor ao balde, já no próximo arquivo. */
  const vincular = (doc: DocumentoArquivoRow, alvo: Alvo) => {
    const impedimento = impedimentoDeVinculo(doc, alvo);
    if (impedimento) {
      toast.error(impedimento);
      return;
    }
    const proximo = proximoDoBalde(lista, doc.id);
    atualizar.mutate(
      { id: doc.id, patch: patchVinculo(alvo) },
      {
        onSuccess: () => {
          setAbertoId(proximo?.id ?? null);
          setFichaToken((token) => token + 1);
        },
      },
    );
  };

  const cadastrar = (novo: NovoCadastro) => {
    const doc = aberto;
    if (!doc) return;
    const kind = novo.tipo === 'pessoa' ? 'pessoa' : novo.tipo === 'bem' ? 'bem' : 'matricula';
    const impedimento = impedimentoDeVinculo(doc, { kind, id: 'novo' } as Alvo);
    if (impedimento) {
      toast.error(impedimento);
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
            setSugestao({ valor: `pessoa:${row.id}`, label: row.denominacao ?? 'Pessoa' });
            vincular(doc, { kind: 'pessoa', id: row.id });
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
            setSugestao({ valor: `bem:${row.id}`, label: bemLabel(row) });
            vincular(doc, { kind: 'bem', id: row.id });
          },
        },
      );
      return;
    }

    upsertMatricula.mutate(
      { values: novo.values, titular: novo.titular },
      {
        onSuccess: ({ row }) => {
          setSugestao({ valor: `matricula:${row.id}`, label: `Matrícula ${row.numero}` });
          vincular(doc, { kind: 'matricula', id: row.id });
        },
      },
    );
  };

  /** Válvula §5.4: o arquivo passa a ser documento do cliente como um todo. */
  const naoEDeNinguem = () => {
    if (!aberto) return;
    const proximo = proximoDoBalde(lista, aberto.id);
    onResolver(aberto.id);
    setAbertoId(proximo?.id ?? null);
    setFichaToken((token) => token + 1);
    toast.success('Marcado como documento do cliente', {
      description: 'Sai do balde nesta sessão. Ainda não há onde gravar essa marca — ver relatório.',
    });
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
        semDonoTotal={totalSemDono}
        carregando={carregando}
        onNaoEDeNinguem={naoEDeNinguem}
        marcadosNaSessao={resolvidos.length}
        onDesfazerMarcacoes={onDesfazerResolvidos}
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

      <FichaColuna
        key={`${aberto?.id ?? 'vazio'}-${fichaToken}`}
        doc={aberto}
        clienteId={clienteId}
        pessoasCliente={pessoas}
        imoveis={imoveis}
        opcoes={opcoes}
        salvando={salvando}
        sugestao={sugestao}
        onCadastrar={cadastrar}
        onVincular={(valor) => aberto && vincular(aberto, alvoDeValor(valor))}
        onLimpar={() => setFichaToken((token) => token + 1)}
      />
    </div>
  );
}
