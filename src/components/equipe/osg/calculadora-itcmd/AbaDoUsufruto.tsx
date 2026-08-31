import { Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AdicionarPessoa } from './AdicionarPessoa';
import {
  Aviso, barraDoAtoCls, cabecalhoDaTabelaCls, ComoCampo, ComoDicas, ComSinalDePorcento,
  Ctrl, DICA_NOME_CURTO, DicaDoControle, linhaCls, linhaDeTotalCls, molduraDaTabelaCls, Num, NumCampo, Q,
  Th, Txt,
} from './itcmdKit';
import { AvisoDeParcelaDiferida, CampoDaBase } from './SelecaoDaBase';
import { fieldCls } from '@/components/equipe/osg/formKit';
import { pctDeDecimal, pctSemSinal, quotasDeBigint, TRACO } from './itcmdFmt';
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
      <p className="rounded-lg border border-dashed border-osg-200/70 px-4 py-8 text-center text-sm text-muted-foreground">
        Monte o ato na aba <strong>Doação</strong> primeiro. O usufruto se apoia no quadro
        de lá: é o que foi doado que vira nua propriedade.
      </p>
    );
  }

  const temInstituicao = calc.totalInstituido > 0n;

  return (
    <ComoDicas>
      <div className="space-y-4">
      {/* ── OS PARÂMETROS DESTE ATO ──────────────────────────────────────────
          SÓ a base da INSTITUIÇÃO. A da reserva mora na aba da Doação, ao lado do
          checkbox: são DUAS GUIAS, com DUAS naturezas de operação, e portanto duas
          decisões independentes — cada uma na aba do ato cuja guia ela altera. Aqui
          ficavam as duas, agrupadas pelo assunto em vez de pelo ato.

          QUEM RECEBE não é campo: é o papel na linha. */}
      <div className={barraDoAtoCls}>
        {/* ADICIONAR PRIMEIRO, na esquerda máxima, como na aba de doação. Conceder
            usufruto NÃO exige ter doado: um sócio que ficou fora da doação pode
            instituir usufruto sobre as quotas que sempre teve. */}
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

        {/* SEMPRE na tela, travado enquanto nada foi instituído. Era condicional, e
            então nascia no instante em que se digitava o percentual de voz e voto —
            a barra crescia e a tabela toda descia, com o olho na tabela. */}
        <CampoDaBase
          rotulo="Base da instituição"
          valor={calc.pctBaseDaInstituicao}
          aoTrocar={calc.setPctBaseDaInstituicao}
          ativo={temInstituicao}
          // TRAÇO e não 100%: sem quota instituída não existe guia de instituição, e
          // anunciar uma base seria afirmar algo sobre um documento que não sai. A
          // reserva da doação NÃO conta aqui — ela não tem guia própria, ela muda a
          // base da guia da doação, que se decide na outra aba.
          semAto={TRACO}
          porQueTravado={'Ninguém instituiu usufruto ainda, e sem guia não há base a '
            + 'escolher. Digite na coluna "Concede usufruto de", ou então o percentual '
            + 'de voz e voto do usufrutuário: a calculadora reparte a concessão.'}
        />

      </div>

      {/* A consequência da base reduzida é a única coisa que merece linha própria:
          ela cria uma parcela devida ANOS depois, e ninguém lembra de um `title`. */}
      {temInstituicao && calc.pctBaseDaInstituicao === '70' && (
        <AvisoDeParcelaDiferida onde="instituição" />
      )}

      {/* ── A TABELA ─────────────────────────────────────────────────────── */}
      <div className={molduraDaTabelaCls}>
        <table className="w-full text-sm">
          <thead className={cabecalhoDaTabelaCls}>
            <tr>
              <Th className="w-8" />
              <Th alinhar="esquerda" dica={DICA_NOME_CURTO}>Pessoa</Th>
              <Th
                alinhar="esquerda"
                dica="Quem usufrui recebe o voto; quem é nu-proprietário passa o voto adiante."
              >
                Papel
              </Th>
              <Th dica="Participação final, vinda da aba de Doação. O usufruto não altera quotas: ele reparte o voto delas.">
                Quotas
              </Th>
              <Th dica="Percentual do capital que a pessoa TEM, depois da doação.">%</Th>
              <Th dica="Quotas que a pessoa tem E vota: propriedade plena, sem usufruto concedido a ninguém.">
                Plena
              </Th>
              <Th dica="Quotas que a pessoa tem e NÃO vota: o usufruto delas está com outra pessoa, por reserva na doação ou por instituição declarada.">
                Nua propriedade
              </Th>
              <Th dica="Quanto o nu-proprietário concede agora. Editar uma concessão reacomoda as outras mantendo o total, porque o total é o alvo de voz e voto.">
                Concede usufruto de
              </Th>
              <Th dica="Quotas DE OUTROS que esta pessoa usufrui. Ela não é dona delas, mas vota com elas.">Usufruto</Th>
              <Th dica="Percentual do capital que a pessoa VOTA. É a régua do controle, e dá para ter 0% de quotas e 51% de voto.">
                %
              </Th>
            </tr>
          </thead>
          <tbody>
            {calc.linhasDoUsufruto.map((l) => (
              <Linha key={l.pessoaId} linha={l} calc={calc} />
            ))}
            {/* O TOTAL fecha em 100%: cada quota vota uma vez. O bloco usufruído entra
                UMA vez mesmo com dois usufrutuários — direito conjunto, com
                acrescimento ao sobrevivente (art. 1.411 do Código Civil). */}
            <tr className={linhaDeTotalCls}>
              <Num />
              <Txt className="font-sans">TOTAL</Txt>
              <Num />
              <Num><Q>{calc.totaisDoUsufruto.quotas}</Q></Num>
              <Num>{pctDeDecimal(calc.totaisDoUsufruto.pctParticipacao)}</Num>
              <Num><Q>{calc.totaisDoUsufruto.plena}</Q></Num>
              <Num><Q>{calc.totaisDoUsufruto.nua}</Q></Num>
              <Num><Q>{calc.totalInstituido}</Q></Num>
              <Num><Q>{calc.totaisDoUsufruto.usufruto}</Q></Num>
              {/* O TOTAL veste a casca da coluna também: com o sinal de % fixo, o
                  dígito da linha de conferência tem de parar onde param os das
                  linhas de cima. Em `Num` ele ficava 12px à direita delas. */}
              <NumCampo>
                <ComSinalDePorcento>
                  <ComoCampo recuo="pr-6">
                    {pctSemSinal(calc.totaisDoUsufruto.pctVozEVoto)}
                  </ComoCampo>
                </ComSinalDePorcento>
              </NumCampo>
            </tr>
          </tbody>
        </table>
      </div>

      {/* O IMPOSTO DA INSTITUIÇÃO — as guias, as bases e os três cenários — é
          RESULTADO, e resultado mora no quadro de saída, ao lado dos cenários da
          doação. Esta aba é o formulário que o produz. Aqui fica só o que TRAVA a
          geração. */}
      {calc.erroDaInstituicao && <Aviso tom="erro">{calc.erroDaInstituicao}</Aviso>}

      {calc.problemasDoUsufruto.map((p) => (
        <Aviso key={p.codigo} tom="erro">{p.mensagem}</Aviso>
      ))}
      </div>
    </ComoDicas>
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
    <tr className={linhaCls}>
      <Ctrl>
        <DicaDoControle
          dica={`${l.nome} sai do quadro de usufruto e continua na doação. São dois atos.`}
        >
          <button
            type="button"
            aria-label={`Tirar ${l.nome} do usufruto`}
            onClick={() => calc.removerDoUsufruto(l.pessoaId)}
            className="rounded p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </DicaDoControle>
      </Ctrl>
      <Txt className="font-sans">{l.nome}</Txt>
      <Txt>
        <Select
          value={papel}
          onValueChange={(v) => calc.definirPapelNoUsufruto(
            l.pessoaId, v === 'usufrui' ? 'usufrui' : 'concede',
          )}
        >
          <DicaDoControle
            dica={'Usufrutuário recebe uso, gozo e voto, e é dele o alvo de %. '
              + 'Nu-proprietário continua dono das quotas e passa o voto adiante. A '
              + 'concessão e a guia são dele.'}
          >
            <SelectTrigger
              aria-label={`Papel de ${l.nome} no usufruto`}
              className={`${fieldCls} h-8 w-40`}
            >
              <SelectValue />
            </SelectTrigger>
          </DicaDoControle>
          <SelectContent>
            <SelectItem value="usufrui">Usufrutuário</SelectItem>
            <SelectItem value="concede">Nu-proprietário</SelectItem>
          </SelectContent>
        </Select>
      </Txt>
      {/* QUOTAS não muda: o usufruto reparte o VOTO delas, não elas. Vem da
          participação final da aba de doação. */}
      <Num dica="Participação final, da aba de doação. O usufruto não a altera.">
        <Q>{l.quotas}</Q>
      </Num>
      <Num className="text-muted-foreground">{pctDeDecimal(l.pctParticipacao)}</Num>
      <Num dica="Quotas que ela tem E vota.">{quotasDeBigint(l.plena)}</Num>
      <Num
        dica={l.nua === 0n
          ? 'Quotas que ela tem e não vota, porque concedeu o usufruto.'
          : `Concedido: ${quotasDeBigint(l.nuaDeReserva)} pela reserva da doação `
            + `(automático) e ${quotasDeBigint(l.nuaDeInstituicao)} por `
            + 'instituição declarada.'}
      >
        {quotasDeBigint(l.nua)}
      </Num>
      {/* CONCEDER é o campo do nu-proprietário. A reserva não se digita aqui — ela já
          veio da doação. Editar uma concessão REACOMODA as outras, mantendo o total:
          o total é o alvo de voz e voto, e quem o muda é a coluna do usufrutuário. */}
      <NumCampo>
        {!usufrui && podeConceder ? (
          <DicaDoControle
            dica={`${l.nome} tem ${quotasDeBigint(l.plena + l.nuaDeInstituicao)} `
              + 'quotas em propriedade plena. Conceder o usufruto delas passa o voto '
              + 'aos usufrutuários, e é ato tributado: guia e imposto próprios.'}
          >
            <Input
              aria-label={`Quotas que ${l.nome} concede em usufruto`}
              inputMode="numeric"
              placeholder="0"
              className={`${fieldCls} ml-auto h-8 w-28 text-right font-mono tabular-nums`}
              value={calc.institucaoDigitada(l.pessoaId)}
              onChange={(e) => calc.setInstituicao(l.pessoaId, e.target.value)}
            />
          </DicaDoControle>
        ) : (
          // Mesma caixa de 28, para o valor não trocar de régua quando a linha vira
          // concedente e a célula passa a ter campo.
          <ComoCampo largura="w-28" className="text-muted-foreground/70">
            {l.nuaDeInstituicao > 0n ? quotasDeBigint(l.nuaDeInstituicao) : TRACO}
          </ComoCampo>
        )}
      </NumCampo>
      <Num dica="Quotas de outros que ela usufrui, e com as quais vota.">
        {quotasDeBigint(l.usufruto)}
      </Num>
      {/* O % ALVO é o campo do usufrutuário: lê-se o percentual atual e digita-se o
          desejado, e a calculadora reparte a concessão entre os nu-proprietários. */}
      {/* O SINAL DE % é da COLUNA: fica na casca, uma vez, na mesma posição no campo e
          na leitura. Era parte do texto na linha em leitura ("50,0000%") e sinal solto
          no campo, então os dígitos das duas paravam em lugares diferentes — e trocar o
          papel de alguém fazia o número saltar de uma régua para a outra. */}
      <NumCampo>
        <ComSinalDePorcento>
          {usufrui ? (
            <DicaDoControle
              dica={'Percentual do capital que esta pessoa vota. Digite o desejado e a '
                + 'calculadora reparte a concessão entre os nu-proprietários. Cada um '
                + 'emite a sua guia, com a própria isenção de 500 UPF.'}
            >
              <Input
                aria-label={`Voz e voto de ${l.nome}, em %`}
                inputMode="decimal"
                className={`${fieldCls} h-8 w-full pr-6 text-right font-mono font-semibold tabular-nums`}
                value={calc.vozEVotoDigitado(l.pessoaId, l.pctVozEVoto)}
                onChange={(e) => calc.setVozEVoto(l.pessoaId, e.target.value)}
                onBlur={() => calc.confirmarVozEVoto(l.pessoaId)}
              />
            </DicaDoControle>
          ) : (
            <ComoCampo recuo="pr-6" className="font-semibold">
              {pctSemSinal(l.pctVozEVoto)}
            </ComoCampo>
          )}
        </ComSinalDePorcento>
      </NumCampo>
    </tr>
  );
}

