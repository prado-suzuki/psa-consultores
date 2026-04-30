// Catálogos oficiais de códigos da EFD-Contribuições usados nos dropdowns dos
// registros F120 e F130. Mantemos a lista completa aqui para que o usuário
// possa selecionar qualquer código válido, e não apenas os já presentes no
// período carregado.

export type CodeOption = { code: string; description: string };

export const IDENT_BEM_IMOB_OPTIONS: CodeOption[] = [
  { code: '01', description: 'Edificações e Benfeitorias em Imóveis Próprios' },
  { code: '02', description: 'Edificações e Benfeitorias em Imóveis de Terceiros' },
  { code: '03', description: 'Instalações' },
  { code: '04', description: 'Máquinas' },
  { code: '05', description: 'Equipamentos' },
  { code: '06', description: 'Veículos' },
  { code: '99', description: 'Outros' },
];

export const IND_UTIL_BEM_IMOB_OPTIONS: CodeOption[] = [
  { code: '1', description: 'Produção de Bens Destinados à Venda' },
  { code: '2', description: 'Prestação de Serviços' },
  { code: '3', description: 'Locação a Terceiros' },
  { code: '9', description: 'Outros' },
];

export const NAT_BC_CRED_OPTIONS: CodeOption[] = [
  { code: '01', description: 'Aquisição de bens para revenda' },
  { code: '02', description: 'Aquisição de bens utilizados como insumo' },
  { code: '03', description: 'Aquisição de serviços utilizados como insumo' },
  { code: '04', description: 'Energia elétrica e térmica, inclusive sob a forma de vapor' },
  { code: '05', description: 'Aluguéis de prédios' },
  { code: '06', description: 'Aluguéis de máquinas e equipamentos' },
  { code: '07', description: 'Armazenagem de mercadoria e frete na operação de venda' },
  { code: '08', description: 'Contraprestações de arrendamento mercantil' },
  { code: '09', description: 'Máquinas, equipamentos e outros bens incorporados ao ativo imobilizado (crédito sobre encargos de depreciação)' },
  { code: '10', description: 'Máquinas, equipamentos e outros bens incorporados ao ativo imobilizado (crédito com base no valor de aquisição)' },
  { code: '11', description: 'Amortização e Depreciação de edificações e benfeitorias em imóveis' },
  { code: '12', description: 'Devolução de Vendas Sujeitas à Incidência Não-Cumulativa' },
  { code: '13', description: 'Outras Operações com Direito a Crédito (inclusive os créditos presumidos sobre receitas)' },
  { code: '14', description: 'Transporte de Cargas - Contratação de prestador pessoa física ou PJ transportadora, optante pelo SIMPLES' },
  { code: '15', description: 'Atividade Imobiliária - Custo Incorrido de Unidade Imobiliária' },
  { code: '16', description: 'Atividade Imobiliária - Custo Orçado de unidade não concluída' },
  { code: '17', description: 'Atividade de Prestação de Serviços de Limpeza, Conservação e Manutenção - vale-transporte, vale-refeição ou vale-alimentação, fardamento ou uniforme' },
  { code: '18', description: 'Estoque de abertura de bens' },
];
