import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { useDirtyClose } from '@/components/equipe/osg/useDirtyClose';
import { UnsavedChangesAlert } from '@/components/equipe/osg/UnsavedChangesAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequiredMark } from '@/components/ui/required-mark';
import { AlertTriangle, Info, Loader2 } from 'lucide-react';
import { fieldCls, labelCls, FieldSection } from '@/components/equipe/osg/formKit';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { useRegistrarMovimento, type SocioDoQuadro } from '@/hooks/useMovimentacaoQuotas';
import { useOnusDaEmpresa } from '@/hooks/useDoacaoDeQuotas';
import { planejarSubrogacao } from '@/lib/osg/onusDaSociedade';
import {
  capitalDoMovimento,
  FORMAS_MOVIMENTO,
  problemaDoMovimento,
  type MovimentoDeQuotas,
  type TipoMovimento,
} from '@/lib/osg/movimentoQuotas';
import { AjudaSocietaria } from './AjudaSocietaria';
import { AJUDA_DO_TIPO } from './gestosSocietarios';
import { GestoEscolhido } from './GestoEscolhido';
import { fmtBRL, fmtInt } from './quadroFmt';

// O formulário do movimento de quota, que substituiu o formulário do SÓCIO.
//
// A diferença não é de campos, é de objeto: antes se editava a linha do sócio no
// quadro (e remover sócio apagava a linha), agora se registra o que aconteceu e o
// quadro é a consequência. É por isso que não há "editar": saldo não se edita,
// e corrigir um número é registrar o movimento que faltava.
//
// O TIPO chega pronto, de fora. Antes ele era escolhido aqui, num select que
// abria em Aporte (ou em Cessão, quando o gesto partia da linha de um sócio):
// quem entrava já entrava com uma decisão tomada por inferência, e a doação com
// reserva aparecia na lista só para mandar o consultor fechar a janela e
// procurar outro botão. A escolha virou passo próprio, antes do formulário
// (`EscolherMovimentoDialog`), e daqui saiu junto o aviso que apontava para ela.

interface MovimentoModalProps {
  open: boolean;
  /** O gesto escolhido na porta de entrada. Não há mais tipo por inferência. */
  tipo: TipoMovimento;
  empresa: PessoaRow;
  /** Quadro atual (saldo): de onde saem os candidatos a cedente e os limites. */
  quadro: SocioDoQuadro[];
  pessoasCliente: PessoaRow[];
  onClose: () => void;
  /** Volta ao seletor de gesto. Ausente quando não há porta para voltar. */
  onTrocar?: () => void;
}

interface Draft {
  tipo: TipoMovimento;
  origemPessoaId: string;
  destinoPessoaId: string;
  quotas: string;
  dataMovimento: string;
}

const draftInicial = (tipo: TipoMovimento): Draft => ({
  tipo,
  origemPessoaId: '',
  destinoPessoaId: '',
  quotas: '',
  dataMovimento: '',
});

export function MovimentoModal({
  open, tipo, empresa, quadro, pessoasCliente, onClose, onTrocar,
}: MovimentoModalProps) {
  const [draft, setDraft] = useState<Draft>(() => draftInicial(tipo));
  const registrar = useRegistrarMovimento();
  const initialDraftRef = useRef<string>('');

  // O tipo vive no DRAFT, e não direto na prop, para o rótulo não piscar durante
  // a animação de fechamento: o efeito só corre com o modal aberto.
  useEffect(() => {
    if (!open) return;
    const inicial = draftInicial(tipo);
    setDraft(inicial);
    initialDraftRef.current = JSON.stringify(inicial);
  }, [open, tipo]);

  const isDirty = JSON.stringify(draft) !== initialDraftRef.current;
  // Saída confirmada, com DOIS destinos: fechar de vez ou voltar ao seletor. O
  // guard é o mesmo, e o destino é decidido por quem pediu a saída — trocar de
  // gesto com o formulário preenchido descarta o draft pela mesma pergunta que
  // fechar a janela faria.
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

  const forma = FORMAS_MOVIMENTO[draft.tipo];
  const { data: onusVigentes = [] } = useOnusDaEmpresa(open ? empresa.id : null);
  const nomes = useMemo(() => {
    const m = new Map(pessoasCliente.map((p) => [p.id, p.denominacao ?? '—']));
    for (const s of quadro) if (!m.has(s.pessoaId)) m.set(s.pessoaId, s.denominacao);
    return m;
  }, [pessoasCliente, quadro]);
  const saldo = useMemo(
    () => new Map(quadro.map((s) => [s.pessoaId, s.quotas])),
    [quadro],
  );
  const nomePorPessoa = useMemo(
    () => new Map(pessoasCliente.map((p) => [p.id, p.denominacao ?? '—'])),
    [pessoasCliente],
  );

  // Cedente: só quem TEM quotas nesta empresa. Adquirente: qualquer pessoa do
  // cliente, menos a própria empresa, porque entrar sócio novo é o caso normal.
  const candidatosDestino = useMemo(
    () => pessoasCliente.filter((p) => p.id !== empresa.id),
    [pessoasCliente, empresa.id],
  );

  const quotas = draft.quotas.trim() ? Number(draft.quotas) : NaN;
  const movimento: MovimentoDeQuotas = {
    tipo: draft.tipo,
    origemPessoaId: forma.rotuloOrigem ? (draft.origemPessoaId || null) : null,
    destinoPessoaId: forma.rotuloDestino ? (draft.destinoPessoaId || null) : null,
    quotas,
    dataMovimento: draft.dataMovimento || null,
  };
  const problemaDoLivro = problemaDoMovimento(movimento, saldo, empresa.id);
  const saldoDaOrigem = draft.origemPessoaId ? (saldo.get(draft.origemPessoaId) ?? 0) : null;

  // O ÔNUS acompanha a quota. Se as quotas que saem estiverem gravadas ou sob
  // usufruto, o gesto tem consequência além do quadro, e o consultor precisa
  // ver isso ANTES de gravar — inclusive a recusa, quando a inalienabilidade
  // barra uma cessão onerosa. A mutação recalcula o mesmo plano na hora de
  // escrever; aqui ele só é mostrado.
  const subrogacao = useMemo(() => {
    if (!movimento.origemPessoaId || movimento.tipo === 'aporte') return null;
    return planejarSubrogacao({
      movimento: {
        tipo: movimento.tipo,
        origemPessoaId: movimento.origemPessoaId,
        destinoPessoaId: movimento.destinoPessoaId,
        quotas: movimento.quotas,
      },
      onusVigentes: onusVigentes.map((o) => ({
        id: o.id,
        nuProprietarioId: o.nuProprietarioId,
        usufrutuarioIds: o.usufrutuarioIds,
        usufrutoOrigem: o.usufrutoOrigem,
        comVoto: o.comVoto,
        quotas: o.quotas,
        gravames: o.gravames,
      })),
      saldoDoCedente: saldo.get(movimento.origemPessoaId) ?? 0,
      nomes,
    });
  }, [movimento.tipo, movimento.origemPessoaId, movimento.destinoPessoaId, movimento.quotas, onusVigentes, saldo, nomes]);
  const problema = problemaDoLivro ?? subrogacao?.problema ?? null;

  const setCampo = <K extends keyof Draft>(campo: K, valor: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [campo]: valor }));

  const handleSalvar = () => {
    if (problema) return;
    // O log nomeia quem entra no quadro; na redução, de quem as quotas saíram.
    const idLogado = movimento.destinoPessoaId ?? movimento.origemPessoaId!;
    registrar.mutate(
      {
        clienteId: empresa.cliente_id!,
        empresaPessoaId: empresa.id,
        movimento,
        entityName: nomePorPessoa.get(idLogado) ?? 'Sócio',
      },
      { onSuccess: onClose },
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && pedirFechamento()}>
        <DialogContent className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-visible p-0 sm:[clip-path:none]">
          <div className="shrink-0 rounded-t-lg bg-background px-6 pt-5">
            <DialogHeader className="space-y-0 text-left">
              <DialogTitle className="flex items-center gap-2.5 text-base font-semibold">
                Registrar movimento de quotas
                <span className="rounded-md bg-osg-50 px-2 py-0.5 text-xs font-semibold text-osg-700">
                  {empresa.denominacao}
                </span>
              </DialogTitle>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-0 overflow-y-auto px-6 py-5">
            <FieldSection number="01" title="O que aconteceu">
              <div className="space-y-2">
                <GestoEscolhido
                  rotulo={forma.label}
                  ajuda={AJUDA_DO_TIPO[draft.tipo]}
                  onTrocar={onTrocar ? pedirTroca : undefined}
                  disabled={registrar.isPending}
                />
                <p className="text-xs text-muted-foreground">{forma.descricao}</p>
              </div>
            </FieldSection>

            <FieldSection number="02" title="Quem">
              <div className="space-y-3">
                {forma.rotuloOrigem && (
                  <div className="space-y-1.5">
                    <Label className={labelCls}>{forma.rotuloOrigem}<RequiredMark /></Label>
                    <Select
                      value={draft.origemPessoaId || undefined}
                      onValueChange={(v) => setCampo('origemPessoaId', v)}
                    >
                      <SelectTrigger className={fieldCls}>
                        <SelectValue
                          placeholder={quadro.length ? 'Selecione...' : 'Nenhum sócio no quadro'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {quadro.map((s) => (
                          <SelectItem key={s.pessoaId} value={s.pessoaId}>
                            {s.denominacao} · {fmtInt.format(s.quotas)} quotas
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {forma.rotuloDestino && (
                  <div className="space-y-1.5">
                    <Label className={labelCls}>{forma.rotuloDestino}<RequiredMark /></Label>
                    <Select
                      value={draft.destinoPessoaId || undefined}
                      onValueChange={(v) => setCampo('destinoPessoaId', v)}
                    >
                      <SelectTrigger className={fieldCls}>
                        <SelectValue
                          placeholder={candidatosDestino.length ? 'Selecione...' : 'Nenhuma pessoa cadastrada'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {candidatosDestino.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.denominacao}{p.cpf_cnpj ? ` (${p.cpf_cnpj})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </FieldSection>

            <FieldSection number="03" title="Quanto">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className={labelCls}>Quotas<RequiredMark /></Label>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={draft.quotas}
                    onChange={(e) => setCampo('quotas', e.target.value)}
                    placeholder="0"
                    className={fieldCls}
                  />
                  {saldoDaOrigem != null && saldoDaOrigem > 0 && (
                    <button
                      type="button"
                      onClick={() => setCampo('quotas', String(saldoDaOrigem))}
                      className="text-xs font-medium text-osg-700 underline-offset-2 hover:underline"
                    >
                      Mover todas as {fmtInt.format(saldoDaOrigem)} quotas
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className={labelCls}>Data do movimento</Label>
                  <Input
                    type="date"
                    value={draft.dataMovimento}
                    onChange={(e) => setCampo('dataMovimento', e.target.value)}
                    className={fieldCls}
                  />
                </div>
              </div>
              {/* O valor não se digita: é as quotas ao valor nominal da casa. Ver
                  capitalDoMovimento. Gravar o preço pago aqui corromperia o
                  capital do quadro, que é a soma desta coluna. O número
                  calculado continua à vista; o que virou ajuda pedida é a
                  distinção entre nominal e preço pago. */}
              <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                <span>
                  Valor de capital das quotas movidas:{' '}
                  <span className="font-semibold tabular-nums text-foreground">
                    {Number.isInteger(quotas) && quotas > 0 ? fmtBRL.format(capitalDoMovimento(quotas)) : '—'}
                  </span>
                  {' '}· ao valor nominal de {fmtBRL.format(capitalDoMovimento(1))} por quota.
                </span>
                <AjudaSocietaria chave="valorNominal" rotulo="valor nominal" />
              </p>
            </FieldSection>

            {isDirty && !problemaDoLivro && (subrogacao?.avisos.length ?? 0) > 0 && (
              <div className="mt-6 space-y-1.5">
                {subrogacao!.avisos.map((aviso) => (
                  <p key={aviso} className="flex items-start gap-2 text-xs text-muted-foreground">
                    <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {aviso}
                  </p>
                ))}
              </div>
            )}
            {isDirty && problema && (
              <div className="mt-6 flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{problema}</span>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 rounded-b-lg border-t border-osg-100 bg-background px-6 py-3.5">
            <Button variant="outline" onClick={pedirFechamento} disabled={registrar.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleSalvar}
              disabled={!!problema || registrar.isPending}
              className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
            >
              {registrar.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Registrar {forma.label.toLowerCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UnsavedChangesAlert {...alertProps} />
    </>
  );
}
