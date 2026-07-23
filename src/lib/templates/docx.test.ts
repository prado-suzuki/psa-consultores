import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import { montarDocx } from './docx';
import { gerarBlocos } from './index';
import { normalizarReferenciasLegadas } from './binding';
import type { Bloco, Contexto, Template } from './types';

const bloco = (id: string, tipo: Bloco['tipo'], conteudo: string): Bloco => ({ id, tipo, conteudo });

/** Extrai uma parte XML do pacote .docx gerado. */
async function parteXml(doc: Awaited<ReturnType<typeof montarDocx>>, parte: RegExp): Promise<string> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(await Packer.toBuffer(doc));
  return zip.file(parte)[0].async('string');
}

describe('export .docx (formatação do modelo de referência)', () => {
  it('aplica margens, fonte padrão e formatação por tipo estrutural', async () => {
    const doc = await montarDocx([
      bloco('cab', 'livre', 'INSTRUMENTO PARTICULAR DE CONSTITUIÇÃO DE SOCIEDADE LIMITADA'),
      // Conteúdos como saem de numerarBlocos: rótulos já envolvidos em *negrito*.
      bloco('cap', 'capitulo', '*CAPÍTULO I*\nDenominação, Sede e Prazo de Duração'),
      bloco('cl', 'clausula', '*CLÁUSULA PRIMEIRA:* A sociedade girará sob o nome X.\n    a) Primeira alínea;'),
      bloco('par', 'paragrafo', '*Parágrafo Único:* Texto do parágrafo.'),
      bloco('fecho', 'livre', '_______________________________________\nFulano de Tal'),
    ]);
    const xml = await parteXml(doc, /word\/document\.xml$/);

    // Página e margens do modelo (A4; 2,5 / 2,25 / 3,0 / 2,0 cm)
    expect(xml).toContain('w:w="11906"');
    expect(xml).toContain('w:top="1418"');
    expect(xml).toContain('w:bottom="1276"');
    expect(xml).toContain('w:left="1701"');
    expect(xml).toContain('w:right="1133"');

    // Fonte padrão do corpo (docDefaults em styles.xml)
    const styles = await parteXml(doc, /word\/styles\.xml$/);
    expect(styles).toContain('Arial Narrow');
    expect(styles).toContain('w:val="24"'); // 12pt

    // Rótulos em negrito (runs separados, sem as marcas literais)
    expect(xml).toContain('<w:b/>');
    expect(xml).toContain('CAPÍTULO I');
    expect(xml).toContain('CLÁUSULA PRIMEIRA:');
    expect(xml).toContain('Parágrafo Único:');
    expect(xml).not.toContain('*CAPÍTULO');
    expect(xml).not.toContain('*CLÁUSULA');

    // Alínea com recuo de 1,27 cm
    expect(xml).toContain('w:left="720"');

    // Título 18pt (36 half-points) e justificação no corpo
    expect(xml).toContain('w:val="36"');
    expect(xml).toContain('w:val="both"');
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

  it('rodapé tem "Página X de Y" com campos dinâmicos em Arial 9pt à direita', async () => {
    const doc = await montarDocx([bloco('a', 'livre', 'Qualquer texto.')]);
    const footer = await parteXml(doc, /word\/footer\d*\.xml$/);

    expect(footer).toContain('Página ');
    expect(footer).toContain('PAGE');
    expect(footer).toContain('NUMPAGES');
    expect(footer).toContain('Arial');
    expect(footer).toContain('w:val="18"'); // 9pt
    expect(footer).toContain('w:val="right"');
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
