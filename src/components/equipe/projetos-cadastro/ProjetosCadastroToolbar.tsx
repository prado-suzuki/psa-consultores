import { Building2, FileText, Filter, FolderKanban, Layers, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { STATUS_LABELS, type ProjectGroupBy } from '@/lib/projetosCadastro';
import { useProjetosCadastro } from '@/components/equipe/projetos-cadastro/ProjetosCadastroContext';

export function ProjetosCadastroToolbar() {
  const controller = useProjetosCadastro();
  const {
    area, projects, filteredProjects, hasActiveFilters, filterOptions,
    filterCliente, setFilterCliente, filterProduto, setFilterProduto,
    filterStatus, setFilterStatus, groupBy, setGroupBy, clearFilters, handleOpenModal,
  } = controller;
  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-tool-icon-bg flex items-center justify-center">
            <FolderKanban className="h-5 w-5 text-tool-icon" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{area === 'osg' ? 'Projetos OSG' : 'Projetos Tax'}</h2>
            <p className="text-sm text-muted-foreground">
              {hasActiveFilters ? `${filteredProjects.length} de ${projects.length} projetos` : `${projects.length} projetos cadastrados`}
            </p>
          </div>
        </div>
        <Button onClick={() => handleOpenModal()}><Plus className="h-4 w-4 mr-2" />Novo Projeto</Button>
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Select value={filterCliente} onValueChange={value => setFilterCliente(value === 'all' ? '' : value)}>
          <SelectTrigger className="w-52"><Building2 className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {filterOptions.clientes.map(client => <SelectItem key={client.id} value={client.id}>{client.nome}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProduto} onValueChange={value => setFilterProduto(value === 'all' ? '' : value)}>
          <SelectTrigger className="w-52"><FileText className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Produto" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os produtos</SelectItem>
            {filterOptions.produtos.map(product => <SelectItem key={product} value={product}>{product}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={value => setFilterStatus(value === 'all' ? '' : value)}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {filterOptions.status.map(status => <SelectItem key={status} value={status}>{STATUS_LABELS[status] || status}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={groupBy} onValueChange={value => setGroupBy(value as ProjectGroupBy)}>
          <SelectTrigger className="w-48"><Layers className="h-4 w-4 mr-2 text-muted-foreground" /><SelectValue placeholder="Agrupar por" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sem agrupamento</SelectItem>
            <SelectItem value="cliente">Agrupar por Cliente</SelectItem>
            <SelectItem value="equipe">Agrupar por Equipe</SelectItem>
            <SelectItem value="area">Agrupar por Área</SelectItem>
          </SelectContent>
        </Select>
        {hasActiveFilters && <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 text-muted-foreground"><X className="h-4 w-4" />Limpar</Button>}
      </div>
    </>
  );
}
