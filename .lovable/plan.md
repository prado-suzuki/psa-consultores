
## Adicionar Botão "Baixar Todos" no EFD ICMS

### Objetivo
Adicionar o botão "Baixar Todos" na página de Consulta EFD ICMS, seguindo o mesmo padrão visual do EFD Contribuições. Como não há endpoint real, a funcionalidade será apenas para teste (exibindo toast de simulação).

### Arquivos a Editar
- `src/pages/equipe/dev/ConsultaEFDICMS.tsx`

### Mudanças

| Local | Alteração |
|-------|-----------|
| Imports | Adicionar ícone `Download` do lucide-react |
| Estados | Adicionar `downloadingAll` (useState) |
| Handlers | Criar `handleDownloadAll` com lógica de teste (toast) |
| Header tabela | Adicionar botão "Baixar Todos" ao lado direito |

### Detalhes Técnicos

**1. Import adicional:**
```tsx
import { ..., Download } from 'lucide-react';
```

**2. Novo estado:**
```tsx
const [downloadingAll, setDownloadingAll] = useState(false);
```

**3. Handler de teste (sem endpoint real):**
```tsx
const handleDownloadAll = async () => {
  setDownloadingAll(true);
  
  // Simula delay de 1.5s para teste visual
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  toast({
    title: 'Teste: Download Simulado',
    description: `${arquivosFiltrados.length} arquivo(s) seriam baixados. Endpoint não implementado.`,
  });
  
  setDownloadingAll(false);
};
```

**4. Botão no header da tabela (lado direito):**
- Posicionamento: ao lado do CNPJ e botão de refresh
- Visual: outline, tamanho sm, com tooltip
- Desabilitado quando: `downloadingAll` ou `arquivosFiltrados.length === 0`
