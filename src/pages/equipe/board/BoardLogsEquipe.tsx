import { useState } from 'react';
import { Shield } from 'lucide-react';
import { BoardLayout } from '@/components/equipe/board/BoardLayout';
import { AuditTabs } from '@/components/equipe/audit/AuditTabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { AUDIT_AREA_LABEL, AUDIT_AREA_OPCOES, type AuditArea } from '@/lib/auditAreas';

/**
 * Logs de Equipe no Board — as mesmas seis abas da Tax e da OSG, somadas.
 *
 * As abas vêm de `AuditTabs`, o mesmo componente que os módulos montam: quem
 * mexer numa coluna de Produtividade ou na fila de "Não resolvidos" mexe aqui
 * também. A única coisa que o Board acrescenta é o seletor de escopo, porque o
 * sócio começa no consolidado e desce para a área quando o número chama atenção.
 *
 * `'todas'` não é uma área de banco: `areasDoEscopo` traduz para `IN ('tax','osg')`
 * na leitura de `audit_logs`. Fixos e Digital não gravam nesta tabela — quando
 * gravarem, entram em `AUDIT_AREAS_MODULO` e aparecem aqui sem tocar na tela.
 */
const BoardLogsEquipe = () => {
  const [area, setArea] = useState<AuditArea>('todas');

  return (
    <BoardLayout title="Logs" subtitle="Produtividade, acesso e pendências do time">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
              <Shield className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Logs de Auditoria — {AUDIT_AREA_LABEL[area]}
              </h2>
              <p className="text-sm text-muted-foreground">
                Quem produziu, quem parou de registrar e o que o sistema não conseguiu medir
              </p>
            </div>
          </div>
          <Select value={area} onValueChange={(valor) => setArea(valor as AuditArea)}>
            <SelectTrigger className="h-9 w-[180px] text-sm" aria-label="Escopo de área">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AUDIT_AREA_OPCOES.map((opcao) => (
                <SelectItem key={opcao} value={opcao}>{AUDIT_AREA_LABEL[opcao]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* `key` remonta as abas ao trocar o escopo, para ordenação e filtros
            locais de cada aba não atravessarem de uma área para outra. O período
            sobrevive: mora na URL (`useAuditPeriodo`), não no componente. */}
        <AuditTabs key={area} area={area} />
      </div>
    </BoardLayout>
  );
};

export default BoardLogsEquipe;
