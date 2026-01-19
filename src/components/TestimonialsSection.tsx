import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Testimonial {
  quote: string;
  name: string;
  designation: string;
  src: string;
}

const testimonials: Testimonial[] = [
  {
    quote: "A PSA transformou completamente nossa gestão tributária. Recuperamos mais de R$ 2 milhões em créditos que nem sabíamos existir.",
    name: "Carlos Mendes",
    designation: "Diretor Financeiro - Fazenda Santa Clara",
    src: "/placeholder.svg",
  },
  {
    quote: "A reestruturação societária proposta pela equipe nos deu uma nova perspectiva de crescimento sustentável para os próximos anos.",
    name: "Ana Paula Ferreira",
    designation: "CEO - Cooperativa Agrícola Unidos",
    src: "/placeholder.svg",
  },
  {
    quote: "O trabalho de consultoria previdenciária foi excepcional. Conseguimos regularizar toda nossa situação com economia significativa.",
    name: "Roberto Almeida",
    designation: "Produtor Rural - Grupo Almeida",
    src: "/placeholder.svg",
  },
  {
    quote: "A expertise da PSA em tributação do agronegócio é incomparável. Eles entendem profundamente as particularidades do nosso setor.",
    name: "Mariana Costa",
    designation: "CFO - Agroindústria Vale Verde",
    src: "/placeholder.svg",
  },
];

export const TestimonialsSection = () => {
  const [active, setActive] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const handleNext = () => {
    setActive((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  useEffect(() => {
    if (isPaused) return;
    
    const interval = setInterval(() => {
      handleNext();
    }, 6000);

    return () => clearInterval(interval);
  }, [isPaused]);

  const randomRotateY = () => {
    return Math.floor(Math.random() * 21) - 10;
  };

  return (
    <section className="py-20 md:py-28 bg-white overflow-hidden">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-left max-w-2xl mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            O Que Nossos Clientes Dizem
          </h2>
          <p className="text-gray-600">
            Histórias reais de transformação tributária no agronegócio.
          </p>
        </motion.div>

        <div 
          className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Left Column: Animated Testimonials */}
          <div className="flex flex-col gap-6">
            {/* Image Stack */}
            <div className="relative h-64 w-full max-w-[280px] mx-auto lg:mx-0">
              <AnimatePresence>
                {testimonials.map((testimonial, index) => (
                  <motion.div
                    key={testimonial.name}
                    initial={{
                      opacity: 0,
                      scale: 0.9,
                      z: -100,
                      rotate: randomRotateY(),
                    }}
                    animate={{
                      opacity: index === active ? 1 : 0.7,
                      scale: index === active ? 1 : 0.95,
                      z: index === active ? 0 : -100,
                      rotate: index === active ? 0 : randomRotateY(),
                      zIndex: index === active ? 999 : testimonials.length - Math.abs(index - active),
                    }}
                    exit={{
                      opacity: 0,
                      scale: 0.9,
                      z: 100,
                      rotate: randomRotateY(),
                    }}
                    transition={{
                      duration: 0.4,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 origin-bottom"
                  >
                    <img
                      src={testimonial.src}
                      alt={testimonial.name}
                      className="h-full w-full rounded-2xl object-cover object-center shadow-lg border border-gray-200"
                      draggable={false}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Quote and Info */}
            <div className="flex flex-col gap-4">
              <motion.div
                key={active}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <blockquote className="text-lg md:text-xl text-gray-700 leading-relaxed">
                  "{testimonials[active].quote}"
                </blockquote>
              </motion.div>

              <motion.div
                key={`info-${active}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {testimonials[active].name}
                </h3>
                <p className="text-sm text-gray-500">
                  {testimonials[active].designation}
                </p>
              </motion.div>

              {/* Navigation */}
              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={handlePrev}
                  className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-emerald-100 transition-colors group"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="h-4 w-4 text-gray-600 group-hover:text-emerald-600" />
                </button>
                
                <div className="flex gap-2">
                  {testimonials.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setActive(index)}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        index === active 
                          ? "w-6 bg-emerald-500" 
                          : "w-2 bg-gray-300 hover:bg-gray-400"
                      }`}
                      aria-label={`Ir para depoimento ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-emerald-100 transition-colors group"
                  aria-label="Próximo"
                >
                  <ChevronRight className="h-4 w-4 text-gray-600 group-hover:text-emerald-600" />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: YouTube Video */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="aspect-video rounded-xl overflow-hidden shadow-xl border border-gray-200">
              <iframe
                src="https://www.youtube.com/embed/9E-EcRz-Gig"
                title="Depoimento de cliente PSA Consultores"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            <div className="mt-4 text-center lg:text-left">
              <p className="text-sm text-gray-500">
                Veja o depoimento completo de nossos clientes
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
