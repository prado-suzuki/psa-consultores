import type { SnapshotDados } from '@/hooks/useDocumentoGerado';
import { derivarCampos } from '@/lib/templates/vocabulario';
import { idDoRegistro, origemDe } from '@/lib/templates/origem';
import { digitosDe } from '@/lib/osg/baselineDaPeca';

// A alteração contratual por EVENTOS: o que mudou entre o instrumento registrado
// (o snapshot que a peça anterior publicou na junta) e o cadastro de hoje, campo
// a campo, por identidade estável. Daqui saem os CANDIDATOS que o assistente
// pré-marca, a validação da seleção e o estado proposto da sede.
//
// Três coisas ficam separadas de propósito:
//   - DETECTAR a divergência (qualquer campo comparável);
//   - ELEGER para geração (só o que está homologado: sede, mudança física, no
//     mesmo município e UF);
//   - APLICAR ao estado (só o que o consultor confirmou).
//
// Qualificação de pessoa é detectada por id estável e SEPARADA POR MATÉRIA, que
// é a unidade de impacto: o ENDEREÇO de sócio pessoa física é gerável (modelo e
// causa homologados; ver a migration da resolução de qualificação), e todo o
// resto da qualificação — CPF, profissão, estado civil, RG, data de nascimento —
// continua aparecendo como pendência, sem interruptor.
//
// A separação não é cosmética. A resolução reproduz a qualificação INTEIRA da
// pessoa, e publicar o endereço novo junto com a profissão nova seria aprovar o
// que ninguém aprovou. Duas matérias, dois candidatos, duas decisões: o endereço
// entra, a profissão fica pendente, e o consolidado mantém a profissão que o
// instrumento registrado publicou (a aplicação é do estadoProposto.ts).
//
// CPF é dado corrigível, não identidade: corrigir o CPF da mesma pessoa não é
// ingresso nem retirada.

type CamposAC = Record<string, string | null>;

export interface CandidatoAC {
  id: string;
  tipo: 'sede' | 'qualificacao' | 'enderecoSocio';
  /** `tmpl_flag.nome` do evento correspondente no modelo. */
  flagNome: string;
  antes: CamposAC;
  depois: CamposAC;
  /** A frase que o consultor lê como prova. */
  evidencia: string;
  /** Pode ser gerado: homologado, com base suficiente e sem ambiguidade. */
  elegivel: boolean;
  pendencias: string[];
  /** Canônico do antes/depois normalizado: mudou o valor, mudou a assinatura. */
  fingerprint: string;
}

export type CausaSede = 'mudanca_fisica' | 'atualizacao_postal' | 'erro_material';

/**
 * Por que o endereço do SÓCIO mudou. Diferente da sede, aqui a atualização
 * postal é homologada: os instrumentos registrados a praticam com a mesma
 * redação da mudança de domicílio (GMS 7ª e ITFD Participações 2ª abrem por
 * "em decorrência da atualização do CEP" e seguem para "altera-se a
 * qualificação … para fazer constar o atual endereço"), porque atualizar a
 * qualificação de uma parte não transfere nada nem muda jurisdição — ao
 * contrário de transferir a sede da sociedade.
 *
 * `erro_material` continua bloqueado pelo mesmo motivo da sede: corrigir o que
 * o instrumento anterior publicou errado é retificação com alvo histórico, e
 * não uma atualização que valha "a partir de então".
 */
export type CausaQualificacao = 'mudanca_de_domicilio' | 'atualizacao_postal' | 'erro_material';

export interface PropostaAC {
  versao: 1;
  baseDocumentoId: string;
  base: SnapshotDados;
  candidatos: CandidatoAC[];
  pendencias: string[];
  /** Ids dos candidatos confirmados (sede e endereço de sócio PF). */
  selecionados: string[];
  causaSede: CausaSede;
  causaQualificacao: CausaQualificacao;
  /**
   * Nomes das flags de evento confirmadas no assistente, inclusive as que não
   * têm candidato aqui (aumento de capital, cessão…): é a projeção que o motor
   * consome e a abrangência que o registro congela.
   */
  eventosConfirmados: string[];
  /** Ids dos movimentos do livro abrangidos pelos eventos confirmados. */
  movimentosConfirmados: string[];
  /** Base + eventos confirmados DESTE módulo (a sede). O compositor da folha vai além. */
  estadoProposto: SnapshotDados;
  confirmadoEm: string;
}

/** A sede como todo snapshot registrado a conhece: prosa + partes do mapeador antigo. */
export const SEDE_LEGADA = ['sede', 'sedeEndereco', 'sedeBairro', 'sedeMunicipio', 'sedeUf', 'sedeCep'] as const;
/** As partes que `sedeEndereco` funde, presentes só nos snapshots novos. */
export const SEDE_ATOMICA = ['sedeLogradouro', 'sedeNumero', 'sedeComplemento'] as const;
export const SEDE = [...SEDE_LEGADA, ...SEDE_ATOMICA] as const;
const DERIVADOS_SEDE = ['sedeUfExtenso'] as const;
export const CAMPOS_DE_QUALIFICACAO = ['cpfCnpj', 'nome', 'tipoPessoa', 'nacionalidade', 'estadoCivil',
  'regimeBens', 'dataNascimento', 'nire', 'juntaComercialUf', 'profissao', 'rg',
  'orgaoExpedidor', 'genero', 'naturalidadeMunicipio', 'naturalidadeUf',
  'filiacaoPai', 'filiacaoMae', 'endereco'] as const;

/**
 * O recorte HOMOLOGADO da qualificação: o endereço da pessoa física que é sócia.
 *
 * Um campo só, e de propósito. `endereco` é o texto único que o vocabulário de
 * `pessoa` conhece (não há partes atômicas como na sede), e é o que as quatro
 * alterações reais de qualificação por endereço mudam.
 */
export const CAMPOS_DE_ENDERECO_PESSOA = ['endereco'] as const;

export const FLAG_SEDE = 'evento_alteracao_endereco';
export const FLAG_QUALIFICACAO = 'evento_alteracao_qualificacao';

// O snapshot e JSON persistido, e a proveniencia agora viaja em chaves de string
// (ver origem.ts): o round-trip preserva a identidade em vez de descarta-la.
function clone<T>(valor: T): T {
  return JSON.parse(JSON.stringify(valor)) as T;
}

function normalizar(valor: string | null, campo: string): string | null {
  if (valor === null) return null;
  const texto = valor.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR');
  if (/^(cpfCnpj|cnpj|sedeCep)$/.test(campo)) return texto.replace(/[.\-/\s]/g, '');
  // Mascara postal dentro da prosa nao representa mudanca de endereco.
  return texto.replace(/\b(\d{5})-(\d{3})\b/g, '$1$2');
}

function assinatura(campos: CamposAC): string {
  return JSON.stringify(Object.keys(campos).sort().map((k) => [k, normalizar(campos[k], k)]));
}

function camposDe(obj: Record<string, unknown>, chaves: readonly string[]): CamposAC {
  return Object.fromEntries(chaves.map((k) => [k, typeof obj[k] === 'string' ? obj[k] : null]));
}

const conhecido = (v: string | null | undefined) => v !== null && v !== undefined;
const preenchido = (v: string | null | undefined) => conhecido(v) && v!.trim() !== '';

interface Ocorrencia {
  campos: Record<string, unknown>;
  id: string | null;
  /**
   * Tipo da entidade de origem ('pessoa', 'sociedade', 'cartorio'…), quando o
   * snapshot o declara. Null nos snapshots anteriores à proveniência serializada
   * — e é por isso que quem depende dele sempre tem um ramo para a ausência.
   */
  tipo: string | null;
  sociedade: boolean;
  caminho: string;
  /** Nome da lista de `itensPorLista` que contém esta ocorrência, quando é uma. */
  lista: string | null;
}

/**
 * A lista de onde a ocorrência saiu ("itensPorLista.socios[].pessoa" → "socios").
 *
 * Serve a UMA pergunta, e é a que separa o evento homologado do que não é: a
 * resolução de endereço fala de SÓCIO, e quem não está no quadro societário não
 * pode ser nomeado por ela. Listas aninhadas (imóveis dentro de integralizações)
 * respondem a lista de fora, que é a que diz o papel da pessoa.
 */
function listaDoCaminho(caminho: string): string | null {
  const m = /^itensPorLista\.([^.[]+)\[\]/.exec(caminho);
  return m ? m[1] : null;
}

function ocorrencias(snapshot: SnapshotDados): Ocorrencia[] {
  const out: Ocorrencia[] = [];
  const visitar = (valor: unknown, caminho: string, binding?: string) => {
    if (!valor || typeof valor !== 'object') return;
    if (Array.isArray(valor)) {
      valor.forEach((item) => visitar(item, `${caminho}[]`));
      return;
    }
    const campos = valor as Record<string, unknown>;
    const vinculo = binding ? snapshot.registroPorBinding[binding] : undefined;
    // A identidade sai de `idDoRegistro`, que lê a chave reservada da
    // proveniência e cai no `id` avulso dos snapshots antigos (ver origem.ts).
    const id = idDoRegistro(campos) ?? vinculo ?? null;
    const sociedade = binding === 'sociedade' || SEDE.some((k) => k in campos);
    out.push({
      campos, sociedade, caminho,
      id: id ?? (binding === 'sociedade' ? snapshot.empresaId : null),
      tipo: origemDe(campos)?.tipo ?? null,
      lista: listaDoCaminho(caminho),
    });
    Object.entries(campos).forEach(([k, item]) => visitar(item, `${caminho}.${k}`));
  };
  Object.entries(snapshot.selecao).forEach(([binding, campos]) => visitar(campos, `selecao.${binding}`, binding));
  visitar(snapshot.itensPorLista, 'itensPorLista');
  return out;
}

function criarCandidato(
  id: string, tipo: CandidatoAC['tipo'], antes: CamposAC, depois: CamposAC,
  pendencias: string[], evidencia: string,
): CandidatoAC {
  return {
    id, tipo, antes, depois, evidencia,
    flagNome: tipo === 'sede' ? FLAG_SEDE : FLAG_QUALIFICACAO,
    // `qualificacao` é o resíduo NÃO homologado (CPF, profissão, estado civil…):
    // detectar não autoriza gerar, e ele nunca fica elegível. Sede e endereço de
    // sócio ficam, quando a base basta e não há ambiguidade.
    elegivel: tipo !== 'qualificacao' && pendencias.length === 0,
    pendencias,
    // Canonico, sem hash com risco de colisao. Valores brutos continuam no antes/depois.
    fingerprint: JSON.stringify([id, assinatura(antes), assinatura(depois), [...pendencias].sort()]),
  };
}

/** Os campos de sede que uma comparação pode usar, dado o que a BASE conhece. */
function chavesDaSede(antes: Record<string, unknown>): { comparaveis: string[]; legada: boolean } {
  const temAtomica = SEDE_ATOMICA.some((k) => typeof antes[k] === 'string');
  return {
    comparaveis: temAtomica ? [...SEDE_LEGADA, ...SEDE_ATOMICA] : [...SEDE_LEGADA],
    legada: !temAtomica,
  };
}

export function analisarAlteracao(base: SnapshotDados, atual: SnapshotDados): {
  candidatos: CandidatoAC[]; pendencias: string[];
} {
  const candidatos: CandidatoAC[] = [];
  const pendencias: string[] = [];
  const anteriores = ocorrencias(base);
  const atuais = ocorrencias(atual);
  const problemasSede: string[] = [];
  if (!base.empresaId || base.empresaId !== atual.empresaId) {
    problemasSede.push('Sociedade da base ausente ou diferente da sociedade atual.');
  }
  for (const [rotulo, snapshot] of [['Base', base], ['Atual', atual]] as const) {
    if (ocorrencias(snapshot).some((o) => o.sociedade && !o.id)) {
      problemasSede.push(`${rotulo}: ocorrencia de sede sem identidade estavel.`);
    }
    for (const [binding, campos] of Object.entries(snapshot.selecao)) {
      const vinculo = snapshot.registroPorBinding[binding];
      const proprio = idDoRegistro(campos);
      if (proprio && vinculo && proprio !== vinculo) {
        problemasSede.push(`${rotulo}: identidade do binding ${binding} inconsistente.`);
      }
    }
  }
  const sedes = (lista: Ocorrencia[]) => lista.filter((o) => o.sociedade && o.id === base.empresaId);
  const a = sedes(anteriores);
  const b = sedes(atuais);
  const { comparaveis, legada } = chavesDaSede(a[0]?.campos ?? {});
  const derivados = DERIVADOS_SEDE.filter((k) => [...a, ...b].some((o) => k in o.campos));
  // Antes/depois carregam TODAS as chaves de sede (null = desconhecido), mas a
  // comparação só usa as que a base conhece: uma base registrada antes de as
  // partes atômicas existirem não é insuficiente por isso, porque `sedeEndereco`
  // é a mesma fusão estruturada de logradouro e número que o mapeador faz hoje.
  const todas = [...SEDE, ...derivados];
  const antes = camposDe(a[0]?.campos ?? {}, todas);
  const depois = camposDe(b[0]?.campos ?? {}, todas);
  for (const [rotulo, valor] of [['Base', antes], ['Atual', depois]] as const) {
    for (const k of comparaveis) {
      const ok = k === 'sedeComplemento' ? conhecido(valor[k]) : preenchido(valor[k]);
      if (!ok) problemasSede.push(`${rotulo}: ${k} desconhecido ou insuficiente.`);
    }
  }
  // Base legada: o atual precisa trazer as partes atômicas por inteiro, senão a
  // resolução nova nasceria sem o campo que a base também não tem.
  if (legada && SEDE_ATOMICA.some((k) => (k === 'sedeComplemento' ? !conhecido(depois[k]) : !preenchido(depois[k])))) {
    problemasSede.push('Atual: sede sem logradouro, número e complemento estruturados.');
  }
  const recorte = (c: CamposAC) => camposDe(c as Record<string, unknown>, [...comparaveis, ...derivados]);
  for (const [rotulo, lista, referencia] of [['Base', a, antes], ['Atual', b, depois]] as const) {
    if (lista.some((o) => assinatura(recorte(camposDe(o.campos, todas))) !== assinatura(recorte(referencia)))) {
      problemasSede.push(`${rotulo}: ocorrencias da sede inconsistentes.`);
    }
  }
  for (const k of ['sedeMunicipio', 'sedeUf']) {
    if (normalizar(antes[k], k) !== normalizar(depois[k], k)) {
      problemasSede.push(`Mudanca de ${k} fora do caso homologado (mesmo municipio e UF).`);
    }
  }
  const mudou = assinatura(recorte(antes)) !== assinatura(recorte(depois));
  if (mudou && legada) {
    // Só a prosa mudou: na base legada não há como dizer se foi o complemento
    // ou a formatação, e escolher por ela seria inventar o antes.
    const soProsa = SEDE_LEGADA.filter((k) => k !== 'sede')
      .every((k) => normalizar(antes[k], k) === normalizar(depois[k], k));
    if (soProsa) {
      problemasSede.push('Base registrada sem sede estruturada: a mudanca so aparece na prosa (complemento?) e exige conciliacao.');
    }
  }
  if (mudou) {
    const candidato = criarCandidato(`sede:${base.empresaId ?? 'desconhecida'}`, 'sede', antes, depois,
      problemasSede, `Sede: ${antes.sede ?? '(desconhecida)'} -> ${depois.sede ?? '(desconhecida)'}`);
    const bindings = Object.entries(atual.selecao).filter(([nome, c]) =>
      idDoRegistro(c) === base.empresaId || atual.registroPorBinding[nome] === base.empresaId || nome === 'sociedade')
      .map(([nome]) => nome).sort();
    candidato.fingerprint += JSON.stringify([bindings, b.map((o) => o.caminho).sort()]);
    candidatos.push(candidato);
  }
  pendencias.push(...problemasSede);

  const pessoas = (lista: Ocorrencia[], rotulo: string) => {
    const porId = new Map<string, { campos: CamposAC; socio: boolean }>();
    for (const o of lista) {
      // O FILTRO É A DECISÃO DE PAPEL, e agora ele pode ser exato.
      //
      // A heurística de baixo ("tem cpfCnpj, tipoPessoa ou nome") era o que
      // havia antes de o snapshot guardar o tipo da entidade, e ela pega demais:
      // `mapearCartorio` publica `nome`, então TODO documento com binding de
      // cartório punha a serventia na comparação de qualificação de pessoa. Sem
      // id isso só cobrava a pendência "sem id estavel"; COM id (que é o que
      // esta frente entrega) o cartório passaria a virar candidato de
      // qualificação — uma serventia que "trocou de profissão".
      //
      // Com o tipo declarado, quem não é pessoa sai por declaração. Sem ele
      // (snapshot do acervo), a heurística continua respondendo, como sempre.
      if (o.tipo && o.tipo !== 'pessoa') continue;
      if (o.sociedade || !['cpfCnpj', 'tipoPessoa', 'nome'].some((k) => typeof o.campos[k] === 'string')) continue;
      // O bloco de ASSINATURAS é projeção, não fonte de qualificação: ele carrega
      // nome, papel, CPF e a linha de complemento, e nada mais (ver
      // `mapearSignatarios`). As pessoas dele já são comparadas onde a
      // qualificação de verdade mora — quadro, administração, partes.
      //
      // Ficava fora da comparação de qualquer jeito, por não ter id, mas cobrava
      // por isso uma pendência em toda peça: "qualificacao sem id estavel", duas
      // vezes, com o cadastro intocado. Dar um id a ele seria pior: a projeção
      // não tem endereço nem tipoPessoa, então passaria a divergir da ocorrência
      // completa da MESMA pessoa e trocaria um aviso inútil por
      // "qualificacao inconsistente entre papeis" para todo mundo.
      if (o.lista === 'signatarios') continue;
      if (!o.id) {
        // Nomear quem e onde: sem isso a frase não diz ao consultor o que fazer,
        // e ele não tem como saber que parte do documento ficou de fora.
        const quem = typeof o.campos.nome === 'string' && o.campos.nome.trim()
          ? `"${o.campos.nome.trim()}"` : 'uma pessoa';
        const onde = o.lista ? `na lista "${o.lista}"` : 'em um campo do documento';
        pendencias.push(
          `${rotulo}: ${quem} aparece ${onde} sem id estavel e fica fora da comparacao. `
          + 'CPF nao serve de identidade aqui: corrigir um CPF nao e troca de socio.',
        );
        continue;
      }
      const campos = camposDe(o.campos, CAMPOS_DE_QUALIFICACAO);
      const anterior = porId.get(o.id);
      // Sócio é quem aparece no quadro, em QUALQUER ocorrência: a mesma pessoa
      // costuma aparecer também como administradora e como signatária, e o papel
      // que autoriza a resolução é o do quadro.
      const socio = (anterior?.socio ?? false) || o.lista === 'socios';
      if (anterior && assinatura(anterior.campos) !== assinatura(campos)) {
        pendencias.push(`${rotulo}: qualificacao ${o.id} inconsistente entre papeis.`);
        // Escolha deterministica apenas para exibir a evidencia, nunca para autorizar.
        if (assinatura(anterior.campos) < assinatura(campos)) {
          porId.set(o.id, { ...anterior, socio });
          continue;
        }
      }
      porId.set(o.id, { campos, socio });
    }
    return porId;
  };
  const pa = pessoas(anteriores, 'Base');
  const pb = pessoas(atuais, 'Atual');
  for (const id of new Set([...pa.keys(), ...pb.keys()])) {
    const antesP = pa.get(id);
    const depoisP = pb.get(id);
    if (!antesP || !depoisP) {
      pendencias.push(`Qualificacao ${id} ausente em um dos estados; nao inferir ingresso ou retirada.`);
      continue;
    }
    const x = antesP.campos;
    const y = depoisP.campos;
    if (assinatura(x) === assinatura(y)) continue;
    const mudaram = CAMPOS_DE_QUALIFICACAO.filter((k) => normalizar(x[k], k) !== normalizar(y[k], k));
    const nome = (y.nome ?? x.nome ?? id).trim() || id;

    // --- Matéria homologada: o endereço do sócio pessoa física ---------------
    //
    // Fora desse recorte o endereço NÃO vira candidato próprio: ele volta para o
    // resíduo, com o motivo. Emitir um candidato inelegível a cada sócia PJ que
    // muda de sede travaria o interruptor do evento inteiro por uma divergência
    // que a resolução homologada nem sabe escrever.
    const pf = x.tipoPessoa === 'PF' && y.tipoPessoa === 'PF';
    const socio = antesP.socio && depoisP.socio;
    const homologavel = pf && socio;
    const doEndereco = homologavel
      ? mudaram.filter((k) => (CAMPOS_DE_ENDERECO_PESSOA as readonly string[]).includes(k))
      : [];
    if (doEndereco.length > 0) {
      const antes = camposDe(x as Record<string, unknown>, CAMPOS_DE_ENDERECO_PESSOA);
      const depois = camposDe(y as Record<string, unknown>, CAMPOS_DE_ENDERECO_PESSOA);
      // O endereço tem de ser conhecido nos DOIS estados e preenchido no atual:
      // sem o "antes" não há o que alterar, e com o "depois" vazio a resolução
      // publicaria uma qualificação sem domicílio.
      const problemas = [
        ...CAMPOS_DE_ENDERECO_PESSOA.filter((k) => !conhecido(antes[k]))
          .map((k) => `Endereco de ${nome}: ${k} desconhecido no instrumento registrado.`),
        ...CAMPOS_DE_ENDERECO_PESSOA.filter((k) => !preenchido(depois[k]))
          .map((k) => `Endereco de ${nome}: ${k} vazio no cadastro atual.`),
      ];
      candidatos.push(criarCandidato(`enderecoSocio:${id}`, 'enderecoSocio', antes, depois, problemas,
        `Endereço de ${nome}: ${antes.endereco ?? '(desconhecido)'} -> ${depois.endereco ?? '(desconhecido)'}`));
      pendencias.push(...problemas);
    }

    // --- Resíduo: tudo o que continua sem modelo nem decisão homologados -----
    const residuais = mudaram.filter((k) => !doEndereco.includes(k));
    if (residuais.length === 0) continue;
    const faltantes = residuais.filter((k) => x[k] === null || y[k] === null);
    const problemas = ['Qualificacao detectada, sem autorizacao juridica ou modelo homologado.',
      ...faltantes.map((k) => `Qualificacao ${id}: ${k} desconhecido em um dos estados.`)];
    if (!homologavel && residuais.some((k) => (CAMPOS_DE_ENDERECO_PESSOA as readonly string[]).includes(k))) {
      problemas.push(pf
        ? `Endereco de ${nome}: a pessoa nao consta no quadro societario dos dois estados; a resolucao homologada e a de socio.`
        : `Endereco de ${nome}: so o endereco de socio pessoa fisica esta homologado.`);
    }
    candidatos.push(criarCandidato(`qualificacao:${id}`, 'qualificacao', x, y, problemas,
      `Qualificacao ${id}: ${residuais.join(', ')}`));
    pendencias.push(...problemas);
  }
  return { candidatos: candidatos.sort((x, y) => x.id.localeCompare(y.id)),
    pendencias: [...new Set(pendencias)].sort() };
}

export interface ArgsDaConfirmacao {
  baseDocumentoId: string;
  base: SnapshotDados;
  atual: SnapshotDados;
  /** Candidatos confirmados; vazio quando a peça não leva evento deste módulo. */
  selecionados: string[];
  causaSede: CausaSede;
  /**
   * Opcional para as propostas gravadas ANTES de a qualificação existir: elas
   * não selecionaram endereço de sócio nenhum, e a causa jamais é consultada
   * para elas (só a seleção de `enderecoSocio` a exige).
   */
  causaQualificacao?: CausaQualificacao;
  confirmadoEm: string;
  eventosConfirmados?: string[];
  movimentosConfirmados?: string[];
}

/** O id da pessoa dentro do id do candidato de endereço. */
export function pessoaDoCandidatoDeEndereco(id: string): string | null {
  return id.startsWith('enderecoSocio:') ? id.slice('enderecoSocio:'.length) : null;
}

/**
 * Escreve, NO LUGAR, o endereço aprovado em todas as ocorrências das pessoas
 * confirmadas — quadro societário, administração, assinaturas, bindings
 * unitários — e recalcula a prosa derivada da qualificação.
 *
 * Todas as ocorrências, e não só a do quadro, porque uma parte tem UMA
 * qualificação no instrumento: publicar o domicílio novo na cláusula de capital
 * e o antigo na de administração seria o mesmo defeito que a comparação por
 * papel já denuncia como "qualificacao inconsistente entre papeis".
 *
 * Recalcular `qualificacao` é o que impede o consolidado de seguir imprimindo o
 * endereço velho: a prosa é derivada, foi congelada na base com o valor de lá, e
 * trocar só o campo atômico deixaria os dois em desacordo dentro da mesma peça.
 *
 * POR QUE O CPF ENTRA AQUI, se o resto do módulo diz que identidade é o id.
 * ------------------------------------------------------------------
 * Porque nem toda ocorrência tem id — e a que não tem é sempre a mesma: a do
 * ACERVO. O estado sobre o qual esta função escreve nasce da BASE, que é o
 * snapshot da peça registrada; peça registrada antes de a proveniência passar a
 * sobreviver ao JSON (ver origem.ts) não guardou identidade em `administradores`
 * nem em `signatarios`, e nunca vai guardar — reescrever esse jsonb é alterar o
 * que o documento diz que disse.
 *
 * Foi medido: exigir id aqui fazia a peça sair com o endereço novo no preâmbulo
 * e na cláusula de capital, e o ANTIGO na cláusula de administração — exatamente
 * o defeito que o parágrafo acima diz evitar. Tirar o casamento por CPF hoje
 * REGRIDE, e a prova é o teste "aplica tambem na ocorrencia SEM id, reconhecida
 * pelo CPF do mesmo estado" (alteracaoPorEventos.test.ts), que falha sem ele.
 *
 * Em peça NOVA ele já não é acionado: toda ocorrência de pessoa carrega
 * identidade, e o casamento se resolve pelo id. O fallback fica pelo acervo, e é
 * por ele que ele sai um dia — quando não houver mais base sem identidade.
 *
 * O CPF não decide identidade; ele apenas RECONHECE, dentro do mesmo estado, uma
 * segunda ocorrência de quem já foi identificado por id na lista de sócios. É
 * diferente do que `analisarAlteracao` recusa, que é usar CPF para afirmar
 * ingresso ou retirada entre DOIS estados. Aqui não se conclui nada sobre quem
 * entrou ou saiu: aplica-se um valor já aprovado a outra aparição da mesma
 * pessoa, e o CPF lido é o do próprio estado, não o do cadastro de hoje.
 *
 * Ocorrência sem id e sem CPF não recebe nada, como antes.
 */
export function aplicarEnderecosDeSocios(
  estado: SnapshotDados,
  candidatos: readonly CandidatoAC[],
): void {
  const aprovados = new Map<string, CamposAC>();
  for (const c of candidatos) {
    const alvo = pessoaDoCandidatoDeEndereco(c.id);
    if (c.tipo === 'enderecoSocio' && alvo) aprovados.set(alvo, c.depois);
  }
  if (aprovados.size === 0) return;
  const ocs = ocorrencias(estado);
  // O CPF de cada pessoa aprovada, lido das ocorrências que TÊM id. É o que
  // permite reconhecer as que não têm, na passada seguinte.
  const pessoaPorCpf = new Map<string, string>();
  for (const o of ocs) {
    if (o.sociedade || !o.id || !aprovados.has(o.id)) continue;
    const cpf = digitosDe(o.campos.cpfCnpj);
    if (cpf) pessoaPorCpf.set(cpf, o.id);
  }
  for (const o of ocs) {
    if (o.sociedade) continue;
    const alvo = o.id ?? pessoaPorCpf.get(digitosDe(o.campos.cpfCnpj)) ?? null;
    const depois = alvo ? aprovados.get(alvo) : undefined;
    if (!depois) continue;
    let tocou = false;
    for (const [k, v] of Object.entries(depois)) {
      if (v !== null && k in o.campos) { o.campos[k] = v; tocou = true; }
    }
    if (!tocou) continue;
    const texto = Object.fromEntries(
      Object.entries(o.campos).filter(([, v]) => typeof v === 'string'),
    ) as Record<string, string>;
    for (const [k, v] of Object.entries(derivarCampos('pessoa', texto))) {
      if (k in o.campos) o.campos[k] = v;
    }
  }
  // Valores livres pontilhados sobrescrevem o binding no montarContexto.
  for (const [binding, campos] of Object.entries(estado.selecao)) {
    const id = idDoRegistro(campos) ?? estado.registroPorBinding[binding];
    const depois = id ? aprovados.get(id) : undefined;
    if (!depois) continue;
    for (const [k, v] of Object.entries(depois)) {
      const caminho = `${binding}.${k}`;
      if (caminho in estado.valoresLivres && v !== null) estado.valoresLivres[caminho] = v;
    }
  }
}

/** As causas de qualificação que a Biblioteca sabe escrever. */
export const CAUSAS_QUALIFICACAO_HOMOLOGADAS: readonly CausaQualificacao[] =
  ['mudanca_de_domicilio', 'atualizacao_postal'];

/**
 * Valida a seleção e produz a proposta. Lança quando a seleção não pode ser
 * gerada: candidato desconhecido, fora do recorte, com pendências, ou causa não
 * homologada. Cada causa só é exigida quando a matéria dela está selecionada.
 */
export function confirmarPropostaAC(args: ArgsDaConfirmacao): PropostaAC {
  if (!args.baseDocumentoId.trim() || !args.confirmadoEm.trim() || !Number.isFinite(Date.parse(args.confirmadoEm))) {
    throw new Error('Documento-base e instante de confirmacao validos sao obrigatorios.');
  }
  if (new Set(args.selecionados).size !== args.selecionados.length) {
    throw new Error('Selecao com IDs duplicados.');
  }
  const { candidatos, pendencias } = analisarAlteracao(args.base, args.atual);
  const selecionados = args.selecionados.map((id) => candidatos.find((c) => c.id === id));
  if (selecionados.some((c) => !c || c.tipo === 'qualificacao')) {
    throw new Error('Selecao desconhecida ou fora do recorte homologado (sede e endereco de socio pessoa fisica).');
  }
  const causaQualificacao = args.causaQualificacao ?? 'mudanca_de_domicilio';
  const sede = selecionados.find((c) => c?.tipo === 'sede');
  const enderecos = selecionados.filter((c): c is CandidatoAC => c?.tipo === 'enderecoSocio');
  if (sede) {
    if (!sede.elegivel) {
      throw new Error(`A sede nao pode ser gerada: ${sede.pendencias.join(' ')}`);
    }
    if (args.causaSede !== 'mudanca_fisica') {
      throw new Error('Somente mudanca fisica da sede esta homologada; atualizacao postal e erro material estao bloqueados.');
    }
  }
  if (enderecos.length > 0) {
    const travado = enderecos.find((c) => !c.elegivel);
    if (travado) {
      throw new Error(`O endereco de socio nao pode ser gerado: ${travado.pendencias.join(' ')}`);
    }
    if (!CAUSAS_QUALIFICACAO_HOMOLOGADAS.includes(causaQualificacao)) {
      throw new Error('Correcao de erro do instrumento anterior nao esta homologada para a qualificacao: e retificacao com alvo historico.');
    }
  }
  const estadoProposto = clone(args.base);
  if (sede) {
    for (const o of ocorrencias(estadoProposto)) {
      if (o.id !== args.base.empresaId) continue;
      for (const [k, v] of Object.entries(sede.depois)) {
        if (v !== null && (o.sociedade || k in o.campos)) o.campos[k] = v;
      }
    }
    // Valores livres pontilhados podem sobrescrever o binding no montarContexto.
    for (const [binding, campos] of Object.entries(estadoProposto.selecao)) {
      const id = idDoRegistro(campos) ?? estadoProposto.registroPorBinding[binding]
        ?? (binding === 'sociedade' ? estadoProposto.empresaId : null);
      if (id !== estadoProposto.empresaId) continue;
      for (const [k, v] of Object.entries(sede.depois)) {
        const caminho = `${binding}.${k}`;
        if (caminho in estadoProposto.valoresLivres && v !== null) estadoProposto.valoresLivres[caminho] = v;
      }
    }
  }
  aplicarEnderecosDeSocios(estadoProposto, enderecos);
  return clone({ versao: 1, baseDocumentoId: args.baseDocumentoId, base: args.base,
    candidatos, pendencias, selecionados: args.selecionados, causaSede: args.causaSede,
    causaQualificacao,
    eventosConfirmados: [...new Set(args.eventosConfirmados ?? [])].sort(),
    movimentosConfirmados: [...new Set(args.movimentosConfirmados ?? [])].sort(),
    estadoProposto, confirmadoEm: args.confirmadoEm });
}

/**
 * A proposta confirmada ainda descreve o cadastro de hoje? Falso quando nada
 * relevante mudou; verdadeiro quando um valor confirmado mudou, um candidato
 * novo apareceu, uma pendência mudou ou (quando informado) o conjunto de
 * movimentos abrangidos não é mais o mesmo. Reordenar listas e trocar
 * formatação não pedem revisão.
 */
export function propostaPrecisaRevisao(
  proposta: PropostaAC,
  atual: SnapshotDados,
  movimentosAtuais?: readonly string[],
): boolean {
  try {
    const refeita = confirmarPropostaAC({ ...proposta, atual });
    if (refeita.candidatos.length !== proposta.candidatos.length) return true;
    if (refeita.candidatos.some((c) => proposta.candidatos.find((p) => p.id === c.id)?.fingerprint !== c.fingerprint)) return true;
    if (movimentosAtuais) {
      const agora = [...new Set(movimentosAtuais)].sort();
      if (JSON.stringify(agora) !== JSON.stringify(proposta.movimentosConfirmados ?? [])) return true;
    }
    // Novas identidades ambiguas ou ocorrencias ausentes tambem exigem conferencia.
    return JSON.stringify(refeita.pendencias) !== JSON.stringify(proposta.pendencias);
  } catch {
    return true;
  }
}
