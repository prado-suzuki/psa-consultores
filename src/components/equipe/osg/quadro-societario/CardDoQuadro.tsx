import { useMemo, useState, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CabecalhoDoCard, cardDoQuadroCls, FaixaDeResumo, type ItemDoResumo } from './quadroKit';
import { montarFatias } from './fatiasDoQuadro';
import { RoscaDeParticipacao } from './RoscaDeParticipacao';
import { EsqueletoDoQuadro, TabelaSocios, type LinhaSocio } from './TabelaSocios';

// O card principal das duas visões do quadro — a Controladora e a Proprietária.
//
// Existe porque a ROSCA e a TABELA precisam de um dono em comum: o ponto
// colorido da linha e a fatia do anel são a mesma coisa vista duas vezes, e o
// destaque tem de atravessar da tabela (no corpo do card) para o resumo (no
// cabeçalho). Antes daqui as duas telas montavam à mão a mesma sequência de
// cabeçalho, faixa e tabela, e qualquer ajuste visual tinha de ser feito duas
// vezes; o que ainda difere entre elas — o título, os selos de estado e o
// comando de registro — continua vindo de fora, por props.

interface CardDoQuadroProps {
  titulo: ReactNode;
  /** Selos de estado e o comando de registro, à direita do título. */
  acoes?: ReactNode;
  itensDoResumo: ItemDoResumo[];
  nota?: ReactNode;
  linhas: LinhaSocio[];
  totalQuotas: number;
  capital: number;
  carregando?: boolean;
  /** O que aparece no lugar da tabela quando não há linha nenhuma. */
  vazio: ReactNode;
  /** Atraso da entrada (ms), na cascata da página. */
  delay?: number;
}

export const CardDoQuadro = ({
  titulo, acoes, itensDoResumo, nota, linhas, totalQuotas, capital,
  carregando, vazio, delay = 0,
}: CardDoQuadroProps) => {
  const [emFoco, setEmFoco] = useState<string | null>(null);

  const { fatias, corPorLinha } = useMemo(() => montarFatias(linhas), [linhas]);
  const temRosca = !carregando && fatias.length > 0 && fatias.some((f) => f.percentual > 0);
  // A primeira fatia é a maior: `montarFatias` devolve em ordem decrescente.
  // Quem controla a sociedade é a pergunta que se faz ao abrir o quadro, e
  // antes daqui ela exigia comparar a coluna de percentual linha a linha.
  const maior = temRosca && fatias.length > 1 ? fatias[0] : null;

  return (
    <Card
      className={cn(cardDoQuadroCls, 'animate-osg-rise motion-reduce:animate-none')}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CabecalhoDoCard
        icone={<Users className="h-4 w-4 text-muted-foreground" />}
        titulo={titulo}
        acoes={acoes}
        apoio={
          <FaixaDeResumo
            itens={itensDoResumo}
            nota={nota}
            destaque={
              maior ? (
                <button
                  type="button"
                  onMouseEnter={() => setEmFoco(maior.chave)}
                  onMouseLeave={() => setEmFoco(null)}
                  onFocus={() => setEmFoco(maior.chave)}
                  onBlur={() => setEmFoco(null)}
                  className={cn(
                    'hidden shrink-0 items-center gap-2.5 rounded-md border px-3 py-2 text-left transition-colors lg:flex',
                    emFoco === maior.chave
                      ? 'border-osg-300 bg-background'
                      : 'border-osg-200/70 bg-background/50',
                  )}
                >
                  <span
                    aria-hidden
                    className="h-7 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: maior.cor }}
                  />
                  <span className="min-w-0">
                    <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Maior participação
                    </span>
                    <span className="block max-w-[15rem] truncate text-sm font-semibold text-osg-700">
                      {maior.nome}
                      <span className="ml-1.5 tabular-nums text-muted-foreground">
                        {maior.percentual.toLocaleString('pt-BR', {
                          minimumFractionDigits: 1, maximumFractionDigits: 1,
                        })}%
                      </span>
                    </span>
                  </span>
                </button>
              ) : undefined
            }
            grafico={
              temRosca ? (
                <RoscaDeParticipacao
                  fatias={fatias}
                  emFoco={emFoco}
                  onFoco={setEmFoco}
                  legenda={linhas.length === 1 ? '1 sócio' : `${linhas.length} sócios`}
                />
              ) : undefined
            }
          />
        }
      />
      <CardContent>
        {carregando ? (
          <EsqueletoDoQuadro />
        ) : (
          <TabelaSocios
            linhas={linhas}
            totalQuotas={totalQuotas}
            capital={capital}
            vazio={vazio}
            corPorLinha={corPorLinha}
            emFoco={emFoco}
            onFoco={setEmFoco}
          />
        )}
      </CardContent>
    </Card>
  );
};
