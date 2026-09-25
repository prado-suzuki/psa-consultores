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
 *
 * FRAME PADRÃO, decisão da Patrícia de 25/09: largura total do card que o
 * abriga, borda PONTILHADA de espessura única (`border border-dashed
 * border-osg-300`), fundo `bg-osg-50/40`, `rounded-xl`, `px-6 py-12`. Nenhuma
 * tela nova do módulo inventa caixa própria de vazio: consome este componente
 * ou, havendo layout próprio (disco de ícone, halo), copia estas classes.
 * Nada de borda sólida nem `rounded-2xl` em vazio de página.
 */
export interface EstadoVazioProps {
  /** O que está vazio, na voz da tela: "Nenhum bem cadastrado para este cliente." */
  titulo: string;
  /** Uma linha: o que o cadastro alimenta, ou o primeiro passo de fato. */
  descricao?: string;
  /**
   * A ação que destrava. Obrigatória no vazio de LISTA (a regra do EX-36);
   * opcional quando o vazio é de pré-requisito, como "selecione um cliente",
   * onde a ação mora na barra e não há botão a oferecer.
   */
  acao?: React.ReactNode;
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
    {acao && (
      <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
        {acao}
      </div>
    )}
  </div>
);

export default EstadoVazio;