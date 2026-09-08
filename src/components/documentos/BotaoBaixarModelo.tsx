import { Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBaixarModelo } from '@/hooks/useDomainModeloDocumento';
import type { ModeloDocumento } from '@/lib/modeloDocumento';

/**
 * O botão que entrega a planilha em branco, nas três telas onde o documento aparece.
 *
 * O download sai por âncora, e não por `window.open`: depois do `await` da URL
 * assinada o gesto do usuário já se perdeu, e o pop-up cai no bloqueador de alguns
 * navegadores. Com o parâmetro `download` na URL, o navegador trata como download e a
 * âncora não é pop-up.
 *
 * `className` existe porque as duas áreas têm paleta diferente — osg no analista, teal
 * no portal do cliente. A cor vem de quem hospeda; o botão não decide isso.
 */
export function BotaoBaixarModelo({
  modelo,
  className,
}: {
  modelo: ModeloDocumento;
  className?: string;
}) {
  const baixar = useBaixarModelo();

  const aoClicar = async () => {
    const url = await baixar.mutateAsync(modelo).catch(() => null);
    if (!url) return;
    const ancora = document.createElement('a');
    ancora.href = url;
    ancora.rel = 'noopener';
    ancora.click();
  };

  return (
    <button
      type="button"
      onClick={() => void aoClicar()}
      disabled={baixar.isPending}
      title={`Baixar ${modelo.nome}`}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        'disabled:pointer-events-none disabled:opacity-60',
        className,
      )}
    >
      {baixar.isPending
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Download className="h-3.5 w-3.5" />}
      Baixar modelo
    </button>
  );
}
