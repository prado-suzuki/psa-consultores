import { Fragment } from 'react';

import { ElementTooltip } from '@/components/ui/button-tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { rowActivateProps } from '@/hooks/rowActivateProps';
import type {
  BeneficiarioDoProtocolo, LinhaDaGrade, SecaoDaGrade,
} from '@/lib/protocoloRemuneracao';

/**
 * A grade do protocolo: itens em linha, agrupados por tema, beneficiários em
 * coluna.
 *
 * **O tema é linha da própria planilha, e não enfeite de tela.** No modelo da
 * casa ele ocupa a coluna C e agrupa os itens abaixo dele. Se virasse uma coluna
 * comum, o nome do tema se repetiria em todas as 7 linhas de "Veículos", e a
 * grade viraria repetição.
 *
 * **A célula mostra o começo da regra, não a regra inteira.** Aqui a célula JÁ É
 * a frase do documento, e ela é longa: no Potrich, "Modelo do Veículo" tem 160
 * caracteres numa célula só. Espremer isso tornaria as 52 linhas ilegíveis,
 * então corta em três linhas e o balão leva o texto completo, para conferir
 * sem abrir a caixa item por item. O balão é `<ElementTooltip>` e não `title=`:
 * o do navegador não aparece no toque, não acompanha o tema e demora a abrir
 * (`docs/geral/texto-explicativo-na-tela.md`, §3).
 */
/** Linha preenchida é a que tem pelo menos uma regra escrita, em qualquer coluna. */
const preenchidasNaSecao = (secao: SecaoDaGrade) =>
  secao.linhas.filter((l) => l.celulas.some((c) => c.texto)).length;

export function GradeDoProtocolo({
  grade,
  colunas,
  onAbrirLinha,
}: {
  grade: SecaoDaGrade[];
  colunas: BeneficiarioDoProtocolo[];
  onAbrirLinha: (linha: LinhaDaGrade) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-osg-200 bg-background">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="min-w-[240px] align-bottom">Item</TableHead>
              {colunas.map((b) => (
                <TableHead key={b.id} className="min-w-[220px] align-bottom">
                  {b.nome}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {grade.map((secao) => (
              <Fragment key={secao.tema_id}>
                {/*
                  O padrão de cabeça de grupo em tabela já existe na área, no
                  `ControleDeProjetosTabela`: `bg-primary/10` com
                  `border-b border-primary/20` e texto de tamanho normal. A
                  primeira versão desta grade usou um bege claro com maiúsculas
                  miúdas, e o tema sumia no meio das linhas: com 13 temas e 52
                  itens, quem rola a grade perde a conta de onde está.
                */}
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={colunas.length + 1}
                    className="border-b border-primary/20 bg-primary/10 py-2.5 text-left text-sm font-semibold text-foreground"
                  >
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      {secao.tema}
                      {/*
                        O andamento fica no TEMA e não só no topo da tela, no
                        mesmo espírito do "X de Y respondidos" que o Acordo mostra
                        por grupo. Com 13 temas, um número global diz que falta
                        preencher mas não diz ONDE, e quem retoma o trabalho no
                        dia seguinte precisa achar o buraco sem varrer 62 linhas.
                      */}
                      <span className="text-xs font-normal text-muted-foreground">
                        {preenchidasNaSecao(secao)} de {secao.linhas.length} preenchidos
                      </span>
                    </span>
                  </TableCell>
                </TableRow>

                {secao.linhas.map((linha) => (
                  <TableRow key={linha.linha_id} {...rowActivateProps(() => onAbrirLinha(linha))}>
                    <TableCell className="py-2.5 text-left align-top text-sm font-medium">
                      {linha.item}
                    </TableCell>
                    {linha.celulas.map((c) => (
                      <TableCell
                        key={c.beneficiario_id}
                        className="py-2.5 text-left align-top text-xs"
                      >
                        {c.texto ? (
                          <ElementTooltip text={c.texto}>
                            <span className="line-clamp-3 text-foreground">{c.texto}</span>
                          </ElementTooltip>
                        ) : (
                          <span className="text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
