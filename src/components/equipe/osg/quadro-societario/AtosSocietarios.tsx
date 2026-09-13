import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FileCheck2, History, Loader2, Undo2 } from 'lucide-react';
import { useReverterAto } from '@/hooks/useMovimentacaoQuotas';
import type { AtoParaProcedencia, MovimentoDoLedger } from '@/lib/osg/projecaoQuadro';
import { SecaoRecolhivel } from './SecaoRecolhivel';

// Os atos societários que tocaram esta empresa, e o gesto de desfazê-los.
//
// Existe porque o macro da subida grava QUATRO lançamentos em DUAS empresas de
// uma vez: sem um lugar que nomeie o ato inteiro, desfazer viraria apagar linha
// a linha, e apagar meio par espelhado deixa o quadro de uma das duas empresas
// sem contrapartida. A reversão é do ato, e só enquanto nenhum documento o
// formalizou: depois disso quem desfaz é a peça, não a tela do quadro.

interface AtosSocietariosProps {
  movimentos: MovimentoDoLedger[];
  atos: AtoParaProcedencia[];
}

/** 'AAAA-MM-DD' → 'DD/MM/AAAA', sem passar por Date (evita fuso). */
const dataBR = (iso: string | null) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : null;
};

export const AtosSocietarios = ({ movimentos, atos }: AtosSocietariosProps) => {
  const reverter = useReverterAto();

  if (atos.length === 0) return null;

  // Não é "histórico de movimentos" e não é a lista de alterações pendentes: o
  // movimento avulso não tem ato e por isso não aparece aqui, e a instituição
  // não tem lançamento para receber o carimbo de formalização. O que a lista
  // reúne é o que foi gravado JUNTO e pode ser desfeito junto.
  return (
    <SecaoRecolhivel
      icone={<History className="h-4 w-4 text-muted-foreground" />}
      titulo={`Atos societários (${atos.length})`}
      resumo="Cada ato agrupa o que nasceu junto e pode ser desfeito enquanto nenhum documento o formalizou."
      rotuloAbrir="Ver atos"
      rotuloFechar="Ocultar atos"
      delay={240}
    >
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          Esta lista reúne atos agrupados, inclusive os que criaram apenas ônus. Movimentos avulsos
          não aparecem aqui.
        </p>
        {atos.map((ato) => {
          const doAto = movimentos.filter((m) => m.atoId === ato.id);
          const formalizado = doAto.some((m) => m.documentoGeradoId);
          const quando = dataBR(ato.data);
          const nome = ato.descricao?.trim() || (quando ? `Ato de ${quando}` : 'Ato societário');

          return (
            <div
              key={ato.id}
              className="flex items-center gap-3 rounded-md border border-osg-200/80 bg-card p-3"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{nome}</p>
                <p className="text-xs text-muted-foreground">
                  {quando ? `${quando} · ` : ''}
                  {doAto.length > 0
                    ? `${doAto.length} lançamento(s) nesta empresa`
                    : 'sem lançamento no livro: só ônus sobre quotas'}
                </p>
              </div>
              {formalizado ? (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-osg-50 px-2 py-1.5 text-[11px] font-semibold text-osg-700">
                  <FileCheck2 className="h-3.5 w-3.5" />
                  Formalizado em documento
                </span>
              ) : (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-8 shrink-0 gap-1.5" disabled={reverter.isPending}>
                      {reverter.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Undo2 className="h-3.5 w-3.5" />
                      )}
                      Desfazer
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Desfazer {nome}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        {doAto.length > 0
                          // "nas duas empresas" só descrevia a subida de quotas:
                          // a doação toca uma empresa só, e a frase antiga
                          // prometia um efeito que ela não tem.
                          ? 'Os lançamentos e os ônus criados por este ato serão removidos das empresas envolvidas. Os ônus que ele extinguiu serão restaurados.'
                          : 'Este ato não moveu quota nenhuma: o que sai é o ônus que ele criou, e o voto volta a acompanhar a propriedade.'}
                        {' '}Não há como desfazer esta ação.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => reverter.mutate({ atoId: ato.id, descricao: nome })}
                      >
                        Desfazer o ato
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          );
        })}
      </div>
    </SecaoRecolhivel>
  );
};
