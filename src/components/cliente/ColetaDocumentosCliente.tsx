import { useMemo, useState } from 'react';
import { Download, FileText, Hand, Send, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from '@/hooks/use-toast';
import { useClienteAtual } from '@/hooks/useClienteAtual';
import {
  useBaixarDocumento,
  useDocumentosByCliente,
  useSolicitacaoAtivaCliente,
  useSoftDeleteDocumentoCliente,
  useUploadDocumentoCliente,
  useUploaderNames,
  type DocumentoArquivoRow,
} from '@/hooks/useDocumentoArquivo';
import { MAX_BYTES, extensaoValida, formatBytes } from '@/components/equipe/osg/documentos/docMeta';
import { CardGrupoColeta } from '@/components/cliente/CardGrupoColeta';
import { montarGruposColeta, type GrupoColeta } from '@/lib/coletaDocumentosCliente';
import type { GrupoDocumentoKey } from '@/lib/agrupadorDocumentos';

/**
 * Coleta de documentos do cliente em 4 grupos grandes (Pessoas Físicas,
 * Jurídicas, Bens e Imóveis, Outros), cada um com drag and drop próprio.
 *
 * A ideia é o cliente não precisar separar por pessoa nem renomear arquivo: joga
 * no grupo e a PSA classifica depois. A relação de documentos de cada grupo vem
 * da solicitação ENVIADA, pela coluna `grupo` de cada item, e cada documento
 * aparece com a instrução que a PSA escreveu.
 *
 * Fora do pedido ENVIADO a tela fica em leitura: os arquivos continuam todos
 * listados, e envio e exclusão desligam.
 */
export function ColetaDocumentosCliente() {
  const { data: clienteId, isLoading: carregandoCliente } = useClienteAtual();
  const { data: docs = [], isLoading: carregandoDocs } = useDocumentosByCliente(clienteId ?? null);
  const { data: pedido } = useSolicitacaoAtivaCliente(clienteId ?? null);
  const upload = useUploadDocumentoCliente();
  const baixar = useBaixarDocumento();
  const excluir = useSoftDeleteDocumentoCliente(clienteId ?? '');
  const [grupoEnviando, setGrupoEnviando] = useState<GrupoDocumentoKey | null>(null);
  const [aExcluir, setAExcluir] = useState<DocumentoArquivoRow | null>(null);

  /**
   * Só o pedido ENVIADO libera o envio; todo o resto tranca.
   *
   * O padrão é FECHADO, e isso é a correção do B3 da ALE-31. Antes a tela
   * trancava comparando com 'encerrada', e a RPC só devolvia a solicitação
   * quando o status era 'enviada' — então 'encerrada' nunca chegava e a condição
   * era impossível de satisfazer. Resultado: rascunho e encerrada deixavam o
   * cliente enviar e excluir.
   *
   * Invertido, uma falha futura na leitura erra para o lado seguro: sem status
   * reconhecido, não envia.
   */
  const status = pedido?.solicitacao?.status ?? null;
  const somenteLeitura = status !== 'enviada';

  /** O aviso do topo explica POR QUE está trancado — são três motivos distintos. */
  const aviso = status === 'enviada'
    ? `Envie os documentos que você tiver, na ordem que preferir. Não precisa separar por
       pessoa nem renomear arquivos, a PSA organiza depois. Pode enviar vários de uma vez e
       voltar quando quiser.`
    : status === 'encerrada'
      ? `Este pedido foi encerrado. Os documentos que você enviou continuam aqui, disponíveis
         para consulta e download. Se precisar enviar algo novo, fale com a PSA.`
      : `A PSA ainda não enviou um pedido de documentos. Quando enviar, a relação aparece aqui
         e o envio é liberado.`;

  /** A mesma razão, curta, para caber na gaveta trancada. */
  const motivoBloqueio = status === 'encerrada'
    ? 'Este pedido foi encerrado'
    : 'Nenhum pedido de documentos aberto';

  const grupos = useMemo(() => montarGruposColeta(pedido?.itens ?? [], docs), [pedido, docs]);
  // "Enviados": tudo que o cliente mandou e a PSA ainda não classificou, na ordem
  // de chegada (docs já vem por created_at desc).
  const enviados = useMemo(
    () => docs.filter((d) => d.fonte === 'cliente' && d.checklist_item_id == null),
    [docs],
  );
  const uploaderIds = useMemo(
    () => enviados.map((d) => d.created_by).filter((v): v is string => !!v),
    [enviados],
  );
  const { data: uploaderNames = {} } = useUploaderNames(uploaderIds);

  const enviar = async (grupo: GrupoColeta, lista: File[]) => {
    if (!clienteId || lista.length === 0) return;
    const validos: File[] = [];
    let rejeitados = 0;
    for (const f of lista) {
      if (!extensaoValida(f.name) || f.size > MAX_BYTES) {
        rejeitados++;
        continue;
      }
      validos.push(f);
    }
    if (rejeitados) {
      toast({
        title: `${rejeitados} arquivo(s) ignorado(s)`,
        description: `Fora do tipo permitido ou acima de ${formatBytes(MAX_BYTES)}.`,
        variant: 'destructive',
      });
    }
    if (validos.length === 0) return;
    setGrupoEnviando(grupo.key);
    try {
      for (const file of validos) {
        try {
          await upload.mutateAsync({
            clienteId,
            file,
            categoria: grupo.categoria,
            // Só chega aqui com o pedido enviado, então a solicitação existe.
            solicitacaoId: pedido?.solicitacao?.id ?? null,
          });
        } catch {
          // toast já emitido pelo onError do hook
        }
      }
    } finally {
      setGrupoEnviando(null);
    }
  };

  if (carregandoCliente) {
    return (
      <Card className="p-6">
        <Skeleton className="mb-3 h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </Card>
    );
  }

  if (!clienteId) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-teal-700">
          Documentos solicitados
        </p>
        <h2 className="text-2xl font-bold text-foreground">A PSA solicitou estes documentos</h2>
        <div className="mt-3 h-[3px] w-6 rounded-full bg-teal-600" />
      </div>

      {/*
        Quando o pedido foi enviado, o cliente precisa saber DESDE QUANDO: é o que
        dá referência para "faz uma semana que me pediram". O dado vem da própria
        função que alimenta a tela, sem consulta extra, e o formato é o mesmo já
        usado na lista de enviados, abaixo.
      */}
      {pedido?.solicitacao?.enviada_em && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Send className="h-4 w-4 shrink-0 text-teal-700" />
          <span>
            Pedido enviado em{' '}
            <span className="font-medium text-foreground">
              {format(new Date(pedido.solicitacao.enviada_em), "dd/MM/yyyy 'às' HH:mm", {
                locale: ptBR,
              })}
            </span>
          </span>
        </div>
      )}

      <Card className="flex gap-4 border-l-4 border-l-teal-600 p-6">
        <Hand className="h-7 w-7 shrink-0 text-teal-700" />
        <p className="text-sm leading-relaxed text-muted-foreground">
          {aviso}
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {grupos.map((grupo) => (
          <CardGrupoColeta
            key={grupo.key}
            grupo={grupo}
            enviando={grupoEnviando === grupo.key}
            somenteLeitura={somenteLeitura}
            motivoBloqueio={motivoBloqueio}
            onArquivos={(files) => void enviar(grupo, files)}
            onRemover={setAExcluir}
          />
        ))}
      </div>

      <div>
        <h2 className="text-xl font-bold text-foreground">Enviados</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A PSA está organizando estes arquivos. Em breve eles vão aparecer separados por pessoa e
          imóvel.
        </p>
        {carregandoDocs ? (
          <Card className="mt-4">
            <div className="space-y-4 p-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </Card>
        ) : enviados.length === 0 ? (
          <p className="py-4 text-sm italic text-muted-foreground">
            Nenhum documento enviado ainda.
          </p>
        ) : (
          <Card className="mt-4">
            <ul className="divide-y">
              {enviados.map((d) => {
                const uploader = d.created_by ? uploaderNames[d.created_by] : null;
                return (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                    <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{d.nome_original}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(d.tamanho)} ·{' '}
                        {format(new Date(d.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        {' · '}enviado por {uploader ?? '—'}
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => baixar.mutate(d)} title="Baixar">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setAExcluir(d)} title="Remover">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      <AlertDialog open={!!aExcluir} onOpenChange={(o) => !o && setAExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{aExcluir?.nome_original}" deixará de aparecer na lista. O arquivo permanece
              arquivado no storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (aExcluir) excluir.mutate(aExcluir.id);
                setAExcluir(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default ColetaDocumentosCliente;
