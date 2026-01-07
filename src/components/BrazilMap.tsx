import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import brazilMap from "@/assets/maps/brazil-map.png";

const offices = [
  { id: "cuiaba", name: "Cuiabá", state: "MT", top: "48%", left: "35%", isMain: true },
  { id: "barreiras", name: "Barreiras", state: "BA", top: "38%", left: "58%", isMain: false },
  { id: "curitiba", name: "Curitiba", state: "PR", top: "78%", left: "48%", isMain: false },
];

export const BrazilMap = () => {
  return (
    <div className="relative w-full aspect-[4/5] max-w-2xl mx-auto">
      {/* Imagem do mapa */}
      <motion.img 
        src={brazilMap} 
        alt="Mapa do Brasil" 
        className="w-full h-full object-contain"
        initial={{ opacity: 0, scale: 0.95 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      />
      
      {/* Pins animados nas posições */}
      {offices.map((office, i) => (
        <motion.div
          key={office.id}
          className="absolute -translate-x-1/2 -translate-y-full"
          style={{ top: office.top, left: office.left }}
          initial={{ y: -30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ type: "spring", bounce: 0.4, delay: 0.3 + i * 0.2 }}
        >
          {/* Label da cidade - acima do pin */}
          <span className="absolute left-1/2 -translate-x-1/2 -top-10 bg-gray-900/90 text-white text-sm font-medium px-3 py-1.5 rounded-md whitespace-nowrap shadow-lg">
            {office.name}
            {office.isMain && <span className="ml-1 text-emerald-400">(Sede)</span>}
          </span>
          
          {/* Pin icon */}
          <MapPin className="w-10 h-10 md:w-12 md:h-12 text-gray-800 fill-emerald-400 drop-shadow-lg" />
          
          {/* Efeito pulse */}
          <motion.div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-3 h-3 rounded-full bg-emerald-400"
            animate={{ scale: [1, 2.5, 1], opacity: [0.8, 0, 0.8] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
          />
        </motion.div>
      ))}
    </div>
  );
};
