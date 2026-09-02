import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/equipe/osg/OsgDialog';
import { AbaDoUsufruto } from './AbaDoUsufruto';
import { AdicionarPessoa } from './AdicionarPessoa';
import {
  abaCls, Aviso, barraDoAtoCls, cabecalhoDaTabelaCls, ComDica, ComoCampo, ComoDicas,
  ComSinalDePorcento, Ctrl, DICA_DA_CONTA, DICA_NOME_CURTO, DicaDoControle,
  linhaCls, linhaDeTotalCls, molduraDaTabelaCls, Num, NumCampo, Q, Th, Txt,
} from './itcmdKit';
import { AvisoDeParcelaDiferida, CampoDaBase } from './SelecaoDaBase';
import { Campo, fieldCls, switchBoxCls } from '@/components/equipe/osg/formKit';
import {
  brlDeDecimal, pctDeDecimal, pctSemSinal, quotasDeBigint, TRACO,
} from './itcmdFmt';
import { rotuloDaSimulacao } from '@/hooks/useSimulacoesItcmd';
import type { CalculadoraItcmd } from '@/hooks/useCalculadoraItcmdController';
import type { LinhaDoQuadro } from '@/lib/osg/quadroSimulacaoItcmd';

/**
 * Onde o analista monta a simulação.
 *
 * É UMA tabela com todos os sócios e todos os herdeiros, nesta ordem:
 * Sócio · Papel · Quotas · % · Legítima · Doação anterior · Disponível · Recebido ·
 * Participação final · %.
 *
 * O que mudou e por quê: antes isto eram quatro blocos (quem doa, quem recebe,
 * doações anteriores, parte disponível) e cada um repetia a lista de nomes. A OSG já
 * lê e preenche a apuração neste formato — não havia o que inventar. O PAPEL é a
 * única coluna que o formato original não tem, porque ali ele é implícito; em tela
 * precisa de um botão, e é só isso que se acrescenta.
 *
 * A UPF fica no FIM: ela não muda quem recebe o quê, só converte a base em imposto.
 */
export function NovaSimulacaoModal({ calc }: { calc: CalculadoraItcmd }) {
  /**
   * A ABA ATIVA é estado do modal porque o RODAPÉ depende dela: na doação o botão
   * é "Continuar", na de usufruto é "Gerar simulação". Gerar na primeira aba
   * convidava a fechar o ato sem olhar quem fica com o voto.
   */
  const [aba, setAba] = useState<'doacao' | 'usufruto'>('doacao');
  const [ano, mes] = calc.competencia.split('-');
  const valorDoPicker = /^\d{4}$/.test(ano ?? '') && /^\d{2}$/.test(mes ?? '')
    ? { year: Number(ano), month: Number(mes) - 1 }
    : null;

  return (
    <Dialog open={calc.painelAberto} onOpenChange={(a) => !a && calc.fecharPainel()}>
      {/* LARGO o bastante para a tabela inteira caber: são dez colunas, seis delas
          campos, e cortar as duas últimas escondia justamente a conferência. */}
      <DialogContent className="flex max-h-[90vh] w-[95vw] max-w-[95vw] flex-col gap-0 overflow-visible p-0 sm:[clip-path:none] 2xl:max-w-[88rem]">
        <ComoDicas>
        <div className="shrink-0 rounded-t-lg bg-background px-6 pt-5">
          <DialogHeader className="mb-3 space-y-0 text-left">
            <DialogTitle className="text-base font-semibold">Nova simulação de ITCD</DialogTitle>
          </DialogHeader>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 pb-5">
          {/* OS PARÂMETROS DO CASO, uma linha só, TODOS no mesmo molde: rótulo
              acima e controle abaixo, alinhados pela base (`items-end`).

              A sociedade ganhou rótulo por isso. Ela era texto solto à esquerda,
              enquanto Estado, UPF e Mês eram campos rotulados à direita — dois
              tratamentos na mesma linha, e o nome da sociedade flutuando na altura
              errada porque não tinha uma linha de rótulo em cima. */}
          {calc.empresas.length === 0 ? (
            <Aviso>
              Nenhuma sociedade deste cliente tem sócio pessoa física. Doação de quotas
              com legítima só existe onde há PF no quadro societário.
            </Aviso>
          ) : (
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
                <Campo
                  rotulo={(
                    <ComDica dica="A sociedade cujas quotas vão ser doadas. O quadro societário dela é o ponto de partida do ato.">
                      Sociedade
                    </ComDica>
                  )}
                >
                  {calc.empresas.length === 1 ? (
                    <p className="flex h-9 items-center text-sm font-semibold">
                      {calc.empresa?.denominacao}
                    </p>
                  ) : (
                    <Select
                      value={calc.empresa?.id ?? ''}
                      onValueChange={calc.setEmpresaEscolhida}
                    >
                      <SelectTrigger className={`${fieldCls} h-9 w-auto min-w-[18rem]`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {calc.empresas.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.denominacao}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </Campo>

                {/* PARTE DE: a doação encadeada. A OSG apresenta o fluxo completo —
                    a doação entre os herdeiros, depois a do fundador para eles, e o
                    total —, e o segundo ato não parte do quadro societário de hoje:
                    parte de onde o primeiro parou. */}
                {calc.origensPossiveis.length > 0 && (
                  <Campo rotulo="Parte de">
                    <Select
                      value={calc.origemDoAto === '' ? 'cadastro' : calc.origemDoAto}
                      onValueChange={(v) => calc.setOrigemDoAto(v === 'cadastro' ? '' : v)}
                    >
                      <DicaDoControle
                        dica={'Encadear: o quadro e o acervo vêm da simulação escolhida, '
                          + 'e não do cadastro. É como se apresenta a doação entre '
                          + 'herdeiros seguida da doação do fundador.'}
                      >
                        <SelectTrigger
                          className={`${fieldCls} h-9 w-56`}
                          aria-label="De qual simulação este ato parte"
                        >
                          <SelectValue />
                        </SelectTrigger>
                      </DicaDoControle>
                      <SelectContent>
                        <SelectItem value="cadastro">Quadro societário</SelectItem>
                        {calc.origensPossiveis.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {`${o.rotulo} · ${o.competencia}`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Campo>
                )}

                {calc.totalDeQuotas > 0n && (
                  <Campo
                    rotulo={(
                      <ComDica dica="O capital total da sociedade, em quotas. É o denominador de todos os percentuais da tabela.">
                        Quotas
                      </ComDica>
                    )}
                  >
                    <p className="flex h-9 items-center font-mono text-sm tabular-nums text-foreground">
                      <Q>{calc.totalDeQuotas}</Q>
                    </p>
                  </Campo>
                )}

                {/* ESTADO antes da UPF porque é ele que decide a lei: faixa, dedução e a
                    própria existência da UPF são mato-grossenses. Um item na lista é
                    honesto — só o ITCD de MT tem motor aqui. */}
                <Campo
                  className="ml-auto w-24"
                  rotulo={(
                    <ComDica dica="O estado decide a lei: faixa, dedução e a própria UPF são de Mato Grosso. Um item na lista é honesto, só o ITCD de MT tem motor aqui.">
                      Estado
                    </ComDica>
                  )}
                >
                  <Select value={calc.estado} onValueChange={calc.setEstado}>
                    <SelectTrigger className={`${fieldCls} h-9 w-full`} aria-label="Estado">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {calc.estadosComItcd.map((uf) => (
                        <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Campo>
                <Campo
                  htmlFor="itcd-upf"
                  className="w-28"
                  rotulo={(
                    <ComDica dica="A UPF do mês de referência, publicada pela SEFAZ/MT. É ela que converte a isenção de 500 UPF e a dedução da faixa em reais, e o sistema não consulta: o valor é declarado aqui.">
                      UPF (R$)
                    </ComDica>
                  )}
                >
                  <Input
                    id="itcd-upf"
                    inputMode="decimal"
                    placeholder="263,78"
                    className={`${fieldCls} h-9 w-full text-right font-mono tabular-nums`}
                    value={calc.upf}
                    onChange={(e) => calc.setUpf(e.target.value)}
                  />
                </Campo>
                <Campo
                  className="w-40"
                  rotulo={(
                    <ComDica dica="A competência do ato, que é o que decide qual UPF vale. Trocar o mês troca a UPF sugerida.">
                      Mês de referência
                    </ComDica>
                  )}
                >
                  <MonthYearPicker
                    value={valorDoPicker}
                    className={`${fieldCls} h-9 w-full pl-3`}
                    onChange={(v) => {
                      if (!v) return;
                      calc.setCompetencia(`${v.year}-${String(v.month + 1).padStart(2, '0')}`);
                    }}
                  />
                </Campo>
              </div>

              {/* PRECISA DIZER, senão o analista vê quotas que não batem com o Quadro
                  Societário e acha que é bug. */}
              {calc.origemEscolhida && (
                <p className="text-xs text-osg-700">
                  {`Parte de ${rotuloDaSimulacao(calc.origemEscolhida)}: o quadro e o `}
                  acervo vêm daquela simulação, não do cadastro.
                </p>
              )}

              {/* ORIGEM SUBSTITUÍDA: avisa, não trava. Partir de um ato que deixou de
                  valer pode ser deliberado — a cadeia é histórica, e refazer o cenário
                  antigo é caso de uso. O que não pode é acontecer calado. */}
              {calc.origemEscolhida?.status === 'substituida' && (
                <Aviso>
                  {`${rotuloDaSimulacao(calc.origemEscolhida)} está marcada como `}
                  <strong className="font-semibold">substituída</strong>
                  {': o quadro de partida vem de um ato que deixou de valer.'}
                </Aviso>
              )}

              {/* A DICA DA UPF, alinhada à direita sob o campo dela. Fora do flex dos
                  campos: dentro, ela era um item de largura cheia e empurrava a linha. */}
              <p className="text-right text-xs text-muted-foreground">
                {calc.upf.trim() !== '' && !calc.upfValida
                  ? 'Informe a UPF em reais, com até duas casas.'
                  : calc.upfVeioDaSerie
                    ? 'UPF conhecida deste mês. Confira no DOE.'
                    : 'Informe a UPF publicada pela SEFAZ/MT. O sistema não consulta.'}
              </p>
            </div>
          )}

          {/* DUAS ABAS, porque são duas perguntas: a DOAÇÃO responde quem fica com as
              quotas e o USUFRUTO responde quem fica com o VOTO. Réguas diferentes — no
              caso de referência o fundador termina com 0% de participação e 51% de voto.

              O usufruto é desta SIMULAÇÃO, não do cliente: no mesmo Agro Aliança, um
              cenário instituiu 426.052 quotas de uma instituinte, outro dividiu em duas
              e o terceiro não instituiu nada. */}
          <Tabs
            value={aba}
            onValueChange={(v) => setAba(v === 'usufruto' ? 'usufruto' : 'doacao')}
            className="space-y-4"
          >
            {/* O QUANTO DE VOTO JÁ ESTÁ RESERVADO fica FORA da TabsList, ancorado à
                direita da mesma linha.

                Era um selo dentro do gatilho "Usufruto", e aparecia no instante em que
                se digitava o percentual — fazendo a aba crescer e a lista de abas
                inteira mudar de largura embaixo do ponteiro. Aqui a TabsList não muda
                de tamanho nunca, a linha já tem a altura dos 36px do gatilho, e o
                número pode vir por extenso, com o rótulo que diz o que ele é. */}
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
              <TabsList>
                <TabsTrigger value="doacao">Doação</TabsTrigger>
                <TabsTrigger value="usufruto">Usufruto</TabsTrigger>
              </TabsList>

              {calc.percentualDoUsufrutuario != null && (
                <ComDica
                  dica={'Quanto do capital o usufrutuário vota. A tabela da aba de '
                    + 'Usufruto mostra as quatro casas e de quem sai cada quota.'}
                >
                  <span className="text-xs text-muted-foreground">
                    {'Voz e voto reservado: '}
                    <strong className="font-mono font-semibold tabular-nums text-osg-700">
                      {pctCurto(calc.percentualDoUsufrutuario)}
                    </strong>
                  </span>
                </ComDica>
              )}
            </div>

            <TabsContent value="usufruto" className={`${abaCls} space-y-4`}>
              <AbaDoUsufruto calc={calc} />
            </TabsContent>

            <TabsContent value="doacao" className={`${abaCls} space-y-4`}>
            {/* UM CAMPO PARA TODO MUNDO. Eram dois — doador e donatário — e mais um
                bloco de forma do ato acima da tabela; tudo isso agora é coluna. Nada
                entra sozinho: os casos não têm molde (irmã para irmã, avô para netos),
                e adivinhar enchia a tabela de gente fora do ato. */}
            <div className={barraDoAtoCls}>
              {/* O BOTÃO PRIMEIRO, na esquerda máxima: sem gente no ato não existe simulação,
                  então ele é o começo da leitura. A modalidade vem ao lado, porque a
                  pergunta seguinte é se o ato tem reserva de usufruto. */}
              <AdicionarPessoa
                rotulo="Adicionar participantes"
                vazio="Todas as pessoas físicas do cliente já estão no ato."
                opcoes={calc.candidatosAParticipante.map((c) => ({
                  pessoaId: c.pessoaId,
                  // As quotas ao lado do nome: é o que diz se a pessoa pode doar, e
                  // decide o papel com que ela entra.
                  texto: c.quotas > 0n
                    ? `${c.denominacao} · ${quotasDeBigint(c.quotas)} quotas`
                    : c.denominacao,
                }))}
                onEscolher={calc.adicionarParticipante}
              />

              <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                {/* COM RESERVA é modalidade da DOAÇÃO, e por isso mora aqui: o doador
                    transmite a nua propriedade e guarda uso, gozo e voto. Não muda o
                    quadro desta aba — muda a NATUREZA e a BASE desta guia.
                    A base vem logo ao lado porque é a MESMA decisão, sobre a MESMA
                    guia. Ela morava na aba de usufruto, junto da base da instituição:
                    os dois campos ficaram agrupados pelo assunto ("os 70%") em vez de
                    pelo ato, e cada base é parâmetro de uma guia diferente. */}
                {/* A CAIXA do kit (`switchBoxCls`) põe o checkbox na altura exata
                    dos campos ao lado — h-9, mesma borda, mesmo fundo. Solto, ele
                    flutuava no meio da linha. */}
                <label className={`${switchBoxCls} cursor-pointer text-sm`}>
                  <Checkbox
                    checked={calc.comReserva}
                    onCheckedChange={(v) => calc.setComReserva(v === true)}
                    aria-label="Doação com reserva de usufruto"
                  />
                  <ComDica
                    dica={'A guia sai como DOAÇÃO COM RESERVA DE USUFRUTO. As quotas '
                      + 'doadas continuam as mesmas: o que muda é que o voto fica com '
                      + 'quem doa, e a base do imposto pode ser reduzida. Sem reserva, '
                      + 'quem recebe passa a votar.'}
                  >
                    <span className="text-foreground">Com reserva de usufruto</span>
                  </ComDica>
                </label>

                <CampoDaBase
                  rotulo="Base da doação"
                  valor={calc.pctBaseDaDoacao}
                  aoTrocar={calc.setPctBaseDaDoacao}
                  ativo={calc.comReserva}
                  // A guia da doação existe de todo jeito, e sem reserva a base dela é
                  // integral: 100% é o que vai ser apurado, não um valor de espera.
                  semAto="100%"
                  porQueTravado={'Sem reserva, a doação é tributada integralmente: a '
                    + 'redução a 70% do art. 11, §2º I é do usufruto, e aqui não há '
                    + 'usufruto. Marque "com reserva de usufruto" para escolher.'}
                />

                <ContadorDeGias n={calc.numeroDeGias} />
              </div>

            </div>

            {/* A consequência da base reduzida merece linha própria: ela cria uma
                parcela devida ANOS depois, e ninguém lembra de um `title`. */}
            {calc.comReserva && calc.pctBaseDaDoacao === '70' && (
              <AvisoDeParcelaDiferida onde="reserva" />
            )}

            {calc.linhasDoQuadro.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhuma pessoa no ato ainda. Adicione quem doa e quem recebe em
                <strong className="font-semibold"> Adicionar participantes</strong>, na
                barra acima.
              </p>
            ) : (
              <div className={molduraDaTabelaCls}>
                <table className="w-full text-sm">
                  <thead className={cabecalhoDaTabelaCls}>
                    <tr>
                      {/* A LIXEIRA na frente do nome, e não um × no fim da linha: tirar
                          alguém do ato é sobre a PESSOA, e ao lado do nome dela é onde
                          se procura. No fim, depois de seis campos, ficava longe do que
                          identifica a linha. */}
                      <Th className="w-8" />
                      <Th alinhar="esquerda" dica={DICA_NOME_CURTO}>
                        Pessoa
                      </Th>
                      <Th alinhar="esquerda" dica="Quem transmite e quem recebe neste ato.">
                        Papel
                      </Th>
                      <Th
                        alinhar="esquerda"
                        dica={'Em quantas guias este doador emite, e no nome de quem. '
                          + 'Cônjuge que doa em conjunto é doador fiscal próprio, pela '
                          + 'meação, e cada guia tem a sua isenção de 500 UPF.'}
                      >
                        Emissão GIA
                      </Th>
                      {/* O APORTE vem ANTES de Quotas porque e ele que as forma: R$ X
                          integralizados viram quotas novas ao preco da quota. */}
                      <Th dica="Dinheiro integralizado no capital. Vira quotas novas ao preço da quota e entra nos três cenários pelo valor de face. Não recolhe ITCD: a pessoa não recebeu de ninguém, ela pagou.">
                        Aporte (R$)
                      </Th>
                      <Th dica="O que a pessoa tem hoje, do quadro societário, mais as quotas que o aporte comprou.">
                        Quotas
                      </Th>
                      <Th dica="Percentual do capital que a pessoa tem ANTES do ato.">
                        Part. atual
                      </Th>
                      <Th dica="Quotas recebidas da parte LEGÍTIMA, a metade que a lei reserva aos herdeiros necessários. Campo livre: quem declara é o analista, e o número se confirma na guia.">
                        Legítima
                      </Th>
                      <Th dica="Quotas recebidas da parte DISPONÍVEL, a metade de que o doador dispõe livremente. Legítima e disponível compõem UMA base no ITCD: mover valor entre as duas não muda o imposto.">
                        Disponível
                      </Th>
                      <Th dica={`Com quantas quotas a pessoa termina o ato. Editável: digitar aqui resolve o resto para trás. ${DICA_DA_CONTA}`}>
                        Quotas final
                      </Th>
                      <Th dica={`Percentual do capital DEPOIS do ato. Quem fica com o voto se decide na aba de Usufruto. ${DICA_DA_CONTA}`}>
                        Part. final
                      </Th>
                    </tr>
                  </thead>
                  <tbody>
                    {calc.linhasDoQuadro.map((l) => (
                      <LinhaDaTabela key={l.pessoaId} linha={l} calc={calc} />
                    ))}
                    <tr className={linhaDeTotalCls}>
                      <Num />
                      <Txt className="font-sans">TOTAL</Txt>
                      <Num />
                      <Num />
                      <Num>
                        {calc.aporteTotal > 0n
                          ? brlDeDecimal(calc.aporteTotalEmTexto)
                          : TRACO}
                      </Num>
                      <Num><Q>{calc.totaisDoQuadro.quotasAtuais}</Q></Num>
                      <Num>{pctDeDecimal(calc.totaisDoQuadro.pctAtual)}</Num>
                      <Num><Q>{calc.totaisDoQuadro.legitima}</Q></Num>
                      <Num><Q>{calc.totaisDoQuadro.disponivel}</Q></Num>
                      {/* A CONFERÊNCIA: estas duas células repetem as duas primeiras.
                          Nada se cria nem se perde num ato de doação — o capital só
                          muda de mão, e o que não foi destinado fica com quem doa.
                          Elas leem 100% quando todo o capital está na tabela; com sócio
                          de fora, leem a fatia que este ato movimenta. */}
                      <Num><Q>{calc.totaisDoQuadro.participacaoFinal}</Q></Num>
                      {/* A casca da coluna, como nas linhas: com o sinal de % fixo, o
                          dígito da conferência tem de parar onde param os de cima. */}
                      <NumCampo>
                        <ComSinalDePorcento largura="w-28">
                          <ComoCampo recuo="pr-6">
                            {pctSemSinal(calc.totaisDoQuadro.pctFinal)}
                          </ComoCampo>
                        </ComSinalDePorcento>
                      </NumCampo>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

          {/* SOBRA: o que os doadores têm e não foi destinado. LEITURA, não aviso — é
              assim que se doa parcial, e a coluna de quotas final já mostra com quem
              cada pedaço ficou. */}
          {calc.totaisDoQuadro.sobra > 0n && (
            <p className="text-xs text-muted-foreground">
              {'Os doadores mantêm '}
              <Q>{calc.totaisDoQuadro.sobra}</Q>
              {' quotas: é o que não foi destinado na legítima nem na disponível. Para '}
              {'doar mais, aumente o que os donatários recebem.'}
            </p>
          )}


          {calc.problemasDoQuadro.map((p) => (
            <Aviso key={p.codigo}>{p.mensagem}</Aviso>
          ))}

          {/* Erro de DERIVAÇÃO das guias. Vivia no bloco da forma do ato; sem o bloco,
              vem para cá — caso contrário a simulação não geraria e ninguém diria por
              quê. */}
          {calc.erroDaForma && <Aviso tom="erro">{calc.erroDaForma}</Aviso>}

          {calc.erro && <Aviso tom="erro">{calc.erro}</Aviso>}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="shrink-0 rounded-b-lg border-t border-border bg-background px-6 py-3.5">
          <Button variant="outline" onClick={calc.fecharPainel}>Cancelar</Button>
          {aba === 'doacao' ? (
            <Button
              onClick={() => setAba('usufruto')}
              className="bg-osg-moss text-white hover:bg-osg-moss/90"
            >
              Continuar
            </Button>
          ) : (
            <Button
              onClick={calc.gerar}
              disabled={!calc.podeGerar}
              className="bg-osg-moss text-white hover:bg-osg-moss/90"
            >
              Gerar simulação
            </Button>
          )}
        </DialogFooter>
        </ComoDicas>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Campo de adicionar pessoa ao ato: uma lista suspensa que, ao escolher, adiciona e
 * volta ao placeholder — para adicionar vários em sequência sem reabrir nada.
 *
 * Some quando não há mais ninguém a adicionar, em vez de ficar como controle morto.
 */

/**
 * A célula de EMISSÃO GIA de um doador: em quantas guias ele emite, e no nome de quem.
 *
 * O NÚMERO DE GUIAS É DERIVADO, não escrito no rótulo. Ele sai da mesma função que
 * alimenta o contador "N GIA a emitir" logo acima — `derivarDoadoresFiscais` —, e é por
 * isso que os dois não podem discordar. Um texto fixo "(duas guias)" ao lado de um
 * contador que calcula "1 GIA a emitir" é uma tela se contradizendo, e a contradição
 * não apareceria em teste: os dois textos não se falam.
 *
 * E ele NÃO é constante: "Individual" vale uma guia para quem não tem cônjuge e duas
 * para quem tem, porque aí a meação faz do cônjuge um doador fiscal próprio.
 *
 * Sem cônjuge no cadastro isto é TEXTO e não campo. Era um select desabilitado — que
 * ocupa o espaço de uma escolha para dizer que não há escolha, e convida ao clique que
 * não faz nada. O `title` diz o motivo nos dois casos.
 */
function EmissaoDaGia({ linha, calc }: { linha: LinhaDoQuadro; calc: CalculadoraItcmd }) {
  const e = calc.emissaoDaGia(linha.pessoaId);

  if (!e.podeConjunto) {
    return (
      <ComDica dica={e.motivo}>
        <span className="text-muted-foreground">
          {`Individual${sufixo(calc.giasSeEmitir(linha.pessoaId, false) ?? 1)}`}
        </span>
      </ComDica>
    );
  }

  return (
    <Select
      value={e.conjunto ? 'conjunto' : 'individual'}
      onValueChange={(v) => calc.definirEmissao(linha.pessoaId, v === 'conjunto')}
    >
      <DicaDoControle dica={e.motivo}>
        <SelectTrigger
          aria-label={`Emissão da GIA de ${linha.nome}`}
          className={`${fieldCls} h-8 w-56`}
        >
          <SelectValue />
        </SelectTrigger>
      </DicaDoControle>
      <SelectContent>
        <SelectItem value="conjunto">
          {`Em conjunto · ${e.conjugeNome}`}
          {sufixo(calc.giasSeEmitir(linha.pessoaId, true))}
        </SelectItem>
        <SelectItem value="individual">
          {`Individual${sufixo(calc.giasSeEmitir(linha.pessoaId, false))}`}
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

/**
 * " (uma guia)" · " (duas guias)" · " (3 guias)". Vazio quando a contagem não fecha:
 * a tela não promete número sobre um ato que dá erro de forma.
 *
 * Uma e duas em palavra porque é como se fala — "sai em duas guias" —, e daí para cima
 * em algarismo, que é onde a palavra começa a atrapalhar a leitura.
 */
function sufixo(gias: number | null): string {
  if (gias == null || gias <= 0) return '';
  if (gias === 1) return ' (uma guia)';
  if (gias === 2) return ' (duas guias)';
  return ` (${gias} guias)`;
}

/** Percentual sem zeros a direita: `51.0000` vira `51%`, `24.5000` vira `24,5%`. */
function pctCurto(decimal: string): string {
  const [inteiro, fracao = ''] = decimal.split('.');
  const enxuta = fracao.replace(/0+$/, '');
  return enxuta === '' ? `${inteiro}%` : `${inteiro},${enxuta}%`;
}

function LinhaDaTabela({ linha, calc }: {
  linha: LinhaDoQuadro;
  calc: CalculadoraItcmd;
}) {
  const recebe = linha.papel === 'recebe';
  const editavel = calc.finalEditavel(linha.pessoaId);

  return (
    <tr className={linhaCls}>
      <Ctrl>
        <DicaDoControle dica={`${linha.nome} sai do ato e da tabela.`}>
          <button
            type="button"
            aria-label={`Tirar ${linha.nome} do ato`}
            onClick={() => calc.removerParticipante(linha.pessoaId)}
            className="rounded p-1 text-muted-foreground/70 transition-colors hover:bg-muted hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </DicaDoControle>
      </Ctrl>
      <Txt className="font-sans">{linha.nome}</Txt>
      <Txt>
        <Select
          value={linha.papel}
          onValueChange={(v) => calc.definirPapel(linha.pessoaId, v === 'doa' ? 'doa' : 'recebe')}
        >
          <DicaDoControle
            dica={'O papel vem das quotas: quem tem entra doador, quem não tem entra '
              + 'donatário. É palpite, e trocar aqui muda quem transmite e quem recebe '
              + 'neste ato.'}
          >
            <SelectTrigger
              aria-label={`Papel de ${linha.nome}`}
              className={`${fieldCls} h-8 w-28`}
            >
              <SelectValue />
            </SelectTrigger>
          </DicaDoControle>
          <SelectContent>
            <SelectItem value="doa">Doador</SelectItem>
            <SelectItem value="recebe">Donatário</SelectItem>
          </SelectContent>
        </Select>
      </Txt>
      {/* EMISSÃO GIA: em quantas guias este doador emite, e no nome de quem. Vivia num
          bloco acima da tabela, que repetia os nomes e as quotas só para pendurar este
          campo. Donatário não emite guia — daí o traço. */}
      <Txt>
        {recebe ? TRACO : <EmissaoDaGia linha={linha} calc={calc} />}
      </Txt>
      {/* APORTE EM MOEDA CORRENTE — o cenário que dispensa a reserva de usufruto: em
          vez de doar tudo e guardar o voto, quem quer participação integraliza dinheiro
          e chega ao percentual por PROPRIEDADE.

          QUALQUER UM APORTA, doador ou donatário, e por isso é coluna e não campo da
          barra. Não é fato gerador de ITCD: ninguém transmite nada, a pessoa entrega
          dinheiro e recebe quotas. Vive só no motor desta simulação — o campo de moeda
          corrente do capital social é outra frente. */}
      <NumCampo>
        <DicaDoControle
          dica={'Dinheiro integralizado no capital. Vira quotas novas ao preço da '
            + 'quota do acervo e entra nos três cenários pelo valor de face, sem '
            + 'multiplicar. Não recolhe ITCD: a pessoa pagou por essas quotas.'}
        >
          <Input
            aria-label={`Aporte em moeda de ${linha.nome}, em reais`}
            inputMode="decimal"
            placeholder="0,00"
            className={`${fieldCls} ml-auto h-8 w-32 text-right font-mono tabular-nums`}
            value={calc.aporteDigitado(linha.pessoaId)}
            onChange={(e) => calc.setAporte(linha.pessoaId, e.target.value)}
            onBlur={() => calc.confirmarAporte(linha.pessoaId)}
          />
        </DicaDoControle>
      </NumCampo>
      {/* QUOTAS: o que a pessoa tem, do quadro societário MAIS o que o aporte comprou.
          NÃO SE DIGITA — no doador é também o teto do ato, e quem quer doar menos não
          precisa de um campo para isso: basta não destinar toda a legítima e toda a
          disponível. */}
      <Num
        dica={calc.quotasDoAporteDe(linha.pessoaId) > 0n
          ? `Inclui ${quotasDeBigint(calc.quotasDoAporteDe(linha.pessoaId))} quotas `
            + 'compradas pelo aporte em moeda.'
          : undefined}
      >
        <Q>{linha.quotasAtuais}</Q>
      </Num>
      <Num className="text-muted-foreground">{pctDeDecimal(linha.pctAtual)}</Num>
      {/* LEGÍTIMA: campo LIVRE, e para QUALQUER donatário. A OSG nunca sabe o número
          de antemão — ele depende do quanto se quer doar e do que a SEFAZ aponta na
          guia —, e os casos não têm molde: irmã para irmã, avô para netos. */}
      <NumCampo>
        {recebe ? (
          <DicaDoControle
            dica={'Quantas quotas esta pessoa recebe da parte LEGÍTIMA. Livre: quem '
              + 'declara é o analista, e o número só se confirma na guia. Legítima e '
              + 'disponível compõem uma base única no ITCD, então mover valor entre '
              + 'elas não muda o imposto.'}
          >
            <Input
              aria-label={`Legítima de ${linha.nome}`}
              inputMode="numeric"
              placeholder="0"
              className={`${fieldCls} ml-auto h-8 w-24 text-right font-mono tabular-nums`}
              value={calc.legitimaDigitada(linha.pessoaId)}
              onChange={(e) => calc.setLegitima(linha.pessoaId, e.target.value)}
              onBlur={() => calc.confirmarLegitima(linha.pessoaId)}
            />
          </DicaDoControle>
        ) : (
          // Mesma caixa de 24 do campo: em texto puro o traco parava 12px a direita
          // dos digitos das linhas com campo.
          <ComoCampo largura="w-24" className="text-muted-foreground/70">{TRACO}</ComoCampo>
        )}
      </NumCampo>
      {/* DISPONÍVEL: CAMPO LIVRE. É a alavanca do analista e o que o instrumento
          declara ("40.403 quotas doadas da parte disponível"). Mexe só nesta pessoa —
          destinar menos do que os doadores têm é justamente como se doa parcial. */}
      <NumCampo>
        {recebe ? (
          <DicaDoControle
            dica={'Quantas quotas esta pessoa recebe da parte DISPONÍVEL. Livre, e sem '
              + `piso: os doadores têm ${quotasDeBigint(calc.quotasDosDoadores)} quotas `
              + 'e o que não for destinado permanece com eles.'}
          >
            <Input
              aria-label={`Disponível para ${linha.nome}`}
              inputMode="numeric"
              placeholder="0"
              className={`${fieldCls} ml-auto h-8 w-24 text-right font-mono tabular-nums`}
              value={calc.disponivelDigitada(linha.pessoaId)}
              onChange={(e) => calc.setDisponivel(linha.pessoaId, e.target.value)}
            />
          </DicaDoControle>
        ) : (
          <ComoCampo largura="w-24" className="text-muted-foreground/70">{TRACO}</ComoCampo>
        )}
      </NumCampo>
      {/* QUOTAS FINAL e PART. FINAL: as duas portas do IGUALAR, editáveis em TODA
          linha. "Quero que ela termine com isto" é mais direto que somar legítima e
          disponível na mão.

          NO DONATÁRIO resolve a disponível dele, sem mexer nos outros.
          NO DOADOR o caminho é inverso, e tem de ser: o que ele fica é consequência do
          que os donatários levam, então digitar aqui AJUSTA OS DONATÁRIOS — na
          proporção da disponível que cada um já tinha, sem tocar na legítima. */}
      {/* O GATILHO DA DICA É O `span`, não o campo: campo desabilitado não dispara
          evento de ponteiro nenhum, e a dica destes dois é justamente o MOTIVO de
          estarem travados. Pendurada no `Input`, ela desapareceria na hora em que
          alguém a fosse procurar. */}
      <NumCampo>
        <DicaDoControle
          dica={editavel
            ? (recebe
              ? 'Com quantas quotas esta pessoa termina. Digitar aqui resolve a '
                + `disponível dela, sem mexer nos outros donatários. ${DICA_DA_CONTA}`
              : 'Com quantas quotas este doador termina. Digitar aqui ajusta a '
                + 'disponível dos donatários, na proporção do que cada um já tinha. A '
                + 'legítima fica como foi declarada.')
            : calc.motivoDoFinalTravado}
        >
          <span className="ml-auto block w-28">
            <Input
              aria-label={`Quotas final de ${linha.nome}`}
              inputMode="numeric"
              disabled={!editavel}
              className={`${fieldCls} h-8 w-full text-right font-mono tabular-nums`}
              value={calc.quotasFinalDigitada(linha.pessoaId, linha.participacaoFinal)}
              onChange={(e) => calc.setQuotasFinal(linha.pessoaId, e.target.value)}
              onBlur={() => calc.confirmarQuotasFinal(linha.pessoaId)}
            />
          </span>
        </DicaDoControle>
      </NumCampo>
      {/* O SINAL DE % dentro do campo, à direita: sem ele o número de quatro casas
          ficava indistinguível do campo de quotas ao lado. Fica FORA do valor — o que
          se digita continua só número e vírgula. */}
      <NumCampo>
        <DicaDoControle
          dica={editavel
            ? `Sobre o capital da sociedade, a mesma régua da Part. atual ao lado. ${DICA_DA_CONTA}`
            : calc.motivoDoFinalTravado}
        >
          <ComSinalDePorcento largura="w-28">
            <Input
              aria-label={`Participação final de ${linha.nome}, em %`}
              inputMode="decimal"
              disabled={!editavel}
              className={`${fieldCls} h-8 w-full pr-6 text-right font-mono tabular-nums`}
              value={calc.percentualDigitado(linha.pessoaId, linha.pctFinal)}
              onChange={(e) => calc.setPercentualFinal(linha.pessoaId, e.target.value)}
              onBlur={() => calc.confirmarPercentual(linha.pessoaId)}
            />
          </ComSinalDePorcento>
        </DicaDoControle>
      </NumCampo>
    </tr>
  );
}

/**
 * QUANTAS GUIAS O ATO GERA — resultado, e por isso em texto e não em campo.
 *
 * Fica sempre na tela, inclusive em zero. Ele aparecia só a partir de uma guia, e
 * então empurrava de lado os controles da modalidade no momento em que o primeiro
 * doador entrava no quadro. Em zero ele também informa: o ato ainda não está formado.
 */
function ContadorDeGias({ n }: { n: number }) {
  return (
    <div className="flex h-9 items-center">
      <ComDica
        dica={'Uma GIA por par doador × donatário, que é a unidade de apuração. '
          + 'Dividir a doação entre dois doadores muda o imposto: cada par tem a '
          + 'própria isenção de 500 UPF e a própria faixa de alíquota. Cônjuge que doa '
          + 'em conjunto conta como doador próprio, pela meação.'}
      >
        <span className="text-xs tabular-nums text-muted-foreground">
          {n === 0
            ? 'Nenhuma GIA ainda'
            : `${n} ${n === 1 ? 'GIA' : 'GIAs'} a emitir`}
        </span>
      </ComDica>
    </div>
  );
}


