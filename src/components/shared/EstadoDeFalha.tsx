import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { FECHO_SUPORTE } from '@/lib/rlsMessages';

export interface EstadoDeFalhaProps {
  /** O que não carregou, na voz da tela: "as matrículas deste cliente". */
  oQue: string;
  /** O erro que o hook devolveu; sai só para o console, nunca na tela. */
  erro: unknown;
  /** Sem isto o bloco não oferece saída; passe o `refetch` da query. */
  aoTentarDeNovo?: () => void;
}

/**
 * Falha de consulta NÃO é lista vazia.
 *
 * Tratar as duas igual faz a tela afirmar um fato de negócio que ela não sabe
 * ("nenhum bem cadastrado") quando na verdade a consulta quebrou.
 *
 * Três causas, decididas no EX-01 em 24/09, cada uma com frase própria e nada
 * em inglês na tela; a mensagem técnica vai só para o console, que é o que
 * permite abrir chamado sem reproduzir. A classificação lê o texto do erro
 * porque os hooks empacotam tudo em `Error` e perdem o código HTTP.
 */
const REDE = /failed to fetch|networkerror|load failed|fetch failed|net::err/i;
const SESSAO = /jwt|expired|token|sess[aã]o|session/i;

const causaDe = (erro: unknown): 'rede' | 'sessao' | 'outra' => {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  if (REDE.test(mensagem)) return 'rede';
  if (SESSAO.test(mensagem)) return 'sessao';
  return 'outra';
};

export const EstadoDeFalha = ({ oQue, erro, aoTentarDeNovo }: EstadoDeFalhaProps) => {
  const causa = causaDe(erro);

  useEffect(() => {
    console.error(`EstadoDeFalha (${causa}) ao carregar ${oQue}:`, erro);
  }, [causa, oQue, erro]);

  // A frase longa da causa "outra" existe para barrar o recadastro: a pessoa
  // leu a falha e não pode concluir que o cliente está vazio.
  const frases: Record<typeof causa, string> = {
    rede: 'Sem conexão com o servidor. Confira sua internet e tente de novo.',
    sessao: `Sua sessão expirou. Entre de novo para ver ${oQue}.`,
    outra: `Não foi possível carregar ${oQue}. Isso não quer dizer que ele não tenha nenhum — não cadastre de novo antes de conseguir ver a lista.\n${FECHO_SUPORTE}`,
  };

  return (
    <Card className="border-destructive/40">
      <CardContent className="py-12 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive/70" />
        <p className="mx-auto max-w-xl whitespace-pre-line text-sm font-medium text-destructive">
          {frases[causa]}
        </p>
        {causa === 'sessao' ? (
          // Recarregar reautentica pelo fluxo da casa e refaz a consulta.
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Entrar de novo
          </Button>
        ) : (
          aoTentarDeNovo && (
            <Button variant="outline" size="sm" className="mt-4" onClick={aoTentarDeNovo}>
              <RotateCw className="mr-2 h-4 w-4" />
              Tentar de novo
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
};

export default EstadoDeFalha;
