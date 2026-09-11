import { cn } from '@/lib/utils';

export interface LinhaDaComparacao {
  /** Chave estável da linha (o campo comparado, ou o id da pessoa). */
  chave: string;
  rotulo: string;
  antes: string | null;
  depois: string | null;
  /** Motivo pelo qual esta linha NÃO pode ser gerada, quando há um. */
  impedimento?: string;
}

/**
 * A tabela "registrado → cadastro atual" que o assistente de alteração mostra
 * embaixo de cada evento.
 *
 * Existe como componente próprio porque as duas matérias comparáveis pedem a
 * MESMA leitura e têm formas diferentes: a sede compara campo a campo de uma
 * parte só, e a qualificação compara uma linha por sócio. Repetir a marcação nas
 * duas faria as duas divergirem no primeiro ajuste de estilo.
 *
 * Linha sem mudança não some: ela é o contexto que prova que a mudança é a que
 * está realçada, e é o que o consultor confere antes de aprovar.
 */
export const ComparacaoAntesDepois = ({ linhas }: { linhas: LinhaDaComparacao[] }) => (
  <div className="overflow-x-auto rounded-md border border-osg-200/80">
    <table className="w-full text-xs">
      <thead className="bg-osg-50/60 text-left text-muted-foreground">
        <tr>
          <th className="px-2 py-1 font-medium">Campo</th>
          <th className="px-2 py-1 font-medium">Registrado</th>
          <th className="px-2 py-1 font-medium">Cadastro atual</th>
        </tr>
      </thead>
      <tbody>
        {linhas.map((l) => {
          const mudou = l.antes !== l.depois;
          return (
            <tr
              key={l.chave}
              className={cn(mudou ? 'bg-osg-moss/[0.05] text-foreground' : 'text-muted-foreground')}
            >
              <td className="px-2 py-1 align-top">
                {l.rotulo}
                {l.impedimento && (
                  <span className="block text-warning">{l.impedimento}</span>
                )}
              </td>
              <td className="px-2 py-1 align-top">{l.antes ?? <em>desconhecido</em>}</td>
              <td className="px-2 py-1 align-top">{l.depois ?? <em>desconhecido</em>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);
