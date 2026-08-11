// Fração de titularidade (%) — pelo mesmo critério da área: a precisão de
// entrada não pode ser menor que a do documento de origem. Com duas casas, uma
// composse de 1/3 (33,3333%) não cabia no campo e era truncada na digitação.
// Quatro casas cobrem os denominadores usuais de partilha e mantêm uma regra só
// de precisão no módulo.
//
// A SOMA NÃO FECHA 100%, E ISSO É ACEITO. Fração periódica não tem
// representação decimal exata: três comunheiros com 1/3 gravam 33,3333 cada e
// somam 99,9999%; sete herdeiros com 1/7 somam 99,9999%. Duas alternativas
// foram descartadas:
//   · normalizar o último titular para fechar a conta escreveria um número que
//     o registro não diz (o mesmo defeito do "último sócio absorve a diferença"
//     apontado no B6);
//   · guardar a razão (numerador/denominador), que é a representação correta,
//     muda o schema de `titularidade` e é decisão de produto, não de precisão de
//     input.
// Enquanto isso, a fração é o que o cadastro DECLARA, não uma partilha
// normalizada: o sistema não exige que a soma feche, e quatro casas deixam o
// erro residual em 0,0001% por titular, longe de qualquer efeito no documento.
import { clampDecimais, stepDeDecimais } from '@/lib/osg/decimais';

export const FRACAO_DECIMAIS = 4;
export const FRACAO_STEP = stepDeDecimais(FRACAO_DECIMAIS);

export const clampFracaoInput = (valor: string) => clampDecimais(valor, FRACAO_DECIMAIS);
