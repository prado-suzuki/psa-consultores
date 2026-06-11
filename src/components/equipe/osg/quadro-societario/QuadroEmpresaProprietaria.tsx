import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, Calculator, ChartPie, Landmark, Search, Tag, Users } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { useIntegralizacoesAprovadas } from '@/hooks/useGeracaoDocumento';
import { useDeleteSocio, useQuadroSocietarioByEmpresa } from '@/hooks/useQuadroSocietario';
import { calcularParticipacoesPR } from '@/lib/templates/mapeadores';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import { fmtBRL, fmtInt, fmtPct, iniciais } from './quadroFmt';
import { KpiCard } from './quadroKit';

interface QuadroEmpresaProprietariaProps {
  empresa: PessoaRow;
}

/**
 * Visão DERIVADA do quadro societário da empresa Proprietária (PR): a
 * participação de cada sócio é calculada dos bens aprovados para integralização
 * com destino a esta empresa (mesma fonte do gerador de documentos), rateada
 * pela fração de titularidade das matrículas — sem CRUD: nada é gravado em
 * quadro_societario. Para alterar a participação, o caminho é o Diagnóstico
 * Patrimonial (aprovar/reprovar bens, frações de titularidade).
 */
export const QuadroEmpresaProprietaria = ({ empresa }: QuadroEmpresaProprietariaProps) => {
  const navigate = useNavigate();
  const [busca, setBusca] = useState('');

  const { data: matriculas = [], isLoading } = useIntegralizacoesAprovadas(empresa.id);
  // Linhas legadas digitadas à mão: ignoradas no cálculo, mas avisadas abaixo
  // (com desvinculação manual) para o cadastro não ficar com lixo silencioso.
  const { data: legados = [] } = useQuadroSocietarioByEmpresa(empresa.id);
  const deleteSocio = useDeleteSocio();

  const participacoes = useMemo(() => calcularParticipacoesPR(matriculas), [matriculas]);
  const capital = participacoes.reduce((acc, p) => acc + p.valor, 0);
  const totalQuotas = participacoes.reduce((acc, p) => acc + p.quotas, 0);

  // Count-up dos KPIs: conta de 0 ao valor na montagem (e a troca de empresa
  // remonta o componente via key, reiniciando a contagem).
  const capitalAnimado = useCountUp(capital);
  const quotasAnimadas = useCountUp(totalQuotas);

  const participacoesFiltradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return participacoes;
    return participacoes.filter(
      (p) =>
        p.denominacao.toLowerCase().includes(q) ||
        (p.cpfCnpj ?? '').toLowerCase().includes(q),
    );
  }, [participacoes, busca]);

  const buscaAtiva = busca.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard
          destaque
          icone={<Landmark className="h-4 w-4" />}
          titulo="Capital Social Total"
          valor={fmtBRL.format(capitalAnimado)}
        />
        <KpiCard
          delay={60}
          icone={<ChartPie className="h-4 w-4" />}
          titulo="Total de Quotas"
          valor={fmtInt.format(Math.round(quotasAnimadas))}
        />
        {/* Quota a R$ 1,00 por definição na PR — não é capital ÷ quotas. */}
        <KpiCard
          delay={120}
          icone={<Tag className="h-4 w-4" />}
          titulo="Valor Nominal"
          valor={fmtBRL.format(1)}
        />
      </div>

      {legados.length > 0 && (
        <div
          className="rounded-lg border border-amber-300 bg-amber-50/60 p-3 animate-osg-rise motion-reduce:animate-none"
          style={{ animationDelay: '150ms' }}
        >
          <div className="flex items-start gap-2 text-xs text-amber-800">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>
              Esta empresa é Proprietária: o quadro abaixo é <strong>calculado da
              integralização</strong>. Há {legados.length} sócio(s) vinculado(s) manualmente que{' '}
              <strong>não são considerados</strong> — desvincule-os para limpar o cadastro.
            </span>
          </div>
          <ul className="mt-2 space-y-1">
            {legados.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-xs text-amber-900">
                <span className="truncate">
                  {s.socio_denominacao}
                  {s.quotas != null ? ` · ${fmtInt.format(s.quotas)} quotas` : ''}
                  {s.vlr_total != null ? ` · ${fmtBRL.format(s.vlr_total)}` : ''}
                </span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 border-amber-300 text-amber-800 hover:bg-amber-100"
                    >
                      Desvincular
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Desvincular sócio</AlertDialogTitle>
                      <AlertDialogDescription>
                        Remover "{s.socio_denominacao}" do quadro societário de{' '}
                        {empresa.denominacao}? A linha é manual e já não entra no cálculo.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={() =>
                          deleteSocio.mutate({ row: s, entityName: s.socio_denominacao })}
                      >
                        Desvincular
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Card
        className="animate-osg-rise motion-reduce:animate-none"
        style={{ animationDelay: '180ms' }}
      >
        <CardHeader className="pb-3 space-y-2">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-slate-500" />
              Lista de Sócios ({participacoes.length})
            </CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar sócio..."
                  className="h-9 pl-8 w-56"
                />
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-osg-50 px-2 py-1.5 text-[11px] font-semibold text-osg-700">
                <Calculator className="h-3.5 w-3.5" />
                Calculado da integralização aprovada (Diagnóstico Patrimonial)
              </span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Para alterar a participação, aprove/reprove bens e ajuste as frações de titularidade
            no Diagnóstico Patrimonial — esta tela não grava nada para empresas Proprietárias.
          </p>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Carregando...</p>
          ) : participacoesFiltradas.length === 0 ? (
            buscaAtiva ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Nenhum sócio encontrado.
              </p>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <p className="text-sm mb-4">
                  Nenhum bem aprovado para integralização com destino a esta empresa.
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate('/equipe/osg/work/diagnostico-patrimonial')}
                >
                  Ir para o Diagnóstico Patrimonial
                </Button>
              </div>
            )
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sócio</TableHead>
                    <TableHead className="text-right">Quotas</TableHead>
                    <TableHead className="text-right">Valor (R$)</TableHead>
                    <TableHead className="w-44">Participação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {participacoesFiltradas.map((p, i) => {
                    // Stagger limitado: depois da 15ª linha entram todas juntas.
                    const delay = Math.min(i, 15) * 30;
                    return (
                      <TableRow
                        key={p.pessoaId ?? p.denominacao}
                        className="animate-osg-rise motion-reduce:animate-none"
                        style={{ animationDelay: `${delay}ms` }}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-md bg-osg-100 flex items-center justify-center shrink-0 text-[11px] font-bold text-osg-700">
                              {iniciais(p.denominacao)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{p.denominacao}</p>
                              <p className="text-xs text-muted-foreground font-mono">
                                {p.tipoPessoa ?? '—'}{p.cpfCnpj ? ` · ${p.cpfCnpj}` : ''}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtInt.format(p.quotas)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {fmtBRL.format(p.valor)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-osg-100 overflow-hidden shrink-0">
                              <div
                                className="h-full rounded-full bg-osg-moss origin-left animate-osg-bar-grow motion-reduce:animate-none"
                                style={{
                                  width: `${Math.min(p.percentual, 100)}%`,
                                  // Barra cresce logo depois da linha assentar.
                                  animationDelay: `${delay + 120}ms`,
                                }}
                              />
                            </div>
                            <span className="rounded-md bg-osg-50 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-osg-700">
                              {fmtPct(p.percentual)}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
                {!buscaAtiva && (
                  <TableFooter>
                    <TableRow>
                      <TableCell className="font-semibold">Total</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {fmtInt.format(totalQuotas)}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">
                        {fmtBRL.format(capital)}
                      </TableCell>
                      <TableCell className="font-semibold tabular-nums">
                        {fmtPct(100)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                )}
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
