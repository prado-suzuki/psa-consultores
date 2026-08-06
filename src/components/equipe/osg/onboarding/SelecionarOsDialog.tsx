import { FileStack } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { OnboardingOrdemServico } from '@/hooks/useOnboarding';
import { railItemCls } from './onboardingKit';

/**
 * Escolhe DE QUAL OS gerar a lista, quando o cliente tem mais de uma na OSG.
 *
 * Existe porque antes a geração somava todas as OS em silêncio. O consultor não
 * tinha como saber de onde cada documento veio, e a solicitação — que guarda um
 * `solicitacao.ordem_servico_id` só — ficava sem registrar nenhuma.
 *
 * Cada opção mostra o número da OS, os produtos contratados nela e quantos
 * documentos ela traria. É por esses três que o consultor reconhece a OS; o
 * número sozinho não diz o que vem dentro.
 */
interface SelecionarOsDialogProps {
  open: boolean;
  ordensServico: OnboardingOrdemServico[];
  /** Enquanto a geração roda, as opções não aceitam novo clique. */
  ocupado: boolean;
  onOpenChange: (open: boolean) => void;
  onEscolher: (ordemServicoId: string) => void;
}

export function SelecionarOsDialog({
  open,
  ordensServico,
  ocupado,
  onOpenChange,
  onEscolher,
}: SelecionarOsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>De qual OS gerar a lista?</DialogTitle>
          <DialogDescription>
            Este cliente tem mais de uma OS na OSG. A lista sai dos produtos de uma delas, e
            fica registrada na solicitação. Depois você pode incluir e dispensar documentos à
            mão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {ordensServico.map((os) => (
            <button
              key={os.id}
              type="button"
              disabled={ocupado}
              onClick={() => onEscolher(os.id)}
              className={`${railItemCls(false)} w-full disabled:cursor-wait disabled:opacity-60`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-osg-700">
                  {os.numeroOs || 'OS sem número'}
                </span>
                <span className="flex shrink-0 items-center gap-1.5 text-xs text-osg-500/80">
                  <FileStack className="h-3.5 w-3.5" />
                  {os.documentos === 1 ? '1 documento' : `${os.documentos} documentos`}
                </span>
              </span>
              <span className="mt-1 block text-left text-xs leading-relaxed text-slate-500">
                {os.produtos.length > 0
                  ? os.produtos.map((produto) => produto.name).join(' · ')
                  : 'Nenhum produto contratado nesta OS'}
              </span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
