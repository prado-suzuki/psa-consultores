// As DUAS PONTAS do faturamento de uma OS, em edição.
//
// `cluster_id` é quem EMITE a nota: a empresa do grupo PSA (Prado Suzuki, PSA
// Auditores, PSA Norte, Profitto). `contribuinte_id` é quem a RECEBE: a empresa do
// cliente. Elas andam juntas na tela porque respondem a mesma pergunta por lados
// opostos, e separá-las fazia quem preenchia informar uma e esquecer a outra.
//
// Saiu de dentro da `ContratosTab` quando o arquivo cruzou o teto de 600 linhas do
// AGENTS.md, e faz par com `OsLeitura`, que mostra os mesmos dois campos em
// leitura. Ter os dois lados em arquivos próprios é o que evita o furo que a
// Patricia apontou: a leitura ficava para trás quando a edição ganhava campo.
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { RequiredMark } from "@/components/ui/required-mark";
import { cn } from "@/lib/utils";
import type { DraftEntity, DraftOrdemServico } from "@/types/clientForm";
import { getContribuinteLabel, getEmpresaLabel } from "./contratosLabels";
import MarcaPendencia, { CLASSE_CAMPO_PENDENTE, acessibilidadeObrigatorio } from "./MarcaPendencia";

export interface OsFaturamentoFieldsProps {
  contrato: DraftOrdemServico;
  /** Empresas do grupo, já ordenadas pelo rótulo que a lista exibe. */
  empresasOrdenadas: Array<{ id: string; name: string; nome_empresa?: string | null }>;
  /**
   * Contribuintes do cliente JÁ SALVOS. A OS guarda uma chave estrangeira, então
   * contribuinte criado na mesma sessão ainda não tem id e não pode ser escolhido.
   */
  contribuintesSalvos: Array<DraftEntity & { _dbId: string }>;
  /** Valor atual do select de empresa, que a aba mantém em estado próprio. */
  empresaId: string;
  onEmpresaChange: (valor: string) => void;
  onContribuinteChange: (valor: string) => void;
  /** Mensagem de falta do campo, ou undefined quando está preenchido. */
  falta: (campo: string) => string | undefined;
  /** Id do elemento da mensagem, para o `aria-describedby` do gatilho. */
  idFalta: (campo: string) => string;
}

export default function OsFaturamentoFields({
  contrato,
  empresasOrdenadas,
  contribuintesSalvos,
  empresaId,
  onEmpresaChange,
  onContribuinteChange,
  falta,
  idFalta,
}: OsFaturamentoFieldsProps) {
  return (
    <div className="grid max-w-5xl gap-4 md:grid-cols-2">
      <div>
        <Label className="text-xs font-semibold uppercase text-muted-foreground">
          Empresa / Faturamento
          <RequiredMark />
        </Label>
        <div className="mt-1">
          <Select value={empresaId} onValueChange={onEmpresaChange}>
            <SelectTrigger
              {...acessibilidadeObrigatorio(idFalta('cluster_id'), falta('cluster_id'))}
              className={cn("h-9", falta('cluster_id') && CLASSE_CAMPO_PENDENTE)}
            >
              <SelectValue placeholder="Selecione a empresa que fatura" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="__all__">Selecione a empresa que fatura</SelectItem>
              {empresasOrdenadas.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {/* Uma linha só: o gatilho do select repete o conteúdo do item,
                      e em duas linhas ele ficava espremido. O cluster vai ao
                      lado, herdando a cor do item (com opacidade) para continuar
                      legível quando a linha fica realçada. */}
                  <span className="flex items-baseline gap-2">
                    <span className="font-medium">{getEmpresaLabel(c)}</span>
                    {c.nome_empresa?.trim() && c.nome_empresa.trim() !== c.name && (
                      <span className="text-[11px] opacity-60">{c.name}</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MarcaPendencia id={idFalta('cluster_id')}>{falta('cluster_id')}</MarcaPendencia>
        </div>
      </div>

      <div>
        {/* A marca de obrigatório acompanha a regra de `pendenciasOrdemServico`:
            sem contribuinte salvo o campo não pode ser exigido, então prometer
            obrigatoriedade ali seria pedir o impossível. */}
        <Label className="text-xs font-semibold uppercase text-muted-foreground">
          Contribuinte de faturamento
          {contribuintesSalvos.length > 0 && <RequiredMark />}
        </Label>
        <div className="mt-1">
          <Select
            value={contrato.contribuinte_id || "__none__"}
            onValueChange={onContribuinteChange}
            disabled={contribuintesSalvos.length === 0}
          >
            <SelectTrigger
              {...acessibilidadeObrigatorio(idFalta('contribuinte_id'), falta('contribuinte_id'))}
              className={cn("h-9", falta('contribuinte_id') && CLASSE_CAMPO_PENDENTE)}
            >
              <SelectValue placeholder="Selecione o contribuinte" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="__none__">Selecione o contribuinte</SelectItem>
              {contribuintesSalvos.map((contribuinte) => (
                <SelectItem key={contribuinte._dbId} value={contribuinte._dbId}>
                  {getContribuinteLabel(contribuinte)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <MarcaPendencia id={idFalta('contribuinte_id')}>{falta('contribuinte_id')}</MarcaPendencia>
          {contribuintesSalvos.length === 0 && (
            <p className="mt-1 text-xs text-muted-foreground">
              Cadastre e salve um contribuinte para selecioná-lo nesta OS.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
