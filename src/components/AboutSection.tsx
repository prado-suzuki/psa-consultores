import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import equipeCompleta from "@/assets/equipe/equipe-completa.png";
import equipeFeminina from "@/assets/equipe/equipe-feminina.png";

const teamImages = [
  { src: equipeCompleta, alt: "Equipe completa PSA Consultores" },
  { src: equipeFeminina, alt: "Equipe feminina PSA Consultores" }
];

export const AboutSection = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % teamImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section id="sobre" className="py-20 md:py-28 bg-gray-50">
      <div className="container mx-auto px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
          {/* Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
              Quem Somos
            </h2>
            
            <p className="text-gray-600 leading-relaxed">
              Há mais de 20 anos, a PSA se consolidou como referência em consultoria tributária para o agronegócio. Nascemos em Cuiabá, coração do agro brasileiro, e hoje contamos com uma equipe multidisciplinar de mais de 110 profissionais especializados.
            </p>
            
            <p className="text-gray-600 leading-relaxed">
              Nossa atuação é pautada em cinco pilares fundamentais: Gestão, Tecnologia, Compliance, Foco no Cliente e Qualidade. Combinamos expertise técnica com profundo conhecimento do setor para entregar soluções que realmente transformam a realidade fiscal das empresas.
            </p>

            <div className="pt-4 flex flex-wrap gap-x-8 gap-y-4">
              <div>
                <p className="text-2xl font-bold text-gray-900">Cuiabá</p>
                <p className="text-sm text-gray-500">Matriz - MT</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">Barreiras</p>
                <p className="text-sm text-gray-500">Filial - BA</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">Curitiba</p>
                <p className="text-sm text-gray-500">Filial - PR</p>
              </div>
            </div>
          </motion.div>

          {/* Team Photos Carousel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative aspect-[4/3] rounded-lg overflow-hidden"
          >
            <AnimatePresence mode="wait">
              <motion.img
                key={currentIndex}
                src={teamImages[currentIndex].src}
                alt={teamImages[currentIndex].alt}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </AnimatePresence>
            
            {/* Indicators */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              {teamImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentIndex
                      ? "bg-white w-6"
                      : "bg-white/50 hover:bg-white/70"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
