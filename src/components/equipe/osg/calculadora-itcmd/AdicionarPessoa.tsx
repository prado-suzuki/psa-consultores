import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Campo, fieldCls } from '@/components/equipe/osg/formKit';

/**
 * UM CAMPO PARA ENTRAR NA TABELA — o mesmo na doação e no usufruto, no mesmo canto
 * das duas: à esquerda, na frente da barra de parâmetros. Ele estava à esquerda numa
 * aba e à direita na outra, e trocar de aba movia o controle de lugar.
 *
 * Lista suspensa que volta a "Escolha a pessoa" depois de cada escolha, para dar duas
 * pessoas em dois cliques. Sem candidato, não fica um campo vazio na tela: fica a
 * frase que diz por que não há ninguém para adicionar.
 */
export function AdicionarPessoa({ rotulo, vazio, opcoes, onEscolher }: {
  rotulo: string;
  vazio: string;
  opcoes: Array<{ pessoaId: string; texto: string }>;
  onEscolher: (pessoaId: string) => void;
}) {
  if (opcoes.length === 0) {
    return <p className="pb-2 text-xs text-slate-500">{vazio}</p>;
  }
  return (
    <Campo rotulo={rotulo}>
      <Select value="" onValueChange={onEscolher}>
        <SelectTrigger className={`${fieldCls} h-9 w-72`} aria-label={rotulo}>
          <SelectValue placeholder="Escolha a pessoa" />
        </SelectTrigger>
        <SelectContent>
          {opcoes.map((o) => (
            <SelectItem key={o.pessoaId} value={o.pessoaId}>{o.texto}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Campo>
  );
}
