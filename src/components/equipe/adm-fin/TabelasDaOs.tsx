import { Card } from '@/components/ui/card';
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
 * ABAIXO DE `md` A TABELA DEITADA VIRA PARES EMPILHADOS. Quatro a seis colunas
 * cabem no painel de um monitor e não cabem em 340px: no celular elas ficavam
 * atrás de uma barra de rolagem lateral por quadro, e dado que exige rolar de
 * lado para aparecer é dado que ninguém lê.
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
      `<Card variant="tabela">`, que é a REGRA desde 16/09/2026 — e não mais o
      `bg-card` à mão que esta tela escrevia, nem a exceção que ele obrigava a
      inscrever no inventário da catraca.

      O caso nasceu aqui: este painel está dentro da casca `ListaMestreDetalhe`,
      que é `bg-superficie-cartao`, e tabela sem fundo próprio herdava esse
      tingido — "tá tudo verde, o padrão não é sem fundo" (Patricia, 15/09/2026).
      Ao ler que isso tinha virado exceção, ela mandou mudar o PADRÃO, e a
      comparação em `docs/geral/comparacoes-de-cor/a-caixa-da-tabela.html` mostrou
      por quê: o hover de linha tem teto sobre o cartão tingido.

      `rounded-md` e `shadow-none` ficam: são as quatro tabelas curtas de um
      painel interno, não quatro objetos soltos numa página. A superfície é que
      passou a vir do componente.
    */}
    <Card variant="tabela" className="overflow-hidden rounded-md shadow-none">{children}</Card>
  </section>
);

/** Cabeçalho de coluna: compacto, porque são quatro tabelas na mesma tela. */
const Th = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <TableHead className={cn('h-8 whitespace-nowrap text-[11px]', className)}>{children}</TableHead>
);

const NUMERICA = 'text-right tabular-nums whitespace-nowrap';

/** Um campo do registro: vira coluna no monitor e par rótulo/valor no celular. */
interface Campo {
  rotulo: string;
  valor: React.ReactNode;
  /** Alinha à direita nos dois formatos. Só para dinheiro e contagem. */
  numerica?: boolean;
  /** Classes da célula da tabela deitada, quando ela precisa de mais que o padrão. */
  celula?: string;
}

/**
 * Os campos um por linha, rótulo à esquerda e valor à direita. Só existe abaixo
 * de `md`, no lugar da tabela deitada.
 *
 * Campo sem valor fica em travessão, e não some: em "Produtos contratados" o
 * rótulo é o nome do produto e o valor são as horas, então esconder o par vazio
 * apagaria o produto da lista.
 */
const ParesEmpilhados = ({ campos, className }: { campos: Campo[]; className?: string }) => (
  <dl className={cn('divide-y', className)}>
    {campos.map((campo) => (
      <div key={campo.rotulo} className="flex items-baseline justify-between gap-3 px-3 py-2">
        {/* Nenhum dos dois lados é `shrink-0`: em "Produtos contratados" o
            rótulo é o nome do produto, e um rótulo rígido empurrava o valor
            para fora do cartão. O valor numérico não quebra, para "120 h" não
            virar duas linhas quando o rótulo ao lado for comprido. */}
        <dt className="min-w-0 break-words text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {campo.rotulo}
        </dt>
        <dd
          className={cn(
            'min-w-0 break-words text-right text-xs text-foreground',
            campo.numerica && 'whitespace-nowrap tabular-nums',
          )}
        >
          {campo.valor}
        </dd>
      </div>
    ))}
  </dl>
);

/**
 * Quadro de UM registro: a tabela de uma linha no monitor, os pares no celular.
 *
 * `aviso` troca o conteúdo inteiro pela frase que diz onde o dado se resolve —
 * é o caso da OS sem contribuinte, que existe de verdade e não é erro de tela.
 */
const QuadroDeRegistro = ({
  titulo,
  campos,
  aviso,
}: {
  titulo: string;
  campos: Campo[];
  aviso?: string;
}) => (
  <Quadro titulo={titulo}>
    {aviso ? (
      <p className="px-3 py-2.5 text-xs text-muted-foreground">{aviso}</p>
    ) : (
      <>
        <ParesEmpilhados campos={campos} className="md:hidden" />
        <Table className="text-xs" containerClassName="hidden md:block">
          <TableHeader>
            <TableRow className="bg-muted hover:bg-muted">
              {campos.map((campo) => (
                <Th key={campo.rotulo} className={cn(campo.numerica && NUMERICA)}>
                  {campo.rotulo}
                </Th>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="hover:bg-transparent">
              {campos.map((campo) => (
                <TableCell key={campo.rotulo} className={cn(campo.numerica && NUMERICA, campo.celula)}>
                  {campo.valor}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </>
    )}
  </Quadro>
);

/** Aviso do quadro no celular, onde a tabela não tem `colSpan` para carregá-lo. */
const AvisoEmpilhado = ({ children }: { children: React.ReactNode }) => (
  <p className="px-3 py-2.5 text-xs text-muted-foreground md:hidden">{children}</p>
);

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
      <QuadroDeRegistro
        titulo="Serviço e prazos"
        campos={[
          { rotulo: 'Serviço', valor: ou(linha.servico_nome), celula: 'font-medium' },
          { rotulo: 'Emissão', valor: data(linha.data_emissao), celula: 'whitespace-nowrap tabular-nums' },
          { rotulo: 'Início', valor: data(linha.data_inicio), celula: 'whitespace-nowrap tabular-nums' },
          { rotulo: 'Fim', valor: data(linha.data_fim), celula: 'whitespace-nowrap tabular-nums' },
        ]}
      />

      {linha.observacoes && (
        <Quadro titulo="Observação da OS">
          {/* Uma coluna só: não há o que empilhar, e a tabela de célula única
              serve aos dois tamanhos. */}
          <Table className="text-xs">
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell className="whitespace-pre-line">{linha.observacoes}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Quadro>
      )}

      <QuadroDeRegistro
        titulo="Contribuinte de faturamento da OS"
        // OS sem contribuinte escolhido existe de verdade e não é erro de tela —
        // em produção são 21 das 155 (15/09/2026). A frase diz onde se resolve,
        // no lugar de quatro travessões mudos.
        aviso={
          temContribuinte
            ? undefined
            : 'Esta OS ainda não tem contribuinte. A escolha é feita na aba de OS do cadastro do cliente, entre os contribuintes já salvos.'
        }
        campos={[
          {
            rotulo: 'Razão Social / Nome Completo',
            valor: ou(linha.contribuinte_nome),
            celula: 'font-medium',
          },
          { rotulo: 'CPF/CNPJ', valor: ou(linha.cpf_cnpj), celula: 'tabular-nums' },
          { rotulo: 'Inscrição Estadual', valor: ou(linha.inscricao_estadual) },
          { rotulo: 'Telefone', valor: ou(linha.telefone) },
        ]}
      />

      <QuadroDeRegistro
        titulo="Endereço de cobrança"
        aviso={temContribuinte ? undefined : 'Sem contribuinte nesta OS, não há endereço de cobrança.'}
        campos={[
          { rotulo: 'CEP', valor: ou(linha.cep), celula: 'tabular-nums' },
          { rotulo: 'Endereço', valor: ou(linha.endereco) },
          { rotulo: 'Número', valor: ou(linha.numero) },
          { rotulo: 'Bairro', valor: ou(linha.bairro) },
          { rotulo: 'Cidade / UF', valor: ou(linha.cidade_uf) },
        ]}
      />

      {/*
        O CONTATO É DO REPRESENTANTE, e não do contribuinte, porque o contribuinte
        não tem e-mail no cadastro: a coluna não existe. Em produção são 73
        representantes com e-mail. Pedido da Letícia ("um campo com os dados de
        contato: e-mail, telefone"), respondido com o que há; de quem deve ser o
        e-mail da nota é a pergunta F do documento.
      */}
      <Quadro titulo="Contato do cliente">
        {linha.contatos.length === 0 ? (
          <AvisoEmpilhado>
            Nenhum representante com e-mail ou telefone neste cliente. O cadastro é feito na aba
            Representantes.
          </AvisoEmpilhado>
        ) : (
          // Um representante por bloco: são quatro campos por pessoa, e uma lista
          // de pares sem divisa entre as pessoas confundiria o e-mail de um com o
          // telefone do outro.
          <div className="divide-y md:hidden">
            {linha.contatos.map((contato, i) => (
              <ParesEmpilhados
                key={`${contato.nome}-${i}`}
                campos={[
                  { rotulo: 'Nome', valor: contato.nome },
                  { rotulo: 'Cargo', valor: ou(contato.cargo) },
                  { rotulo: 'E-mail', valor: ou(contato.email) },
                  { rotulo: 'Telefone', valor: ou(contato.telefone) },
                ]}
              />
            ))}
          </div>
        )}
        <Table className="text-xs" containerClassName="hidden md:block">
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

      <QuadroDeRegistro
        titulo="Valores do contrato"
        campos={[
          {
            rotulo: 'Valor do Projeto',
            valor: formatCurrencyDisplay(linha.valor_projeto),
            numerica: true,
            celula: 'font-medium',
          },
          // OS anterior aos campos de parcelamento fica em "—": é dado que
          // ninguém informou, e exibir "1" ali inventaria um pagamento único que
          // não foi combinado.
          {
            rotulo: 'Nº de Parcelas',
            valor: linha.numero_parcelas != null ? String(linha.numero_parcelas) : '—',
            numerica: true,
          },
          {
            rotulo: 'Entrada',
            valor: formatCurrencyDisplay(linha.valor_entrada),
            numerica: true,
          },
          {
            rotulo: 'Valor da Parcela',
            valor: linha.valor_parcela != null ? formatCurrencyDisplay(linha.valor_parcela) : '—',
            numerica: true,
          },
          {
            rotulo: 'Reembolso por KM',
            valor: formatCurrencyDisplay(linha.valor_reembolso_km),
            numerica: true,
          },
          {
            rotulo: 'Reembolso Refeição',
            valor: formatCurrencyDisplay(linha.valor_reembolso_refeicao),
            numerica: true,
          },
        ]}
      />

      {/* A empresa que EMITE a nota e as fatias em que a receita dela se divide
          moram no mesmo quadro porque são a mesma pergunta em duas alturas: de
          quem é a receita, e como ela se reparte. A empresa ocupa uma célula só,
          esticada pelas linhas do rateio (`rowSpan`), para não se repetir a cada
          fatia como se mudasse. */}
      <Quadro titulo="Empresa / Faturamento e Distribuição de Receita">
        {/* No celular o `rowSpan` não tem o que esticar: a empresa vira o
            primeiro par e as fatias vêm abaixo, cada uma na própria linha. */}
        <div className="md:hidden">
          <ParesEmpilhados
            campos={[
              { rotulo: 'Empresa / Faturamento', valor: ou(linha.empresa_faturamento) },
              ...linha.rateio.map((fatia) => ({
                rotulo: fatia.label,
                valor: `${formatarPercentual(fatia.percentual)}%`,
                numerica: true,
              })),
            ]}
          />
          {linha.rateio.length === 0 && (
            <AvisoEmpilhado>Sem centro de custo definido para esta OS.</AvisoEmpilhado>
          )}
        </div>
        <Table className="text-xs" containerClassName="hidden md:block">
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
          <ParesEmpilhados
            className="md:hidden"
            campos={linha.produtos.map((produto) => ({
              rotulo: produto.label,
              valor: produto.horas != null ? `${produto.horas} h` : '—',
              numerica: true,
            }))}
          />
          <Table className="text-xs" containerClassName="hidden md:block">
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
