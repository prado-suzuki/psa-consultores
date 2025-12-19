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
        className="z-20 container mx-auto px-4 md:px-6 text-right flex flex-col items-end"
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-end mb-8"
        >
          <img src={logo} alt="PSA Consultores" className="h-16 md:h-20 w-auto" />
        </motion.div>

        {/* Main Heading */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white"
        >
          Consultoria Tributária
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="block mt-2 pb-2 bg-gradient-to-r from-primary via-lime-400 to-primary bg-clip-text text-transparent leading-relaxed"
          >
            para o Agronegócio
          </motion.span>
        </motion.h1>

        {/* Single CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="pt-10"
        >
          <Button
            size="lg"
            className="bg-white/20 backdrop-blur-md hover:bg-white/30 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 group border border-white/40"
          >
            Conheça Nossas Soluções
            <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
};
