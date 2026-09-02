import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { fieldCls } from '@/components/equipe/osg/formKit';
import { Aviso, ComDica, rotuloCls } from './itcmdKit';

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

/**
 * O CAMPO DA BASE — rótulo AO LADO, e o lugar sempre reservado.
 *
 * Ele era um `Campo` (rótulo ACIMA) que só existia quando o ato existia, e as duas
 * coisas juntas faziam a tela pular duas vezes:
 *
 *  · o rótulo em cima acrescentava 18px de altura à barra inteira, então marcar
 *    "com reserva" empurrava a tabela e tudo abaixo dela para baixo;
 *  · o campo nascendo do nada empurrava os vizinhos de lado — na aba de usufruto ele
 *    aparecia no instante em que se digitava o percentual de voz e voto, que é
 *    justamente quando o olho está na tabela e não na barra.
 *
 * SEM O ATO QUE DÁ A ESCOLHA, O LUGAR CONTINUA LÁ, MAS COMO TEXTO — não como lista
 * suspensa desabilitada. É a mesma regra da coluna Emissão GIA, três telas ao lado:
 * campo desabilitado ocupa o espaço de uma escolha para dizer que não há escolha, e
 * convida ao clique que não faz nada. Foi o que aconteceu na aba de usufruto: um seletor
 * cinza travado em 100% parece defeito, não parece "ainda não há o que decidir".
 *
 * E O QUE ELE MOSTRA DEPENDE DO ATO, porque as duas guias não estão na mesma situação:
 *
 *  · na DOAÇÃO sem reserva a guia existe e a base dela É 100% — a redução do
 *    art. 11, §2º I é do usufruto. O motor faz literalmente isso
 *    (`pctDaBase: comReserva ? pctBaseDaDoacao : undefined`), então dizer 100% é
 *    afirmar o que vai ser apurado;
 *  · na INSTITUIÇÃO sem quota instituída não existe guia nenhuma. Ali 100% seria uma
 *    afirmação sobre um documento que não vai ser emitido, e o certo é o traço.
 *
 * Uniformizar isso foi o erro da primeira versão: as duas telas ficaram iguais, e uma
 * delas passou a mentir.
 */
export function CampoDaBase({ rotulo, valor, aoTrocar, ativo, semAto, porQueTravado }: {
  rotulo: string;
  valor: '100' | '70';
  aoTrocar: (v: '100' | '70') => void;
  ativo: boolean;
  /** O que o lugar mostra enquanto não há ato: a base que vale, ou o traço. */
  semAto: string;
  /** Por que não se escolhe agora. Vira a dica do rótulo no estado travado. */
  porQueTravado: string;
}) {
  return (
    <div className="flex h-9 items-center gap-2">
      <ComDica
        dica={ativo
          ? (
            <>
              <strong className="font-semibold">100%</strong>
              {': base integral, com encerramento da tributação. Nada mais é devido na '}
              {'renúncia nem na extinção do usufruto (art. 28, §3º, III). '}
              <strong className="font-semibold">70%</strong>
              {': redução automática, e fica parcela devida na extinção '}
              {'(art. 11, §2º, I). Pagar 70% é adiar, não economizar.'}
            </>
          )
          : porQueTravado}
      >
        <span className={rotuloCls}>{rotulo}</span>
      </ComDica>
      {/* `w-28` nos dois estados — é a mesma medida do seletor, e é o que impede a
          barra de mudar de largura quando o ato passa a existir. */}
      {ativo ? (
        <SelecaoDaBase valor={valor} aoTrocar={aoTrocar} rotulo={rotulo} />
      ) : (
        <span className="flex h-9 w-28 items-center px-3 text-sm text-muted-foreground">
          {semAto}
        </span>
      )}
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
