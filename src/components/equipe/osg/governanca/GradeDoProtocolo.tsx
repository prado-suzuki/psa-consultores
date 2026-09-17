import { Fragment } from 'react';

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
 * então corta em três linhas e o `title` leva o texto completo, para conferir
 * sem abrir a caixa item por item.
 */
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
                <TableRow className="hover:bg-transparent">
                  <TableCell
                    colSpan={colunas.length + 1}
                    className="bg-osg-50/70 py-2 text-left text-xs font-semibold uppercase tracking-wide text-osg-700"
                  >
                    {secao.tema}
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
                          <span className="line-clamp-3 text-foreground" title={c.texto}>
                            {c.texto}
                          </span>
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
