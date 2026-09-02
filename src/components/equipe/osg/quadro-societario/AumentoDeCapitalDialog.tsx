import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RequiredMark } from '@/components/ui/required-mark';
import { AlertTriangle, Coins, Info, Landmark, Loader2, TrendingUp } from 'lucide-react';
import { CurrencyInput } from '@/components/equipe/osg/CurrencyInput';
import { fieldCls, labelCls } from '@/components/equipe/osg/formKit';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { useGravarAumentoDeCapital, type SocioDoQuadro } from '@/hooks/useMovimentacaoQuotas';
import { contarImoveis, matriculasForaDoLivro, proporAumentoDeCapital } from '@/lib/osg/aporteInicial';
import { capitalDeQuotas } from '@/lib/templates/capital';
import type { MatriculaIntegralizacao } from '@/lib/templates/mapeadores';
import { fmtBRL, fmtInt } from './quadroFmt';

// O gesto que faltava: gravar o aumento de capital produzido pelos imóveis
// aprovados DEPOIS que o contrato social foi registrado na junta.
//
// Os imóveis entram calculados e em LEITURA, porque o valor deles é do
// Diagnóstico Patrimonial e o rateio é o mesmo da constituição; o que se digita
// aqui é só a parcela em moeda corrente por sócio, que é a outra metade da
// subscrição real ("através dos bens imóveis e valor em moeda corrente nacional
// abaixo descritos"). Cada coisa aportada vira um lançamento próprio, e é isso
// que faz as alíneas do instrumento enumerarem em vez de somarem.
//
// O modal NÃO cria documento: ele grava o ato no livro, e a peça nasce depois
// pela tela Gerar, onde o assistente acende sozinho porque o aporte pendente
// passou a existir.

interface AumentoDeCapitalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** A Proprietária que recebe o aumento. */
  empresa: PessoaRow;
  /** Todos os bens elegíveis com destino a esta empresa (o filtro mora na lib). */
  matriculas: MatriculaIntegralizacao[];
  /** `bem_id` que já têm movimento no livro: os que já estão no capital. */
  bensNoLivro: ReadonlySet<string>;
  /** Quadro atual: quem já é sócio e o capital a que o delta soma. */
  quadro: SocioDoQuadro[];
}

const DESCRICAO_PADRAO = 'Aumento de capital por integralização de imóveis';

export const AumentoDeCapitalDialog = ({
  open,
  onOpenChange,
  empresa,
  matriculas,
  bensNoLivro,
  quadro,
}: AumentoDeCapitalDialogProps) => {
  const [descricao, setDescricao] = useState(DESCRICAO_PADRAO);
  const [data, setData] = useState('');
  /** Reais por sócio, na string crua do CurrencyInput ("95209.23" ou ""). */
  const [moeda, setMoeda] = useState<Record<string, string>>({});
  const gravar = useGravarAumentoDeCapital();

  // Reabrir depois de gravar não pode herdar a digitação do ato anterior.
  useEffect(() => {
    if (!open) return;
    setDescricao(DESCRICAO_PADRAO);
    setData('');
    setMoeda({});
  }, [open]);

  const novas = useMemo(
    () => matriculasForaDoLivro(matriculas, bensNoLivro),
    [matriculas, bensNoLivro],
  );

  // Quem pode receber parcela em moeda: o quadro atual mais os titulares dos
  // imóveis novos. É o conjunto que ESTE aumento envolve — cobre o sócio que
  // reforça em dinheiro e o entrante que integraliza imóvel e complementa em
  // dinheiro, sem abrir a porta para lançar aporte de quem não tem nada com o ato.
  const sociosDaMoeda = useMemo(() => {
    const porId = new Map<string, string>();
    for (const s of quadro) porId.set(s.pessoaId, s.denominacao);
    for (const m of novas) {
      for (const t of m.titulares) {
        if (t.pessoaId && !porId.has(t.pessoaId)) porId.set(t.pessoaId, t.denominacao ?? '—');
      }
    }
    return [...porId].map(([pessoaId, denominacao]) => ({ pessoaId, denominacao }));
  }, [quadro, novas]);

  const proposta = useMemo(() => {
    const moedaPorPessoaId: Record<string, number> = {};
    for (const { pessoaId } of sociosDaMoeda) {
      const valor = Number(moeda[pessoaId] ?? '');
      if (Number.isFinite(valor) && valor > 0) moedaPorPessoaId[pessoaId] = valor;
    }
    return proporAumentoDeCapital({
      matriculas,
      bensNoLivro,
      moedaPorPessoaId,
      denominacaoPorPessoaId: Object.fromEntries(
        sociosDaMoeda.map((s) => [s.pessoaId, s.denominacao]),
      ),
    });
  }, [matriculas, bensNoLivro, moeda, sociosDaMoeda]);

  const capitalAtual = quadro.reduce((s, l) => s + l.vlrTotal, 0);
  const delta = capitalDeQuotas(proposta.totalQuotas);
  const travadoPorLegado = proposta.titularesLegados.length > 0;
  const semNome = !descricao.trim();

  const submeter = async () => {
    if (!empresa.cliente_id || proposta.lancamentos.length === 0) return;
    await gravar.mutateAsync({
      clienteId: empresa.cliente_id,
      empresaPessoaId: empresa.id,
      lancamentos: proposta.lancamentos,
      descricao: descricao.trim(),
      dataDoAto: data || null,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-osg-moss" />
            Aumento de capital por integralização
          </DialogTitle>
          <DialogDescription>
            Os imóveis aprovados que ainda não entraram no capital de{' '}
            <span className="font-medium text-slate-700">{empresa.denominacao}</span> são
            subscritos pelos titulares deles, e cada sócio pode complementar em moeda corrente.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <Label className={labelCls}>
                Nome do ato <RequiredMark />
              </Label>
              <Input
                className={fieldCls}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder={DESCRICAO_PADRAO}
              />
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

          {travadoPorLegado && (
            <div className="rounded-md border border-amber-300/70 bg-amber-50/60 p-3">
              <div className="flex items-start gap-2 text-xs text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  O aumento não pode ser gravado enquanto houver titular sem pessoa cadastrada: o
                  sócio precisa existir no cadastro para receber as quotas. Cadastre e vincule{' '}
                  {proposta.titularesLegados.length === 1 ? 'o titular' : 'os titulares'} abaixo na
                  titularidade da matrícula, no Diagnóstico Patrimonial.
                </span>
              </div>
              <ul className="mt-2 space-y-1">
                {proposta.titularesLegados.map((nome) => (
                  <li key={nome} className="text-xs font-medium text-amber-900">
                    {nome}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <section className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Landmark className="h-3.5 w-3.5" />
              Imóveis que entram ({contarImoveis(novas)})
            </p>
            <div className="space-y-1.5">
              {novas.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-md border border-osg-200/80 bg-card px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm text-slate-800">
                      {m.bem?.denominacao ?? `Matrícula ${m.numero ?? 's/ nº'}`}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      Matrícula {m.numero ?? 's/ nº'}
                      {m.municipio_imovel ? ` · ${m.municipio_imovel}` : ''}
                      {m.uf_imovel ? `/${m.uf_imovel}` : ''}
                      {' · '}
                      {m.titulares.map((t) => t.denominacao ?? '—').join(', ') || 'sem titular'}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm tabular-nums text-slate-700">
                    {m.vlr_contabil != null ? fmtBRL.format(m.vlr_contabil) : 'sem valor'}
                  </span>
                </div>
              ))}
              {novas.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Nenhum imóvel elegível fora do capital.
                </p>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Coins className="h-3.5 w-3.5" />
              Parcela em moeda corrente, por sócio
            </p>
            <p className="text-xs text-muted-foreground">
              Opcional. O que for digitado aqui vira uma alínea própria na cláusula, ao lado dos
              imóveis do mesmo sócio.
            </p>
            <div className="space-y-1.5">
              {sociosDaMoeda.map((s) => (
                <div key={s.pessoaId} className="flex items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                    {s.denominacao}
                  </span>
                  <CurrencyInput
                    className={`${fieldCls} w-40 font-mono`}
                    value={moeda[s.pessoaId] ?? ''}
                    onChange={(raw) => setMoeda((atual) => ({ ...atual, [s.pessoaId]: raw }))}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* A única conferência possível no momento da digitação: a parcela em
              moeda não tem cadastro atrás dela, então o consultor confere pelo
              delta e pelo capital resultante antes de gravar. */}
          <div className="rounded-md border border-osg-300/60 bg-osg-50/50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-osg-700">
              O que será gravado
            </p>
            <ul className="mt-2 space-y-1 text-sm text-slate-700">
              <li className="flex justify-between gap-3">
                <span>{proposta.lancamentos.length} lançamento(s) de aporte, em um ato</span>
                <span className="tabular-nums">{fmtInt.format(proposta.totalQuotas)} quotas</span>
              </li>
              <li className="flex justify-between gap-3">
                <span>Capital hoje</span>
                <span className="tabular-nums">{fmtBRL.format(capitalAtual)}</span>
              </li>
              <li className="flex justify-between gap-3 font-medium">
                <span>Aumento</span>
                <span className="tabular-nums">{fmtBRL.format(delta)}</span>
              </li>
              <li className="flex justify-between gap-3 border-t border-osg-200/80 pt-1 font-semibold">
                <span>Capital depois do ato</span>
                <span className="tabular-nums">{fmtBRL.format(capitalAtual + delta)}</span>
              </li>
            </ul>
          </div>

          <div className="flex items-start gap-2 rounded-md border border-osg-200/80 p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              O valor congela agora: as quotas saem do valor contábil dos imóveis neste momento,
              como na constituição. Corrigir o valor depois não mexe no capital, e quem avisa da
              divergência é a notificação de variável alterada, na tela Gerar. Enquanto nenhuma
              peça formalizar o ato, ele pode ser desfeito inteiro pelo card de Atos societários.
            </span>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={gravar.isPending}>
            Cancelar
          </Button>
          <Button
            onClick={submeter}
            disabled={
              travadoPorLegado || semNome || proposta.lancamentos.length === 0 || gravar.isPending
            }
          >
            {gravar.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Gravar aumento de capital
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
