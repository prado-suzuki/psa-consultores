import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Eye, EyeOff, Loader2, RefreshCw, Tags } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
// Modais OSG importam daqui, e não de ui/dialog: o DialogContent desta fachada
// é a variante com a animação de abertura da área.
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { fileIconOf, formatBytes, isImagem, isPreviavel } from '@/components/equipe/osg/documentos/docMeta';
import { useChecklistPadrao, useTiposAvulsosDoCliente } from '@/hooks/useOsgChecklist';
import { useDomainSolicitacao } from '@/hooks/useDomainSolicitacao';
import { usePreviewUrl } from '@/hooks/useDocumentoArquivo';
import {
  tiposParaDestino, tiposPedidos, tiposPedidosDetalhados, tiposPendentesParaAlvo, type DestinoFicha,
} from '@/lib/classificarTipo';
import type { Alvo } from '@/lib/classificarFicha';
import { cn } from '@/lib/utils';
import type { DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';

/** Valor do select quando o consultor não quer classificar aquele arquivo. */
const SEM_TIPO = 'sem-tipo';

interface Props {
  aberto: boolean;
  clienteId: string;
  /** A leva inteira, na ordem do balde. Um arquivo, uma linha, um tipo. */
  arquivos: DocumentoArquivoRow[];
  documentosCliente: DocumentoArquivoRow[];
  alvo: Alvo | null;
  naoAplicaveisIniciais: string[];
  /** Para onde a leva vai — recorta o catálogo de tipos. */
  destino: DestinoFicha;
  /** Nome de quem vai receber os arquivos, só para o cabeçalho. */
  destinoLabel: string;
  /** Rótulo da confirmação, herdado da ficha ("Cadastrar e vincular 3 arquivos"). */
  rotuloConfirmar: string;
  salvando: boolean;
  onCancelar: () => void;
  /** Mapa arquivo → tipo escolhido. Arquivo não classificado não entra no mapa. */
  onConfirmar: (tipos: Record<string, string>, naoAplicaveis: string[]) => void;
}

/**
 * Última parada antes de gravar: que documento é cada arquivo da leva.
 *
 * Fica aqui, e não numa coluna do balde, porque dono e tipo têm cardinalidades
 * diferentes. O dono é UM para a leva inteira (é isso que a leva significa); o
 * tipo é de cada arquivo, já que a leva de uma pessoa é justamente o CPF, o RG
 * e o comprovante de endereço dela. Um select por linha, no momento em que o
 * consultor já decidiu tudo o mais, é onde essa diferença cabe sem virar passo.
 *
 * Classificar é OPCIONAL: dá para confirmar com tudo em branco e o vínculo
 * acontece igual (decisão de 07/08/2026).
 */
export function ClassificarLevaDialog({
  aberto, clienteId, arquivos, documentosCliente, alvo, naoAplicaveisIniciais,
  destino, destinoLabel, rotuloConfirmar, salvando,
  onCancelar, onConfirmar,
}: Props) {
  const [escolhas, setEscolhas] = useState<Record<string, string>>({});
  const [naoAplicaveis, setNaoAplicaveis] = useState<Set<string>>(new Set(naoAplicaveisIniciais));
  // Saída para quando o documento na mão não está no recorte do destino (um
  // CCIR indo para o bem, por exemplo). O recorte é conveniência, não regra.
  const [verTodos, setVerTodos] = useState(false);
  // Qual arquivo está com o preview aberto. UM de cada vez, não vários: o modal
  // não pode crescer sem limite, e N iframes abertos puxariam N arquivos.
  const [olhando, setOlhando] = useState<string | null>(null);
  // URLs assinadas já resolvidas, por arquivo. Reabrir o mesmo preview não pede
  // assinatura nova, e fechar não descarta o que já foi buscado.
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [errosUrl, setErrosUrl] = useState<Record<string, string>>({});
  const naoAplicaveisIniciaisKey = [...naoAplicaveisIniciais].sort().join('|');

  const { data: catalogo = [], isLoading } = useChecklistPadrao();
  const { solicitacao } = useDomainSolicitacao(clienteId);
  const { data: avulsoPorItem = {} } = useTiposAvulsosDoCliente(clienteId);
  const { mutate: pedirUrl } = usePreviewUrl();

  useEffect(() => {
    setNaoAplicaveis(new Set(naoAplicaveisIniciaisKey ? naoAplicaveisIniciaisKey.split('|') : []));
  }, [naoAplicaveisIniciaisKey]);

  /**
   * A lista de tipos, em três fontes possíveis.
   *
   * A primeira é a certa: o que a SOLICITAÇÃO pediu para uma entidade deste
   * grão. É menor que o catálogo, é o que foi de fato pedido àquele cliente, e é
   * o único caminho pelo qual um documento avulso aparece.
   *
   * O catálogo entra como rede: cliente sem solicitação, ou solicitação sem item
   * daquele grão, não pode virar lista vazia. E entra de novo no "ver todos",
   * que é a saída para o documento que não estava no pedido.
   */
  const { tipos, fonte } = useMemo(() => {
    if (!verTodos) {
      const pedidos = tiposPedidos(solicitacao?.itens ?? [], avulsoPorItem, destino);
      if (pedidos.length > 0) return { tipos: pedidos, fonte: 'solicitacao' as const };
    }
    const { tipos: doCatalogo } = tiposParaDestino(catalogo, destino, verTodos);
    return { tipos: doCatalogo, fonte: verTodos ? ('todos' as const) : ('catalogo' as const) };
  }, [verTodos, solicitacao, avulsoPorItem, destino, catalogo]);

  const pedidosDetalhados = useMemo(
    () => tiposPedidosDetalhados(solicitacao?.itens ?? [], avulsoPorItem, destino),
    [solicitacao, avulsoPorItem, destino],
  );
  const pendentes = useMemo(
    () => tiposPendentesParaAlvo(pedidosDetalhados, documentosCliente, alvo, naoAplicaveis),
    [pedidosDetalhados, documentosCliente, alvo, naoAplicaveis],
  );
  const escolhidos = new Set(Object.values(escolhas));
  const paraDecidir = pendentes.filter(
    (item) => naoAplicaveis.has(item.solicitacaoItemId) || !escolhidos.has(item.id),
  );

  const classificados = arquivos.filter((doc) => escolhas[doc.id]).length;

  /**
   * Busca a URL assinada só quando o consultor pede para olhar. Preview é para o
   * caso de o nome do arquivo não bastar, não para a leva inteira: assinar N
   * downloads na abertura do modal seria N chamadas ao broker para nada.
   */
  const assinar = (doc: DocumentoArquivoRow) => {
    if (urls[doc.id]) return;
    setErrosUrl((atual) => ({ ...atual, [doc.id]: '' }));
    pedirUrl(doc, {
      onSuccess: (assinada) => setUrls((atual) => ({ ...atual, [doc.id]: assinada })),
      onError: () =>
        setErrosUrl((atual) => ({ ...atual, [doc.id]: 'Não foi possível abrir este documento.' })),
    });
  };

  const alternarOlhar = (doc: DocumentoArquivoRow) => {
    if (olhando === doc.id) {
      setOlhando(null);
      return;
    }
    setOlhando(doc.id);
    assinar(doc);
  };

  /**
   * O preview de um arquivo, do tamanho de uma olhada.
   *
   * Repete a escolha imagem/iframe do `DocumentoVisualizador` da coluna central,
   * e é de propósito: lá o preview tem cromo próprio (expandir para tela cheia,
   * rótulo de categoria, baixar) porque é onde se LÊ o documento; aqui é uma
   * conferência rápida dentro de uma linha de lista. Unificar os dois exigiria
   * um componente que serve mal aos dois usos.
   */
  const previewDe = (doc: DocumentoArquivoRow) => {
    const erro = errosUrl[doc.id];
    const url = urls[doc.id];
    if (erro) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <p className="text-[12px] text-foreground">{erro}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => assinar(doc)} className="gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" aria-hidden /> Tentar de novo
          </Button>
        </div>
      );
    }
    if (!url) {
      return (
        <span className="flex h-full items-center justify-center gap-2 text-[12px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-osg-moss" aria-hidden />
          Abrindo o documento…
        </span>
      );
    }
    return isImagem(doc.nome_original, doc.mime) ? (
      <img src={url} alt={doc.nome_original} className="mx-auto max-h-full max-w-full object-contain" />
    ) : (
      <iframe src={url} title={doc.nome_original} className="h-full w-full rounded-md bg-white" />
    );
  };

  const confirmar = () => {
    // Só o que foi escolhido de verdade vai para o patch: chave ausente = a
    // coluna nem entra no update.
    const tipos = Object.fromEntries(
      arquivos
        .map((doc) => [doc.id, escolhas[doc.id]] as const)
        .filter(([, tipo]) => Boolean(tipo)),
    );
    onConfirmar(tipos, [...naoAplicaveis]);
  };

  const marcarNaoAplicavel = (itemId: string, tipoId: string, marcado: boolean) => {
    setNaoAplicaveis((atual) => {
      const proximo = new Set(atual);
      if (marcado) proximo.add(itemId);
      else proximo.delete(itemId);
      return proximo;
    });
    if (marcado) {
      setEscolhas((atual) => Object.fromEntries(
        Object.entries(atual).filter(([, escolha]) => escolha !== tipoId),
      ));
    }
  };

  const escolherTipo = (arquivoId: string, valor: string) => {
    setEscolhas((atual) => {
      const proximo = { ...atual };
      if (valor === SEM_TIPO) delete proximo[arquivoId];
      else proximo[arquivoId] = valor;
      return proximo;
    });
    const item = pedidosDetalhados.find((pedido) => pedido.id === valor);
    if (!item) return;
    setNaoAplicaveis((atual) => {
      const proximo = new Set(atual);
      proximo.delete(item.solicitacaoItemId);
      return proximo;
    });
  };

  return (
    <Dialog open={aberto} onOpenChange={(estado) => !estado && !salvando && onCancelar()}>
      <DialogContent className="max-w-3xl gap-0 p-0">
        <DialogHeader className="border-b border-osg-100 px-5 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-osg-700">
            <Tags className="h-4 w-4 shrink-0 text-osg-moss" aria-hidden />
            Que documento é cada arquivo?
          </DialogTitle>
          <DialogDescription className="text-[12.5px] leading-relaxed">
            {arquivos.length === 1 ? 'Este arquivo vai' : `Estes ${arquivos.length} arquivos vão`} para{' '}
            <span className="font-medium text-osg-700">{destinoLabel}</span>. Classificar é opcional: deixe em
            branco o que você não souber agora e confirme assim mesmo.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[64vh] min-h-0 overflow-y-auto px-5 py-4">
          {fonte === 'catalogo' && !isLoading && (
            <p className="mb-3 rounded-lg border border-dashed border-osg-300/70 bg-osg-50/60 px-3 py-2 text-[11.5px] leading-relaxed text-muted-foreground">
              A solicitação deste cliente não pediu nenhum documento deste tipo de ficha, então a
              lista abaixo vem do catálogo.
            </p>
          )}

          <ul className="space-y-2">
            {arquivos.map((doc) => {
              const { Icon, className } = fileIconOf(doc.nome_original, doc.mime);
              const escolhido = escolhas[doc.id] ?? '';
              const previavel = isPreviavel(doc.nome_original, doc.mime);
              const aberto = olhando === doc.id;
              return (
                <li
                  key={doc.id}
                  className={cn(
                    'overflow-hidden rounded-xl border transition-colors',
                    escolhido ? 'border-osg-moss/60 bg-osg-moss/[0.04]' : 'border-osg-200 bg-card',
                  )}
                >
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-osg-100">
                      <Icon className={cn('h-4 w-4', className)} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium leading-tight text-osg-700">
                        {doc.nome_original}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] text-muted-foreground">
                        {formatBytes(doc.tamanho)}
                      </span>
                    </span>
                    {/* Quando o nome não basta para lembrar que documento é aquele. */}
                    <button
                      type="button"
                      onClick={() => alternarOlhar(doc)}
                      disabled={!previavel}
                      aria-expanded={aberto}
                      aria-label={`${aberto ? 'Fechar' : 'Olhar'} ${doc.nome_original}`}
                      title={previavel
                        ? aberto ? 'Fechar a olhada' : 'Olhar o documento'
                        : 'Este formato não abre no navegador'}
                      className="shrink-0 rounded-md p-1.5 text-osg-600 transition-colors hover:bg-osg-50 hover:text-osg-700 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss"
                    >
                      {aberto
                        ? <EyeOff className="h-4 w-4" aria-hidden />
                        : <Eye className="h-4 w-4" aria-hidden />}
                    </button>
                    <span className="w-[250px] shrink-0">
                      <Label htmlFor={`tipo-${doc.id}`} className="sr-only">
                        Tipo de {doc.nome_original}
                      </Label>
                      <Select
                        value={escolhido || SEM_TIPO}
                        disabled={isLoading || salvando}
                        onValueChange={(valor) => escolherTipo(doc.id, valor)}
                      >
                        <SelectTrigger id={`tipo-${doc.id}`} className="h-8 text-[12px]">
                          <SelectValue placeholder={isLoading ? 'Carregando…' : 'Não classificar'} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[320px]">
                          <SelectItem value={SEM_TIPO} className="text-muted-foreground">
                            Não classificar
                          </SelectItem>
                          {tipos.map((tipo) => (
                            <SelectItem key={tipo.id} value={tipo.id}>
                              {tipo.rotulo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </span>
                  </div>

                  {/* Só o arquivo aberto monta o preview: um iframe de cada vez. */}
                  {aberto && (
                    <div className="h-[340px] border-t border-osg-100 bg-osg-50/60 p-2">
                      {previewDe(doc)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {paraDecidir.length > 0 && (
            <section className="mt-4 rounded-xl border border-osg-200 bg-osg-50/50 p-3" aria-labelledby="nao-aplicavel-titulo">
              <div className="mb-2">
                <h3 id="nao-aplicavel-titulo" className="text-[12.5px] font-semibold text-osg-700">
                  Documentos ainda sem resposta
                </h3>
                <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                  Marque “Não se aplica” somente no que esta entidade não precisa apresentar.
                </p>
              </div>
              <ul className="grid gap-1.5 sm:grid-cols-2">
                {paraDecidir.map((item) => (
                  <li key={item.solicitacaoItemId}>
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-osg-100 bg-white px-2.5 py-2 text-[11.5px] text-osg-700">
                      <Checkbox
                        checked={naoAplicaveis.has(item.solicitacaoItemId)}
                        disabled={salvando}
                        onCheckedChange={(estado) => marcarNaoAplicavel(item.solicitacaoItemId, item.id, estado === true)}
                      />
                      <span className="min-w-0 flex-1 truncate" title={item.rotulo}>{item.rotulo}</span>
                      <span className="shrink-0 text-[10.5px] text-muted-foreground">Não se aplica</span>
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {fonte !== 'catalogo' && !isLoading && (
            <button
              type="button"
              onClick={() => setVerTodos((atual) => !atual)}
              className="mt-3 rounded text-[11.5px] font-medium text-osg-moss underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss"
            >
              {verTodos
                ? 'Mostrar só o que foi pedido a este cliente'
                : 'Não achei o tipo: mostrar o catálogo inteiro'}
            </button>
          )}
        </div>

        <DialogFooter className="flex-row items-center gap-2 border-t border-osg-100 px-5 py-3">
          <p aria-live="polite" className="mr-auto text-[11.5px] text-muted-foreground">
            {classificados} de {arquivos.length} classificados
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onCancelar} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={confirmar}
            disabled={salvando}
            className="min-w-0 gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
          >
            {salvando && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" aria-hidden />}
            <span className="truncate">{rotuloConfirmar}</span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
