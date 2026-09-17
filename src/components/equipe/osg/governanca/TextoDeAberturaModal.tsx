import { useEffect, useState } from 'react';

import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

/**
 * O parágrafo de abertura do protocolo.
 *
 * **Ele existe porque aparece no documento, e só por isso.** O modelo da casa não
 * tem um, mas o Potrich abre assim: "Este Protocolo visa regrar os acordos e
 * combinados da família ao atual momento do negócio 10/03/26, cujo teor será
 * revisto após a eventual análise e/ou elaboração de organograma macro e
 * descrição de cargos dos familiares na gestão."
 *
 * **E é aqui que a data do protocolo mora.** Varrendo os quatro arquivos reais
 * célula a célula, o modelo e os dois Toqueto não trazem data nenhuma, e a única
 * do Potrich está dentro desta frase, não em campo separado. Por isso o cadastro
 * não tem coluna de data: seria campo que o documento nunca escreve.
 */
export function TextoDeAberturaModal({
  open,
  onOpenChange,
  preambulo,
  salvando,
  onSalvar,
}: {
  open: boolean;
  onOpenChange: (aberto: boolean) => void;
  preambulo: string | null;
  salvando: boolean;
  onSalvar: (texto: string | null) => Promise<unknown>;
}) {
  const [texto, setTexto] = useState('');

  useEffect(() => {
    if (open) setTexto(preambulo ?? '');
  }, [open, preambulo]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Texto de abertura</DialogTitle>
        </DialogHeader>

        <div className="space-y-2 py-1">
          <p className="text-sm text-muted-foreground">
            O parágrafo que abre o documento, antes da grade. É onde costuma entrar a data em que
            a família combinou o protocolo e a ressalva de que ele será revisto. Em branco, o
            documento começa direto pela grade.
          </p>
          <Textarea
            rows={5}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Este Protocolo visa regrar os acordos e combinados da família…"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button
            disabled={salvando}
            onClick={async () => {
              await onSalvar(texto.trim() || null);
              onOpenChange(false);
            }}
          >
            {salvando ? 'Salvando…' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
