import { useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/equipe/osg/OsgDialog';
import { useDirtyClose } from '@/components/equipe/osg/useDirtyClose';
import { UnsavedChangesAlert } from '@/components/equipe/osg/UnsavedChangesAlert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { AlertTriangle, Info, Loader2, Plus, Trash2, Vote } from 'lucide-react';
import { FieldSection, fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { SocioDoQuadro } from '@/hooks/useMovimentacaoQuotas';
import { useOnusDaEmpresa } from '@/hooks/useDoacaoDeQuotas';
import { useInstituirUsufruto } from '@/hooks/useInstituicaoDeUsufruto';
import { descricaoDaInstituicao, planejarInstituicaoDeUsufruto } from '@/lib/osg/onusDaSociedade';
import { AjudaSocietaria } from './AjudaSocietaria';
import { GestoEscolhido } from './GestoEscolhido';
import { TabelaUsufrutoEVoto } from './UsufrutoEVoto';
import { fmtInt } from './quadroFmt';

// A INSTITUIÇÃO DE USUFRUTO AVULSA: quem tem a propriedade plena entrega o
// usufruto dela, e nenhuma quota muda de mão.
//
// É o gesto oposto ao de "Doar quotas", e por isso não cabe no mesmo modal: lá
// o doador se DESFAZ da quota e guarda o voto; aqui ele CONTINUA com a quota e
// entrega o voto. O quadro societário não muda; muda quem vota nele. No acervo
// é o que complementa a reserva quando ela não alcança o controle desejado (no
// Agro Aliança, 46,54% de participação contra 51% de voto pretendido).

// Rótulo à esquerda com a ajuda ao lado, controle à direita. Não é um `<label>`
// inteiro: o ícone de ajuda dentro dele alternaria o interruptor.
const interruptorCls = 'flex items-center justify-between gap-3 rounded-md border border-osg-200/80 bg-background p-3';

interface LinhaDraft {
  /** Identidade da LINHA, não do par: é a `key` do React. */
  chave: string;
  nuProprietarioId: string;
  usufrutuarioIds: string[];
  quotas: string;
}

let proximaChave = 0;
const novaLinha = (nuProprietarioId = ''): LinhaDraft => ({
  chave: `inst-${++proximaChave}`,
  nuProprietarioId,
  usufrutuarioIds: [],
  quotas: '',
});

interface Draft {
  linhas: LinhaDraft[];
  comVoto: boolean;
  dataAto: string;
}

const draftInicial = (): Draft => ({
  linhas: [novaLinha('')],
  comVoto: true,
  dataAto: '',
});

interface InstituirUsufrutoDialogProps {
  open: boolean;
  onClose: () => void;
  empresa: PessoaRow;
  quadro: SocioDoQuadro[];
  pessoasCliente: PessoaRow[];
  /** Volta ao seletor de gesto. Ausente quando não há porta para voltar. */
  onTrocar?: () => void;
}

export function InstituirUsufrutoDialog({
  open, onClose, empresa, quadro, pessoasCliente, onTrocar,
}: InstituirUsufrutoDialogProps) {
  const [draft, setDraft] = useState<Draft>(() => draftInicial());
  const instituir = useInstituirUsufruto();
  const { data: onusVigentes = [] } = useOnusDaEmpresa(open ? empresa.id : null);
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

  const nomes = useMemo(() => {
    const m = new Map(pessoasCliente.map((p) => [p.id, p.denominacao ?? '—']));
    for (const s of quadro) if (!m.has(s.pessoaId)) m.set(s.pessoaId, s.denominacao);
    return m;
  }, [pessoasCliente, quadro]);

  /** Quem pode conceder: sócio do quadro. Quem pode usufruir: PF do cliente. */
  const concedentes = quadro;
  const usufrutuarios = useMemo(
    () => pessoasCliente.filter((p) => p.tipo_pessoa === 'PF' && p.id !== empresa.id),
    [pessoasCliente, empresa.id],
  );

  const plano = useMemo(() => planejarInstituicaoDeUsufruto({
    empresaPessoaId: empresa.id,
    quadro: quadro.map((s) => ({ pessoaId: s.pessoaId, denominacao: s.denominacao, quotas: s.quotas })),
    onusVigentes: onusVigentes.map((o) => ({
      id: o.id,
      nuProprietarioId: o.nuProprietarioId,
      usufrutuarioIds: o.usufrutuarioIds,
      usufrutoOrigem: o.usufrutoOrigem,
      comVoto: o.comVoto,
      quotas: o.quotas,
      gravames: o.gravames,
    })),
    nomes,
    pares: draft.linhas.map((l) => ({
      nuProprietarioId: l.nuProprietarioId,
      usufrutuarioIds: l.usufrutuarioIds,
      quotas: l.quotas.trim() ? Number(l.quotas) : NaN,
    })),
    comVoto: draft.comVoto,
  }), [empresa.id, quadro, onusVigentes, nomes, draft]);

  /** Quanto cada concedente ainda tem LIVRE, descontadas as linhas digitadas. */
  const livrePorPessoa = useMemo(() => {
    const m = new Map(quadro.map((s) => [s.pessoaId, s.quotas]));
    for (const o of onusVigentes) {
      if (o.usufrutuarioIds.length === 0) continue;
      m.set(o.nuProprietarioId, (m.get(o.nuProprietarioId) ?? 0) - o.quotas);
    }
    for (const l of draft.linhas) {
      const q = Number(l.quotas);
      if (l.nuProprietarioId && Number.isInteger(q) && q > 0) {
        m.set(l.nuProprietarioId, (m.get(l.nuProprietarioId) ?? 0) - q);
      }
    }
    return m;
  }, [quadro, onusVigentes, draft.linhas]);

  const setLinha = (chave: string, patch: Partial<LinhaDraft>) =>
    setDraft((prev) => ({
      ...prev,
      linhas: prev.linhas.map((l) => (l.chave === chave ? { ...l, ...patch } : l)),
    }));

  const preenchido = draft.linhas.some((l) => l.nuProprietarioId && l.usufrutuarioIds.length > 0 && l.quotas.trim());
  const podeGravar = preenchido && !plano.problema && !!empresa.cliente_id && !instituir.isPending;

  const handleSalvar = () => {
    if (!podeGravar || !empresa.cliente_id) return;
    instituir.mutate(
      {
        clienteId: empresa.cliente_id,
        empresaPessoaId: empresa.id,
        plano,
        descricao: descricaoDaInstituicao(plano, nomes),
        dataDoAto: draft.dataAto || null,
      },
      { onSuccess: onClose },
    );
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && pedirFechamento()}>
        <DialogContent className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-visible p-0 sm:[clip-path:none]">
          <div className="shrink-0 rounded-t-lg bg-background px-6 pt-5">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="flex flex-wrap items-center gap-2.5 text-base font-semibold">
                <Vote className="h-4 w-4 text-osg-moss" />
                Instituir usufruto
                <span className="rounded-md bg-osg-50 px-2 py-0.5 text-xs font-semibold text-osg-700">
                  {empresa.denominacao}
                </span>
              </DialogTitle>
              {/* A frase antiga terminava em "só o voto se desloca", o que é
                  falso com o voto desligado: o usufruto muda uso e gozo de
                  qualquer forma. */}
              <DialogDescription>
                Institua usufruto sem mudar a titularidade das quotas. Confira quem recebe o uso, o
                gozo e, se marcado, o voto.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-4">
            <GestoEscolhido
              rotulo="Instituição de usufruto"
              ajuda="instituicao"
              onTrocar={onTrocar ? pedirTroca : undefined}
              disabled={instituir.isPending}
            />

            <FieldSection number="01" title="Quem concede e quem usufrui">
              <div className="space-y-3">
                {draft.linhas.map((linha) => {
                  const livre = linha.nuProprietarioId
                    ? (livrePorPessoa.get(linha.nuProprietarioId) ?? 0)
                      + (Number(linha.quotas) > 0 ? Number(linha.quotas) : 0)
                    : null;
                  return (
                    <div key={linha.chave} className="rounded-md border border-osg-200/80 p-3 space-y-3">
                      <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_140px_auto]">
                        <div className="space-y-1.5">
                          <Label className={labelCls}>Quem concede (fica com a quota)</Label>
                          <Select
                            value={linha.nuProprietarioId || undefined}
                            onValueChange={(v) => setLinha(linha.chave, {
                              nuProprietarioId: v,
                              usufrutuarioIds: linha.usufrutuarioIds.filter((id) => id !== v),
                            })}
                            disabled={instituir.isPending}
                          >
                            <SelectTrigger className={fieldCls}>
                              <SelectValue placeholder={concedentes.length ? 'Sócio…' : 'Nenhum sócio no quadro'} />
                            </SelectTrigger>
                            <SelectContent>
                              {concedentes.map((s) => (
                                <SelectItem key={s.pessoaId} value={s.pessoaId}>
                                  {s.denominacao} · {fmtInt.format(s.quotas)} quotas
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label className={labelCls}>Quotas</Label>
                          <Input
                            className={fieldCls}
                            inputMode="numeric"
                            value={linha.quotas}
                            onChange={(e) => setLinha(linha.chave, { quotas: e.target.value.replace(/\D/g, '') })}
                            disabled={instituir.isPending}
                          />
                          {livre != null && (
                            <p className="text-[11px] text-muted-foreground">
                              {fmtInt.format(Math.max(0, livre))} com usufruto livre
                            </p>
                          )}
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-9 w-9"
                          aria-label={`Remover a concessão ${draft.linhas.indexOf(linha) + 1}`}
                          title="Remover esta concessão"
                          disabled={draft.linhas.length === 1 || instituir.isPending}
                          onClick={() => setDraft((p) => ({
                            ...p, linhas: p.linhas.filter((l) => l.chave !== linha.chave),
                          }))}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        <Label className={labelCls}>Quem passa a usufruir</Label>
                        <div className="flex flex-wrap gap-x-4 gap-y-2">
                          {usufrutuarios
                            .filter((p) => p.id !== linha.nuProprietarioId)
                            .map((p) => {
                              const marcado = linha.usufrutuarioIds.includes(p.id);
                              return (
                                <label key={p.id} className="flex cursor-pointer items-center gap-2 text-sm">
                                  <Checkbox
                                    checked={marcado}
                                    disabled={instituir.isPending}
                                    onCheckedChange={(v) => setLinha(linha.chave, {
                                      usufrutuarioIds: v
                                        ? [...linha.usufrutuarioIds, p.id]
                                        : linha.usufrutuarioIds.filter((id) => id !== p.id),
                                    })}
                                  />
                                  {p.denominacao}
                                </label>
                              );
                            })}
                        </div>
                        {linha.usufrutuarioIds.length > 1 && (
                          <p className="text-[11px] text-muted-foreground">
                            Usufruto em conjunto: no falecimento de um, o quinhão acresce ao
                            sobrevivente (art. 1.411 do Código Civil).
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={instituir.isPending}
                  onClick={() => setDraft((p) => ({
                    ...p,
                    linhas: [...p.linhas, novaLinha(p.linhas[p.linhas.length - 1]?.nuProprietarioId ?? '')],
                  }))}
                >
                  <Plus className="h-3.5 w-3.5" /> Adicionar concessão
                </Button>
              </div>
            </FieldSection>

            <FieldSection number="02" title="Condições do ato">
              <div className="space-y-3">
                <div className={interruptorCls}>
                  <span className="flex items-center gap-1.5">
                    <label htmlFor="instituicao-voto" className="cursor-pointer text-sm font-medium">
                      O usufruto alcança o direito de voto
                    </label>
                    <AjudaSocietaria chave="usufrutoComVoto" rotulo="usufruto estendido ao voto" />
                  </span>
                  <Switch
                    id="instituicao-voto"
                    checked={draft.comVoto}
                    disabled={instituir.isPending}
                    onCheckedChange={(v) => setDraft((p) => ({ ...p, comVoto: v }))}
                  />
                </div>
                <div className="space-y-1.5 md:w-56">
                  <Label className={labelCls}>Data do ato</Label>
                  <Input
                    type="date"
                    className={fieldCls}
                    value={draft.dataAto}
                    disabled={instituir.isPending}
                    onChange={(e) => setDraft((p) => ({ ...p, dataAto: e.target.value }))}
                  />
                </div>
              </div>
            </FieldSection>

            {plano.usufruto && (
              <FieldSection number="03" title="Como fica o voto depois do ato">
                <TabelaUsufrutoEVoto
                  linhas={plano.usufruto.linhas}
                  totais={plano.usufruto.totais}
                  compacta
                />
              </FieldSection>
            )}

            {/* O limite é do FLUXO, não do preenchimento, e por isso fica à
                vista em vez de dentro da ajuda: `eventosDaAlteracao.ts` não tem
                ramo de instituição, então a peça descreve o ônus pelo
                consolidado e não por uma resolução própria. */}
            <p className="text-xs text-muted-foreground">
              O consolidado já descreve o ônus. A resolução própria da instituição ainda não é
              incluída automaticamente neste fluxo.
            </p>
            {plano.avisos.map((aviso) => (
              <p key={aviso} className="flex items-start gap-2 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {aviso}
              </p>
            ))}
            {preenchido && plano.problema && (
              <p className="flex items-start gap-2 text-xs text-destructive">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {plano.problema}
              </p>
            )}
          </div>

          <DialogFooter className="shrink-0 gap-2 border-t px-6 py-4">
            <Button variant="outline" onClick={pedirFechamento} disabled={instituir.isPending}>
              Cancelar
            </Button>
            <Button
              className="gap-1.5 bg-osg-moss text-white hover:bg-osg-moss/90"
              onClick={handleSalvar}
              disabled={!podeGravar}
            >
              {instituir.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Registrar instituição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <UnsavedChangesAlert {...alertProps} />
    </>
  );
}
