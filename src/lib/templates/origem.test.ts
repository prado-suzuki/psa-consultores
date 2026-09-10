import { describe, it, expect } from 'vitest';
import { CHAVE_ORIGEM_ID, CHAVE_ORIGEM_TIPO, comOrigem, copiarOrigemProfunda, idDoRegistro, origemDe } from './origem';

/** O round-trip que o `snapshot_dados` (jsonb) faz com o contexto. */
const peloJson = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

describe('comOrigem / origemDe', () => {
  it('anexa e lê a origem do objeto', () => {
    const campos = comOrigem({ nome: 'Ana' }, { tipo: 'pessoa', id: 'p1' });
    expect(origemDe(campos)).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  it('devolve undefined para valores sem origem (objeto, primitivo, null)', () => {
    expect(origemDe({ nome: 'Ana' })).toBeUndefined();
    expect(origemDe('Ana')).toBeUndefined();
    expect(origemDe(null)).toBeUndefined();
    expect(origemDe(undefined)).toBeUndefined();
  });

  it('sobrevive a spread — o caminho de derivarCampos e da edição manual', () => {
    const campos = comOrigem({ nome: 'Ana' }, { tipo: 'pessoa', id: 'p1' });
    const copia = { ...campos, nome: 'Ana Maria' };
    expect(origemDe(copia)).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  // A RAZÃO DE SER DA MIGRAÇÃO. Enquanto a origem era Symbol, estas três cópias
  // a descartavam em silêncio, e o snapshot do documento saía sem a identidade
  // das entidades que ele cita.
  it('sobrevive a JSON.stringify, a JSON.parse e a structuredClone', () => {
    const campos = comOrigem({ nome: 'Ana' }, { tipo: 'pessoa', id: 'p1' });
    expect(origemDe(peloJson(campos))).toEqual({ tipo: 'pessoa', id: 'p1' });
    expect(origemDe(structuredClone(campos))).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  it('as chaves são as reservadas do motor, e o valor de cada uma é string (Campos intacto)', () => {
    const campos = comOrigem({ nome: 'Ana' }, { tipo: 'pessoa', id: 'p1' });
    expect(Object.keys(campos).sort()).toEqual([CHAVE_ORIGEM_ID, CHAVE_ORIGEM_TIPO, 'nome'].sort());
    for (const valor of Object.values(campos)) expect(typeof valor).toBe('string');
  });

  it('par pela metade não é origem: sem tipo, sem id, ou com qualquer um em branco', () => {
    expect(origemDe({ [CHAVE_ORIGEM_ID]: 'p1' })).toBeUndefined();
    expect(origemDe({ [CHAVE_ORIGEM_TIPO]: 'pessoa' })).toBeUndefined();
    expect(origemDe({ [CHAVE_ORIGEM_TIPO]: 'pessoa', [CHAVE_ORIGEM_ID]: '  ' })).toBeUndefined();
    expect(origemDe({ [CHAVE_ORIGEM_TIPO]: '', [CHAVE_ORIGEM_ID]: 'p1' })).toBeUndefined();
  });
});

describe('idDoRegistro', () => {
  it('lê a identidade da chave reservada', () => {
    expect(idDoRegistro(comOrigem({ nome: 'Ana' }, { tipo: 'pessoa', id: 'p1' }))).toBe('p1');
  });

  // O ACERVO: peça registrada antes desta migração gravava a identidade da
  // pessoa e da sociedade num campo `id` avulso, e continua assim para sempre.
  it('cai para o `id` avulso dos snapshots antigos', () => {
    expect(idDoRegistro({ id: 'p1', nome: 'Ana' })).toBe('p1');
  });

  it('a chave reservada vence o `id` avulso quando os dois existem', () => {
    expect(idDoRegistro(comOrigem({ id: 'antigo' }, { tipo: 'pessoa', id: 'novo' }))).toBe('novo');
  });

  it('null quando não há identidade nenhuma', () => {
    expect(idDoRegistro({ nome: 'Ana' })).toBeNull();
    expect(idDoRegistro({ id: '   ' })).toBeNull();
    expect(idDoRegistro('Ana')).toBeNull();
    expect(idDoRegistro(null)).toBeNull();
  });
});

describe('copiarOrigemProfunda', () => {
  const vivo = () => ({
    socios: [
      { socio: comOrigem({ nome: 'Ana' }, { tipo: 'pessoa', id: 'p1' }), sePF: true },
      { socio: comOrigem({ nome: 'ACME' }, { tipo: 'pessoa', id: 'p2' }), sePF: false },
    ],
  });

  /** O snapshot do ACERVO: identidade só no `id` avulso, sem as chaves reservadas. */
  const legado = () => ({
    socios: [
      { socio: { id: 'p1', nome: 'Ana' }, sePF: true },
      { socio: { id: 'p2', nome: 'ACME' }, sePF: false },
    ],
  });

  it('religa a origem de um snapshot legado casando pelo `id` que ele guarda', () => {
    const destino = legado();
    expect(origemDe(destino.socios[0].socio)).toBeUndefined();

    copiarOrigemProfunda(destino, vivo());

    expect(origemDe(destino.socios[0].socio)).toEqual({ tipo: 'pessoa', id: 'p1' });
    expect(origemDe(destino.socios[1].socio)).toEqual({ tipo: 'pessoa', id: 'p2' });
  });

  // O DEFEITO QUE O CASAMENTO POR ÍNDICE TINHA. A ordem do quadro mudou entre a
  // validação e hoje; por índice, Ana receberia a origem de ACME e vice-versa,
  // e o valor da prévia abriria o cadastro da pessoa errada.
  it('não casa por posição: item que trocou de lugar recebe a SUA origem', () => {
    const destino = legado();
    destino.socios.reverse();

    copiarOrigemProfunda(destino, vivo());

    expect(origemDe(destino.socios[0].socio)).toEqual({ tipo: 'pessoa', id: 'p2' });
    expect(origemDe(destino.socios[1].socio)).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  it('formas divergentes (o cadastro mudou) não quebram nem inventam origem', () => {
    const destino = { socios: [legado().socios[0]], administradores: [{ administrador: { nome: 'Sem id' } }] };
    expect(() => copiarOrigemProfunda(destino, vivo())).not.toThrow();
    expect(origemDe(destino.socios[0].socio)).toEqual({ tipo: 'pessoa', id: 'p1' });
    expect(origemDe(destino.administradores[0].administrador)).toBeUndefined();
  });

  it('snapshot NOVO já vem com a origem: a passada é inócua e idempotente', () => {
    const destino = peloJson(vivo());
    const antes = JSON.stringify(destino);
    copiarOrigemProfunda(destino, vivo());
    copiarOrigemProfunda(destino, vivo());
    expect(JSON.stringify(destino)).toBe(antes);
    expect(origemDe(destino.socios[0].socio)).toEqual({ tipo: 'pessoa', id: 'p1' });
  });

  // `pessoa` e `sociedade` saem da MESMA tabela, então o mesmo id pode aparecer
  // com dois tipos. Sem o tipo no destino, escolher seria adivinhar.
  it('id ambíguo na fonte (dois tipos) não carimba nada', () => {
    const fonte = {
      a: comOrigem({ nome: 'ACME' }, { tipo: 'pessoa', id: 'x1' }),
      b: comOrigem({ razaoSocial: 'ACME' }, { tipo: 'sociedade', id: 'x1' }),
    };
    const destino = { a: { id: 'x1', nome: 'ACME' } };
    copiarOrigemProfunda(destino, fonte);
    expect(origemDe(destino.a)).toBeUndefined();
  });

  it('não entra em laço infinito com referências cíclicas (refItem das integralizações)', () => {
    const fonteItem: Record<string, unknown> = { imovel: comOrigem({ n: '1' }, { tipo: 'matricula', id: 'm1' }) };
    fonteItem.refItem = fonteItem; // ciclo
    const destinoItem: Record<string, unknown> = { imovel: { id: 'm1', n: '1' } };
    destinoItem.refItem = destinoItem;

    expect(() => copiarOrigemProfunda(destinoItem, fonteItem)).not.toThrow();
    expect(origemDe(destinoItem.imovel)).toEqual({ tipo: 'matricula', id: 'm1' });
  });

  // NÃO-OBJETIVO DECLARADO: matrícula, bem e cartório de peça anterior a esta
  // frente não gravaram identidade nenhuma, e nada aqui a inventa. O acervo
  // segue sem origem, de propósito — o casamento por índice que existia antes
  // "acertava" esses casos alinhando listas pela posição, que é adivinhação.
  it('DOCUMENTAL: destino sem identidade alguma fica sem origem', () => {
    const destino = { imoveis: [{ imovel: { numero: '2.628' } }] };
    copiarOrigemProfunda(destino, { imoveis: [{ imovel: comOrigem({ numero: '2.628' }, { tipo: 'matricula', id: 'm1' }) }] });
    expect(origemDe(destino.imoveis[0].imovel)).toBeUndefined();
  });
});
