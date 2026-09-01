import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Download, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { useAuditPeriodo } from '@/hooks/useAuditPeriodo';
import { useDomainDocumentoDownloads } from '@/hooks/useDomainDocumentoDownload';
import { useProfilesNomeMap } from '@/hooks/useDomainProfiles';
import {
  agregarPorDocumento, agregarPorUsuario, buildDownloadsPorDocumentoCsv,
  buildDownloadsPorUsuarioCsv, rotuloOrigem,
} from '@/lib/documentoDownload';
import { triggerCsvDownload } from '@/lib/roiCsv';
import { AuditLimiteAviso } from './AuditLimiteAviso';

function quando(iso: string): string {
  return format(new Date(iso), 'dd/MM/yyyy HH:mm', { locale: ptBR });
}

/**
 * Aba Downloads: quem pediu acesso a qual documento de cliente.
 *
 * Não recebe área, diferente das abas irmãs: `documento_download` não tem coluna
 * de área e o recorte já acontece na política de leitura, por cluster do cliente.
 * Por isso a aba é montada apenas na auditoria do OSG — ver `AuditTabs`.
 *
 * Nenhuma chamada ao banco aqui: a consulta é do hook e a conta é da função pura
 * em `lib/documentoDownload.ts`, que é onde o teste roda.
 */
export const AuditDownloadsTable = () => {
  // O período é compartilhado com as outras abas — ver `useAuditPeriodo`.
  const { periodo, setPeriodo, opcoes, janela } = useAuditPeriodo();

  const { data: linhas = [], isLoading } = useDomainDocumentoDownloads(janela);
  // `profiles_safe`: `profiles` só tem SELECT para admin, e o nome de quem baixou
  // precisa aparecer para o time todo. Por isso o perfil não vem embutido na
  // consulta, ao contrário do documento e do cliente.
  const { data: nomesPessoas = {} } = useProfilesNomeMap('profiles_safe');

  const porUsuario = useMemo(
    () => agregarPorUsuario(linhas, nomesPessoas),
    [linhas, nomesPessoas],
  );
  const porDocumento = useMemo(() => agregarPorDocumento(linhas), [linhas]);

  const vazio = !isLoading && linhas.length === 0;

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {opcoes.map(p => (
              <SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          {isLoading
            ? 'Carregando…'
            : `${linhas.length.toLocaleString('pt-BR')} acesso(s) no período`}
        </span>
      </div>

      {vazio && (
        <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhum acesso a documento registrado neste período.
        </p>
      )}

      {!vazio && (
        <>
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-slate-700">Por usuário</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerCsvDownload(
                  buildDownloadsPorUsuarioCsv(porUsuario),
                  `downloads-por-usuario-${janela.slug}.csv`,
                )}
                disabled={isLoading || porUsuario.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Origem do acesso</TableHead>
                  <TableHead className="text-right">Downloads</TableHead>
                  <TableHead className="text-right">Documentos</TableHead>
                  <TableHead>Último acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porUsuario.map(linha => (
                  <TableRow key={linha.usuarioId}>
                    <TableCell className="font-medium">{linha.nome}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {linha.papeis.map(rotuloOrigem).join(', ') || '—'}
                    </TableCell>
                    <TableCell className="text-right">{linha.downloads}</TableCell>
                    <TableCell className="text-right">{linha.documentosDistintos}</TableCell>
                    <TableCell className="text-muted-foreground">{quando(linha.ultimoEm)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>

          <section className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium text-slate-700">Por documento</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerCsvDownload(
                  buildDownloadsPorDocumentoCsv(porDocumento),
                  `downloads-por-documento-${janela.slug}.csv`,
                )}
                disabled={isLoading || porDocumento.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Arquivo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Downloads</TableHead>
                  <TableHead className="text-right">Pessoas</TableHead>
                  <TableHead>Último acesso</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porDocumento.map(linha => (
                  <TableRow key={linha.documentoId}>
                    <TableCell className="font-medium">
                      {linha.nome ?? (
                        <span className="text-slate-400 italic">Documento excluído</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{linha.cliente ?? '—'}</TableCell>
                    <TableCell className="text-right">{linha.downloads}</TableCell>
                    <TableCell className="text-right">{linha.usuariosDistintos}</TableCell>
                    <TableCell className="text-muted-foreground">{quando(linha.ultimoEm)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </section>
        </>
      )}

      <AuditLimiteAviso total={linhas.length} />

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Cada linha registra que <strong className="font-medium">o link assinado foi entregue
          </strong> àquela pessoa para aquele documento, e não que o arquivo chegou ao disco dela:
          o download acontece direto no armazenamento em nuvem, que fica fora do sistema. Prévia
          na árvore e na triagem não conta, só download. A origem é por onde o acesso foi
          autorizado no momento do evento: pelo lado da equipe ou pelo portal do próprio cliente.
          "Documento excluído" é acesso a arquivo que foi apagado depois
          — a linha do acesso permanece de propósito. Você vê apenas os acessos de clientes que já
          enxerga.
        </span>
      </p>
    </div>
  );
};
