import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { fieldCls } from '@/components/equipe/osg/formKit';
import type { BaseDeCalculo } from '@/hooks/useSimulacoesItcmd';
import { Aviso, ComDica, rotuloCls } from './itcmdKit';

/**
 * As duas bases com usufruto: 100% encerra a tributação (Decreto 2.125/03, art. 28, §3º, III) e 70% deixa
 * parcela devida na extinção (art. 11, §2º, I). A simulação grava as duas; a tela só alterna qual se vê.
 */
export function SelecaoDaBase({ valor, aoTrocar, rotulo }: {
  valor: BaseDeCalculo;
  aoTrocar: (v: BaseDeCalculo) => void;
  rotulo: string;
}) {
  return (
    <Select value={valor} onValueChange={(v) => aoTrocar(v === '70' ? '70' : '100')}>
      <SelectTrigger className={`${fieldCls} h-9 w-28`} aria-label={rotulo}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="100">100%</SelectItem>
        <SelectItem value="70">70%</SelectItem>
      </SelectContent>
    </Select>
  );
}

/** Ver em 100% ou em 70%: só troca a visualização, não grava nem muda a simulação. */
export function VerNaBase({ valor, aoTrocar }: {
  valor: BaseDeCalculo;
  aoTrocar: (v: BaseDeCalculo) => void;
}) {
  return (
    <div className="flex h-9 items-center gap-2">
      <ComDica
        dica={(
          <>
            <strong className="font-semibold">100%</strong>
            {': base integral, com encerramento da tributação. Nada mais é devido na '}
            {'renúncia nem na extinção do usufruto (art. 28, §3º, III). '}
            <strong className="font-semibold">70%</strong>
            {': redução automática, e fica parcela devida na extinção '}
            {'(art. 11, §2º, I). Pagar 70% é adiar, não economizar. '}
            {'A simulação guarda as duas: quem escolhe é o cliente.'}
          </>
        )}
      >
        <span className={rotuloCls}>Ver na base de</span>
      </ComDica>
      <SelecaoDaBase valor={valor} aoTrocar={aoTrocar} rotulo="Ver na base de" />
    </div>
  );
}

/**
 * A consequência da base reduzida: a pendência é real, o alarme não. Ela cria uma
 * parcela devida ANOS depois — é o tipo de coisa que ninguém vai buscar numa dica.
 */
export function AvisoDeParcelaDiferida({ onde }: { onde: string }) {
  return (
    <Aviso>
      {`Base de 70% na ${onde}: fica parcela devida na extinção do usufruto `}
      (art. 11, §2º, I do Decreto 2.125/03).
    </Aviso>
  );
}
