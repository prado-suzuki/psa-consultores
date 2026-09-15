import { useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FloatingScrollbar } from '@/components/ui/floating-scrollbar';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrencyDisplay } from '@/components/equipe/client-form/constants';
import { dataHoraCurta } from '@/lib/dateUtils';
import { filtrarLinhas, totaisFaturamento, type LinhaFaturamentoOs } from '@/lib/admFinFaturamentoOs';
import { cn } from '@/lib/utils';

/**
 * As OS do grupo, uma por linha, com os dados de faturamento.
 *
 * VINTE COLUNAS, e a decisão é da Patricia (15/09/2026): a alternativa oferecida
 * era linha enxuta com os quatro blocos abrindo embaixo, e ela escolheu ver tudo
 * na linha. Quem fatura confere OS contra planilha, e conferir com um clique por
 * linha é o que a aba de Faturamento do cadastro já obriga a fazer — esta tela
 * existe justamente para não obrigar.
 *
 * Os quatro grupos do cabeçalho são os quatro blocos daquela aba, na mesma ordem
 * e com os mesmos rótulos. A faixa de grupo existe porque vinte colunas soltas
 * não dizem que "Número" é do endereço e não da OS.
 *
 * A SITUAÇÃO VAI DENTRO DA CÉLULA DA OS, e não em coluna própria: é como a barra
 * de OS da aba já a mostra ("OS 092/2026 · em_andamento"), e uma coluna a mais no
 * bloco grudado custaria 7rem de tela em todas as linhas para dizer uma palavra.
 */

/** Célula vazia: travessão, como a leitura da OS. */
const ou = (valor: string | null | undefined) => valor?.trim() || '—';

/**
 * As três colunas grudadas na borda esquerda, com largura TRAVADA.
 *
 * Travada porque o `left` de cada uma é escrito à mão: se a largura real de
 * "Entrou em" não for exatamente 8.5rem, a coluna seguinte gruda no lugar errado
 * e sobra (ou falta) uma tira quando se rola para o lado. Largura fixa nas três
 * células — cabeçalho, corpo e faixa de grupo — é o que garante que os três
 * números aqui embaixo sejam a verdade.
 *
 * `bg-card` e NÃO a superfície do cartão: `bg-superficie-cartao` é `--muted` a
 * 35%, translúcido de propósito, e célula translúcida deixa o resto da tabela
 * passar POR BAIXO dela na rolagem horizontal. O contêiner recebe o mesmo
 * `bg-card`, então o bloco grudado e o resto ficam do mesmo tom; o que marca a
 * dobra é a borda direita.
 */
const COL_ENTROU = 'w-[8.5rem] min-w-[8.5rem] max-w-[8.5rem]';
const COL_OS = 'w-[7rem] min-w-[7rem] max-w-[7rem]';
const COL_CLIENTE = 'w-[12rem] min-w-[12rem] max-w-[12rem]';
/** Soma das três acima. A faixa de grupo grudada tem de ter exatamente isto. */
const COL_GRUDADAS = 'w-[27.5rem] min-w-[27.5rem] max-w-[27.5rem]';
const GRUDADA = 'sticky bg-card';

/** Coluna de dinheiro: à direita, com dígito de largura fixa. */
const NUMERICA = 'text-right tabular-nums whitespace-nowrap';

const GrupoHead = ({
  titulo,
  colunas,
  className,
}: {
  titulo: string;
  colunas: number;
  className?: string;
}) => (
  <TableHead
    colSpan={colunas}
    className={cn(
      'h-7 border-l px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground',
      className,
    )}
  >
    {titulo}
  </TableHead>
);

const Th = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <TableHead className={cn('h-8 whitespace-nowrap text-[11px]', className)}>{children}</TableHead>
);

export interface TabelaFaturamentoOsProps {
  linhas: LinhaFaturamentoOs[];
  isLoading: boolean;
  error: Error | null;
}

export function TabelaFaturamentoOs({ linhas, isLoading, error }: TabelaFaturamentoOsProps) {
  const [busca, setBusca] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const visiveis = useMemo(() => filtrarLinhas(linhas, busca), [linhas, busca]);
  const totais = useMemo(() => totaisFaturamento(visiveis), [visiveis]);

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Ordens de serviço</CardTitle>
          <CardDescription>
            {isLoading
              ? 'Carregando…'
              : busca.trim()
                ? `${visiveis.length} de ${linhas.length} OS`
                : `${linhas.length} OS, da mais recente para a mais antiga`}
          </CardDescription>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por OS, cliente, contribuinte ou CNPJ"
            className="pl-9"
          />
        </div>
      </CardHeader>

      <CardContent>
        {error ? (
          <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            Não foi possível carregar as OS: {error.message}
          </p>
        ) : isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : linhas.length === 0 ? (
          <p className="rounded-md border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
            Nenhuma OS cadastrada neste ambiente.
          </p>
        ) : (
          <>
            <Table
              containerRef={scrollRef}
              containerClassName="max-h-[70vh] rounded-md border bg-card"
              className="text-xs"
            >
              {/* Cabeçalho grudado no topo: com 155 OS a rolagem vertical some
                  com os rótulos e a tabela vira parede de número. */}
              <TableHeader className="sticky top-0 z-20 bg-card">
                <TableRow className="hover:bg-transparent">
                  {/* A faixa de grupo do bloco grudado também gruda, e tem a
                      largura exata das três colunas: sem isso, ao rolar para o
                      lado o rótulo de OUTRO grupo pararia em cima delas. */}
                  <GrupoHead
                    titulo="Identificação"
                    colunas={3}
                    className={cn(GRUDADA, COL_GRUDADAS, 'left-0 z-30 border-l-0 border-r')}
                  />
                  <GrupoHead titulo="01 · Contribuinte de faturamento da OS" colunas={4} />
                  <GrupoHead titulo="02 · Endereço de cobrança" colunas={5} />
                  <GrupoHead titulo="03 · Valores do contrato" colunas={6} />
                  <GrupoHead titulo="04 · Empresa / Faturamento e Distribuição de Receita" colunas={2} />
                </TableRow>
                <TableRow className="hover:bg-transparent">
                  <Th className={cn(GRUDADA, COL_ENTROU, 'left-0 z-30')}>Entrou em</Th>
                  <Th className={cn(GRUDADA, COL_OS, 'left-[8.5rem] z-30')}>OS</Th>
                  <Th className={cn(GRUDADA, COL_CLIENTE, 'left-[15.5rem] z-30 border-r')}>Cliente</Th>

                  <Th className="border-l">Razão Social / Nome Completo</Th>
                  <Th>CPF/CNPJ</Th>
                  <Th>Inscrição Estadual</Th>
                  <Th>Telefone</Th>

                  <Th className="border-l">CEP</Th>
                  <Th>Endereço</Th>
                  <Th>Número</Th>
                  <Th>Bairro</Th>
                  <Th>Cidade / UF</Th>

                  <Th className={cn('border-l', NUMERICA)}>Valor do Projeto</Th>
                  <Th className={NUMERICA}>Nº de Parcelas</Th>
                  <Th className={NUMERICA}>Entrada</Th>
                  <Th className={NUMERICA}>Valor da Parcela</Th>
                  <Th className={NUMERICA}>Reembolso por KM</Th>
                  <Th className={NUMERICA}>Reembolso Refeição</Th>

                  <Th className="border-l">Empresa / Faturamento</Th>
                  <Th>Distribuição de Receita</Th>
                </TableRow>
              </TableHeader>

              <TableBody>
                {visiveis.map((l) => (
                  // Sem realce no hover: as colunas grudadas precisam de fundo
                  // opaco para tapar o que passa por baixo, e o realce do
                  // componente é translúcido — pintaria só as outras dezessete.
                  <TableRow key={l.os_id} className="hover:bg-transparent">
                    <TableCell
                      className={cn(GRUDADA, COL_ENTROU, 'left-0 z-10 whitespace-nowrap text-muted-foreground')}
                    >
                      {l.entrou_em ? dataHoraCurta(l.entrou_em) : '—'}
                    </TableCell>
                    <TableCell className={cn(GRUDADA, COL_OS, 'left-[8.5rem] z-10')}>
                      <span className="block truncate font-semibold">{ou(l.numero_os)}</span>
                      <span className="block truncate text-[10px] text-muted-foreground">
                        {l.situacao_label}
                      </span>
                    </TableCell>
                    <TableCell
                      className={cn(GRUDADA, COL_CLIENTE, 'left-[15.5rem] z-10 border-r font-medium')}
                      title={l.cliente_nome}
                    >
                      <span className="block truncate">{l.cliente_nome}</span>
                    </TableCell>

                    <TableCell className="max-w-[18rem] border-l" title={l.contribuinte_nome ?? undefined}>
                      <span className="block truncate">{ou(l.contribuinte_nome)}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">{ou(l.cpf_cnpj)}</TableCell>
                    <TableCell className="whitespace-nowrap">{ou(l.inscricao_estadual)}</TableCell>
                    <TableCell className="whitespace-nowrap">{ou(l.telefone)}</TableCell>

                    <TableCell className="whitespace-nowrap border-l tabular-nums">{ou(l.cep)}</TableCell>
                    <TableCell className="max-w-[16rem]" title={l.endereco ?? undefined}>
                      <span className="block truncate">{ou(l.endereco)}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{ou(l.numero)}</TableCell>
                    <TableCell className="max-w-[12rem]">
                      <span className="block truncate">{ou(l.bairro)}</span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{ou(l.cidade_uf)}</TableCell>

                    <TableCell className={cn('border-l', NUMERICA)}>
                      {formatCurrencyDisplay(l.valor_projeto)}
                    </TableCell>
                    <TableCell className={NUMERICA}>
                      {l.numero_parcelas != null ? l.numero_parcelas : '—'}
                    </TableCell>
                    <TableCell className={NUMERICA}>{formatCurrencyDisplay(l.valor_entrada)}</TableCell>
                    <TableCell className={NUMERICA}>
                      {l.valor_parcela != null ? formatCurrencyDisplay(l.valor_parcela) : '—'}
                    </TableCell>
                    <TableCell className={NUMERICA}>{formatCurrencyDisplay(l.valor_reembolso_km)}</TableCell>
                    <TableCell className={NUMERICA}>
                      {formatCurrencyDisplay(l.valor_reembolso_refeicao)}
                    </TableCell>

                    <TableCell className="max-w-[16rem] border-l" title={l.empresa_faturamento ?? undefined}>
                      <span className="block truncate">{ou(l.empresa_faturamento)}</span>
                    </TableCell>
                    <TableCell className="min-w-[17rem]">
                      {l.rateio.length === 0 ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        // Percentual ANTES do nome, como na aba: colados, os dois
                        // se leem como par, e os números ficam alinhados para
                        // somar de relance.
                        <ul className="space-y-0.5">
                          {l.rateio.map((fatia, i) => (
                            <li key={`${fatia.label}-${i}`} className="flex gap-2">
                              <span className="w-11 shrink-0 text-right font-medium tabular-nums">
                                {fatia.percentual}%
                              </span>
                              <span className="min-w-0 truncate text-muted-foreground">{fatia.label}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>

              {/* Os totais são da VISÃO, não da base: com busca ativa somam o que
                  está na tela, senão a última linha contradiria as de cima. O
                  rótulo diz qual das duas coisas está somando.

                  `bg-card` vence o `bg-superficie-realce` do componente (o `cn`
                  deixa a última classe ganhar): grudada embaixo, a faixa precisa
                  ser opaca, senão as linhas passam por baixo dela. */}
              <TableFooter className="sticky bottom-0 z-20 bg-card">
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={12} className="text-xs text-muted-foreground">
                    {busca.trim()
                      ? `Total das ${visiveis.length} OS filtradas`
                      : `Total das ${visiveis.length} OS`}
                  </TableCell>
                  <TableCell className={cn('border-l', NUMERICA)}>
                    {formatCurrencyDisplay(totais.valor_projeto)}
                  </TableCell>
                  <TableCell />
                  <TableCell className={NUMERICA}>{formatCurrencyDisplay(totais.valor_entrada)}</TableCell>
                  <TableCell />
                  <TableCell className={NUMERICA}>{formatCurrencyDisplay(totais.valor_reembolso_km)}</TableCell>
                  <TableCell className={NUMERICA}>
                    {formatCurrencyDisplay(totais.valor_reembolso_refeicao)}
                  </TableCell>
                  <TableCell colSpan={2} className="border-l" />
                </TableRow>
              </TableFooter>
            </Table>

            {visiveis.length === 0 && (
              <p className="mt-3 text-center text-sm text-muted-foreground">
                Nenhuma OS encontrada para “{busca.trim()}”.
              </p>
            )}

            {/* A tabela é mais larga que a tela, e a barra nativa só aparece no
                fim da rolagem vertical. Esta acompanha a viewport. */}
            <FloatingScrollbar targetRef={scrollRef} />
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TabelaFaturamentoOs;
