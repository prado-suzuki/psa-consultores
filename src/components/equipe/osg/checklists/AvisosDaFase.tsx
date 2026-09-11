// As faixas do topo do checklist: o que a fase da solicitação impõe à leitura
// dos números logo abaixo.
//
// Saíram de `ChecklistPendentes` em 11/09/2026, quando a tela ganhou o botão de
// trazer para o checklist e o arquivo passou de 600 linhas. O AGENTS.md manda
// decompor ANTES de acrescentar, e era o caso: ele já estava em 602. O `Aviso`
// veio junto porque só estas quatro faixas o usavam.
//
// Aqui só há TEXTO. O botão chegou a morar dentro da faixa de `enviada` e saiu
// no mesmo dia: ação fica na barra do topo, junto do comprovante e da cobrança,
// que é onde o analista já procura botão. A faixa NOMEIA o botão em vez de
// dizer onde ele está, então o texto sobrevive a mudanças de layout.
import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { SolicitacaoStatus } from '@/lib/solicitacao';

function Aviso({ children, tom = 'atencao' }: { children: ReactNode; tom?: 'atencao' | 'neutro' }) {
  return (
    <div className={cn(
      'flex items-start gap-3 rounded-xl border px-4 py-3 text-sm',
      tom === 'atencao'
        ? 'border-osg-highlighter/50 bg-osg-highlighter/10 text-osg-700'
        : 'border-osg-200/70 bg-osg-50/60 text-osg-600',
    )}>
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-osg-moss" />
      <p className="leading-relaxed">{children}</p>
    </div>
  );
}

export interface AvisosDaFaseProps {
  status: SolicitacaoStatus;
  encerradaEm: string | null;
  arquivosSemTipo: number;
}

export function AvisosDaFase({
  status, encerradaEm, arquivosSemTipo,
}: AvisosDaFaseProps) {
  return (
    <>
      {/* A faixa de "o cliente não foi avisado" mora SÓ na Solicitação Inicial
          (decisão de 10/09/2026). É lá que o envio acontece e é de lá que se age;
          repeti-la aqui dobrava o alarme sem dobrar a informação. */}
      {status === 'rascunho' && (
        <Aviso>
          Esta solicitação está em <strong>rascunho</strong>: o cliente ainda não a recebeu,
          então o que aparece como pendente nunca foi solicitado a ele.
        </Aviso>
      )}

      {status === 'enviada' && (
        <Aviso>
          {/* Texto da Patrícia (11/09/2026). As duas primeiras frases são as
              dela, palavra por palavra. A terceira mandava acessar a tela de
              Solicitação de documentos e clicar lá — com o botão no topo desta
              mesma tela, mandar navegar passou a apontar para o lugar errado.
              A frase NOMEIA o botão em vez de dizer onde ele está: assim o
              texto não quebra se a barra de ações mudar de lugar. */}
          Os documentos enviados pelo cliente ainda não estão sendo classificados
          automaticamente. Por isso, alguns documentos já recebidos podem aparecer como
          pendentes. Para iniciar a classificação dos próximos envios, use{' '}
          <strong>Trazer para o checklist</strong>.
        </Aviso>
      )}

      {status === 'encerrada' && (
        <Aviso tom="neutro">
          Solicitação <strong>finalizada</strong>
          {encerradaEm ? ` em ${new Date(encerradaEm).toLocaleDateString('pt-BR')}` : ''}.
          O checklist continua legível como retrato do que foi solicitado.
        </Aviso>
      )}

      {arquivosSemTipo > 0 && (
        <Aviso>
          {arquivosSemTipo} arquivo{arquivosSemTipo === 1 ? '' : 's'} do cliente ainda
          {arquivosSemTipo === 1 ? ' está' : ' estão'} sem tipo de documento e por isso não
          fecha{arquivosSemTipo === 1 ? '' : 'm'} pendência aqui. Classifique
          {arquivosSemTipo === 1 ? '-o' : '-os'} no Cadastro por Documento.
        </Aviso>
      )}
    </>
  );
}

export default AvisosDaFase;
