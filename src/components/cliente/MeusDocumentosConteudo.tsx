import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  AlertTriangle, Building2, Check, ChevronLeft, ChevronRight, Download, FileText,
  FolderKanban, FolderUp, Landmark, Loader2, Search, Trash2, Upload, User,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import { useClienteAtual } from '@/hooks/useClienteAtual';
import {
  useBaixarDocumento,
  useChecklistSolicitadoCliente,
  useDocumentosByCliente,
  useSoftDeleteDocumentoCliente,
  useUploadDocumentoCliente,
  useUploadDocumentoSolicitado,
  useUploaderNames,
  type ChecklistSolicitadoItem,
  type DocCategoria,
  type DocumentoArquivoRow,
} from '@/hooks/useDocumentoArquivo';
import { ACCEPT, MAX_BYTES, formatBytes } from '@/components/equipe/osg/documentos/docMeta';

const ACCEPT_EXTS = ACCEPT.split(',').map((s) => s.trim().toLowerCase());

function extensaoValida(nome: string): boolean {
  const ext = '.' + (nome.split('.').pop() ?? '').toLowerCase();
  return ACCEPT_EXTS.includes(ext);
}

// Ícone e rótulo de seção por tipo de entidade (com fallback para o próprio nome).
const ENTIDADE_ICON: Record<string, LucideIcon> = {
  'Pessoa Física': User,
  'Pessoa Jurídica': Building2,
  'Pessoa Jurídica (Cooperativa)': Building2,
  'Matrícula (Imóvel Rural)': Landmark,
  'Matrícula (Imóvel Urbano)': Landmark,
  Bem: FolderKanban,
};
const ENTIDADE_SECAO: Record<string, string> = {
  'Pessoa Física': 'Pessoas Físicas',
  'Pessoa Jurídica': 'Pessoas Jurídicas',
  'Pessoa Jurídica (Cooperativa)': 'Pessoas Jurídicas',
  'Matrícula (Imóvel Rural)': 'Imóveis Rurais',
  'Matrícula (Imóvel Urbano)': 'Imóveis Urbanos',
  Bem: 'Bens e Direitos',
};
// Ordem fixa das seções: Pessoa Física antes de Jurídica, depois imóveis e bens.
const ENTIDADE_ORDEM = [
  'Pessoa Física', 'Pessoa Jurídica', 'Pessoa Jurídica (Cooperativa)',
  'Matrícula (Imóvel Rural)', 'Matrícula (Imóvel Urbano)', 'Bem',
];
const ordemEntidade = (entidade: string) => {
  const i = ENTIDADE_ORDEM.indexOf(entidade);
  return i < 0 ? 99 : i;
};

interface CardEntidade {
  chave: string;
  nome: string;
  entidade: string;
  itens: ChecklistSolicitadoItem[];
  recebidos: number;
  total: number;
}
interface SecaoEntidade {
  entidade: string;
  cards: CardEntidade[];
}

/**
 * Monta as seções (por tipo de entidade, em ordem fixa) e, dentro, um card por
 * instância (pessoa/imóvel). Cards ordenados pelos menos preenchidos primeiro;
 * dentro do card, documentos pendentes antes dos recebidos. Itens sem instância
 * (nível cliente) formam um card "geral" da entidade.
 */
function montarSecoes(itens: ChecklistSolicitadoItem[]): SecaoEntidade[] {
  const porEntidade = new Map<string, Map<string, ChecklistSolicitadoItem[]>>();
  for (const it of itens) {
    const ent = it.entidade || 'Outros';
    const chaveCard = it.rotulo_instancia || `${ent}::geral`;
    let cards = porEntidade.get(ent);
    if (!cards) {
      cards = new Map();
      porEntidade.set(ent, cards);
    }
    const lista = cards.get(chaveCard);
    if (lista) lista.push(it);
    else cards.set(chaveCard, [it]);
  }
  return Array.from(porEntidade.entries())
    .map(([entidade, mCards]) => ({
      entidade,
      cards: Array.from(mCards.entries())
        .map(([chave, its]) => ({
          chave,
          nome: its[0]?.rotulo_instancia || entidade,
          entidade,
          recebidos: its.filter((i) => i.recebido).length,
          total: its.length,
          itens: [...its].sort((a, b) => {
            if (a.recebido !== b.recebido) return a.recebido ? 1 : -1;
            return a.documento.localeCompare(b.documento, 'pt-BR');
          }),
        }))
        .sort((a, b) => {
          const ra = a.total ? a.recebidos / a.total : 0;
          const rb = b.total ? b.recebidos / b.total : 0;
          if (ra !== rb) return ra - rb; // menos preenchidos primeiro
          return a.nome.localeCompare(b.nome, 'pt-BR');
        }),
    }))
    .sort((a, b) => ordemEntidade(a.entidade) - ordemEntidade(b.entidade) || a.entidade.localeCompare(b.entidade, 'pt-BR'));
}

/** Cartão de uma instância (pessoa/imóvel): nome, selo de status, progresso. */
function CardBotao({ card, onOpen }: { card: CardEntidade; onOpen: () => void }) {
  const Icon = ENTIDADE_ICON[card.entidade] ?? FileText;
  const pct = card.total ? Math.round((card.recebidos / card.total) * 100) : 0;
  const completo = card.recebidos === card.total;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full min-h-[168px] w-full flex-col rounded-xl border bg-card p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-teal-400/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
          <Icon className="h-4 w-4" />
        </span>
        {completo ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            <Check className="h-3 w-3" />
            Concluído
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
            <AlertTriangle className="h-3 w-3" />
            {card.total - card.recebidos} a enviar
          </span>
        )}
      </div>
      <h4 className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-foreground">{card.nome}</h4>
      <div className="mt-auto flex items-center gap-2 pt-4">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
          <div
            className={cn('h-full rounded-full transition-all', completo ? 'bg-emerald-500' : 'bg-teal-500')}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-bold tabular-nums text-foreground">
          {card.recebidos}/{card.total}
        </span>
      </div>
      <span className="mt-2 text-xs font-medium text-teal-700 group-hover:underline">
        Ver {card.total} documento{card.total === 1 ? '' : 's'}
      </span>
    </button>
  );
}

/**
 * Conteúdo da área "Meus Documentos" do cliente (documentos solicitados por
 * pessoa/imóvel + upload livre + enviados), sem cabeçalho/layout próprio.
 * Renderizado dentro da aba "Documentos" do painel do cliente (ClienteDashboard).
 */
export function MeusDocumentosConteudo() {
  const { data: clienteId, isLoading: carregandoCliente } = useClienteAtual();
  const { data: docs = [], isLoading: carregandoDocs } = useDocumentosByCliente(clienteId ?? null);
  const upload = useUploadDocumentoCliente();
  const baixar = useBaixarDocumento();
  const excluir = useSoftDeleteDocumentoCliente(clienteId ?? '');
  const uploadSolicitado = useUploadDocumentoSolicitado();
  const { data: checklist = [] } = useChecklistSolicitadoCliente(clienteId ?? null);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemInputRef = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [aExcluir, setAExcluir] = useState<DocumentoArquivoRow | null>(null);
  const [itemAlvo, setItemAlvo] = useState<ChecklistSolicitadoItem | null>(null);
  const [busca, setBusca] = useState('');
  const [cardAtivo, setCardAtivo] = useState<string | null>(null);
  const [secoesExpandidas, setSecoesExpandidas] = useState<Set<string>>(new Set());
  const [anexarOpen, setAnexarOpen] = useState(false);

  const enviarArquivos = async (lista: File[]) => {
    if (!clienteId) return;
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
        description: 'Fora do tipo permitido ou acima de 50 MB.',
        variant: 'destructive',
      });
    }
    for (const file of validos) {
      try {
        await upload.mutateAsync({ clienteId, file });
      } catch {
        // toast já emitido pelo onError do hook
      }
    }
  };

  const onInput = (e: ChangeEvent<HTMLInputElement>) => {
    void enviarArquivos(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setArrastando(false);
    if (!clienteId) return;
    void enviarArquivos(Array.from(e.dataTransfer.files ?? []));
  };

  const abrirSeletorItem = (item: ChecklistSolicitadoItem) => {
    setItemAlvo(item);
    itemInputRef.current?.click();
  };

  const onItemInput = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !clienteId || !itemAlvo) {
      setItemAlvo(null);
      return;
    }
    if (!extensaoValida(file.name) || file.size > MAX_BYTES) {
      toast({
        title: 'Arquivo ignorado',
        description: 'Fora do tipo permitido ou acima de 50 MB.',
        variant: 'destructive',
      });
      setItemAlvo(null);
      return;
    }
    try {
      await uploadSolicitado.mutateAsync({
        clienteId,
        itemId: itemAlvo.item_id,
        categoria: (itemAlvo.categoria as DocCategoria | null) ?? null,
        file,
      });
    } catch {
      // toast já emitido pelo onError do hook
    } finally {
      setItemAlvo(null);
    }
  };

  // Filtro defensivo: RLS já garante fonte='cliente', mas caches podem carregar registros
  // antigos ou de outras origens caso o mesmo hook seja usado em telas internas.
  // Também filtramos itens já classificados via checklist para não duplicar na lista "Outros".
  const docsCliente = docs.filter((d) => d.fonte === 'cliente' && d.checklist_item_id == null);

  const uploaderIds = useMemo(
    () => docs.map((d) => d.created_by).filter((v): v is string => !!v),
    [docs],
  );
  const { data: uploaderNames = {} } = useUploaderNames(uploaderIds);

  // Documento enviado por item do checklist, para exibir o relatório de envio
  // (arquivo, tamanho, data e quem enviou) nos itens recebidos. `docs` já vem
  // ativo e ordenado por created_at desc, então o primeiro por item é o mais recente.
  const docPorItem = useMemo(() => {
    const map = new Map<string, DocumentoArquivoRow>();
    for (const d of docs) {
      if (d.checklist_item_id && !map.has(d.checklist_item_id)) map.set(d.checklist_item_id, d);
    }
    return map;
  }, [docs]);

  const secoes = useMemo(() => montarSecoes(checklist), [checklist]);
  const termo = busca.trim().toLocaleLowerCase('pt-BR');
  const secoesFiltradas = useMemo(() => {
    if (!termo) return secoes;
    return secoes
      .map((sec) => ({
        ...sec,
        cards: sec.cards.filter((card) =>
          card.nome.toLocaleLowerCase('pt-BR').includes(termo) ||
          card.entidade.toLocaleLowerCase('pt-BR').includes(termo) ||
          card.itens.some((it) => it.documento.toLocaleLowerCase('pt-BR').includes(termo)),
        ),
      }))
      .filter((sec) => sec.cards.length > 0);
  }, [secoes, termo]);
  const cardAtivoData = useMemo(
    () => secoes.flatMap((sec) => sec.cards).find((card) => card.chave === cardAtivo) ?? null,
    [secoes, cardAtivo],
  );
  // Documentos do modal subdivididos por categoria (padrão do Explorador de arquivos).
  const gruposModal = useMemo(() => {
    if (!cardAtivoData) return [];
    const map = new Map<string, ChecklistSolicitadoItem[]>();
    for (const it of cardAtivoData.itens) {
      const cat = it.categoria_docbox || it.categoria || 'Outros';
      const l = map.get(cat);
      if (l) l.push(it);
      else map.set(cat, [it]);
    }
    return Array.from(map.entries())
      .map(([categoria, itens]) => ({ categoria, itens }))
      .sort((a, b) => a.categoria.localeCompare(b.categoria, 'pt-BR'));
  }, [cardAtivoData]);

  const totalChecklist = checklist.length;
  const totalRecebidos = useMemo(() => checklist.filter((i) => i.recebido).length, [checklist]);
  const pctReal = totalChecklist ? Math.round((totalRecebidos / totalChecklist) * 100) : 0;

  // Barra "gameficada": anima suave de 0 até o valor ao abrir (e a cada novo envio),
  // quadro a quadro, para percorrer as faixas de cor conforme enche
  // (laranja -> amarelo -> lima -> verde no 100%) e o número subir junto.
  const [pctAnimado, setPctAnimado] = useState(0);
  const pctRef = useRef(0);
  useEffect(() => {
    const inicio = pctRef.current;
    const alvo = pctReal;
    if (inicio === alvo) return;
    const duracao = 800;
    let raf = 0;
    let t0 = 0;
    const passo = (t: number) => {
      if (!t0) t0 = t;
      const p = Math.min(1, (t - t0) / duracao);
      const eased = 1 - (1 - p) * (1 - p); // ease-out
      const val = inicio + (alvo - inicio) * eased;
      pctRef.current = val;
      setPctAnimado(val);
      if (p < 1) raf = requestAnimationFrame(passo);
    };
    raf = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(raf);
  }, [pctReal]);
  const corProgresso =
    pctAnimado >= 100
      ? '[&>div]:bg-emerald-500'
      : pctAnimado >= 75
        ? '[&>div]:bg-lime-500'
        : pctAnimado >= 40
          ? '[&>div]:bg-amber-400'
          : '[&>div]:bg-orange-400';

  const podeUpload = !!clienteId && !carregandoCliente;

  return (
    <div className="space-y-6">
      {carregandoCliente ? (
        <Card className="p-6">
          <Skeleton className="h-6 w-1/3 mb-3" />
          <Skeleton className="h-4 w-2/3" />
        </Card>
      ) : !clienteId ? (
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-foreground">Conta ainda não vinculada</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Sua conta ainda não está vinculada a um cliente. Fale com a PSA para liberar o envio de documentos.
          </p>
        </Card>
      ) : (
        <>
          {checklist.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-semibold text-foreground">Documentos solicitados</h2>
                <span className="text-sm font-medium text-muted-foreground">
                  {totalRecebidos}/{totalChecklist} recebidos · {Math.round(pctAnimado)}%
                </span>
              </div>
              <Progress
                value={pctAnimado}
                className={cn(
                  'h-2.5 bg-slate-200 [&>div]:transition-colors [&>div]:duration-500',
                  corProgresso,
                )}
              />

              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar pessoa, imóvel ou documento..."
                  className="pl-9"
                />
              </div>

              {secoesFiltradas.length === 0 ? (
                <Card className="mt-4 p-6 text-center">
                  <p className="text-sm text-muted-foreground">Nenhum resultado para a busca.</p>
                </Card>
              ) : (
                <div className="mt-5 space-y-6">
                  {secoesFiltradas.map((sec) => {
                    const label = ENTIDADE_SECAO[sec.entidade] ?? sec.entidade;
                    const expandida = secoesExpandidas.has(sec.entidade);
                    const temMais = sec.cards.length > 3;
                    const carrossel = temMais && !expandida;
                    const alternarSecao = () =>
                      setSecoesExpandidas((prev) => {
                        const proximo = new Set(prev);
                        if (proximo.has(sec.entidade)) proximo.delete(sec.entidade);
                        else proximo.add(sec.entidade);
                        return proximo;
                      });
                    return (
                      <div key={sec.entidade}>
                        <div className="mb-3 flex items-center justify-between gap-3">
                          <div className="flex min-w-0 items-center gap-2">
                            <h3 className="truncate text-sm font-semibold text-foreground">{label}</h3>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {sec.cards.length} {sec.cards.length === 1 ? 'entidade' : 'entidades'}
                            </span>
                          </div>
                          {temMais && (
                            <button
                              type="button"
                              onClick={alternarSecao}
                              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-teal-700 transition-colors hover:text-teal-800 hover:underline"
                            >
                              {expandida ? (
                                <><ChevronLeft className="h-3.5 w-3.5" />Ver menos</>
                              ) : (
                                <>Ver todos<ChevronRight className="h-3.5 w-3.5" /></>
                              )}
                            </button>
                          )}
                        </div>
                        {carrossel ? (
                          <div
                            key="carrossel"
                            className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-0.5 pt-1 pb-2 duration-300 animate-in fade-in-0 [scrollbar-color:#2dd4bf_#f1f5f9] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-teal-400 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100"
                          >
                            {sec.cards.map((card) => (
                              <div key={card.chave} className="w-[80%] shrink-0 snap-start sm:w-[280px]">
                                <CardBotao card={card} onOpen={() => setCardAtivo(card.chave)} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div
                            key="grid"
                            className="grid gap-3 duration-300 animate-in fade-in-0 slide-in-from-top-2 sm:grid-cols-2 lg:grid-cols-3"
                          >
                            {sec.cards.map((card) => (
                              <CardBotao key={card.chave} card={card} onOpen={() => setCardAtivo(card.chave)} />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              <input
                ref={itemInputRef}
                type="file"
                accept={ACCEPT}
                className="hidden"
                onChange={onItemInput}
              />
            </div>
          )}
        </>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-foreground">Outros documentos enviados</h2>
          {clienteId && (
            <Button variant="outline" onClick={() => setAnexarOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Anexar outros documentos
            </Button>
          )}
        </div>
        {carregandoDocs ? (
          <Card>
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded" />
                  <Skeleton className="h-4 flex-1" />
                  <Skeleton className="h-8 w-20" />
                </div>
              ))}
            </div>
          </Card>
        ) : docsCliente.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum documento enviado.</p>
          </Card>
        ) : (
          <Card>
            <ul className="divide-y">
              {docsCliente.map((d) => {
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
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => baixar.mutate(d)}
                      title="Baixar"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setAExcluir(d)}
                      title="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      {/* Modal: documentos de uma pessoa/imóvel, subdivididos por categoria */}
      <Dialog open={!!cardAtivo} onOpenChange={(o) => !o && setCardAtivo(null)}>
        <DialogContent className="max-w-lg overflow-hidden p-0">
          <DialogHeader className="border-b px-6 py-4 text-left">
            <span className="text-xs font-medium text-muted-foreground">{cardAtivoData?.entidade}</span>
            <DialogTitle className="text-lg">{cardAtivoData?.nome}</DialogTitle>
            <DialogDescription>
              {cardAtivoData ? `${cardAtivoData.recebidos} de ${cardAtivoData.total} documentos enviados` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {gruposModal.map((g) => (
              <div key={g.categoria}>
                <div className="px-6 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">
                  {g.categoria}
                </div>
                <ul className="divide-y">
                  {g.itens.map((it) => {
                    const enviando = uploadSolicitado.isPending && itemAlvo?.item_id === it.item_id;
                    const doc = it.recebido ? docPorItem.get(it.item_id) : undefined;
                    const uploaderDoc = doc?.created_by ? uploaderNames[doc.created_by] : null;
                    return (
                      <li key={it.item_id} className="flex items-center gap-3 px-6 py-3 text-sm">
                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">{it.documento}</p>
                          {it.recebido ? (
                            <>
                              <p className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                                <Check className="h-3 w-3" />
                                {doc?.nome_original ?? it.arquivo_nome ?? 'Recebido'}
                              </p>
                              {doc && (
                                <p className="truncate text-xs text-muted-foreground">
                                  {formatBytes(doc.tamanho)} ·{' '}
                                  {format(new Date(doc.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  {' · '}enviado por {uploaderDoc ?? '—'}
                                </p>
                              )}
                            </>
                          ) : it.nota ? (
                            <p className="truncate text-xs text-muted-foreground" title={it.nota}>{it.nota}</p>
                          ) : null}
                        </div>
                        {!it.recebido && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => abrirSeletorItem(it)}
                            disabled={enviando || uploadSolicitado.isPending}
                          >
                            {enviando ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="mr-2 h-4 w-4" />
                            )}
                            Enviar
                          </Button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: anexar documentos fora da lista de solicitados (upload livre) */}
      <Dialog open={anexarOpen} onOpenChange={setAnexarOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader className="text-left">
            <DialogTitle>Anexar outros documentos</DialogTitle>
            <DialogDescription>
              Envie documentos que não estão na lista de solicitados.
            </DialogDescription>
          </DialogHeader>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setArrastando(true);
            }}
            onDragLeave={() => setArrastando(false)}
            onDrop={onDrop}
            className={cn(
              'flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors',
              arrastando ? 'border-teal-500 bg-teal-50' : 'border-slate-300 bg-slate-50/60',
            )}
          >
            <FolderUp className="h-8 w-8 text-teal-700/70" />
            <p className="text-sm text-slate-600">Arraste os arquivos aqui</p>
            <p className="text-xs text-muted-foreground">
              Tipos permitidos: {ACCEPT} — até {formatBytes(MAX_BYTES)}.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={onInput}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={!podeUpload || upload.isPending}
              className="mt-2"
            >
              {upload.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Escolher arquivos
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!aExcluir} onOpenChange={(o) => !o && setAExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover documento?</AlertDialogTitle>
            <AlertDialogDescription>
              "{aExcluir?.nome_original}" deixará de aparecer na lista. O arquivo permanece arquivado no storage.
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

export default MeusDocumentosConteudo;
