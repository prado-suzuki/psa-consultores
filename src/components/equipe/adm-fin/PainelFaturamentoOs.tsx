import { Building2 } from 'lucide-react';

import FieldPair from '@/components/equipe/client-form/FieldPair';
import OsValoresLeitura from '@/components/equipe/client-form/OsValoresLeitura';
import SecaoFormulario from '@/components/equipe/client-form/SecaoFormulario';
import { formatarPercentual } from '@/lib/rateioReceita';
import type { LinhaFaturamentoOs } from '@/lib/admFinFaturamentoOs';

/**
 * O relatório de Faturamento de UMA OS, no painel de detalhe do dashboard.
 *
 * São os mesmos quatro blocos da aba de Faturamento do cadastro de cliente, com
 * os mesmos rótulos e as mesmas regras de vazio, montados com as MESMAS peças
 * (`SecaoFormulario`, `FieldPair`, `OsValoresLeitura`). Duas telas que mostram a
 * mesma coisa com marcação própria divergem no primeiro campo que alguém
 * acrescenta de um lado só — foi o que aconteceu com a leitura da OS, que ficou
 * anos sem a empresa de faturamento que a edição já tinha.
 *
 * O que NÃO se reaproveita é a `FaturamentoTab` inteira: ela traz a própria barra
 * de escolha de OS, e aqui quem escolhe é a lista à esquerda. Duas seleções para
 * a mesma coisa na mesma tela é pior que nenhuma.
 *
 * Só leitura, como lá: contribuinte, valores e rateio se trocam na aba de OS do
 * cadastro; o cadastro do contribuinte, em Contribuintes.
 */
export interface PainelFaturamentoOsProps {
  linha: LinhaFaturamentoOs;
}

export function PainelFaturamentoOs({ linha }: PainelFaturamentoOsProps) {
  const temContribuinte = linha.contribuinte_nome != null;

  return (
    // Duas PILHAS, e não quatro células soltas na grade: com células soltas a
    // ordem do DOM seria 01, 03, 02, 04, e em tela estreita (uma coluna) as
    // seções empilhariam fora da sequência numerada.
    <div className="grid grid-cols-1 items-start gap-x-8 gap-y-5 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <SecaoFormulario numero={1} titulo="Contribuinte de faturamento da OS">
          {temContribuinte ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-2 [&>*]:min-w-0">
              <FieldPair
                label="Razão Social / Nome Completo"
                value={linha.contribuinte_nome ?? undefined}
              />
              <FieldPair label="CPF/CNPJ" value={linha.cpf_cnpj ?? undefined} />
              <FieldPair label="Inscrição Estadual" value={linha.inscricao_estadual ?? undefined} />
              <FieldPair label="Telefone" value={linha.telefone ?? undefined} />
            </div>
          ) : (
            /* OS sem contribuinte escolhido existe de verdade e não é erro de
               tela: cliente sem contribuinte cadastrado ficou nulo na carga, e OS
               criada junto com o cliente nasce sem, porque a escolha exige
               contribuinte já salvo. Em produção são 21 das 155 (15/09/2026). */
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-semibold text-foreground">
                Esta OS ainda não tem contribuinte
              </p>
              <p className="max-w-sm text-xs text-muted-foreground">
                Escolha o contribuinte de faturamento na aba de OS do cadastro do cliente. Ele
                precisa estar cadastrado e salvo em Contribuintes para aparecer na lista.
              </p>
            </div>
          )}
        </SecaoFormulario>

        <SecaoFormulario numero={2} titulo="Endereço de cobrança">
          {temContribuinte ? (
            <div className="grid grid-cols-2 gap-x-5 gap-y-2 [&>*]:min-w-0">
              <FieldPair label="CEP" value={linha.cep ?? undefined} />
              <FieldPair label="Número" value={linha.numero ?? undefined} />
              <FieldPair label="Endereço" value={linha.endereco ?? undefined} />
              <FieldPair label="Bairro" value={linha.bairro ?? undefined} />
              <FieldPair label="Cidade / UF" value={linha.cidade_uf ?? undefined} />
            </div>
          ) : (
            <p className="rounded-md border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
              Sem contribuinte nesta OS, não há endereço de cobrança.
            </p>
          )}
        </SecaoFormulario>
      </div>

      {/* DIREITA: o que será faturado, as duas seções que vêm da OS. */}
      <div className="flex flex-col gap-5">
        <SecaoFormulario numero={3} titulo="Valores do contrato">
          <OsValoresLeitura contrato={linha} colunas={3} />
        </SecaoFormulario>

        <SecaoFormulario numero={4} titulo="Empresa / Faturamento e Distribuição de Receita">
          <div className="mb-3 border-b pb-2.5">
            <FieldPair
              label="Empresa / Faturamento"
              value={linha.empresa_faturamento ?? undefined}
            />
          </div>
          <p className="mb-1 text-[10px] font-bold uppercase text-muted-foreground">
            Distribuição de Receita
          </p>
          {linha.rateio.length === 0 ? (
            <p className="text-xs italic text-muted-foreground">
              Sem centro de custo definido para esta OS.
            </p>
          ) : (
            // O percentual vem ANTES do nome, numa coluna estreita alinhado à
            // direita: num painel largo, nome à esquerda e percentual na borda
            // ficam longe demais para ler o par.
            <ul className="space-y-1">
              {linha.rateio.map((fatia, i) => (
                <li
                  key={`${fatia.label}-${i}`}
                  className="grid grid-cols-[3.25rem_1fr] items-baseline gap-x-2 text-sm"
                >
                  <span className="text-right font-medium tabular-nums text-foreground">
                    {formatarPercentual(fatia.percentual)}%
                  </span>
                  <span className="min-w-0 truncate text-muted-foreground">{fatia.label}</span>
                </li>
              ))}
            </ul>
          )}
        </SecaoFormulario>
      </div>
    </div>
  );
}

export default PainelFaturamentoOs;
