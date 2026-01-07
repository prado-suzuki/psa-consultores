import { motion } from "framer-motion";
import brazilMap from "@/assets/maps/brazil-map-green.png";

export const BrazilMap = () => {
  return (
    <div className="relative w-full mx-auto bg-transparent">
      <motion.img
        src={brazilMap}
        alt="Mapa do Brasil" 
        className="w-full h-auto bg-transparent"
        initial={{ opacity: 0, scale: 0.98 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      />
    </div>
  );
};

