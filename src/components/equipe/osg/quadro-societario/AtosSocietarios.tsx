import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { FileCheck2, History, Loader2, Undo2 } from 'lucide-react';
import { useReverterAto } from '@/hooks/useMovimentacaoQuotas';
import type { AtoParaProcedencia, MovimentoDoLedger } from '@/lib/osg/projecaoQuadro';

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

  return (
    <Card className="animate-osg-rise motion-reduce:animate-none" style={{ animationDelay: '240ms' }}>
      <CardHeader className="pb-3 space-y-2">
        <CardTitle className="text-base flex items-center gap-2">
          <History className="h-4 w-4 text-slate-500" />
          Atos societários ({atos.length})
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Cada ato agrupa os lançamentos que nasceram juntos, inclusive os da outra empresa.
          Desfazer apaga o ato inteiro, e só é possível enquanto nenhum documento o formalizou.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
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
                <p className="truncate text-sm font-medium text-slate-800">{nome}</p>
                <p className="text-xs text-muted-foreground">
                  {quando ? `${quando} · ` : ''}
                  {doAto.length} lançamento(s) nesta empresa
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
                        Os lançamentos deste ato saem do livro nas duas empresas, e os quadros
                        voltam ao estado anterior. Não há como desfazer esta ação.
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
      </CardContent>
    </Card>
  );
};
