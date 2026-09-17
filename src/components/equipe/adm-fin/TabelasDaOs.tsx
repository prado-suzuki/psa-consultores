import { SectionHeading } from '@/components/ui/section-heading';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatCurrencyDisplay, isoToMasked } from '@/components/equipe/client-form/constants';
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

/** Data em dd/mm/aaaa, pelo mesmo formatador da leitura da OS. */
const data = (iso: string | null) => (iso ? isoToMasked(iso) || '—' : '—');

const Quadro = ({ titulo, children }: { titulo: string; children: React.ReactNode }) => (
  <section className="min-w-0 space-y-1.5">
    {/* O título é o `SectionHeading` da casa, o mesmo dos modais de tarefa e de
        projeto. Era um `h4` escrito aqui, com peso e caixa quase iguais — quase
        é justamente o problema: dois títulos de seção que se parecem envelhecem
        separado. */}
    <SectionHeading>{titulo}</SectionHeading>
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
      {/*
        O QUE FOI VENDIDO, E QUANDO. Entrou em 15/09/2026, depois da validação do
        financeiro: a Letícia pediu "a observação do serviço que precisa constar
        na NF", e o que existe hoje é o serviço contratado, os produtos e o campo
        `observacoes` da OS. Não é o campo próprio da nota, que ainda é decisão em
        aberto (ver `docs/planos/faturamento-pedido-do-financeiro.md`); é o que o
        sistema tem, e mostrá-lo já responde metade da pergunta dela.
      */}
      <Quadro titulo="Serviço e prazos">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <Th>Serviço</Th>
              <Th>Emissão</Th>
              <Th>Início</Th>
              <Th>Fim</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-transparent">
              <TableCell className="font-medium">{ou(linha.servico_nome)}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{data(linha.data_emissao)}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{data(linha.data_inicio)}</TableCell>
              <TableCell className="whitespace-nowrap tabular-nums">{data(linha.data_fim)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Quadro>

      {linha.observacoes && (
        <Quadro titulo="Observação da OS">
          <Table className="text-xs">
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell className="whitespace-pre-line">{linha.observacoes}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Quadro>
      )}

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

      {/*
        O CONTATO É DO REPRESENTANTE, e não do contribuinte, porque o contribuinte
        não tem e-mail no cadastro: a coluna não existe. Em produção são 73
        representantes com e-mail. Pedido da Letícia ("um campo com os dados de
        contato: e-mail, telefone"), respondido com o que há; de quem deve ser o
        e-mail da nota é a pergunta F do documento.
      */}
      <Quadro titulo="Contato do cliente">
        <Table className="text-xs">
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              <Th>Nome</Th>
              <Th>Cargo</Th>
              <Th>E-mail</Th>
              <Th>Telefone</Th>
            </TableRow>
          </TableHeader>
          <TableBody>
            {linha.contatos.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="text-muted-foreground">
                  Nenhum representante com e-mail ou telefone neste cliente. O cadastro é feito na
                  aba Representantes.
                </TableCell>
              </TableRow>
            ) : (
              linha.contatos.map((contato, i) => (
                <TableRow key={`${contato.nome}-${i}`} className="hover:bg-transparent">
                  <TableCell className="font-medium">{contato.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{ou(contato.cargo)}</TableCell>
                  <TableCell>{ou(contato.email)}</TableCell>
                  <TableCell className="whitespace-nowrap">{ou(contato.telefone)}</TableCell>
                </TableRow>
              ))
            )}
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

      {/* PRODUTOS CONTRATADOS POR ÚLTIMO, pedido dela em 17/09/2026: o quadro
          estava logo abaixo de "Serviço e prazos" e partia a leitura ao meio —
          quem fatura desce do serviço para o contribuinte, o endereço, os
          valores e o rateio, e a lista de produtos não entra em nenhum desses
          passos. No fim ela vira anexo, que é o papel que tem.

          Só aparece quando existe: OS sem produto contratado é comum, e um
          quadro com uma linha de travessão não informa nada. */}
      {linha.produtos.length > 0 && (
        <Quadro titulo="Produtos contratados">
          <Table className="text-xs">
            <TableHeader>
              <TableRow className="bg-muted hover:bg-muted">
                <Th>Produto</Th>
                <Th className={cn(NUMERICA, 'w-[8rem]')}>Horas contratadas</Th>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linha.produtos.map((produto, i) => (
                <TableRow key={`${produto.label}-${i}`} className="hover:bg-transparent">
                  <TableCell>{produto.label}</TableCell>
                  <TableCell className={NUMERICA}>
                    {produto.horas != null ? produto.horas : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Quadro>
      )}
    </div>
  );
}

export default TabelasDaOs;
