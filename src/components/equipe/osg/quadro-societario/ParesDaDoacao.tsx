import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowRight, Plus, Trash2 } from 'lucide-react';
import { fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { SocioDoQuadro } from '@/hooks/useMovimentacaoQuotas';
import { repartirOrigem } from '@/lib/osg/doacaoDeQuotas';
import { novoPar, type ParDraft } from './doacaoDraft';
import { fmtInt } from './quadroFmt';

// As linhas doador → donatário da doação. Cada linha é um par, e cada par vira
// uma cláusula do instrumento: na MMS 3ª o casal doa às duas filhas em quatro
// pares, e a peça os enumera um a um.

interface ParesDaDoacaoProps {
  pares: ParDraft[];
  onChange: (pares: ParDraft[]) => void;
  /** Quem pode doar: os sócios pessoa física do quadro. */
  doadores: SocioDoQuadro[];
  /** Quem pode receber: as pessoas físicas do cliente. */
  donatarios: PessoaRow[];
  /** Quanto cada doador ainda tem, descontados os pares anteriores. */
  saldoRestante: ReadonlyMap<string, number>;
  declararOrigem: boolean;
  disabled?: boolean;
}

export const ParesDaDoacao = ({
  pares, onChange, doadores, donatarios, saldoRestante, declararOrigem, disabled,
}: ParesDaDoacaoProps) => {
  const setPar = (chave: string, patch: Partial<ParDraft>) =>
    onChange(pares.map((p) => (p.chave === chave ? { ...p, ...patch } : p)));

  return (
    <div className="space-y-3">
      {pares.map((par, i) => {
        const quotas = par.quotas.trim() ? Number(par.quotas) : NaN;
        const saldoAntes = par.doadorId
          ? (saldoRestante.get(par.doadorId) ?? 0) + (Number.isInteger(quotas) && quotas > 0 ? quotas : 0)
          : null;
        const origem = declararOrigem && Number.isInteger(quotas) && quotas > 0 ? repartirOrigem(quotas) : null;
        return (
          <div key={par.chave} className="rounded-md border border-osg-200/80 p-3">
            <div className="grid grid-cols-1 items-end gap-3 md:grid-cols-[1fr_auto_1fr_120px_auto]">
              <div className="space-y-1.5">
                <Label className={labelCls}>Quem doa</Label>
                <Select
                  value={par.doadorId || undefined}
                  onValueChange={(v) => setPar(par.chave, { doadorId: v })}
                  disabled={disabled}
                >
                  <SelectTrigger className={fieldCls}>
                    <SelectValue placeholder={doadores.length ? 'Sócio…' : 'Nenhum sócio PF no quadro'} />
                  </SelectTrigger>
                  <SelectContent>
                    {doadores.map((s) => (
                      <SelectItem key={s.pessoaId} value={s.pessoaId}>
                        {s.denominacao} · {fmtInt.format(s.quotas)} quotas
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <ArrowRight aria-hidden className="mb-2.5 hidden h-4 w-4 text-muted-foreground md:block" />
              <div className="space-y-1.5">
                <Label className={labelCls}>Quem recebe</Label>
                <Select
                  value={par.donatarioId || undefined}
                  onValueChange={(v) => setPar(par.chave, { donatarioId: v })}
                  disabled={disabled}
                >
                  <SelectTrigger className={fieldCls}>
                    <SelectValue placeholder="Pessoa…" />
                  </SelectTrigger>
                  <SelectContent>
                    {donatarios.filter((p) => p.id !== par.doadorId).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.denominacao}{p.cpf_cnpj ? ` (${p.cpf_cnpj})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className={labelCls}>Quotas</Label>
                <Input
                  type="number"
                  min={1}
                  step={1}
                  value={par.quotas}
                  onChange={(e) => setPar(par.chave, { quotas: e.target.value })}
                  placeholder="0"
                  className={fieldCls}
                  disabled={disabled}
                />
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="mb-0.5 h-9 w-9 shrink-0"
                // O nome diz QUAL par: com quatro linhas iguais na tela, quatro
                // botões chamados "Remover este par" não distinguem nada para
                // quem navega por teclado ou leitor de tela.
                aria-label={`Remover o par ${i + 1}`}
                title="Remover este par"
                onClick={() => onChange(pares.filter((p) => p.chave !== par.chave))}
                disabled={disabled || pares.length === 1}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {saldoAntes != null && saldoAntes > 0 && (
                <button
                  type="button"
                  className="font-medium text-osg-700 underline-offset-2 hover:underline disabled:opacity-50"
                  onClick={() => setPar(par.chave, { quotas: String(saldoAntes) })}
                  disabled={disabled}
                >
                  Doar todas as {fmtInt.format(saldoAntes)} quotas restantes
                </button>
              )}
              {origem && (
                <span>
                  Origem: {fmtInt.format(origem.legitima)} da legítima · {fmtInt.format(origem.disponivel)} da disponível
                </span>
              )}
              {i === pares.length - 1 && (
                <span className="ml-auto text-[11px]">Par {i + 1} de {pares.length}</span>
              )}
            </div>
          </div>
        );
      })}
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="gap-1.5"
        onClick={() => onChange([...pares, novoPar(pares.at(-1)?.doadorId ?? '')])}
        disabled={disabled}
      >
        <Plus className="h-3.5 w-3.5" /> Adicionar par
      </Button>
    </div>
  );
};
