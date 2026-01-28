import { motion } from "framer-motion";
import heroImage from "@/assets/hero/hero-2.jpg";

export const Hero = () => {
  return (
    <section className="relative w-full h-screen">
      {/* Imagem de fundo estática */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Overlay escuro para contraste */}
      <div className="absolute inset-0 bg-black/60" />
      
      {/* Conteúdo alinhado à esquerda */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 flex flex-col items-start justify-center h-full container mx-auto px-4 md:px-6"
      >
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-50 max-w-4xl leading-tight drop-shadow-lg">
          Experiência no Agronegócio.<br />
          Precisão nos Números.
        </h1>
        
        <p className="mt-6 text-lg md:text-xl text-white/90 max-w-2xl">
          Estratégias tributárias, societárias, de gestão e de governança que consolidam o seu legado
        </p>

        <a
          href="#servicos"
          className="mt-10 px-8 py-3 text-sm font-medium border border-white/30 text-white rounded-md hover:bg-white/10 transition-colors duration-200"
        >
          Conheça Nossas Soluções
        </a>
      </motion.div>
    </section>
  );
};
