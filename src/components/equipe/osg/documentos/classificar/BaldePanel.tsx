import { Inbox, Search, UserX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fileIconOf, formatBytes } from '@/components/equipe/osg/documentos/docMeta';
import { cn } from '@/lib/utils';
import type { GavetaContagem, Gaveta } from '@/lib/classificarBalde';
import type { DocumentoArquivoRow } from '@/hooks/useDocumentoArquivo';

interface Props {
  arquivos: DocumentoArquivoRow[];
  gavetas: GavetaContagem[];
  gaveta: Gaveta;
  onGaveta: (gaveta: Gaveta) => void;
  busca: string;
  onBusca: (busca: string) => void;
  abertoId: string | null;
  onAbrir: (doc: DocumentoArquivoRow) => void;
  semDonoTotal: number;
  carregando: boolean;
  /** Válvula §5.4: o arquivo aberto passa a ser documento do cliente e sai do balde. */
  onNaoEDeNinguem: () => void;
  marcadosNaSessao: number;
  onDesfazerMarcacoes: () => void;
}

/**
 * Coluna do balde: os arquivos do cliente que ainda não têm dono, na gaveta
 * escolhida. Só apresentação — recebe a lista já filtrada.
 */
export function BaldePanel({
  arquivos, gavetas, gaveta, onGaveta, busca, onBusca, abertoId, onAbrir,
  semDonoTotal, carregando, onNaoEDeNinguem, marcadosNaSessao, onDesfazerMarcacoes,
}: Props) {
  return (
    <section
      aria-label="Balde do cliente"
      className="flex w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border border-osg-300/60 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_8px_24px_-14px_hsl(var(--osg-700)/0.20)]"
    >
      <div className="space-y-2 border-b border-osg-100 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <Inbox className="h-4 w-4 shrink-0 text-osg-600" aria-hidden />
          <h3 className="text-[13px] font-semibold text-osg-700">Balde do cliente</h3>
          <span
            className="ml-auto rounded-full bg-osg-50 px-2 text-[11px] font-semibold tabular-nums text-osg-700"
            aria-hidden
          >
            {semDonoTotal}
          </span>
        </div>

        <div className="space-y-1">
          <Label htmlFor="balde-gaveta" className="text-[11px] font-medium text-slate-600">
            Gaveta
          </Label>
          <Select value={gaveta} onValueChange={(valor) => onGaveta(valor as Gaveta)}>
            <SelectTrigger id="balde-gaveta" className="h-8 text-[12.5px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {gavetas.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label} ({item.total})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="balde-busca" className="text-[11px] font-medium text-slate-600">
            Buscar por nome
          </Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input
              id="balde-busca"
              value={busca}
              onChange={(event) => onBusca(event.target.value)}
              placeholder="ex: contrato"
              className="h-8 pl-8 text-[12.5px]"
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2.5 py-2">
        <p aria-live="polite" className="mb-1.5 px-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-osg-700">
          {carregando
            ? 'Carregando o balde…'
            : `${arquivos.length} ${arquivos.length === 1 ? 'arquivo sem dono' : 'arquivos sem dono'}`}
        </p>

        {!carregando && arquivos.length === 0 ? (
          <p className="rounded-lg border border-dashed border-osg-300/70 bg-osg-50/50 px-2.5 py-3 text-[11.5px] text-muted-foreground">
            {busca || gaveta !== 'todas'
              ? 'Nenhum arquivo sem dono com esse filtro.'
              : 'O balde está vazio: todo arquivo recebido já tem dono.'}
          </p>
        ) : (
          <ul className="space-y-1.5">
            {arquivos.map((doc) => {
              const aberto = doc.id === abertoId;
              const { Icon, className } = fileIconOf(doc.nome_original, doc.mime);
              return (
                <li key={doc.id}>
                  <button
                    type="button"
                    onClick={() => onAbrir(doc)}
                    aria-current={aberto ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-start gap-2 rounded-xl border px-2 py-2 text-left transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss focus-visible:ring-offset-1',
                      aberto
                        ? 'border-osg-moss bg-osg-moss/[0.06]'
                        : 'border-osg-300/60 bg-card hover:border-osg-moss/50 hover:bg-osg-50/60',
                    )}
                  >
                    <span
                      className={cn(
                        'mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-md',
                        aberto ? 'bg-osg-moss text-white' : 'bg-osg-100',
                      )}
                    >
                      <Icon className={cn('h-3.5 w-3.5', aberto ? 'text-white' : className)} aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[12.5px] font-medium leading-tight text-osg-700">
                        {doc.nome_original}
                      </span>
                      <span className="mt-0.5 block text-[10.5px] text-muted-foreground">
                        {formatBytes(doc.tamanho)} · recebido em{' '}
                        {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </span>
                    {aberto && (
                      <span className="mt-0.5 shrink-0 text-[10px] font-semibold uppercase text-osg-moss">aberto</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="space-y-1 border-t border-osg-100 bg-osg-50/40 px-2.5 py-2">
        <Button
          type="button"
          variant="ghost"
          onClick={onNaoEDeNinguem}
          disabled={!abertoId}
          className="h-auto w-full justify-start gap-1.5 px-1.5 py-1.5 text-[11.5px] font-medium text-osg-600 hover:bg-osg-50"
        >
          <UserX className="h-3.5 w-3.5 shrink-0 text-osg-moss" aria-hidden />
          <span className="text-left leading-tight">
            Não é de ninguém <span className="text-muted-foreground">— é do cliente</span>
          </span>
        </Button>
        {marcadosNaSessao > 0 && (
          <p className="flex items-center gap-1.5 px-1.5 text-[10.5px] leading-tight text-muted-foreground">
            <span>
              {marcadosNaSessao} {marcadosNaSessao === 1 ? 'arquivo marcado' : 'arquivos marcados'} nesta sessão
              (não fica gravado)
            </span>
            <button
              type="button"
              onClick={onDesfazerMarcacoes}
              className="shrink-0 rounded font-semibold text-osg-moss underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-osg-moss"
            >
              desfazer
            </button>
          </p>
        )}
      </div>
    </section>
  );
}
