import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { useDirtyClose } from '@/components/equipe/osg/useDirtyClose';
import { UnsavedChangesAlert } from '@/components/equipe/osg/UnsavedChangesAlert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Gift, Info, Loader2 } from 'lucide-react';
import { FieldSection, fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { SocioDoQuadro } from '@/hooks/useMovimentacaoQuotas';
import { useDoarQuotas } from '@/hooks/useDoacaoDeQuotas';
import {
  descricaoDaDoacao,
  GRAVAMES,
  GRAVAMES_PADRAO,
  planejarDoacaoDeQuotas,
  repartirOrigem,
  TODOS_OS_GRAVAMES,
  type Gravame,
} from '@/lib/osg/doacaoDeQuotas';
import { AjudaSocietaria } from './AjudaSocietaria';
import { novoPar, type ParDraft } from './doacaoDraft';
import { GestoEscolhido } from './GestoEscolhido';
import { ParesDaDoacao } from './ParesDaDoacao';
import { TabelaUsufrutoEVoto } from './UsufrutoEVoto';
import { fmtInt } from './quadroFmt';

// Caixa de interruptor: rótulo à esquerda, ajuda ao lado dele, controle à
// direita. NÃO é um `<label>` inteiro, porque o ícone de ajuda é irmão do rótulo
// e clicar nele dentro de um label alternaria o interruptor.
const interruptorCls = 'flex items-center justify-between gap-3 rounded-md border border-osg-200/80 bg-background p-3';

// O MACRO da doação de quotas com reserva de usufruto: os sócios fundadores
// passam as quotas da holding aos filhos e guardam uso, gozo e voto.
//
// Não é o formulário de movimento avulso (MovimentoModal) por duas razões: a
// doação real é um ATO de vários pares (o casal para cada filho), e o que a
// peça precisa publicar vai além de quem-para-quem-quanto: origem legítima e
// disponível, usufrutuários, extensão ao voto, gravames, data do instrumento.
// Tudo isso vira lançamento no livro mais o ônus em `onus_quotas`, num ato só.
//
// O que este modal NÃO faz é criar documento. A alteração contratual nasce
// depois, pelo fluxo normal da tela Gerar, derivando o evento do livro.

interface DoarQuotasDialogProps {
  open: boolean;
  onClose: () => void;
  empresa: PessoaRow;
  /** Quadro atual (saldo): de onde saem os doadores e os limites. */
  quadro: SocioDoQuadro[];
  pessoasCliente: PessoaRow[];
  /** Volta ao seletor de gesto. Ausente quando não há porta para voltar. */
  onTrocar?: () => void;
}

interface Draft {
  pares: ParDraft[];
  reserva: boolean;
  comVoto: boolean;
  /** Por doador: o cônjuge também usufrui. Ausente = sim, quando há cônjuge. */
  conjugeUsufrui: Record<string, boolean>;
  gravames: Gravame[];
  declararOrigem: boolean;
  dataInstrumento: string;
  dataAto: string;
}

const draftInicial = (): Draft => ({
  pares: [novoPar('')],
  reserva: true,
  comVoto: true,
  conjugeUsufrui: {},
  gravames: [...GRAVAMES_PADRAO],
  declararOrigem: true,
  dataInstrumento: '',
  dataAto: '',
});

export function DoarQuotasDialog({
  open, onClose, empresa, quadro, pessoasCliente, onTrocar,
}: DoarQuotasDialogProps) {
  const [draft, setDraft] = useState<Draft>(() => draftInicial());
  const doar = useDoarQuotas();
  const initialDraftRef = useRef<string>('');

  useEffect(() => {
    if (!open) return;
    const inicial = draftInicial();
    setDraft(inicial);
    initialDraftRef.current = JSON.stringify(inicial);
  }, [open]);

  const isDirty = JSON.stringify(draft) !== initialDraftRef.current;
  // Mesmo guard, dois destinos: fechar ou voltar ao seletor (ver MovimentoModal).
  const destinoDaSaida = useRef<'fechar' | 'trocar'>('fechar');
  const { requestClose, alertProps } = useDirtyClose({
    isDirty,
    onClose: () => (destinoDaSaida.current === 'trocar' && onTrocar ? onTrocar() : onClose()),
  });
  const pedirFechamento = () => {
    destinoDaSaida.current = 'fechar';
    requestClose();
  };
  const pedirTroca = () => {
    destinoDaSaida.current = 'trocar';
    requestClose();
  };
  const set = <K extends keyof Draft>(campo: K, valor: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [campo]: valor }));

  const pessoaPorId = useMemo(() => new Map(pessoasCliente.map((p) => [p.id, p])), [pessoasCliente]);
  const nomes = useMemo(() => {
    const m = new Map(pessoasCliente.map((p) => [p.id, p.denominacao ?? '—']));
    for (const s of quadro) if (!m.has(s.pessoaId)) m.set(s.pessoaId, s.denominacao);
    return m;
  }, [pessoasCliente, quadro]);

  // Quem doa: sócio pessoa física do quadro. Quem recebe: pessoa física do
  // cliente, menos a própria empresa. Doação por PJ não é o caso desta peça.
  const doadores = useMemo(
    () => quadro.filter((s) => s.tipoPessoa === 'PF'),
    [quadro],
  );
  const donatarios = useMemo(
    () => pessoasCliente.filter((p) => p.tipo_pessoa === 'PF' && p.id !== empresa.id),
    [pessoasCliente, empresa.id],
  );

  const doadoresEscolhidos = useMemo(
    () => [...new Set(draft.pares.map((p) => p.doadorId).filter(Boolean))],
    [draft.pares],
  );
  /** O cônjuge de cada doador escolhido, quando o cadastro o vincula. */
  const conjugePorDoador = useMemo(() => {
    const m = new Map<string, PessoaRow | null>();
    for (const doadorId of doadoresEscolhidos) {
      const id = pessoaPorId.get(doadorId)?.conjuge_id;
      m.set(doadorId, id ? pessoaPorId.get(id) ?? null : null);
    }
    return m;
  }, [doadoresEscolhidos, pessoaPorId]);
  const conjugeUsufrui = (doadorId: string) => draft.conjugeUsufrui[doadorId] ?? true;

  // Quem usufrui o que cada doador doa: ele mesmo (implícito no domínio) e o
  // cônjuge, quando marcado. O casal usufrui em conjunto, com acrescimento ao
  // sobrevivente.
  const usufrutuariosPorDoador = useMemo(() => Object.fromEntries(
    doadoresEscolhidos.map((id) => {
      const conjuge = conjugePorDoador.get(id) ?? null;
      return [id, conjuge && (draft.conjugeUsufrui[id] ?? true) ? [conjuge.id] : []];
    }),
  ), [doadoresEscolhidos, conjugePorDoador, draft.conjugeUsufrui]);

  const plano = useMemo(() => planejarDoacaoDeQuotas({
    empresaPessoaId: empresa.id,
    quadro,
    nomes,
    pares: draft.pares.map((p) => {
      const quotas = p.quotas.trim() ? Number(p.quotas) : NaN;
      return {
        doadorId: p.doadorId,
        donatarioId: p.donatarioId,
        quotas,
        origem: draft.declararOrigem && Number.isInteger(quotas) && quotas > 0 ? repartirOrigem(quotas) : null,
      };
    }),
    usufruto: {
      reservado: draft.reserva,
      usufrutuariosPorDoador,
      comVoto: draft.comVoto,
    },
    gravames: draft.gravames,
    dataInstrumento: draft.dataInstrumento || null,
    dataMovimento: draft.dataAto || null,
  }), [empresa.id, quadro, nomes, draft, usufrutuariosPorDoador]);

  // O saldo de cada doador depois dos pares JÁ digitados: alimenta o "doar
  // todas as restantes" de cada linha.
  const saldoRestante = useMemo(() => {
    const m = new Map(quadro.map((s) => [s.pessoaId, s.quotas]));
    for (const p of draft.pares) {
      const q = Number(p.quotas);
      if (p.doadorId && Number.isInteger(q) && q > 0) m.set(p.doadorId, (m.get(p.doadorId) ?? 0) - q);
    }
    return m;
  }, [quadro, draft.pares]);

  const preenchido = draft.pares.some((p) => p.doadorId && p.donatarioId && p.quotas.trim());
  const totalDoado = plano.lancamentos.reduce((s, l) => s + l.movimento.quotas, 0);

  const handleSalvar = () => {
    if (plano.problema || !empresa.cliente_id) return;
    doar.mutate(
      {
        clienteId: empresa.cliente_id,
        empresaPessoaId: empresa.id,
        plano,
        descricao: descricaoDaDoacao(plano, nomes),
        dataMovimento: draft.dataAto || null,
      },
      { onSuccess: onClose },
    );
  };

  const alternarGravame = (g: Gravame, ligado: boolean) =>
    set('gravames', ligado ? [...new Set([...draft.gravames, g])] : draft.gravames.filter((x) => x !== g));

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && pedirFechamento()}>
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-visible p-0 sm:[clip-path:none]">
          <div className="shrink-0 rounded-t-lg bg-background px-6 pt-5">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="flex flex-wrap items-center gap-2.5 text-base font-semibold">
                <Gift className="h-4 w-4 text-osg-moss" />
                Doar quotas
                <span className="rounded-md bg-osg-50 px-2 py-0.5 text-xs font-semibold text-osg-700">
                  {empresa.denominacao}
                </span>
              </DialogTitle>
              <DialogDescription>
                Registre os pares de doação e confira a reserva de usufruto, o voto e os gravames
                aplicáveis.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <div className="mb-5">
              <GestoEscolhido
                rotulo="Doação com reserva de usufruto ou gravames"
                ajuda="doacaoComOnus"
                onTrocar={onTrocar ? pedirTroca : undefined}
                disabled={doar.isPending}
              />
            </div>

            <FieldSection number="01" title="Quem doa, para quem, quanto">
              <ParesDaDoacao
                pares={draft.pares}
                onChange={(pares) => set('pares', pares)}
                doadores={doadores}
                donatarios={donatarios}
                saldoRestante={saldoRestante}
                declararOrigem={draft.declararOrigem}
                disabled={doar.isPending}
              />
              {/* O hook recusa doador que já tenha ônus vigente, e a recusa
                  precisa apontar para uma entrada que EXISTE. Depois da porta
                  única, ela é "Registrar movimento → Doação simples". */}
              <p className="mt-2 text-xs text-muted-foreground">
                Para transferir quotas já oneradas, use Registrar movimento e escolha Doação simples.
                Este formulário não reparte ônus preexistente entre pares.
              </p>
            </FieldSection>

            <FieldSection number="02" title="Reserva de usufruto">
              <div className="space-y-3">
                <div className={interruptorCls}>
                  <span className="flex items-center gap-1.5">
                    <label htmlFor="doacao-reserva" className="cursor-pointer text-sm font-medium text-foreground">
                      Doador reserva o usufruto vitalício
                    </label>
                    <AjudaSocietaria chave="doacaoComOnus" rotulo="reserva de usufruto" />
                  </span>
                  <Switch
                    id="doacao-reserva"
                    checked={draft.reserva}
                    onCheckedChange={(v) => set('reserva', v)}
                    disabled={doar.isPending}
                  />
                </div>
                {/* Desligar a reserva NÃO desliga os gravames, e a frase antiga
                    ("sem a reserva é uma doação simples") escondia isso: o ônus
                    continua nascendo pelos gravames marcados na seção 03. */}
                {!draft.reserva && (
                  <p className="text-xs text-muted-foreground">
                    Sem reserva de usufruto. Os gravames selecionados continuam aplicáveis.
                  </p>
                )}
                {draft.reserva && (
                  <>
                    <div className={interruptorCls}>
                      <span className="flex items-center gap-1.5">
                        <label htmlFor="doacao-voto" className="cursor-pointer text-sm font-medium text-foreground">
                          Usufruto estendido ao voto
                        </label>
                        <AjudaSocietaria chave="usufrutoComVoto" rotulo="usufruto estendido ao voto" />
                      </span>
                      <Switch
                        id="doacao-voto"
                        checked={draft.comVoto}
                        onCheckedChange={(v) => set('comVoto', v)}
                        disabled={doar.isPending}
                      />
                    </div>
                    {doadoresEscolhidos.map((id) => {
                      const conjuge = conjugePorDoador.get(id) ?? null;
                      return (
                        <div key={id} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-osg-200/80 p-3 text-sm">
                          <span className="font-medium">{nomes.get(id)}</span>
                          <span className="text-xs text-muted-foreground">usufrui o que doa</span>
                          {conjuge ? (
                            <label className="ml-auto flex items-center gap-2 text-xs">
                              <Checkbox
                                checked={conjugeUsufrui(id)}
                                onCheckedChange={(v) => set('conjugeUsufrui', { ...draft.conjugeUsufrui, [id]: v === true })}
                                disabled={doar.isPending}
                              />
                              <span>
                                <span className="font-medium">{conjuge.denominacao}</span>
                                <span className="text-muted-foreground"> (cônjuge) também usufrui, em conjunto</span>
                              </span>
                            </label>
                          ) : (
                            <span className="ml-auto text-[11px] text-muted-foreground">
                              sem cônjuge vinculado no cadastro
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </FieldSection>

            <FieldSection number="03" title="Gravames sobre as quotas doadas">
              {/* Quatro LINHAS, não quatro cartões: a explicação permanente de
                  cada gravame ocupava mais altura que os pares da doação, e ela
                  agora é ajuda pedida no ícone. */}
              <div className="divide-y divide-osg-100 rounded-md border border-osg-200/80">
                {TODOS_OS_GRAVAMES.map((g) => (
                  <div key={g} className="flex items-center gap-2.5 px-3 py-2.5">
                    <Checkbox
                      id={`gravame-${g}`}
                      checked={draft.gravames.includes(g)}
                      onCheckedChange={(v) => alternarGravame(g, v === true)}
                      disabled={doar.isPending}
                    />
                    <label
                      htmlFor={`gravame-${g}`}
                      className="cursor-pointer text-sm font-medium text-foreground"
                    >
                      {GRAVAMES[g].label}
                    </label>
                    <AjudaSocietaria chave={g} rotulo={GRAVAMES[g].label} />
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Extensivos aos frutos e dividendos, vigentes enquanto os doadores viverem (art. 1.911 do CC).
              </p>
            </FieldSection>

            <FieldSection number="04" title="Origem e datas">
              <div className="space-y-3">
                <div className={interruptorCls}>
                  <span className="flex items-center gap-1.5">
                    <label htmlFor="doacao-origem" className="cursor-pointer text-sm font-medium text-foreground">
                      Declarar a origem no patrimônio do doador
                    </label>
                    <AjudaSocietaria chave="origemDaDoacao" rotulo="origem legítima e disponível" />
                  </span>
                  <Switch
                    id="doacao-origem"
                    checked={draft.declararOrigem}
                    onCheckedChange={(v) => set('declararOrigem', v)}
                    disabled={doar.isPending}
                  />
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Data do instrumento de doação</Label>
                    <Input type="date" value={draft.dataInstrumento} onChange={(e) => set('dataInstrumento', e.target.value)} className={fieldCls} disabled={doar.isPending} />
                    {/* A tela coleta a DATA. Ela não anexa arquivo nenhum, e a
                        frase antiga ("que a alteração anexa") prometia isso. */}
                    <p className="text-[11px] text-muted-foreground">
                      Data do instrumento particular citado na alteração contratual. Informar a data
                      não anexa o arquivo.
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className={labelCls}>Data do ato</Label>
                    <Input type="date" value={draft.dataAto} onChange={(e) => set('dataAto', e.target.value)} className={fieldCls} disabled={doar.isPending} />
                  </div>
                </div>
              </div>
            </FieldSection>

            {preenchido && (
              <FieldSection number="05" title="O que será gravado">
                {plano.problema ? (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{plano.problema}</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-md border border-osg-300/60 bg-osg-50/50 p-3">
                      <ul className="space-y-1 text-sm text-foreground">
                        <li>
                          {plano.lancamentos.length} doação(ões) somando {fmtInt.format(totalDoado)} quotas
                          {plano.lancamentos.some((l) => l.onus) ? ', com ônus sobre as quotas doadas.' : '.'}
                        </li>
                        <li className="text-xs text-muted-foreground">
                          Quadro depois do ato:{' '}
                          {plano.quadroResultante.map((s) => `${s.denominacao} (${fmtInt.format(s.quotas)})`).join(' · ')}
                        </li>
                      </ul>
                    </div>
                    {plano.avisos.map((a) => (
                      <div key={a} className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                        <Info className="mt-0.5 h-4 w-4 shrink-0" />
                        <span>{a}</span>
                      </div>
                    ))}
                    {plano.usufruto && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          Usufruto e voto depois do ato
                        </p>
                        <TabelaUsufrutoEVoto linhas={plano.usufruto.linhas} totais={plano.usufruto.totais} compacta />
                      </div>
                    )}
                  </div>
                )}
              </FieldSection>
            )}
          </div>

          <DialogFooter className="shrink-0 rounded-b-lg border-t border-osg-100 bg-background px-6 py-3.5">
            <Button variant="outline" onClick={pedirFechamento} disabled={doar.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={!preenchido || !!plano.problema || doar.isPending}
              className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
            >
              {doar.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Registrar doação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UnsavedChangesAlert {...alertProps} />
    </>
  );
}
