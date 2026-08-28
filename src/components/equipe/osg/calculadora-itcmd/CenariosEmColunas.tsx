import { brlDeDecimal, pctDeDecimal } from './itcmdFmt';
import { CENARIOS, ROTULO_CENARIO, type Cenario, type SaidaSimulacao } from '@/lib/osg/itcmd/simulacao';

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
    <div className="grid gap-4 lg:grid-cols-3">
      {CENARIOS.map((cenario) => (
        <QuadroDoCenario
          key={cenario}
          cenario={cenario}
          saida={saida}
          instituicao={instituicao ?? null}
          total={total?.[cenario] ?? null}
        />
      ))}
    </div>
  );
}

function QuadroDoCenario({ cenario, saida, instituicao, total }: {
  cenario: Cenario;
  saida: SaidaSimulacao;
  instituicao: SaidaSimulacao | null;
  total: string | null;
}) {
  const indisponivel = saida.cenariosIndisponiveis.includes(cenario);

  return (
    <section
      className={`overflow-hidden rounded-lg border ${
        indisponivel
          ? 'border-dashed border-slate-200 bg-slate-50/60'
          : 'border-osg-100 bg-card'
      }`}
    >
      <h3 className="border-b border-osg-100 bg-osg-50/60 px-4 py-2.5 text-sm font-semibold text-osg-800">
        {ROTULO_CENARIO[cenario]}
      </h3>

      {indisponivel ? (
        <p className="px-4 py-6 text-sm text-slate-500">
          Não há valor {cenario === 'itr' ? 'de ITR' : 'de mercado'} nas matrículas dos
          imóveis deste cliente. O cenário fica de fora até alguém preencher — em branco,
          nunca zerado.
        </p>
      ) : (
        <dl className="divide-y divide-slate-100">
          <Linha rotulo="Total do acervo" valor={brlDeDecimal(saida.acervoPorCenario[cenario])} />
          <Linha rotulo="Alíquota" valor="2% a 8%" />

          <Secao>Base de cálculo</Secao>
          {saida.linhas.map((l) => (
            <Linha
              key={`base-${l.donatarioId}`}
              rotulo={l.nome}
              detalhe={pctDeDecimal(l.percentualDoAto)}
              valor={brlDeDecimal(l.porCenario[cenario]?.base)}
            />
          ))}

          <Secao>ITCD devido</Secao>
          {saida.linhas.map((l) => (
            <Linha
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
            <div className="flex items-baseline justify-between gap-3 bg-osg-50/60 px-4 py-3">
              <dt className="text-sm font-semibold uppercase tracking-wide text-osg-800">
                Total
              </dt>
              <dd className="font-mono text-base font-semibold tabular-nums text-osg-900">
                {brlDeDecimal(saida.totaisPorCenario[cenario])}
              </dd>
            </div>
          ) : (
            <>
              <Secao>Instituição de usufruto</Secao>
              {instituicao.gias.map((g) => (
                <Linha
                  key={`inst-${g.doadorId}>${g.donatarioId}`}
                  rotulo={`${g.doadorNome} → ${g.donatarioNome}`}
                  valor={brlDeDecimal(g.porCenario[cenario]?.imposto)}
                />
              ))}
              <Linha
                rotulo="ITCD da doação"
                valor={brlDeDecimal(saida.totaisPorCenario[cenario])}
              />
              <Linha
                rotulo="ITCD da instituição"
                valor={brlDeDecimal(instituicao.totaisPorCenario[cenario])}
              />
              <div className="flex items-baseline justify-between gap-3 bg-osg-50/60 px-4 py-3">
                <dt className="text-sm font-semibold uppercase tracking-wide text-osg-800">
                  Total do ato
                </dt>
                <dd className="font-mono text-base font-semibold tabular-nums text-osg-900">
                  {brlDeDecimal(total ?? saida.totaisPorCenario[cenario])}
                </dd>
              </div>
            </>
          )}
        </dl>
      )}
    </section>
  );
}

function Linha({ rotulo, detalhe, valor }: {
  rotulo: string;
  detalhe?: string;
  valor: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-4 py-2">
      <dt className="min-w-0 text-sm text-slate-700">
        <span className="break-words">{rotulo}</span>
        {detalhe && <span className="ml-1.5 text-xs text-slate-500">{detalhe}</span>}
      </dt>
      <dd className="shrink-0 font-mono text-sm tabular-nums text-slate-900">{valor}</dd>
    </div>
  );
}

const Secao = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-slate-50 px-4 py-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
    {children}
  </div>
);
