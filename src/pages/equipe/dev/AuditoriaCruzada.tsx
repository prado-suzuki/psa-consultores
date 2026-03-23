import { useState } from 'react';
import DevLayout from '@/components/equipe/dev/DevLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Search, X } from 'lucide-react';

const AuditoriaCruzada = () => {
  const [nome, setNome] = useState('');
  const [ncm, setNcm] = useState('');
  const [aliquota, setAliquota] = useState('');
  const [tipoProduto, setTipoProduto] = useState('todos');

  const handleLimpar = () => {
    setNome('');
    setNcm('');
    setAliquota('');
    setTipoProduto('todos');
  };

  return (
    <DevLayout title="Cruzamento de Dados" subtitle="Cruzamento entre fontes de dados fiscais">
      <div className="space-y-4">
        {/* Filtros Globais */}
        <Card className="bg-muted/50 border-dashed">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nome</Label>
                <Input
                  placeholder="Buscar por nome..."
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">NCM</Label>
                <Input
                  placeholder="Ex: 8471.30.19"
                  value={ncm}
                  onChange={(e) => setNcm(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Alíquota</Label>
                <Input
                  placeholder="Ex: 1.65"
                  value={aliquota}
                  onChange={(e) => setAliquota(e.target.value)}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Tipo de Produto</Label>
                <Select value={tipoProduto} onValueChange={setTipoProduto}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="mercadoria">Mercadoria</SelectItem>
                    <SelectItem value="servico">Serviço</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button variant="outline" size="sm" onClick={handleLimpar}>
                <X className="h-3.5 w-3.5 mr-1" />
                Limpar
              </Button>
              <Button size="sm">
                <Search className="h-3.5 w-3.5 mr-1" />
                Consultar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Accordions */}
        <Accordion type="multiple" className="w-full space-y-2">
          <AccordionItem value="balancete-efd" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-semibold">
              Balancete vs EFD Contribuições
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">Em construção</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="efd-icms" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-semibold">
              EFD Contribuições vs EFD ICMS
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">Em construção</p>
            </AccordionContent>
          </AccordionItem>

          <AccordionItem value="efd-xml" className="border rounded-lg px-4">
            <AccordionTrigger className="text-sm font-semibold">
              EFD Contribuições vs XMLs (NFe e CTe)
            </AccordionTrigger>
            <AccordionContent>
              <p className="text-sm text-muted-foreground">Em construção</p>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </DevLayout>
  );
};

export default AuditoriaCruzada;
