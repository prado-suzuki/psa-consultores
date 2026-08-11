// Fração de titularidade (%) — pelo mesmo critério da área: a precisão de
// entrada não pode ser menor que a do documento de origem. Com duas casas, uma
// composse de 1/3 (33,3333%) não cabia no campo e era truncada na digitação.
// Quatro casas cobrem os denominadores usuais de partilha e mantêm uma regra só
// de precisão no módulo.
import { clampDecimais, stepDeDecimais } from '@/lib/osg/decimais';

export const FRACAO_DECIMAIS = 4;
export const FRACAO_STEP = stepDeDecimais(FRACAO_DECIMAIS);

export const clampFracaoInput = (valor: string) => clampDecimais(valor, FRACAO_DECIMAIS);
