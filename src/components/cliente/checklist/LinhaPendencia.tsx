import { Check, Hourglass, Loader2, TriangleAlert, UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ACCEPT } from '@/components/equipe/osg/documentos/docMeta';
import { BotaoModelo } from '@/components/shared/BotaoModelo';
import type { ArquivoDaPendencia, PendenciaCliente } from '@/hooks/useDomainPendenciasCliente';
import { estadoDocumentoColors } from '@/lib/estadoDocumentoColors';
import { ArquivoEnviado } from './ArquivoEnviado';
import { ESTADO_LABEL, estadoDaPendencia, FOCO } from './checklistKit';

/**
 * Um documento pedido para uma entidade, com o envio na própria linha.
 *
 * Saiu de ChecklistDocumentosCliente quando o arquivo passou de 792 linhas contra
 * o teto de 600 do AGENTS.md. É decomposição por responsabilidade: aqui mora a
 * linha, lá mora a tela que a organiza em gavetas e modais.
 */
export function LinhaPendencia({ pendencia, somenteLeitura, enviando, onArquivo, onRemover }: {
  pendencia: PendenciaCliente;
  somenteLeitura: boolean;
  enviando: string | null;
  onArquivo: (pendencia: PendenciaCliente, arquivo: File) => void;
  onRemover: (arquivo: ArquivoDaPendencia) => void;
}) {
  const chave = `${pendencia.solicitacao_item_id}|${pendencia.alvo.id ?? 'cliente'}`;
  const ocupado = enviando === chave;
  /**
   * Item pedido à mão que não tem tipo cadastrado: a RPC de anexo recusaria, então
   * a linha aparece sem campo de envio, com o caminho de saída dito na tela.
   */
  const semTipo = !pendencia.documento_tipo_id;

  /**
   * O selo da linha responde "e agora?", e por isso não é o mesmo que o estado de
   * cada arquivo. Recusado ganha destaque porque é o único que pede ação; entre os
   * que já valem, aprovado vence "em análise" (a PSA já bateu o martelo).
   */
  const estado = estadoDaPendencia(pendencia);
  const recusado = estado === 'recusado';
  const selo = pendencia.recebido_interno && pendencia.arquivos.length === 0
    ? 'Já temos'
    : estado === 'pendente' ? null : ESTADO_LABEL[estado];

  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start">
      <span className={cn(
        'mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg sm:flex',
        estadoDocumentoColors[estado].pilula,
      )}>
        {pendencia.recebido ? <Check className="h-4 w-4" />
          : recusado ? <TriangleAlert className="h-4 w-4" /> : <UploadCloud className="h-4 w-4" />}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('text-sm font-medium', pendencia.recebido ? 'text-muted-foreground' : 'text-foreground')}>
            {pendencia.documento}
          </span>
          {selo && (
            <span className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
              estadoDocumentoColors[estado].pilula,
            )}>
              {recusado ? <TriangleAlert className="h-3 w-3" />
                : estado === 'em_analise' ? <Hourglass className="h-3 w-3" />
                  : <Check className="h-3 w-3" />}
              {selo}
            </span>
          )}
        </div>
        {pendencia.nota && !pendencia.recebido && (
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{pendencia.nota}</p>
        )}
        {/*
          O modelo fica na ESQUERDA, com o texto, e não à direita com o envio: a
          direita da linha é o alvo de upload, e dois alvos lado a lado fazem o
          cliente clicar no errado.

          E aparece mesmo depois de recebido, ao contrário da nota logo acima.
          Documento recusado precisa ser refeito, e é justamente aí que ele vai
          querer a planilha em branco de novo.
        */}
        {pendencia.modelo && (
          <p className="mt-1.5">
            <BotaoModelo modelo={pendencia.modelo} tom="portal" />
          </p>
        )}
        {pendencia.arquivos.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {pendencia.arquivos.map((arquivo) => (
              <ArquivoEnviado
                key={arquivo.id}
                arquivo={arquivo}
                somenteLeitura={somenteLeitura}
                onRemover={onRemover}
              />
            ))}
          </ul>
        )}
      </div>

      {!pendencia.recebido && !somenteLeitura && (
        semTipo ? (
          /* A frase estava cortada: "para enviar este" — este o quê? E dizia "a
             PSA", que o cliente não sabe onde procurar. */
          <span className="shrink-0 text-xs text-muted-foreground">
            Fale com o suporte da PSA Digital para enviar este documento
          </span>
        ) : (
          <label
            className={cn(
              'inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl border border-primary/30 bg-white px-3 py-2 text-xs font-semibold text-primary transition-colors hover:border-primary/60 hover:bg-accent/5',
              FOCO,
              ocupado && 'pointer-events-none opacity-60',
            )}
          >
            {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
            {ocupado ? 'Enviando...' : recusado ? 'Enviar novamente' : 'Enviar arquivo'}
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
    </div>
  );
}

export default LinhaPendencia;
