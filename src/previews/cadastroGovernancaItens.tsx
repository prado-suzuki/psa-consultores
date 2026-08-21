/**
 * Os itens do cadastro de governança: um por documento, mais os dois de base.
 *
 * Ficam fora do preview porque o preview passou a ser só a LISTA e a moldura do
 * modal. Foi essa separação que tirou a tela do formato "formulário corrido":
 * cada item é uma linha da lista e o preenchimento acontece dentro do modal,
 * como nos cadastros de cliente, matrícula, bem e pessoa.
 *
 * A ORDEM da tela é a ETAPA DO FLUXO, declarada em `etapa`, e não a numeração das
 * pastas do Drive nem o destino do documento. Agrupar por destino, como estava
 * antes, punha o Protocolo depois da alteração contratual, que é justamente o
 * documento que ele alimenta. O destino segue visível como etiqueta no cartão, e
 * a pasta de origem continua declarada em cada item.
 *
 * O `numero` é a ordem dentro da etapa, e a tela ordena por ele: a ordem física
 * neste arquivo não acompanha.
 */
import { Fragment, useState } from 'react';

import {
  ALTERACOES_CONTRATUAIS,
  ASSUNTOS_MATRIZ,
  CAMPOS_AC_REFLEXO,
  CAMPOS_ACORDO,
  CAMPOS_INSTALACAO,
  CAMPOS_MATRIZ,
  CAMPOS_PROTOCOLO_GERAIS,
  CAMPOS_REGIMENTO,
  ELEITOS,
  FAMILIAS_PROTOCOLO,
  GLOSSARIO_PAPEIS,
  GLOSSARIO_RESPOSTAS,
  GRUPOS_BENEFICIARIO,
  ORGAOS,
  ORGAOS_COM_CLAUSULA,
  PAPEIS_NA_DECISAO,
  REGENCIA,
  RESPOSTAS_CRITERIO,
} from './cadastroGovernancaDados';
import {
  clausulasDaMatriz,
  clausulasDoAcordo,
  clausulasDoAcReflexo,
  clausulasDoRegimento,
} from './cadastroGovernancaClausulas';
import { DocumentoModelo } from './cadastroGovernancaDocumento';
import {
  Cabecalho,
  CampoLeitura,
  Campos,
  Escolha,
  Glossario,
  LadoALado,
  Nota,
  resumo,
  Rolagem,
  type ItemGovernanca,
} from './cadastroGovernancaUi';

const ORGAOS_ATIVOS = ORGAOS.filter((o) => o.existe);

const Orgaos = () => (
  <>
    <Nota>
      Quais instâncias de decisão existem neste cliente. É o que define as colunas da Matriz de
      Alçadas. <strong>A dúvida foi respondida pela consultoria: a lista NÃO é fixa.</strong> "Vai de
      como o cliente atua e atuará, alguns não possuem o órgão de Conselho de Administração, somente
      Diretoria." É por isso que existem dois modelos de contrato social, um com conselho e outro só
      com diretoria, e é a escolha aqui que decide qual deles o gerador usa.
    </Nota>
    <div className="flex flex-wrap gap-2 rounded-md border border-osg-100 bg-background p-4">
      {ORGAOS.map((o) => (
        <span
          key={o.nome}
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-[13px] ${
            o.existe
              ? 'border-osg-moss bg-osg-moss/10 font-semibold text-osg-moss'
              : 'border-osg-100 bg-osg-50/60 text-osg-500'
          }`}
        >
          <span
            className={`inline-block h-3 w-3 rounded border ${
              o.existe ? 'border-osg-moss bg-osg-moss' : 'border-osg-300'
            }`}
          />
          {o.nome}
        </span>
      ))}
    </div>
  </>
);

const Grupos = () => (
  <>
    <Nota>
      Quem recebe o quê, pelo papel de cada pessoa na empresa hoje. A consultoria confirmou que este conjunto alimenta SÓ o Protocolo: ele e a Matriz são listas independentes e não devem compartilhar o mesmo conjunto. Muda de cliente para cliente:
      três documentos entregues trazem três conjuntos diferentes de grupos, então o rótulo é escrito
      pelo consultor e não escolhido de uma lista. Cada grupo vira uma coluna do Protocolo.
    </Nota>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {GRUPOS_BENEFICIARIO.map((g, i) => (
        <div
          key={g.rotulo}
          className="flex flex-col gap-3.5 rounded-md border border-osg-100 bg-muted/70 p-4"
        >
          <CampoLeitura
            campo={{
              rotulo: `Grupo · ${i + 1}`,
              valor: g.rotulo,
              explicacao:
                'O nome que a família dá a esse conjunto de pessoas. Vira uma coluna do Protocolo.',
            }}
          />
          <CampoLeitura
            campo={{
              rotulo: 'Pessoas do grupo',
              valor: g.pessoas,
              explicacao:
                'Quem está nesse grupo. As pessoas já estão cadastradas; aqui só se diz quem entra onde.',
              origem: 'existe',
              tabela: 'pessoa',
            }}
          />
        </div>
      ))}
    </div>
  </>
);

const Matriz = () => {
  const [grade, setGrade] = useState<string[][]>(() => ASSUNTOS_MATRIZ.map((l) => [...l.papeis]));
  const [atoSemValor, setAtoSemValor] = useState('Sobe sempre ao órgão de escalada');
  const trocar = (linha: number, coluna: number, valor: string) =>
    setGrade((g) => g.map((l, i) => (i === linha ? l.map((p, j) => (j === coluna ? valor : p)) : l)));

  return (
    <LadoALado
      formulario={
        <>
    <Nota>
      O documento-eixo. Cada linha é um assunto, cada coluna é um órgão, e a célula diz o que aquele
      órgão faz naquele assunto. No contrato, cada linha vira uma <strong>alínea</strong> e a palavra
      da célula vira o <strong>verbo</strong> dela. Troque uma célula e veja a alínea mudar ao lado.
    </Nota>
    <Nota>
      Grade lida célula a célula do modelo: <strong>24 assuntos por 5 órgãos</strong>. O órgão{' '}
      <em>Gerente de Unidade</em> não existia aqui, e a coluna dele é vazia nos dez primeiros
      assuntos, o que é dado e não falta de dado.
    </Nota>
    <Nota>
      <strong>A alçada não é coluna do modelo.</strong> O único teto escrito está dentro da célula de
      Representação Legal, e lá passar do teto <strong>não sobe de órgão, muda a forma de assinar</strong>:
      "deverão assinar 02 (dois) representantes legais". Os outros quatro tetos vieram do contrato de
      um cliente e precisam ser confirmados.
    </Nota>
    <Glossario
      titulo="As catorze palavras da célula, e elas não são sinônimos"
      itens={GLOSSARIO_PAPEIS.map((p) => ({ termo: p.papel, significa: p.significa }))}
    />
    <Rolagem>
      <table className="w-full min-w-[1320px] border-collapse text-sm">
        <Cabecalho
          titulos={['Assunto', ...ORGAOS_ATIVOS.map((o) => o.nome), 'Alçada', 'Acima disso, autoriza']}
        />
        <tbody>
          {ASSUNTOS_MATRIZ.map((linha, iLinha) => (
            /* `data-campo` é o alvo do clique na marca amarela do documento. */
            <tr key={linha.assunto} data-campo={linha.assunto} className="scroll-mt-4">
              <th className="w-[320px] min-w-[320px] border-b border-osg-50 px-3 py-2 text-left align-top font-normal leading-snug text-osg-700">
                {linha.assunto}
              </th>
              {grade[iLinha].map((papel, i) => (
                <td key={i} className="border-b border-osg-50 px-3 py-2">
                  {/* Célula em branco na planilha é dado, não falta de dado: nos dez
                      primeiros assuntos a coluna do Gerente de Unidade está vazia. */}
                  {papel ? (
                    <Escolha
                      valor={papel}
                      opcoes={PAPEIS_NA_DECISAO}
                      rotulo="Papel na decisão"
                      onChange={(v) => trocar(iLinha, i, v)}
                    />
                  ) : (
                    <span className="text-osg-300">—</span>
                  )}
                </td>
              ))}
              {/* Duas colunas, e nao uma: o teto e o orgao de escalada sao dados
                  distintos, e como texto de rodape na mesma celula o segundo lia
                  como observacao do primeiro. */}
              <td className="whitespace-nowrap border-b border-osg-50 px-3 py-2 text-right tabular-nums text-osg-500">
                {linha.alcada ?? '—'}
              </td>
              <td className="whitespace-nowrap border-b border-osg-50 px-3 py-2 text-osg-500">
                {linha.acima ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Rolagem>
    <div className="mt-4 rounded-md border border-osg-100 bg-muted/70 p-4">
      <div data-campo="Ato sem valor declarado" className="flex scroll-mt-4 flex-col gap-1.5 rounded-md">
        <span className="text-xs font-medium text-slate-600">Ato sem valor declarado</span>
        <Escolha
          valor={atoSemValor}
          opcoes={['Sobe sempre ao órgão de escalada', 'Segue a competência normal da linha']}
          rotulo="Ato sem valor declarado"
          onChange={setAtoSemValor}
        />
        <span className="text-[11px] leading-snug text-muted-foreground">
          Procuração ampla, comodato, anuência: atos sem valor em reais, que não dá para comparar com
          o teto. Escolhendo <em>sobe sempre</em>, a cláusula de representação ganha o trecho "ou que
          não expressem valores"; escolhendo <em>segue a competência normal</em>, o trecho sai. Veja
          na última cláusula ao lado.
        </span>
      </div>
    </div>
        </>
      }
      documento={(ir, ler) => (
        <DocumentoModelo
          aoLado
          onIrParaCampo={ir}
          rotulo="Como fica no contrato social"
          paragrafos={clausulasDaMatriz({
            orgaos: ORGAOS_ATIVOS.map((o) => o.nome),
            grade,
            atoSemValor,
          })}
          nota={
            <>
              Uma cláusula por órgão, como no contrato. Trocar qualquer célula reescreve a alínea na
              hora; marcar "não participa" faz a alínea <strong>desaparecer</strong>, e o Parágrafo
              Segundo recalcula as letras.
            </>
          }
        />
      )}
    />
  );
};


/**
 * A pilha de alterações contratuais do cliente.
 *
 * É o único item da governança que se repete: o mesmo cliente tem 4ª, 5ª e 6ª
 * alteração. Sem esta lista o modal daria a entender que existe uma só, e o
 * consultor não teria como saber qual está em elaboração nem o que a anterior já
 * registrou.
 */
const Alteracoes = () => (
  <>
    <Nota>
      Cada alteração é um documento próprio, com número e data. Os campos das outras abas são sempre
      os da alteração <strong>em elaboração</strong>; as registradas ficam aqui como histórico,
      porque é nelas que se confere o que já está na Junta e não precisa ser repetido.
    </Nota>
    <Rolagem>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <Cabecalho titulos={['Alteração', 'Data', 'O que mudou', 'Situação']} />
        <tbody>
          {ALTERACOES_CONTRATUAIS.map((a) => (
            <tr key={a.numero} className={a.emEdicao ? 'bg-osg-moss/[0.06]' : undefined}>
              <th className="whitespace-nowrap border-b border-osg-50 px-3 py-2 text-left font-semibold text-osg-700">
                {a.numero}
                {a.consolida && (
                  <span className="ml-1.5 font-normal text-[11px] text-osg-300">consolidada</span>
                )}
              </th>
              <td className="whitespace-nowrap border-b border-osg-50 px-3 py-2 tabular-nums text-osg-500">
                {a.data}
              </td>
              <td className="border-b border-osg-50 px-3 py-2 text-osg-700">{a.objeto}</td>
              <td className="whitespace-nowrap border-b border-osg-50 px-3 py-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    a.emEdicao ? 'bg-osg-100 text-osg-600' : 'bg-osg-moss/10 text-osg-moss'
                  }`}
                >
                  {a.situacao}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Rolagem>
    <p className="mt-3 text-[12px] text-muted-foreground">
      No sistema haveria aqui o botão de nova alteração, do mesmo jeito que a lista de bens e a de
      matrículas têm.
    </p>
  </>
);

const Protocolo = () => (
  <>
    <Nota>
      O que cada grupo da família recebe da empresa, além de salário: carro, plano de saúde, casa,
      viagem, empréstimo. Cada linha é um benefício, cada coluna é um grupo, e a célula diz se
      aquele grupo tem direito. Deste documento só a remuneração global desce ao contrato social; o
      valor de cada benefício fica aqui dentro de propósito.
    </Nota>
    <Nota>
      <strong>O nome muda de cliente para cliente, e isso é uma decisão de vocês.</strong> No modelo
      da pasta 03 ele se chama Protocolo de Remuneração. Num cliente real ele se chama{' '}
      <em>Protocolo Familiar</em>, e cobre seis capítulos: bens a integralizar, governança e tomada
      de decisão, pró-labore e distribuição de lucros, custos suportados pela sociedade (veículo,
      combustível, manutenção, seguro), benefícios e viagens, e arbitragem. Ou seja, num cliente
      este documento absorve assunto que o mapeamento coloca na Matriz e no Acordo. Precisamos saber
      se a tela deve ter um nome só ou aceitar o nome que o cliente usa.
    </Nota>
    <Nota>
      <strong>Nada deste documento vira ato societário.</strong> Eu havia marcado quatro linhas como
      cláusula, e a consultoria corrigiu: o Protocolo "é um documento específico e esse não reflete em
      ato societário, apenas formaliza". A cláusula do contrato que fala de remuneração existe, mas
      vem da <em>Matriz</em>, que dá ao Conselho a competência de aprovar a remuneração individual com
      base na global aprovada em Reunião de Sócios. Não vem daqui.
    </Nota>
    <Nota>
      <strong>As colunas mudam de cliente para cliente, e isto não é a mesma lista da Matriz.</strong>{' '}
      Confirmado pela consultoria: num cliente há filho na gestão, noutro os fundadores aparecem como
      "figura cativa" e existem sócios e diretores; e há benefício que só alguns têm, como aeronave.
      Mais importante: Matriz e Protocolo são <strong>listas independentes e não devem usar o mesmo
      conjunto</strong>. O Protocolo regra o combinado dos familiares; a Matriz regra os limites da
      administração e dos órgãos, independentemente de família.
    </Nota>
    <Glossario
      titulo="Por que a resposta tem três valores e não é sim ou não"
      itens={GLOSSARIO_RESPOSTAS.map((r) => ({ termo: r.resposta, significa: r.significa }))}
    />
    <Rolagem>
      <table className="w-full min-w-[880px] border-collapse text-sm">
        <Cabecalho
          titulos={['Critério', ...GRUPOS_BENEFICIARIO.map((g) => g.rotulo), 'Valor']}
          ultimoADireita
        />
        <tbody>
          {FAMILIAS_PROTOCOLO.map((f) => (
            <Fragment key={f.familia}>
              <tr className="bg-osg-50/70">
                <th
                  colSpan={GRUPOS_BENEFICIARIO.length + 2}
                  className="border-b border-osg-100 px-3 py-1.5 text-left text-[13px] font-semibold uppercase tracking-wider text-osg-500"
                >
                  {f.familia}
                </th>
              </tr>
              {f.criterios.map((c) => (
                <tr key={c.criterio}>
                  <th className="border-b border-osg-50 px-3 py-2 text-left font-normal text-osg-700">
                    {c.criterio}
                    {c.destino === 'contrato' && (
                      <span className="ml-2 whitespace-nowrap rounded-full border border-osg-moss/40 bg-osg-moss/[0.07] px-2 py-0.5 text-[10.5px] leading-tight text-osg-moss">
                        vira cláusula
                      </span>
                    )}
                  </th>
                  {c.respostas.map((r, i) => (
                    <td key={i} className="border-b border-osg-50 px-3 py-2">
                      <Escolha valor={r} opcoes={RESPOSTAS_CRITERIO} rotulo="Resposta" />
                    </td>
                  ))}
                  <td className="whitespace-nowrap border-b border-osg-50 px-3 py-2 text-right tabular-nums text-osg-500">
                    {c.valor ?? '—'}
                  </td>
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </Rolagem>
  </>
);

export const ITENS: ItemGovernanca[] = [
  {
    id: 'orgaos',
    numero: 'A',
    titulo: 'Órgãos de governança',
    chamada:
      'Quais instâncias de decisão existem neste cliente. É o que define as colunas da Matriz.',
    produz: 'nada; alimenta a Matriz, o Acordo e o Protocolo',
    entidade: 'o cliente / grupo',
    campos: '4 instâncias, marcar quais existem',
    pasta: 'não é documento',
    destino: 'base',
    etapa: 'base',
    preenchido: true,
    abas: [{ valor: 'orgaos', rotulo: 'Órgãos', conteudo: <Orgaos /> }],
  },
  {
    id: 'grupos',
    numero: 'B',
    titulo: 'Grupos de pessoas',
    chamada: 'Os grupos que recebem benefício, pelo papel de cada um na empresa hoje.',
    produz: 'nada; alimenta o Protocolo',
    entidade: 'as pessoas do cliente',
    campos: '1 rótulo e 1 lista por grupo, mais 2 gerais',
    pasta: 'não é documento',
    destino: 'base',
    etapa: 'base',
    preenchido: true,
    abas: [{ valor: 'grupos', rotulo: 'Grupos', conteudo: <Grupos /> }],
  },
  {
    id: 'matriz',
    numero: '01',
    titulo: 'Matriz de Alçadas',
    chamada: 'Quem decide o que, e até que valor, em cada assunto da empresa.',
    produz: 'Matriz de Alçadas',
    entidade: 'o cliente / grupo',
    campos: `${ASSUNTOS_MATRIZ.length} assuntos × ${ORGAOS_ATIVOS.length} órgãos · nenhum já no sistema`,
    pasta: 'pastas 01 e 04 do Drive',
    destino: 'contrato',
    etapa: 'decide',
    preenchido: true,
    ultimaGeracao: '12/03/2026 · versão 2',
    largo: true,
    comDocumento: true,
    abas: [{ valor: 'matriz', rotulo: 'Assuntos', conteudo: <Matriz /> }],
  },
  {
    id: 'acordo',
    numero: '03',
    titulo: 'Acordo de Quotistas',
    chamada:
      'As regras entre os sócios: como se vota, quem compra a parte de quem sai e por quanto.',
    produz: 'Acordo de Quotistas',
    entidade: 'a holding e os sócios',
    campos: resumo(CAMPOS_ACORDO),
    pasta: 'pasta 02 do Drive',
    destino: 'contrato',
    etapa: 'decide',
    preenchido: true,
    ultimaGeracao: '29/09/2025 · assinado com firma reconhecida',
    comDocumento: true,
    abas: [
      {
        valor: 'acordo',
        rotulo: 'Parâmetros',
        conteudo: (
          <>
            <Nota>
              Só os parâmetros que mudam de cliente para cliente; o texto das cláusulas não entra no
              cadastro. O contrato social faz <strong>duas coisas</strong> com este acordo: cita ele
              pelo nome, em capítulo próprio, dizendo que está arquivado na sede, e ainda registra
              como cláusula {CAMPOS_ACORDO.filter((c) => c.destino === 'contrato').length} dos{' '}
              {CAMPOS_ACORDO.length} parâmetros abaixo. Os outros {CAMPOS_ACORDO.filter((c) => c.destino !== 'contrato').length}{' '}
              não aparecem em cláusula nenhuma e ficam só no acordo.
            </Nota>
            <LadoALado
              formulario={<Campos campos={CAMPOS_ACORDO} />}
              documento={(ir, ler) => (
                <DocumentoModelo
                  aoLado
                  onIrParaCampo={ir}
                  rotulo="Como fica no contrato social"
                  deTotal={CAMPOS_ACORDO.length}
                  paragrafos={clausulasDoAcordo(ler)}
                  nota={
                    <>
                      Em <strong>amarelo forte</strong>, o que o sistema já tem: a qualificação
                      inteira dos sócios e a identificação da sociedade, com valores reais lidos do
                      banco de desenvolvimento. Clique numa marca clara para ir ao campo.
                    </>
                  }
                />
              )}
            />
          </>
        ),
      },
    ],
  },
  {
    id: 'regimento',
    numero: '02',
    titulo: 'Regimento Interno do Conselho',
    chamada: 'Como o conselho funciona por dentro: tamanho, mandato, quórum e perda de cadeira.',
    produz: 'Regimento Interno',
    entidade: 'o conselho de administração',
    campos: resumo(CAMPOS_REGIMENTO),
    pasta: 'pasta 05 do Drive',
    destino: 'contrato',
    etapa: 'decide',
    preenchido: true,
    ultimaGeracao: 'vigência 2026 a 2031',
    comDocumento: true,
    abas: [
      {
        valor: 'regimento',
        rotulo: 'Parâmetros',
        conteudo: (
          <>
            <Nota>
              O procedimento interno diz que este documento é artesanal e pode não ter campo
              estruturável; o exemplo real tem {CAMPOS_REGIMENTO.length} parâmetros objetivos, todos
              abaixo. Só a periodicidade das reuniões não aparece em cláusula nenhuma: é o corte
              entre o que se registra e o que fica interno.
            </Nota>
            <LadoALado
              formulario={<Campos campos={CAMPOS_REGIMENTO} />}
              documento={(ir, ler) => (
                <DocumentoModelo
                  aoLado
                  onIrParaCampo={ir}
                  rotulo="Como fica no contrato social"
                  deTotal={CAMPOS_REGIMENTO.length}
                  paragrafos={clausulasDoRegimento(ler)}
                  nota={
                    <>
                      O Regimento não é citado pelo nome em cláusula nenhuma: descem os parâmetros
                      dele, em amarelo claro, dentro do capítulo do Conselho.
                    </>
                  }
                />
              )}
            />
          </>
        ),
      },
    ],
  },
  {
    id: 'ac-reflexo',
    numero: '05',
    titulo: 'AC Reflexo',
    chamada:
      'Transforma as decisões dos itens acima em cláusula registrada na Junta Comercial. Uma por alteração.',
    produz: 'Alteração Contratual',
    entidade: 'a holding',
    campos: `${ALTERACOES_CONTRATUAIS.length} alterações · ${CAMPOS_AC_REFLEXO.length} campos por alteração`,
    pasta: 'pasta 06 do Drive',
    destino: 'contrato',
    etapa: 'registra',
    preenchido: false,
    ultimaGeracao: '5ª alteração · 18/03/2025',
    largo: true,
    comDocumento: true,
    abas: [
      { valor: 'alteracoes', rotulo: 'Alterações do cliente', conteudo: <Alteracoes /> },
      {
        valor: 'ac',
        rotulo: 'A 6ª alteração',
        conteudo: (
          <>
            <Nota>
              Sem ela as regras não valem contra terceiros nem na Junta Comercial. Ela não inventa
              parâmetro: repete o que o Regimento e a Ata já definiram, e é o último passo do fluxo,
              por isso costuma ser o último a ser preenchido. O nome é interno e pode não ser o
              melhor para a tela.
            </Nota>
            <LadoALado
              formulario={<Campos campos={CAMPOS_AC_REFLEXO} />}
              documento={(ir, ler) => (
                <DocumentoModelo
                  aoLado
                  onIrParaCampo={ir}
                  rotulo="Como fica no contrato social"
                  deTotal={CAMPOS_AC_REFLEXO.length}
                  paragrafos={clausulasDoAcReflexo(ler)}
                  nota={
                    <>
                      Este documento reúne campos de <strong>quatro blocos</strong>: a Matriz dá a
                      alçada de representação, a Instalação dá os órgãos e o marco do mandato, e este
                      bloco dá a regra de lucros. É o funil do fluxo.
                    </>
                  }
                />
              )}
            />
          </>
        ),
      },
    ],
  },
  {
    id: 'instalacao',
    numero: '06',
    titulo: 'Instalação do Conselho e da Diretoria',
    chamada: 'Quem foi eleito, para que cargo e por quanto tempo, e a reunião que registrou isso.',
    produz: 'Ata de eleição e Termo de Posse',
    entidade: 'as pessoas eleitas',
    campos: `${ELEITOS.length} eleitos · ${CAMPOS_INSTALACAO.length} campos da reunião`,
    pasta: 'pasta 07 do Drive',
    destino: 'registro',
    etapa: 'assume',
    preenchido: false,
    largo: true,
    abas: [
      {
        valor: 'eleitos',
        rotulo: 'Quem foi eleito',
        conteudo: (
          <>
            <Nota>
              O item volta com o nome da pasta que vocês já usam. Ele saiu da tela na rodada
              passada, e a consequência foi ficar sem lugar de onde nascer a ata de eleição e o termo
              de posse: são eles que provam quem está no cargo, e o contrato social depende disso
              para nomear a diretoria.
            </Nota>
            <Rolagem>
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <Cabecalho titulos={['Eleito', 'Cargo', 'É sócio', 'Início', 'Fim']} />
                <tbody>
                  {ELEITOS.map((e) => (
                    <tr key={e.pessoa}>
                      <th className="border-b border-osg-50 px-3 py-2 text-left font-normal">
                        <span className="inline-flex items-center gap-1 rounded-md bg-osg-50 px-2 py-0.5 text-[12.5px] text-osg-700">
                          {e.pessoa}
                        </span>
                      </th>
                      <td className="border-b border-osg-50 px-3 py-2 text-osg-700">{e.cargo}</td>
                      <td className="border-b border-osg-50 px-3 py-2 text-osg-500">{e.socio}</td>
                      <td className="whitespace-nowrap border-b border-osg-50 px-3 py-2 tabular-nums text-osg-500">
                        {e.inicio}
                      </td>
                      <td className="whitespace-nowrap border-b border-osg-50 px-3 py-2 tabular-nums text-osg-500">
                        {e.fim}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Rolagem>
            <p className="mt-3 text-[12px] text-muted-foreground">
              O eleito é escolhido entre as pessoas já cadastradas do cliente, e não digitado: é do
              cadastro que sai o gênero para a cláusula concordar, "o conselheiro eleito" ou "a
              conselheira eleita".
            </p>
          </>
        ),
      },
      {
        valor: 'reuniao',
        rotulo: 'A reunião e a ata',
        conteudo: (
          <>
            <Nota>
              A etiqueta de cada campo diz se ele vira cláusula do contrato social ou fica só na ata.
              Os {CAMPOS_INSTALACAO.length} campos saíram de uma ata de eleição real, lida por
              reconhecimento de imagem porque o arquivo é escaneado. Dois achados vieram dela: o
              mandato do conselho e o da diretoria <strong>não são o mesmo</strong> (dois anos contra
              três, declarados na mesma frase), e o número de membros tem dois valores, o intervalo
              que o contrato permite e o número que a reunião de fato elegeu.
            </Nota>
            <Campos campos={CAMPOS_INSTALACAO} />
          </>
        ),
      },
    ],
  },
  {
    id: 'protocolo',
    numero: '04',
    titulo: 'Protocolo de Remuneração',
    chamada: 'O que cada grupo da família recebe além de salário: carro, saúde, casa, viagem.',
    produz: 'Protocolo de Remuneração',
    entidade: 'os grupos de pessoas do item B',
    campos: `${FAMILIAS_PROTOCOLO.length} famílias de benefício · ${CAMPOS_PROTOCOLO_GERAIS.length} campos de regra geral`,
    pasta: 'pasta 03 do Drive',
    destino: 'interno',
    etapa: 'decide',
    preenchido: true,
    ultimaGeracao: '09/06/2025',
    largo: true,
    abas: [
      { valor: 'beneficios', rotulo: 'Benefícios por grupo', conteudo: <Protocolo /> },
      {
        valor: 'gerais',
        rotulo: 'Regras gerais',
        conteudo: (
          <>
            <Nota>
              As regras que valem para todos os grupos, e a remuneração global: é o único número
              deste documento que sobe para o contrato social.
            </Nota>
            <Campos campos={CAMPOS_PROTOCOLO_GERAIS} />
          </>
        ),
      },
    ],
  },
];
