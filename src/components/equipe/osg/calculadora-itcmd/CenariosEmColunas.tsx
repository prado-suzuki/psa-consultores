import { useState } from 'react';
import type { BaseDeCalculo } from '@/hooks/useSimulacoesItcmd';
import { brlDeDecimal, pctDeDecimal } from './itcmdFmt';
import { ComDica, ComoDicas, LinhaDeTotal, LinhaDeValor, Secao } from './itcmdKit';
import { AvisoDeParcelaDiferida, VerNaBase } from './SelecaoDaBase';
import {
  CENARIOS, DICA_CENARIO, ROTULO_CENARIO, type Cenario, type SaidaSimulacao,
} from '@/lib/osg/itcmd/simulacao';

/**
 * Um quadro por cenário, na ordem do resumo de tributos da OSG, com o TOTAL por último. Cenário sem valor
 * fica tracejado com o motivo: `—` nunca é R$ 0,00. As duas bases se alternam na simulação aberta.
 */
export function CenariosEmColunas({ porBase, comAlternativa, falta }: {
  /** O ato em cada base: a doação, a instituição de usufruto (guia própria) e o TOTAL dos dois, que o cliente compara. */
  porBase: Record<BaseDeCalculo, {
    doacao: SaidaSimulacao | null;
    instituicao: SaidaSimulacao | null;
    total: Record<Cenario, string | null>;
  }>;
  /** Os atos que têm a base de 70% ("reserva", "instituição"). Vazio: só há a integral. */
  comAlternativa: string[];
  /**
   * O QUE FALTA em cada cenário, na frase que o controlador monta — a MESMA do aviso
   * do topo. Sem isso o quadro afirmava por conta própria, e afirmava errado.
   */
  falta?: Record<Cenario, string | null>;
}) {
  const [base, setBase] = useState<BaseDeCalculo>('100');
  const vista = porBase[base].doacao ? porBase[base] : porBase['100'];
  if (vista.doacao == null) return null;
  const saida = vista.doacao;
  return (
    <ComoDicas>
      <div className="space-y-3">
        {comAlternativa.length > 0 && <VerNaBase valor={base} aoTrocar={setBase} />}
        {base === '70' && comAlternativa.map((onde) => (
          <AvisoDeParcelaDiferida key={onde} onde={onde} />
        ))}
        <div className="grid gap-4 lg:grid-cols-3">
          {CENARIOS.map((cenario, ordem) => (
            <QuadroDoCenario
              key={cenario}
              cenario={cenario}
              ordem={ordem}
              saida={saida}
              instituicao={vista.instituicao}
              total={vista.total[cenario]}
              falta={falta?.[cenario] ?? null}
            />
          ))}
        </div>
      </div>
    </ComoDicas>
  );
}

function QuadroDoCenario({ cenario, ordem, saida, instituicao, total, falta }: {
  cenario: Cenario;
  /** Posição na fila, só para a entrada em cascata. */
  ordem: number;
  saida: SaidaSimulacao;
  instituicao: SaidaSimulacao | null;
  total: string | null;
  falta: string | null;
}) {
  const indisponivel = saida.cenariosIndisponiveis.includes(cenario);

  return (
    /* ENTRADA EM CASCATA — 70ms entre um cartão e o seguinte. Os três nascem juntos
       de um clique só, e chegar tudo de uma vez não diz que são TRÊS LEITURAS do
       mesmo ato; escalonado, o olho percorre a fila na ordem em que se compara.
       O `both` do `osg-rise` segura o estado inicial durante o atraso — sem ele o
       cartão apareceria pronto e só então animaria. */
    <section
      style={{ animationDelay: `${ordem * 70}ms` }}
      className={`animate-osg-rise overflow-hidden rounded-lg border motion-reduce:animate-none ${
        indisponivel
          // `bg-muted` cheio, e não `/50`, desde 12/09/2026: o cartão desceu
          // para 35% de `--muted` (ver `ui/card.tsx`) e o par ia colapsar —
          // 35% contra 50% da MESMA tinta é a mesma coluna duas vezes. O que
          // separa cenário indisponível de cenário disponível é o degrau, e ele
          // voltou a ser um degrau.
          ? 'border-dashed border-border bg-muted'
          : 'border-border bg-superficie-cartao'
      }`}
    >
      <h3 className="border-b border-border bg-osg-50/60 px-3 py-2 text-sm font-semibold text-osg-700">
        <ComDica dica={DICA_CENARIO[cenario]}>{ROTULO_CENARIO[cenario]}</ComDica>
      </h3>

      {indisponivel ? (
        <p className="px-3 py-6 text-sm text-muted-foreground">
          {/* A FRASE VEM DO CONTROLADOR, a mesma do aviso do topo. Aqui havia texto
              fixo dizendo que não havia valor nas matrículas do cliente, e ele passou a
              mentir quando o cenário virou indisponível por bem FALTANDO em vez de por
              cadastro vazio: o aviso dizia "3 de 13 bens sem valor de ITR" e este
              parágrafo, ao lado, dizia que não havia nenhum. */}
          {falta ?? 'Cadastro incompleto neste valor'}. Este valor fica de fora até o
          cadastro dos bens fechar.
        </p>
      ) : (
        <dl className="divide-y divide-border/70">
          <LinhaDeValor
            rotulo="Total do acervo"
            valor={brlDeDecimal(saida.acervoPorCenario[cenario])}
            dica={'O acervo avaliado por esta régua. É ele que dá o preço da quota, e é '
              + 'a única coisa que muda de um valor de avaliação para o outro.'}
          />
          <LinhaDeValor
            rotulo="Alíquota"
            valor="2% a 8%"
            dica={'Progressiva por faixas de UPF. A calculadora aplica a fórmula '
              + 'fechada (alíquota da faixa menos a dedução), que dá ao centavo o mesmo '
              + 'resultado do demonstrativo faixa por faixa da SEFAZ.'}
          />

          <Secao>Base de cálculo</Secao>
          {saida.linhas.map((l) => (
            <LinhaDeValor
              key={`base-${l.donatarioId}`}
              rotulo={l.nome}
              detalhe={pctDeDecimal(l.percentualDoAto)}
              valor={brlDeDecimal(l.porCenario[cenario]?.base)}
            />
          ))}

          <Secao>ITCMD devido</Secao>
          {saida.linhas.map((l) => (
            <LinhaDeValor
              key={`imposto-${l.donatarioId}`}
              rotulo={l.nome}
              detalhe={l.doacaoAnterior
                ? `já recebeu ${brlDeDecimal(l.doacaoAnterior)}`
                : undefined}
              valor={brlDeDecimal(l.porCenario[cenario]?.imposto)}
            />
          ))}

          {/* SEM INSTITUIÇÃO o total é o da doação, e nada muda. COM instituição o
              quadro mostra as duas parcelas e soma — porque é o total que decide entre
              caminhos, e mostrar só a doação seria mostrar metade da conta. */}
          {instituicao == null ? (
            <LinhaDeTotal
              rotulo="Total"
              valor={brlDeDecimal(saida.totaisPorCenario[cenario])}
              dica="Só a doação: este ato não tem guia de instituição de usufruto."
            />
          ) : (
            <>
              <Secao>Instituição de usufruto</Secao>
              {instituicao.gias.map((g) => (
                <LinhaDeValor
                  key={`inst-${g.doadorId}>${g.donatarioId}`}
                  rotulo={`${g.doadorNome} → ${g.donatarioNome}`}
                  valor={brlDeDecimal(g.porCenario[cenario]?.imposto)}
                />
              ))}
              <LinhaDeValor
                rotulo="ITCMD da doação"
                valor={brlDeDecimal(saida.totaisPorCenario[cenario])}
              />
              <LinhaDeValor
                rotulo="ITCMD da instituição"
                valor={brlDeDecimal(instituicao.totaisPorCenario[cenario])}
              />
              <LinhaDeTotal
                rotulo="Total do ato"
                valor={brlDeDecimal(total ?? saida.totaisPorCenario[cenario])}
                dica={'Doação MAIS instituição de usufruto. É este número que compara '
                  + 'caminhos: a reserva não tem guia própria, ela já mudou a base da '
                  + 'doação.'}
              />
            </>
          )}
        </dl>
      )}
    </section>
  );
}
