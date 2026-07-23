import { FileSpreadsheet, FolderOpen, Settings, Upload } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { EquipeSprintDetalhesController } from '@/hooks/useEquipeSprintDetalhesController';

export function ImportDialog({ controller: c }: { controller: EquipeSprintDetalhesController }) {
  return (
    <Dialog open={c.importModalOpen} onOpenChange={c.closeImport}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Sprint do Excel
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {!c.importPreview ? (
            <div className="flex flex-col items-center py-8 border-2 border-dashed rounded-lg">
              <FileSpreadsheet className="h-12 w-12 text-gray-400 mb-4" />
              <p className="mb-4">Selecione um arquivo Excel (.xlsx)</p>
              <Button onClick={() => c.fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Selecionar Arquivo
              </Button>
              <p className="text-xs text-gray-400 mt-4">
                O arquivo deve conter colunas: Sprint, ID, Título, Subtarefa, Responsável,
                Descrição, Estimativa (h), Data de Entrega
              </p>
            </div>
          ) : (
            <>
              <Card className="bg-green-50">
                <CardContent className="py-4">
                  <div className="font-medium">{c.importFile?.name}</div>
                  <div className="grid grid-cols-3 text-sm">
                    <span>Tarefas principais: {c.importPreview.totalTasks}</span>
                    <span>Subtarefas: {c.importPreview.totalSubtasks}</span>
                    <span>Total de horas: {c.importPreview.totalHours}h</span>
                  </div>
                </CardContent>
              </Card>
              {!!c.importPreview.unmappedResponsibles.length && (
                <Card className="bg-amber-50">
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Responsáveis não encontrados ({c.importPreview.unmappedResponsibles.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {c.importPreview.unmappedResponsibles.map((name) => (
                      <div key={name} className="flex gap-4 items-center">
                        <span className="w-32 truncate">{name}</span>
                        <span>→</span>
                        <Select
                          value={c.responsibleMapping[name] || 'skip'}
                          onValueChange={(value) =>
                            c.setResponsibleMapping((current) => ({
                              ...current,
                              [name]: value === 'skip' ? '' : value,
                            }))
                          }
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="skip">Ignorar (sem atribuição)</SelectItem>
                            {c.profiles.map((profile) => (
                              <SelectItem key={profile.id} value={profile.id}>
                                {profile.first_name} {profile.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
              <div>
                <h4 className="text-sm font-medium">Preview das tarefas:</h4>
                <div className="max-h-60 overflow-y-auto border divide-y">
                  {c.importPreview.taskGroups.map((group, index) => (
                    <div key={`${group.title}-${index}`} className="p-3">
                      <div className="flex justify-between">
                        <span className="font-medium">{group.title}</span>
                        <Badge variant="outline">
                          {group.subtasks.length} subtarefas • {group.totalHours}h
                        </Badge>
                      </div>
                      <div className="text-xs">
                        {group.responsible || 'Sem responsável'} • {group.minDate} - {group.maxDate}
                      </div>
                      <div className="flex gap-3 text-xs">
                        {group.projectName && (
                          <span>
                            <FolderOpen className="inline h-3 w-3" /> {group.projectName}
                          </span>
                        )}
                        {group.processName && (
                          <span>
                            <Settings className="inline h-3 w-3" /> {group.processName}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={c.resetImport}>
                Selecionar outro arquivo
              </Button>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => c.closeImport(false)}>
            Cancelar
          </Button>
          <Button onClick={c.handleImport} disabled={c.importing || !c.importPreview}>
            {c.importing ? 'Importando...' : `Importar ${c.importPreview?.totalTasks || 0} tarefas`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
