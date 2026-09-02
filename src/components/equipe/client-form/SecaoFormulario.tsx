// Seção numerada de formulário, no conceito das fichas da OSG.
//
// O formulário da OS era um bloco único de campos, e quem preenchia não tinha
// onde se apoiar. Aqui ele passa a ser dividido em etapas numeradas: o número em
// ciano dá o ritmo da leitura, o título em tom escuro contrasta com o fundo
// claro, e a barra à esquerda amarra visualmente os campos daquela etapa.
//
// A numeração é passada por quem usa, e não contada aqui: as seções podem ser
// condicionais, e uma contagem automática mudaria o número das outras ao
// aparecer ou sumir uma delas.
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { useAcentoArea } from './acentoArea';

export interface SecaoFormularioProps {
  /** Ordem da etapa, exibida com dois dígitos. */
  numero: number;
  titulo: string;
  /** Ação à direita do título, como o botão de escolher produtos. */
  acao?: ReactNode;
  /**
   * Há campo obrigatório em falta nesta etapa. O número e a barra passam para o
   * vermelho, e é isso que permite achar a falta com o formulário rolado: o
   * consultor vê qual etapa está acusando antes de chegar no campo.
   */
  pendente?: boolean;
  className?: string;
  children: ReactNode;
}

export default function SecaoFormulario({
  numero,
  titulo,
  acao,
  pendente,
  className,
  children,
}: SecaoFormularioProps) {
  const acento = useAcentoArea();
  return (
    // `min-w-0` não é enfeite: sem ele um conteúdo comprido dentro da seção
    // alarga o painel de detalhe inteiro e empurra os botões do cabeçalho para
    // fora da tela.
    <section className={cn('min-w-0 border-l-2 pl-4', pendente ? 'border-l-destructive' : acento.barra, className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h5 className="flex min-w-0 items-baseline gap-2">
          <span className={cn('shrink-0 text-xs font-bold tabular-nums', pendente ? 'text-destructive' : acento.texto)}>
            {String(numero).padStart(2, '0')}
          </span>
          <span className="truncate text-xs font-semibold uppercase tracking-wide text-foreground">
            {titulo}
          </span>
        </h5>
        {acao && <div className="shrink-0">{acao}</div>}
      </div>
      {children}
    </section>
  );
}
