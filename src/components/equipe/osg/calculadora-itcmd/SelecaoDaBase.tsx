import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { fieldCls } from '@/components/equipe/osg/formKit';

/**
 * A ESCOLHA DA BASE DE CÁLCULO — 70% ou 100%.
 *
 * Não é preferência de tela: é o art. 28, §3º, III do Decreto 2.125/03 (base integral,
 * COM ENCERRAMENTO da tributação) contra o art. 11, §2º, I (redução automática a 70%,
 * com parcela devida na extinção do usufruto). Pagar 70% agora é ADIAR, não economizar.
 *
 * O componente é compartilhado porque a escolha aparece DUAS VEZES, em duas guias com
 * naturezas de operação diferentes — DOAÇÃO COM RESERVA DE USUFRUTO e INSTITUIÇÃO DE
 * USUFRUTO. São duas decisões independentes, e por isso cada campo mora na aba do ato
 * cuja guia ele altera, não os dois juntos num bloco de "70%".
 *
 * O caso de referência usou as duas no MESMO DIA: a reserva a 100%, com o texto de
 * encerramento impresso na guia, e a instituição a 70%.
 */
export function SelecaoDaBase({ valor, aoTrocar, rotulo }: {
  valor: '100' | '70';
  aoTrocar: (v: '100' | '70') => void;
  rotulo: string;
}) {
  return (
    <Select value={valor} onValueChange={(v) => aoTrocar(v === '70' ? '70' : '100')}>
      <SelectTrigger
        className={`${fieldCls} h-9 w-32`}
        aria-label={rotulo}
        title={valor === '100'
          ? 'Base integral, com encerramento da tributação: nada mais é devido na '
            + 'renúncia ou na extinção do usufruto (art. 28, §3º, III).'
          : 'Redução automática: paga-se sobre 70% agora e fica parcela devida na '
            + 'extinção do usufruto (art. 11, §2º, I).'}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="100">100%</SelectItem>
        <SelectItem value="70">70%</SelectItem>
      </SelectContent>
    </Select>
  );
}

/**
 * A consequência da base reduzida, numa linha e não num banner: a pendência é real, o
 * alarme não. Ela cria uma parcela devida ANOS depois — é o tipo de coisa que ninguém
 * vai buscar num `title`.
 */
export function AvisoDeParcelaDiferida({ onde }: { onde: string }) {
  return (
    <p className="text-xs text-amber-700">
      {`Base de 70% na ${onde}: fica parcela devida na extinção do usufruto `}
      (art. 11, §2º, I do Decreto 2.125/03).
    </p>
  );
}
