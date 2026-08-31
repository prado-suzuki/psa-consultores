import { describe, it, expect } from 'vitest';
import { mapearSignatarios, papelDeQualidades, type QualidadeSignatario } from './signatarios';
import { gerarDocumento } from './index';
import { origemDe } from './origem';
import { retirantesDaCessao } from './mapeadores';
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
//
// Emendas 9.10 e 9.11 do contrato L2/L3: o papel ACUMULA todas as qualidades da
// pessoa (nenhuma some porque ela foi lida duas vezes) e a pessoa jurídica
// concorda no feminino.

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

/** Redação canônica do fecho (item 3 do contrato L2/L3): o bloco IMPRIME o papel. */
const TEMPLATE_FECHO: Template = {
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
    // O cargo complementa a linha de quem só administra; no sócio ele seria
    // repetição do papel, e o complemento fica para o representante da sócia PJ.
    expect(linhas[0].qualificacao).toBe('');
    expect(linhas[2].qualificacao).toBe('Diretora');
  });

  it('sócia PJ concorda no feminino e leva o representante como complemento (9.11)', () => {
    // PJ não tem gênero cadastrado; sem regra própria a concordância cairia no
    // masculino e a sociedade assinaria como "Sócio".
    const [linha] = campos(
      mapearSignatarios({ socios: [socio(AGROPECUARIA, 'Nelson Bortolotto')], pessoaPorId }),
    );
    expect(linha.papel).toBe('Sócia');
    expect(linha.qualificacao).toBe('neste ato representada por Nelson Bortolotto');
  });

  it('sócia PJ que administra sai "Sócia administradora", nunca no masculino', () => {
    const [linha] = campos(
      mapearSignatarios({
        socios: [socio(AGROPECUARIA, 'Nelson Bortolotto')],
        administradores: [administrador(AGROPECUARIA)],
        pessoaPorId,
      }),
    );
    expect(linha.papel).toBe('Sócia administradora');
  });

  it('administradora não sócia que é cônjuge de sócio ACUMULA as duas qualidades (9.10)', () => {
    // Solange administra a sociedade sem ser sócia, e é casada em comunhão com o
    // sócio Rogério. Administrador assina em nome da SOCIEDADE e isso não supre a
    // anuência pessoal do regime de bens, então a outorga tem de aparecer — mas a
    // qualidade de administradora não pode sumir com ela: o contrato nomeia a
    // Solange na cláusula de administração, e o fecho precisa de alguém assinando
    // como tal.
    const linhas = campos(
      mapearSignatarios({
        socios: [socio(ROGERIO)],
        administradores: [administrador(SOLANGE, 'Diretora')],
        pessoaPorId,
      }),
    );
    expect(linhas.map((l) => [l.nome, l.papel])).toEqual([
      ['Rogério Kunzler', 'Sócio'],
      ['Solange Kunzler', 'Administradora e cônjuge outorgante'],
    ]);
    expect(linhas).toHaveLength(2); // uma linha só para a Solange
    expect(linhas[1].eConjuge).toBe('sim');
    expect(linhas[1].eAdministrador).toBe('sim');
    expect(linhas[1].eSocio).toBe('');
    // O complemento diz de quem ela é cônjuge — é o que liga a outorga ao sócio.
    expect(linhas[1].qualificacao).toBe('cônjuge de Rogério Kunzler');
  });

  it('casal em comunhão, os dois sócios: uma linha cada, com o papel combinado', () => {
    // Emenda 9.9: assinar duas vezes não outorga mais do que assinar uma, e a
    // ordem do quadro não pode decidir se a pessoa sai como "Sócia" ou como
    // "Cônjuge outorgante". Sai como as duas coisas, que é o que a Junta lê.
    const linhas = campos(
      mapearSignatarios({ socios: [socio(ROGERIO), socio(SOLANGE)], pessoaPorId }),
    );
    expect(linhas.map((l) => [l.nome, l.papel])).toEqual([
      ['Rogério Kunzler', 'Sócio e cônjuge outorgante'],
      ['Solange Kunzler', 'Sócia e cônjuge outorgante'],
    ]);
    expect(linhas.every((l) => l.eSocio === 'sim' && l.eConjuge === 'sim')).toBe(true);
    // Os dois estão no quadro: dizer de quem cada um é cônjuge seria repetição.
    expect(linhas.every((l) => l.qualificacao === '')).toBe(true);
  });

  it('sócio administrador que também outorga acumula as três qualidades', () => {
    const marido = pessoa('p-caio', 'Caio Trentin', {
      regime_bens: 'Comunhão Universal', estado_civil: 'Casado(a)', conjuge_id: 'p-lia',
    });
    const esposa = pessoa('p-lia', 'Lia Trentin', {
      genero: 'F', regime_bens: 'Comunhão Universal', estado_civil: 'Casado(a)', conjuge_id: 'p-caio',
    });
    const casal = (id: string) => [marido, esposa].find((p) => p.id === id) ?? null;

    const linhas = campos(
      mapearSignatarios({
        socios: [socio(marido), socio(esposa)],
        administradores: [administrador(marido, 'Diretor')],
        pessoaPorId: casal,
      }),
    );
    expect(linhas.map((l) => l.papel)).toEqual([
      'Sócio administrador e cônjuge outorgante',
      'Sócia e cônjuge outorgante',
    ]);

    // A tripla também concorda no feminino quando é ela quem administra.
    const ambosAdministram = campos(
      mapearSignatarios({
        socios: [socio(marido), socio(esposa)],
        administradores: [administrador(marido, 'Diretor'), administrador(esposa, 'Diretora')],
        pessoaPorId: casal,
      }),
    );
    expect(ambosAdministram.map((l) => l.papel)).toEqual([
      'Sócio administrador e cônjuge outorgante',
      'Sócia administradora e cônjuge outorgante',
    ]);
    expect(ambosAdministram).toHaveLength(2);
    expect(ambosAdministram.every((l) => l.eSocio === 'sim' && l.eAdministrador === 'sim' && l.eConjuge === 'sim'))
      .toBe(true);
  });

  it('o cônjuge que também é sócio assina na posição DELE no quadro', () => {
    // O casal está separado por outro sócio no quadro. A linha do cônjuge só é
    // adiantada para junto do sócio quando ela não existe por conta própria;
    // aqui existe, e a ordem do quadro manda.
    const linhas = campos(
      mapearSignatarios({ socios: [socio(ROGERIO), socio(IVETE), socio(SOLANGE)], pessoaPorId }),
    );
    expect(linhas.map((l) => [l.nome, l.papel])).toEqual([
      ['Rogério Kunzler', 'Sócio e cônjuge outorgante'],
      ['Ivete Zanella', 'Sócia'],
      ['Solange Kunzler', 'Sócia e cônjuge outorgante'],
    ]);
  });

  it('combinação de qualidades sem rótulo previsto FALHA, em vez de escolher uma', () => {
    // Qualidade que o motor ainda não conhece (procurador, anuente,
    // interveniente). O cast é o único jeito de simular o dia em que alguém
    // acrescentar uma: o valor não existe no tipo hoje, e é isso que se quer.
    const nova = 'procurador' as unknown as QualidadeSignatario;
    expect(() => papelDeQualidades(new Set<QualidadeSignatario>(['socio', nova]), 'M'))
      .toThrow(/sem rótulo previsto/);
    // Nem sequer o silêncio do conjunto vazio passa.
    expect(() => papelDeQualidades(new Set<QualidadeSignatario>(), 'F')).toThrow(/sem rótulo previsto/);
    // E o que a tabela prevê continua saindo inteiro.
    expect(papelDeQualidades(new Set<QualidadeSignatario>(['administrador', 'conjuge']), 'F'))
      .toBe('Administradora e cônjuge outorgante');
    expect(papelDeQualidades(new Set<QualidadeSignatario>(['conjuge', 'administrador', 'socio']), 'M'))
      .toBe('Sócio administrador e cônjuge outorgante');
  });

  it('vínculo gravado de um lado só produz o cônjuge de um lado só (B10 é de outra frente)', () => {
    const soUmLado = { ...SOLANGE, conjuge_id: null } as unknown as PessoaRow;
    const linhas = campos(
      mapearSignatarios({
        socios: [socio(ROGERIO), socio(soUmLado)],
        pessoaPorId: (id) => (id === 'p-solange' ? soUmLado : pessoaPorId(id)),
      }),
    );
    // Rogério aponta para Solange e ela acumula a outorga; ele, não, porque o
    // vínculo dela está em branco. É o desequilíbrio que a reciprocidade do
    // cadastro resolve (B10, de outra frente), e não o motor.
    expect(linhas.map((l) => l.papel)).toEqual(['Sócio', 'Sócia e cônjuge outorgante']);
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

    expect(gerarDocumento(TEMPLATE_FECHO, { signatarios: itens })).toBe(
      '_______________________________________\n*ROGÉRIO KUNZLER*\nSócio\n\n' +
      '_______________________________________\n*SOLANGE KUNZLER*\nCônjuge outorgante\ncônjuge de Rogério Kunzler\n\n' +
      '_______________________________________\n*NELSON BORTOLOTTO*\nSócio administrador\n\n' +
      '_______________________________________\n*CRISTIANE HALMENSCHLAGER*\nAdministradora',
    );
  });

  it('alteração contratual com sócia PJ e administradora não sócia: o fecho sai inteiro', () => {
    // O cenário que revelou a perda de qualidade: sócia PJ representada, sócio
    // pessoa física casado em comunhão e a mulher dele administrando sem ser
    // sócia. Nenhuma das três qualidades da Solange pode faltar no fecho.
    const holding = pessoa('p-holding', 'Agro Holding MMS Ltda.', { tipo_pessoa: 'PJ', genero: null });
    const itens = mapearSignatarios({
      socios: [socio(holding, 'Bruna Mirandola'), socio(ROGERIO)],
      administradores: [administrador(SOLANGE, 'Administradora')],
      pessoaPorId: (id) => (id === 'p-holding' ? holding : pessoaPorId(id)),
    });

    expect(gerarDocumento(TEMPLATE_FECHO, { signatarios: itens })).toBe(
      '_______________________________________\n*AGRO HOLDING MMS LTDA.*\nSócia\n' +
      'neste ato representada por Bruna Mirandola\n\n' +
      '_______________________________________\n*ROGÉRIO KUNZLER*\nSócio\n\n' +
      '_______________________________________\n*SOLANGE KUNZLER*\n' +
      'Administradora e cônjuge outorgante\ncônjuge de Rogério Kunzler',
    );
  });
});

// A AC de CONCENTRAÇÃO de quotas: o casal cede a totalidade à holding e segue
// administrando a operadora. Cenário da 2ª alteração da MMS Agro, o único do
// corpus em que alguém administra fora do quadro societário.
//
// Sem a qualidade `retirante` estes dois só apareciam pela administração, e o
// fecho chamava de "Administrador" quem tinha acabado de sair do quadro: a
// retirada, que é o fato que a peça precisa publicar, ficava calada.
describe('AC de concentração · sócio retirante', () => {
  const HOLDING = pessoa('p-holding', 'Jatobá Sementes Ltda.', { tipo_pessoa: 'PJ', genero: null });
  // Rogério e Solange são casados entre si, em comunhão parcial: cada um é
  // retirante E cônjuge outorgante do outro.
  const cessao = (cedente: PessoaRow) => ({
    id: `c-${cedente.id}`, cedente, cessionario: HOLDING, quotas: 100, valor: 100,
    representanteCedente: null, representanteCessionario: null,
  });

  it('o retirante que segue administrando acumula as quatro qualidades, na redação registrada', () => {
    const linhas = campos(mapearSignatarios({
      // O quadro é o RESULTANTE: só a holding sobrou.
      socios: [socio(HOLDING, 'o senhor Rogério Kunzler')],
      administradores: [administrador(ROGERIO, 'Sócio-Administrador'), administrador(SOLANGE, 'Sócio-Administrador')],
      retirantes: [ROGERIO, SOLANGE],
      pessoaPorId,
    }));

    expect(linhas.map((l) => [l.nome, l.papel])).toEqual([
      // A sócia ingressante encabeça, os que saíram vêm depois: ordem do registrado.
      ['Jatobá Sementes Ltda.', 'Sócia'],
      ['Rogério Kunzler', 'Sócio retirante, outorga conjugal e administrador não sócio'],
      ['Solange Kunzler', 'Sócia retirante, outorga conjugal e administradora não sócia'],
    ]);
    // Cada um é cônjuge do outro, e nenhum dos dois aparece duas vezes.
    expect(linhas).toHaveLength(3);
    expect(linhas[1].eRetirante).toBe('sim');
    expect(linhas[1].eSocio).toBe('sim');
    expect(linhas[1].eAdministrador).toBe('sim');
    expect(linhas[1].eConjuge).toBe('sim');
  });

  it('o cargo "Sócio-Administrador" NÃO desce para o complemento de quem deixou de ser sócio', () => {
    const linhas = campos(mapearSignatarios({
      socios: [socio(HOLDING)],
      administradores: [administrador(IVETE, 'Sócio-Administrador')],
      retirantes: [IVETE],
      pessoaPorId,
    }));
    const ivete = linhas.find((l) => l.nome === 'Ivete Zanella')!;
    expect(ivete.papel).toBe('Sócia retirante e administradora não sócia');
    // O papel já disse tudo; repetir "Sócio-Administrador" embaixo contradiria a
    // retirada que a linha de cima acabou de publicar.
    expect(ivete.qualificacao).toBe('');
  });

  it('retirante que não administra sai só como retirante', () => {
    const linhas = campos(mapearSignatarios({
      socios: [socio(HOLDING)], retirantes: [IVETE], pessoaPorId,
    }));
    expect(linhas.map((l) => [l.nome, l.papel])).toEqual([
      ['Jatobá Sementes Ltda.', 'Sócia'],
      ['Ivete Zanella', 'Sócia retirante'],
    ]);
  });

  it('a sócia PJ é representada PELO senhor, com a preposição contraída (não "por o")', () => {
    const linhas = campos(mapearSignatarios({
      socios: [socio(HOLDING, 'o senhor Rogério Kunzler e a senhora Solange Kunzler')],
      pessoaPorId,
    }));
    expect(linhas[0].qualificacao).toBe(
      'neste ato representada pelo senhor Rogério Kunzler e a senhora Solange Kunzler',
    );
  });

  it('representante no feminino contrai em "pela"', () => {
    const linhas = campos(mapearSignatarios({
      socios: [socio(HOLDING, 'a senhora Solange Kunzler')], pessoaPorId,
    }));
    expect(linhas[0].qualificacao).toBe('neste ato representada pela senhora Solange Kunzler');
  });

  it('retirantesDaCessao: cedente que sobrou no quadro NÃO é retirante', () => {
    const quadroFinal = [socio(HOLDING), socio(NELSON)];
    // Nelson cedeu parte e continuou sócio; Rogério cedeu tudo e saiu.
    expect(retirantesDaCessao([cessao(ROGERIO), cessao(NELSON)], quadroFinal).map((p) => p.denominacao))
      .toEqual(['Rogério Kunzler']);
  });

  it('retirantesDaCessao: o mesmo cedente em duas cessões vira UM retirante', () => {
    expect(retirantesDaCessao([cessao(ROGERIO), cessao(ROGERIO)], [socio(HOLDING)]))
      .toHaveLength(1);
  });
});
