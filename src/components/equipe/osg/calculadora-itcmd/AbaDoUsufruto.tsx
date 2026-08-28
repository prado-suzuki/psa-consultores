import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AdicionarPessoa } from './AdicionarPessoa';
import { AvisoDeParcelaDiferida, SelecaoDaBase } from './SelecaoDaBase';
import { Campo, fieldCls } from '@/components/equipe/osg/formKit';
import { pctDeDecimal, quotasDeBigint, TRACO } from './itcmdFmt';
import type { CalculadoraItcmd } from '@/hooks/useCalculadoraItcmdController';
import type { LinhaDoUsufruto } from '@/lib/osg/usufrutoDoAto';

/**
 * A ABA DO USUFRUTO — quem fica com o VOTO depois da doação.
 *
 * A aba da doação responde "quem fica com as quotas". Esta responde outra pergunta, e
 * com outra régua: quem VOTA. No caso de referência o fundador termina com 0% de
 * participação e 51% de voto.
 *
 * É O MESMO QUADRO DA DOAÇÃO, com outras colunas: as mesmas pessoas, o papel em lista
 * suspensa na linha, a lixeira na frente do nome e um campo para adicionar. Duas telas
 * com a mesma pergunta — quem entra no ato e em que papel — não precisavam de duas
 * gramáticas.
 *
 * As colunas são as do slide (Sócios · Quotas · % · Plena · Nua propriedade · Usufruto
 * · %) mais UMA que a apresentação não tem porque lá o número já está decidido:
 * QUANTO CADA UM CONCEDE.
 */
export function AbaDoUsufruto({ calc }: { calc: CalculadoraItcmd }) {
  if (calc.linhasDoUsufruto.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-600">
        Monte o ato na aba <strong>Doação</strong> primeiro. O usufruto se apoia no quadro
        de lá: é o que foi doado que vira nua propriedade.
      </p>
    );
  }

  const temInstituicao = calc.totalInstituido > 0n;

  return (
    <div className="space-y-4">
      {/* ── OS PARÂMETROS DESTE ATO ──────────────────────────────────────────
          SÓ a base da INSTITUIÇÃO. A da reserva mora na aba da Doação, ao lado do
          checkbox: são DUAS GUIAS, com DUAS naturezas de operação, e portanto duas
          decisões independentes — cada uma na aba do ato cuja guia ela altera. Aqui
          ficavam as duas, agrupadas pelo assunto em vez de pelo ato.

          QUEM RECEBE não é campo: é o papel na linha. */}
      <div className="flex flex-wrap items-end gap-x-5 gap-y-3 rounded-md border border-osg-100 bg-osg-50/40 px-3 py-2.5">
        {/* ADICIONAR na frente, como na aba de doação: conceder usufruto NÃO exige ter
            doado — um sócio que ficou fora da doação pode instituir usufruto sobre as
            quotas que sempre teve. */}
        <AdicionarPessoa
          rotulo="Adicionar participantes"
          vazio="Todas as pessoas físicas do cliente já estão no quadro."
          opcoes={calc.candidatosAoUsufruto.map((c) => ({
            pessoaId: c.pessoaId,
            texto: c.quotas > 0n
              ? `${c.denominacao} · ${quotasDeBigint(c.quotas)} quotas`
              : c.denominacao,
          }))}
          onEscolher={calc.adicionarAoUsufruto}
        />

        {temInstituicao && (
          <Campo rotulo="Base da instituição">
            <SelecaoDaBase
              valor={calc.pctBaseDaInstituicao}
              aoTrocar={calc.setPctBaseDaInstituicao}
              rotulo="Base de cálculo da instituição"
            />
          </Campo>
        )}
      </div>

      {/* A consequência da base reduzida é a única coisa que merece linha própria:
          ela cria uma parcela devida ANOS depois, e ninguém lembra de um `title`. */}
      {temInstituicao && calc.pctBaseDaInstituicao === '70' && (
        <AvisoDeParcelaDiferida onde="instituição" />
      )}

      {/* ── A TABELA ─────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto rounded-lg border border-osg-100">
        <table className="w-full text-sm">
          <thead className="bg-osg-50/60 text-xs font-medium text-osg-800">
            <tr>
              <Th className="w-8" />
              <Th className="text-left">Pessoa</Th>
              <Th className="text-left">Papel</Th>
              <Th>Quotas</Th>
              <Th>%</Th>
              <Th>Plena</Th>
              <Th>Nua propriedade</Th>
              <Th>Concede usufruto de</Th>
              <Th>Usufruto</Th>
              <Th>%</Th>
            </tr>
          </thead>
          <tbody>
            {calc.linhasDoUsufruto.map((l) => (
              <Linha key={l.pessoaId} linha={l} calc={calc} />
            ))}
            {/* O TOTAL fecha em 100%: cada quota vota uma vez. O bloco usufruído entra
                UMA vez mesmo com dois usufrutuários — direito conjunto, com
                acrescimento ao sobrevivente (art. 1.411 do Código Civil). */}
            <tr className="border-t-2 border-osg-100 bg-osg-50/60 font-semibold text-osg-900">
              <Td />
              <Td className="text-left">TOTAL</Td>
              <Td />
              <Td><Q>{calc.totaisDoUsufruto.quotas}</Q></Td>
              <Td>{pctDeDecimal(calc.totaisDoUsufruto.pctParticipacao)}</Td>
              <Td><Q>{calc.totaisDoUsufruto.plena}</Q></Td>
              <Td><Q>{calc.totaisDoUsufruto.nua}</Q></Td>
              <Td><Q>{calc.totalInstituido}</Q></Td>
              <Td><Q>{calc.totaisDoUsufruto.usufruto}</Q></Td>
              <Td>{pctDeDecimal(calc.totaisDoUsufruto.pctVozEVoto)}</Td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* O IMPOSTO DA INSTITUIÇÃO — as guias, as bases e os três cenários — é
          RESULTADO, e resultado mora no quadro de saída, ao lado dos cenários da
          doação. Esta aba é o formulário que o produz. Aqui fica só o que TRAVA a
          geração. */}
      {calc.erroDaInstituicao && (
        <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
          {calc.erroDaInstituicao}
        </p>
      )}

      {calc.problemasDoUsufruto.map((p) => (
        <p
          key={p.codigo}
          className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
        >
          {p.mensagem}
        </p>
      ))}
    </div>
  );
}

/**
 * UMA LINHA DO QUADRO. O PAPEL decide qual campo é dela:
 *
 *   · nu-proprietário digita QUANTO CONCEDE — é ele que tem quota para dar;
 *   · usufrutuário digita o % ALVO de voz e voto — é ele que tem alvo a alcançar, e a
 *     calculadora resolve de quem sai.
 *
 * O outro campo fica em leitura. Deixar os dois abertos em toda linha foi o que tornou
 * a tela confusa: campos que se anulam entre si, sem dizer qual manda.
 */
function Linha({ linha: l, calc }: { linha: LinhaDoUsufruto; calc: CalculadoraItcmd }) {
  const papel = calc.papelNoUsufruto(l.pessoaId);
  const usufrui = papel === 'usufrui';
  const podeConceder = l.plena + l.nuaDeInstituicao > 0n;

  return (
    <tr className="border-t border-slate-100">
      <Td className="pr-0">
        <button
          type="button"
          aria-label={`Tirar ${l.nome} do usufruto`}
          title={`${l.nome} sai do quadro de usufruto. Continua na doação.`}
          onClick={() => calc.removerDoUsufruto(l.pessoaId)}
          className="rounded p-1 text-slate-400 hover:bg-muted hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </Td>
      <Td className="text-left font-sans font-normal">{l.nome}</Td>
      <Td className="text-left">
        <Select
          value={papel}
          onValueChange={(v) => calc.definirPapelNoUsufruto(
            l.pessoaId, v === 'usufrui' ? 'usufrui' : 'concede',
          )}
        >
          <SelectTrigger
            aria-label={`Papel de ${l.nome} no usufruto`}
            className={`${fieldCls} h-8 w-40`}
            title={'Usufrutuário recebe uso, gozo e voto — é dele o alvo de %. '
              + 'Nu-proprietário continua dono das quotas e passa o voto adiante — é '
              + 'dele o que se concede, e a guia.'}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="usufrui">Usufrutuário</SelectItem>
            <SelectItem value="concede">Nu-proprietário</SelectItem>
          </SelectContent>
        </Select>
      </Td>
      {/* QUOTAS não muda: o usufruto reparte o VOTO delas, não elas. Vem da
          participação final da aba de doação. */}
      <Td title="Participação final, da aba de doação. O usufruto não a altera.">
        <Q>{l.quotas}</Q>
      </Td>
      <Td className="text-slate-500">{pctDeDecimal(l.pctParticipacao)}</Td>
      <Td title="Quotas que ela tem E vota.">{quotasDeBigint(l.plena)}</Td>
      <Td
        title={l.nua === 0n
          ? 'Quotas que ela tem e não vota, porque concedeu o usufruto.'
          : `Concedido: ${quotasDeBigint(l.nuaDeReserva)} pela reserva da doação `
            + `(automático) e ${quotasDeBigint(l.nuaDeInstituicao)} por `
            + 'instituição declarada.'}
      >
        {quotasDeBigint(l.nua)}
      </Td>
      {/* CONCEDER é o campo do nu-proprietário. A reserva não se digita aqui — ela já
          veio da doação. Editar uma concessão REACOMODA as outras, mantendo o total:
          o total é o alvo de voz e voto, e quem o muda é a coluna do usufrutuário. */}
      <Td>
        {!usufrui && podeConceder ? (
          <Input
            aria-label={`Quotas que ${l.nome} concede em usufruto`}
            inputMode="numeric"
            placeholder="0"
            title={`${l.nome} tem ${quotasDeBigint(l.plena + l.nuaDeInstituicao)} `
              + 'quotas em propriedade plena. Conceder o usufruto delas passa o voto '
              + 'aos usufrutuários, e é ato tributado — guia e imposto próprios.'}
            className={`${fieldCls} ml-auto h-8 w-28 text-right font-mono tabular-nums`}
            value={calc.institucaoDigitada(l.pessoaId)}
            onChange={(e) => calc.setInstituicao(l.pessoaId, e.target.value)}
          />
        ) : (
          <span className="text-slate-400">
            {l.nuaDeInstituicao > 0n ? quotasDeBigint(l.nuaDeInstituicao) : TRACO}
          </span>
        )}
      </Td>
      <Td title="Quotas de outros que ela usufrui — e vota.">
        {quotasDeBigint(l.usufruto)}
      </Td>
      {/* O % ALVO é o campo do usufrutuário: lê-se o percentual atual e digita-se o
          desejado, e a calculadora reparte a concessão entre os nu-proprietários. */}
      <Td>
        {usufrui ? (
          <div className="relative ml-auto w-24">
            <Input
              aria-label={`Voz e voto de ${l.nome}, em %`}
              inputMode="decimal"
              title={'Percentual do capital que esta pessoa vota. Digite o desejado e a '
                + 'calculadora reparte a concessão entre os nu-proprietários — cada um '
                + 'emite a sua guia, com a própria isenção de 500 UPF.'}
              className={`${fieldCls} h-8 w-full pr-6 text-right font-mono tabular-nums font-semibold`}
              value={calc.vozEVotoDigitado(l.pessoaId, l.pctVozEVoto)}
              onChange={(e) => calc.setVozEVoto(l.pessoaId, e.target.value)}
              onBlur={() => calc.confirmarVozEVoto(l.pessoaId)}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              %
            </span>
          </div>
        ) : (
          <span className="font-semibold">{pctDeDecimal(l.pctVozEVoto)}</span>
        )}
      </Td>
    </tr>
  );
}

function Th({ children, className = '' }: {
  children?: React.ReactNode;
  className?: string;
}) {
  return <th className={`px-3 py-2 text-right font-medium ${className}`}>{children}</th>;
}

function Td({ children, className = '', title }: {
  children?: React.ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <td
      title={title}
      className={`px-3 py-1.5 text-right font-mono tabular-nums ${className}`}
    >
      {children}
    </td>
  );
}

function Q({ children }: { children: bigint }) {
  return <>{quotasDeBigint(children)}</>;
}
