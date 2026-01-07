import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Carousel, CarouselContent, CarouselItem, type CarouselApi } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import equipeCompleta from "@/assets/equipe/equipe-completa.png";
import equipeFeminina from "@/assets/equipe/equipe-feminina.png";

const teamImages = [
  { src: equipeCompleta, alt: "Equipe completa PSA Consultores" },
  { src: equipeFeminina, alt: "Equipe feminina PSA Consultores" }
];

export const AboutSection = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const plugin = useRef(Autoplay({ delay: 5000, stopOnInteraction: false }));

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

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
          </motion.div>

          {/* Team Photos Carousel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col"
          >
            {/* Navigation Buttons */}
            <div className="flex justify-end gap-2 mb-4">
              <button 
                onClick={() => api?.scrollPrev()}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                Anterior
              </button>
              <button 
                onClick={() => api?.scrollNext()}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 transition-colors text-sm font-medium"
              >
                Próximo
              </button>
            </div>

            {/* Carousel */}
            <Carousel setApi={setApi} plugins={[plugin.current]} className="w-full">
              <CarouselContent>
                {teamImages.map((image, index) => (
                  <CarouselItem key={index}>
                    <div className="aspect-[4/3] rounded-lg overflow-hidden">
                      <img 
                        src={image.src} 
                        alt={image.alt} 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>

            {/* Indicators */}
            <div className="flex justify-center gap-2 mt-4">
              {teamImages.map((_, index) => (
                <button
                  key={index}
                  onClick={() => api?.scrollTo(index)}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    index === current 
                      ? "bg-gray-900 w-4" 
                      : "bg-gray-300 w-2 hover:bg-gray-400"
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
