// A confirmação da passagem para o checklist, em arquivo próprio porque agora
// tem DUAS portas: o botão da tela de Solicitação de documentos e o da tela do
// Checklist (11/09/2026). O texto é o mesmo nas duas, e é por isso que ele mora
// aqui — duas cópias divergiriam no primeiro ajuste, e este já passou pela
// coordenação uma vez.
//
// O que muda entre as portas é só o VERBO, e por um motivo de ponto de vista:
// na tela da solicitação você passa o pedido adiante, na do checklist você o
// traz para onde já está. Quem abriu o diálogo e quem o confirma dizem a mesma
// palavra — a régua da Patrícia é explícita quanto a isso, o mesmo ato não muda
// de nome entre uma tela e a seguinte.
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

export interface DialogoPassarParaChecklistProps {
  aberto: boolean;
  onOpenChange: (aberto: boolean) => void;
  /**
   * Arquivos do cliente ainda sem tipo de documento.
   *
   * Entra só no aviso: enquanto não forem classificados, a subtração não os vê,
   * e o cliente cairia num checklist quase todo pendente com documentos que já
   * entregou.
   */
  arquivosSemTipo: number;
  /** "Passar" na tela da solicitação, "Trazer" na do checklist. */
  verbo: 'Passar' | 'Trazer';
  onConfirmar: () => void;
}

export function DialogoPassarParaChecklist({
  aberto, onOpenChange, arquivosSemTipo, verbo, onConfirmar,
}: DialogoPassarParaChecklistProps) {
  return (
    <AlertDialog open={aberto} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {verbo} esta solicitação para o checklist?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {/* Sem "gaveta": a coordenação tirou o termo da tela do checklist
                em 11/09/2026 e ele vivia em mais três textos. É nome interno da
                fase — quem lê fora do time não sabe o que é. */}
            A partir daqui, cada documento que o cliente enviar já chega classificado:
            a tela dele passa a mostrar o que falta, de quem é cada documento, e o
            envio acontece na própria linha. Não há como voltar atrás.
            {arquivosSemTipo > 0 && (
              <>
                {' '}
                <strong className="font-semibold">
                  Atenção: {arquivosSemTipo} arquivo(s) dele ainda estão sem tipo de
                  documento.
                </strong>{' '}
                Enquanto não forem classificados no Cadastro por Documento, o checklist
                vai cobrar coisa que já foi entregue.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirmar}>
            {verbo} para o checklist
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default DialogoPassarParaChecklist;
