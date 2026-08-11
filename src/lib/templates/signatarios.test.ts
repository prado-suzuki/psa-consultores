import { describe, it, expect } from 'vitest';
import { mapearSignatarios } from './signatarios';
import { gerarDocumento } from './index';
import { origemDe } from './origem';
import type { AdministradorParaMapear, SocioParaMapear } from './mapeadores';
import type { PessoaRow } from '@/hooks/useQualificacaoDasPartes';
import type { Template } from './types';

// B12 e B13 — o cônjuge outorgante e o administrador não sócio ganham LINHA
// PRÓPRIA de assinatura.
//
// O cenário NÃO é o do contrato da MMS (duas pessoas, ambas sócias e casadas
// entre si): é uma ALTERAÇÃO CONTRATUAL de sociedade com quatro sócios de
// estados civis diferentes, uma sócia PJ e um administrador contratado que não é
// sócio — a combinação que o fecho antigo ({{#socios}} com sufixo de outorga)
// errava de quatro maneiras ao mesmo tempo.

type Over = Partial<Record<keyof PessoaRow, unknown>>;

const pessoa = (id: string, denominacao: string, over: Over = {}): PessoaRow =>
  ({ id, denominacao, tipo_pessoa: 'PF', genero: 'M', ...over }) as unknown as PessoaRow;

// Rogério é casado em comunhão parcial com Solange (vínculo dos dois lados).
const ROGERIO = pessoa('p-rogerio', 'Rogério Kunzler', {
  regime_bens: 'Comunhão Parcial', estado_civil: 'Casado(a)', conjuge_id: 'p-solange',
});
const SOLANGE = pessoa('p-solange', 'Solange Kunzler', {
  genero: 'F', regime_bens: 'Comunhão Parcial', estado_civil: 'Casado(a)', conjuge_id: 'p-rogerio',
});
// Ivete é solteira: não gera outorga (regressão da flag por regime de bens).
const IVETE = pessoa('p-ivete', 'Ivete Zanella', { genero: 'F', estado_civil: 'Solteiro(a)' });
// Nelson é sócio E administrador: uma linha só, com o papel combinado.
const NELSON = pessoa('p-nelson', 'Nelson Bortolotto', {
  regime_bens: 'Separação Total', estado_civil: 'Casado(a)', conjuge_id: 'p-terezinha',
});
const TEREZINHA = pessoa('p-terezinha', 'Terezinha Bortolotto', { genero: 'F' });
// Cristiane administra sem ser sócia (B13).
const CRISTIANE = pessoa('p-cristiane', 'Cristiane Halmenschlager', { genero: 'F' });
const AGROPECUARIA = pessoa('p-agro', 'Agropecuária Vale Verde Ltda.', { tipo_pessoa: 'PJ', genero: null });

const PESSOAS = [ROGERIO, SOLANGE, IVETE, NELSON, TEREZINHA, CRISTIANE, AGROPECUARIA];
const pessoaPorId = (id: string) => PESSOAS.find((p) => p.id === id) ?? null;

const socio = (pessoa: PessoaRow, representante: string | null = null): SocioParaMapear => ({
  pessoa, quotas: 100, vlr_total: 100, representante,
});
const administrador = (pessoa: PessoaRow, cargo: string | null = null): AdministradorParaMapear => ({
  pessoa, cargo,
});

function campos(itens: ReturnType<typeof mapearSignatarios>) {
  return itens.map((i) => i.signatario as Record<string, string>);
}

describe('B12/B13 · lista de signatários com papel', () => {
  it('casado em comunhão gera DUAS linhas (ele e o cônjuge, nomeado); solteiro gera uma', () => {
    const linhas = campos(
      mapearSignatarios({ socios: [socio(ROGERIO), socio(IVETE)], pessoaPorId }),
    );

    expect(linhas.map((l) => [l.nome, l.papel])).toEqual([
      ['Rogério Kunzler', 'Sócio'],
      ['Solange Kunzler', 'Cônjuge outorgante'],
      ['Ivete Zanella', 'Sócia'],
    ]);
    // O cônjuge entra logo depois do sócio dele, não no fim da lista.
    expect(linhas[1].eConjuge).toBe('sim');
    expect(linhas[1].qualificacao).toBe('cônjuge de Rogério Kunzler');
    expect(linhas[1].nomeMaiusculo).toBe('SOLANGE KUNZLER');
    // Solteira não gera outorga (a flag por regime de bens continua mandando).
    expect(linhas.filter((l) => l.eConjuge === 'sim')).toHaveLength(1);
  });

  it('separação total não gera outorga, mesmo com cônjuge cadastrado', () => {
    const linhas = campos(mapearSignatarios({ socios: [socio(NELSON)], pessoaPorId }));
    expect(linhas.map((l) => l.nome)).toEqual(['Nelson Bortolotto']);
    expect(pessoaPorId('p-terezinha')).not.toBeNull(); // a pessoa existe; o regime é que dispensa
  });

  it('quem é sócio E administrador aparece UMA vez, com o papel combinado', () => {
    const linhas = campos(
      mapearSignatarios({
        socios: [socio(NELSON), socio(IVETE)],
        administradores: [administrador(NELSON, 'Diretor'), administrador(CRISTIANE, 'Diretora')],
        pessoaPorId,
      }),
    );

    expect(linhas.map((l) => [l.nome, l.papel])).toEqual([
      ['Nelson Bortolotto', 'Sócio administrador'],
      ['Ivete Zanella', 'Sócia'],
      // Administradora não sócia recebe a sua, depois dos sócios (B13).
      ['Cristiane Halmenschlager', 'Administradora'],
    ]);
    expect(linhas.filter((l) => l.nome === 'Nelson Bortolotto')).toHaveLength(1);
    expect(linhas[0].eSocio).toBe('sim');
    expect(linhas[0].eAdministrador).toBe('sim');
    expect(linhas[2].eSocio).toBe('');
  });

  it('sócia PJ leva o representante como complemento, não no rótulo', () => {
    const [linha] = campos(
      mapearSignatarios({ socios: [socio(AGROPECUARIA, 'Nelson Bortolotto')], pessoaPorId }),
    );
    expect(linha.papel).toBe('Sócio');
    expect(linha.qualificacao).toBe('neste ato representada por Nelson Bortolotto');
  });

  it('cônjuge que já assina como sócio não ganha segunda linha', () => {
    const linhas = campos(
      mapearSignatarios({ socios: [socio(ROGERIO), socio(SOLANGE)], pessoaPorId }),
    );
    expect(linhas.map((l) => [l.nome, l.papel])).toEqual([
      ['Rogério Kunzler', 'Sócio'],
      ['Solange Kunzler', 'Sócia'],
    ]);
  });

  it('vínculo gravado de um lado só produz o cônjuge de um lado só (B10 é de outra frente)', () => {
    const soUmLado = { ...SOLANGE, conjuge_id: null } as unknown as PessoaRow;
    const linhas = campos(
      mapearSignatarios({
        socios: [socio(ROGERIO), socio(soUmLado)],
        pessoaPorId: (id) => (id === 'p-solange' ? soUmLado : pessoaPorId(id)),
      }),
    );
    // Rogério aponta para Solange, e ela entra como sócia antes de ser cônjuge.
    expect(linhas.map((l) => l.papel)).toEqual(['Sócio', 'Sócia']);
  });

  it('advogado e testemunhas fecham a lista, com as condicionais próprias', () => {
    const linhas = campos(
      mapearSignatarios({
        socios: [socio(IVETE)],
        advogado: { nome: 'Marina Prass', genero: 'F', qualificacao: 'OAB/MT nº 12.345' },
        testemunhas: [
          { nome: 'Otávio Lima', cpfCnpj: '111.222.333-44' },
          { nome: 'Rita Sobral', cpfCnpj: '555.666.777-88' },
        ],
      }),
    );
    expect(linhas.map((l) => l.papel)).toEqual(['Sócia', 'Advogada', 'Testemunha', 'Testemunha']);
    expect(linhas[1].eAdvogado).toBe('sim');
    expect(linhas[2].eTestemunha).toBe('sim');
    expect(linhas[3].cpfCnpj).toBe('555.666.777-88');
  });

  it('signatário sem nome não entra na lista', () => {
    const semNome = pessoa('p-sem', '' as unknown as string);
    expect(mapearSignatarios({ socios: [socio(semNome)] })).toEqual([]);
    expect(mapearSignatarios({ socios: [], testemunhas: [{ nome: '' }] })).toEqual([]);
  });

  it('a proveniência do cadastro acompanha o signatário (valor clicável na prévia)', () => {
    const [linha] = mapearSignatarios({ socios: [socio(IVETE)] });
    expect(origemDe(linha.signatario as Record<string, string>)).toEqual({ tipo: 'pessoa', id: 'p-ivete' });
  });

  it('o bloco de fecho percorre a lista e cada um assina embaixo do próprio nome', () => {
    const itens = mapearSignatarios({
      socios: [socio(ROGERIO), socio(NELSON)],
      administradores: [administrador(NELSON), administrador(CRISTIANE)],
      pessoaPorId,
    });
    const template: Template = {
      id: 'fecho',
      nome: 'fecho',
      blocos: [{
        id: 'b',
        tipo: 'livre',
        obrigatorio: true,
        conteudo:
          '{{#signatarios sep="\\n\\n"}}_______________________________________\n' +
          '*{{ signatario.nomeMaiusculo }}*\n{{ signatario.papel }}' +
          '{{#signatario.qualificacao}}\n{{ signatario.qualificacao }}{{/signatario.qualificacao}}{{/signatarios}}',
      }],
    };

    expect(gerarDocumento(template, { signatarios: itens })).toBe(
      '_______________________________________\n*ROGÉRIO KUNZLER*\nSócio\n\n' +
      '_______________________________________\n*SOLANGE KUNZLER*\nCônjuge outorgante\ncônjuge de Rogério Kunzler\n\n' +
      '_______________________________________\n*NELSON BORTOLOTTO*\nSócio administrador\n\n' +
      '_______________________________________\n*CRISTIANE HALMENSCHLAGER*\nAdministradora',
    );
  });
});
