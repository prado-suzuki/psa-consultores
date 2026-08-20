import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { useDirtyClose } from '@/components/equipe/osg/useDirtyClose';
import { UnsavedChangesAlert } from '@/components/equipe/osg/UnsavedChangesAlert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequiredMark } from '@/components/ui/required-mark';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { fieldCls, labelCls, FieldSection } from '@/components/equipe/osg/formKit';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { useRegistrarMovimento, type SocioDoQuadro } from '@/hooks/useMovimentacaoQuotas';
import {
  capitalDoMovimento,
  FORMAS_MOVIMENTO,
  problemaDoMovimento,
  TIPOS_MOVIMENTO,
  type MovimentoDeQuotas,
  type TipoMovimento,
} from '@/lib/osg/movimentoQuotas';
import { fmtBRL, fmtInt } from './quadroFmt';

// O formulário do movimento de quota, que substituiu o formulário do SÓCIO.
//
// A diferença não é de campos, é de objeto: antes se editava a linha do sócio no
// quadro (e remover sócio apagava a linha), agora se registra o que aconteceu e o
// quadro é a consequência. É por isso que não há "editar": saldo não se edita,
// e corrigir um número é registrar o movimento que faltava.

interface MovimentoModalProps {
  open: boolean;
  empresa: PessoaRow;
  /** Quadro atual (saldo): de onde saem os candidatos a cedente e os limites. */
  quadro: SocioDoQuadro[];
  pessoasCliente: PessoaRow[];
  /** Cedente já escolhido, quando o gesto partiu da linha de um sócio. */
  origemInicial?: string | null;
  onClose: () => void;
}

interface Draft {
  tipo: TipoMovimento;
  origemPessoaId: string;
  destinoPessoaId: string;
  quotas: string;
  dataMovimento: string;
}

const draftInicial = (origemInicial?: string | null): Draft => ({
  // Partindo da linha de um sócio, o gesto pretendido é mover as quotas DELE: a
  // cessão é o caso comum, e o aporte não tem cedente.
  tipo: origemInicial ? 'cessao' : 'aporte',
  origemPessoaId: origemInicial ?? '',
  destinoPessoaId: '',
  quotas: '',
  dataMovimento: '',
});

export function MovimentoModal({
  open, empresa, quadro, pessoasCliente, origemInicial, onClose,
}: MovimentoModalProps) {
  const [draft, setDraft] = useState<Draft>(() => draftInicial(origemInicial));
  const registrar = useRegistrarMovimento();
  const initialDraftRef = useRef<string>('');

  useEffect(() => {
    if (!open) return;
    const inicial = draftInicial(origemInicial);
    setDraft(inicial);
    initialDraftRef.current = JSON.stringify(inicial);
  }, [open, origemInicial]);

  const isDirty = JSON.stringify(draft) !== initialDraftRef.current;
  const { requestClose, alertProps } = useDirtyClose({ isDirty, onClose });

  const forma = FORMAS_MOVIMENTO[draft.tipo];
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
  const problema = problemaDoMovimento(movimento, saldo, empresa.id);
  const saldoDaOrigem = draft.origemPessoaId ? (saldo.get(draft.origemPessoaId) ?? 0) : null;

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
      <Dialog open={open} onOpenChange={(o) => !o && requestClose()}>
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
              <div className="space-y-1.5">
                <Label className={labelCls}>Tipo do movimento<RequiredMark /></Label>
                <Select
                  value={draft.tipo}
                  onValueChange={(v) =>
                    setDraft((prev) => {
                      const nova = FORMAS_MOVIMENTO[v as TipoMovimento];
                      // Limpa o lado que o novo tipo não tem, senão a validação
                      // reclamaria de um cedente que a tela nem mostra mais.
                      return {
                        ...prev,
                        tipo: v as TipoMovimento,
                        origemPessoaId: nova.rotuloOrigem ? prev.origemPessoaId : '',
                        destinoPessoaId: nova.rotuloDestino ? prev.destinoPessoaId : '',
                      };
                    })}
                >
                  <SelectTrigger className={fieldCls}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TIPOS_MOVIMENTO.map((t) => (
                      <SelectItem key={t} value={t}>
                        {FORMAS_MOVIMENTO[t].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                  capital do quadro, que é a soma desta coluna. */}
              <p className="mt-3 text-xs text-muted-foreground">
                Valor de capital das quotas movidas:{' '}
                <span className="font-semibold tabular-nums text-foreground">
                  {Number.isInteger(quotas) && quotas > 0 ? fmtBRL.format(capitalDoMovimento(quotas)) : '—'}
                </span>
                {' '}· ao valor nominal de {fmtBRL.format(capitalDoMovimento(1))} por quota, não ao preço pago.
              </p>
            </FieldSection>

            {isDirty && problema && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50/60 p-3 text-xs text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{problema}</span>
              </div>
            )}
          </div>

          <DialogFooter className="shrink-0 rounded-b-lg border-t border-osg-100 bg-background px-6 py-3.5">
            <Button variant="outline" onClick={requestClose} disabled={registrar.isPending}>
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
