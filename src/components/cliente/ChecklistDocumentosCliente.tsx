import { useMemo, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Building2, Check, FilePlus2, Landmark, Loader2, ShieldCheck, UploadCloud, Users,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from '@/hooks/use-toast';
import { ACCEPT, MAX_BYTES, extensaoValida } from '@/components/equipe/osg/documentos/docMeta';
import type { GrupoDocumentoKey } from '@/lib/agrupadorDocumentos';
import {
  montarGavetasChecklist, resumirPendencias,
  type EntidadeChecklist, type GavetaChecklist,
} from '@/lib/checklistCliente';
import {
  usePendenciasCliente, useAnexarPendencia, type PendenciaCliente,
} from '@/hooks/useDomainPendenciasCliente';

/**
 * A área do cliente na fase de CHECKLIST.
 *
 * A diferença em relação à gaveta-balde não é visual, é de eixo: aqui cada linha
 * é um documento pedido PARA UMA ENTIDADE, e o envio acontece na linha. Por isso o
 * arquivo nasce sabendo o que é e de quem é, e ninguém precisa classificar depois.
 *
 * Quem decide qual das duas telas aparece é o status da solicitação, em
 * ColetaDocumentosCliente. Ver docs/planos/checklist-por-subtracao.md.
 */

const GRUPO_ICON: Record<GrupoDocumentoKey, LucideIcon> = {
  pf: Users,
  pj: Building2,
  bens_imoveis: Landmark,
  outros: FilePlus2,
};

const FOCO = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40';

export function ChecklistDocumentosCliente({ clienteId }: { clienteId: string }) {
  const { data, isLoading } = usePendenciasCliente(clienteId);
  const anexar = useAnexarPendencia();
  const [enviando, setEnviando] = useState<string | null>(null);

  // O `?? []` sai daqui e vira memo próprio: literal na dependência de outro memo
  // muda de identidade a cada render e mataria o cache dos dois de baixo.
  const pendencias = useMemo(() => data?.pendencias ?? [], [data]);
  const gavetas = useMemo(() => montarGavetasChecklist(pendencias), [pendencias]);
  const resumo = useMemo(() => resumirPendencias(pendencias), [pendencias]);
  const encerrada = data?.solicitacao?.status === 'encerrada';

  const enviar = async (gaveta: GavetaChecklist, pendencia: PendenciaCliente, arquivo: File) => {
    if (!extensaoValida(arquivo.name)) {
      toast({ title: 'Formato não aceito', description: `"${arquivo.name}" não é um formato que recebemos.`, variant: 'destructive' });
      return;
    }
    if (arquivo.size > MAX_BYTES) {
      toast({ title: 'Arquivo muito grande', description: `"${arquivo.name}" passa do limite por arquivo.`, variant: 'destructive' });
      return;
    }
    const chave = `${pendencia.solicitacao_item_id}|${pendencia.alvo.id ?? 'cliente'}`;
    setEnviando(chave);
    try {
      await anexar.mutateAsync({ clienteId, pendencia, categoria: gaveta.categoria, file: arquivo });
    } finally {
      setEnviando(null);
    }
  };

  if (isLoading) {
    return <p className="py-12 text-center text-sm text-slate-500">Carregando a sua lista de documentos...</p>;
  }

  if (pendencias.length === 0) {
    return (
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <ShieldCheck className="h-6 w-6" />
        </span>
        <p className="font-semibold text-slate-800">Nada pendente no momento.</p>
        <p className="max-w-md text-sm text-slate-500">
          Assim que a PSA precisar de um documento novo, ele aparece aqui com o envio na própria
          linha.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">Documentos que faltam</h3>
            <p className="mt-1 max-w-2xl text-sm text-slate-500">
              Cada linha diz o documento e de quem ele é. Envie na própria linha: assim ele já chega
              organizado, e você não precisa renomear nem separar nada.
            </p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold leading-none tabular-nums text-teal-700">
              {resumo.recebidos}/{resumo.total}
            </div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              recebidos
            </div>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-teal-600 transition-[width] duration-500"
            style={{ width: `${resumo.pct}%` }}
          />
        </div>
        {encerrada && (
          <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Este pedido foi encerrado. A lista fica para consulta e o envio está desligado. Se
            precisar mandar algo, fale com a PSA.
          </p>
        )}
      </Card>

      {gavetas.map((gaveta) => (
        <GavetaCard
          key={gaveta.key}
          gaveta={gaveta}
          somenteLeitura={encerrada}
          enviando={enviando}
          onArquivo={(pendencia, arquivo) => void enviar(gaveta, pendencia, arquivo)}
        />
      ))}
    </div>
  );
}

function GavetaCard({ gaveta, somenteLeitura, enviando, onArquivo }: {
  gaveta: GavetaChecklist;
  somenteLeitura: boolean;
  enviando: string | null;
  onArquivo: (pendencia: PendenciaCliente, arquivo: File) => void;
}) {
  const Icon = GRUPO_ICON[gaveta.key];
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-800">{gaveta.titulo}</h3>
          <p className="text-sm text-slate-500">{gaveta.subtitulo}</p>
        </div>
        <span className={cn(
          'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
          gaveta.faltando > 0 ? 'bg-amber-50 text-amber-700' : 'bg-teal-50 text-teal-700',
        )}>
          {gaveta.faltando > 0
            ? `${gaveta.faltando} pendente${gaveta.faltando === 1 ? '' : 's'}`
            : 'Completo'}
        </span>
      </div>

      <div className="mt-5 space-y-5">
        {gaveta.entidades.map((entidade) => (
          <EntidadeBloco
            key={entidade.chave}
            entidade={entidade}
            somenteLeitura={somenteLeitura}
            enviando={enviando}
            onArquivo={onArquivo}
          />
        ))}
      </div>
    </Card>
  );
}

function EntidadeBloco({ entidade, somenteLeitura, enviando, onArquivo }: {
  entidade: EntidadeChecklist;
  somenteLeitura: boolean;
  enviando: string | null;
  onArquivo: (pendencia: PendenciaCliente, arquivo: File) => void;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h4 className="font-semibold text-slate-800">{entidade.nome}</h4>
          {entidade.detalhe && <p className="text-xs text-slate-500">{entidade.detalhe}</p>}
        </div>
        <span className="text-xs font-semibold tabular-nums text-slate-500">
          {entidade.pendencias.length - entidade.faltando}/{entidade.pendencias.length}
        </span>
      </div>

      <ul className="mt-3 divide-y divide-slate-200/70">
        {entidade.pendencias.map((pendencia) => (
          <LinhaPendencia
            key={`${pendencia.solicitacao_item_id}|${pendencia.alvo.id ?? 'cliente'}`}
            pendencia={pendencia}
            somenteLeitura={somenteLeitura}
            enviando={enviando}
            onArquivo={onArquivo}
          />
        ))}
      </ul>
    </div>
  );
}

function LinhaPendencia({ pendencia, somenteLeitura, enviando, onArquivo }: {
  pendencia: PendenciaCliente;
  somenteLeitura: boolean;
  enviando: string | null;
  onArquivo: (pendencia: PendenciaCliente, arquivo: File) => void;
}) {
  const chave = `${pendencia.solicitacao_item_id}|${pendencia.alvo.id ?? 'cliente'}`;
  const ocupado = enviando === chave;
  /**
   * Item pedido à mão que não tem tipo cadastrado: a RPC de anexo recusaria, então
   * a linha aparece sem campo de envio, com o caminho de saída dito na tela.
   */
  const semTipo = !pendencia.documento_tipo_id;

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('text-sm font-medium', pendencia.recebido ? 'text-slate-500' : 'text-slate-800')}>
            {pendencia.documento}
          </span>
          {pendencia.recebido && (
            <span className="inline-flex items-center gap-1 rounded-full bg-teal-50 px-2 py-0.5 text-[11px] font-semibold text-teal-700">
              <Check className="h-3 w-3" />
              {pendencia.recebido_interno && pendencia.arquivos.length === 0 ? 'Já temos' : 'Recebido'}
            </span>
          )}
        </div>
        {pendencia.nota && !pendencia.recebido && (
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{pendencia.nota}</p>
        )}
        {pendencia.arquivos.length > 0 && (
          <p className="mt-1 truncate text-xs text-slate-500">
            {pendencia.arquivos.map((arquivo) => arquivo.nome).join(', ')}
          </p>
        )}
      </div>

      {!pendencia.recebido && !somenteLeitura && (
        semTipo ? (
          <span className="shrink-0 text-xs text-slate-500">Fale com a PSA para enviar este</span>
        ) : (
          <label
            className={cn(
              'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-teal-600/30 bg-white px-3 py-2 text-xs font-semibold text-teal-700 transition-colors hover:border-teal-600/60 hover:bg-teal-50',
              FOCO,
              ocupado && 'pointer-events-none opacity-60',
            )}
          >
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {ocupado ? 'Enviando...' : 'Enviar arquivo'}
            <input
              type="file"
              className="sr-only"
              accept={ACCEPT}
              disabled={ocupado}
              onChange={(evento) => {
                const arquivo = evento.target.files?.[0];
                evento.target.value = '';
                if (arquivo) onArquivo(pendencia, arquivo);
              }}
            />
          </label>
        )
      )}
    </li>
  );
}

export default ChecklistDocumentosCliente;
