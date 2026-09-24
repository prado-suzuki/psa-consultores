import { AlertTriangle, RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export interface EstadoDeFalhaProps {
  /** O que não carregou, na voz da tela: "as matrículas deste cliente". */
  oQue: string;
  /** O erro que o hook devolveu, exibido como detalhe técnico. */
  erro: unknown;
  /** Sem isto o bloco não oferece saída; passe o `refetch` da query. */
  aoTentarDeNovo?: () => void;
}

/**
 * Falha de consulta NÃO é lista vazia.
 *
 * Tratar as duas igual faz a tela afirmar um fato de negócio que ela não sabe
 * ("nenhum bem cadastrado") quando na verdade a consulta quebrou.
 */
export const EstadoDeFalha = ({ oQue, erro, aoTentarDeNovo }: EstadoDeFalhaProps) => (
  <Card className="border-destructive/40">
    <CardContent className="py-12 text-center">
      <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive/70" />
      <p className="text-sm font-medium text-destructive">
        Não foi possível carregar {oQue}.
      </p>
      <p className="mx-auto mt-2 max-w-xl text-xs text-muted-foreground">
        {erro instanceof Error ? erro.message : String(erro)}
      </p>
      {aoTentarDeNovo && (
        <Button variant="outline" size="sm" className="mt-4" onClick={aoTentarDeNovo}>
          <RotateCw className="mr-2 h-4 w-4" />
          Tentar de novo
        </Button>
      )}
    </CardContent>
  </Card>
);

export default EstadoDeFalha;
