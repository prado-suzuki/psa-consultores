import { motion } from "framer-motion";
import { ImagesSlider } from "@/components/ui/images-slider";
import heroImage1 from "@/assets/hero/hero-1.jpg";
import heroImage2 from "@/assets/hero/hero-2.jpg";
import heroImage3 from "@/assets/hero/hero-3.jpg";

export const Hero = () => {
  const images = [heroImage1, heroImage2, heroImage3];

  return (
    <section className="relative w-full h-screen">
      <ImagesSlider className="h-full" images={images}>
        <div className="absolute inset-0 bg-gray-900/60" />
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 flex flex-col items-center justify-center h-full container mx-auto px-4 text-center"
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-50 max-w-5xl leading-tight">
            Especialistas em Tributação para o Agronegócio
          </h1>
          
          <p className="mt-6 text-lg md:text-xl text-gray-50/80 max-w-2xl">
            Há mais de 20 anos a PSA se consolidou como líder em reestruturação contábil para empresas familiares do agronegócio, sendo pioneira em Mato Grosso.
          </p>

          <a
            href="#servicos"
            className="mt-10 px-8 py-3 text-sm font-medium border border-gray-50/30 text-gray-50 rounded-md hover:bg-gray-50/10 transition-colors duration-200"
          >
            Conheça Nossas Soluções
          </a>
        </motion.div>
      </ImagesSlider>
    </section>
  );
};
