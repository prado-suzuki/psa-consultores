import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type CategoriaType = "empresa" | "tributario" | "servicos" | "cases";

interface NovidadeEntryProps {
  categoria: CategoriaType;
  data: string;
  titulo: string;
  descricao: string;
  itens?: string[];
  imagem?: string;
  imagemLateral?: string;
  imagemLateralPosicao?: "esquerda" | "direita";
  conteudoCompleto?: string;
}

const categoriaConfig: Record<CategoriaType, { label: string; className: string }> = {
  empresa: {
    label: "Empresa",
    className: "bg-gray-800 text-gray-50 hover:bg-gray-700",
  },
  tributario: {
    label: "Sistema Tributário",
    className: "bg-emerald-600 text-white hover:bg-emerald-700",
  },
  servicos: {
    label: "Serviços",
    className: "bg-blue-600 text-white hover:bg-blue-700",
  },
  cases: {
    label: "Cases de Sucesso",
    className: "bg-amber-600 text-white hover:bg-amber-700",
  },
};

// Function to render markdown-style formatting
const renderFormattedText = (text: string) => {
  // Split by bold markers and render
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
};

// Character limit for truncation
const DESCRIPTION_LIMIT = 300;

export const NovidadeEntry = ({
  categoria,
  data,
  titulo,
  descricao,
  itens,
  imagem,
  imagemLateral,
  imagemLateralPosicao = "direita",
  conteudoCompleto,
}: NovidadeEntryProps) => {
  const config = categoriaConfig[categoria];
  const [expanded, setExpanded] = useState(false);
  
  // Check if content should be truncated
  const shouldTruncate = descricao.length > DESCRIPTION_LIMIT || !!conteudoCompleto;
  const displayedDescription = !expanded && descricao.length > DESCRIPTION_LIMIT 
    ? descricao.slice(0, DESCRIPTION_LIMIT) + "..." 
    : descricao;

  // Render the side image component
  const SideImage = imagemLateral ? (
    <div className="flex-shrink-0 w-full md:w-[280px]">
      <div className="rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
        <img
          src={imagemLateral}
          alt={`Imagem de ${titulo}`}
          className="w-full aspect-[4/3] object-cover"
        />
      </div>
    </div>
  ) : null;

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.5 }}
      className="relative"
    >
      {/* Timeline line */}
      <div className="absolute left-0 top-0 bottom-0 w-px bg-gray-200 -translate-x-8 hidden md:block" />
      
      {/* Timeline dot */}
      <div className="absolute left-0 top-2 w-3 h-3 rounded-full bg-primary -translate-x-[38px] hidden md:block" />

      <div className="space-y-4">
        {/* Badge and date */}
        <div className="flex flex-wrap items-center gap-3">
          <Badge className={config.className}>{config.label}</Badge>
          <span className="text-sm text-gray-500">{data}</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-gray-900">{titulo}</h2>

        {/* Content with optional side image */}
        <div className={`flex flex-col ${imagemLateral ? 'md:flex-row' : ''} gap-6`}>
          {/* Side image on the left */}
          {imagemLateral && imagemLateralPosicao === "esquerda" && SideImage}
          
          {/* Main content */}
          <div className="flex-1 space-y-4">
            {/* Description with formatting support */}
            <p className="text-gray-600 leading-relaxed">
              {renderFormattedText(displayedDescription)}
            </p>

            {/* Expanded content */}
            <AnimatePresence>
              {expanded && conteudoCompleto && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="text-gray-600 leading-relaxed whitespace-pre-line">
                    {renderFormattedText(conteudoCompleto)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Items list */}
            {itens && itens.length > 0 && (
              <ul className="space-y-2 pl-4">
                {itens.map((item, index) => (
                  <li
                    key={index}
                    className="text-gray-600 relative before:content-['•'] before:absolute before:-left-4 before:text-primary before:font-bold"
                  >
                    {renderFormattedText(item)}
                  </li>
                ))}
              </ul>
            )}

            {/* Ver mais / Ver menos button */}
            {shouldTruncate && (
              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpanded(!expanded)}
                  className="group hover:bg-primary hover:text-white hover:border-primary transition-colors"
                >
                  {expanded ? (
                    <>
                      Ver menos
                      <ChevronUp className="ml-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5" />
                    </>
                  ) : (
                    <>
                      Ver mais
                      <ChevronDown className="ml-2 h-4 w-4 transition-transform group-hover:translate-y-0.5" />
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Side image on the right */}
          {imagemLateral && imagemLateralPosicao === "direita" && SideImage}
        </div>

        {/* Main Image */}
        {imagem && (
          <div className="mt-6 rounded-xl overflow-hidden border border-gray-200">
            <img
              src={imagem}
              alt={titulo}
              className="w-full aspect-video object-cover"
            />
          </div>
        )}
      </div>
    </motion.article>
  );
};
