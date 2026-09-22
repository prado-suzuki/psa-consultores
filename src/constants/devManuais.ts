import { DEV_HUBS } from '@/constants/devHubDefinitions';

/**
 * O manual de cada ferramenta do Digital Dev, indexado pela ROTA.
 *
 * Existe porque o acesso ao manual era responsabilidade de cada página: o
 * `DevLayout` só mostrava o link quando a página passava `sopUrl`, e três de
 * trinta e cinco passavam. O resultado é o que a revisão de conteúdo apontou —
 * o manual aparecia em algumas telas e, nas outras, só pelo catálogo.
 *
 * A fonte não é nova: os endereços já viviam em `DEV_HUBS`, que o catálogo usa.
 * Aqui eles são apenas reindexados por rota, para que o layout resolva sozinho e
 * o link nasça no mesmo lugar em toda ferramenta, sem a página pedir.
 *
 * As ferramentas AVULSAS (as que não pertencem a nenhum hub) ficam explícitas
 * abaixo, e o catálogo lê daqui — senão o endereço voltaria a existir em dois
 * lugares, que é o defeito que este módulo fecha.
 */

const RAIZ_DOS_MANUAIS = 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA';

/** Ferramentas fora de hub, com o manual que o catálogo já exibia. */
export const MANUAIS_AVULSOS = {
  consultaXmls: `${RAIZ_DOS_MANUAIS}/manuais/consulta-xmls/`,
  calculadoraIbsCbs: `${RAIZ_DOS_MANUAIS}/`,
  controleBalancetes: `${RAIZ_DOS_MANUAIS}/manuais/balancete/`,
} as const;

function montarIndice(): Record<string, string> {
  const porRota: Record<string, string> = {
    '/equipe/tax/work/consulta-xmls': MANUAIS_AVULSOS.consultaXmls,
    '/equipe/tax/work/calculadora-ibs-cbs': MANUAIS_AVULSOS.calculadoraIbsCbs,
    '/equipe/tax/work/controle-balancetes': MANUAIS_AVULSOS.controleBalancetes,
  };

  for (const hub of Object.values(DEV_HUBS)) {
    if (hub.landingSopUrl) porRota[hub.landingPath] = hub.landingSopUrl;
    for (const opcao of hub.options) {
      if (opcao.sopUrl) porRota[opcao.path] = opcao.sopUrl;
    }
  }

  return porRota;
}

const MANUAL_POR_ROTA = montarIndice();

/**
 * O manual da rota, ou `undefined` quando a ferramenta ainda não tem um.
 *
 * Ferramenta sem manual não ganha botão — melhor não oferecer do que levar a
 * uma página que não existe. O catálogo mede essa cobertura e a exibe.
 */
export function manualDaRota(rota: string): string | undefined {
  return MANUAL_POR_ROTA[rota];
}
