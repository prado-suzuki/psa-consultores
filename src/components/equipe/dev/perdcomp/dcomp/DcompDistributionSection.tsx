import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RequiredMark } from '@/components/ui/required-mark';
import type { CodigoReceita, GrupoTributo } from '@/hooks/useCatalogoTributos';
import { cn } from '@/lib/utils';
import {
  formatCompetenciaDisplay,
  formatCurrencyDisplay,
  isCompetenciaValida,
  round2,
  toCents,
  type DistribuicaoExistente,
  type DistribuicaoLinha,
} from '@/lib/dcompForm';

interface DcompDistributionSectionProps {
  distribuicoes: DistribuicaoLinha[];
  distribuicoesExistentes: DistribuicaoExistente[];
  grupos: GrupoTributo[];
  codigosPorGrupo: Record<string, CodigoReceita[]>;
  isEditing: boolean;
  dtEnvioMudou: boolean;
  proporcaoOriginal: number;
  totalRateado: number;
  somaIgual: boolean;
  vlrCompensado: number;
  emCarenciaNaDtEnvio: boolean;
  fatorSelic: number;
  distribuicoesValidas: boolean;
  temDistribuicao: boolean;
  temGrupoNaoSelecionado: boolean;
  temValorZero: boolean;
  temCompetenciaInvalida: boolean;
  onAddLinha: () => void;
  onUpdateLinhaGrupo: (idx: number, grupoTributoId: string) => void;
  onUpdateLinhaCodigo: (idx: number, codigoReceitaId: string) => void;
  onUpdateLinhaValor: (idx: number, raw: string) => void;
  onUpdateLinhaCompetencia: (idx: number, raw: string) => void;
  onRemoverLinha: (idx: number) => void;
}

export function DcompDistributionSection({
  distribuicoes,
  distribuicoesExistentes,
  grupos,
  codigosPorGrupo,
  isEditing,
  dtEnvioMudou,
  proporcaoOriginal,
  totalRateado,
  somaIgual,
  vlrCompensado,
  emCarenciaNaDtEnvio,
  fatorSelic,
  distribuicoesValidas,
  temDistribuicao,
  temGrupoNaoSelecionado,
  temValorZero,
  temCompetenciaInvalida,
  onAddLinha,
  onUpdateLinhaGrupo,
  onUpdateLinhaCodigo,
  onUpdateLinhaValor,
  onUpdateLinhaCompetencia,
  onRemoverLinha,
}: DcompDistributionSectionProps) {
  return (
    <>
      {/* Rateio de tributos */}
      <div className="space-y-2 rounded-md border p-3">
        <div className="flex items-center justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onAddLinha}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar Tributo
          </Button>
        </div>

        <div className="grid grid-cols-[150px_180px_1fr_1fr_110px_36px] items-center gap-2">
          <FormLabel className="m-0">
            Grupo de Tributo <RequiredMark />
          </FormLabel>
          <FormLabel className="m-0">Código de Receita</FormLabel>
          <FormLabel className="m-0">Valor Utilizado nesta DCOMP</FormLabel>
          <FormLabel className="m-0">Valor Original</FormLabel>
          <FormLabel className="m-0">
            Competência <RequiredMark />
          </FormLabel>
          <div />
        </div>

        {distribuicoes.length === 0 && (
          <p className="text-xs text-muted-foreground">Nenhum tributo adicionado.</p>
        )}

        <div className="space-y-2">
          {distribuicoes.map((linha, idx) => {
            const k = linha.id || `local-${idx}`;
            const valorZero = toCents(linha.valor_tributo || 0) === 0;
            const competenciaInvalida = !isCompetenciaValida(linha.competencia || '');
            const linhaOriginalUI =
              isEditing && linha.id
                ? distribuicoesExistentes.find((o) => o.id === linha.id)
                : undefined;
            const valorTributoMudouUI = linhaOriginalUI
              ? toCents(linhaOriginalUI.valor_tributo) !== toCents(linha.valor_tributo || 0)
              : true;
            const preservadoUI =
              isEditing && linha.valor_original != null && !dtEnvioMudou && !valorTributoMudouUI;
            const valorOriginalLinha = preservadoUI
              ? (linha.valor_original as number)
              : round2((linha.valor_tributo || 0) * proporcaoOriginal);
            const exibirValorOriginal =
              isEditing && linha.valor_original == null && !valorTributoMudouUI && !dtEnvioMudou;
            const codigosDisponiveis = linha.grupo_tributo_id
              ? codigosPorGrupo[linha.grupo_tributo_id] || []
              : [];
            const codigoSelecionado = codigosDisponiveis.find(
              (c) => c.id === linha.codigo_receita_id,
            );
            return (
              <div
                key={k}
                className="grid grid-cols-[150px_180px_1fr_1fr_110px_36px] items-center gap-2"
              >
                <Select
                  value={linha.grupo_tributo_id || undefined}
                  onValueChange={(v) => onUpdateLinhaGrupo(idx, v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {grupos.map((g) => (
                      <SelectItem key={g.id} value={g.id} title={g.denominacao}>
                        {g.sigla}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={linha.codigo_receita_id || undefined}
                  onValueChange={(v) => onUpdateLinhaCodigo(idx, v)}
                  disabled={!linha.grupo_tributo_id}
                >
                  <SelectTrigger className="h-9" title={codigoSelecionado?.denominacao_receita}>
                    <SelectValue placeholder={linha.grupo_tributo_id ? 'Selecione' : '—'} />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {codigosDisponiveis.map((c) => (
                      <SelectItem key={c.id} value={c.id} title={c.denominacao_receita}>
                        {c.codigo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  className={cn('h-9', valorZero && 'border-destructive')}
                  type="text"
                  inputMode="numeric"
                  value={formatCurrencyDisplay(linha.valor_tributo || 0)}
                  onChange={(e) => onUpdateLinhaValor(idx, e.target.value)}
                />
                <Input
                  className="h-9 bg-muted/40"
                  readOnly
                  tabIndex={-1}
                  value={exibirValorOriginal ? '—' : formatCurrencyDisplay(valorOriginalLinha)}
                />

                <Input
                  className={cn('h-9', competenciaInvalida && 'border-destructive')}
                  type="text"
                  inputMode="numeric"
                  placeholder="MM/AAAA"
                  maxLength={7}
                  value={formatCompetenciaDisplay(linha.competencia || '')}
                  onChange={(e) => onUpdateLinhaCompetencia(idx, e.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-destructive"
                  onClick={() => onRemoverLinha(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                {valorZero && (
                  <p className="col-span-6 -mt-1 text-xs text-destructive">
                    O valor do tributo não pode ser zero
                  </p>
                )}
                {codigoSelecionado && (
                  <p
                    className="col-span-6 -mt-1 text-xs text-muted-foreground truncate"
                    title={codigoSelecionado.denominacao_receita}
                  >
                    {codigoSelecionado.denominacao_receita}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <span className="text-muted-foreground">
            Soma Valor Utilizado:{' '}
            <strong className={cn(somaIgual ? 'text-emerald-600' : 'text-destructive')}>
              {formatCurrencyDisplay(totalRateado)}
            </strong>
            {' / '}Valor Compensado: <strong>{formatCurrencyDisplay(vlrCompensado)}</strong>
          </span>
          {!emCarenciaNaDtEnvio && fatorSelic > 0 && (
            <span className="text-muted-foreground">
              Soma Valor Original:{' '}
              <strong>{formatCurrencyDisplay(round2(totalRateado * proporcaoOriginal))}</strong>
            </span>
          )}
        </div>
      </div>

      {!distribuicoesValidas && (
        <p className="text-sm text-destructive">
          {!temDistribuicao
            ? 'Adicione ao menos um tributo rateado.'
            : temGrupoNaoSelecionado
              ? 'Há linhas sem Grupo de Tributo selecionado'
              : temValorZero
                ? 'Há tributos com valor zero'
                : temCompetenciaInvalida
                  ? 'Há tributos com competência inválida (use MM/AAAA).'
                  : `A soma do Valor Utilizado das linhas (${formatCurrencyDisplay(totalRateado)}) deve ser igual ao Valor Compensado total (${formatCurrencyDisplay(vlrCompensado)}).`}
        </p>
      )}
    </>
  );
}
