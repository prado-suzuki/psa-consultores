import { AlertTriangle, Calculator, Plus } from 'lucide-react';
import { useState } from 'react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Button } from '@/components/ui/button';
import { CenariosEmColunas } from '@/components/equipe/osg/calculadora-itcmd/CenariosEmColunas';
import { HistoricoDeSimulacoes } from '@/components/equipe/osg/calculadora-itcmd/HistoricoDeSimulacoes';
import { NovaSimulacaoModal } from '@/components/equipe/osg/calculadora-itcmd/NovaSimulacaoModal';
import { SimulacaoAberta } from '@/components/equipe/osg/calculadora-itcmd/SimulacaoAberta';
import { brlDeDecimal, quotasDeBigint } from '@/components/equipe/osg/calculadora-itcmd/itcmdFmt';
import { useCalculadoraItcmdController } from '@/hooks/useCalculadoraItcmdController';
import type { StatusDaSimulacao } from '@/hooks/useSimulacoesItcmd';

/**
 * Calculadora de ITCD/MT — doação de quotas, base integral, três cenários de
 * avaliação, imposto por donatário.
 *
 * A tela é o HISTÓRICO: abre com todas as simulações gravadas do cliente, uma por
 * linha, e cada uma expande para os três cenários. Montar uma nova acontece no modal,
 * no padrão dos outros da OSG.
 *
 * Era um seletor de versão no cabeçalho, com as versões vivendo em memória e morrendo
 * ao recarregar a página. Agora cada geração é uma linha em `itcd_simulacao`, com o
 * retrato inteiro — e abrir uma simulação antiga é LER, nunca reapurar.
 *
 * O acervo de imóveis NÃO aparece aqui: quem confere valor de imóvel é o
 * Diagnóstico Patrimonial, que já existe. Repetir a lista era ruído.
 */
const CalculadoraItcmd = () => {
  const calc = useCalculadoraItcmdController();
  const [statusFiltrado, setStatusFiltrado] = useState<StatusDaSimulacao | null>(null);
  /**
   * QUAL SIMULACAO ESTA ABERTA, por id e nao por objeto: a lista se reconsulta a cada
   * troca de status ou de nome, e guardar o objeto congelaria a tela aberta no retrato
   * anterior — o status mudaria na lista e nao no cabecalho.
   */
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const aberta = calc.historicoSalvo.find((s) => s.id === abertaId) ?? null;

  if (!calc.clienteId) {
    return (
      <Molde>
        <Vazio icone={<Calculator className="mx-auto mb-3 h-10 w-10 opacity-40" />}>
          Selecione um cliente na barra acima para apurar o ITCD da doação de quotas.
        </Vazio>
      </Molde>
    );
  }

  if (calc.erroDeConsulta) {
    return (
      <Molde>
        <Vazio icone={<AlertTriangle className="mx-auto mb-3 h-10 w-10 text-destructive" />}>
          {calc.erroDeConsulta.message}
        </Vazio>
      </Molde>
    );
  }

  // A simulação desta sessão só aparece à parte quando NÃO foi gravada — aí ela não
  // está na lista, e sumir de vista depois de gerada seria pior que repetir.
  const naSessao = calc.motivoDeNaoGravar ? calc.simulacaoGerada : null;

  const acoes = (
    <Button onClick={calc.abrirPainel} className="gap-1.5">
      <Plus className="h-4 w-4" />
      Nova simulação
    </Button>
  );

  return (
    <Molde acoes={acoes}>
      <div className="space-y-5">
        {calc.erroDoHistorico && (
          <p className="text-sm text-destructive">{calc.erroDoHistorico.message}</p>
        )}
        {calc.erroDeGravacao && (
          <p className="text-sm text-destructive">
            {'Simulação não gravada: '}
            {calc.erroDeGravacao.message}
          </p>
        )}
        {calc.erroDoStatus && (
          <p className="text-sm text-destructive">
            {'Status não alterado: '}
            {calc.erroDoStatus.message}
          </p>
        )}
        {calc.erroDeRenomear && (
          <p className="text-sm text-destructive">
            {'Nome não alterado: '}
            {calc.erroDeRenomear.message}
          </p>
        )}

        <HistoricoDeSimulacoes
          simulacoes={calc.historicoSalvo}
          carregando={calc.carregandoHistorico}
          statusFiltrado={statusFiltrado}
          aoFiltrarStatus={setStatusFiltrado}
          aoAbrir={setAbertaId}
        />

        {naSessao && (
          <div className="space-y-3">
            <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-sm text-amber-800">
              {calc.motivoDeNaoGravar}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-lg border border-slate-200 bg-card px-4 py-3 text-sm">
              <Dado rotulo="Sociedade" valor={naSessao.empresaNome} />
              <Dado rotulo="Quotas" valor={quotasDeBigint(BigInt(naSessao.totalDeQuotas))} mono />
              <Dado
                rotulo="UPF"
                valor={`${brlDeDecimal(naSessao.saida.upf)} · ${naSessao.saida.competencia}`}
                mono
              />
              <Dado rotulo="Doa" valor={naSessao.doadores.join(', ') || '—'} />
            </div>
            <CenariosEmColunas
              saida={naSessao.saida}
              instituicao={calc.saidaDaInstituicao}
              total={calc.impostoTotalPorCenario}
            />
          </div>
        )}

        {calc.gravando && (
          <p className="text-xs text-slate-500">Gravando a simulação…</p>
        )}
      </div>

      <SimulacaoAberta
        simulacao={aberta}
        todas={calc.historicoSalvo}
        aoFechar={() => setAbertaId(null)}
        aoAlterarStatus={calc.alterarStatus}
        alterando={calc.alterandoStatus}
        aoRenomear={calc.renomear}
        renomeando={calc.renomeando}
      />

      <NovaSimulacaoModal calc={calc} />
    </Molde>
  );
};

function Molde({ children, acoes }: {
  children: React.ReactNode;
  acoes?: React.ReactNode;
}) {
  return (
    <OsgLayout
      title="Calculadora de ITCD"
      subtitle="Doação de quotas — base integral, três cenários de avaliação, por donatário"
      headerActions={acoes}
    >
      {children}
    </OsgLayout>
  );
}

function Dado({ rotulo, valor, mono }: { rotulo: string; valor: string; mono?: boolean }) {
  return (
    <span>
      <span className="text-xs uppercase tracking-wide text-slate-500">{rotulo}</span>{' '}
      <span className={mono ? 'font-mono tabular-nums font-medium' : 'font-medium'}>
        {valor}
      </span>
    </span>
  );
}

function Vazio({ icone, children }: { icone: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 px-6 py-14 text-center">
      {icone}
      <p className="mx-auto max-w-md text-sm text-slate-600">{children}</p>
    </div>
  );
}

export default CalculadoraItcmd;
