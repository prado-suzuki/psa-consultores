import { TriangleAlert } from 'lucide-react';

import { useAvisoDeEnvioNaoSaiu } from '@/hooks/useAvisoDeEnvioNaoSaiu';

/**
 * A faixa que conta o pior modo de falha deste fluxo.
 *
 * A solicitação foi enviada, a lista está visível no portal, e nenhum aviso
 * chegou ao cliente. Por dentro o sistema fica coerente; por fora, mudo.
 *
 * SEM BOTÃO, e é decisão do Alexandre (09/09/2026). Não existe reenvio do aviso
 * de ENVIO — a cobrança tem botão próprio, o de conferência sai no encerramento,
 * mas este não tem caminho de tela. Oferecer um "tentar de novo" que a borda
 * fosse recusar de novo seria pior que dizer a verdade e mandar avisar por fora.
 *
 * PERMANENTE enquanto a condição valer. Some sozinha no dia em que um aviso
 * bem-sucedido for registrado — não há nada para marcar como lido, porque o que
 * apaga a faixa é o problema deixar de existir.
 *
 * NÃO aparece no portal do cliente. O problema é interno, e contar a ele que ele
 * não foi avisado é ruído sem ação.
 */
export function AvisoClienteNaoNotificado({ solicitacaoId, enviadaEm }: {
  solicitacaoId: string | null;
  /** Nulo em rascunho: sem envio, não há aviso a cobrar. */
  enviadaEm: string | null | undefined;
}) {
  const { data: naoSaiu } = useAvisoDeEnvioNaoSaiu(solicitacaoId, enviadaEm);

  // `data` indefinido cobre carregando E erro de leitura, e nos dois o certo é
  // ficar calado: acusar falso manda o analista incomodar o cliente à toa.
  if (!naoSaiu) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-2xl border border-osg-red/30 bg-osg-red/[0.04] p-4 text-sm text-osg-700"
    >
      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-osg-red" />
      <p className="leading-relaxed">
        <strong className="font-semibold">O cliente não foi avisado deste envio.</strong>{' '}
        A lista está visível para ele no portal, mas o e-mail e o WhatsApp não saíram.
        Avise o cliente por fora e informe a equipe da PSA Digital.
      </p>
    </div>
  );
}

export default AvisoClienteNaoNotificado;
