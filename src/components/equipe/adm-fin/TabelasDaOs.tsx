import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrencyDisplay } from '@/components/equipe/client-form/constants';
import { formatarPercentual } from '@/lib/rateioReceita';
import type { LinhaFaturamentoOs } from '@/lib/admFinFaturamentoOs';
import { cn } from '@/lib/utils';

/**
 * Os dados de faturamento da OS aberta, EM TABELA.
 *
 * Terceira forma desta tela, e as duas anteriores ensinaram o recorte. A tabela
 * larga com as 155 OS em linha foi recusada — "não ajuda eu ver os dados de uma
 * OS por linha". O painel que veio depois repetia o relatório de Faturamento do
 * cadastro campo a campo, e também: "essas informações no formato do relatório
 * de faturamento inteiro". A decisão dela (15/09/2026) junta as duas: a OS se
 * escolhe na lista à esquerda, e os dados dela aparecem em tabela.
 *
 * QUATRO TABELAS CURTAS, e não uma de vinte colunas: cada assunto vira um quadro
 * com quatro a seis colunas, que é o que cabe na largura do painel sem barra de
 * rolagem lateral. Uma tabela só devolveria a rolagem que a primeira versão
 * tinha, com a diferença de mostrar uma linha em vez de 155.
 *
 * Só leitura: contribuinte, valores e rateio se trocam na aba de OS do cadastro
 * do cliente; o cadastro do contribuinte, em Contribuintes.
 */
export interface TabelasDaOsProps {
  linha: LinhaFaturamentoOs;
}

/** Célula vazia: travessão, como a leitura da OS. */
const ou = (valor: string | null | undefined) => valor?.trim() || '—';

const Quadro = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="min-w-0">
    <h4 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
      {titulo}
    </h4>
    {/*
      `bg-card` e não a superfície do cartão: este painel já está DENTRO da casca
      `ListaMestreDetalhe`, que é `bg-superficie-cartao` (35% de `--muted`, e o
      `--muted` desta casa puxa para o verde). Tabela sem fundo próprio herda esse
      tingido e a tela inteira lê verde — "tá tudo verde, o padrão não é sem
      fundo" (Patricia, 15/09/2026). Branco do cartão embaixo, faixa de cabeçalho
      em `bg-muted` em cima: é o degrau que as outras tabelas do produto usam.
    */}
    <div className="overflow-hidden rounded-md border bg-card">{children}</div>
  </section>
);

/** Cabeçalho de coluna: compacto, porque são quatro tabelas na mesma tela. */
const Th = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <TableHead className={cn('h-8 whitespace-nowrap text-[11px]', className)}>{children}</TableHead>
);

const NUMERICA = 'text-right tabular-nums whitespace-nowrap';

export function TabelasDaOs({ linha }: TabelasDaOsProps) {
  const temContribuinte = linha.contribuinte_nome != null;

  return (
    <div className="space-y-4">
      <Quadro titulo="Contribuinte de faturamento da OS">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <Th>Razão Social / Nome Completo</Th>
              <Th>CPF/CNPJ</Th>
              <Th>Inscrição Estadual</Th>
              <Th>Telefone</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-transparent">
              {temContribuinte ? (
                <>
                  <TableCell className="font-medium">{ou(linha.contribuinte_nome)}</TableCell>
                  <TableCell className="tabular-nums">{ou(linha.cpf_cnpj)}</TableCell>
                  <TableCell>{ou(linha.inscricao_estadual)}</TableCell>
                  <TableCell>{ou(linha.telefone)}</TableCell>
                </>
              ) : (
                /* OS sem contribuinte escolhido existe de verdade e não é erro de
                   tela — em produção são 21 das 155 (15/09/2026). A frase diz
                   onde se resolve, no lugar de quatro travessões mudos. */
                <TableCell colSpan={4} className="text-muted-foreground">
                  Esta OS ainda não tem contribuinte. A escolha é feita na aba de OS do cadastro do
                  cliente, entre os contribuintes já salvos.
                </TableCell>
              )}
            </TableRow>
          </TableBody>
        </Table>
      </Quadro>

      <Quadro titulo="Endereço de cobrança">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <Th>CEP</Th>
              <Th>Endereço</Th>
              <Th>Número</Th>
              <Th>Bairro</Th>
              <Th>Cidade / UF</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-transparent">
              {temContribuinte ? (
                <>
                  <TableCell className="tabular-nums">{ou(linha.cep)}</TableCell>
                  <TableCell>{ou(linha.endereco)}</TableCell>
                  <TableCell>{ou(linha.numero)}</TableCell>
                  <TableCell>{ou(linha.bairro)}</TableCell>
                  <TableCell>{ou(linha.cidade_uf)}</TableCell>
                </>
              ) : (
                <TableCell colSpan={5} className="text-muted-foreground">
                  Sem contribuinte nesta OS, não há endereço de cobrança.
                </TableCell>
              )}
            </TableRow>
          </TableBody>
        </Table>
      </Quadro>

      <Quadro titulo="Valores do contrato">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <Th className={NUMERICA}>Valor do Projeto</Th>
              <Th className={NUMERICA}>Nº de Parcelas</Th>
              <Th className={NUMERICA}>Entrada</Th>
              <Th className={NUMERICA}>Valor da Parcela</Th>
              <Th className={NUMERICA}>Reembolso por KM</Th>
              <Th className={NUMERICA}>Reembolso Refeição</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-transparent">
              <TableCell className={cn(NUMERICA, 'font-medium')}>
                {formatCurrencyDisplay(linha.valor_projeto)}
              </TableCell>
              {/* OS anterior aos campos de parcelamento fica em "—": é dado que
                  ninguém informou, e exibir "1" ali inventaria um pagamento
                  único que não foi combinado. */}
              <TableCell className={NUMERICA}>
                {linha.numero_parcelas != null ? linha.numero_parcelas : '—'}
              </TableCell>
              <TableCell className={NUMERICA}>{formatCurrencyDisplay(linha.valor_entrada)}</TableCell>
              <TableCell className={NUMERICA}>
                {linha.valor_parcela != null ? formatCurrencyDisplay(linha.valor_parcela) : '—'}
              </TableCell>
              <TableCell className={NUMERICA}>
                {formatCurrencyDisplay(linha.valor_reembolso_km)}
              </TableCell>
              <TableCell className={NUMERICA}>
                {formatCurrencyDisplay(linha.valor_reembolso_refeicao)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Quadro>

      {/* A empresa que EMITE a nota e as fatias em que a receita dela se divide
          moram no mesmo quadro porque são a mesma pergunta em duas alturas: de
          quem é a receita, e como ela se reparte. A empresa ocupa uma célula só,
          esticada pelas linhas do rateio (`rowSpan`), para não se repetir a cada
          fatia como se mudasse. */}
      <Quadro titulo="Empresa / Faturamento e Distribuição de Receita">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <Th className="w-[40%]">Empresa / Faturamento</Th>
              <Th>Centro de Custo</Th>
              <Th className={cn(NUMERICA, 'w-[6rem]')}>% do Rateio</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linha.rateio.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell className="font-medium">{ou(linha.empresa_faturamento)}</TableCell>
                <TableCell colSpan={2} className="text-muted-foreground">
                  Sem centro de custo definido para esta OS.
                </TableCell>
              </TableRow>
            ) : (
              linha.rateio.map((fatia, i) => (
                <TableRow key={`${fatia.label}-${i}`} className="hover:bg-transparent">
                  {i === 0 && (
                    <TableCell rowSpan={linha.rateio.length} className="align-top font-medium">
                      {ou(linha.empresa_faturamento)}
                    </TableCell>
                  )}
                  <TableCell className="text-muted-foreground">{fatia.label}</TableCell>
                  <TableCell className={NUMERICA}>
                    {formatarPercentual(fatia.percentual)}%
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Quadro>
    </div>
  );
}

export default TabelasDaOs;
