import { EyeOff } from 'lucide-react';
import type { BlocoForaDaFolha } from '@/components/equipe/osg/gerar/resumoDaComposicao';

/**
 * Os blocos do modelo que não entraram no documento por não terem dado, com o
 * porquê de cada um.
 *
 * Sem isto o descarte é invisível: o bloco some da prévia, o rodapé continua
 * contando os blocos do modelo, e um laço mal fiado (ou uma lista que ainda não
 * carregou) fica indistinguível de uma cláusula que legitimamente não se aplica.
 * Não é aviso de erro — descartar é o comportamento certo —, é o recibo dele.
 */
export function BlocosSemDado({ blocos }: { blocos: BlocoForaDaFolha[] }) {
  if (blocos.length === 0) return null;
  return (
    <div className="space-y-2 rounded-md border border-border bg-muted/70 p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
        <EyeOff className="h-4 w-4 text-muted-foreground" />
        {blocos.length === 1 ? '1 bloco não entrou' : `${blocos.length} blocos não entraram`}
      </p>
      <ul className="space-y-1">
        {blocos.map((bloco) => (
          <li key={bloco.id} className="text-sm leading-snug text-muted-foreground">
            <span className="font-medium text-slate-700">{bloco.nome}</span>: {bloco.explicacao}.
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Bloco sem dado nenhum fica de fora do documento — preencha o cadastro correspondente para
        que ele volte.
      </p>
    </div>
  );
}
