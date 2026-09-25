import type React from 'react';

/**
 * O estado vazio que nomeia o próximo passo e o oferece (EX-36).
 *
 * Frase seca sem saída era o padrão ruim que o módulo carregava; o bom já
 * existia na caixa do meio de Órgãos de Governança, e este componente é ele
 * generalizado: título, uma linha que diz o que aquilo alimenta ou por que
 * preencher, e a ação que destrava. Todo vazio do módulo passa por aqui; a
 * EX-55 consome o mesmo componente em Rural, Documentos e Relatórios, e não
 * se escreve um segundo.
 */
export interface EstadoVazioProps {
  /** O que está vazio, na voz da tela: "Nenhum bem cadastrado para este cliente." */
  titulo: string;
  /** Uma linha: o que o cadastro alimenta, ou o primeiro passo de fato. */
  descricao?: string;
  /** A ação que destrava; sem ela o vazio não cumpre a regra do card. */
  acao: React.ReactNode;
  /** Ícone do domínio, opcional; sem ele a caixa segue sem. */
  icone?: React.ReactNode;
}

export const EstadoVazio = ({ titulo, descricao, acao, icone }: EstadoVazioProps) => (
  <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-osg-300 bg-osg-50/40 px-6 py-12 text-center">
    {icone}
    <p className="text-sm font-medium">{titulo}</p>
    {descricao && (
      <p className="max-w-lg text-sm text-muted-foreground">{descricao}</p>
    )}
    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
      {acao}
    </div>
  </div>
);

export default EstadoVazio;
