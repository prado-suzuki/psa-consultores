import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { formatarHoras, type LinhaPessoaProduto } from '@/lib/auditProdutividade';

interface AuditPessoasDoProdutoProps {
  linhas: LinhaPessoaProduto[];
  /** Frase mostrada quando ninguém registrou ação no recorte. */
  vazio: string;
}

/**
 * Tabela de quem executou — a folha das duas leituras do painel de um produto:
 * todo mundo que mexeu no produto, ou só quem mexeu num cliente dele.
 *
 * Não traz título próprio: quem diz de qual recorte se trata é o painel
 * (`AuditClientesDoProduto`), via aba ou trilha.
 *
 * Espelho de `AuditProdutosDaPessoa` — mesma conta, lida ao contrário — para o
 * par pessoa × produto mostrar o mesmo número nas duas abas.
 *
 * A soma de "Tocados" das pessoas pode passar os Concluídos da linha de cima:
 * duas pessoas na mesma tarefa contam uma vez cada, enquanto a linha do produto
 * ou do cliente conta a tarefa uma vez.
 */
export const AuditPessoasDoProduto = ({ linhas, vazio }: AuditPessoasDoProdutoProps) => {
  if (linhas.length === 0) {
    return <p className="text-xs text-slate-500">{vazio}</p>;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="h-8 text-xs">Colaborador</TableHead>
          <TableHead className="h-8 text-right text-xs">Tocados</TableHead>
          <TableHead className="h-8 text-right text-xs">Concluídos</TableHead>
          <TableHead className="h-8 text-right text-xs">Horas plan./exec.</TableHead>
          <TableHead className="h-8 text-right text-xs">Tempo médio</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {linhas.map(linha => (
          <TableRow key={linha.userId} className="hover:bg-transparent">
            <TableCell className="py-1.5 text-xs font-medium text-slate-700">
              {linha.nome}
            </TableCell>
            <TableCell className="py-1.5 text-right text-xs">{linha.itensTocados}</TableCell>
            <TableCell className="py-1.5 text-right text-xs">{linha.concluidos}</TableCell>
            <TableCell className="whitespace-nowrap py-1.5 text-right text-xs">
              <span className="text-slate-500">{formatarHoras(linha.horasPlanejadas)}</span>
              <span className="text-slate-300"> / </span>
              <span className="font-medium text-slate-900">
                {formatarHoras(linha.horasExecutadas)}
              </span>
            </TableCell>
            <TableCell className="py-1.5 text-right text-xs font-semibold">
              {formatarHoras(linha.tempoMedio)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};
