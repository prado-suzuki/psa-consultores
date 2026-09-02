import { Fragment, type ReactNode } from 'react';
import { Scale } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { FamiliaSaida } from '@/hooks/useSaidaIcms';

/** Renderiza `**negrito**` sem dangerouslySetInnerHTML, igual ao DevPageHeader. */
const renderBoldSegments = (text: string): ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const m = part.match(/^\*\*([^*]+)\*\*$/);
    if (m) {
      return (
        <strong key={index} className="font-semibold">
          {m[1]}
        </strong>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });

/**
 * Texto da base legal por família, extraído do WP_ICMS_SAIDAS.xlsb (T03.1).
 * Cada item representa um parágrafo/linha do card.
 *
 * Famílias sem base legal cadastrada retornam `null` -> o componente não renderiza.
 */
const BASE_LEGAL: Partial<Record<FamiliaSaida, string[]>> = {
  acucar: [
    '**1.** Benefício de Crédito Outorgado **PRODEIC** - Resolução **CONDEPRODEMAT nº 32/2019** - Operações com Açúcar',
    '>> Condicionado à contribuição dos Fundos: **FUNDES 6%; FUNDED 1%**',
    '>> Fruição do benefício implica a vedação de acumular com qualquer outro benefício em relação a determinada operação, cfe **art. 47-A** e **Parágrafo Único do Decreto 288/2019**',
    '**RICMS/MT, Art. 95, Inciso II** - Alíquota de **12%** para operações interestaduais com Açúcar',
  ],

  etanol_interno: [
    '**2.** Benefício de Redução da Base de Cálculo de **50% da PMPF** para operações de saída internas com **AEHC - Álcool Combustível**',
    '>> **Ato COTEPE/PMPF**',
    '>> Jul: **4,0763** - Ago: **4,0763**',
    '>> Set: **4,0763** - Abr: **4,2163**',
    '>> Mai: **4,2163** - Jun: **4,2163**',
    '**Alíquota: Etanol**',
    '>> DOE-MT de **04/07/2022**: a partir de **23/06/2022**, nas operações internas com gasolina classificada no código **2710.12.5** da NCM, álcool carburante classificado nos códigos **2207.10** e **2207.20.1** da NCM e querosene de aviação classificado no código **2710.19.11** da NCM, aplica-se a alíquota de **17%**.',
    '**Diferimento:**',
    '**Art. 482** Nos termos e condições previstos neste artigo, o pagamento do imposto incidente nas operações internas ou interestaduais com etanol anidro combustível - **EAC** fica diferido para o momento em que ocorrer: *(v. cláusula vigésima primeira do Convênio ICMS 110/2007)*',
    '**I** - a saída da gasolina C, resultante da mistura com o referido produto, promovida pela distribuidora de combustíveis, observado o disposto nos parágrafos deste artigo;',
  ],

  etanol_interestado: [
    '**4.** Benefício de Crédito Outorgado **PRODEIC** - Resolução **CONDEPRODEMAT nº 40/2019** - Operações Interestaduais',
    '>> Percentual máximo de Crédito Outorgado para operação interestadual com **AEHC** é de **62,5000%**. Nova redação **101/2021** e **70,8333%** a partir de **01/11/2023**, cfe **artigo 4º-C da Resolução 149/2023**.',
    '>> Condicionado à contribuição dos fundos: **FUNDEIC 1%** e **FUNDED 1%**',
    '>> Fruição do benefício implica a vedação de acumular com qualquer outro benefício em relação a determinada operação, cfe **art. 47-A** e **Parágrafo Único do Decreto 288/2019**',
    '**Diferimento:**',
    '**Art. 482** Nos termos e condições previstos neste artigo, o pagamento do imposto incidente nas operações internas ou interestaduais com etanol anidro combustível - **EAC** fica diferido para o momento em que ocorrer: *(v. cláusula vigésima primeira do Convênio ICMS 110/2007)*',
    '**I** - a saída da gasolina C, resultante da mistura com o referido produto, promovida pela distribuidora de combustíveis, observado o disposto nos parágrafos deste artigo;',
  ],

  residuos_producao: [
    '**Bagaço de cana. Isenção nas operações internas com insumos para agropecuária.**',
    '**RICMS/MT, Capítulo XXI, Art. 115, Inciso XVII**',
    '**Art. 115** Operações internas realizadas com os insumos agropecuários a seguir indicados:',
    '**XVII** - torta de filtro e bagaço de cana, cascas e serragem de pinus e eucalipto, turfa, torta de oleaginosas, resíduo da indústria de celulose *(dregs e grits)*, ossos de bovino autoclavado, borra de carnaúba, cinzas, resíduos agroindustriais orgânicos, destinados para uso exclusivo como matéria-prima na fabricação de insumos para a agricultura;',
    '**VI** - alho em pó, sorgo, milheto, sal mineralizado, farinhas de peixe, de ostra, de carne, de osso, de pena, de sangue e de víscera, calcário calcítico, caroço de algodão, farelos e tortas de algodão, de babaçu, de cacau, de amendoim, de linhaça, de mamona, de milho e de trigo, farelos de arroz, de girassol, de glúten de milho, de gérmen de milho desengordurado, de quirera de milho, de casca e de semente de uva e de polpa cítrica, glúten de milho, silagens de forrageiras e de produtos vegetais, feno, óleos de aves, resíduos de óleo e gordura de origem animal ou vegetal, descartados por empresas do ramo alimentício, e outros resíduos industriais, destinados à alimentação animal ou ao emprego na fabricação de ração animal;',
    '**Bagaço de cana. Redução da Base de Cálculo nas operações interestaduais com insumos para agropecuária.**',
    '**RICMS/MT, Capítulo XI, Art. 30, Inciso XVII**',
    '**Art. 30** Fica reduzida a **40%** do valor da operação a base de cálculo do ICMS nas saídas interestaduais dos seguintes produtos:',
    '**XVII** - torta de filtro e bagaço de cana, cascas e serragem de pinus e eucalipto, turfa, torta de oleaginosas, resíduo da indústria de celulose *(dregs e grits)*, ossos de bovino autoclavado, borra de carnaúba, cinzas, resíduos agroindustriais orgânicos, destinados para uso exclusivo como matéria-prima na fabricação de insumos para a agricultura;',
  ],

  sucata: [
    '**RICMS/MT - Diferimento na venda de sucatas e resíduos**',
    '**Art. 27** O lançamento do imposto incidente nas sucessivas saídas de papel usado ou aparas de papel, sucatas de metais, cacos de vidro, retalhos, fragmentos ou resíduos de plástico, de borracha ou de tecido, promovidas por quaisquer estabelecimentos, com destino a outros também localizados neste Estado, fica diferido para o momento em que ocorrer:',
    '**I** - sua saída para outro Estado ou para o exterior;',
    '**II** - a saída dos produtos fabricados com essas mercadorias.',
  ],

  biodiesel: [
    'Para todos os efeitos deste título, nos termos da **Lei Complementar nº 192/2022**, serão observadas as seguintes disposições: *(cf. cláusula segunda do Convênio ICMS 199/2022 e alterações; cf. cláusula segunda do Convênio ICMS 15/2023)*',
    '>> Fundamentação substituída pelo **Decreto nº 316/2023** *(DOE de 31.05.2023 - Edição Extra)*, efeitos a partir de **31.05.2023**.',
    '**VI** - nas operações interestaduais, entre contribuintes, com **B100**, com **GLGN** ou com **EAC**, o imposto será repartido entre a UF de origem e a UF de destino, nas proporções adiante assinaladas, conforme a origem da mercadoria, se nacional ou importada, e, também, conforme as UFs de origem e de efetivo consumo:',
    '**2)** na proporção de **66,67%** para a UF do produtor e **33,33%** para a UF de destino, nas operações não referidas no item 1 desta alínea;',
    '**Art. 586-H-1** Para os fins do disposto neste título, as alíquotas do ICMS, instituídas e fixadas nos termos do inciso IV do **§ 4° do artigo 155 da Constituição Federal**, em conformidade com o disposto na cláusula sétima do **Convênio ICMS 199/2022** e na cláusula sétima do **Convênio ICMS 15/2023**, correspondem a: *(efeitos a partir de 01.02.2025)*',
    '>> Acrescentado pelo **Decreto nº 1.474/2025** *(DOE de 05.06.2025 - Edição Extra)*, efeitos a partir de **01.02.2025**.',
    '**I** - para o diesel e o biodiesel, **R$ 1,12** por litro;',
  ],
};

interface BaseLegalCardProps {
  familia: FamiliaSaida;
}

export const BaseLegalCard = ({ familia }: BaseLegalCardProps) => {
  const lines = BASE_LEGAL[familia];
  if (!lines || lines.length === 0) return null;

  return (
    <Alert className="mb-6 bg-emerald-50/70 border-emerald-200">
      <Scale className="h-5 w-5 text-emerald-700"/>
      <AlertTitle className="text-sm font-semibold text-foreground">
        Base Legal
      </AlertTitle>
      <AlertDescription className="text-sm leading-relaxed text-foreground mt-1 space-y-1">
        {lines.map((line, idx) => (
          <p key={idx}>{renderBoldSegments(line)}</p>
        ))}
      </AlertDescription>
    </Alert>
  );
};
