import { brlDeDecimal, pctDeDecimal } from './itcmdFmt';
import { ComDica, ComoDicas, LinhaDeTotal, LinhaDeValor, Secao } from './itcmdKit';
import {
  CENARIOS, DICA_CENARIO, ROTULO_CENARIO, type Cenario, type SaidaSimulacao,
} from '@/lib/osg/itcmd/simulacao';

/**
 * Um quadro por cenário de avaliação, no formato do resumo de tributos que a OSG
 * apresenta.
 *
 * A ordem de leitura é de cima para baixo: total do acervo, alíquota,
 * base de cada donatário, imposto de cada donatário e o TOTAL por último. O total
 * fecha o quadro porque é a conclusão — botá-lo gigante no topo empurrava o título
 * para duas linhas e obrigava a ler de baixo para cima para entender de onde veio.
 *
 * Cenário sem valor no cadastro fica tracejado e diz o motivo. `—` nunca é R$ 0,00.
 */
export function CenariosEmColunas({ saida, instituicao, total }: {
  saida: SaidaSimulacao;
  /**
   * A apuração da INSTITUIÇÃO DE USUFRUTO, quando houver. Ato próprio, guia própria,
   * imposto próprio — e o cliente compara o TOTAL dos dois: o deck do Agro Aliança
   * escolheu um cenário "por apresentar o menor custo tributário total".
   */
  instituicao?: SaidaSimulacao | null;
  total?: Record<Cenario, string | null>;
}) {
  return (
    <ComoDicas>
      <div className="grid gap-4 lg:grid-cols-3">
        {CENARIOS.map((cenario, ordem) => (
          <QuadroDoCenario
            key={cenario}
            cenario={cenario}
            ordem={ordem}
            saida={saida}
            instituicao={instituicao ?? null}
            total={total?.[cenario] ?? null}
          />
        ))}
      </div>
    </ComoDicas>
  );
}

function QuadroDoCenario({ cenario, ordem, saida, instituicao, total }: {
  cenario: Cenario;
  /** Posição na fila, só para a entrada em cascata. */
  ordem: number;
  saida: SaidaSimulacao;
  instituicao: SaidaSimulacao | null;
  total: string | null;
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
          ? 'border-dashed border-osg-200/70 bg-muted/50'
          : 'border-osg-100 bg-card'
      }`}
    >
      <h3 className="border-b border-osg-100 bg-osg-50/60 px-3 py-2 text-sm font-semibold text-osg-700">
        <ComDica dica={DICA_CENARIO[cenario]}>{ROTULO_CENARIO[cenario]}</ComDica>
      </h3>

      {indisponivel ? (
        <p className="px-3 py-6 text-sm text-muted-foreground">
          Não há valor {cenario === 'itr' ? 'de ITR' : 'de mercado'} nas matrículas dos
          imóveis deste cliente. O cenário fica de fora até alguém preencher: em branco,
          nunca zerado.
        </p>
      ) : (
        <dl className="divide-y divide-osg-100/70">
          <LinhaDeValor
            rotulo="Total do acervo"
            valor={brlDeDecimal(saida.acervoPorCenario[cenario])}
            dica={'O acervo avaliado por esta régua. É ele que dá o preço da quota, e é '
              + 'a única coisa que muda de um cenário para o outro.'}
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

          <Secao>ITCD devido</Secao>
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
                rotulo="ITCD da doação"
                valor={brlDeDecimal(saida.totaisPorCenario[cenario])}
              />
              <LinhaDeValor
                rotulo="ITCD da instituição"
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
