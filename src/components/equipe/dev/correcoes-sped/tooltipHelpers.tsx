import { Info } from "lucide-react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * FieldTooltip — ícone de informação (`<Info>`) ao lado de um label que,
 * ao hover, exibe o texto explicativo (portalizado, com `z-[100]`).
 *
 * Mesmo padrão visual de `ConsultaXMLs.tsx` / `ApuracaoPisCofins.tsx`.
 * Uso: `<Label>Cliente <RequiredMark /> <FieldTooltip text="..." /></Label>`.
 */
export const FieldTooltip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
    </TooltipTrigger>
    <TooltipPrimitive.Portal>
      <TooltipContent
        side="top"
        sideOffset={6}
        collisionPadding={12}
        className="font-normal normal-case tracking-normal text-xs text-center max-w-[260px] z-[100]"
      >
        {text}
      </TooltipContent>
    </TooltipPrimitive.Portal>
  </Tooltip>
);

/** Tooltips reutilizados pelos filtros principais e colunas das abas. */
export const SPED_TOOLTIPS = {
  // Filtros principais (obrigatórios)
  cliente: "Cliente cuja base SPED será revisada. Obrigatório.",
  contribuinte:
    "CNPJ/contribuinte específico do cliente. Quando há apenas um, é selecionado automaticamente. Obrigatório.",
  dataInicio: "Data inicial do período da escrituração a ser consultada. Obrigatório.",
  dataFim: "Data final do período da escrituração a ser consultada. Obrigatório.",
  // Filtros opcionais
  ncm: "Filtra os itens da tabela cruzando a informação com o NCM vinculado ao produto no Registro 0200 do SPED.",
  buscar: "Busca textual livre por descrição do item, chave do documento ou NCM.",
  // Filtros condicionais da aba F100
  natBcCredF100:
    "Código NAT_BC_CRED do registro F100 (Tab. 4.3.7). Obrigatório informar este campo OU Cód. Conta para consultar F100.",
  codCtaF100:
    "COD_CTA do registro F100. Ex: 31010201. Obrigatório informar este campo OU Nat. Base de Crédito para consultar F100.",
  // Cabeçalhos de grupo
  dadosEfd: "Dados extraídos da EFD Contribuições (escrituração original).",
  impostos: "Apuração de PIS/COFINS para o registro: CST, base de cálculo, alíquota e valor.",
  // Colunas comuns (PIS/COFINS)
  cstPis: "Código de Situação Tributária para PIS.",
  cstCof: "Código de Situação Tributária para COFINS.",
  pctPis: "Alíquota aplicada de PIS.",
  pctCof: "Alíquota aplicada de COFINS.",
  vlPis: "Valor de PIS apurado.",
  vlCof: "Valor de COFINS apurado.",
  bcPis: "Base de cálculo do PIS.",
  bcCof: "Base de cálculo da COFINS.",
  pisRet: "Valor de PIS retido na fonte.",
  cofinsRet: "Valor de COFINS retido na fonte.",
  conta: "Código da conta analítica contábil (Registro 0500).",
  natBcCred: "Natureza da Base de Crédito conforme Tabela 4.3.7 da EFD Contribuições.",
  status: "Mostra se a linha já possui correção aplicada e se a tabela está em modo de edição.",
  // C170 (NFe/NFCe)
  c170Descricao: "Descrição do item conforme registro C170 ou Registro 0200 quando ausente.",
  c170Valor: "Valor unitário do item (VL_ITEM) no SPED.",
  // A170 (NFSe)
  a170Prestador: "Razão social do prestador (Registro 0150).",
  a170CpfCnpj: "Documento do prestador (Registro 0150).",
  a170Descricao: "Descrição do serviço (DESCR_COMPL ou Registro 0200).",
  a170Valor: "Valor do serviço (VL_ITEM).",
  a170ChvNfse: "Chave de acesso da NFSe quando disponível.",
  // D100 (CTe)
  d100Data: "Data de emissão do documento (DT_DOC).",
  d100ChvCte: "Chave de acesso do CT-e (44 dígitos).",
  d100Cnpj: "CNPJ do participante da operação.",
  // F100 (Outros)
  f100Data: "Data da operação (DT_OPER).",
  f100Nome: "Nome do participante.",
  f100CpfCnpj: "Documento do participante.",
  f100Tipo: "Tipo de pessoa (PF/PJ).",
  f100Simples: "Indica se o participante é optante pelo Simples Nacional.",
  f100Valor: "Valor da operação (VL_OPER).",
  // F120 (Depreciação)
  f120Bem: "Identificação do bem do ativo imobilizado (IDENT_BEM_IMOB).",
  f120Utilizacao: "Indicador de utilização do bem (IND_UTIL_BEM_IMOB).",
  f120Depreciacao:
    "Encargos de depreciação/amortização do ativo imobilizado (Bloco F – Registro F120).",
  // F130 (Aquisição)
  f130Bem: "Identificação do bem do ativo imobilizado adquirido (IDENT_BEM_IMOB).",
  f130Utilizacao: "Indicador de utilização do bem (IND_UTIL_BEM_IMOB).",
  f130MesAquis: "Mês/ano da aquisição do bem (MES_OPER_AQUIS).",
  f130Aquisicao: "Crédito sobre aquisição de ativo imobilizado (Bloco F – Registro F130).",
} as const;
