import { Check, Pencil, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { fieldCls } from '@/components/equipe/osg/formKit';
import { brlDeDecimal, pctDeDecimal, quotasDeBigint, TRACO } from './itcmdFmt';
import { CENARIOS, ROTULO_CENARIO, type Cenario } from '@/lib/osg/itcmd/simulacao';
import {
  ROTULO_DO_STATUS, STATUS_DA_SIMULACAO, cadeiaDe, rotuloDaSimulacao, totalDaCadeia,
  type SimulacaoSalva, type StatusDaSimulacao,
} from '@/hooks/useSimulacoesItcmd';

/**
 * UMA SIMULAÇÃO ABERTA — o registro de execução de um cenário.
 *
 * Era uma linha que expandia para baixo, dentro da tabela do histórico: o quadro e os
 * três cenários entravam numa célula com `colSpan`, comprimidos na largura da lista, e
 * abrir a segunda empurrava a primeira para fora da tela. Aqui a simulação tem a tela
 * inteira, e a lista continua sendo lista.
 *
 * ABRIR É LER. Todo número desta tela sai da linha gravada — nada chama o motor. Se a
 * lei, a UPF ou a apuração mudarem, o que foi ao cliente continua sendo o que foi.
 * As duas únicas coisas editáveis são as que NÃO são fato tributário: o nome e o
 * status.
 *
 * AS TRÊS ABAS são as três perguntas do ato, na ordem em que se responde:
 * quem recebe as quotas (Doação) · quem fica com o voto (Usufruto) · quanto se paga
 * (Cálculo do ITCD).
 */
export function SimulacaoAberta({
  simulacao, todas, aoFechar, aoAlterarStatus, alterando, aoRenomear, renomeando,
}: {
  simulacao: SimulacaoSalva | null;
  /** O histórico inteiro: é dele que a CADEIA desta simulação é remontada. */
  todas: SimulacaoSalva[];
  aoFechar: () => void;
  aoAlterarStatus: (id: string, status: StatusDaSimulacao) => void;
  alterando: boolean;
  aoRenomear: (id: string, nome: string) => void;
  renomeando: boolean;
}) {
  return (
    <Dialog open={simulacao != null} onOpenChange={(a) => !a && aoFechar()}>
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-visible p-0 sm:[clip-path:none] 2xl:max-w-[88rem]">
        {simulacao && (
          <Corpo
            simulacao={simulacao}
            todas={todas}
            aoAlterarStatus={aoAlterarStatus}
            alterando={alterando}
            aoRenomear={aoRenomear}
            renomeando={renomeando}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function Corpo({
  simulacao, todas, aoAlterarStatus, alterando, aoRenomear, renomeando,
}: {
  simulacao: SimulacaoSalva;
  todas: SimulacaoSalva[];
  aoAlterarStatus: (id: string, status: StatusDaSimulacao) => void;
  alterando: boolean;
  aoRenomear: (id: string, nome: string) => void;
  renomeando: boolean;
}) {
  return (
    <>
      <div className="shrink-0 space-y-3 rounded-t-lg border-b border-slate-100 bg-background px-6 pb-4 pt-5">
        <DialogHeader className="space-y-0 text-left">
          <DialogTitle asChild>
            <NomeEditavel
              simulacao={simulacao}
              aoRenomear={aoRenomear}
              renomeando={renomeando}
            />
          </DialogTitle>
        </DialogHeader>

        {/* O QUE O RETRATO CONGELOU, numa linha: é o que faz dois cenários do mesmo
            cliente serem comparáveis — ou não, se a competência mudou. */}
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <Dado rotulo="Gerada em" valor={dataHora(simulacao.criadaEm)} />
          <Dado rotulo="Competência" valor={simulacao.competencia} mono />
          <Dado rotulo="UPF" valor={brlDeDecimal(simulacao.upf)} mono />
          <Dado
            rotulo="Quotas"
            valor={quotasDeBigint(BigInt(simulacao.totalDeQuotas))}
            mono
          />
          <Dado rotulo="Versão" valor={String(simulacao.versao)} mono />

          {/* O STATUS é o único controle do cabeçalho: é a decisão sobre a simulação,
              não um dado dela. Aprovar é o portão antes de a apresentação sair. */}
          <div className="ml-auto space-y-1">
            <span className="block text-xs uppercase tracking-wide text-slate-500">
              Status
            </span>
            <Select
              value={simulacao.status}
              disabled={alterando}
              onValueChange={(v) => aoAlterarStatus(simulacao.id, v as StatusDaSimulacao)}
            >
              <SelectTrigger
                className={`${fieldCls} h-9 w-[170px]`}
                aria-label="Status da simulação"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_DA_SIMULACAO.map((s) => (
                  <SelectItem key={s} value={s}>{ROTULO_DO_STATUS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Tabs defaultValue="doacao" className="flex min-h-0 flex-1 flex-col">
        <div className="shrink-0 px-6 pt-4">
          <TabsList>
            <TabsTrigger value="doacao">Doação</TabsTrigger>
            <TabsTrigger value="usufruto">Usufruto</TabsTrigger>
            <TabsTrigger value="itcd">Cálculo do ITCD</TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">
          <TabsContent value="doacao" className="mt-0">
            <QuadroDaDoacao simulacao={simulacao} />
          </TabsContent>
          <TabsContent value="usufruto" className="mt-0">
            <QuadroDoUsufruto simulacao={simulacao} />
          </TabsContent>
          <TabsContent value="itcd" className="mt-0 space-y-4">
            <TresCenarios simulacao={simulacao} />
            <ACadeia simulacao={simulacao} todas={todas} />
          </TabsContent>
        </div>
      </Tabs>
    </>
  );
}

/**
 * O NOME, com o lápis ao lado. Sem nome dado, mostra o rótulo da versão — e o campo
 * abre VAZIO, com esse rótulo como placeholder: "Versão 1" é o que ela se chama por
 * falta de nome, não um nome que alguém escolheu e agora tem de apagar para digitar.
 *
 * O rascunho é estado local e some ao fechar. Enquanto ele existe, o que está no banco
 * não mudou — quem confirma é o ✓ ou o Enter, e o ✗ ou Esc desiste.
 */
function NomeEditavel({ simulacao, aoRenomear, renomeando }: {
  simulacao: SimulacaoSalva;
  aoRenomear: (id: string, nome: string) => void;
  renomeando: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [rascunho, setRascunho] = useState('');

  // Trocar de simulação com o campo aberto deixaria o rascunho de uma sobre a outra.
  useEffect(() => {
    setEditando(false);
    setRascunho('');
  }, [simulacao.id]);

  const rotulo = rotuloDaSimulacao(simulacao);

  if (!editando) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold">{rotulo}</span>
        <button
          type="button"
          aria-label="Renomear a simulação"
          title="Dar um nome ao cenário — “Sem reserva”, “51% pelo Avelino”. Sem nome, ela se chama pela versão."
          onClick={() => {
            setRascunho(simulacao.nome ?? '');
            setEditando(true);
          }}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  const confirmar = () => {
    aoRenomear(simulacao.id, rascunho);
    setEditando(false);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Input
        autoFocus
        aria-label="Nome da simulação"
        placeholder={rotulo}
        disabled={renomeando}
        className={`${fieldCls} h-9 w-72 text-base font-semibold`}
        value={rascunho}
        onChange={(e) => setRascunho(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirmar();
          if (e.key === 'Escape') setEditando(false);
        }}
      />
      <BotaoDeIcone rotulo="Salvar o nome" ao={confirmar}>
        <Check className="h-4 w-4" />
      </BotaoDeIcone>
      <BotaoDeIcone rotulo="Cancelar" ao={() => setEditando(false)}>
        <X className="h-4 w-4" />
      </BotaoDeIcone>
    </div>
  );
}

function BotaoDeIcone({ rotulo, ao, children }: {
  rotulo: string;
  ao: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      onClick={ao}
      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
    >
      {children}
    </button>
  );
}

/**
 * A ABA DA DOAÇÃO: o quadro que foi preenchido, na mesma ordem de colunas da tela de
 * simulação — quem entrou, em que papel, em que guia, com quanto estava e com quanto
 * terminou.
 *
 * TUDO AQUI É LIDO, nada é recalculado: desde a migration 20260828140000 o quadro
 * inteiro é congelado na simulação. As quotas de cada um, o que saiu de cada doador e
 * a participação final dos dois lados vêm gravados; antes o transmitido era derivado
 * do rateio, e isso fazia o quadro antigo depender de uma convenção de arredondamento
 * que pode mudar.
 *
 * Os percentuais são a única conta, e é aritmética fechada: `quotas ÷ universo`, com
 * os dois números congelados. Por isso não há coluna de percentual no banco.
 */
function QuadroDaDoacao({ simulacao }: { simulacao: SimulacaoSalva }) {
  const soma = (ns: string[]) => ns.reduce((a, n) => a + BigInt(n), 0n);
  const quotasDosDoadores = soma(simulacao.doadores.map((d) => d.quotas));
  const transmitido = soma(simulacao.doadores.map((d) => d.quotasTransmitidas));
  const legitima = soma(simulacao.donatarios.map((d) => d.quotasLegitima));
  const disponivel = soma(simulacao.donatarios.map((d) => d.quotasDisponivel));
  const atuaisDosDonatarios = soma(simulacao.donatarios.map((d) => d.quotasAtuais));
  const finalDeTodos = soma([
    ...simulacao.doadores.map((d) => d.quotasFinal),
    ...simulacao.donatarios.map((d) => d.quotasFinal),
  ]);
  const pct = (q: bigint) => pctDeDecimal(pctDeQuotas(q, simulacao.totalDeQuotas));

  // O APORTE EM MOEDA de uma simulação é hipótese de cenário: houve ou não houve, e a
  // coluna só existe quando houve. Somado em centavos inteiros, como todo dinheiro.
  const centavos = (v: string) => {
    const [i, f = ''] = v.split('.');
    return BigInt(i || '0') * 100n + BigInt(f.padEnd(2, '0').slice(0, 2));
  };
  const somaDosAportes = [
    ...simulacao.doadores, ...simulacao.donatarios,
  ].reduce((a, x) => a + centavos(x.vlrAporteMoeda), 0n);
  const temAporte = somaDosAportes > 0n;
  const aporteTotal = `${somaDosAportes / 100n}.${(somaDosAportes % 100n).toString().padStart(2, '0')}`;
  const aporte = (v: string) => (centavos(v) > 0n ? brlDeDecimal(v) : TRACO);
  /**
   * QUANTAS DAS QUOTAS VIERAM DE DINHEIRO. É o que a coluna `quotas_do_aporte` existe
   * para responder: o preço da quota de antes do aporte não é recuperável do que está
   * gravado no pai, então sem ela o quadro antigo não saberia dizer isto.
   */
  const origemDasQuotas = (x: { quotasDoAporte: string }) =>
    (BigInt(x.quotasDoAporte) > 0n
      ? `Inclui ${quotasDeBigint(BigInt(x.quotasDoAporte))} quotas compradas pelo `
        + 'aporte em moeda. Essas não pagam ITCD: aporte não é doação.'
      : undefined);

  return (
    <div className="overflow-x-auto rounded-lg border border-osg-100 bg-card">
      <table className="w-full text-sm">
        <thead className="bg-osg-50/60 text-[11px] font-medium uppercase tracking-wide text-osg-800">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Pessoa</th>
            <th className="px-3 py-2 text-left font-medium">Papel</th>
            <th className="px-3 py-2 text-left font-medium">Emissão GIA</th>
            {/* O APORTE só ganha coluna quando houve um: é hipótese de cenário, e
                uma coluna de zeros em toda simulação sem aporte seria ruído. */}
            {temAporte && (
              <th className="px-3 py-2 text-right font-medium">Aporte (R$)</th>
            )}
            <th className="px-3 py-2 text-right font-medium">Quotas</th>
            <th className="px-3 py-2 text-right font-medium">Part. atual</th>
            <th className="px-3 py-2 text-right font-medium">Transmitido</th>
            <th className="px-3 py-2 text-right font-medium">Legítima</th>
            <th className="px-3 py-2 text-right font-medium">Disponível</th>
            <th className="px-3 py-2 text-right font-medium">Quotas final</th>
            <th className="px-3 py-2 text-right font-medium">Part. final</th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {simulacao.doadores.map((d) => (
            <tr key={`doa-${d.pessoaId}`} className="border-t border-slate-100">
              <Cel className="text-left font-sans">{d.nome}</Cel>
              <Cel className="text-left font-sans text-slate-600">Doador</Cel>
              <Cel className="text-left font-sans text-slate-600">
                {/* Mesma grafia da tela de simulação. O número de guias NÃO entra:
                    ele é do ato inteiro, não desta linha, e não se deriva de uma
                    linha só. */}
                {d.emissaoConjunta
                  ? `Em conjunto${d.conjugeNome ? ` · ${d.conjugeNome}` : ''}`
                  : 'Individual'}
              </Cel>
              {temAporte && <Cel>{aporte(d.vlrAporteMoeda)}</Cel>}
              <Cel title={origemDasQuotas(d)}>
                {quotasDeBigint(BigInt(d.quotas))}
              </Cel>
              <Cel className="text-slate-500">{pct(BigInt(d.quotas))}</Cel>
              <Cel>{quotasDeBigint(BigInt(d.quotasTransmitidas))}</Cel>
              <Cel>{TRACO}</Cel>
              <Cel>{TRACO}</Cel>
              <Cel>{quotasDeBigint(BigInt(d.quotasFinal))}</Cel>
              <Cel className="text-slate-500">{pct(BigInt(d.quotasFinal))}</Cel>
            </tr>
          ))}
          {simulacao.donatarios.map((d) => (
            <tr key={`don-${d.pessoaId}`} className="border-t border-slate-100">
              <Cel className="text-left font-sans">{d.nome}</Cel>
              <Cel className="text-left font-sans text-slate-600">Donatário</Cel>
              {/* Donatário não emite guia — a guia é do doador. */}
              <Cel className="text-left">{TRACO}</Cel>
              {temAporte && <Cel>{aporte(d.vlrAporteMoeda)}</Cel>}
              <Cel title={origemDasQuotas(d)}>
                {quotasDeBigint(BigInt(d.quotasAtuais))}
              </Cel>
              <Cel className="text-slate-500">{pct(BigInt(d.quotasAtuais))}</Cel>
              <Cel>{TRACO}</Cel>
              <Cel>{quotasDeBigint(BigInt(d.quotasLegitima))}</Cel>
              <Cel>{quotasDeBigint(BigInt(d.quotasDisponivel))}</Cel>
              <Cel>{quotasDeBigint(BigInt(d.quotasFinal))}</Cel>
              <Cel className="text-slate-500">{pct(BigInt(d.quotasFinal))}</Cel>
            </tr>
          ))}
          {/* A CONFERÊNCIA: a última linha repete a primeira coluna. Nada se cria nem
              se perde num ato de doação — o capital só muda de mão. */}
          <tr className="border-t-2 border-osg-100 bg-osg-50/60 font-semibold text-osg-900">
            <Cel className="text-left font-sans">TOTAL</Cel>
            <Cel>{TRACO}</Cel>
            <Cel>{TRACO}</Cel>
            {temAporte && <Cel>{brlDeDecimal(aporteTotal)}</Cel>}
            <Cel>{quotasDeBigint(quotasDosDoadores + atuaisDosDonatarios)}</Cel>
            <Cel>{pct(quotasDosDoadores + atuaisDosDonatarios)}</Cel>
            <Cel>{quotasDeBigint(transmitido)}</Cel>
            <Cel>{quotasDeBigint(legitima)}</Cel>
            <Cel>{quotasDeBigint(disponivel)}</Cel>
            <Cel>{quotasDeBigint(finalDeTodos)}</Cel>
            <Cel>{pct(finalDeTodos)}</Cel>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/**
 * A ABA DO USUFRUTO: o quadro gravado, e — primeiro de tudo — O QUE O ATO GEROU.
 *
 * ESSA FRASE É O PONTO. Um quadro de usufruto existe em toda simulação, e na maioria
 * delas não gera nada: a reserva é ESCOLHA do cliente, não regra do ato, e sem reserva
 * e sem instituição cada um simplesmente vota o que tem. A tela mostrava o quadro e
 * calava sobre o resultado, então não havia como distinguir "este ato não recolhe
 * nada" de "faltou preencher".
 *
 * São três desfechos, e cada um tem uma consequência diferente no mundo:
 *
 *   nada                  quadro só, sem instrumento e sem guia
 *   reserva               muda a NATUREZA e a BASE da guia da doação, sem guia própria
 *   instituição           guia própria por par concedente → usufrutuário
 *
 * A reserva e a instituição não são exclusivas: no caso de referência as duas
 * aconteceram, em guias separadas, no mesmo dia.
 */
function QuadroDoUsufruto({ simulacao }: { simulacao: SimulacaoSalva }) {
  if (simulacao.usufruto.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 px-4 py-10 text-center text-sm text-slate-600">
        Esta simulação foi gravada antes de o quadro de usufruto passar a ser
        registrado.
        <span className="mt-1 block text-slate-500">
          Recalcular pelo cadastro de hoje mostraria outro quadro, não o desta
          simulação.
        </span>
      </p>
    );
  }

  const guias = simulacao.concessoes.filter((c) => c.origem === 'instituicao');
  const total = BigInt(simulacao.totalDeQuotas);
  const pct = (q: bigint) => pctDeDecimal(pctDeQuotas(q, simulacao.totalDeQuotas));
  const soma = (f: (l: SimulacaoSalva['usufruto'][number]) => bigint) =>
    simulacao.usufruto.reduce((a, l) => a + f(l), 0n);

  return (
    <div className="space-y-4">
      <DesfechoDoAto
        comReserva={simulacao.comReserva}
        pctBaseReserva={simulacao.pctBaseReserva}
        pctBaseInstituicao={simulacao.pctBaseInstituicao}
        guias={guias.length}
      />

      <div className="overflow-x-auto rounded-lg border border-osg-100 bg-card">
        <table className="w-full text-sm">
          <thead className="bg-osg-50/60 text-[11px] font-medium uppercase tracking-wide text-osg-800">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Pessoa</th>
              <th className="px-3 py-2 text-left font-medium">Papel</th>
              <th className="px-3 py-2 text-right font-medium">Quotas</th>
              <th className="px-3 py-2 text-right font-medium">%</th>
              <th className="px-3 py-2 text-right font-medium">Plena</th>
              <th className="px-3 py-2 text-right font-medium">Nua propriedade</th>
              <th className="px-3 py-2 text-right font-medium">Usufruto</th>
              <th className="px-3 py-2 text-right font-medium">Voz e voto</th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {simulacao.usufruto.map((l) => {
              const plena = BigInt(l.quotasPlena);
              const nua = BigInt(l.quotasNuaReserva) + BigInt(l.quotasNuaInstituicao);
              const usufrui = BigInt(l.quotasUsufruto);
              return (
                <tr key={l.pessoaId} className="border-t border-slate-100">
                  <Cel className="text-left font-sans">{l.nome}</Cel>
                  <Cel className="text-left font-sans text-slate-600">
                    {l.papel === 'usufrui' ? 'Usufrutuário' : 'Nu-proprietário'}
                  </Cel>
                  <Cel>{quotasDeBigint(BigInt(l.quotas))}</Cel>
                  <Cel className="text-slate-500">{pct(BigInt(l.quotas))}</Cel>
                  <Cel>{quotasDeBigint(plena)}</Cel>
                  <Cel
                    title={nua === 0n ? undefined
                      : `Concedido: ${quotasDeBigint(BigInt(l.quotasNuaReserva))} pela `
                        + 'reserva da doação e '
                        + `${quotasDeBigint(BigInt(l.quotasNuaInstituicao))} por `
                        + 'instituição declarada.'}
                  >
                    {quotasDeBigint(nua)}
                  </Cel>
                  <Cel>{quotasDeBigint(usufrui)}</Cel>
                  <Cel className="font-semibold">{pct(plena + usufrui)}</Cel>
                </tr>
              );
            })}
            {/* O TOTAL de voz e voto fecha o capital: cada quota vota uma vez. O bloco
                usufruído por um casal entra UMA vez, mesmo aparecendo nas duas linhas
                — direito conjunto, com acrescimento ao sobrevivente (art. 1.411 CC). */}
            <tr className="border-t-2 border-osg-100 bg-osg-50/60 font-semibold text-osg-900">
              <Cel className="text-left font-sans">TOTAL</Cel>
              <Cel>{TRACO}</Cel>
              <Cel>{quotasDeBigint(soma((l) => BigInt(l.quotas)))}</Cel>
              <Cel>{pct(soma((l) => BigInt(l.quotas)))}</Cel>
              <Cel>{quotasDeBigint(soma((l) => BigInt(l.quotasPlena)))}</Cel>
              <Cel>
                {quotasDeBigint(soma(
                  (l) => BigInt(l.quotasNuaReserva) + BigInt(l.quotasNuaInstituicao),
                ))}
              </Cel>
              <Cel>{TRACO}</Cel>
              <Cel>{pct(total)}</Cel>
            </tr>
          </tbody>
        </table>
      </div>

      {/* AS GUIAS, em quotas. O dinheiro — base e imposto dos três cenários — mora na
          aba de Cálculo, junto dos cenários da doação: é lá que se compara valor. */}
      {guias.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-osg-100 bg-card">
          <table className="w-full text-sm">
            <thead className="bg-osg-50/60 text-[11px] font-medium uppercase tracking-wide text-osg-800">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Institui</th>
                <th className="px-3 py-2 text-left font-medium">Para</th>
                <th className="px-3 py-2 text-right font-medium">Quotas</th>
                <th className="px-3 py-2 text-right font-medium">%</th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {guias.map((c) => (
                <tr
                  key={`${c.deId}>${c.paraId}`}
                  className="border-t border-slate-100"
                >
                  <Cel className="text-left font-sans">{c.deNome}</Cel>
                  <Cel className="text-left font-sans">{c.paraNome}</Cel>
                  <Cel>{quotasDeBigint(BigInt(c.quotas))}</Cel>
                  <Cel className="text-slate-500">{pct(BigInt(c.quotas))}</Cel>
                </tr>
              ))}
              <tr className="border-t-2 border-osg-100 bg-osg-50/60 font-semibold text-osg-900">
                <Cel
                  className="text-left font-sans"
                  title={'Uma guia por par, com a direção invertida: quem institui é o '
                    + 'doador declarante e o usufrutuário é o beneficiário. Cada uma '
                    + 'tem a própria isenção de 500 UPF.'}
                >
                  {`${guias.length} ${guias.length === 1 ? 'guia' : 'guias'}`}
                </Cel>
                <Cel>{TRACO}</Cel>
                <Cel>
                  {quotasDeBigint(guias.reduce((a, c) => a + BigInt(c.quotas), 0n))}
                </Cel>
                <Cel>
                  {pct(guias.reduce((a, c) => a + BigInt(c.quotas), 0n))}
                </Cel>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * O DESFECHO DO ATO, em uma frase. É a primeira coisa da aba porque é a pergunta que
 * se faz ao abrir uma simulação antiga: isto gerou instrumento? gerou guia?
 */
function DesfechoDoAto({ comReserva, pctBaseReserva, pctBaseInstituicao, guias }: {
  comReserva: boolean;
  pctBaseReserva: string;
  pctBaseInstituicao: string;
  guias: number;
}) {
  const pct = (v: string) => `${pctDeDecimal(v).replace(',0000', '')}`;

  if (!comReserva && guias === 0) {
    return (
      <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
        <strong className="font-semibold">Nenhum ato de usufruto neste cenário.</strong>
        {' Cada um vota o que tem: não há instrumento de usufruto nem guia a recolher. '}
        O quadro abaixo é como a sociedade fica depois da doação.
      </p>
    );
  }

  return (
    <div className="space-y-1.5 rounded-md border border-osg-100 bg-osg-50/40 px-3 py-2.5 text-sm text-osg-900">
      {comReserva && (
        <p>
          <strong className="font-semibold">Reserva de usufruto na doação</strong>
          {` — base de ${pct(pctBaseReserva)}. `}
          <span className="text-slate-600">
            O voto fica com quem doa. Sem guia própria: é a guia da doação que muda de
            natureza e de base.
          </span>
        </p>
      )}
      {guias > 0 && (
        <p>
          <strong className="font-semibold">Instituição de usufruto</strong>
          {` — ${guias} ${guias === 1 ? 'guia' : 'guias'}, base de `}
          {`${pct(pctBaseInstituicao)}. `}
          <span className="text-slate-600">
            Ato próprio e tributado, com imposto na aba de Cálculo.
          </span>
        </p>
      )}
      {pctBaseReserva === '70.00' && comReserva && (
        <AvisoDeParcelaDiferida onde="reserva" />
      )}
      {pctBaseInstituicao === '70.00' && guias > 0 && (
        <AvisoDeParcelaDiferida onde="instituição" />
      )}
    </div>
  );
}

/** Uma linha, não um banner: a pendência é real, o alarme não. */
function AvisoDeParcelaDiferida({ onde }: { onde: string }) {
  return (
    <p className="text-xs text-amber-700">
      {`Base de 70% na ${onde}: fica parcela devida na extinção do usufruto `}
      (art. 11, §2º, I do Decreto 2.125/03).
    </p>
  );
}

function Cel({ children, className = '', title }: {
  children: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td title={title} className={`px-3 py-1.5 text-right ${className}`}>{children}</td>
  );
}

/** Percentual com 4 casas, em `bigint`: dinheiro e quota não passam por `number`. */
function pctDeQuotas(parte: bigint, totalTexto: string): string {
  const total = BigInt(totalTexto);
  if (total <= 0n) return '0.0000';
  const escalado = (parte * 100n * 10_000n * 2n + total) / (total * 2n);
  return `${escalado / 10_000n}.${(escalado % 10_000n).toString().padStart(4, '0')}`;
}

/**
 * A ABA DO CÁLCULO: os três cenários lado a lado, na ordem do resumo de tributos que a
 * OSG apresenta — total do acervo, alíquota, BASE de cada donatário, imposto de cada
 * donatário e o total por último.
 *
 * Cada quadro fecha no TOTAL DO ATO: a doação mais as guias de instituição de
 * usufruto. A reserva não aparece como linha porque não é guia — ela já está dentro do
 * imposto da doação, reduzindo a base dele.
 */
function TresCenarios({ simulacao }: { simulacao: SimulacaoSalva }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {CENARIOS.map((cenario) => (
        <QuadroDoCenario key={cenario} cenario={cenario} simulacao={simulacao} />
      ))}
    </div>
  );
}

function QuadroDoCenario({ cenario, simulacao }: {
  cenario: Cenario;
  simulacao: SimulacaoSalva;
}) {
  const guias = simulacao.concessoes.filter((c) => c.origem === 'instituicao');
  return (
    <section className="overflow-hidden rounded-lg border border-osg-100 bg-card">
      <h4 className="border-b border-osg-100 bg-osg-50/60 px-3 py-2 text-xs font-semibold text-osg-800">
        {ROTULO_CENARIO[cenario]}
      </h4>
      <dl className="divide-y divide-slate-100 text-xs">
        <Linha
          rotulo="Total do acervo"
          valor={brlDeDecimal(simulacao.acervoPorCenario[cenario])}
        />
        {/* A ALÍQUOTA é a faixa da lei de MT, não um dado da simulação: o imposto de
            cada donatário sai da tabela progressiva, e a faixa diz de onde vem. */}
        <Linha rotulo="Alíquota" valor="2% a 8%" />

        <Secao>Base de cálculo</Secao>
        {simulacao.donatarios.map((d) => (
          <Linha
            key={`base-${d.pessoaId}`}
            rotulo={d.nome}
            detalhe={pctDeDecimal(d.percentual)}
            valor={brlDeDecimal(d.basePorCenario[cenario])}
          />
        ))}

        <Secao>Simulação do valor de ITCD</Secao>
        {simulacao.donatarios.map((d) => (
          <Linha
            key={`imp-${d.pessoaId}`}
            rotulo={d.nome}
            valor={brlDeDecimal(d.impostoPorCenario[cenario])}
          />
        ))}

        {/* A INSTITUIÇÃO é ato próprio, com guia própria — por isso ela entra como
            seção separada e não somada por dentro. A RESERVA não aparece aqui: ela não
            tem guia, ela já reduziu a base da doação acima. */}
        {guias.length > 0 && (
          <>
            <Secao>Instituição de usufruto</Secao>
            {guias.map((g) => (
              <Linha
                key={`inst-${g.deId}>${g.paraId}`}
                rotulo={`${g.deNome} → ${g.paraNome}`}
                valor={brlDeDecimal(g.impostoPorCenario[cenario])}
              />
            ))}
            <Linha
              rotulo="ITCD da doação"
              valor={brlDeDecimal(simulacao.impostoPorCenario[cenario])}
            />
          </>
        )}

        <div className="flex items-baseline justify-between gap-3 bg-osg-50/40 px-3 py-2">
          <dt
            className="text-xs font-semibold uppercase tracking-wide text-osg-800"
            title={guias.length > 0
              ? 'Doação + instituição de usufruto.'
              : 'Só a doação: este ato não tem guia de instituição de usufruto.'}
          >
            {guias.length > 0 ? 'Total do ato' : 'Imposto total'}
          </dt>
          <dd className="font-mono text-sm font-semibold tabular-nums text-osg-900">
            {brlDeDecimal(simulacao.totalPorCenario[cenario])}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/**
 * A CADEIA E O CONSOLIDADO — só aparece quando há mais de um ato.
 *
 * É o fechamento da apresentação: a doação entre os herdeiros, depois a do fundador
 * para eles, e o total. Cada linha é um ato; a última é a soma.
 *
 * SOMA SIMPLES, e é assim mesmo. A acumulação da Lei 10.488/2016 tem chave de trio —
 * mesmo doador · mesmo beneficiário · mesmo ano civil —, então atos de doadores
 * diferentes são apurações separadas. E quando acumulam, a soma dos devidos é igual à
 * apuração da base consolidada: fracionar não economiza.
 */
function ACadeia({ simulacao, todas }: {
  simulacao: SimulacaoSalva;
  todas: SimulacaoSalva[];
}) {
  const cadeia = cadeiaDe(simulacao, todas);
  if (cadeia.length < 2) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-osg-100 bg-card">
      <table className="w-full text-sm">
        <thead className="bg-osg-50/60 text-[11px] font-medium uppercase tracking-wide text-osg-800">
          <tr>
            <th className="px-3 py-2 text-left font-medium">Ato</th>
            <th className="px-3 py-2 text-left font-medium">Competência</th>
            {CENARIOS.map((c) => (
              <th key={c} className="px-3 py-2 text-right font-medium">
                {ROTULO_CENARIO[c].replace('Valor ', '').replace('de ', '')}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {cadeia.map((s, i) => (
            <tr
              key={s.id}
              className={`border-t border-slate-100 ${s.id === simulacao.id ? 'bg-osg-50/30' : ''}`}
            >
              <Cel className="text-left font-sans">
                <span className="mr-2 text-slate-400">{i + 1}</span>
                {rotuloDaSimulacao(s)}
              </Cel>
              <Cel className="text-left">{s.competencia}</Cel>
              {CENARIOS.map((c) => (
                <Cel key={c}>{brlDeDecimal(s.totalPorCenario[c])}</Cel>
              ))}
            </tr>
          ))}
          <tr className="border-t-2 border-osg-100 bg-osg-50/60 font-semibold text-osg-900">
            <Cel
              className="text-left font-sans"
              title={'Soma dos atos da cadeia. Doadores diferentes são apurações '
                + 'separadas, e mesmo acumulando a soma dos devidos é igual à apuração '
                + 'da base consolidada.'}
            >
              {`Total dos ${cadeia.length} atos`}
            </Cel>
            <Cel>{TRACO}</Cel>
            {CENARIOS.map((c) => (
              <Cel key={c}>{brlDeDecimal(totalDaCadeia(cadeia, c))}</Cel>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function Secao({ children }: { children: React.ReactNode }) {
  return (
    <p className="bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
      {children}
    </p>
  );
}

function Linha({ rotulo, detalhe, valor }: {
  rotulo: string;
  detalhe?: string;
  valor: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-3 py-1.5">
      <dt className="truncate text-slate-600">
        {rotulo}
        {detalhe && <span className="ml-1.5 text-slate-400">{detalhe}</span>}
      </dt>
      <dd className="shrink-0 font-mono tabular-nums text-slate-800">{valor}</dd>
    </div>
  );
}

function Dado({ rotulo, valor, mono }: { rotulo: string; valor: string; mono?: boolean }) {
  return (
    <div className="space-y-1">
      <span className="block text-xs uppercase tracking-wide text-slate-500">
        {rotulo}
      </span>
      <span className={`text-sm font-medium ${mono ? 'font-mono tabular-nums' : ''}`}>
        {valor}
      </span>
    </div>
  );
}

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});
