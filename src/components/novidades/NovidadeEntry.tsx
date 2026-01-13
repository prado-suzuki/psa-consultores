import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
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
  botao?: {
    texto: string;
    url: string;
  };
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

export const NovidadeEntry = ({
  categoria,
  data,
  titulo,
  descricao,
  itens,
  imagem,
  botao,
}: NovidadeEntryProps) => {
  const config = categoriaConfig[categoria];

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

        {/* Description */}
        <p className="text-gray-600 leading-relaxed">{descricao}</p>

        {/* Items list */}
        {itens && itens.length > 0 && (
          <ul className="space-y-2 pl-4">
            {itens.map((item, index) => (
              <li
                key={index}
                className="text-gray-600 relative before:content-['•'] before:absolute before:-left-4 before:text-primary before:font-bold"
              >
                {item}
              </li>
            ))}
          </ul>
        )}

        {/* Image */}
        {imagem && (
          <div className="mt-6 rounded-xl overflow-hidden border border-gray-200">
            <img
              src={imagem}
              alt={titulo}
              className="w-full aspect-video object-cover"
            />
          </div>
        )}

        {/* Button */}
        {botao && (
          <div className="pt-2">
            <Button
              variant="outline"
              asChild
              className="group hover:bg-primary hover:text-white hover:border-primary transition-colors"
            >
              <a href={botao.url} target="_blank" rel="noopener noreferrer">
                {botao.texto}
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </a>
            </Button>
          </div>
        )}
      </div>
    </motion.article>
  );
};
