import { describe, expect, it } from 'vitest';
import type { SnapshotDados } from '@/hooks/useDocumentoGerado';
import { analisarAlteracao, confirmarPropostaAC, propostaPrecisaRevisao, type CandidatoAC, type CausaQualificacao } from '@/lib/osg/alteracaoPorEventos';

// Dados sinteticos para o contrato do dominio, nao fixture juridica homologada.
function snapshot(): SnapshotDados {
  return {
    empresaId: 'empresa-1',
    selecao: { sociedade: {
      id: 'empresa-1', razaoSocial: 'Empresa de teste', objeto: 'Objeto registrado',
      sede: 'Rua A, 10, Centro, Cuiaba, MT, CEP 78000-000',
      sedeLogradouro: 'Rua A', sedeNumero: '10', sedeComplemento: '',
      sedeBairro: 'Centro', sedeMunicipio: 'Cuiaba', sedeUf: 'MT', sedeCep: '78000-000',
      sedeEndereco: 'Rua A, 10', sedeUfExtenso: 'Mato Grosso', capitalValor: '100,00',
    } },
    registroPorBinding: { sociedade: 'empresa-1' },
    registrosPorLista: { imoveis: ['imovel-1'] },
    valoresLivres: { clausulaEspecial: 'Preservada', 'sociedade.sede': 'Rua A, 10, Centro, Cuiaba, MT, CEP 78000-000' },
    itensPorLista: {
      socios: [{ pessoa: { id: 'pessoa-1', cpfCnpj: '123.456.789-00', nome: 'Ana', profissao: 'Medica' }, quotas: '100' }],
      administradores: [{ pessoa: { id: 'pessoa-1', cpfCnpj: '123.456.789-00', nome: 'Ana', profissao: 'Medica' } }],
      imoveis: [{ imovel: { id: 'imovel-1', descricao: 'Descricao registrada', valor: '100,00' } }],
      memoriais: [{ texto: 'Memorial registrado' }],
      movimentos: [],
    },
    total: { quotas: '100', vlrTotal: '100,00', percentual: '100' },
  };
}

function mudanca(base = snapshot()): SnapshotDados {
  const atual = structuredClone(base);
  Object.assign(atual.selecao.sociedade, {
    sede: 'Rua B, 20, Centro, Cuiaba, MT, CEP 78000-000',
    sedeLogradouro: 'Rua B', sedeNumero: '20', sedeEndereco: 'Rua B, 20',
  });
  atual.valoresLivres['sociedade.sede'] = atual.selecao.sociedade.sede;
  return atual;
}

const pessoa = (s: SnapshotDados, lista = 'socios') => s.itensPorLista[lista][0].pessoa as Record<string, string>;
const confirmar = (base: SnapshotDados, atual: SnapshotDados, selecionados = ['sede:empresa-1']) =>
  confirmarPropostaAC({ baseDocumentoId: 'documento-1', base, atual, selecionados,
    causaSede: 'mudanca_fisica', confirmadoEm: '2026-09-08T15:00:00Z' });

describe('alteracao por eventos: recorte de sede', () => {
  it('detecta valores estruturados e permite sede no mesmo municipio e UF', () => {
    const base = snapshot();
    const atual = mudanca(base);
    const { candidatos, pendencias } = analisarAlteracao(base, atual);
    expect(pendencias).toEqual([]);
    expect(candidatos).toHaveLength(1);
    expect(candidatos[0]).toMatchObject({ id: 'sede:empresa-1', tipo: 'sede', elegivel: true,
      flagNome: 'evento_alteracao_endereco', antes: { sedeNumero: '10' }, depois: { sedeNumero: '20' } });
    expect(candidatos[0].fingerprint).not.toBe('');
  });

  it('aplica so sede, nao profissao, capital, movimentos ou materiais vivos', () => {
    const base = snapshot();
    const atual = mudanca(base);
    pessoa(atual).profissao = 'Engenheira';
    pessoa(atual, 'administradores').profissao = 'Engenheira';
    atual.selecao.sociedade.capitalValor = '200,00';
    atual.selecao.sociedade.objeto = 'Objeto novo';
    atual.itensPorLista.movimentos.push({ id: 'movimento-novo', tipo: 'aporte' });
    atual.itensPorLista.imoveis = [];
    atual.itensPorLista.memoriais = [{ texto: 'Memorial vivo' }];
    atual.total = null;
    const proposta = confirmar(base, atual);
    expect(proposta.estadoProposto.itensPorLista).toEqual(base.itensPorLista);
    expect(proposta.estadoProposto.total).toEqual(base.total);
    expect(proposta.estadoProposto.registrosPorLista).toEqual(base.registrosPorLista);
    expect(proposta.estadoProposto.selecao.sociedade).toEqual({ ...base.selecao.sociedade,
      sede: atual.selecao.sociedade.sede, sedeLogradouro: 'Rua B', sedeNumero: '20', sedeEndereco: 'Rua B, 20' });
    expect(proposta.estadoProposto.valoresLivres['sociedade.sede']).toBe(atual.selecao.sociedade.sede);
    expect(proposta.candidatos.map((c) => c.tipo).sort()).toEqual(['qualificacao', 'sede']);
    expect(propostaPrecisaRevisao(proposta, atual)).toBe(false);
  });

  it('atualiza bindings e ocorrencias da mesma fonte sem alterar outras sociedades', () => {
    const base = snapshot();
    base.selecao.empresa = { ...base.selecao.sociedade };
    base.itensPorLista.partes = [{ sociedade: { ...base.selecao.sociedade } },
      { sociedade: { ...base.selecao.sociedade, id: 'outra-empresa' } }];
    const atual = mudanca(base);
    atual.selecao.empresa = { ...atual.selecao.sociedade };
    atual.itensPorLista.partes[0].sociedade = { ...atual.selecao.sociedade };
    const estado = confirmar(base, atual).estadoProposto;
    expect(estado.selecao.empresa.sedeNumero).toBe('20');
    expect(estado.itensPorLista.partes[0].sociedade).toEqual(estado.selecao.sociedade);
    expect(estado.itensPorLista.partes[1]).toEqual(base.itensPorLista.partes[1]);
  });

  it.each(['sedeLogradouro', 'sedeNumero', 'sedeComplemento', 'sedeMunicipio', 'sedeUf', 'sedeCep'])(
    'bloqueia base desconhecida em %s, sem inferir da prosa', (campo) => {
      const base = snapshot();
      const atual = mudanca(base);
      delete base.selecao.sociedade[campo];
      expect(analisarAlteracao(base, atual).candidatos[0].elegivel).toBe(false);
      expect(() => confirmar(base, atual)).toThrow();
    });

  it('diferencia complemento desconhecido de vazio explicitamente conhecido', () => {
    const base = snapshot();
    const atual = mudanca(base);
    delete atual.selecao.sociedade.sedeComplemento;
    expect(analisarAlteracao(base, atual).candidatos[0].depois.sedeComplemento).toBeNull();
    expect(() => confirmar(base, atual)).toThrow();
    atual.selecao.sociedade.sedeComplemento = '';
    expect(() => confirmar(base, atual)).not.toThrow();
  });

  it.each(['sedeMunicipio', 'sedeUf'])('bloqueia mudanca de %s', (campo) => {
    const base = snapshot();
    const atual = mudanca(base);
    atual.selecao.sociedade[campo] = 'Outro';
    expect(() => confirmar(base, atual)).toThrow();
  });

  it.each(['atualizacao_postal', 'erro_material'] as const)('nao autoriza causa %s', (causaSede) => {
    const base = snapshot();
    expect(() => confirmarPropostaAC({ ...confirmar(base, mudanca(base)), atual: mudanca(base), causaSede })).toThrow(/homologada/);
  });

  it('normaliza caixa, espacos e mascaras, e suprime A-B-A', () => {
    const base = snapshot();
    const atual = structuredClone(base);
    atual.selecao.sociedade.sede = '  RUA A, 10, CENTRO, CUIABA, MT, CEP 78000000  ';
    atual.selecao.sociedade.sedeCep = '78000000';
    pessoa(atual).cpfCnpj = '12345678900';
    pessoa(atual).nome = ' ANA  ';
    expect(analisarAlteracao(base, atual).candidatos).toEqual([]);
    expect(analisarAlteracao(base, mudanca(base)).candidatos).toHaveLength(1);
    expect(analisarAlteracao(base, base).candidatos).toEqual([]);
  });

  it('CPF corrigido com id estavel e um candidato de qualificacao entre papeis, nunca ingresso', () => {
    const base = snapshot();
    const atual = structuredClone(base);
    pessoa(atual).cpfCnpj = '98765432100';
    pessoa(atual, 'administradores').cpfCnpj = '98765432100';
    const { candidatos } = analisarAlteracao(base, atual);
    expect(candidatos).toHaveLength(1);
    expect(candidatos[0]).toMatchObject({ id: 'qualificacao:pessoa-1', tipo: 'qualificacao', elegivel: false });
    expect(() => confirmar(base, atual, [candidatos[0].id])).toThrow();
  });

  it('CPF sem id nao estabelece identidade mesmo quando igual', () => {
    const base = snapshot();
    delete pessoa(base).id;
    delete pessoa(base, 'administradores').id;
    const atual = structuredClone(base);
    pessoa(atual).profissao = 'Engenheira';
    const analise = analisarAlteracao(base, atual);
    expect(analise.candidatos).toEqual([]);
    expect(analise.pendencias.join(' ')).toContain('sem id estavel');
  });

  it('usa registroPorBinding como identidade, nao nome ou CPF', () => {
    const base = snapshot();
    base.selecao.outorgante = { cpfCnpj: '11111111111', nome: 'Bia', profissao: 'Medica' };
    base.registroPorBinding.outorgante = 'pessoa-2';
    const atual = structuredClone(base);
    atual.selecao.outorgante.cpfCnpj = '22222222222';
    expect(analisarAlteracao(base, atual).candidatos[0].id).toBe('qualificacao:pessoa-2');
  });

  it('detecta pessoa identificada mesmo com CPF desconhecido e nao confunde desconhecido com vazio', () => {
    const base = snapshot();
    for (const lista of ['socios', 'administradores']) delete pessoa(base, lista).cpfCnpj;
    const atual = structuredClone(base);
    for (const lista of ['socios', 'administradores']) pessoa(atual, lista).cpfCnpj = '';
    const candidato = analisarAlteracao(base, atual).candidatos[0];
    expect(candidato.antes.cpfCnpj).toBeNull();
    expect(candidato.depois.cpfCnpj).toBe('');
    expect(candidato.elegivel).toBe(false);
  });

  it('pendencia conhecida de qualificacao nao invalida imediatamente a proposta de sede', () => {
    const base = snapshot();
    delete pessoa(base).id;
    const atual = mudanca(base);
    const proposta = confirmar(base, atual);
    expect(proposta.pendencias.join(' ')).toContain('sem id estavel');
    expect(propostaPrecisaRevisao(proposta, atual)).toBe(false);
    atual.selecao.sociedade.sedeComplemento = 'Sala 2';
    expect(propostaPrecisaRevisao(proposta, atual)).toBe(true);
  });

  it('nao transforma objeto, capital ou movimentos em candidatos deste recorte', () => {
    const base = snapshot();
    const atual = structuredClone(base);
    atual.selecao.sociedade.objeto = 'Novo objeto';
    atual.selecao.sociedade.capitalValor = '999,00';
    atual.itensPorLista.movimentos = [{ id: 'cessao-1', tipo: 'cessao' }];
    expect(analisarAlteracao(base, atual).candidatos).toEqual([]);
  });

  // `endereco` continua aqui porque a pessoa deste fixture nao declara
  // `tipoPessoa`: sem saber que e pessoa fisica, o endereco nao e homologavel e
  // volta ao residuo. O recorte homologado tem describe proprio, abaixo.
  it.each(['profissao', 'estadoCivil', 'rg', 'dataNascimento', 'endereco'])('detecta %s sem homologar', (campo) => {
    const base = snapshot();
    const atual = mudanca(base);
    pessoa(atual)[campo] = 'Novo valor';
    pessoa(atual, 'administradores')[campo] = 'Novo valor';
    const candidato = analisarAlteracao(base, atual).candidatos.find((c) => c.tipo === 'qualificacao')!;
    expect(candidato.elegivel).toBe(false);
    expect(() => confirmar(base, atual, ['sede:empresa-1', candidato.id])).toThrow();
  });

  it.each([['inexistente'], ['sede:empresa-1', 'sede:empresa-1'], ['evento_aumento_capital']].map((ids) => ({ ids })))(
    'rejeita selecao invalida $ids', ({ ids }) => {
      const base = snapshot();
      expect(() => confirmar(base, mudanca(base), ids)).toThrow();
    });

  it('selecao vazia e valida: a peca pode levar so eventos de outros modulos, e o estado e a base', () => {
    const base = snapshot();
    const atual = mudanca(base);
    const proposta = confirmarPropostaAC({ baseDocumentoId: 'documento-1', base, atual, selecionados: [],
      causaSede: 'atualizacao_postal', confirmadoEm: '2026-09-08T15:00:00Z',
      eventosConfirmados: ['evento_aumento_capital', 'evento_aumento_capital'], movimentosConfirmados: ['m2', 'm1'] });
    expect(proposta.estadoProposto).toEqual(base);
    expect(proposta.candidatos.find((c) => c.tipo === 'sede')).toBeDefined();
    expect(proposta.eventosConfirmados).toEqual(['evento_aumento_capital']);
    expect(proposta.movimentosConfirmados).toEqual(['m1', 'm2']);
    // Sem sede selecionada a causa nao e exigida; a divergencia continua como candidato.
    expect(propostaPrecisaRevisao(proposta, atual)).toBe(false);
    expect(propostaPrecisaRevisao(proposta, atual, ['m1', 'm2'])).toBe(false);
    expect(propostaPrecisaRevisao(proposta, atual, ['m1', 'm2', 'm3'])).toBe(true);
  });

  it('sede marcada sem elegibilidade nao confirma, com o motivo', () => {
    const base = snapshot();
    const atual = mudanca(base);
    delete atual.selecao.sociedade.sedeComplemento;
    expect(() => confirmar(base, atual)).toThrow(/sedeComplemento/);
  });

  it('exige revisao para novos valores, candidatos, identidades, escopo e retorno a base', () => {
    const base = snapshot();
    const atual = mudanca(base);
    const proposta = confirmar(base, atual);
    expect(propostaPrecisaRevisao(proposta, atual)).toBe(false);
    expect(propostaPrecisaRevisao(proposta, base)).toBe(true);
    for (const alterar of [
      (s: SnapshotDados) => { s.selecao.sociedade.sedeNumero = '30'; },
      (s: SnapshotDados) => { pessoa(s).profissao = 'Outra'; },
      (s: SnapshotDados) => { delete pessoa(s).id; },
      (s: SnapshotDados) => { s.selecao.novoBinding = { ...s.selecao.sociedade }; },
      (s: SnapshotDados) => { s.empresaId = 'outra'; },
    ]) {
      const novo = structuredClone(atual);
      alterar(novo);
      expect(propostaPrecisaRevisao(proposta, novo)).toBe(true);
    }
  });

  it('reordenar listas e formatar nao pede revisao; materia fora do recorte nao e copiada', () => {
    const base = snapshot();
    base.itensPorLista.socios.push({ pessoa: { id: 'pessoa-2', nome: 'Bia', cpfCnpj: '11111111111' } });
    const atual = mudanca(base);
    const proposta = confirmar(base, atual);
    atual.itensPorLista.socios.reverse();
    atual.selecao.sociedade.sedeCep = '78000000';
    atual.selecao.sociedade.sedeLogradouro = ' RUA  B ';
    atual.itensPorLista.movimentos.push({ id: 'novo' });
    expect(propostaPrecisaRevisao(proposta, atual)).toBe(false);
    expect(proposta.estadoProposto.itensPorLista.movimentos).toEqual([]);
  });

  it('preserva historico, nao compartilha referencias e aceita chaves reservadas de proveniencia', () => {
    const base = snapshot();
    const atual = mudanca(base);
    Object.defineProperty(base.selecao.sociedade, Symbol('origem'), { value: { id: 'empresa-1' }, enumerable: true });
    const copia = JSON.parse(JSON.stringify(base));
    const proposta = confirmar(base, atual);
    expect(base).toMatchObject(copia);
    expect(proposta.base).toEqual(copia);
    expect(JSON.parse(JSON.stringify(proposta))).toEqual(proposta);
    atual.selecao.sociedade.sedeNumero = '999';
    proposta.estadoProposto.itensPorLista.socios.splice(0);
    expect(base.itensPorLista.socios).toHaveLength(1);
    expect(proposta.base.itensPorLista.socios).toHaveLength(1);
    expect(proposta.candidatos.find((c) => c.tipo === 'sede')!.depois.sedeNumero).toBe('20');
  });

  it('base registrada antes das partes atomicas compara por sedeEndereco, sem inferir da prosa', () => {
    const base = snapshot();
    for (const k of ['sedeLogradouro', 'sedeNumero', 'sedeComplemento']) delete base.selecao.sociedade[k];
    const atual = mudanca(base);
    atual.selecao.sociedade.sedeComplemento = '';
    const { candidatos, pendencias } = analisarAlteracao(base, atual);
    expect(pendencias).toEqual([]);
    expect(candidatos[0]).toMatchObject({ tipo: 'sede', elegivel: true,
      antes: { sedeEndereco: 'Rua A, 10', sedeLogradouro: null }, depois: { sedeEndereco: 'Rua B, 20', sedeLogradouro: 'Rua B' } });
    const estado = confirmar(base, atual).estadoProposto;
    // O estado novo ganha as partes atomicas que a base nao tinha.
    expect(estado.selecao.sociedade).toMatchObject({ sedeLogradouro: 'Rua B', sedeNumero: '20', sedeComplemento: '' });
  });

  it('base legada: mudanca so na prosa (complemento) vira pendencia, nao evento', () => {
    const base = snapshot();
    for (const k of ['sedeLogradouro', 'sedeNumero', 'sedeComplemento']) delete base.selecao.sociedade[k];
    const atual = structuredClone(base);
    atual.selecao.sociedade.sede = 'Rua A, 10, Sala 2, Centro, Cuiaba, MT, CEP 78000-000';
    Object.assign(atual.selecao.sociedade, { sedeLogradouro: 'Rua A', sedeNumero: '10', sedeComplemento: 'Sala 2' });
    const { candidatos } = analisarAlteracao(base, atual);
    expect(candidatos[0].elegivel).toBe(false);
    expect(candidatos[0].pendencias.join(' ')).toContain('prosa');
  });

  it('base legada exige o atual com as partes atomicas inteiras', () => {
    const base = snapshot();
    for (const k of ['sedeLogradouro', 'sedeNumero', 'sedeComplemento']) delete base.selecao.sociedade[k];
    const atual = mudanca(base);
    delete atual.selecao.sociedade.sedeNumero;
    expect(analisarAlteracao(base, atual).candidatos[0].elegivel).toBe(false);
  });

  it('bloqueia inconsistencias da sede entre ocorrencias e vinculos', () => {
    const base = snapshot();
    const atual = mudanca(base);
    atual.selecao.alias = { ...atual.selecao.sociedade, sedeNumero: '999' };
    expect(() => confirmar(base, atual)).toThrow();
    delete atual.selecao.alias;
    atual.registroPorBinding.sociedade = 'outra';
    expect(() => confirmar(base, atual)).toThrow();
  });
});


// Dados sinteticos para o contrato do dominio, nao fixture juridica homologada.
function comSocioPF(): SnapshotDados {
  const s = snapshot();
  const ana = {
    id: 'pessoa-1', tipoPessoa: 'PF', cpfCnpj: '123.456.789-00', nome: 'Ana', genero: 'F',
    profissao: 'Medica', endereco: 'Rua A, 10, Centro, Cuiaba/MT',
    qualificacao: '*ANA*, brasileira, Medica, residente na Rua A, 10, Centro, Cuiaba/MT',
  };
  s.itensPorLista.socios = [{ pessoa: { ...ana }, quotas: '100' }];
  s.itensPorLista.administradores = [{ pessoa: { ...ana } }];
  return s;
}

const socioDe = (s: SnapshotDados, lista = 'socios') =>
  s.itensPorLista[lista][0].pessoa as Record<string, string>;

/** Muda o endereco do socio em TODAS as ocorrencias, como o cadastro faria. */
function mudaEndereco(s: SnapshotDados, valor = 'Rua Nova, 99, Centro, Cuiaba/MT'): SnapshotDados {
  const atual = structuredClone(s);
  for (const lista of ['socios', 'administradores']) socioDe(atual, lista).endereco = valor;
  return atual;
}

const soEndereco = (s: SnapshotDados, atual: SnapshotDados, causa: CausaQualificacao = 'mudanca_de_domicilio') =>
  confirmarPropostaAC({
    baseDocumentoId: 'documento-1', base: s, atual, selecionados: ['enderecoSocio:pessoa-1'],
    causaSede: 'mudanca_fisica', causaQualificacao: causa, confirmadoEm: '2026-09-09T15:00:00Z',
  });

describe('alteracao por eventos: endereco de socio pessoa fisica', () => {
  it('vira candidato proprio e elegivel, com a evidencia do antes e do depois', () => {
    const base = comSocioPF();
    const { candidatos, pendencias } = analisarAlteracao(base, mudaEndereco(base));
    expect(pendencias).toEqual([]);
    expect(candidatos).toHaveLength(1);
    expect(candidatos[0]).toMatchObject({
      id: 'enderecoSocio:pessoa-1', tipo: 'enderecoSocio', elegivel: true,
      flagNome: 'evento_alteracao_qualificacao',
      antes: { endereco: 'Rua A, 10, Centro, Cuiaba/MT' },
      depois: { endereco: 'Rua Nova, 99, Centro, Cuiaba/MT' },
    });
    expect(candidatos[0].evidencia).toContain('Rua Nova, 99');
    // O recorte e so o endereco: nome e CPF no antes/depois virariam campo
    // aplicavel pelo estado proposto, e ninguem aprovou trocar nome nem CPF.
    expect(Object.keys(candidatos[0].depois)).toEqual(['endereco']);
  });

  it('endereco e profissao juntos: duas materias, duas decisoes', () => {
    const base = comSocioPF();
    const atual = mudaEndereco(base);
    for (const lista of ['socios', 'administradores']) socioDe(atual, lista).profissao = 'Engenheira';
    const { candidatos } = analisarAlteracao(base, atual);
    expect(candidatos.map((c) => [c.tipo, c.elegivel])).toEqual([
      ['enderecoSocio', true], ['qualificacao', false],
    ]);
    // O residuo nao repete o endereco: quem o narra e o candidato homologado.
    expect(candidatos[1].evidencia).toBe('Qualificacao pessoa-1: profissao');
    expect(() => confirmarPropostaAC({
      baseDocumentoId: 'documento-1', base, atual, selecionados: ['qualificacao:pessoa-1'],
      causaSede: 'mudanca_fisica', confirmadoEm: '2026-09-09T15:00:00Z',
    })).toThrow(/fora do recorte homologado/);
  });

  it('socia PJ nao entra no recorte: o endereco volta ao residuo, com o motivo', () => {
    const base = comSocioPF();
    for (const lista of ['socios', 'administradores']) socioDe(base, lista).tipoPessoa = 'PJ';
    const { candidatos } = analisarAlteracao(base, mudaEndereco(base));
    expect(candidatos.map((c) => c.tipo)).toEqual(['qualificacao']);
    expect(candidatos[0].pendencias.join(' ')).toContain('socio pessoa fisica');
  });

  it('pessoa fora do quadro societario nao entra no recorte', () => {
    const base = comSocioPF();
    // So administradora: administrar nao e ser socio, e a resolucao homologada
    // nomeia socio.
    base.itensPorLista.socios = [];
    const atual = structuredClone(base);
    socioDe(atual, 'administradores').endereco = 'Rua Nova, 99';
    const { candidatos } = analisarAlteracao(base, atual);
    expect(candidatos.map((c) => c.tipo)).toEqual(['qualificacao']);
    expect(candidatos[0].pendencias.join(' ')).toContain('quadro societario');
  });

  it('endereco vazio no cadastro trava o candidato em vez de publicar sem domicilio', () => {
    const base = comSocioPF();
    const candidato = analisarAlteracao(base, mudaEndereco(base, '  ')).candidatos[0];
    expect(candidato).toMatchObject({ tipo: 'enderecoSocio', elegivel: false });
    expect(candidato.pendencias.join(' ')).toContain('vazio no cadastro atual');
    expect(() => soEndereco(base, mudaEndereco(base, '  '))).toThrow(/nao pode ser gerado/);
  });

  it('confirmar escreve o endereco em todas as ocorrencias e redereiva a qualificacao', () => {
    const base = comSocioPF();
    const atual = mudaEndereco(base);
    for (const lista of ['socios', 'administradores']) socioDe(atual, lista).profissao = 'Engenheira';
    const { estadoProposto } = soEndereco(base, atual);
    for (const lista of ['socios', 'administradores']) {
      const p = socioDe(estadoProposto, lista);
      expect(p.endereco).toBe('Rua Nova, 99, Centro, Cuiaba/MT');
      // A prosa derivada acompanha; sem isso o consolidado imprimiria o antigo.
      expect(p.qualificacao).toContain('Rua Nova, 99');
      expect(p.qualificacao).not.toContain('Rua A, 10');
      // E so o endereco: a profissao aprovada por ninguem continua a da base.
      expect(p.profissao).toBe('Medica');
    }
  });

  it('atualizacao postal e homologada; correcao de erro material nao', () => {
    const base = comSocioPF();
    const atual = mudaEndereco(base);
    expect(soEndereco(base, atual, 'atualizacao_postal').causaQualificacao).toBe('atualizacao_postal');
    expect(() => soEndereco(base, atual, 'erro_material')).toThrow(/retificacao com alvo historico/);
  });

  it('proposta sem causa gravada (legado) nao quebra e nao seleciona endereco', () => {
    const base = comSocioPF();
    const proposta = confirmarPropostaAC({
      baseDocumentoId: 'documento-1', base, atual: mudaEndereco(base), selecionados: [],
      causaSede: 'mudanca_fisica', confirmadoEm: '2026-09-09T15:00:00Z',
    });
    expect(proposta.causaQualificacao).toBe('mudanca_de_domicilio');
    expect(socioDe(proposta.estadoProposto).endereco).toBe('Rua A, 10, Centro, Cuiaba/MT');
  });

  it('endereco que muda de novo depois da conferencia exige nova revisao', () => {
    const base = comSocioPF();
    const atual = mudaEndereco(base);
    const proposta = soEndereco(base, atual);
    expect(propostaPrecisaRevisao(proposta, atual)).toBe(false);
    expect(propostaPrecisaRevisao(proposta, mudaEndereco(base, 'Rua Terceira, 7'))).toBe(true);
  });

  // Defeito encontrado dirigindo o app em 09/09/2026: a peca saia com o endereco
  // novo no preambulo e na clausula de capital, e o ANTIGO na de administracao.
  // No snapshot real `socios[].socio` tem `id` e `administradores[].administrador`
  // nao tem, e a aplicacao exigia id. Conferido no sandbox, inclusive em peca
  // registrada no mesmo dia.
  it('aplica tambem na ocorrencia SEM id, reconhecida pelo CPF do mesmo estado', () => {
    const base = comSocioPF();
    // Como o mapeador de administrador entrega de verdade: sem `id`.
    const semId = { ...socioDe(base) };
    delete semId.id;
    base.itensPorLista.administradores = [{ pessoa: { ...semId, cargo: 'Administradora' } }];
    const atual = structuredClone(base);
    socioDe(atual).endereco = 'Rua Nova, 99';
    (atual.itensPorLista.administradores[0].pessoa as Record<string, string>).endereco = 'Rua Nova, 99';

    const { estadoProposto } = soEndereco(base, atual);
    const admin = estadoProposto.itensPorLista.administradores[0].pessoa as Record<string, string>;
    expect(admin.endereco).toBe('Rua Nova, 99');
    expect(admin.qualificacao).toContain('Rua Nova, 99');
    expect(admin.cargo).toBe('Administradora');
  });

  it('ocorrencia sem id e sem CPF nao recebe nada: reconhecer nao e adivinhar', () => {
    const base = comSocioPF();
    // Homonima sem id e sem CPF: nada a liga a pessoa-1 alem do nome, e nome
    // nao identifica ninguem.
    base.itensPorLista.signatarios = [
      { pessoa: { tipoPessoa: 'PF', nome: 'Ana', endereco: 'Rua A, 10, Centro, Cuiaba/MT' } },
    ];
    const atual = mudaEndereco(base);
    const { estadoProposto } = soEndereco(base, atual);
    expect((estadoProposto.itensPorLista.signatarios[0].pessoa as Record<string, string>).endereco)
      .toBe('Rua A, 10, Centro, Cuiaba/MT');
  });

  it('CPF de OUTRA pessoa nao e alcancado pelo endereco aprovado', () => {
    const base = comSocioPF();
    base.itensPorLista.administradores = [{
      pessoa: { tipoPessoa: 'PF', nome: 'Bia', cpfCnpj: '987.654.321-00', endereco: 'Rua B, 20' },
    }];
    const atual = structuredClone(base);
    socioDe(atual).endereco = 'Rua Nova, 99';
    const { estadoProposto } = soEndereco(base, atual);
    expect((estadoProposto.itensPorLista.administradores[0].pessoa as Record<string, string>).endereco)
      .toBe('Rua B, 20');
  });

  // Achado olhando a tela em 10/09/2026: com o cadastro INTOCADO, o assistente
  // exibia duas linhas de "qualificacao sem id estavel; CPF/CNPJ nao concilia
  // identidade" em toda peca. Vinham do bloco de assinaturas.
  it('assinaturas nao entram na comparacao, e nao cobram pendencia por isso', () => {
    const base = comSocioPF();
    // Como `mapearSignatarios` entrega: projecao com nome, papel e CPF, sem id,
    // sem endereco e sem tipoPessoa.
    const assinatura = {
      nome: 'Ana', nomeMaiusculo: 'ANA', papel: 'Socia administradora',
      cpfCnpj: '123.456.789-00', qualificacao: '', eSocio: true,
    };
    base.itensPorLista.signatarios = [{ signatario: { ...assinatura } }];
    const atual = structuredClone(base);
    expect(analisarAlteracao(base, atual).pendencias).toEqual([]);

    // E segue sem estorvar quando ha evento de verdade.
    const comMudanca = mudaEndereco(base);
    (comMudanca.itensPorLista.signatarios[0].signatario as Record<string, string>).papel = 'Socia';
    const { candidatos, pendencias } = analisarAlteracao(base, comMudanca);
    expect(pendencias).toEqual([]);
    expect(candidatos.map((c) => c.tipo)).toEqual(['enderecoSocio']);
  });

  it('ocorrencia sem id FORA das assinaturas ainda avisa, dizendo quem e onde', () => {
    const base = comSocioPF();
    const semId = { ...socioDe(base) };
    delete semId.id;
    base.itensPorLista.administradores = [{ pessoa: semId }];
    const atual = structuredClone(base);
    const { pendencias } = analisarAlteracao(base, atual);
    expect(pendencias).toHaveLength(2); // Base e Atual
    expect(pendencias[0]).toContain('"Ana"');
    expect(pendencias[0]).toContain('na lista "administradores"');
    expect(pendencias[0]).toContain('sem id estavel');
    expect(pendencias[0]).toContain('corrigir um CPF nao e troca de socio');
  });

  it('candidato de endereco tem fingerprint proprio, por pessoa', () => {
    const base = comSocioPF();
    const bia = {
      id: 'pessoa-2', tipoPessoa: 'PF', cpfCnpj: '987.654.321-00', nome: 'Bia', genero: 'F',
      endereco: 'Rua B, 20', profissao: 'Advogada',
    };
    base.itensPorLista.socios.push({ pessoa: { ...bia }, quotas: '50' });
    const atual = structuredClone(base);
    (atual.itensPorLista.socios[1].pessoa as Record<string, string>).endereco = 'Rua C, 30';
    const candidatos = analisarAlteracao(base, atual).candidatos as CandidatoAC[];
    expect(candidatos.map((c) => c.id)).toEqual(['enderecoSocio:pessoa-2']);
    // O fingerprint e canonico e normalizado (caixa e espacos), nao o texto cru.
    expect(candidatos[0].fingerprint).toContain('rua c, 30');
  });
});
