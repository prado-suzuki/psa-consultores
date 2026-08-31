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
import { nomesCurtos, primeiroNome } from '@/lib/osg/nomeCurto';
import { brlDeDecimal, pctDeDecimal, quotasDeBigint, TRACO } from './itcmdFmt';
import {
  abaCls, cabecalhoDaTabelaCls, ComDica, ComoDicas, Ctrl, DICA_NOME_CURTO,
  DicaDoControle, linhaCls,
  linhaDeTotalCls, LinhaDeTotal, LinhaDeValor, Num, Q, Quadro, rotuloCls, Secao, Th,
  Txt,
} from './itcmdKit';
import { AvisoDeParcelaDiferida } from './SelecaoDaBase';
import {
  CENARIOS, DICA_CENARIO, ROTULO_CENARIO, type Cenario,
} from '@/lib/osg/itcmd/simulacao';
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

/**
 * NOME CURTO, resolvido sobre TODAS as pessoas da simulação de uma vez.
 *
 * O cadastro guarda "CRISTINA KIELBA BOCOLLI BORDIGNON", e a tela aberta mostrava o
 * nome inteiro em caixa alta: a coluna Pessoa comia metade da largura e os pares da
 * aba de Cálculo truncavam em "CRISTINA KIELBA BOCOLLI BORDIGNON → AVELINO NERI...".
 * A lista e o modal de montagem já usavam nome curto; só esta tela não.
 *
 * A desambiguação é por ID e sobre o CONJUNTO EXIBIDO — é ali que a colisão importa —,
 * então o mapa se monta com quem aparece em qualquer um dos quadros: doadores,
 * donatários, o quadro de usufruto, as concessões e as guias.
 */
type Nomeador = (id: string, inteiro: string) => string;

/**
 * O resolvedor DESCE por prop, e não é recalculado em cada aba de propósito: a
 * desambiguação depende do conjunto, e conjuntos diferentes dão nomes diferentes. Duas
 * abas mostrando "Cristina" e "Cristina Kielba" para a mesma pessoa seria pior que o
 * nome inteiro.
 */
function nomeadorDe(s: SimulacaoSalva): Nomeador {
  const mapa = nomesDaSimulacao(s);
  return (id, inteiro) => mapa.get(id) ?? primeiroNome(inteiro);
}

function nomesDaSimulacao(s: SimulacaoSalva): Map<string, string> {
  return nomesCurtos([
    ...s.doadores.map((d) => ({ id: d.pessoaId, nome: d.nome })),
    ...s.donatarios.map((d) => ({ id: d.pessoaId, nome: d.nome })),
    ...s.usufruto.map((u) => ({ id: u.pessoaId, nome: u.nome })),
    ...s.concessoes.flatMap((c) => [
      { id: c.deId, nome: c.deNome },
      { id: c.paraId, nome: c.paraNome },
    ]),
    ...s.gias.flatMap((g) => [
      { id: g.doadorId, nome: g.doadorNome },
      { id: g.donatarioId, nome: g.donatarioNome },
    ]),
  ]);
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
  const nome = nomeadorDe(simulacao);

  return (
    <ComoDicas>
      <div className="shrink-0 space-y-3 rounded-t-lg border-b border-osg-100/70 bg-background px-6 pb-4 pt-5">
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
          <Dado
            rotulo="Gerada em"
            valor={dataHora(simulacao.criadaEm)}
            dica="Quando esta simulação foi gravada. O que está na tela é o retrato daquele momento: mexer no cadastro hoje não muda nada aqui."
          />
          <Dado
            rotulo="Competência"
            valor={simulacao.competencia}
            mono
            dica="O mês da UPF que valeu na apuração. Duas simulações de competências diferentes não se comparam direto, porque a UPF muda."
          />
          <Dado
            rotulo="UPF"
            valor={brlDeDecimal(simulacao.upf)}
            mono
            dica="A UPF declarada nesta simulação. É ela que converte a isenção de 500 UPF e a dedução da faixa em reais."
          />
          <Dado
            rotulo="Quotas"
            valor={quotasDeBigint(BigInt(simulacao.totalDeQuotas))}
            mono
            dica="O capital da sociedade no momento do ato, em quotas. É o denominador de todos os percentuais desta tela."
          />
          <Dado
            rotulo="Versão"
            valor={String(simulacao.versao)}
            mono
            dica="A ordem em que as simulações deste cliente foram geradas. O nome pode mudar, a versão não."
          />

          {/* O STATUS é o único CONTROLE do cabeçalho — o resto é dado —, e por isso
              ele fica visualmente separado: caixa própria, com a borda da OSG. Antes
              era um `ml-auto` solto, que jogava o campo na extrema direita sem nada
              que o ancorasse, e ele lia como se tivesse escapado da linha. */}
          <div className="ml-auto space-y-1 rounded-lg border border-osg-100 bg-osg-50/40 px-3 py-2">
            <span className={rotuloCls}>
              <ComDica
                dica={'Rascunho, gerada, aprovada ou substituída. Trocar o status não '
                  + 'recalcula nada: os números continuam sendo os do momento em que a '
                  + 'simulação foi gravada.'}
              >
                Status
              </ComDica>
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
          <TabsContent value="doacao" className={`mt-0 ${abaCls}`}>
            <QuadroDaDoacao simulacao={simulacao} nome={nome} />
          </TabsContent>
          <TabsContent value="usufruto" className={`mt-0 ${abaCls}`}>
            <QuadroDoUsufruto simulacao={simulacao} nome={nome} />
          </TabsContent>
          <TabsContent value="itcd" className={`mt-0 space-y-4 ${abaCls}`}>
            <TresCenarios simulacao={simulacao} nome={nome} />
            <ACadeia simulacao={simulacao} todas={todas} />
          </TabsContent>
        </div>
      </Tabs>
    </ComoDicas>
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
        <DicaDoControle dica="Dar um nome ao cenário: “Sem reserva”, “51% pelo Avelino”. Sem nome, ela se chama pela versão.">
          <button
            type="button"
            aria-label="Renomear a simulação"
            onClick={() => {
              setRascunho(simulacao.nome ?? '');
              setEditando(true);
            }}
            className="rounded p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </DicaDoControle>
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
    <DicaDoControle dica={rotulo}>
      <button
        type="button"
        aria-label={rotulo}
        onClick={ao}
        className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        {children}
      </button>
    </DicaDoControle>
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
function QuadroDaDoacao({ simulacao, nome }: {
  simulacao: SimulacaoSalva;
  nome: Nomeador;
}) {
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
        + 'aporte em moeda. Essas não pagam ITCD: quem aportou pagou por elas.'
      : undefined);

  return (
    <Quadro
      titulo="Quadro da doação"
      legenda="Quem transmitiu, quem recebeu e com quanto cada um ficou"
    >
      <table className="w-full text-sm">
        <thead className={cabecalhoDaTabelaCls}>
          <tr>
            <Th alinhar="esquerda" dica={DICA_NOME_CURTO}>Pessoa</Th>
            <Th alinhar="esquerda" dica="Quem transmitiu e quem recebeu neste ato.">
              Papel
            </Th>
            <Th
              alinhar="esquerda"
              dica={'Em quantas guias o doador emitiu, e no nome de quem. Cônjuge em '
                + 'conjunto é doador fiscal próprio, pela meação.'}
            >
              Emissão GIA
            </Th>
            {/* O APORTE só ganha coluna quando houve um: é hipótese de cenário, e
                uma coluna de zeros em toda simulação sem aporte seria ruído. */}
            {temAporte && (
              <Th dica="Dinheiro integralizado no capital: virou quotas ao preço da quota e entrou nos três cenários pelo valor de face, sem ITCD.">
                Aporte (R$)
              </Th>
            )}
            <Th dica="O que a pessoa tinha ANTES do ato.">Quotas</Th>
            <Th dica="Percentual do capital ANTES do ato.">Part. atual</Th>
            <Th dica="Quotas que SAÍRAM deste doador. É a coluna que fecha com o que os donatários receberam.">
              Transmitido
            </Th>
            <Th dica="Quotas recebidas da parte LEGÍTIMA, a metade reservada aos herdeiros necessários.">
              Legítima
            </Th>
            <Th dica="Quotas recebidas da parte DISPONÍVEL. Com a legítima, compõem uma base única no ITCD.">
              Disponível
            </Th>
            <Th dica="Com quantas quotas a pessoa terminou o ato.">Quotas final</Th>
            <Th dica="Percentual do capital DEPOIS do ato. O voto está na aba de Usufruto.">
              Part. final
            </Th>
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {simulacao.doadores.map((d) => (
            <tr key={`doa-${d.pessoaId}`} className="border-t border-osg-100/70">
              <Txt className="font-sans">{nome(d.pessoaId, d.nome)}</Txt>
              <Txt className="font-sans text-muted-foreground">Doador</Txt>
              <Txt className="font-sans text-muted-foreground">
                {/* Mesma grafia da tela de simulação. O número de guias NÃO entra:
                    ele é do ato inteiro, não desta linha, e não se deriva de uma
                    linha só. */}
                {d.emissaoConjunta
                  ? `Em conjunto${d.conjugeNome ? ` · ${primeiroNome(d.conjugeNome)}` : ''}`
                  : 'Individual'}
              </Txt>
              {temAporte && <Num>{aporte(d.vlrAporteMoeda)}</Num>}
              <Num dica={origemDasQuotas(d)}>
                {quotasDeBigint(BigInt(d.quotas))}
              </Num>
              <Num className="text-muted-foreground">{pct(BigInt(d.quotas))}</Num>
              <Num>{quotasDeBigint(BigInt(d.quotasTransmitidas))}</Num>
              <Num>{TRACO}</Num>
              <Num>{TRACO}</Num>
              <Num>{quotasDeBigint(BigInt(d.quotasFinal))}</Num>
              <Num className="text-muted-foreground">{pct(BigInt(d.quotasFinal))}</Num>
            </tr>
          ))}
          {simulacao.donatarios.map((d) => (
            <tr key={`don-${d.pessoaId}`} className="border-t border-osg-100/70">
              <Txt className="font-sans">{nome(d.pessoaId, d.nome)}</Txt>
              <Txt className="font-sans text-muted-foreground">Donatário</Txt>
              {/* Donatário não emite guia — a guia é do doador. */}
              <Txt>{TRACO}</Txt>
              {temAporte && <Num>{aporte(d.vlrAporteMoeda)}</Num>}
              <Num dica={origemDasQuotas(d)}>
                {quotasDeBigint(BigInt(d.quotasAtuais))}
              </Num>
              <Num className="text-muted-foreground">{pct(BigInt(d.quotasAtuais))}</Num>
              <Num>{TRACO}</Num>
              <Num>{quotasDeBigint(BigInt(d.quotasLegitima))}</Num>
              <Num>{quotasDeBigint(BigInt(d.quotasDisponivel))}</Num>
              <Num>{quotasDeBigint(BigInt(d.quotasFinal))}</Num>
              <Num className="text-muted-foreground">{pct(BigInt(d.quotasFinal))}</Num>
            </tr>
          ))}
          {/* A CONFERÊNCIA: a última linha repete a primeira coluna. Nada se cria nem
              se perde num ato de doação — o capital só muda de mão. */}
          <tr className={linhaDeTotalCls}>
            <Txt className="font-sans">TOTAL</Txt>
            <Num>{TRACO}</Num>
            <Num>{TRACO}</Num>
            {temAporte && <Num>{brlDeDecimal(aporteTotal)}</Num>}
            <Num>{quotasDeBigint(quotasDosDoadores + atuaisDosDonatarios)}</Num>
            <Num>{pct(quotasDosDoadores + atuaisDosDonatarios)}</Num>
            <Num>{quotasDeBigint(transmitido)}</Num>
            <Num>{quotasDeBigint(legitima)}</Num>
            <Num>{quotasDeBigint(disponivel)}</Num>
            <Num>{quotasDeBigint(finalDeTodos)}</Num>
            <Num>{pct(finalDeTodos)}</Num>
          </tr>
        </tbody>
      </table>
    </Quadro>
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
function QuadroDoUsufruto({ simulacao, nome }: {
  simulacao: SimulacaoSalva;
  nome: Nomeador;
}) {
  if (simulacao.usufruto.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-osg-200/70 px-4 py-10 text-center text-sm text-muted-foreground">
        Esta simulação foi gravada antes de o quadro de usufruto passar a ser
        registrado.
        <span className="mt-1 block text-muted-foreground">
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

      {/* PRIMEIRO O ATO, depois o resultado: quem instituiu para quem é o que se
          decidiu, e o quadro abaixo é a consequência dele. O dinheiro — base e
          imposto dos três cenários — mora na aba de Cálculo, junto dos cenários
          da doação: é lá que se compara valor. */}
      {guias.length > 0 && (
        // "Quadro da instituição", e não "Instituição de usufruto": esta frase já está
        // no desfecho logo acima, e repeti-la faz o título ler como eco em vez de nome.
        // Os quadros da tela de leitura ficam no mesmo molde — quadro da doação, quadro
        // da instituição, quadro do usufruto —, e quem distingue cada um é a legenda.
        <Quadro
          titulo="Quadro da instituição"
          legenda="Quem institui e para quem, em quotas. Base e imposto na aba de Cálculo"
        >
          <table className="w-full text-sm">
            <thead className={cabecalhoDaTabelaCls}>
              <tr>
                <Th alinhar="esquerda" dica="Quem concedeu o usufruto das próprias quotas. É o doador declarante da guia.">
                  Institui
                </Th>
                <Th alinhar="esquerda" dica="Quem passou a usufruir e a votar. É o beneficiário da guia.">
                  Para
                </Th>
                <Th dica="Quantas quotas tiveram o usufruto concedido nesta guia.">
                  Quotas
                </Th>
                <Th dica="Quanto essas quotas representam do capital da sociedade.">%</Th>
              </tr>
            </thead>
            <tbody className="font-mono tabular-nums">
              {guias.map((c) => (
                <tr
                  key={`${c.deId}>${c.paraId}`}
                  className="border-t border-osg-100/70"
                >
                  <Txt className="font-sans">{nome(c.deId, c.deNome)}</Txt>
                  <Txt className="font-sans">{nome(c.paraId, c.paraNome)}</Txt>
                  <Num>{quotasDeBigint(BigInt(c.quotas))}</Num>
                  <Num className="text-muted-foreground">{pct(BigInt(c.quotas))}</Num>
                </tr>
              ))}
              <tr className={linhaDeTotalCls}>
                <Txt className="font-sans"
                  dica={'Uma guia por par, com a direção invertida: quem institui é o '
                    + 'doador declarante e o usufrutuário é o beneficiário. Cada uma '
                    + 'tem a própria isenção de 500 UPF.'}
                >
                  {`${guias.length} ${guias.length === 1 ? 'guia' : 'guias'}`}
                </Txt>
                <Num>{TRACO}</Num>
                <Num>
                  {quotasDeBigint(guias.reduce((a, c) => a + BigInt(c.quotas), 0n))}
                </Num>
                <Num>
                  {pct(guias.reduce((a, c) => a + BigInt(c.quotas), 0n))}
                </Num>
              </tr>
            </tbody>
          </table>
        </Quadro>
      )}

      <Quadro
        titulo="Quadro do usufruto"
        legenda="Como o voto ficou depois do ato. Régua diferente da participação"
      >
        <table className="w-full text-sm">
          <thead className={cabecalhoDaTabelaCls}>
            <tr>
              <Th alinhar="esquerda" dica={DICA_NOME_CURTO}>Pessoa</Th>
              <Th alinhar="esquerda" dica="Quem usufrui recebe o voto. Quem é nu-proprietário passa o voto adiante.">
                Papel
              </Th>
              <Th dica="Participação final da doação. O usufruto não altera quotas: ele reparte o voto delas.">
                Quotas
              </Th>
              <Th dica="Percentual do capital que a pessoa TEM, depois da doação.">%</Th>
              <Th dica="Quotas que a pessoa tem E vota: propriedade plena, sem usufruto concedido a ninguém.">
                Plena
              </Th>
              <Th dica="Quotas que a pessoa tem e NÃO vota, porque o usufruto delas está com outra pessoa.">
                Nua propriedade
              </Th>
              <Th dica="Quotas DE OUTROS que esta pessoa usufrui. Ela não é dona delas, mas vota com elas.">
                Usufruto
              </Th>
              <Th dica="Percentual do capital que a pessoa VOTA. É a régua do controle, e dá para ter 0% de quotas e 51% de voto.">
                Voz e voto
              </Th>
            </tr>
          </thead>
          <tbody className="font-mono tabular-nums">
            {simulacao.usufruto.map((l) => {
              const plena = BigInt(l.quotasPlena);
              const nua = BigInt(l.quotasNuaReserva) + BigInt(l.quotasNuaInstituicao);
              const usufrui = BigInt(l.quotasUsufruto);
              return (
                <tr key={l.pessoaId} className="border-t border-osg-100/70">
                  <Txt className="font-sans">{nome(l.pessoaId, l.nome)}</Txt>
                  <Txt className="font-sans text-muted-foreground">
                    {l.papel === 'usufrui' ? 'Usufrutuário' : 'Nu-proprietário'}
                  </Txt>
                  <Num>{quotasDeBigint(BigInt(l.quotas))}</Num>
                  <Num className="text-muted-foreground">{pct(BigInt(l.quotas))}</Num>
                  <Num>{quotasDeBigint(plena)}</Num>
                  <Num
                    dica={nua === 0n ? undefined
                      : `Concedido: ${quotasDeBigint(BigInt(l.quotasNuaReserva))} pela `
                        + 'reserva da doação e '
                        + `${quotasDeBigint(BigInt(l.quotasNuaInstituicao))} por `
                        + 'instituição declarada.'}
                  >
                    {quotasDeBigint(nua)}
                  </Num>
                  <Num>{quotasDeBigint(usufrui)}</Num>
                  <Num className="font-semibold">{pct(plena + usufrui)}</Num>
                </tr>
              );
            })}
            {/* O TOTAL de voz e voto fecha o capital: cada quota vota uma vez. O bloco
                usufruído por um casal entra UMA vez, mesmo aparecendo nas duas linhas
                — direito conjunto, com acrescimento ao sobrevivente (art. 1.411 CC). */}
            <tr className={linhaDeTotalCls}>
              <Txt className="font-sans">TOTAL</Txt>
              <Num>{TRACO}</Num>
              <Num>{quotasDeBigint(soma((l) => BigInt(l.quotas)))}</Num>
              <Num>{pct(soma((l) => BigInt(l.quotas)))}</Num>
              <Num>{quotasDeBigint(soma((l) => BigInt(l.quotasPlena)))}</Num>
              <Num>
                {quotasDeBigint(soma(
                  (l) => BigInt(l.quotasNuaReserva) + BigInt(l.quotasNuaInstituicao),
                ))}
              </Num>
              <Num>{TRACO}</Num>
              <Num>{pct(total)}</Num>
            </tr>
          </tbody>
        </table>
      </Quadro>
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
      <p className="rounded-md border border-osg-200/70 bg-muted/60 px-3 py-2.5 text-sm text-foreground">
        <strong className="font-semibold">Nenhum ato de usufruto neste cenário.</strong>
        {' Cada um vota o que tem: não há instrumento de usufruto nem guia a recolher. '}
        O quadro abaixo é como a sociedade fica depois da doação.
      </p>
    );
  }

  return (
    <div className="space-y-1.5 rounded-md border border-osg-100 bg-osg-50/40 px-3 py-2.5 text-sm text-osg-700">
      {comReserva && (
        <p>
          <strong className="font-semibold">Reserva de usufruto na doação</strong>
          {` — base de ${pct(pctBaseReserva)}. `}
          <span className="text-muted-foreground">
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
          <span className="text-muted-foreground">
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
function TresCenarios({ simulacao, nome }: {
  simulacao: SimulacaoSalva;
  nome: Nomeador;
}) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {CENARIOS.map((cenario, ordem) => (
        <QuadroDoCenario
          key={cenario}
          cenario={cenario}
          ordem={ordem}
          simulacao={simulacao}
          nome={nome}
        />
      ))}
    </div>
  );
}

function QuadroDoCenario({ cenario, ordem, simulacao, nome }: {
  cenario: Cenario;
  /** Posição na fila, só para a entrada em cascata — a mesma da tela da sessão. */
  ordem: number;
  simulacao: SimulacaoSalva;
  nome: Nomeador;
}) {
  const daInstituicao = simulacao.concessoes.filter((c) => c.origem === 'instituicao');
  /**
   * SE HÁ MAIS DE UM DOADOR, a base e o imposto aparecem POR GUIA e não por donatário.
   *
   * É a unidade que o analista preenche: uma guia por doador declarante. E é a única
   * leitura em que `imposto = f(base)` fecha — somar as guias de um donatário dá a base
   * de uma leitura ao lado do imposto de outra, porque cada guia tem a sua faixa
   * progressiva e a sua dedução.
   */
  const doadoresDistintos = new Set(simulacao.gias.map((g) => g.doadorId)).size;
  const porGuia = doadoresDistintos > 1;
  return (
    <section
      style={{ animationDelay: `${ordem * 70}ms` }}
      className="animate-osg-rise overflow-hidden rounded-lg border border-osg-100 bg-card motion-reduce:animate-none"
    >
      <h4 className="border-b border-osg-100 bg-osg-50/60 px-3 py-2 text-xs font-semibold text-osg-700">
        <ComDica dica={DICA_CENARIO[cenario]}>{ROTULO_CENARIO[cenario]}</ComDica>
      </h4>
      <dl className="divide-y divide-osg-100/70 text-xs">
        <LinhaDeValor
          rotulo="Total do acervo"
          valor={brlDeDecimal(simulacao.acervoPorCenario[cenario])}
        />
        {/* A ALÍQUOTA é a faixa da lei de MT, não um dado da simulação: o imposto de
            cada donatário sai da tabela progressiva, e a faixa diz de onde vem. */}
        <LinhaDeValor rotulo="Alíquota" valor="2% a 8%" />

        <Secao>{porGuia ? 'Base de cálculo, por guia' : 'Base de cálculo'}</Secao>
        {simulacao.gias.map((g) => (
          <LinhaDeValor
            key={`base-${g.doadorId}>${g.donatarioId}`}
            rotulo={porGuia
              ? `${nome(g.doadorId, g.doadorNome)} → ${nome(g.donatarioId, g.donatarioNome)}`
              : nome(g.donatarioId, g.donatarioNome)}
            detalhe={pctDeDecimal(g.pctDaGia)}
            valor={brlDeDecimal(g.basePorCenario[cenario])}
          />
        ))}

        <Secao>
          {porGuia ? 'Simulação do ITCD, por guia' : 'Simulação do valor de ITCD'}
        </Secao>
        {simulacao.gias.map((g) => (
          <LinhaDeValor
            key={`imp-${g.doadorId}>${g.donatarioId}`}
            rotulo={porGuia
              ? `${nome(g.doadorId, g.doadorNome)} → ${nome(g.donatarioId, g.donatarioNome)}`
              : nome(g.donatarioId, g.donatarioNome)}
            valor={brlDeDecimal(g.impostoPorCenario[cenario])}
          />
        ))}

        {/* A INSTITUIÇÃO é ato próprio, com guia própria — por isso ela entra como
            seção separada e não somada por dentro. A RESERVA não aparece aqui: ela não
            tem guia, ela já reduziu a base da doação acima. */}
        {daInstituicao.length > 0 && (
          <>
            <Secao>Instituição de usufruto</Secao>
            {daInstituicao.map((g) => (
              <LinhaDeValor
                key={`inst-${g.deId}>${g.paraId}`}
                rotulo={`${g.deNome} → ${g.paraNome}`}
                valor={brlDeDecimal(g.impostoPorCenario[cenario])}
              />
            ))}
            <LinhaDeValor
              rotulo="ITCD da doação"
              valor={brlDeDecimal(simulacao.impostoPorCenario[cenario])}
            />
          </>
        )}

        <LinhaDeTotal
          rotulo={daInstituicao.length > 0 ? 'Total do ato' : 'Imposto total'}
          valor={brlDeDecimal(simulacao.totalPorCenario[cenario])}
          dica={daInstituicao.length > 0
            ? 'Doação MAIS instituição de usufruto: as guias das duas naturezas.'
            : 'Só a doação: este ato não tem guia de instituição de usufruto.'}
        />
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
    <Quadro
      titulo="Cadeia de atos"
      legenda="Cada linha é um ato; a última é a soma"
    >
      <table className="w-full text-sm">
        <thead className={cabecalhoDaTabelaCls}>
          <tr>
            <Th alinhar="esquerda" dica="Cada simulação da cadeia, na ordem dos atos. A linha destacada é a que está aberta.">
              Ato
            </Th>
            <Th alinhar="esquerda" dica="O mês da UPF de cada ato. Atos em competências diferentes foram apurados com UPFs diferentes.">
              Competência
            </Th>
            {/* `Th` do kit, e não um `th` solto: estas três eram as únicas colunas da
                tela sem o rótulo em caixa alta, e sem dica. */}
            {CENARIOS.map((c) => (
              <Th key={c} dica={DICA_CENARIO[c]}>
                {ROTULO_CENARIO[c].replace('Valor ', '').replace('de ', '')}
              </Th>
            ))}
          </tr>
        </thead>
        <tbody className="font-mono tabular-nums">
          {cadeia.map((s, i) => (
            <tr
              key={s.id}
              className={`border-t border-osg-100/70 ${s.id === simulacao.id ? 'bg-osg-50/30' : ''}`}
            >
              <Txt className="font-sans">
                <span className="mr-2 text-muted-foreground/70">{i + 1}</span>
                {rotuloDaSimulacao(s)}
              </Txt>
              <Txt>{s.competencia}</Txt>
              {CENARIOS.map((c) => (
                <Num key={c}>{brlDeDecimal(s.totalPorCenario[c])}</Num>
              ))}
            </tr>
          ))}
          <tr className={linhaDeTotalCls}>
            <Txt className="font-sans"
              dica={'Soma dos atos da cadeia. Doadores diferentes são apurações '
                + 'separadas, e mesmo quando acumulam a soma dos devidos é igual à '
                + 'apuração da base consolidada: fracionar não economiza.'}
            >
              {`Total dos ${cadeia.length} atos`}
            </Txt>
            <Num>{TRACO}</Num>
            {CENARIOS.map((c) => (
              <Num key={c}>{brlDeDecimal(totalDaCadeia(cadeia, c))}</Num>
            ))}
          </tr>
        </tbody>
      </table>
    </Quadro>
  );
}

function Dado({ rotulo, valor, mono, dica }: {
  rotulo: string;
  valor: string;
  mono?: boolean;
  /** O que o dado significa. Estes cinco são o retrato congelado, e nenhum é óbvio. */
  dica?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <span className={`block ${rotuloCls}`}>
        {dica ? <ComDica dica={dica}>{rotulo}</ComDica> : rotulo}
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
