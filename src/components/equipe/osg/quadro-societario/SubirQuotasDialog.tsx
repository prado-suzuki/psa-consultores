import { useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RequiredMark } from '@/components/ui/required-mark';
import { AlertTriangle, ArrowUpFromLine, Info, Loader2 } from 'lucide-react';
import { fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { useQuadroDaEmpresa, useSubirQuotas, type SocioDoQuadro } from '@/hooks/useMovimentacaoQuotas';
import { useConstitutivosRegistrados } from '@/hooks/useDocumentoGerado';
import { avaliarTravaDaSubida } from '@/lib/osg/travaDaSubida';
import { planejarSubidaDeQuotas, type SocioQueSobe } from '@/lib/osg/subidaDeQuotas';
import { fmtBRL, fmtInt } from './quadroFmt';

// O MACRO da subida das quotas: os sócios da Proprietária passam as quotas dela
// para a Controladora e recebem quotas da Controladora em troca.
//
// Não há formulário além da controladora e da data porque não há mais nada a
// perguntar: dadas as duas empresas, quem sobe, com quantas quotas e por qual
// valor sai do quadro, e a quantidade a emitir sai do valor. Pedir esses números
// ao consultor seria pedir que ele reproduzisse à mão a conta que o sistema faz,
// nas duas empresas, com o invariante fechando dos dois lados.
//
// O que este modal NÃO faz é criar documento. A peça nasce depois, pelo fluxo
// normal da tela Gerar, que já tem os porteiros dela (validar versão, snapshot
// congelado, registro na junta, sucessão). Ver a seção 3.5 do plano.

interface SubirQuotasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A Proprietária: de onde as quotas saem. */
  proprietaria: PessoaRow;
  /** Quadro atual da proprietária (o saldo que vai subir). */
  quadro: SocioDoQuadro[];
  /** Candidatas a controladora: as PJ tipo CN do cliente. */
  controladoras: PessoaRow[];
}

const paraSocioQueSobe = (s: SocioDoQuadro): SocioQueSobe => ({
  pessoaId: s.pessoaId,
  denominacao: s.denominacao,
  quotas: s.quotas,
  valor: s.vlrTotal,
});

export const SubirQuotasDialog = ({
  open,
  onOpenChange,
  proprietaria,
  quadro,
  controladoras,
}: SubirQuotasDialogProps) => {
  const [controladoraId, setControladoraId] = useState('');
  const [data, setData] = useState('');
  const subir = useSubirQuotas();

  const controladora = controladoras.find((c) => c.id === controladoraId) ?? null;
  // O quadro da controladora é o capital de constituição a que o aporte SOMA:
  // sem ele não dá para dizer qual proporção o ato vai produzir lá.
  const { data: quadroCN = [], isLoading: carregandoCN } = useQuadroDaEmpresa(controladoraId || null);
  // As duas pontas precisam existir na junta. O card lá fora já confere a
  // Proprietária; aqui a conferência fecha, porque é aqui que a controladora é
  // escolhida, e uma CN recém-cadastrada não tem contrato registrado nenhum.
  const { data: constitutivosRegistrados, isLoading: carregandoRegistros } =
    useConstitutivosRegistrados(proprietaria.cliente_id ?? null);
  const trava = avaliarTravaDaSubida(
    controladora
      ? [
          { pessoaId: proprietaria.id, denominacao: proprietaria.denominacao },
          { pessoaId: controladora.id, denominacao: controladora.denominacao },
        ]
      : [{ pessoaId: proprietaria.id, denominacao: proprietaria.denominacao }],
    constitutivosRegistrados ?? new Set<string>(),
  );
  const travado = carregandoRegistros || !trava.liberado;

  const plano = useMemo(() => {
    if (!controladora) return null;
    return planejarSubidaDeQuotas({
      proprietariaPessoaId: proprietaria.id,
      controladoraPessoaId: controladora.id,
      socios: quadro.map(paraSocioQueSobe),
      quadroControladora: quadroCN.map(paraSocioQueSobe),
      dataMovimento: data || null,
    });
  }, [controladora, proprietaria.id, quadro, quadroCN, data]);

  const fechar = (aberto: boolean) => {
    if (!aberto) {
      setControladoraId('');
      setData('');
    }
    onOpenChange(aberto);
  };

  const gravar = async () => {
    if (!plano || !controladora || !proprietaria.cliente_id) return;
    await subir.mutateAsync({
      clienteId: proprietaria.cliente_id,
      plano,
      empresas: [
        { pessoaId: proprietaria.id, denominacao: proprietaria.denominacao },
        { pessoaId: controladora.id, denominacao: controladora.denominacao },
      ],
      descricao: `Subida das quotas da ${proprietaria.denominacao} para a ${controladora.denominacao}`,
      dataMovimento: data || null,
    });
    fechar(false);
  };

  const totalQuotas = quadro.reduce((s, l) => s + l.quotas, 0);

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpFromLine className="h-4 w-4 text-osg-moss" />
            Transferir quotas para a controladora
          </DialogTitle>
          <DialogDescription>
            Os sócios de <span className="font-medium text-slate-700">{proprietaria.denominacao}</span>{' '}
            cedem as quotas que têm nela e recebem, em troca, quotas da controladora, no mesmo ato.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className={labelCls}>
                Controladora <RequiredMark />
              </Label>
              <Select value={controladoraId} onValueChange={setControladoraId}>
                <SelectTrigger className={fieldCls}>
                  <SelectValue placeholder="Escolha a controladora" />
                </SelectTrigger>
                <SelectContent>
                  {controladoras.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.denominacao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className={labelCls}>Data do ato</Label>
              <Input
                type="date"
                className={fieldCls}
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
          </div>

          {controladoras.length === 0 && (
            <p className="rounded-md border border-amber-300/70 bg-amber-50/60 p-3 text-xs text-amber-900">
              Este cliente não tem empresa Controladora (CN) cadastrada. Cadastre-a em Qualificação
              das Partes antes de subir as quotas.
            </p>
          )}

          {!carregandoRegistros && !trava.liberado && (
            <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{trava.motivo}</span>
            </div>
          )}

          {controladora && carregandoCN && (
            <p className="text-sm text-muted-foreground">Lendo o quadro da controladora...</p>
          )}

          {plano && !carregandoCN && (
            <div className="space-y-3">
              {plano.problema ? (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{plano.problema}</span>
                </div>
              ) : (
                <>
                  <div className="rounded-md border border-osg-300/60 bg-osg-50/50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-osg-700">
                      O que será gravado
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      <li>
                        {plano.lancamentos.length / 2} cessão(ões) em {proprietaria.denominacao}:{' '}
                        {fmtInt.format(totalQuotas)} quotas ({fmtBRL.format(plano.totalValorCedido)}) para{' '}
                        {controladora.denominacao}.
                      </li>
                      <li>
                        {plano.lancamentos.length / 2} aporte(s) em {controladora.denominacao},
                        integralizados com essas quotas: {fmtBRL.format(plano.totalValorAportado)}.
                      </li>
                    </ul>
                  </div>

                  <div className="rounded-md border border-osg-200/80 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Quadro da controladora depois do ato
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-slate-700">
                      {plano.quadroResultante.map((s) => (
                        <li key={s.pessoaId} className="flex justify-between gap-3">
                          <span className="truncate">{s.denominacao}</span>
                          <span className="tabular-nums">
                            {fmtInt.format(s.quotas)} quotas · {fmtBRL.format(s.valor)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plano.avisoDeProporcao && (
                    <div className="flex items-start gap-2 rounded-md border border-amber-300/70 bg-amber-50/60 p-3 text-xs text-amber-900">
                      <Info className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{plano.avisoDeProporcao}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => fechar(false)} disabled={subir.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={gravar}
            disabled={!plano || !!plano.problema || carregandoCN || travado || subir.isPending}
          >
            {subir.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Transferir quotas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
