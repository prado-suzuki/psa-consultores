import { useState } from 'react';
import { Archive, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  dataCurta,
  resumoPorGrupo,
  type EstadoSolicitacao,
  type ItemSolicitacao,
} from '@/lib/solicitacao';

/**
 * A solicitação encerrada, nos dois sentidos que `encerrada` tem (§0 e §1.5).
 *
 * FINALIZADA — chegou ao cliente e terminou. A faixa é a de hoje, palavra por
 * palavra; o resumo diz "N documentos solicitados" e o botão abre a lista.
 *
 * CANCELADA — rascunho encerrado sem nunca ter sido enviado. Nunca houve envio,
 * arquivo ou cliente vendo nada, e nenhuma frase daqui diz o contrário: nem
 * "finalizada", nem "o cliente continua vendo". O ícone é o de ARQUIVAR, e não
 * o cadeado — o cadeado é o desenho da AÇÃO Finalizar nesta tela (botão,
 * modal, faixa), e pô-lo numa cancelada a faria dizer "finalizada" por
 * associação, que é a confusão que esta distinção existe para matar.
 *
 * `Archive` já significa "arquivar" na casa (ProcedimentoSheet, ScenarioList).
 */
export function SolicitacaoEncerrada({
  estado,
  encerradaEm,
  ativos,
}: {
  /** Só os dois que encerram — quem chama já passou por `estadoDaSolicitacao`. */
  estado: Extract<EstadoSolicitacao, 'finalizada' | 'cancelada'>;
  encerradaEm: string | null;
  ativos: ItemSolicitacao[];
}) {
  const finalizada = estado === 'finalizada';
  const IconeDoEstado = finalizada ? Lock : Archive;
  const [listaAberta, setListaAberta] = useState(false);

  const total = ativos.length;
  const resumo = resumoPorGrupo(ativos);

  const fraseDoResumo = total === 0
    ? (finalizada
      ? 'Esta solicitação foi finalizada sem nenhum documento. Para pedir documentos, abra uma nova solicitação pelo botão no topo.'
      : 'Esta solicitação foi cancelada sem nenhum documento. Para pedir documentos, abra uma nova solicitação pelo botão no topo.')
    : finalizada
      ? `${total} ${total === 1 ? 'documento solicitado' : 'documentos solicitados'}.`
      : `${total} ${total === 1 ? 'documento estava' : 'documentos estavam'} na lista.`;

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3 rounded-2xl border border-status-neutro/30 bg-status-neutro-soft/40 p-4 text-sm text-status-neutro">
        {/* O tile próprio do ícone: o mesmo arranjo da barra de cliente, um
            quadrado só dele — a faixa antiga deixava o ícone solto na margem. */}
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-status-neutro-soft">
          <IconeDoEstado className="h-4 w-4 text-status-neutro" />
        </span>
        <div className="min-w-0 leading-relaxed">
          <p>
            {finalizada ? (
              <>
                Esta solicitação foi <strong className="font-semibold">finalizada</strong>
                {encerradaEm ? ` em ${dataCurta(encerradaEm)}` : ''} e
                está só para consulta. O cliente continua vendo os arquivos que enviou, mas
                não envia mais nada. Para pedir outros documentos, abra uma nova solicitação
                pelo botão no topo.
              </>
            ) : (
              <>
                Esta solicitação foi <strong className="font-semibold">cancelada</strong>
                {encerradaEm ? ` em ${dataCurta(encerradaEm)}` : ''}. Ela
                nunca foi enviada, então o cliente não chegou a vê-la. Para pedir documentos,
                abra uma nova solicitação pelo botão no topo.
              </>
            )}
          </p>

          <p className="mt-2 text-sm font-medium">{fraseDoResumo}</p>

          {/* UM botão no corpo. Contorno neutro: a lista é consulta, não ação. */}
          {total > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="mt-3 border-status-neutro/30 bg-transparent text-status-neutro hover:bg-status-neutro-soft/40 hover:text-status-neutro"
              onClick={() => setListaAberta((aberta) => !aberta)}
            >
              {listaAberta
                ? 'Esconder documentos'
                : finalizada ? 'Ver documentos solicitados' : 'Ver a lista'}
            </Button>
          )}
        </div>
      </div>

      {listaAberta && total > 0 && (
        // A lista em cinza, sem accordion e sem controle: nada aqui responde a
        // hover e nada é clicável — é registro, não ferramenta.
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
          <p className="text-xs font-semibold uppercase tracking-wide">Somente consulta</p>
          <div className="mt-2 divide-y divide-border/60">
            {resumo.map((grupo) => (
              <div key={grupo.grupo} className="py-2 first:pt-0 last:pb-0">
                <p className="text-xs font-medium uppercase tracking-wide">
                  {grupo.titulo} · {grupo.contagem}{' '}
                  {grupo.contagem === 1 ? 'documento' : 'documentos'}
                </p>
                <p className="mt-1 leading-relaxed">{grupo.documentos.join(', ')}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
