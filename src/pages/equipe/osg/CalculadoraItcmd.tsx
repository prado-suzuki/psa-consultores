import { AlertTriangle, Calculator } from 'lucide-react';
import { OsgLayout } from '@/components/equipe/osg/OsgLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fieldCls, FieldSection, labelCls } from '@/components/equipe/osg/formKit';
import { AcervoImoveis } from '@/components/equipe/osg/calculadora-itcmd/AcervoImoveis';
import { DistribuicaoDasQuotas } from '@/components/equipe/osg/calculadora-itcmd/DistribuicaoDasQuotas';
import { ParticipantesDaDoacao } from '@/components/equipe/osg/calculadora-itcmd/ParticipantesDaDoacao';
import { QuadroDeSaida } from '@/components/equipe/osg/calculadora-itcmd/QuadroDeSaida';
import { SociedadeEQuotas } from '@/components/equipe/osg/calculadora-itcmd/SociedadeEQuotas';
import { brlDeDecimal } from '@/components/equipe/osg/calculadora-itcmd/itcmdFmt';
import { useCalculadoraItcmdController } from '@/hooks/useCalculadoraItcmdController';
import { formatMoney } from '@/lib/osg/itcmd/dinheiro';
import { upfDaCompetencia } from '@/lib/osg/itcmd/faixas';

/**
 * Calculadora de ITCD/MT — doação de quotas, base integral, três cenários de
 * avaliação, imposto discriminado por donatário.
 *
 * A tela é a cadeia do FLUXO em sete blocos, na ordem em que o cálculo acontece.
 * Nada aqui é digitado no código: cada número vem do cadastro (imóveis, quadro
 * societário, pessoas) ou do motor em `src/lib/osg/itcmd/`.
 *
 * Sem persistência nesta etapa: o estado é React. A simulação exibe a UPF que
 * usou porque UPF nova não recalcula simulação emitida (SPEC §3.1) — quando a
 * persistência entrar, é essa UPF que se congela junto.
 */
const CalculadoraItcmd = () => {
  const calc = useCalculadoraItcmdController();

  return (
    <OsgLayout
      title="Calculadora de ITCD"
      subtitle="Doação de quotas — base integral, três cenários de avaliação, por donatário"
    >
      {!calc.clienteId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Calculator className="mx-auto mb-3 h-10 w-10 opacity-50" />
            <p className="text-sm">
              Selecione um cliente na barra acima para apurar o ITCD da doação de quotas.
            </p>
          </CardContent>
        </Card>
      ) : calc.erroDeConsulta ? (
        <Card>
          <CardContent className="py-10">
            <div className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                Falha ao ler o cadastro do cliente: {calc.erroDeConsulta.message}
              </span>
            </div>
          </CardContent>
        </Card>
      ) : calc.carregando ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Carregando...
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <FieldSection
              number="01"
              title="Imóveis do acervo"
              hint="Cadastro — Diagnóstico Patrimonial"
            >
              <AcervoImoveis
                imoveis={calc.imoveis}
                acervo={calc.acervo}
                bensForaDoAcervo={calc.bensForaDoAcervo}
              />
            </FieldSection>

            <FieldSection number="02" title="Sociedade" hint="Cadastro — Quadro Societário">
              <SociedadeEQuotas
                empresas={calc.empresas}
                empresa={calc.empresa}
                onEscolherEmpresa={calc.setEmpresaEscolhida}
                socios={calc.socios}
                totalDeQuotas={calc.totalDeQuotas}
              />
            </FieldSection>

            <FieldSection
              number="03"
              title="Participantes"
              hint="O cadastro propõe, o analista confirma"
            >
              <ParticipantesDaDoacao calc={calc} />
            </FieldSection>

            <FieldSection
              number="04"
              title="Distribuição e doação anterior"
              hint="Legítima calculada; disponível e doação anterior são do analista"
            >
              <DistribuicaoDasQuotas calc={calc} />
            </FieldSection>

            <FieldSection number="05" title="Competência da UPF" hint="A do mês da simulação">
              <CompetenciaDaUpf calc={calc} />
            </FieldSection>

            <FieldSection number="06" title="Quadro de saída" hint="Base e ITCD por donatário">
              <QuadroDeSaida
                saida={calc.saida}
                erro={calc.erro}
                acervo={calc.acervo}
                distribuicaoFecha={calc.distribuicaoFecha}
              />
            </FieldSection>
          </CardContent>
        </Card>
      )}
    </OsgLayout>
  );
};

/**
 * A UPF aplicável é a do mês da simulação. A série NÃO é linear (de março a maio
 * de 2026 o passo quadruplica), então competência sem UPF publicada não é
 * estimada: a tela abre na mais recente e avisa.
 */
function CompetenciaDaUpf({ calc }: { calc: ReturnType<typeof useCalculadoraItcmdController> }) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end">
      <div className="w-full max-w-xs space-y-1.5">
        <Label className={labelCls}>Competência</Label>
        <Select value={calc.competencia} onValueChange={calc.setCompetencia}>
          <SelectTrigger className={fieldCls}><SelectValue /></SelectTrigger>
          <SelectContent>
            {calc.competencias.map((c) => (
              <SelectItem key={c} value={c}>
                <span className="font-mono">{c}</span>
                <span className="ml-2 text-muted-foreground">{upfEmReais(c)}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        UPF de {calc.competencia}:{' '}
        <span className="font-mono font-semibold">{upfEmReais(calc.competencia)}</span>
        {calc.upfDoMesCorrenteAusente && (
          <span className="mt-1 block text-amber-700">
            O mês corrente ({calc.competenciaDoMesCorrente}) não tem UPF publicada na série.
            A série não é linear e não se extrapola — confirme a competência antes de usar
            o quadro.
          </span>
        )}
      </p>
    </div>
  );
}

// A UPF sai da série do motor; a tela só formata o que ele devolve. A lista de
// competências vem de `competenciasDisponiveis()`, então toda entrada resolve.
const upfEmReais = (competencia: string): string =>
  brlDeDecimal(formatMoney(upfDaCompetencia(competencia)));

export default CalculadoraItcmd;
