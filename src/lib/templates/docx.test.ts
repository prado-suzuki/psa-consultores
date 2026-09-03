import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import { montarDocx } from './docx';
import { gerarBlocos } from './index';
import { normalizarReferenciasLegadas } from './binding';
import type { Bloco, Contexto, Template } from './types';

const bloco = (id: string, tipo: Bloco['tipo'], conteudo: string): Bloco => ({ id, tipo, conteudo });

/** O <w:p> inteiro que contém um trecho de texto — o alinhamento mora no pPr, antes do run. */
function paragrafoCom(xml: string, texto: string): string {
  const i = xml.indexOf(texto);
  const inicio = xml.lastIndexOf('<w:p>', i);
  const fim = xml.indexOf('</w:p>', i);
  return xml.slice(inicio, fim);
}

/** Extrai uma parte XML do pacote .docx gerado. */
async function parteXml(doc: Awaited<ReturnType<typeof montarDocx>>, parte: RegExp): Promise<string> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await Packer.toBuffer(doc));
  return zip.file(parte)[0].async('string');
}

describe('export .docx (formatação do modelo de referência)', () => {
  it('aplica margens, fonte padrão e formatação por tipo estrutural', async () => {
    const doc = await montarDocx([
      // Título e razão social no MESMO bloco, separados por linha em branco —
      // é a forma do bloco "Cabeçalho e razão social" do catálogo, e é ela que
      // `detectarCapa` reconhece. Em blocos separados isto não é uma capa.
      bloco(
        'cab',
        'livre',
        'INSTRUMENTO PARTICULAR DE CONSTITUIÇÃO DE SOCIEDADE LIMITADA\n\nAgro Aliança Ltda',
      ),
      // Conteúdos como saem de numerarBlocos: rótulos já envolvidos em *negrito*.
      bloco('cap', 'capitulo', '*CAPÍTULO I*\nDenominação, Sede e Prazo de Duração'),
      bloco('cl', 'clausula', '*CLÁUSULA PRIMEIRA:* A sociedade girará sob o nome X.\n    a) Primeira alínea;'),
      bloco('par', 'paragrafo', '*Parágrafo Único:* Texto do parágrafo.'),
      bloco('fecho', 'livre', '_______________________________________\nFulano de Tal'),
    ]);
    const xml = await parteXml(doc, /word\/document\.xml$/);

    // Página e margens do modelo (A4; 3,0 / 2,5 / 2,0 / 2,5 cm)
    expect(xml).toContain('w:w="11906"');
    expect(xml).toContain('w:top="1134"');
    expect(xml).toContain('w:bottom="1418"');
    expect(xml).toContain('w:left="1701"');
    expect(xml).toContain('w:right="1418"');

    // Fonte padrão do corpo, em docDefaults E num estilo `Normal` de verdade:
    // sem o Normal os estilos embutidos ficam com basedOn pendurado e leitor
    // fora do Word ignora a fonte.
    const styles = await parteXml(doc, /word\/styles\.xml$/);
    expect(styles).toContain('Arial Narrow');
    expect(styles).toContain('w:val="24"'); // 12pt
    expect(styles).toContain('w:styleId="Normal"');

    // Rótulos em negrito (runs separados, sem as marcas literais)
    expect(xml).toContain('<w:b/>');
    expect(xml).toContain('CAPÍTULO I');
    expect(xml).toContain('CLÁUSULA PRIMEIRA:');
    expect(xml).toContain('Parágrafo Único:');
    expect(xml).not.toContain('*CAPÍTULO');
    expect(xml).not.toContain('*CLÁUSULA');

    // Alínea com recuo pendente: marcador a 0,5 cm, corpo a 1,0 cm
    expect(xml).toContain('w:left="567"');
    expect(xml).toContain('w:hanging="284"');

    // Título 18pt (36 half-points), razão social 20pt (40) e corpo justificado
    expect(xml).toContain('w:val="36"');
    expect(xml).toContain('w:val="40"');
    expect(xml).toContain('w:val="both"');

    // Entrelinha 1,15 do modelo e nenhum espaçamento entre parágrafos: a
    // respiração vem de parágrafo vazio, como no .docx nativo do modelo.
    expect(xml).toContain('w:line="276" w:lineRule="auto"');
    expect(xml).not.toContain('w:line="240"');
    expect(xml).not.toContain('w:after="120"');
    expect(xml).not.toContain('w:before="240"');
  });

  // Regressão do defeito que a tarja de rascunho mascarava: a abertura era um
  // estado do DOCUMENTO ('titulo' → 'razao' → 'corpo'), e o slot da razão social
  // era consumido pela próxima linha livre de QUALQUER bloco. No instrumento
  // agrário, que não tem razão social, isso centralizava o preâmbulo em 20pt.
  it('instrumento agrário: título em 14pt e preâmbulo justificado no corpo', async () => {
    const doc = await montarDocx([
      bloco('titulo', 'livre', '*INSTRUMENTO PARTICULAR DE PARCERIA PARA FINS DE EXPLORAÇÃO AGROPECUÁRIA*'),
      bloco('preambulo', 'livre', '*~PARCEIRA OUTORGANTE~*: MMS AGRO LTDA, pessoa jurídica de direito privado.'),
    ]);
    const xml = await parteXml(doc, /word\/document\.xml$/);

    // 14pt (28 half-points) para o título, como nos dois assinados do MMS — e
    // nenhum 18/20pt, que são a capa do Contrato Social.
    expect(xml).toContain('w:val="28"');
    expect(xml).not.toContain('w:val="36"');
    expect(xml).not.toContain('w:val="40"');
    // O preâmbulo é corpo justificado, não uma razão social centralizada.
    expect(paragrafoCom(xml, 'PARCEIRA OUTORGANTE')).toContain('w:val="both"');
    expect(paragrafoCom(xml, 'INSTRUMENTO PARTICULAR')).toContain('w:val="center"');
  });

  it('tarja de rascunho não rouba o slot do título do instrumento', async () => {
    const doc = await montarDocx([
      bloco('__rascunho__', 'livre', '*RASCUNHO — DOCUMENTO INCOMPLETO*'),
      bloco('titulo', 'livre', '*INSTRUMENTO PARTICULAR DE PARCERIA PARA FINS DE EXPLORAÇÃO AGROPECUÁRIA*'),
      bloco('preambulo', 'livre', '*~PARCEIRA OUTORGANTE~*: MMS AGRO LTDA, pessoa jurídica.'),
    ]);
    const xml = await parteXml(doc, /word\/document\.xml$/);

    // Com a tarja na frente o título continua 14pt (antes caía para 20pt, o
    // corpo da razão social) e o preâmbulo continua no corpo.
    expect(xml).not.toContain('w:val="40"');
    expect(paragrafoCom(xml, 'PARCEIRA OUTORGANTE')).toContain('w:val="both"');
    expect(paragrafoCom(xml, 'INSTRUMENTO PARTICULAR')).toContain('w:val="center"');
  });

  it('capítulo e subtítulo saem centralizados em negrito sublinhado', async () => {
    const doc = await montarDocx([
      bloco('cap', 'capitulo', '*CAPÍTULO III*\nCapital Social'),
      bloco('cl', 'clausula', '*CLÁUSULA QUINTA:* O capital social é de R$ 1,00.'),
      bloco('par', 'paragrafo', '*Parágrafo Único:* Responsabilidade restrita.'),
      bloco('cl2', 'clausula', '*CLÁUSULA SEXTA:* Administração.'),
    ]);
    const xml = await parteXml(doc, /word\/document\.xml$/);

    // As duas linhas do capítulo levam sublinhado (o subtítulo saía sem nada)
    const sublinhados = xml.match(/<w:u w:val="single"\/>/g) ?? [];
    expect(sublinhados.length).toBeGreaterThanOrEqual(2);
    expect(xml).toContain('Capital Social');
    expect(xml).toContain('w:val="center"');

    // Parágrafo vazio: só o pPr, sem run.
    const VAZIO = /<w:p><w:pPr><w:spacing[^>]*\/><\/w:pPr><\/w:p>/;
    const entre = (de: string, ate: string) =>
      xml.slice(xml.indexOf(de), xml.indexOf(ate));

    // Subtítulo → cláusula e cláusula → seu parágrafo saem colados
    expect(entre('Capital Social', 'CLÁUSULA QUINTA:')).not.toMatch(VAZIO);
    expect(entre('CLÁUSULA QUINTA:', 'Parágrafo Único:')).not.toMatch(VAZIO);
    // Cláusula nova depois de um parágrafo abre com linha em branco
    expect(entre('Parágrafo Único:', 'CLÁUSULA SEXTA:')).toMatch(VAZIO);
  });

  it('lista de alíneas é compacta: linha em branco entre itens não sai', async () => {
    const doc = await montarDocx([
      bloco(
        'par',
        'paragrafo',
        '*Parágrafo Segundo:* Bens integralizados:\na) Primeiro imóvel.\n\nb) Segundo imóvel.\n\nc) Terceiro imóvel.',
      ),
      bloco('cl', 'clausula', '*CLÁUSULA SEXTA:* Administração.'),
    ]);
    const xml = await parteXml(doc, /word\/document\.xml$/);
    const VAZIO = /<w:p><w:pPr><w:spacing[^>]*\/><\/w:pPr><\/w:p>/g;

    // As três alíneas saem colada uma na outra…
    const lista = xml.slice(xml.indexOf('Primeiro imóvel'), xml.indexOf('Terceiro imóvel'));
    expect(lista).not.toMatch(VAZIO);
    // …e a linha em branco antes da cláusula seguinte continua lá.
    expect(xml.slice(xml.indexOf('Terceiro imóvel'), xml.indexOf('CLÁUSULA SEXTA:'))).toMatch(VAZIO);
  });

  // Regressão do marcador de alínea em NEGRITO quando a linha tem marca inline.
  //
  // `linhaComRotulo` media o marcador na linha SEM marcas e cortava por índice na
  // linha COM marcas: o rótulo capturava "*a)" em vez de "a)", sobrava um "*"
  // órfão, a contagem de delimitadores virava ímpar e todo o pareamento de
  // negrito da linha deslocava. Valia para qualquer alínea com marca inline —
  // inclusive as do Contrato Social, que é o que fazia disso um defeito em código
  // compartilhado e não um detalhe do contrato rural.
  it('marcador de alínea sai em negrito sem comer a marca inline seguinte', async () => {
    const doc = await montarDocx([
      bloco(
        'cl',
        'clausula',
        '*CLÁUSULA PRIMEIRA:* Os imóveis:\n    a) 200,6846 ha do *Lote n.º 05 do Setor 10*, matrícula 2.424;',
      ),
    ]);
    const xml = await parteXml(doc, /word\/document\.xml$/);
    const linha = xml.slice(xml.indexOf('200,6846'), xml.indexOf('2.424'));

    // Nenhum asterisco literal sobra no documento: era o "*" órfão que a conta
    // ímpar de delimitadores deixava para trás.
    expect(xml).not.toContain('*');
    // O marcador saiu limpo, em run PRÓPRIO e em negrito — sem levar embaixo o
    // asterisco que abria a marca seguinte ("*a)" era o rótulo capturado).
    const corpo = xml.slice(xml.indexOf('a)</w:t>') - 400, xml.indexOf('2.424'));
    expect(corpo).toMatch(/<w:b\/>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>a\)<\/w:t>/);
    // O espaço depois do marcador fica no run seguinte, e esse NÃO é negrito.
    expect(corpo).toMatch(/<w:t[^>]*> 200,6846 ha do <\/w:t>/);
    // A denominação do imóvel continua em negrito: é o pareamento que deslocava.
    expect(linha).toMatch(/<w:b\/>(?:(?!<\/w:r>)[\s\S])*?<w:t[^>]*>Lote n\.º 05 do Setor 10<\/w:t>/);
    // …e o que vem depois dela, não.
    expect(linha).toContain('>, matrícula ');
  });

  it('bloco de assinatura fica inteiro centralizado (régua, nome e papel)', async () => {
    // Duas linhas de assinatura, como o fecho passou a renderizar depois de
    // 20260813000302: quem outorga é o cônjuge, e ele assina em linha própria,
    // com o papel embaixo do nome — não como sufixo do rótulo do sócio.
    const doc = await montarDocx([
      bloco(
        'fecho',
        'livre',
        '_______________________________________\n*JOSÉ EDUARDO DE MACEDO SOARES JUNIOR*\nSócio administrador' +
        '\n\n_______________________________________\n*MARIA AUXILIADORA DE MACEDO SOARES*\nCônjuge outorgante',
      ),
    ]);
    const xml = await parteXml(doc, /word\/document\.xml$/);

    // Nenhuma linha do bloco de assinatura pode sair justificada: o papel do
    // signatário saía à esquerda, desalinhado do nome centralizado acima.
    expect(xml).not.toContain('w:val="both"');
    expect((xml.match(/w:val="center"/g) ?? []).length).toBeGreaterThanOrEqual(6);
    expect(xml).toContain('Sócio administrador');
    expect(xml).toContain('Cônjuge outorgante');
    expect(xml).not.toContain('e Outorga Conjugal');
  });

  it('marcas inline viram runs formatados (e não aparecem literais)', async () => {
    const doc = await montarDocx([
      bloco('cl', 'clausula', 'CLÁUSULA PRIMEIRA: O prazo é de *30 (trinta)* dias, _improrrogáveis_, contados ~da assinatura~.'),
    ]);
    const xml = await parteXml(doc, /word\/document\.xml$/);

    expect(xml).toContain('<w:b/>');
    expect(xml).toContain('<w:i/>');
    expect(xml).toContain('<w:u w:val="single"/>');
    expect(xml).toContain('30 (trinta)');
    expect(xml).not.toContain('*30');
    expect(xml).not.toContain('_improrrogáveis');
    expect(xml).not.toContain('~da');
  });

  it('corrida de linhas-pipe vira Table com cabeçalho em negrito e células formatadas', async () => {
    const doc = await montarDocx([
      bloco(
        'tab',
        'livre',
        'Quadro de sócios:\n| Sócio | Quotas |\n| :--- | ---: |\n| *Fulano* | 100 |\n| Beltrano | 200 |\nFim.',
      ),
    ]);
    const xml = await parteXml(doc, /word\/document\.xml$/);

    // Estrutura de tabela do OOXML
    expect(xml).toContain('<w:tbl>');
    expect(xml).toContain('<w:tr>');
    expect(xml).toContain('<w:tc>');
    // Conteúdo das células (separadora | --- | NÃO vira linha)
    expect(xml).toContain('Sócio');
    expect(xml).toContain('Beltrano');
    expect(xml).not.toContain('---');
    // Marca inline dentro da célula vira run em negrito, sem o literal
    expect(xml).toContain('Fulano');
    expect(xml).not.toContain('*Fulano');
    // Alinhamento da coluna (right na 2ª via ---:)
    expect(xml).toContain('w:val="right"');
    // Texto fora da tabela continua parágrafo
    expect(xml).toContain('Quadro de sócios:');
    expect(xml).toContain('Fim.');
  });

  it('rodapé tem "Página X de Y" em Arial Narrow 12pt à direita, números em negrito', async () => {
    const doc = await montarDocx([bloco('a', 'livre', 'Qualquer texto.')]);
    const footer = await parteXml(doc, /word\/footer\d*\.xml$/);

    expect(footer).toContain('Página ');
    expect(footer).toContain('PAGE');
    expect(footer).toContain('NUMPAGES');
    expect(footer).toContain('Arial Narrow');
    expect(footer).toContain('w:val="24"'); // 12pt
    expect(footer).toContain('w:val="right"');
    expect(footer).toContain('<w:b/>'); // PAGE e NUMPAGES em negrito
  });

  it.each([
    {
      nome: 'controlada',
      conteudo: '{{ razaoSocial }} — R$ {{ capitalValor }} — {{ foroComarca }}/{{ foroUf }}',
      contexto: {
        sociedade: {
          razaoSocial: 'Operacional Agro Ltda.',
          capitalValor: '500.000,00',
          sedeMunicipio: 'Rondonópolis',
          sedeUf: 'MT',
        },
      },
      esperado: ['Operacional Agro Ltda.', '500.000,00', 'Rondonópolis', 'MT'],
    },
    {
      nome: 'controladora',
      conteudo:
        '{{ controladora.nome }} — CNPJ {{ controladora.cpfCnpj }}' +
        '{{#controladora.objetoSocial}} — {{ controladora.objetoSocial }}{{/controladora.objetoSocial}}',
      contexto: {
        sociedade: {
          razaoSocial: 'Controladora Participações Ltda.',
          cnpj: '12.345.678/0001-90',
          objeto: 'Participação em outras sociedades',
        },
      },
      esperado: ['Controladora Participações Ltda.', '12.345.678/0001-90', 'Participação em outras sociedades'],
    },
  ])('gera o DOCX da $nome sem variável quebrada', async ({ nome, conteudo, contexto, esperado }) => {
    const template: Template = {
      id: nome,
      nome,
      blocos: [
        {
          id: `${nome}-conteudo`,
          tipo: 'livre',
          obrigatorio: true,
          conteudo: normalizarReferenciasLegadas(conteudo),
        },
      ],
    };
    const doc = await montarDocx(gerarBlocos(template, contexto as Contexto));
    const xml = await parteXml(doc, /word\/document\.xml$/);

    for (const valor of esperado) expect(xml).toContain(valor);
    expect(xml).not.toContain('{{');
    expect(xml).not.toContain('}}');
  });
});
