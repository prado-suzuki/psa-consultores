import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, ChevronRight } from "lucide-react";
import { ImagesSlider } from "@/components/ui/images-slider";
import logo from "@/assets/logo-psa.png";
import hero1 from "@/assets/hero/hero-1.jpg";
import hero2 from "@/assets/hero/hero-2.jpg";
import hero3 from "@/assets/hero/hero-3.jpg";

const images = [hero1, hero2, hero3];

export const Hero = () => {
  return (
    <ImagesSlider
      images={images}
      overlay={true}
      overlayClassName="bg-gradient-to-b from-black/50 via-black/30 to-black/60"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3 }}
        className="z-20 container mx-auto px-4 md:px-6"
      >
        <div className="pt-32 md:pt-40 pb-20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="flex justify-center mb-8"
            >
              <img src={logo} alt="PSA Consultores" className="h-16 md:h-20 w-auto" />
            </motion.div>

            {/* Main Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-white"
            >
              Líderes em Consultoria Tributária
              <motion.span
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="block mt-2 bg-gradient-to-r from-primary via-lime-400 to-primary bg-clip-text text-transparent"
              >
                para o Agronegócio
              </motion.span>
            </motion.h1>

            {/* Subtitle */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.7 }}
              className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed"
            >
              Há mais de 20 anos transformamos complexidade tributária em vantagem competitiva para empresas familiares do agro.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
            >
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full shadow-[0_0_30px_rgba(101,163,13,0.4)] hover:shadow-[0_0_40px_rgba(101,163,13,0.5)] transition-all duration-300 group"
              >
                Fale com um Especialista
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="bg-white/10 border-2 border-white/30 text-white rounded-full backdrop-blur-sm hover:bg-white/20 hover:border-white/40 transition-all duration-300 group"
              >
                Conheça Nossas Soluções
                <ChevronRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Button>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1 }}
              className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto"
            >
              {[
                { value: "200+", label: "Projetos Entregues" },
                { value: "20+", label: "Anos de Experiência" },
                { value: "98%", label: "Satisfação Cliente" },
                { value: "50+", label: "Empresas Atendidas" },
              ].map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 1 + index * 0.1 }}
                  className="text-center"
                >
                  <div className="text-3xl md:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                  <div className="text-sm text-white/80">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.div>
    </ImagesSlider>
  );
};
