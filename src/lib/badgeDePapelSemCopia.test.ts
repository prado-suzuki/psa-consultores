import { describe, expect, it } from 'vitest';

import { ROLE_OPTIONS, ROLE_SHORT_LABELS } from '@/components/acessos/roleOptions';
import { medirCorCrua } from '@/lib/medirCorCrua';

/**
 * Catraca do badge de papel. **Ela nasce VAZIA**, e é esse o ponto.
 *
 * O mesmo `app_role` era pintado por dois mapas, em dois arquivos da mesma pasta
 * `acessos/`, com duas paletas — e as duas cópias concordavam no RÓTULO, que é
 * como a divergência se escondeu de toda revisão. Medido em 11/09/2026, a cópia
 * da lista de usuários reprovava o AA em quatro dos sete papéis, a pior a
 * 3,07:1; a da legenda, na mesma página, passava nos sete.
 *
 * Cor de papel agora sai de `@/components/ui/PapelBadge`, que é COMPONENTE.
 * Mapa qualquer um copia; componente, para copiar, alguém tem que reescrever —
 * e é essa fricção que esta catraca cobra.
 *
 * **Por que a assinatura é `sublider` + classe de cor por perto:** `admin` e
 * `client` são vocabulário de meio mundo neste repositório, e `LEGEND_DESCRIPTIONS`
 * mapeia os mesmos sete papéis para TEXTO de forma legítima, ali do lado. O que
 * não pode voltar é papel virando CLASSE. Reaproveita o varredor de
 * `medirCorCrua`, que conta por arquivo nas pastas de tela — `src/lib` fica de
 * fora, e é de propósito.
 */
const RE_PAPEL_VIRANDO_CLASSE = /\bsublider:[\s\S]{0,200}?(?:bg|text|border)-[a-z]/g;

const RECADO = 'Voltou mapa de COR por papel de usuário numa tela.\n'
  + 'A pílula de papel é um componente, não um mapa:\n'
  + "  import { PapelBadge } from '@/components/ui/PapelBadge';\n"
  + '  <PapelBadge papel={role} />\n'
  + 'A decisão de cor dele (11/09/2026): a cor marca só quem é de FORA da PSA;\n'
  + 'a escada de poder marca por peso, com pontos antes do rótulo. O porquê\n'
  + 'inteiro está no docstring do componente.';

describe('badge de papel', () => {
  it('nenhuma tela transforma papel de usuário em classe de cor', () => {
    expect(medirCorCrua(RE_PAPEL_VIRANDO_CLASSE), RECADO).toEqual({});
  });

  it('todo papel oferecido no cadastro tem rótulo curto para a pílula', () => {
    // Sem isto, papel novo aparece na tela com o valor cru do enum — que foi
    // exatamente o buraco por onde `marketing` entrou sem cor em uma das cópias.
    for (const opcao of ROLE_OPTIONS) {
      expect(ROLE_SHORT_LABELS[opcao.value], `papel sem rótulo: ${opcao.value}`).toBeTruthy();
    }
  });
});
