import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import logo from "@/assets/logo-psa.png";
import hero1 from "@/assets/hero/hero-1.jpg";

export const Hero = () => {
  return (
    <div 
      className="relative min-h-screen flex items-center justify-center"
      style={{ 
        backgroundImage: `url(${hero1})`, 
        backgroundSize: 'cover', 
        backgroundPosition: 'center' 
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="z-20 container mx-auto px-4 md:px-6 lg:px-8 text-left flex flex-col items-start"
      >
        {/* Logo - 96px (Fibonacci: maior elemento) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-start mt-24 mb-12"
        >
          <img src={logo} alt="PSA Consultores" className="h-20 md:h-24 w-auto" />
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-tight text-white mb-6"
        >
          Especialistas em Tributação
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="block mt-2 pb-2 bg-gradient-to-r from-primary via-lime-400 to-primary bg-clip-text text-transparent leading-relaxed"
          >
            para o Agronegócio
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="text-lg md:text-xl text-white/80 max-w-2xl mb-12"
        >
          Transformamos complexidade tributária em vantagem competitiva para empresas familiares há mais de 20 anos.
        </motion.p>

        {/* CTA Button - 48px altura (Fibonacci: menor elemento) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
        >
          <Button
            size="lg"
            onClick={() => {
              document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="h-12 px-8 text-base bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-md shadow-lg hover:shadow-xl transition-all duration-300 group border border-white/40"
          >
            Conheça Nossas Soluções
            <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};
